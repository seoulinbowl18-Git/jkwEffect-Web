from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import re
import hmac
import hashlib
import secrets
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '').lower()
KOMERCE_BASE = os.environ.get('KOMERCE_BASE_URL', '')
# Firebase Authentication (Google sign-in). The web API key is a public identifier; ID tokens
# are verified server-side through Identity Toolkit, which only accepts tokens from this project.
FIREBASE_API_KEY = os.environ.get('FIREBASE_API_KEY', '')
FIREBASE_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup"
SESSION_DAYS = 7
MIN_WITHDRAW = 50000
WIB = timezone(timedelta(hours=7))

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger("ourbuzzer")
logging.basicConfig(level=logging.INFO)

PLATFORM_DOMAINS = {
    "tiktok": ["tiktok.com"],
    "instagram": ["instagram.com"],
    "threads": ["threads.net", "threads.com"],
    "youtube": ["youtube.com", "youtu.be"],
}
CATEGORIES = ["Produk", "Beauty", "Lifestyle", "F&B", "Edukasi", "Hiburan", "Fashion", "Tech"]


def now():
    return datetime.now(timezone.utc)


def iso():
    return now().isoformat()


def gen_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---------------- Auth ----------------
async def get_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Belum login")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(401, "Sesi tidak valid")
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now():
        raise HTTPException(401, "Sesi kadaluarsa")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User tidak ditemukan")
    return user


def require(*roles):
    async def dep(user=Depends(get_user)):
        if user.get("role") not in roles:
            raise HTTPException(403, "Akses ditolak")
        return user
    return dep


class FirebaseLoginIn(BaseModel):
    id_token: str = Field(min_length=20, max_length=4096)


async def verify_firebase_token(id_token: str) -> dict:
    """Return the Firebase account for a valid ID token, or raise 401."""
    if not FIREBASE_API_KEY:
        logger.error("FIREBASE_API_KEY is not set")
        raise HTTPException(500, "Login belum dikonfigurasi")
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(FIREBASE_LOOKUP_URL, params={"key": FIREBASE_API_KEY}, json={"idToken": id_token})
    except httpx.HTTPError as e:
        logger.warning("Firebase lookup failed: %s", e)
        raise HTTPException(503, "Layanan login sedang bermasalah, coba lagi")
    if r.status_code != 200:
        raise HTTPException(401, "Login gagal")
    users = r.json().get("users") or []
    if not users:
        raise HTTPException(401, "Login gagal")
    acc = users[0]
    if not acc.get("email") or not acc.get("emailVerified"):
        raise HTTPException(401, "Email Google belum terverifikasi")
    if acc.get("disabled"):
        raise HTTPException(403, "Akun dinonaktifkan")
    return acc


async def upsert_login_user(email: str, name: str, picture: Optional[str]) -> str:
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        upd = {"name": user.get("name") or name, "picture": picture or user.get("picture")}
        if email == ADMIN_EMAIL:
            upd["role"] = "admin"
        await db.users.update_one({"email": email}, {"$set": upd})
        return user["user_id"]
    user_id = gen_id("user")
    await db.users.insert_one({
        "user_id": user_id, "email": email, "name": name, "picture": picture,
        "role": "admin" if email == ADMIN_EMAIL else None,
        "balance": 0, "total_earned": 0, "brand_balance": 0, "post_dates": [],
        "profile": {}, "created_at": iso(),
    })
    return user_id


@api.post("/auth/firebase")
async def auth_firebase(body: FirebaseLoginIn, response: Response):
    acc = await verify_firebase_token(body.id_token)
    email = acc["email"].lower()
    name = acc.get("displayName") or email.split("@")[0]
    user_id = await upsert_login_user(email, name, acc.get("photoUrl"))
    token = secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": token,
        "expires_at": now() + timedelta(days=SESSION_DAYS), "created_at": now(),
    })
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none",
                        path="/", max_age=SESSION_DAYS * 24 * 3600)
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


@api.get("/auth/me")
async def me(user=Depends(get_user)):
    return user


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    auth = request.headers.get("Authorization", "")
    if not token and auth.startswith("Bearer "):
        token = auth[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}


class RoleIn(BaseModel):
    role: Literal["creator", "brand"]
    brand_name: Optional[str] = None


@api.post("/users/role")
async def set_role(body: RoleIn, user=Depends(get_user)):
    if user.get("role"):
        raise HTTPException(400, "Role sudah dipilih")
    upd = {"role": body.role}
    if body.role == "brand":
        upd["profile.brand_name"] = (body.brand_name or user["name"]).strip()[:80]
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    tiktok: Optional[str] = ""
    instagram: Optional[str] = ""
    brand_name: Optional[str] = ""
    bank_method: Optional[str] = ""
    bank_account: Optional[str] = ""
    bank_holder: Optional[str] = ""


@api.put("/users/profile")
async def update_profile(body: ProfileIn, user=Depends(get_user)):
    d = body.model_dump()
    name = d.pop("name").strip()
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$set": {"name": name, "profile": {k: (v or "").strip()[:120] for k, v in d.items()}}})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ---------------- Notifications ----------------
async def notify(user_id, title, body, kind="info"):
    await db.notifications.insert_one({
        "notification_id": gen_id("ntf"), "user_id": user_id, "title": title, "body": body,
        "kind": kind, "read": False, "created_at": iso(),
    })


@api.get("/notifications")
async def list_notifications(user=Depends(get_user)):
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(30)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"items": items, "unread": unread}


@api.post("/notifications/read-all")
async def read_all(user=Depends(get_user)):
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- Streak ----------------
def streak_info(post_dates):
    dates = set(post_dates or [])
    today = datetime.now(WIB).date()
    start = today if today.isoformat() in dates else today - timedelta(days=1)
    count = 0
    d = start
    while d.isoformat() in dates:
        count += 1
        d -= timedelta(days=1)
    days_id = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
    week = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        week.append({"date": day.isoformat(), "label": "Hari ini" if i == 0 else days_id[day.weekday()],
                     "posted": day.isoformat() in dates})
    return {"streak": count, "posted_today": today.isoformat() in dates, "week": week}


# ---------------- Campaigns ----------------
class CampaignIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    category: str
    platforms: List[Literal["tiktok", "instagram", "threads", "youtube"]] = Field(min_length=1)
    rate_per_1k: int = Field(ge=500, le=1000000)
    min_views: int = Field(ge=100, le=100000000)
    budget: int = Field(ge=100000)
    thumbnail: Optional[str] = ""
    instructions: str = Field(min_length=10, max_length=5000)
    exclusive: bool = False
    deadline_days: int = Field(default=30, ge=1, le=180)


def campaign_view(c):
    c["budget_left_pct"] = round(100 * max(c["budget"] - c["spent"], 0) / c["budget"]) if c["budget"] else 0
    return c


@api.get("/campaigns")
async def list_campaigns(q: str = "", category: str = "", exclusive: bool = False, sort: str = "new"):
    f = {"status": "active", "exclusive": exclusive}
    if q:
        f["title"] = {"$regex": re.escape(q), "$options": "i"}
    if category and category != "Semua":
        f["category"] = category
    sort_key = {"new": ("created_at", -1), "rate": ("rate_per_1k", -1), "deadline": ("deadline", 1)}.get(sort, ("created_at", -1))
    items = await db.campaigns.find(f, {"_id": 0}).sort(*sort_key).to_list(200)
    return [campaign_view(c) for c in items]


@api.get("/campaigns/sections")
async def campaign_sections():
    base = {"status": "active", "exclusive": False}
    week_ago = (now() - timedelta(days=7)).isoformat()
    agg = await db.submissions.aggregate([
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$campaign_id", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}, {"$limit": 10},
    ]).to_list(10)
    ids = [a["_id"] for a in agg]
    trending = await db.campaigns.find({**base, "campaign_id": {"$in": ids}}, {"_id": 0}).to_list(10)
    trending.sort(key=lambda c: ids.index(c["campaign_id"]))
    if len(trending) < 6:
        extra = await db.campaigns.find({**base, "campaign_id": {"$nin": ids}}, {"_id": 0}).sort("submission_count", -1).to_list(6 - len(trending))
        trending += extra
    top_rate = await db.campaigns.find(base, {"_id": 0}).sort("rate_per_1k", -1).to_list(10)
    newest = await db.campaigns.find(base, {"_id": 0}).sort("created_at", -1).to_list(10)
    closing = await db.campaigns.find(base, {"_id": 0}).sort("deadline", 1).to_list(10)
    total = await db.campaigns.count_documents(base)
    total_ex = await db.campaigns.count_documents({"status": "active", "exclusive": True})
    m = lambda arr: [campaign_view(c) for c in arr]
    return {"trending": m(trending), "top_rate": m(top_rate), "newest": m(newest), "closing": m(closing),
            "total": total, "total_exclusive": total_ex}


@api.get("/campaigns/{cid}")
async def get_campaign(cid: str):
    c = await db.campaigns.find_one({"campaign_id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Campaign tidak ditemukan")
    return campaign_view(c)


@api.post("/campaigns")
async def create_campaign(body: CampaignIn, user=Depends(require("brand"))):
    if body.category not in CATEGORIES:
        raise HTTPException(400, "Kategori tidak valid")
    res = await db.users.find_one_and_update(
        {"user_id": user["user_id"], "brand_balance": {"$gte": body.budget}},
        {"$inc": {"brand_balance": -body.budget}}, return_document=ReturnDocument.AFTER)
    if not res:
        raise HTTPException(400, "Saldo brand tidak cukup. Silakan top up terlebih dahulu.")
    d = body.model_dump()
    days = d.pop("deadline_days")
    c = {**d, "campaign_id": gen_id("cmp"), "brand_id": user["user_id"],
         "brand_name": user.get("profile", {}).get("brand_name") or user["name"],
         "spent": 0, "submission_count": 0, "total_views": 0, "status": "active",
         "deadline": (now() + timedelta(days=days)).isoformat(), "created_at": iso()}
    await db.campaigns.insert_one(c)
    await db.ledger.insert_one({"entry_id": gen_id("led"), "user_id": user["user_id"], "type": "campaign_budget",
                                "amount": -body.budget, "ref": c["campaign_id"], "created_at": iso()})
    c.pop("_id", None)
    return campaign_view(c)


class StatusIn(BaseModel):
    status: Literal["active", "paused", "closed"]


@api.patch("/campaigns/{cid}/status")
async def campaign_status(cid: str, body: StatusIn, user=Depends(require("brand", "admin"))):
    c = await db.campaigns.find_one({"campaign_id": cid}, {"_id": 0})
    if not c or (user["role"] == "brand" and c["brand_id"] != user["user_id"]):
        raise HTTPException(404, "Campaign tidak ditemukan")
    if c["status"] == "closed":
        raise HTTPException(400, "Campaign sudah ditutup")
    upd = await db.campaigns.find_one_and_update({"campaign_id": cid, "status": {"$ne": "closed"}},
                                                 {"$set": {"status": body.status}}, return_document=ReturnDocument.AFTER)
    if body.status == "closed" and upd:
        await reject_open_submissions(cid)
        refund = max(upd["budget"] - upd["spent"], 0)
        if refund:
            await db.users.update_one({"user_id": c["brand_id"]}, {"$inc": {"brand_balance": refund}})
            await db.ledger.insert_one({"entry_id": gen_id("led"), "user_id": c["brand_id"], "type": "campaign_refund",
                                        "amount": refund, "ref": cid, "created_at": iso()})
    return {"ok": True}


OPEN_STATUSES = ["direview", "menunggu_views", "diproses", "verifying"]


async def reject_open_submissions(cid, exclude=None):
    f = {"campaign_id": cid, "status": {"$in": OPEN_STATUSES}}
    if exclude:
        f["submission_id"] = {"$ne": exclude}
    pend = await db.submissions.find(f, {"_id": 0}).to_list(5000)
    await db.submissions.update_many(f, {"$set": {"status": "ditolak", "note": "Campaign ditutup", "updated_at": iso()}})
    for p in pend:
        await notify(p["creator_id"], p["campaign_title"], "Campaign ditutup, submission dibatalkan.", "error")


@api.get("/brand/campaigns")
async def brand_campaigns(user=Depends(require("brand"))):
    items = await db.campaigns.find({"brand_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [campaign_view(c) for c in items]


# ---------------- Submissions ----------------
class SubmissionIn(BaseModel):
    campaign_id: str
    platform: Literal["tiktok", "instagram", "threads", "youtube"]
    video_url: str = Field(max_length=500)


def normalize_url(url):
    m = re.match(r"^(https?)://([^/?#]+)([^?#]*)", url.strip())
    if not m:
        return url.strip()
    host = m.group(2).lower().split(":")[0]
    for pre in ("www.", "m.", "vm.", "vt."):
        if host.startswith(pre):
            host = host[len(pre):]
            break
    path = m.group(3).rstrip('/')
    if host == "youtube.com" and path == "/watch":
        v = re.search(r"[?&]v=([\w-]+)", url)
        if v:
            return f"https://youtube.com/shorts/{v.group(1)}"
    if host == "youtu.be":
        return f"https://youtube.com/shorts{path}"
    return f"https://{host}{path}"


def valid_url(url, platform):
    m = re.match(r"^https?://([^/]+)/\S+$", url.strip())
    if not m:
        return False
    host = m.group(1).lower().split(":")[0]
    return any(host == d or host.endswith("." + d) for d in PLATFORM_DOMAINS[platform])


@api.post("/submissions")
async def create_submission(body: SubmissionIn, user=Depends(require("creator"))):
    c = await db.campaigns.find_one({"campaign_id": body.campaign_id}, {"_id": 0})
    if not c or c["status"] != "active":
        raise HTTPException(400, "Campaign tidak aktif")
    if body.platform not in c["platforms"]:
        raise HTTPException(400, "Platform tidak diterima di campaign ini")
    if not valid_url(body.video_url, body.platform):
        raise HTTPException(400, f"Link bukan link {body.platform} yang valid")
    url = normalize_url(body.video_url)
    if await db.submissions.find_one({"video_url": url}):
        raise HTTPException(400, "Video ini sudah pernah didaftarkan")
    s = {"submission_id": gen_id("sub"), "campaign_id": c["campaign_id"], "campaign_title": c["title"],
         "brand_id": c["brand_id"], "creator_id": user["user_id"], "creator_name": user["name"],
         "platform": body.platform, "video_url": url, "status": "direview", "claimed_views": 0,
         "verified_views": 0, "payout": 0, "rate_per_1k": c["rate_per_1k"], "min_views": c["min_views"],
         "note": "", "created_at": iso(), "updated_at": iso()}
    await db.submissions.insert_one(s)
    await db.campaigns.update_one({"campaign_id": c["campaign_id"]}, {"$inc": {"submission_count": 1}})
    today = datetime.now(WIB).date().isoformat()
    await db.users.update_one({"user_id": user["user_id"]}, {"$addToSet": {"post_dates": today}})
    await notify(c["brand_id"], "Submission baru", f"{user['name']} submit video ke {c['title']}")
    s.pop("_id", None)
    return s


@api.get("/creator/submissions")
async def creator_submissions(user=Depends(require("creator"))):
    return await db.submissions.find({"creator_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/creator/stats")
async def creator_stats(user=Depends(require("creator"))):
    subs = await db.submissions.find({"creator_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    pending = sum(int(s["claimed_views"] / 1000 * s["rate_per_1k"]) for s in subs if s["status"] == "diproses")
    return {"balance": user.get("balance", 0), "total_earned": user.get("total_earned", 0), "pending": pending,
            "videos": len(subs), "campaigns": len({s["campaign_id"] for s in subs}),
            "streak": streak_info(user.get("post_dates"))}


@api.get("/streak")
async def my_streak(user=Depends(get_user)):
    return streak_info(user.get("post_dates"))


class ClaimIn(BaseModel):
    views: int = Field(ge=1, le=10_000_000_000)


@api.post("/submissions/{sid}/claim")
async def claim_views(sid: str, body: ClaimIn, user=Depends(require("creator"))):
    s = await db.submissions.find_one({"submission_id": sid, "creator_id": user["user_id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Submission tidak ditemukan")
    if s["status"] != "menunggu_views":
        raise HTTPException(400, "Submission belum bisa diklaim")
    c = await db.campaigns.find_one({"campaign_id": s["campaign_id"]}, {"_id": 0, "status": 1})
    if not c or c["status"] == "closed":
        raise HTTPException(400, "Campaign sudah ditutup")
    if body.views < s["min_views"]:
        raise HTTPException(400, f"Views minimal {s['min_views']}")
    await db.submissions.update_one({"submission_id": sid, "status": "menunggu_views"},
                                    {"$set": {"status": "diproses", "claimed_views": body.views, "updated_at": iso()}})
    await notify(s["brand_id"], "Klaim views baru", f"{user['name']} klaim {body.views:,} views".replace(",", "."))
    return {"ok": True}


async def can_review(user, s):
    return user["role"] == "admin" or s["brand_id"] == user["user_id"]


class ReviewIn(BaseModel):
    action: Literal["approve", "reject"]
    note: Optional[str] = ""


@api.post("/submissions/{sid}/review")
async def review_content(sid: str, body: ReviewIn, user=Depends(require("brand", "admin"))):
    s = await db.submissions.find_one({"submission_id": sid}, {"_id": 0})
    if not s or not await can_review(user, s):
        raise HTTPException(404, "Submission tidak ditemukan")
    new = "menunggu_views" if body.action == "approve" else "ditolak"
    c = await db.campaigns.find_one({"campaign_id": s["campaign_id"]}, {"_id": 0, "status": 1})
    if new == "menunggu_views" and (not c or c["status"] == "closed"):
        raise HTTPException(400, "Campaign sudah ditutup")
    r = await db.submissions.update_one({"submission_id": sid, "status": "direview"},
                                        {"$set": {"status": new, "note": body.note or "", "updated_at": iso()}})
    if not r.modified_count:
        raise HTTPException(400, "Status submission sudah berubah")
    msg = "Konten disetujui, klaim views saat sudah mencapai target" if new == "menunggu_views" else f"Konten ditolak. {body.note or ''}"
    await notify(s["creator_id"], s["campaign_title"], msg, "success" if new != "ditolak" else "error")
    return {"ok": True}


class VerifyIn(BaseModel):
    action: Literal["approve", "reject"]
    verified_views: int = Field(default=0, ge=0)
    note: Optional[str] = ""


@api.post("/submissions/{sid}/verify")
async def verify_views(sid: str, body: VerifyIn, user=Depends(require("brand", "admin"))):
    s = await db.submissions.find_one({"submission_id": sid}, {"_id": 0})
    if not s or not await can_review(user, s):
        raise HTTPException(404, "Submission tidak ditemukan")
    lock = await db.submissions.find_one_and_update({"submission_id": sid, "status": "diproses"},
                                                    {"$set": {"status": "verifying"}})
    if not lock:
        raise HTTPException(400, "Submission tidak dalam status diproses")
    if body.action == "reject" or body.verified_views < s["min_views"]:
        note = body.note or ("Views di bawah minimum" if body.action == "approve" else "")
        await db.submissions.update_one({"submission_id": sid}, {"$set": {
            "status": "ditolak", "verified_views": body.verified_views, "note": note, "updated_at": iso()}})
        await notify(s["creator_id"], s["campaign_title"], f"Klaim views ditolak. {note}", "error")
        return {"ok": True, "payout": 0}
    payout = int(body.verified_views / 1000 * s["rate_per_1k"])
    amount = None
    try:
        for _ in range(5):
            c = await db.campaigns.find_one({"campaign_id": s["campaign_id"]}, {"_id": 0})
            if not c or c["status"] == "closed":
                break
            amt = min(payout, max(c["budget"] - c["spent"], 0))
            r = await db.campaigns.update_one({"campaign_id": c["campaign_id"], "spent": c["spent"], "status": {"$ne": "closed"}},
                                              {"$inc": {"spent": amt, "total_views": body.verified_views}})
            if r.modified_count:
                amount = amt
                break
    except Exception:
        await db.submissions.update_one({"submission_id": sid}, {"$set": {"status": "diproses"}})
        raise
    if amount is None:
        c = await db.campaigns.find_one({"campaign_id": s["campaign_id"]}, {"_id": 0, "status": 1})
        if not c or c["status"] == "closed":
            await db.submissions.update_one({"submission_id": sid}, {"$set": {"status": "ditolak", "note": "Campaign ditutup", "updated_at": iso()}})
            raise HTTPException(400, "Campaign sudah ditutup")
        await db.submissions.update_one({"submission_id": sid}, {"$set": {"status": "diproses"}})
        raise HTTPException(409, "Campaign sudah ditutup atau sedang sibuk, coba lagi")
    await db.submissions.update_one({"submission_id": sid}, {"$set": {
        "status": "disetujui", "verified_views": body.verified_views, "payout": amount,
        "note": body.note or "", "updated_at": iso()}})
    if amount:
        await db.users.update_one({"user_id": s["creator_id"]}, {"$inc": {"balance": amount, "total_earned": amount}})
        await db.ledger.insert_one({"entry_id": gen_id("led"), "user_id": s["creator_id"], "type": "earning",
                                    "amount": amount, "ref": sid, "created_at": iso()})
    c = await db.campaigns.find_one({"campaign_id": s["campaign_id"]}, {"_id": 0})
    if c["spent"] >= c["budget"] and c["status"] == "active":
        await db.campaigns.update_one({"campaign_id": c["campaign_id"]}, {"$set": {"status": "closed"}})
        await reject_open_submissions(c["campaign_id"], exclude=sid)
    await notify(s["creator_id"], s["campaign_title"], f"Views terverifikasi! +Rp {amount:,}".replace(",", "."), "success")
    return {"ok": True, "payout": amount}


@api.get("/brand/submissions")
async def brand_submissions(status: str = "", user=Depends(require("brand"))):
    f = {"brand_id": user["user_id"]}
    if status:
        f["status"] = status
    return await db.submissions.find(f, {"_id": 0}).sort("created_at", -1).to_list(500)


# ---------------- Withdrawals ----------------
class WithdrawIn(BaseModel):
    amount: int = Field(ge=MIN_WITHDRAW)
    method: str = Field(min_length=2, max_length=30)
    account_number: str = Field(min_length=5, max_length=30)
    account_holder: str = Field(min_length=2, max_length=80)


@api.post("/withdrawals")
async def create_withdrawal(body: WithdrawIn, user=Depends(require("creator"))):
    res = await db.users.find_one_and_update({"user_id": user["user_id"], "balance": {"$gte": body.amount}},
                                             {"$inc": {"balance": -body.amount}})
    if not res:
        raise HTTPException(400, "Saldo tidak cukup")
    w = {"withdrawal_id": gen_id("wd"), "creator_id": user["user_id"], "creator_name": user["name"],
         "creator_email": user["email"], **body.model_dump(), "status": "diproses", "reference": "",
         "created_at": iso(), "updated_at": iso()}
    await db.withdrawals.insert_one(w)
    await db.ledger.insert_one({"entry_id": gen_id("led"), "user_id": user["user_id"], "type": "withdraw_hold",
                                "amount": -body.amount, "ref": w["withdrawal_id"], "created_at": iso()})
    w.pop("_id", None)
    return w


@api.get("/creator/withdrawals")
async def my_withdrawals(user=Depends(require("creator"))):
    return await db.withdrawals.find({"creator_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ---------------- Brand top-up (Komerce) ----------------
class TopupIn(BaseModel):
    amount: int = Field(ge=10000, le=10_000_000_000)
    payment_type: Literal["qris", "bank_transfer"]
    channel_code: Optional[str] = "BCA"
    phone: Optional[str] = "081200000000"


def komerce_headers():
    key = os.environ.get('KOMERCE_API_KEY')
    if not key or not KOMERCE_BASE:
        raise HTTPException(503, "Pembayaran Komerce belum dikonfigurasi")
    return {"x-api-key": key, "Content-Type": "application/json"}


async def mark_topup_paid(topup):
    r = await db.topups.update_one({"topup_id": topup["topup_id"], "status": "pending"},
                                   {"$set": {"status": "paid", "paid_at": iso()}})
    if r.modified_count:
        await db.users.update_one({"user_id": topup["brand_id"]}, {"$inc": {"brand_balance": topup["amount"]}})
        await db.ledger.insert_one({"entry_id": gen_id("led"), "user_id": topup["brand_id"], "type": "topup",
                                    "amount": topup["amount"], "ref": topup["topup_id"], "created_at": iso()})
        await notify(topup["brand_id"], "Top up berhasil", f"Saldo brand +Rp {topup['amount']:,}".replace(",", "."), "success")


@api.post("/brand/topups")
async def create_topup(body: TopupIn, request: Request, user=Depends(require("brand"))):
    headers = komerce_headers()
    topup_id = gen_id("TOP").upper()
    cb_key = secrets.token_hex(16)
    origin = request.headers.get("origin") or f"https://{request.headers.get('host')}"
    payload = {"order_id": topup_id, "payment_type": body.payment_type, "amount": body.amount,
               "customer": {"name": user["name"], "email": user["email"], "phone": body.phone or "081200000000"},
               "items": [{"name": "Top up saldo campaign", "quantity": 1, "price": body.amount}],
               "callback_url": f"{origin}/api/payments/komerce/callback", "callback_api_key": cb_key}
    if body.payment_type == "bank_transfer":
        payload["channel_code"] = body.channel_code or "BCA"
        payload["expiry_duration"] = 86400
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{KOMERCE_BASE}/api/v1/user/payment/create", json=payload, headers=headers)
    data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if r.status_code >= 300 or not data.get("data"):
        logger.error("Komerce create failed %s %s", r.status_code, r.text[:500])
        raise HTTPException(502, (data.get("meta") or {}).get("message") or "Gagal membuat pembayaran")
    d = data["data"]
    t = {"topup_id": topup_id, "brand_id": user["user_id"], "amount": body.amount, "payment_type": body.payment_type,
         "channel_code": payload.get("channel_code", ""), "payment_id": d.get("payment_id"),
         "va_number": d.get("va_number", ""), "qr_string": d.get("qr_string", ""),
         "payment_url": d.get("payment_url") or d.get("url") or "", "callback_key": cb_key,
         "status": "pending", "created_at": iso()}
    await db.topups.insert_one(t)
    t.pop("_id", None)
    t.pop("callback_key", None)
    return t


@api.get("/brand/topups")
async def list_topups(user=Depends(require("brand"))):
    return await db.topups.find({"brand_id": user["user_id"]}, {"_id": 0, "callback_key": 0}).sort("created_at", -1).to_list(100)


async def sync_topup(t):
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(f"{KOMERCE_BASE}/api/v1/user/payment/status/{t['payment_id']}", headers=komerce_headers())
    status = ((r.json() if r.status_code == 200 else {}).get("data") or {}).get("status", "").upper()
    if status in ("PAID", "SUCCESS", "SETTLED", "COMPLETED"):
        await mark_topup_paid(t)
    elif status in ("EXPIRED", "CANCELED", "CANCELLED", "FAILED"):
        await db.topups.update_one({"topup_id": t["topup_id"], "status": "pending"}, {"$set": {"status": status.lower()}})
    return status


@api.post("/brand/topups/{tid}/check")
async def check_topup(tid: str, user=Depends(require("brand"))):
    t = await db.topups.find_one({"topup_id": tid, "brand_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Top up tidak ditemukan")
    if t["status"] == "pending":
        await sync_topup(t)
    return await db.topups.find_one({"topup_id": tid}, {"_id": 0, "callback_key": 0})


@api.post("/payments/komerce/callback")
async def komerce_callback(request: Request):
    raw = await request.body()
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "Bad payload")
    d = data.get("data", data)
    t = await db.topups.find_one({"$or": [{"payment_id": d.get("payment_id")}, {"topup_id": d.get("order_id")}]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Unknown payment")
    sig = request.headers.get("X-Callback-Api-Key", "")
    expected = hmac.new(t["callback_key"].encode(), raw, hashlib.sha256).hexdigest()
    if not (hmac.compare_digest(sig, expected) or hmac.compare_digest(sig, t["callback_key"])):
        raise HTTPException(401, "Invalid signature")
    # Re-confirm status directly with Komerce before crediting
    await sync_topup(t)
    return {"ok": True}


# ---------------- Brand stats ----------------
@api.get("/brand/stats")
async def brand_stats(user=Depends(require("brand"))):
    cs = await db.campaigns.find({"brand_id": user["user_id"]}, {"_id": 0}).to_list(500)
    pending = await db.submissions.count_documents({"brand_id": user["user_id"], "status": {"$in": ["direview", "diproses"]}})
    return {"brand_balance": user.get("brand_balance", 0), "active": sum(1 for c in cs if c["status"] == "active"),
            "spent": sum(c["spent"] for c in cs), "views": sum(c.get("total_views", 0) for c in cs),
            "pending_reviews": pending}


# ---------------- Admin ----------------
@api.get("/admin/stats")
async def admin_stats(user=Depends(require("admin"))):
    paid = await db.withdrawals.aggregate([{"$match": {"status": "disetujui"}}, {"$group": {"_id": None, "s": {"$sum": "$amount"}}}]).to_list(1)
    views = await db.campaigns.aggregate([{"$group": {"_id": None, "s": {"$sum": "$total_views"}}}]).to_list(1)
    return {"creators": await db.users.count_documents({"role": "creator"}),
            "brands": await db.users.count_documents({"role": "brand"}),
            "active_campaigns": await db.campaigns.count_documents({"status": "active"}),
            "pending_withdrawals": await db.withdrawals.count_documents({"status": "diproses"}),
            "pending_submissions": await db.submissions.count_documents({"status": {"$in": ["direview", "diproses"]}}),
            "total_paid": paid[0]["s"] if paid else 0, "total_views": views[0]["s"] if views else 0}


@api.get("/admin/users")
async def admin_users(user=Depends(require("admin"))):
    return await db.users.find({}, {"_id": 0, "post_dates": 0}).sort("created_at", -1).to_list(1000)


@api.get("/admin/submissions")
async def admin_submissions(status: str = "", user=Depends(require("admin"))):
    f = {"status": status} if status else {}
    return await db.submissions.find(f, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/admin/campaigns")
async def admin_campaigns(user=Depends(require("admin"))):
    return [campaign_view(c) for c in await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)]


@api.get("/admin/withdrawals")
async def admin_withdrawals(user=Depends(require("admin"))):
    return await db.withdrawals.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


class WdActionIn(BaseModel):
    action: Literal["approve", "reject"]
    reference: Optional[str] = ""


@api.post("/admin/withdrawals/{wid}")
async def admin_withdraw_action(wid: str, body: WdActionIn, user=Depends(require("admin"))):
    new = "disetujui" if body.action == "approve" else "ditolak"
    w = await db.withdrawals.find_one_and_update({"withdrawal_id": wid, "status": "diproses"},
                                                 {"$set": {"status": new, "reference": body.reference or "", "updated_at": iso()}})
    if not w:
        raise HTTPException(400, "Penarikan sudah diproses")
    amt = f"Rp {w['amount']:,}".replace(",", ".")
    if new == "ditolak":
        await db.users.update_one({"user_id": w["creator_id"]}, {"$inc": {"balance": w["amount"]}})
        await db.ledger.insert_one({"entry_id": gen_id("led"), "user_id": w["creator_id"], "type": "withdraw_refund",
                                    "amount": w["amount"], "ref": wid, "created_at": iso()})
        await notify(w["creator_id"], "Penarikan ditolak", f"{amt} dikembalikan ke saldo. {body.reference or ''}", "error")
    else:
        await notify(w["creator_id"], "Penarikan berhasil", f"{amt} via {w['method']} sudah ditransfer", "success")
    return {"ok": True}


class CreditIn(BaseModel):
    amount: int = Field(ge=1000)
    note: Optional[str] = ""


@api.post("/admin/users/{uid}/brand-credit")
async def admin_brand_credit(uid: str, body: CreditIn, user=Depends(require("admin"))):
    r = await db.users.update_one({"user_id": uid, "role": "brand"}, {"$inc": {"brand_balance": body.amount}})
    if not r.modified_count:
        raise HTTPException(404, "Brand tidak ditemukan")
    await db.ledger.insert_one({"entry_id": gen_id("led"), "user_id": uid, "type": "admin_credit", "amount": body.amount,
                                "ref": user["user_id"], "note": body.note, "created_at": iso()})
    await notify(uid, "Saldo brand ditambahkan", f"Admin menambahkan Rp {body.amount:,}".replace(",", "."), "success")
    return {"ok": True}


# ---------------- Public ----------------
@api.get("/public/stats")
async def public_stats():
    paid = await db.submissions.aggregate([{"$match": {"status": "disetujui"}}, {"$group": {"_id": None, "s": {"$sum": "$payout"}}}]).to_list(1)
    return {"creators": await db.users.count_documents({"role": "creator"}),
            "campaigns": await db.campaigns.count_documents({"status": "active"}),
            "total_paid": paid[0]["s"] if paid else 0}


@api.get("/public/payouts")
async def public_payouts():
    subs = await db.submissions.find({"status": "disetujui", "payout": {"$gt": 0}},
                                     {"_id": 0, "creator_name": 1, "payout": 1}).sort("updated_at", -1).to_list(20)
    out = []
    for s in subs:
        parts = s["creator_name"].split()
        out.append({"name": parts[0] + (f" {parts[1][0]}." if len(parts) > 1 else ""), "amount": s["payout"]})
    return out


# ---------------- Seed ----------------
SEED = [
    ("Glow Serum Vitamin C x Kreator Skincare", "Beauty", ["tiktok", "instagram"], 10000, 10000, 15000000, "https://images.unsplash.com/photo-1615396899839-c99c121888b0?w=800&q=80"),
    ("Face Oil Natural - Review Jujur", "Beauty", ["tiktok"], 8000, 5000, 8000000, "https://images.unsplash.com/photo-1600428853876-fb5a850b444f?w=800&q=80"),
    ("Moisturizer Daun Hijau (YC)", "Beauty", ["tiktok", "instagram"], 6000, 5000, 6000000, "https://images.unsplash.com/photo-1748543668676-ea8241cb3886?w=800&q=80"),
    ("Sate Nusantara - Kuliner Malam", "F&B", ["tiktok", "threads"], 5000, 1000, 5000000, "https://images.unsplash.com/photo-1568882041008-c0954e91caba?w=800&q=80"),
    ("Jajanan Gerobak Viral", "F&B", ["tiktok"], 3000, 1000, 3000000, "https://images.unsplash.com/photo-1545830016-b441e357919d?w=800&q=80"),
    ("Sneakers Lokal Drop Terbaru", "Fashion", ["tiktok", "instagram"], 7000, 10000, 12000000, "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800&q=80"),
    ("Streetwear Lookbook Challenge", "Fashion", ["instagram", "tiktok"], 4000, 5000, 4000000, "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80"),
    ("Unboxing Smartphone Murah Spek Dewa", "Tech", ["youtube", "tiktok"], 12000, 10000, 20000000, "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"),
    ("Tips Aplikasi Produktif", "Edukasi", ["tiktok", "youtube"], 4000, 2000, 3000000, "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80"),
    ("jkwEffect Threads Campaign", "Produk", ["threads"], 3000, 5000, 5000000, "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800&q=80"),
    ("Koleksi Sepatu Warna Pastel", "Produk", ["tiktok"], 2000, 5000, 2000000, "https://images.unsplash.com/photo-1689830570678-956587526e75?w=800&q=80"),
    ("Street Food Tour Jakarta", "Hiburan", ["tiktok", "instagram", "youtube"], 5000, 3000, 7000000, "https://images.unsplash.com/photo-1622572771591-6ca7813cc39d?w=800&q=80"),
]
SEED_INSTR = ("1. Buat video 15-60 detik yang menampilkan produk secara natural.\n2. Sebutkan nama brand di 3 detik pertama.\n"
              "3. Wajib pakai hashtag #jkwEffect dan tag akun brand.\n4. Dilarang konten SARA, kekerasan, atau beli views/bot.\n"
              "5. Video harus tetap tayang minimal 30 hari.")


@app.on_event("startup")
async def startup():
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.campaigns.create_index("campaign_id", unique=True)
    await db.submissions.create_index("submission_id", unique=True)
    await db.submissions.create_index("video_url", unique=True)
    await db.withdrawals.create_index("withdrawal_id", unique=True)
    await db.topups.create_index("topup_id", unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    if await db.campaigns.count_documents({}) == 0:
        brand_id = "user_demobrand"
        await db.users.update_one({"user_id": brand_id}, {"$setOnInsert": {
            "user_id": brand_id, "email": "demo-brand@ourbuzzer.local", "name": "Demo Brand", "picture": None,
            "role": "brand", "balance": 0, "total_earned": 0, "brand_balance": 0, "post_dates": [],
            "profile": {"brand_name": "Demo Brand"}, "created_at": iso()}}, upsert=True)
        for i, (title, cat, plats, rate, mv, budget, img) in enumerate(SEED):
            await db.campaigns.insert_one({
                "campaign_id": gen_id("cmp"), "brand_id": brand_id, "brand_name": "Demo Brand", "title": title,
                "category": cat, "platforms": plats, "rate_per_1k": rate, "min_views": mv, "budget": budget,
                "spent": int(budget * (i % 4) * 0.2), "thumbnail": img, "instructions": SEED_INSTR,
                "exclusive": i == 5, "submission_count": 12 - i, "total_views": 0, "status": "active",
                "deadline": (now() + timedelta(days=3 + i * 2)).isoformat(),
                "created_at": (now() - timedelta(hours=i * 7)).isoformat()})


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
