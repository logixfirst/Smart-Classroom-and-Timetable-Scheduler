# Sentry Monitoring Setup Guide

## Quick Start

### 1. Create Sentry Account
1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account (100k events/month free)
3. Create a new project and select **Django**
4. Copy your DSN (Data Source Name)

### 2. Configure Backend

**Already configured in the project!** Just add to your `.env` file:

```env
# Sentry Configuration
SENTRY_DSN=https://YOUR_KEY@o1234567.ingest.sentry.io/1234567
SENTRY_ENVIRONMENT=development
```

Replace `YOUR_KEY` and numbers with your actual Sentry DSN.

### 3. Test Sentry Integration

#### Method 1: Django Shell
```bash
cd backend/django
python manage.py shell
```

```python
import sentry_sdk

# Test message
sentry_sdk.capture_message("Hello from SIH28! 👋")

# Test exception
try:
    1 / 0
except Exception as e:
    sentry_sdk.capture_exception(e)

# Test with context
sentry_sdk.capture_message(
    "User action performed",
    level="info",
    extra={"user_id": 123, "action": "timetable_generated"}
)
```

#### Method 2: Create Test View
Add to `academics/views.py`:

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
import sentry_sdk

@api_view(['GET'])
def sentry_test(request):
    """Test endpoint for Sentry"""
    sentry_sdk.capture_message("API test from SIH28")
    
    # Uncomment to test error tracking:
    # raise Exception("Test exception from API")
    
    return Response({"message": "Check Sentry dashboard!"})
```

Add to `academics/urls.py`:
```python
path('test-sentry/', views.sentry_test, name='test-sentry'),
```

Visit: `http://localhost:8000/api/test-sentry/`

### 4. Check Sentry Dashboard

1. Go to [sentry.io](https://sentry.io/organizations/YOUR_ORG/issues/)
2. You should see your test messages and errors
3. Click on any issue to see:
   - Full stack trace
   - Request details
   - User context
   - Breadcrumbs (what happened before error)
   - Environment info

## What Sentry Captures Automatically

### ✅ Backend (Django)
- ✅ All unhandled exceptions
- ✅ HTTP 500 errors
- ✅ Request/response details
- ✅ SQL queries leading to error
- ✅ Server environment info
- ✅ Performance metrics (if enabled)

### Example: What you'll see when an error occurs

**Error in Sentry Dashboard:**
```
IntegrityError: duplicate key value violates unique constraint "users_username_key"
DETAIL: Key (username)=(admin) already exists.

Stack Trace:
  File "academics/views.py", line 45, in create_user
    user.save()
  
Request Info:
  Method: POST
  URL: /api/users/
  User: admin@example.com
  IP: 192.168.1.10
  
SQL Query:
  INSERT INTO users (username, email, role) 
  VALUES ('admin', 'admin@example.com', 'staff')
```

## Advanced Usage

### 1. Add User Context
```python
from rest_framework.views import APIView
import sentry_sdk

class MyView(APIView):
    def get(self, request):
        # Add user context to all Sentry events
        sentry_sdk.set_user({
            "id": request.user.id,
            "email": request.user.email,
            "username": request.user.username,
            "role": request.user.role
        })
        
        # Your code here
        return Response({"status": "ok"})
```

### 2. Add Custom Tags
```python
sentry_sdk.set_tag("feature", "timetable_generation")
sentry_sdk.set_tag("department", "CSE")
```

### 3. Add Breadcrumbs (track user actions)
```python
sentry_sdk.add_breadcrumb(
    category='user_action',
    message='User requested timetable generation',
    level='info',
    data={
        'batch_id': 'B2024CSE',
        'semester': 5
    }
)
```

### 4. Performance Monitoring
```python
import sentry_sdk

# Track custom performance
with sentry_sdk.start_transaction(op="timetable", name="Generate Timetable"):
    with sentry_sdk.start_span(op="db", description="Fetch constraints"):
        # Database queries here
        pass
    
    with sentry_sdk.start_span(op="ai", description="OR-Tools optimization"):
        # AI computation here
        pass
```

## Sentry Alerts Setup

### 1. In Sentry Dashboard:
- Go to **Alerts** → **Create Alert**
- Choose alert type:
  - **Issues**: Get notified when errors occur
  - **Performance**: Get notified when app is slow
  - **Crash Free Rate**: Get notified if stability drops

### 2. Recommended Alerts:

**Critical Errors Alert:**
- Condition: When error occurs more than 10 times in 1 hour
- Action: Send email + Slack notification
- Priority: High

**Performance Degradation:**
- Condition: When average response time > 1 second
- Action: Send email
- Priority: Medium

**New Error Type:**
- Condition: When a new type of error occurs
- Action: Send email immediately
- Priority: High

## Sentry Dashboard Overview

### Issues Tab
- Lists all errors grouped by type
- Shows frequency and affected users
- Click any issue for details

### Performance Tab
- Shows transaction performance
- Database query times
- API endpoint response times
- Slowest operations

### Releases Tab
- Track errors by deployment version
- Compare error rates between releases
- See which release introduced bugs

## Best Practices

### ✅ DO:
- Set environment correctly (development/staging/production)
- Add user context for authentication errors
- Use breadcrumbs to track user journey
- Set up alerts for critical errors
- Review Sentry weekly to catch patterns

### ❌ DON'T:
- Send PII (Personal Identifiable Information) - already disabled
- Capture expected errors (like validation errors)
- Over-alert (too many notifications = ignored)
- Ignore performance issues
- Leave errors unresolved

## Frontend Sentry Setup (Next.js)

### 1. Install Sentry
```bash
cd frontend
npm install @sentry/nextjs
```

### 2. Initialize Sentry
```bash
npx @sentry/wizard@latest -i nextjs
```

### 3. Configure `.env.local`
```env
NEXT_PUBLIC_SENTRY_DSN=your-frontend-dsn
SENTRY_AUTH_TOKEN=your-auth-token
```

### 4. Test Frontend Errors
Create `src/app/sentry-test/page.tsx`:
```tsx
'use client';
import * as Sentry from '@sentry/nextjs';

export default function SentryTest() {
  return (
    <div>
      <button onClick={() => {
        Sentry.captureMessage('Test from Next.js!');
      }}>
        Test Message
      </button>
      
      <button onClick={() => {
        throw new Error('Test error from Next.js!');
      }}>
        Test Error
      </button>
    </div>
  );
}
```

## Troubleshooting

### Errors not appearing in Sentry?

1. **Check DSN is set:**
```bash
cd backend/django
python manage.py shell
>>> import os
>>> print(os.getenv('SENTRY_DSN'))
# Should print your DSN
```

2. **Check Sentry is initialized:**
```python
>>> import sentry_sdk
>>> sentry_sdk.Hub.current.client
# Should show Sentry client object
```

3. **Check DEBUG mode:**
```python
>>> from django.conf import settings
>>> print(settings.DEBUG)
# If True, Sentry won't send errors (by design)
# Set DEBUG=False to test
```

4. **Force send test event:**
```python
>>> import sentry_sdk
>>> sentry_sdk.capture_message("Force test", level="error")
>>> sentry_sdk.flush()  # Force send immediately
```

## Cost & Limits

### Free Plan:
- 100,000 errors/month
- 100,000 transactions/month (performance)
- 1 year of event history
- Email alerts
- **Perfect for development and small projects**

### Paid Plans:
- Start at $26/month
- More events and retention
- Slack/Discord integrations
- Advanced features

## Monitoring Your SIH28 Project

### Key Metrics to Watch:

1. **Error Rate**: Should be < 1% of requests
2. **Response Time**: API endpoints < 500ms
3. **Database Queries**: < 100ms average
4. **Timetable Generation**: < 30 seconds
5. **User Sessions**: Track active users

### Critical Endpoints to Monitor:
- `/api/auth/login` - Authentication errors
- `/api/timetables/generate` - AI computation errors
- `/api/departments/` - CRUD operation errors
- `/api/token/` - JWT token errors

## Quick Commands

```bash
# Test Sentry in Django shell
python manage.py shell -c "import sentry_sdk; sentry_sdk.capture_message('Test')"

# Check if Sentry is configured
python manage.py shell -c "from django.conf import settings; print(hasattr(settings, 'SENTRY_DSN'))"

# View current environment
python manage.py shell -c "import os; print(os.getenv('SENTRY_ENVIRONMENT'))"
```

## Resources

- [Sentry Django Documentation](https://docs.sentry.io/platforms/python/guides/django/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Alerts Guide](https://docs.sentry.io/product/alerts/)
- [Best Practices](https://docs.sentry.io/platforms/python/guides/django/best-practices/)

---

**Your Sentry is already configured!** Just add the DSN to `.env` and start monitoring. 🎯
