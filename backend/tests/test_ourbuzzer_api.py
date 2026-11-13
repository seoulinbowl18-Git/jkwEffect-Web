# OurBuzzer API regression tests (auth/roles, campaigns, submissions flow, withdrawals, topups, notifications)
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

TOK = {
    "admin": "test_session_user_tadmin",
    "creator": "test_session_user_tcreator",
    "creator2": "test_session_user_tcreator2",
    "brand": "test_session_brand",
    "brand2": "test_session_user_tbrand2",
    "norole": "test_session_user_tnorole",
}


def s(role):
    x = requests.Session()
    x.headers.update({"Authorization": f"Bearer {TOK[role]}", "Content-Type": "application/json"})
    return x


def uniq():
    return uuid.uuid4().hex[:10]


CAMPAIGN = {"title": "TEST_Campaign", "category": "Beauty", "platforms": ["tiktok", "instagram"],
            "rate_per_1k": 10000, "min_views": 1000, "budget": 100000,
            "instructions": "Buat video jujur tentang produk ini.", "exclusive": False, "deadline_days": 10}


# ---------- Public ----------
class TestPublic:
    def test_sections(self):
        r = requests.get(f"{API}/campaigns/sections")
        assert r.status_code == 200
        d = r.json()
        for k in ["trending", "top_rate", "newest", "closing", "total", "total_exclusive"]:
            assert k in d
        assert d["total"] >= 1 and len(d["trending"]) >= 1
        assert "_id" not in d["trending"][0]

    def test_list_filters(self):
        r = requests.get(f"{API}/campaigns", params={"category": "Beauty"})
        assert r.status_code == 200 and all(c["category"] == "Beauty" for c in r.json())
        r = requests.get(f"{API}/campaigns", params={"q": "sate"})
        assert all("sate" in c["title"].lower() for c in r.json()) and len(r.json()) >= 1
        r = requests.get(f"{API}/campaigns", params={"exclusive": "true"})
        assert all(c["exclusive"] for c in r.json()) and len(r.json()) >= 1

    def test_public_stats(self):
        assert requests.get(f"{API}/public/stats").status_code == 200
        assert requests.get(f"{API}/public/payouts").status_code == 200

    def test_campaign_404(self):
        assert requests.get(f"{API}/campaigns/cmp_nope").status_code == 404


# ---------- Auth & roles ----------
class TestAuthRoles:
    def test_me_unauth(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_me(self):
        r = s("creator").get(f"{API}/auth/me")
        assert r.status_code == 200 and r.json()["role"] == "creator"

    def test_set_role_flow(self):
        from pymongo import MongoClient  # reset test user role so test is idempotent
        MongoClient("mongodb://localhost:27017")["test_database"].users.update_one({"user_id": "user_tnorole"}, {"$set": {"role": None}})
        r = s("norole").post(f"{API}/users/role", json={"role": "creator"})
        assert r.status_code == 200 and r.json()["role"] == "creator"
        r2 = s("norole").post(f"{API}/users/role", json={"role": "brand"})
        assert r2.status_code == 400

    def test_creator_forbidden(self):
        c = s("creator")
        assert c.get(f"{API}/brand/stats").status_code == 403
        assert c.post(f"{API}/campaigns", json=CAMPAIGN).status_code == 403
        assert c.get(f"{API}/admin/users").status_code == 403
        assert c.post(f"{API}/brand/topups", json={"amount": 10000, "payment_type": "qris"}).status_code == 403

    def test_brand_forbidden_admin(self):
        assert s("brand").get(f"{API}/admin/stats").status_code == 403
        assert s("brand").post(f"{API}/submissions", json={"campaign_id": "x", "platform": "tiktok", "video_url": "https://tiktok.com/a"}).status_code == 403


@pytest.fixture(scope="module")
def brand_campaign():
    adm = s("admin")
    r = adm.post(f"{API}/admin/users/user_tbrand/brand-credit", json={"amount": 300000})
    assert r.status_code == 200
    br = s("brand")
    bal0 = br.get(f"{API}/brand/stats").json()["brand_balance"]
    r = br.post(f"{API}/campaigns", json=CAMPAIGN)
    assert r.status_code == 200, r.text
    c = r.json()
    bal1 = br.get(f"{API}/brand/stats").json()["brand_balance"]
    assert bal0 - bal1 == CAMPAIGN["budget"]
    return c


# ---------- Brand campaigns ----------
class TestBrand:
    def test_insufficient_balance(self):
        r = s("brand2").post(f"{API}/campaigns", json={**CAMPAIGN, "budget": 999999999})
        assert r.status_code == 400 and "Saldo" in r.json()["detail"]

    def test_credit_non_brand_404(self):
        assert s("admin").post(f"{API}/admin/users/user_tcreator/brand-credit", json={"amount": 5000}).status_code == 404

    def test_campaign_created(self, brand_campaign):
        r = requests.get(f"{API}/campaigns/{brand_campaign['campaign_id']}")
        assert r.status_code == 200 and r.json()["brand_id"] == "user_tbrand"
        lst = s("brand").get(f"{API}/brand/campaigns").json()
        assert any(c["campaign_id"] == brand_campaign["campaign_id"] for c in lst)

    def test_pause_and_close_refund(self):
        br = s("brand")
        r = br.post(f"{API}/campaigns", json={**CAMPAIGN, "title": "TEST_closeme"})
        assert r.status_code == 200
        cid = r.json()["campaign_id"]
        bal = br.get(f"{API}/brand/stats").json()["brand_balance"]
        assert br.patch(f"{API}/campaigns/{cid}/status", json={"status": "paused"}).status_code == 200
        assert requests.get(f"{API}/campaigns/{cid}").json()["status"] == "paused"
        assert br.patch(f"{API}/campaigns/{cid}/status", json={"status": "closed"}).status_code == 200
        assert br.get(f"{API}/brand/stats").json()["brand_balance"] == bal + CAMPAIGN["budget"]
        assert br.patch(f"{API}/campaigns/{cid}/status", json={"status": "active"}).status_code == 400

    def test_other_brand_cannot_change_status(self, brand_campaign):
        r = s("brand2").patch(f"{API}/campaigns/{brand_campaign['campaign_id']}/status", json={"status": "paused"})
        assert r.status_code == 404


# ---------- Submissions full flow ----------
class TestSubmissionFlow:
    def test_platform_mismatch_and_dup(self, brand_campaign):
        cr = s("creator")
        cid = brand_campaign["campaign_id"]
        r = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": "https://www.instagram.com/reel/abc"})
        assert r.status_code == 400
        r = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "youtube", "video_url": "https://youtube.com/shorts/x"})
        assert r.status_code == 400
        url = f"https://www.tiktok.com/@t/video/{uniq()}"
        assert cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": url}).status_code == 200
        r = s("creator2").post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": url})
        assert r.status_code == 400

    def test_full_flow_payout(self, brand_campaign):
        cr, br = s("creator"), s("brand")
        cid = brand_campaign["campaign_id"]
        bal0 = cr.get(f"{API}/creator/stats").json()["balance"]
        r = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "instagram", "video_url": f"https://instagram.com/reel/{uniq()}"})
        assert r.status_code == 200 and r.json()["status"] == "direview"
        sid = r.json()["submission_id"]
        st = cr.get(f"{API}/creator/stats").json()
        assert st["streak"]["streak"] >= 1 and st["streak"]["posted_today"]
        # claim before approve not allowed
        assert cr.post(f"{API}/submissions/{sid}/claim", json={"views": 5000}).status_code == 400
        # other brand can't review
        assert s("brand2").post(f"{API}/submissions/{sid}/review", json={"action": "approve"}).status_code == 404
        assert br.post(f"{API}/submissions/{sid}/review", json={"action": "approve"}).status_code == 200
        # below min views claim
        assert cr.post(f"{API}/submissions/{sid}/claim", json={"views": 10}).status_code == 400
        assert cr.post(f"{API}/submissions/{sid}/claim", json={"views": 5555}).status_code == 200
        assert s("brand2").post(f"{API}/submissions/{sid}/verify", json={"action": "approve", "verified_views": 5555}).status_code == 404
        r = br.post(f"{API}/submissions/{sid}/verify", json={"action": "approve", "verified_views": 5555})
        assert r.status_code == 200 and r.json()["payout"] == 55550
        st = cr.get(f"{API}/creator/stats").json()
        assert st["balance"] == bal0 + 55550
        subs = cr.get(f"{API}/creator/submissions").json()
        assert next(x for x in subs if x["submission_id"] == sid)["status"] == "disetujui"

    def test_budget_cap(self, brand_campaign):
        cr, adm = s("creator"), s("admin")
        cid = brand_campaign["campaign_id"]
        r = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": f"https://tiktok.com/@a/video/{uniq()}"})
        sid = r.json()["submission_id"]
        assert adm.post(f"{API}/submissions/{sid}/review", json={"action": "approve"}).status_code == 200
        assert cr.post(f"{API}/submissions/{sid}/claim", json={"views": 100000}).status_code == 200
        c = requests.get(f"{API}/campaigns/{cid}").json()
        left = c["budget"] - c["spent"]
        r = adm.post(f"{API}/submissions/{sid}/verify", json={"action": "approve", "verified_views": 100000})
        assert r.status_code == 200 and r.json()["payout"] == left
        assert requests.get(f"{API}/campaigns/{cid}").json()["status"] == "closed"

    def test_verify_below_min_rejected(self):
        cr, adm = s("creator"), s("admin")
        camps = requests.get(f"{API}/campaigns", params={"q": "Jajanan"}).json()
        cid = camps[0]["campaign_id"]
        r = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": f"https://tiktok.com/@a/video/{uniq()}"})
        sid = r.json()["submission_id"]
        adm.post(f"{API}/submissions/{sid}/review", json={"action": "approve"})
        cr.post(f"{API}/submissions/{sid}/claim", json={"views": 2000})
        r = adm.post(f"{API}/submissions/{sid}/verify", json={"action": "approve", "verified_views": 500})
        assert r.status_code == 200 and r.json()["payout"] == 0
        subs = cr.get(f"{API}/creator/submissions").json()
        assert next(x for x in subs if x["submission_id"] == sid)["status"] == "ditolak"

    def test_closed_campaign_no_double_pay(self):
        """After brand closes & is refunded, verifying a pending claim must not pay out of refunded budget."""
        br, cr = s("brand"), s("creator")
        s("admin").post(f"{API}/admin/users/user_tbrand/brand-credit", json={"amount": 100000})
        cid = br.post(f"{API}/campaigns", json={**CAMPAIGN, "title": "TEST_dbl"}).json()["campaign_id"]
        sid = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": f"https://tiktok.com/@a/video/{uniq()}"}).json()["submission_id"]
        br.post(f"{API}/submissions/{sid}/review", json={"action": "approve"})
        cr.post(f"{API}/submissions/{sid}/claim", json={"views": 5000})
        bal_b = br.get(f"{API}/brand/stats").json()["brand_balance"]
        br.patch(f"{API}/campaigns/{cid}/status", json={"status": "closed"})
        refunded = br.get(f"{API}/brand/stats").json()["brand_balance"] - bal_b
        r = br.post(f"{API}/submissions/{sid}/verify", json={"action": "approve", "verified_views": 5000})
        payout = r.json().get("payout", 0) if r.status_code == 200 else 0
        assert refunded + payout <= CAMPAIGN["budget"], f"refund {refunded} + payout {payout} > budget"


# ---------- Withdrawals ----------
class TestWithdrawals:
    def test_withdraw_rules(self):
        cr, adm = s("creator"), s("admin")
        bal = cr.get(f"{API}/creator/stats").json()["balance"]
        body = {"method": "BCA", "account_number": "1234567", "account_holder": "Test"}
        assert cr.post(f"{API}/withdrawals", json={**body, "amount": 40000}).status_code == 422
        assert cr.post(f"{API}/withdrawals", json={**body, "amount": bal + 1000000}).status_code == 400
        assert bal >= 100000, "need balance from previous flow tests"
        w1 = cr.post(f"{API}/withdrawals", json={**body, "amount": 50000}).json()
        assert cr.get(f"{API}/creator/stats").json()["balance"] == bal - 50000
        w2 = cr.post(f"{API}/withdrawals", json={**body, "amount": 50000}).json()
        assert cr.post(f"{API}/admin/withdrawals/{w1['withdrawal_id']}", json={"action": "approve"}).status_code == 403
        assert adm.post(f"{API}/admin/withdrawals/{w1['withdrawal_id']}", json={"action": "approve", "reference": "TRX1"}).status_code == 200
        assert adm.post(f"{API}/admin/withdrawals/{w1['withdrawal_id']}", json={"action": "reject"}).status_code == 400
        assert adm.post(f"{API}/admin/withdrawals/{w2['withdrawal_id']}", json={"action": "reject", "reference": "no"}).status_code == 200
        assert cr.get(f"{API}/creator/stats").json()["balance"] == bal - 50000
        lst = cr.get(f"{API}/creator/withdrawals").json()
        st = {w["withdrawal_id"]: w for w in lst}
        assert st[w1["withdrawal_id"]]["status"] == "disetujui" and st[w1["withdrawal_id"]]["reference"] == "TRX1"
        assert st[w2["withdrawal_id"]]["status"] == "ditolak"


# ---------- Notifications ----------
class TestNotifications:
    def test_notifications(self):
        cr = s("creator")
        d = cr.get(f"{API}/notifications").json()
        assert d["unread"] >= 1 and len(d["items"]) >= 1
        assert cr.post(f"{API}/notifications/read-all").status_code == 200
        assert cr.get(f"{API}/notifications").json()["unread"] == 0


# ---------- Komerce topups (sandbox) ----------
class TestTopups:
    @pytest.mark.parametrize("ptype", ["qris", "bank_transfer"])
    def test_topup(self, ptype):
        br = s("brand")
        r = br.post(f"{API}/brand/topups", json={"amount": 50000, "payment_type": ptype, "channel_code": "BCA"}, timeout=60)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["payment_id"] and t["status"] == "pending" and "callback_key" not in t
        if ptype == "qris":
            assert t["qr_string"]
        else:
            assert t["va_number"]
        c = br.post(f"{API}/brand/topups/{t['topup_id']}/check", timeout=60)
        assert c.status_code == 200 and c.json()["status"] in ("pending", "paid", "expired")
        assert any(x["topup_id"] == t["topup_id"] for x in br.get(f"{API}/brand/topups").json())


# ---------- Iteration 2: close auto-reject, verify 409, URL normalization, logout, callback ----------
def _mongo():
    from pymongo import MongoClient
    return MongoClient("mongodb://localhost:27017")["test_database"]


def _new_campaign(title):
    s("admin").post(f"{API}/admin/users/user_tbrand/brand-credit", json={"amount": 100000})
    r = s("brand").post(f"{API}/campaigns", json={**CAMPAIGN, "title": title})
    assert r.status_code == 200, r.text
    return r.json()["campaign_id"]


def _sub(cid, creator="creator", platform="tiktok"):
    url = f"https://tiktok.com/@a/video/{uniq()}" if platform == "tiktok" else f"https://instagram.com/reel/{uniq()}"
    r = s(creator).post(f"{API}/submissions", json={"campaign_id": cid, "platform": platform, "video_url": url})
    assert r.status_code == 200, r.text
    return r.json()["submission_id"]


class TestCloseAutoReject:
    def test_close_rejects_all_pending(self):
        br, cr = s("brand"), s("creator")
        cid = _new_campaign("TEST_autoreject")
        s_review = _sub(cid)
        s_wait = _sub(cid)
        s_proc = _sub(cid)
        assert br.post(f"{API}/submissions/{s_wait}/review", json={"action": "approve"}).status_code == 200
        assert br.post(f"{API}/submissions/{s_proc}/review", json={"action": "approve"}).status_code == 200
        assert cr.post(f"{API}/submissions/{s_proc}/claim", json={"views": 5000}).status_code == 200
        bal_b = br.get(f"{API}/brand/stats").json()["brand_balance"]
        bal_c = cr.get(f"{API}/creator/stats").json()["balance"]
        assert br.patch(f"{API}/campaigns/{cid}/status", json={"status": "closed"}).status_code == 200
        assert br.get(f"{API}/brand/stats").json()["brand_balance"] - bal_b == CAMPAIGN["budget"]
        subs = {x["submission_id"]: x for x in cr.get(f"{API}/creator/submissions").json()}
        for sid in (s_review, s_wait, s_proc):
            assert subs[sid]["status"] == "ditolak" and subs[sid]["note"] == "Campaign ditutup"
        # verify / claim / review refused
        r = br.post(f"{API}/submissions/{s_proc}/verify", json={"action": "approve", "verified_views": 5000})
        assert r.status_code == 400
        assert cr.post(f"{API}/submissions/{s_wait}/claim", json={"views": 5000}).status_code == 400
        assert br.post(f"{API}/submissions/{s_review}/review", json={"action": "approve"}).status_code == 400
        assert cr.get(f"{API}/creator/stats").json()["balance"] == bal_c
        n = cr.get(f"{API}/notifications").json()["items"]
        assert any("Campaign ditutup" in x["body"] for x in n)

    def test_verify_409_when_closed_reverts_lock(self):
        """Simulate race: submission still diproses but campaign closed -> 409 and status back to diproses."""
        br, cr = s("brand"), s("creator")
        cid = _new_campaign("TEST_race")
        sid = _sub(cid)
        br.post(f"{API}/submissions/{sid}/review", json={"action": "approve"})
        cr.post(f"{API}/submissions/{sid}/claim", json={"views": 5000})
        _mongo().campaigns.update_one({"campaign_id": cid}, {"$set": {"status": "closed"}})
        bal_c = cr.get(f"{API}/creator/stats").json()["balance"]
        r = br.post(f"{API}/submissions/{sid}/verify", json={"action": "approve", "verified_views": 5000})
        assert r.status_code == 409, r.text
        assert _mongo().submissions.find_one({"submission_id": sid})["status"] == "diproses"
        assert cr.get(f"{API}/creator/stats").json()["balance"] == bal_c
        # restore so brand can close & get refund cleanly
        _mongo().campaigns.update_one({"campaign_id": cid}, {"$set": {"status": "active"}})
        br.patch(f"{API}/campaigns/{cid}/status", json={"status": "closed"})

    def test_verify_missing_campaign_reverts_lock(self):
        br, cr = s("brand"), s("creator")
        cid = _new_campaign("TEST_missing")
        sid = _sub(cid)
        br.post(f"{API}/submissions/{sid}/review", json={"action": "approve"})
        cr.post(f"{API}/submissions/{sid}/claim", json={"views": 5000})
        db = _mongo()
        camp = db.campaigns.find_one({"campaign_id": cid}, {"_id": 0})
        db.campaigns.delete_one({"campaign_id": cid})
        r = br.post(f"{API}/submissions/{sid}/verify", json={"action": "approve", "verified_views": 5000})
        st = db.submissions.find_one({"submission_id": sid})["status"]
        db.campaigns.insert_one(camp)
        br.patch(f"{API}/campaigns/{cid}/status", json={"status": "closed"})
        assert r.status_code in (409, 500) and st == "diproses", f"{r.status_code} {st}"


class TestUrlNormalization:
    def test_variants_rejected(self):
        cid = _new_campaign("TEST_norm")
        cr, cr2 = s("creator"), s("creator2")
        vid = uniq()
        base = f"https://www.tiktok.com/@u/video/{vid}"
        r = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": base + "?is_from_webapp=1&sender_device=pc"})
        assert r.status_code == 200 and r.json()["video_url"] == f"https://tiktok.com/@u/video/{vid}"
        for v in [base, base + "/", f"https://m.tiktok.com/@u/video/{vid}", f"https://TIKTOK.com/@u/video/{vid}",
                  f"http://tiktok.com/@u/video/{vid}#x", f"https://WWW.TikTok.com/@u/video/{vid}/?lang=id"]:
            r = cr2.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "tiktok", "video_url": v})
            assert r.status_code == 400 and "sudah" in r.json()["detail"], v
        s("brand").patch(f"{API}/campaigns/{cid}/status", json={"status": "closed"})

    def test_youtube_watch_distinct_videos(self):
        """Different YouTube watch?v= videos must NOT be treated as duplicates."""
        c = s("admin").get(f"{API}/admin/campaigns").json()
        cid = next(x["campaign_id"] for x in c if "youtube" in x["platforms"] and x["status"] == "active")
        cr = s("creator")
        r1 = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "youtube", "video_url": f"https://www.youtube.com/watch?v={uniq()}"})
        r2 = cr.post(f"{API}/submissions", json={"campaign_id": cid, "platform": "youtube", "video_url": f"https://www.youtube.com/watch?v={uniq()}"})
        assert r1.status_code == 200, r1.text
        assert r2.status_code == 200, f"second distinct youtube video rejected: {r2.text}"


class TestLogout:
    def test_bearer_logout_deletes_session(self):
        x = requests.Session()
        x.headers.update({"Authorization": "Bearer test_session_logout"})
        assert x.get(f"{API}/auth/me").status_code == 200
        assert x.post(f"{API}/auth/logout").status_code == 200
        assert x.get(f"{API}/auth/me").status_code == 401


class TestCallback:
    def test_callback_signatures(self):
        import hmac, hashlib, json
        br = s("brand")
        r = br.post(f"{API}/brand/topups", json={"amount": 50000, "payment_type": "qris"}, timeout=60)
        assert r.status_code == 200, r.text
        t = r.json()
        key = _mongo().topups.find_one({"topup_id": t["topup_id"]})["callback_key"]
        body = json.dumps({"payment_id": t["payment_id"], "order_id": t["topup_id"], "status": "PAID"}).encode()
        h = {"Content-Type": "application/json"}
        bal0 = br.get(f"{API}/brand/stats").json()["brand_balance"]
        assert requests.post(f"{API}/payments/komerce/callback", data=body, headers=h).status_code == 401
        assert requests.post(f"{API}/payments/komerce/callback", data=body, headers={**h, "X-Callback-Api-Key": "bad"}).status_code == 401
        sig = hmac.new(key.encode(), body, hashlib.sha256).hexdigest()
        r1 = requests.post(f"{API}/payments/komerce/callback", data=body, headers={**h, "X-Callback-Api-Key": sig}, timeout=60)
        assert r1.status_code == 200, r1.text
        r2 = requests.post(f"{API}/payments/komerce/callback", data=body, headers={**h, "X-Callback-Api-Key": key}, timeout=60)
        assert r2.status_code == 200, r2.text
        bogus = json.dumps({"payment_id": "nope", "order_id": "nope"}).encode()
        assert requests.post(f"{API}/payments/komerce/callback", data=bogus, headers={**h, "X-Callback-Api-Key": key}).status_code == 404
        # sandbox still pending -> no credit
        assert br.get(f"{API}/brand/stats").json()["brand_balance"] == bal0
        assert br.post(f"{API}/brand/topups/{t['topup_id']}/check", timeout=60).json()["status"] == "pending"
