# Redis Server Required!

## Problem
Your Redis caching is NOT working because Redis server is not installed or running.
Every API request shows "Cache MISS" because Django cannot connect to Redis.

## Evidence from test
```
✗ Redis Connection Error: Connection closed by server.
GET: test_key = 'None' (should be 'test_value')
```

## Options to Fix

### Option 1: Install Redis on Windows (Recommended for Production)

#### Method A: Using WSL2 (Best for Windows)
```powershell
# Install WSL2 if not already installed
wsl --install

# In WSL terminal
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start

# Test
redis-cli ping  # Should return PONG
```

#### Method B: Using Memurai (Native Windows Redis)
1. Download from: https://www.memurai.com/get-memurai
2. Install and start the service
3. Update Django settings:
```python
REDIS_URL = "redis://127.0.0.1:6379/0"  # Default Memurai port
```

### Option 2: Use Docker Redis (Easiest)
```powershell
# Start Redis container
docker run -d -p 6379:6379 --name redis redis:latest

# Verify it's running
docker ps

# Test connection
docker exec -it redis redis-cli ping
```

### Option 3: Disable Redis (Temporary - Not Recommended)
If you can't install Redis right now, temporarily use dummy cache:

**backend/django/erp/settings.py**
```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",  # No caching
    }
}
```

## After Starting Redis

### 1. Test Connection
```powershell
cd D:\GitHub\SIH28\backend\django
python test_redis.py
```

Should show:
```
✓ Redis Working: True
✓ Cache Persists: True
```

### 2. Restart Django
The server will automatically detect Redis and start caching.

### 3. Verify Caching Works
Navigate to Faculty page multiple times. Backend logs should show:
```
First visit:  Cache MISS → 2.4s response time
Second visit: Cache HIT  → 50ms response time
```

### 4. Monitor Cache
```powershell
python manage.py cache_stats
```

## Why This Matters

**Without Redis:**
- Every page load: 2-7 seconds ❌
- Database hit on every request
- LCP: 8.44 seconds (POOR)

**With Redis:**
- First load: 2 seconds
- Cached loads: 50ms ⚡
- LCP: < 2.5 seconds (GOOD)
- 98% faster response times

## Current Status
🔴 Redis: NOT RUNNING
🔴 Cache: DISABLED (silently failing)
🔴 Performance: DEGRADED (no caching benefit)

Choose an option above and let me know once Redis is running!
