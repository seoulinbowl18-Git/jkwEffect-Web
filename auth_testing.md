# Auth Testing (Firebase Google Sign-In)

## How login works
1. Frontend (`frontend/src/context/AuthContext.jsx`) opens the Google popup via Firebase Auth
   (falls back to redirect if the popup is blocked).
2. It sends the Firebase ID token to `POST /api/auth/firebase`.
3. Backend verifies the token with Identity Toolkit `accounts:lookup` (using `FIREBASE_API_KEY`),
   upserts the user by email, and sets an httpOnly `session_token` cookie (7 days).
4. Everything else uses that cookie (or `Authorization: Bearer <token>`), exactly as before.

Firebase project: `jkweffect`. Add every domain you serve the app from
(e.g. your production domain) under Firebase console > Authentication > Settings > Authorized domains.

## Owner (Admin Pusat) login
`/admin/login` sends a 6-digit OTP over WhatsApp (Fonnte): `POST /api/admin/request-otp {phone}` then
`POST /api/admin/verify-otp {phone, code}` on the shared Railway backend.
Requirements on Railway: `FONNTE_TOKEN` (token of a connected Fonnte WhatsApp device) and
`OWNER_PHONES` (comma-separated, any format: 0812…, +62 812…). The code is valid 5 minutes, single use,
max 5 wrong attempts; resend after 60 s, max 5 per hour per number.

## Test users without Google
Create a test user + session in mongo (db from backend/.env DB_NAME), set `role` to creator/brand/admin:
```
mongosh --eval "use('ourbuzzer'); db.users.insertOne({user_id:'user_test1', email:'creator.test@example.com', name:'Test Creator', role:'creator', balance:0, total_earned:0, brand_balance:0, post_dates:[], profile:{}, created_at:new Date().toISOString()}); db.user_sessions.insertOne({user_id:'user_test1', session_token:'test_session_creator', expires_at:new Date(Date.now()+7*864e5), created_at:new Date()})"
```
Use `Authorization: Bearer <token>` for curl, or cookie `session_token` (secure, sameSite None) in browser.
