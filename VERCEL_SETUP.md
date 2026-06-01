# 🚀 VERCEL DEPLOYMENT SETUP GUIDE

## Quick Start - Frontend Deployment

### Step 1: Vercel Dashboard Setup (5 minutes)

1. **Open Vercel**: https://vercel.com/dashboard
2. **Connect your repo** (if not already):
   - Click "Add New" → "Project"
   - Import Git repository: `SEEDCHAIN-MINOR-PROJECT`
   - Select GitHub account

3. **Configure Project Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: Leave empty (auto-detected as root)
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `artifacts/seedchain/dist/public`
   - **Install Command**: `pnpm install --frozen-lockfile`

### Step 2: Add Environment Variables

1. Go to your project → **Settings** → **Environment Variables**
2. Add these variables for **Production**:

| Variable Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://joeoubchvrtdwlqhpywm.supabase.co` | For authentication |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_KXhLWIWKoWt-LzXcKUZDCA__5jUBTDY` | Public API key |

3. Save and redeploy

### Step 3: Trigger Deployment

**Option A**: Auto-deploy from GitHub (Recommended)
- Just push to `main` branch on GitHub
- Vercel automatically detects changes and deploys

**Option B**: Manual redeploy
- Go to project → **Deployments**
- Click the ⋮ menu on latest deployment
- Select "Redeploy"

---

## ✅ Verification

### Check Frontend is Working:
1. Go to your Vercel domain (e.g., `seedchain.vercel.app`)
2. Verify:
   - ✓ Page loads with soft white background (#FAFAF8)
   - ✓ Navigation works (About, How It Works, etc.)
   - ✓ Supabase auth is connected (login/register pages)

### Test API Integration:
```bash
# If you deployed backend separately:
curl https://your-backend-domain.com/health
# Should return: OK
```

---

## 🔧 Backend Deployment (Optional)

If you want to deploy the API server separately:

### Option 1: Deploy to Vercel as Serverless Functions

1. Create a new Vercel project for the API
2. Set **Root Directory**: `artifacts/api-server`
3. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `FRONTEND_URL`: Your frontend Vercel domain

### Option 2: Deploy to Railway/Render (Recommended for PostgreSQL)

**Railway.app** is ideal for Node.js + PostgreSQL:

1. Go to https://railway.app
2. Create new project → GitHub
3. Select `SEEDCHAIN-MINOR-PROJECT` repo
4. Add PostgreSQL plugin
5. Set variables:
   ```
   DATABASE_URL=postgresql://[user]:[pass]@[host]:[port]/[db]
   PORT=8080
   FRONTEND_URL=https://seedchain.vercel.app
   ```

---

## 📋 Environment Variables Reference

### Frontend (seedchain) - Vercel Environment Variables

```
VITE_SUPABASE_URL
├─ What: Supabase project URL
├─ Value: https://joeoubchvrtdwlqhpywm.supabase.co
├─ Required: Yes
└─ Used for: Authentication, real-time features

VITE_SUPABASE_ANON_KEY
├─ What: Supabase public API key
├─ Value: sb_publishable_KXhLWIWKoWt-LzXcKUZDCA__5jUBTDY
├─ Required: Yes
└─ Used for: Client-side auth, database queries
```

### Backend (api-server) - If Deploying Separately

```
DATABASE_URL
├─ What: PostgreSQL connection string
├─ Format: postgresql://user:password@host:port/database
├─ Required: Yes
└─ Used for: Database connection

FRONTEND_URL
├─ What: Frontend deployment URL
├─ Example: https://seedchain.vercel.app
├─ Required: Yes
└─ Used for: CORS, redirects

PORT
├─ What: Server port
├─ Default: 8080 (set by platform)
├─ Required: No
└─ Used for: Server startup
```

---

## 🐛 Troubleshooting

### Issue: "Build failed - PORT environment variable required"
**Status**: ✅ FIXED (mockup-sandbox now optional)
- Vercel will skip the development tool during build
- If still fails, verify `pnpm run build` works locally first

### Issue: "Cannot connect to API"
**Solution**:
- Check API backend is deployed and running
- Verify `FRONTEND_URL` matches your Vercel domain
- Enable CORS in backend if needed

### Issue: "Supabase authentication fails"
**Solution**:
- Verify `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Check Supabase project settings for allowed domains

### Issue: "Build output not found"
**Solution**:
- Verify **Output Directory** is: `artifacts/seedchain/dist/public`
- Run locally: `pnpm run build` and check `artifacts/seedchain/dist/public` exists

---

## 📝 Files Added for Vercel

```
.env.vercel                              ← Reference guide (this file)
artifacts/seedchain/.env.production      ← Production env vars for frontend
artifacts/seedchain/vercel.json          ← Vercel build configuration
```

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] All code committed and pushed to GitHub
- [ ] Build works locally: `pnpm run build`
- [ ] No TypeScript errors: `pnpm run typecheck`

### Vercel Setup
- [ ] GitHub repo connected to Vercel
- [ ] Build settings configured correctly
- [ ] Environment variables added (VITE_SUPABASE_*)
- [ ] Root directory and output directory correct

### Post-Deployment
- [ ] Frontend loads at Vercel domain
- [ ] Background color is soft white (#FAFAF8)
- [ ] Navigation works
- [ ] Auth pages load
- [ ] No console errors

### Backend (Optional)
- [ ] Backend deployed and running
- [ ] Database connection works
- [ ] `/health` endpoint returns OK
- [ ] Frontend can communicate with backend

---

## 🚀 Deploy Now!

Your code is ready! Just:
1. Commit and push to GitHub
2. Vercel will auto-deploy
3. Visit your domain and enjoy! 🎉

**Your Site**: https://your-project.vercel.app (once deployed)

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev
- **Supabase Docs**: https://supabase.com/docs
