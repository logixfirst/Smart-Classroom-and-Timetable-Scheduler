# 🚀 Next Steps - Week 2 Implementation Guide

## Current Status
✅ **Phase 1, Week 1: COMPLETED** (November 14, 2025)

**Achievements:**
- JWT authentication integrated
- 350+ lines of security utilities created
- 280+ lines of RBAC permissions implemented
- 40+ automated tests written
- CI/CD pipeline configured
- 52.30% code coverage established
- 32 security/testing packages installed
- 2,800+ lines of documentation created

---

## 📅 Week 2: Monitoring & API Documentation (Nov 15-21, 2025)

### Priority 1: Error Monitoring & Observability (Days 1-2)

#### Backend - Sentry Integration
```bash
# Already installed: sentry-sdk==1.39.1

# Configure in settings.py
```

**Tasks:**
1. Add Sentry DSN to environment variables
2. Configure Sentry in `backend/django/erp/settings.py`:
   - Add `sentry_sdk.init()` with DSN
   - Configure environment (production/staging/development)
   - Set release tracking
   - Enable performance monitoring
   - Configure sampling rates

3. Test error tracking:
   - Trigger a test exception
   - Verify error appears in Sentry dashboard
   - Check breadcrumbs and context

4. Configure alerts:
   - Email notifications for critical errors
   - Slack integration (optional)
   - Set error rate thresholds

#### Frontend - Sentry Integration
```bash
# Already installed: @sentry/nextjs

# Configure next.config.mjs
```

**Tasks:**
1. Add Sentry DSN to `.env.local`
2. Create `sentry.client.config.ts` and `sentry.server.config.ts`
3. Update `next.config.mjs` with Sentry webpack plugin
4. Test error tracking in development
5. Configure source maps for production

#### Structured Logging
**Tasks:**
1. Create JSON log formatter in `backend/django/core/logging.py`
2. Update LOGGING configuration in settings.py:
   - Add JSON formatter for all handlers
   - Include request ID tracking
   - Add user context to logs
   - Configure log rotation

3. Implement request ID middleware:
   - Generate unique ID per request
   - Add to response headers
   - Include in all logs

4. Create log analysis utilities:
   - Parse JSON logs
   - Filter by severity
   - Search by request ID

---

### Priority 2: API Documentation (Days 3-4)

#### drf-spectacular Configuration
```bash
# Already installed: drf-spectacular==0.27.0
```

**Tasks:**
1. Configure in `settings.py`:
```python
INSTALLED_APPS = [
    ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    ...
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'SIH28 Timetable Optimization API',
    'DESCRIPTION': 'AI-powered timetable generation and management',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}
```

2. Add URL routes in `erp/urls.py`:
```python
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

urlpatterns = [
    ...
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

3. Document ViewSets:
   - Add docstrings to all ViewSet classes
   - Use `@extend_schema` decorator for custom endpoints
   - Document request/response examples
   - Add parameter descriptions
   - Document authentication requirements

4. Generate OpenAPI schema:
```bash
python manage.py spectacular --file schema.yml
```

5. Test documentation:
   - Visit `/api/docs/` for Swagger UI
   - Visit `/api/redoc/` for Redoc
   - Test example requests
   - Verify authentication flows documented

---

### Priority 3: Database Optimization (Days 5-6)

#### Index Creation
**Tasks:**
1. Analyze frequently queried fields:
   - User: username, email, role
   - Department: department_id
   - Course: course_id
   - Faculty: department (foreign key)
   - Student: batch (foreign key)
   - Timetable: batch, day, start_time

2. Create migration for indexes:
```bash
python manage.py makemigrations --empty academics
```

3. Add indexes in migration:
```python
class Migration(migrations.Migration):
    operations = [
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['username'], name='user_username_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='user_email_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['role'], name='user_role_idx'),
        ),
        # Add more indexes...
    ]
```

4. Apply migrations:
```bash
python manage.py migrate
```

5. Verify indexes created:
```sql
-- In PostgreSQL
\d+ academics_user
```

#### Query Optimization
**Tasks:**
1. Audit current ViewSets for N+1 queries
2. Add `select_related()` for foreign keys:
```python
# In views.py
queryset = Faculty.objects.select_related('department', 'user')
```

3. Add `prefetch_related()` for reverse relationships:
```python
queryset = Batch.objects.prefetch_related('students', 'subjects')
```

4. Enable Django Debug Toolbar (development only):
```bash
pip install django-debug-toolbar
```

5. Monitor query counts and optimize

#### Redis Caching
**Tasks:**
1. Uncomment Redis configuration in `settings.py`
2. Install Redis client:
```bash
pip install django-redis==5.4.0
```

3. Configure caching backend:
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.client.DefaultClient',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

4. Add cache decorators to views:
```python
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # 15 minutes
def list(self, request, *args, **kwargs):
    return super().list(request, *args, **kwargs)
```

5. Implement cache invalidation:
   - Clear cache on model updates
   - Use cache versioning
   - Set appropriate TTLs

---

### Priority 4: Frontend Testing Setup (Day 7)

#### Jest Configuration
**Tasks:**
1. Create `jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

2. Create `jest.setup.js`:
```javascript
import '@testing-library/jest-dom'
```

3. Add test scripts to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

4. Write component tests:
   - Test `DataTable.tsx`
   - Test `TimetableGrid.tsx`
   - Test `ProfileDropdown.tsx`
   - Test auth context
   - Test API utilities

5. Run tests:
```bash
npm test
```

#### Playwright E2E Tests
**Tasks:**
1. Initialize Playwright:
```bash
npx playwright install
```

2. Create `playwright.config.ts`

3. Write E2E tests:
   - Login flow
   - Timetable generation flow
   - Dashboard navigation
   - Admin CRUD operations

4. Run E2E tests:
```bash
npx playwright test
```

---

## Verification Checklist

### Week 2 Completion Criteria
- [ ] Sentry configured for backend and frontend
- [ ] Error tracking tested and working
- [ ] Structured JSON logging implemented
- [ ] OpenAPI documentation generated
- [ ] Swagger UI accessible at `/api/docs/`
- [ ] All endpoints documented with examples
- [ ] Database indexes created and applied
- [ ] Query optimization completed (N+1 eliminated)
- [ ] Redis caching configured and tested
- [ ] Cache invalidation strategy implemented
- [ ] Jest tests written (>70% coverage for components)
- [ ] Playwright E2E tests written (critical flows)
- [ ] All tests passing
- [ ] Documentation updated

---

## Quick Commands Reference

### Development
```bash
# Backend
cd backend/django
python manage.py runserver

# FastAPI
cd backend/fastapi
uvicorn main:app --reload --port 8001

# Frontend
cd frontend
npm run dev

# Redis (if running locally)
redis-server
```

### Testing
```bash
# Backend tests
cd backend/django
pytest academics/tests/ -v --cov

# Frontend tests
cd frontend
npm test

# E2E tests
npx playwright test
```

### Database
```bash
# Create migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Check migration status
python manage.py showmigrations
```

### Documentation
```bash
# Generate OpenAPI schema
python manage.py spectacular --file schema.yml

# View docs (after server start)
# Swagger: http://localhost:8000/api/docs/
# Redoc: http://localhost:8000/api/redoc/
```

---

## Environment Variables to Add

### Backend (.env)
```env
# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development  # or staging, production

# Redis
REDIS_URL=redis://localhost:6379/1

# Existing variables
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_HOST=your-db-host
DB_PORT=5432
```

### Frontend (.env.local)
```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Existing variables
```

---

## Help & Resources

### Documentation
- [Sentry Django Integration](https://docs.sentry.io/platforms/python/guides/django/)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [drf-spectacular Documentation](https://drf-spectacular.readthedocs.io/)
- [Django Caching Framework](https://docs.djangoproject.com/en/5.0/topics/cache/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)

### Support
- Check ROADMAP.md for detailed week-by-week guidance
- Refer to IMPLEMENTATION-GUIDE.md for step-by-step instructions
- See PHASE1-WEEK1-COMPLETED.md for what was already done

---

## Timeline

**Week 2 Schedule:**
- **Monday-Tuesday**: Sentry integration and structured logging
- **Wednesday-Thursday**: API documentation with drf-spectacular
- **Friday-Saturday**: Database optimization and Redis caching
- **Sunday**: Frontend testing setup

**Estimated Completion**: November 21, 2025

---

**Current Date**: November 14, 2025  
**Status**: Ready to begin Week 2  
**Next Action**: Configure Sentry for error monitoring
