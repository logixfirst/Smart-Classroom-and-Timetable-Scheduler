# 🚀 Quick Start Implementation Guide

## ✅ What We Just Implemented (Phase 1 - Week 1 Started!)

### 1. Security Packages ✅
**Backend:**
- `djangorestframework-simplejwt` - JWT authentication
- `django-ratelimit` - API rate limiting
- `django-otp` - Two-factor authentication
- `sentry-sdk` - Error monitoring
- `python-jose` - JWT token handling
- `bandit` - Security linting

**Frontend:**
- `@sentry/nextjs` - Error monitoring
- `dompurify` - XSS protection
- `zod` - Schema validation
- `react-hot-toast` - User notifications
- `recharts` - Data visualization
- `socket.io-client` - Real-time features

### 2. Testing Infrastructure ✅
**Backend:**
- `pytest` - Testing framework
- `pytest-django` - Django integration
- `pytest-cov` - Coverage reporting
- `faker` - Test data generation
- `locust` - Load testing

**Frontend:**
- `@testing-library/react` - Component testing
- `@testing-library/user-event` - User interaction testing
- `playwright` - E2E testing
- `cypress` - E2E testing alternative

### 3. Code Quality Tools ✅
- `black` - Code formatting
- `flake8` - Linting
- `isort` - Import sorting
- `prettier` - Frontend formatting
- `eslint` - Frontend linting

### 4. Files Created ✅
```
.github/workflows/ci.yml              # CI/CD pipeline
backend/django/pytest.ini             # Pytest configuration
backend/django/conftest.py            # Test fixtures
backend/django/academics/tests/
  ├── test_models.py                  # Model tests
  └── test_views.py                   # API tests
backend/django/erp/security.py        # Security utilities
backend/django/core/permissions.py    # RBAC permissions
ROADMAP.md                            # Complete roadmap
```

---

## 📋 Next Steps (DO THIS NOW!)

### Step 1: Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 3: Run Tests to Verify Setup
```bash
# Backend tests
cd backend/django
pytest

# Frontend tests
cd frontend
npm test
```

### Step 4: Update Django Settings

Add to `backend/django/erp/settings.py`:

```python
# JWT Configuration
from datetime import timedelta

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # ... existing config
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Sentry Configuration
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

if not DEBUG:
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=1.0,
        send_default_pii=True
    )

# Security Settings
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

### Step 5: Update URLs for JWT

Edit `backend/django/erp/urls.py`:

```python
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # ... existing patterns
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
```

### Step 6: Create Environment Variables

Update `.env` file:

```bash
# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# Sentry
SENTRY_DSN=your-sentry-dsn-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sih28

# Redis
REDIS_URL=redis://localhost:6379/0
```

### Step 7: Run Migrations
```bash
cd backend/django
python manage.py makemigrations
python manage.py migrate
```

### Step 8: Create Test Data
```bash
python manage.py createsuperuser
```

---

## 🧪 Testing Your Implementation

### 1. Run Backend Tests
```bash
cd backend/django
pytest -v
pytest --cov=academics --cov-report=html
```

### 2. Run Security Scan
```bash
cd backend/django
bandit -r . -x ./tests,./migrations
flake8 .
black --check .
```

### 3. Run Frontend Tests
```bash
cd frontend
npm run lint
npm test
npx tsc --noEmit
```

### 4. Test CI/CD Pipeline
```bash
# Push to GitHub to trigger CI/CD
git add .
git commit -m "feat: implement security and testing infrastructure"
git push origin main
```

---

## 📊 How to Use New Security Features

### Using Custom Permissions

```python
from rest_framework import viewsets
from core.permissions import IsAdmin, CanManageTimetable

class TimetableViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageTimetable]
    # ... rest of viewset
```

### Using Security Utilities

```python
from erp.security import (
    PasswordValidator,
    sanitize_input,
    validate_file_upload,
    check_rate_limit,
    log_security_event
)

# Validate password
validator = PasswordValidator()
validator.validate(password, user)

# Sanitize input
clean_data = sanitize_input(user_input)

# Check rate limit
if check_rate_limit(request.META.get('REMOTE_ADDR')):
    return Response({'error': 'Too many requests'}, status=429)

# Log security event
log_security_event('login_failed', {
    'ip_address': request.META.get('REMOTE_ADDR'),
    'timestamp': timezone.now()
}, user)
```

### Using JWT Authentication in Frontend

```typescript
// Update api.ts
import { jwtDecode } from 'jwt-decode';

class ApiClient {
  async login(credentials: LoginCredentials) {
    const response = await this.request('/token/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.data) {
      this.setToken(response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    
    return response;
  }
  
  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await this.request('/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });
    
    if (response.data) {
      this.setToken(response.data.access);
    }
    
    return response;
  }
}
```

---

## 🎯 Success Metrics

After implementation, you should have:

- ✅ 80%+ test coverage (run `pytest --cov`)
- ✅ Zero security vulnerabilities (run `bandit`)
- ✅ All linting checks pass (run `flake8`, `eslint`)
- ✅ CI/CD pipeline working (check GitHub Actions)
- ✅ JWT authentication working
- ✅ Rate limiting active
- ✅ Sentry monitoring connected

---

## 🔥 Common Issues & Solutions

### Issue: Pytest not finding Django settings
**Solution:** Make sure `DJANGO_SETTINGS_MODULE` is set in `pytest.ini`

### Issue: Module not found errors
**Solution:** Install missing dependencies:
```bash
pip install -r requirements.txt
cd frontend && npm install
```

### Issue: CI/CD pipeline failing
**Solution:** Check GitHub Actions logs and ensure all tests pass locally first

### Issue: JWT tokens not working
**Solution:** Verify `SIMPLE_JWT` configuration in settings.py

---

## 📚 Additional Resources

- [Django REST Framework JWT](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Pytest Documentation](https://docs.pytest.org/)
- [Sentry Documentation](https://docs.sentry.io/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## 🎉 What's Next?

Follow the ROADMAP.md for:
- **Week 2:** Complete testing implementation
- **Week 3:** Database optimization
- **Week 4:** API documentation
- **Week 5:** Monitoring setup
- **Week 6:** Performance optimization

---

**Need Help?** Check the ROADMAP.md for detailed guidance on each phase!

**Good luck! 🚀**
