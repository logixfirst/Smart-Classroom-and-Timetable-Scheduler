# GitHub Secrets Configuration - Quick Reference

## 🔐 Secrets to Configure

Copy these values and add them to GitHub:
**Go to:** https://github.com/harssh-ssarma/SIH28/settings/secrets/actions

---

## Required Secrets (Copy from your services)

### Django Secret Key (GENERATED)
```
SECRET_KEY=dor@+%e+qdxc6f9sz$d3muiw!8dqmrit5&e_u+9+m@@!@4brsz
```

### Database & Redis (From your .env or service dashboards)
```
DATABASE_URL=postgresql://[username]:[password]@[host]:5432/[database]?sslmode=require
REDIS_URL=redis://default:[password]@[host]:6379
```
**Where to find:**
- Neon PostgreSQL: https://console.neon.tech/ → Your Project → Connection Details
- Upstash Redis: https://console.upstash.com/ → Your Database → Details → REST API

### Backend Deployment (Render)
```
RENDER_BACKEND_SERVICE_ID=srv-xxxxx
RENDER_API_KEY=rnd_xxxxx
BACKEND_URL=https://your-app.onrender.com
```
**Where to find:**
- Service ID: Render Dashboard → Service URL (contains srv-xxxxx)
- API Key: https://dashboard.render.com/account → API Keys
- Backend URL: Your Render service URL

### Frontend Deployment (Vercel)
```
VERCEL_TOKEN=xxxxx
VERCEL_ORG_ID=team_xxxxx
VERCEL_PROJECT_ID=prj_xxxxx
FRONTEND_URL=https://your-app.vercel.app
API_URL=https://your-app.onrender.com
```
**Where to find:**
- Token: https://vercel.com/account/tokens → Create Token
- Org & Project IDs: Run `vercel link` in frontend folder, check .vercel/project.json

---

## Optional Secrets (For enhanced features)

```
SNYK_TOKEN=xxxxx          # https://snyk.io/ → Account Settings → Auth Token
CODECOV_TOKEN=xxxxx       # https://codecov.io/ → Repository → Settings
SENTRY_DSN=xxxxx          # https://sentry.io/ → Project Settings → Client Keys
```

---

## Quick Commands

### Get Vercel IDs
```powershell
cd d:\GitHub\SIH28\frontend
vercel link
Get-Content .vercel\project.json
```

### Set Secrets via GitHub CLI (Fastest Method)
```powershell
gh auth login

# Required secrets
gh secret set SECRET_KEY
gh secret set DATABASE_URL
gh secret set REDIS_URL
gh secret set RENDER_BACKEND_SERVICE_ID
gh secret set RENDER_API_KEY
gh secret set BACKEND_URL
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
gh secret set FRONTEND_URL
gh secret set API_URL

# Optional secrets
gh secret set SNYK_TOKEN
gh secret set CODECOV_TOKEN
gh secret set SENTRY_DSN
```

### Verify Secrets Are Set
```powershell
gh secret list
```

---

## After Configuration

1. **Check Actions Tab:** https://github.com/harssh-ssarma/SIH28/actions
2. **Make a Test Commit:**
   ```powershell
   echo "# Test CI/CD" >> TEST.md
   git add TEST.md
   git commit -m "test: Trigger CI/CD workflows"
   git push origin main
   ```
3. **Verify Workflows Pass:**
   - ✅ Backend Tests (Python 3.11, 3.12, 3.13)
   - ✅ Frontend Tests (Node 18.x, 20.x)
   - ✅ Security Scan (7 tools)
   - ✅ Deployment (after all tests pass)

---

## Troubleshooting

**Workflows failing?**
- Check logs in Actions tab
- Verify secret names match exactly (case-sensitive)
- Ensure no extra spaces in values

**Need help?**
- See: `SECRETS-CHECKLIST.md` for detailed guide
- See: `CI-CD-SETUP.md` for workflow documentation
