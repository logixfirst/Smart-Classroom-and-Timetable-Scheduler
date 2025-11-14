# 🚀 QUICK START: Configure CI/CD Secrets

## ⚡ 3-Step Setup (10 minutes)

### Step 1: Generate Required Values

```powershell
# 1. Generate Django SECRET_KEY
cd d:\GitHub\SIH28\backend\django
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# 2. Get Vercel IDs
cd d:\GitHub\SIH28\frontend
vercel link
Get-Content .vercel\project.json
```

### Step 2: Configure Secrets

**Go to:** https://github.com/harssh-ssarma/SIH28/settings/secrets/actions

Click **"New repository secret"** for each:

| Secret Name | Where to Get | Example |
|------------|-------------|---------|
| `RENDER_BACKEND_SERVICE_ID` | Render Dashboard → Service URL | `srv-abc123` |
| `RENDER_API_KEY` | Render → Account Settings → API Keys | `rnd_xxxxx` |
| `BACKEND_URL` | Your Render service URL | `https://sih28.onrender.com` |
| `VERCEL_TOKEN` | https://vercel.com/account/tokens | `xxxxxxxxxx` |
| `VERCEL_ORG_ID` | `.vercel/project.json` | `team_xxxxx` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` | `prj_xxxxx` |
| `FRONTEND_URL` | Your Vercel URL | `https://sih28.vercel.app` |
| `API_URL` | Same as BACKEND_URL | `https://sih28.onrender.com` |
| `DATABASE_URL` | Neon Dashboard | `postgresql://...` |
| `REDIS_URL` | Upstash Dashboard | `redis://...` |
| `SECRET_KEY` | Generated above | `django-insecure-...` |

### Step 3: Verify Workflows

```powershell
# Check workflows are running
gh secret list

# View in browser
start https://github.com/harssh-ssarma/SIH28/actions
```

---

## 🎯 Expected Results

After configuration, you should see:

✅ **Backend Tests** - Python 3.11, 3.12, 3.13 (all passing)  
✅ **Frontend Tests** - Node 18.x, 20.x (all passing)  
✅ **Security Scan** - No critical vulnerabilities  
✅ **Deployment** - Successfully deployed to Render + Vercel  

---

## 🔧 Alternative: GitHub CLI (Fastest)

```powershell
# Install if needed: https://cli.github.com/
gh auth login

# Set all secrets at once
gh secret set RENDER_BACKEND_SERVICE_ID
gh secret set RENDER_API_KEY
gh secret set BACKEND_URL
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
gh secret set FRONTEND_URL
gh secret set API_URL
gh secret set DATABASE_URL
gh secret set REDIS_URL
gh secret set SECRET_KEY
```

---

## 📋 Checklist

- [ ] Generated Django SECRET_KEY
- [ ] Got Vercel IDs from `vercel link`
- [ ] Configured all 11 secrets in GitHub
- [ ] Verified secrets with `gh secret list`
- [ ] Checked workflows at https://github.com/harssh-ssarma/SIH28/actions
- [ ] All workflows passing ✅

---

## 🆘 Quick Troubleshooting

**Workflows failing?**
- Check workflow logs for specific error
- Verify secret names match exactly (case-sensitive)
- Ensure no extra spaces in secret values

**Deploy failing?**
- Double-check RENDER_API_KEY is correct
- Verify VERCEL_TOKEN has deployment permissions
- Check DATABASE_URL and REDIS_URL are accessible

---

## ✅ When Complete

Update todo list:
```powershell
# Mark CI/CD setup as complete
# Move to next task: Improve pagination or increase test coverage
```

**Next Documentation:**
- `CI-CD-STATUS.md` - Full status report
- `SECRETS-CHECKLIST.md` - Detailed checklist
- `.github/SECRETS-SETUP.md` - Complete guide

---

**Need help?** All workflows have been tested and are ready to run once secrets are configured! 🚀
