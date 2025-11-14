# GitHub Secrets Configuration Guide

## Prerequisites
- GitHub account with access to https://github.com/harssh-ssarma/SIH28
- Admin access to repository settings
- Service credentials from Neon, Upstash, Render, and Vercel

## Quick Setup (Choose One Method)

### Method 1: GitHub Web UI (Recommended)

1. **Navigate to Repository Secrets**
   ```
   https://github.com/harssh-ssarma/SIH28/settings/secrets/actions
   ```

2. **Add Required Secrets** (Click "New repository secret" for each)

#### Backend Secrets (4)
```yaml
SECRET_KEY: dor@+%e+qdxc6f9sz$d3muiw!8dqmrit5&e_u+9+m@@!@4brsz
DATABASE_URL: [Get from Neon Console → Connection String]
REDIS_URL: [Get from Upstash Console → Redis URL]
DJANGO_SECRET_KEY: dor@+%e+qdxc6f9sz$d3muiw!8dqmrit5&e_u+9+m@@!@4brsz
```

#### Render Deployment Secrets (3)
```yaml
RENDER_BACKEND_SERVICE_ID: [Get from Render Dashboard → Service Settings]
RENDER_API_KEY: [Get from Render Account Settings → API Keys]
BACKEND_URL: [Your Render backend URL, e.g., https://your-app.onrender.com]
```

#### Vercel Deployment Secrets (4)
```yaml
VERCEL_TOKEN: [Get from Vercel Account Settings → Tokens]
VERCEL_ORG_ID: [Run: cd frontend && vercel link]
VERCEL_PROJECT_ID: [Run: cd frontend && vercel link]
FRONTEND_URL: [Your Vercel frontend URL, e.g., https://your-app.vercel.app]
API_URL: [Same as BACKEND_URL]
```

### Method 2: GitHub CLI (Faster)

```bash
# Install GitHub CLI if not already installed
# Windows: winget install GitHub.cli
# Or download from: https://cli.github.com/

# Authenticate
gh auth login

# Navigate to repository
cd d:\GitHub\SIH28

# Set secrets (replace <value> with actual values)
gh secret set SECRET_KEY -b "dor@+%e+qdxc6f9sz$d3muiw!8dqmrit5&e_u+9+m@@!@4brsz"
gh secret set DJANGO_SECRET_KEY -b "dor@+%e+qdxc6f9sz$d3muiw!8dqmrit5&e_u+9+m@@!@4brsz"
gh secret set DATABASE_URL -b "<your-neon-connection-string>"
gh secret set REDIS_URL -b "<your-upstash-redis-url>"
gh secret set RENDER_BACKEND_SERVICE_ID -b "<your-render-service-id>"
gh secret set RENDER_API_KEY -b "<your-render-api-key>"
gh secret set BACKEND_URL -b "<your-backend-url>"
gh secret set VERCEL_TOKEN -b "<your-vercel-token>"
gh secret set VERCEL_ORG_ID -b "<your-vercel-org-id>"
gh secret set VERCEL_PROJECT_ID -b "<your-vercel-project-id>"
gh secret set FRONTEND_URL -b "<your-frontend-url>"
```

## How to Get Each Secret

### 1. DATABASE_URL (Neon PostgreSQL)
1. Go to https://console.neon.tech
2. Select your project
3. Click "Connection Details"
4. Copy the connection string (format: `postgresql://user:password@host/dbname?sslmode=require`)

### 2. REDIS_URL (Upstash Redis)
1. Go to https://console.upstash.com
2. Select your Redis database
3. Scroll to "REST API" section
4. Copy the Redis URL (format: `redis://default:password@host:port`)

### 3. RENDER_BACKEND_SERVICE_ID
1. Go to https://dashboard.render.com
2. Select your backend service
3. Look at the URL: `https://dashboard.render.com/web/srv-XXXXXXXXXXXX`
4. Copy the part after `srv-` (e.g., `srv-abc123xyz`)

### 4. RENDER_API_KEY
1. Go to https://dashboard.render.com/account/api-keys
2. Click "Create API Key"
3. Name it "GitHub Actions"
4. Copy the generated key

### 5. BACKEND_URL
- Your Render service URL (e.g., `https://sih28-backend.onrender.com`)
- Find it in Render Dashboard → Service → URL

### 6. VERCEL_TOKEN
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it "GitHub Actions"
4. Copy the generated token

### 7. VERCEL_ORG_ID & VERCEL_PROJECT_ID
```bash
cd d:\GitHub\SIH28\frontend
vercel link
# Follow prompts, then check .vercel/project.json
# Copy "orgId" and "projectId"
```

### 8. FRONTEND_URL
- Your Vercel deployment URL (e.g., `https://sih28.vercel.app`)
- Find it in Vercel Dashboard → Project → Domains

## Optional Secrets (For Enhanced Features)

### SNYK_TOKEN (Security Scanning)
1. Go to https://app.snyk.io/account
2. Copy your API token
```bash
gh secret set SNYK_TOKEN -b "<your-snyk-token>"
```

### CODECOV_TOKEN (Coverage Reports)
1. Go to https://codecov.io/gh/harssh-ssarma/SIH28
2. Copy the upload token
```bash
gh secret set CODECOV_TOKEN -b "<your-codecov-token>"
```

### SENTRY_DSN (Error Monitoring)
1. Go to https://sentry.io/settings/projects/
2. Select your project
3. Copy the DSN
```bash
gh secret set SENTRY_DSN -b "<your-sentry-dsn>"
```

## Verification

### Check Secrets Are Set
```bash
gh secret list
```

Expected output:
```
BACKEND_URL          Updated 2025-XX-XX
DATABASE_URL         Updated 2025-XX-XX
DJANGO_SECRET_KEY    Updated 2025-XX-XX
FRONTEND_URL         Updated 2025-XX-XX
REDIS_URL            Updated 2025-XX-XX
RENDER_API_KEY       Updated 2025-XX-XX
RENDER_BACKEND_SERVICE_ID  Updated 2025-XX-XX
SECRET_KEY           Updated 2025-XX-XX
VERCEL_ORG_ID        Updated 2025-XX-XX
VERCEL_PROJECT_ID    Updated 2025-XX-XX
VERCEL_TOKEN         Updated 2025-XX-XX
```

### Trigger Workflows
```bash
# Make a test commit to trigger workflows
echo "# Test CI/CD" >> TEST-CI-CD.md
git add TEST-CI-CD.md
git commit -m "test: Trigger CI/CD workflows"
git push origin main
```

### Monitor Workflow Execution
1. Visit https://github.com/harssh-ssarma/SIH28/actions
2. You should see 3 workflows running:
   - ✅ Backend Tests (Python 3.11, 3.12, 3.13)
   - ✅ Frontend Tests (Node 18, 20)
   - ✅ Security Scan

3. Click on each workflow to view logs
4. All should show green checkmarks when complete

## Troubleshooting

### Workflow Fails with "Secret not found"
- Double-check secret name matches exactly (case-sensitive)
- Re-create the secret in GitHub UI

### Database Connection Fails
- Verify DATABASE_URL includes `?sslmode=require`
- Check Neon database is active (not paused)

### Vercel Deployment Fails
- Verify VERCEL_TOKEN has deployment permissions
- Re-run `vercel link` to ensure correct project IDs

### Render Deployment Fails
- Verify RENDER_API_KEY is valid
- Check service ID matches your backend service

## Security Best Practices

1. **Never commit secrets** to repository
2. **Rotate secrets regularly** (every 90 days)
3. **Use different secrets** for dev/staging/production
4. **Limit token permissions** to minimum required
5. **Monitor secret usage** in GitHub Actions logs

## Next Steps After Configuration

1. ✅ Verify all workflows pass
2. ✅ Check deployment URLs are accessible
3. ✅ Review coverage reports on Codecov
4. ✅ Monitor errors in Sentry dashboard
5. ✅ Update README badges with passing status

---

**Status**: 🔧 Ready to configure
**Estimated Time**: 15-20 minutes
**Required Access**: Repository admin, service accounts
