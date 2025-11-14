# 🔍 Sentry Monitoring Guide for SIH28

## Overview
Comprehensive guide for monitoring errors, performance, and user experience using Sentry.

---

## 📋 Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Monitoring Features](#monitoring-features)
3. [Using Sentry Dashboard](#using-sentry-dashboard)
4. [Custom Error Tracking](#custom-error-tracking)
5. [Performance Monitoring](#performance-monitoring)
6. [Alerts & Notifications](#alerts--notifications)
7. [Best Practices](#best-practices)

---

## 🚀 Setup & Configuration

### 1. Create Sentry Account
1. Visit [sentry.io](https://sentry.io)
2. Sign up for a free account (100k events/month free)
3. Create a new project → Select **Django**
4. Copy your **DSN** (Data Source Name)

### 2. Environment Variables
Create `backend/django/.env`:

```env
# Sentry Configuration
SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_ENVIRONMENT=development

# Optional: Set different values for production
# SENTRY_ENVIRONMENT=production
# SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 3. Verify Installation
```bash
# Already installed in your project:
pip list | grep sentry-sdk
# Output: sentry-sdk==1.39.1
```

### 4. Test Sentry Integration
```python
# Test in Django shell
python manage.py shell

>>> import sentry_sdk
>>> sentry_sdk.capture_message("Hello from SIH28! 🚀")
>>> sentry_sdk.capture_exception(Exception("Test error"))
```

**Expected Result**: Check your Sentry dashboard - you'll see both messages appear within seconds!

---

## 🔍 Monitoring Features

### Automatic Error Tracking
Sentry automatically captures:
- ✅ **Unhandled exceptions** in views
- ✅ **500 Internal Server Errors**
- ✅ **Database query errors**
- ✅ **API endpoint failures**
- ✅ **Middleware errors**

### Performance Monitoring
Already configured in your `settings.py`:
```python
traces_sample_rate=0.2  # 20% of requests tracked for performance
```

Tracks:
- ⚡ **Response times** per endpoint
- ⚡ **Database query performance**
- ⚡ **Slow API calls**
- ⚡ **Transaction durations**

### Context Capture
Every error includes:
- 🔹 **User information** (username, email, role)
- 🔹 **Request data** (method, path, headers)
- 🔹 **Stack trace** with code context
- 🔹 **Server environment** (development/production)
- 🔹 **Breadcrumbs** (logs leading to error)

---

## 📊 Using Sentry Dashboard

### 1. Issues Tab
**Location**: `https://sentry.io/organizations/your-org/issues/`

**What you'll see**:
- List of all errors grouped by type
- Error frequency graphs
- First seen / Last seen timestamps
- Number of affected users

**Actions**:
- Click any issue to see full details
- Mark as resolved, ignored, or assign to team member
- Set priority levels (high, medium, low)

### 2. Error Details View
Click on any error to see:

**Stack Trace**:
```python
TypeError: 'Meta.fields' must not contain non-model field names: status
  File "academics/views.py", line 204, in AttendanceViewSet
    filterset_fields = ['student', 'slot', 'status', 'date']
```

**Request Information**:
```json
{
  "method": "GET",
  "url": "http://localhost:8000/api/attendance/",
  "headers": {
    "User-Agent": "Mozilla/5.0...",
    "Accept": "application/json"
  }
}
```

**User Context**:
```json
{
  "id": 123,
  "username": "john_doe",
  "email": "john@sih28.com",
  "role": "faculty"
}
```

### 3. Performance Tab
**Location**: `https://sentry.io/organizations/your-org/performance/`

**Metrics**:
- Average response time per endpoint
- P50, P95, P99 latencies
- Throughput (requests/second)
- Slowest transactions

**Example View**:
```
Endpoint                    | Avg Duration | P95   | Throughput
/api/faculty/               | 2.2s         | 41s   | 15/min
/api/students/?page=1       | 2.5s         | 16s   | 8/min
/api/departments/           | 1.4s         | 3.7s  | 12/min
```

### 4. Releases Tab
Track errors by deployment:
```bash
# Tag errors with release version
export SENTRY_RELEASE="sih28@1.0.0"
python manage.py runserver
```

View which release introduced bugs and regression tracking.

---

## 🎯 Custom Error Tracking

### Capture Messages
```python
import sentry_sdk

# Info level
sentry_sdk.capture_message("User logged in successfully", level="info")

# Warning level
sentry_sdk.capture_message("Low disk space detected", level="warning")

# Error level
sentry_sdk.capture_message("Payment gateway timeout", level="error")
```

### Capture Exceptions
```python
try:
    # Your code here
    generate_timetable(batch_id)
except OptimizationError as e:
    # Capture with additional context
    sentry_sdk.capture_exception(e)
    # Still re-raise if needed
    raise
```

### Add Custom Context
```python
from rest_framework.decorators import api_view
import sentry_sdk

@api_view(['POST'])
def generate_timetable(request):
    # Add custom tags for filtering
    sentry_sdk.set_tag("feature", "timetable_generation")
    sentry_sdk.set_tag("batch_id", request.data.get('batch_id'))
    
    # Add user context
    sentry_sdk.set_user({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "role": request.user.role
    })
    
    # Add extra data
    sentry_sdk.set_context("timetable_params", {
        "batch_id": request.data.get('batch_id'),
        "semester": request.data.get('semester'),
        "optimization_level": "high"
    })
    
    try:
        result = perform_optimization()
        return Response(result)
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return Response({"error": str(e)}, status=500)
```

### Breadcrumbs (Event Trail)
```python
# Add breadcrumb before critical operations
sentry_sdk.add_breadcrumb(
    category='database',
    message='Fetching faculty assignments',
    level='info',
)

# Perform operation
faculty = Faculty.objects.all()

sentry_sdk.add_breadcrumb(
    category='optimization',
    message=f'Starting optimization for {len(faculty)} faculty',
    level='info',
)
```

---

## ⚡ Performance Monitoring

### Track Custom Transactions
```python
import sentry_sdk

def generate_complex_timetable(batch_id):
    # Create a custom transaction
    with sentry_sdk.start_transaction(
        op="timetable.generate",
        name="Generate Timetable"
    ) as transaction:
        
        # Track sub-operation: Data Fetching
        with transaction.start_child(
            op="db.query",
            description="Fetch constraints"
        ) as span:
            constraints = fetch_constraints(batch_id)
            span.set_data("constraint_count", len(constraints))
        
        # Track sub-operation: Optimization
        with transaction.start_child(
            op="optimization",
            description="OR-Tools optimization"
        ) as span:
            result = optimize_schedule(constraints)
            span.set_data("slots_generated", len(result))
        
        # Track sub-operation: Save Results
        with transaction.start_child(
            op="db.bulk_create",
            description="Save timetable slots"
        ) as span:
            TimetableSlot.objects.bulk_create(result)
        
        return result
```

**Dashboard View**:
```
Transaction: Generate Timetable (12.4s)
├─ Fetch constraints (2.1s)
├─ OR-Tools optimization (9.8s)
└─ Save timetable slots (0.5s)
```

### Measure Query Performance
```python
# Sentry automatically tracks Django ORM queries
# But you can add manual spans for complex operations

with sentry_sdk.start_span(
    op="db.query",
    description="Complex faculty workload query"
) as span:
    faculty_workload = Faculty.objects.annotate(
        total_slots=Count('timetableslot'),
        total_hours=Sum('timetableslot__duration')
    ).select_related('department')
    
    span.set_data("query_time_ms", 234)
    span.set_data("rows_returned", faculty_workload.count())
```

---

## 🔔 Alerts & Notifications

### 1. Email Alerts
**Setup**:
1. Go to **Settings** → **Alerts**
2. Create alert rule:
   - **Trigger**: Error count > 10 in 1 hour
   - **Action**: Send email to team@sih28.com

### 2. Slack Integration
**Setup**:
1. Go to **Settings** → **Integrations** → **Slack**
2. Connect your Slack workspace
3. Configure alert conditions:
   ```
   When: New issue is created
   Where: #engineering-alerts channel
   Filter: environment=production AND level=error
   ```

### 3. Issue Assignment
Auto-assign errors to teams:
- **Database errors** → Backend Team
- **API errors** → API Team
- **Authentication errors** → Security Team

### 4. Example Alert Rules

**High Priority Errors**:
```yaml
Condition: 
  - error.level = fatal OR error
  - first_seen = true
  - environment = production
Action:
  - Send email to on-call engineer
  - Post to #critical-alerts Slack
  - Create PagerDuty incident
```

**Performance Degradation**:
```yaml
Condition:
  - transaction.duration.p95 > 5000ms
  - For at least 15 minutes
Action:
  - Send email to devops team
  - Post to #performance-alerts
```

---

## 📈 Best Practices

### 1. **Use Environment Tags**
```python
SENTRY_ENVIRONMENT = os.getenv('SENTRY_ENVIRONMENT', 'development')
# Values: development, staging, production
```

**Benefits**:
- Filter production errors separately
- Don't get alerted for dev/test errors
- Track issues per environment

### 2. **Add Release Tracking**
```bash
# Before deployment
export SENTRY_RELEASE="sih28@$(git rev-parse --short HEAD)"
```

Track which code version caused issues and detect regressions.

### 3. **Set Sample Rates Appropriately**

**Development**:
```python
traces_sample_rate=1.0  # Track all requests
```

**Production**:
```python
traces_sample_rate=0.1  # Track 10% to reduce quota usage
```

### 4. **Use Custom Fingerprints**
Group similar errors together:
```python
sentry_sdk.set_tag("error_type", "timetable_conflict")
# All timetable conflicts group together in dashboard
```

### 5. **Sanitize Sensitive Data**
Already configured in your `settings.py`:
```python
before_send=lambda event, hint: event if not any(
    x in str(hint.get('exc_info', '')) for x in ['password', 'token', 'secret']
) else None
```

Prevents passwords, tokens, and secrets from being logged.

### 6. **Monitor Key Transactions**
Add custom instrumentation for:
- Timetable generation (longest operation)
- User authentication flows
- Data import operations
- API rate limiting

### 7. **Review Weekly**
Set aside time weekly to:
- Review new error patterns
- Check performance regressions
- Update alert thresholds
- Close resolved issues

---

## 🧪 Testing Sentry Integration

### 1. Trigger Test Errors
```python
# In Django shell
python manage.py shell

>>> import sentry_sdk
>>> sentry_sdk.capture_message("🔥 Test error from Django shell", level="error")
>>> sentry_sdk.capture_exception(ValueError("Invalid batch configuration"))
```

### 2. Trigger API Error
```bash
# Make request to non-existent endpoint
curl http://localhost:8000/api/trigger-error/
```

### 3. Simulate Performance Issue
```python
import time
import sentry_sdk

with sentry_sdk.start_transaction(op="test", name="Slow Operation"):
    time.sleep(5)  # Simulate slow operation
```

### 4. Check Dashboard
Visit `https://sentry.io` → Your Project → **Issues**

You should see:
- ✅ Test error message
- ✅ ValueError exception
- ✅ Slow operation transaction (5+ seconds)

---

## 📊 Real-World Examples

### Example 1: Track Timetable Generation
```python
from academics.models import GenerationJob
import sentry_sdk

def generate_timetable_view(request):
    batch_id = request.data.get('batch_id')
    
    # Start performance tracking
    with sentry_sdk.start_transaction(
        op="timetable.generation",
        name=f"Generate Timetable for Batch {batch_id}"
    ) as transaction:
        
        # Set context
        sentry_sdk.set_tag("batch_id", batch_id)
        sentry_sdk.set_user({
            "id": request.user.id,
            "username": request.user.username,
            "role": request.user.role
        })
        
        try:
            # Create job
            job = GenerationJob.objects.create(
                batch_id=batch_id,
                created_by=request.user,
                status='PENDING'
            )
            
            # Call FastAPI optimization service
            with transaction.start_child(
                op="http.client",
                description="Call OR-Tools API"
            ):
                result = call_optimization_api(job_id=job.id)
            
            if result.success:
                job.status = 'COMPLETED'
                job.save()
                sentry_sdk.capture_message(
                    f"Timetable generated successfully for batch {batch_id}",
                    level="info"
                )
            else:
                job.status = 'FAILED'
                job.error_message = result.error
                job.save()
                sentry_sdk.capture_message(
                    f"Timetable generation failed: {result.error}",
                    level="error"
                )
            
            return Response({"job_id": job.id, "status": job.status})
            
        except Exception as e:
            sentry_sdk.capture_exception(e)
            return Response({"error": str(e)}, status=500)
```

### Example 2: Monitor Database Migrations
```python
# In management command
from django.core.management.base import BaseCommand
import sentry_sdk

class Command(BaseCommand):
    help = 'Import CSV data with error tracking'
    
    def handle(self, *args, **options):
        sentry_sdk.set_tag("command", "import_csv")
        
        try:
            with sentry_sdk.start_transaction(
                op="data.import",
                name="Import CSV Data"
            ):
                self.import_faculty()
                self.import_students()
                self.import_subjects()
                
                self.stdout.write("✅ Import completed successfully")
                
        except Exception as e:
            sentry_sdk.capture_exception(e)
            self.stdout.write(f"❌ Import failed: {str(e)}")
            raise
```

---

## 🔐 Security Considerations

### 1. **Never Log Sensitive Data**
```python
# ❌ BAD - Logs password
sentry_sdk.set_context("user_data", {
    "username": "john",
    "password": "secret123"  # NEVER DO THIS
})

# ✅ GOOD - Only logs non-sensitive data
sentry_sdk.set_context("user_data", {
    "username": "john",
    "role": "faculty",
    "department": "Computer Science"
})
```

### 2. **Filter Request Data**
Already configured in `settings.py`:
```python
integrations=[
    DjangoIntegration(),
    RedisIntegration(),
],
# Django automatically filters: password, passwd, secret, token, api_key
```

### 3. **Use Environment Variables**
```bash
# ❌ NEVER commit DSN to git
SENTRY_DSN=https://key@sentry.io/123

# ✅ Use environment variables
SENTRY_DSN=${SENTRY_DSN}
```

---

## 📚 Resources

### Official Documentation
- [Sentry Django SDK](https://docs.sentry.io/platforms/python/guides/django/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Error Tracking](https://docs.sentry.io/product/issues/)

### Quick Commands
```bash
# Test Sentry from terminal
python manage.py shell -c "import sentry_sdk; sentry_sdk.capture_message('Test')"

# Check if Sentry is configured
python manage.py shell -c "from django.conf import settings; print(settings.SENTRY_DSN)"

# View logs with Sentry errors
tail -f backend/django/logs/django.log | grep ERROR
```

---

## ✅ Week 2 Monitoring Checklist

- [x] Sentry SDK installed (1.39.1)
- [x] Environment variables configured
- [x] Django integration enabled
- [x] Performance monitoring active (20% sample rate)
- [x] Custom middleware for request/response logging
- [x] Error sanitization (passwords/tokens filtered)
- [ ] Test error capture (run test commands above)
- [ ] Configure Slack alerts
- [ ] Set up email notifications
- [ ] Create custom dashboard
- [ ] Add release tracking

---

## 🎯 Next Steps

1. **Sign up for Sentry** (if not done): https://sentry.io
2. **Get your DSN** and add to `.env`
3. **Run test commands** to verify integration
4. **Check dashboard** for test errors
5. **Set up alerts** for production
6. **Monitor performance** of key endpoints

---

## 💡 Tips for Effective Monitoring

1. **Start with high-level metrics**: Track error rate, response time, throughput
2. **Drill down on issues**: Click individual errors for full context
3. **Use tags extensively**: Tag by feature, user role, batch, department
4. **Set up alerts early**: Don't wait for production to configure alerts
5. **Review regularly**: Weekly review of top issues and performance trends
6. **Celebrate wins**: When error rate drops or performance improves! 🎉

---

**Happy Monitoring! 🚀**

If you encounter any Sentry-specific issues, the error tracking will help us debug faster than ever before!
