"""
Quick script to clear Redis cache and reset generation limits
"""
import redis
import os
from dotenv import load_dotenv
import ssl

# Load environment
load_dotenv('backend/.env')

redis_url = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1')

# Connect to Redis
if redis_url.startswith('rediss://'):
    r = redis.from_url(
        redis_url,
        decode_responses=True,
        ssl_cert_reqs=ssl.CERT_NONE,
        ssl_check_hostname=False
    )
else:
    r = redis.from_url(redis_url, decode_responses=True)

# Clear all generation-related keys
keys_to_clear = [
    'generation:*',
    'progress:*',
    'timetable:*',
    'resource_limits:*'
]

cleared = 0
for pattern in keys_to_clear:
    keys = r.keys(pattern)
    if keys:
        r.delete(*keys)
        cleared += len(keys)
        print(f"Cleared {len(keys)} keys matching '{pattern}'")

print(f"\nTotal keys cleared: {cleared}")
print("Redis cache cleared successfully!")
