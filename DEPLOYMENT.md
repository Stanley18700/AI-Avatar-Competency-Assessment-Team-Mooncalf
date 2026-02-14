# Deployment Guide (Vercel + Render)

This project deploys best as:
- **Frontend (React/Vite):** Vercel
- **Backend (Express/Prisma):** Render
- **Database:** Render PostgreSQL

## 1) Deploy Backend API on Render

### Option A: Blueprint (fastest)
1. In Render, create a new **Blueprint** and point to this repository.
2. Render reads `render.yaml` and creates:
   - Web service: `nursemind-ai-api`
   - Postgres DB: `nursemind-ai-db`
3. Set missing required env vars in Render:
   - `CLIENT_URL` = your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `CLIENT_URLS` = comma-separated allowed origins (e.g. `https://your-app.vercel.app,https://your-preview.vercel.app`)
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `ENCRYPTION_KEY` (32-byte hex)
   - `ENCRYPTION_IV` (16-byte hex)
4. Wait for deploy. Confirm health endpoint:
   - `https://<your-render-service>.onrender.com/health`
   - Also works: `https://<your-render-service>.onrender.com/api/health`
   - Important: replace `<your-render-service>` with your real Render service name.
5. Confirm dependency health:
   - `https://<your-render-service>.onrender.com/health/dependencies`
   - Should return `status: "ok"` and all checks as `true`.

### Option B: Manual Render service
- Root Directory: `server`
- Build Command: `npm ci --include=dev && npm run build && npx prisma generate`
- Start Command: `npm run db:deploy && npm run start`
- Add the same env vars above.

## 2) Deploy Frontend on Vercel

1. In Vercel, import this repository.
2. Preferred: set **Root Directory** to `client`.
   - Alternative: keep root directory as repository root (supported by `vercel.json` in this repo).
3. Framework: Vite (auto-detected)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add environment variable:
   - `VITE_API_BASE_URL` = `https://<your-render-service>.onrender.com/api`
7. Deploy.

## 3) Required Environment Variables Summary

### Backend (Render)
- `DATABASE_URL` (from Render Postgres)
- `NODE_ENV=production`
- `PORT=10000` (or Render default)
- `CLIENT_URL` and/or `CLIENT_URLS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=24h`
- `GEMINI_API_KEY`
- `ENCRYPTION_KEY`
- `ENCRYPTION_IV`

### Frontend (Vercel)
- `VITE_API_BASE_URL`

## 4) Post-deploy checklist

- Open frontend and log in.
- Confirm API calls succeed (no CORS errors).
- Confirm `/health` is healthy.
- Confirm `/health/dependencies` is healthy (`database`, `geminiConfigured`, `jwtConfigured`, `encryptionConfigured` are all `true`).
- Run one assessment flow end-to-end.

## 5) Notes

- The frontend now reads API base URL from `VITE_API_BASE_URL` (fallback `/api` for local).
- Backend CORS now supports multiple origins via `CLIENT_URLS` (comma-separated).
