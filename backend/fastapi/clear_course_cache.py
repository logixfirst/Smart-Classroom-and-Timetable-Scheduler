"""
Clear course cache to force reloading from database with new validation
"""
import asyncio
import sys
import redis.asyncio as redis
from utils.cache_manager import CacheManager

async def clear_cache():
    """Clear all course caches"""
    try:
        # Connect to Redis
        redis_client = await redis.from_url('redis://localhost:6379', decode_responses=True)
        cache_manager = CacheManager(redis_client=redis_client)
        
        # Clear course cache for all organizations
        pattern = "courses:*"
        await cache_manager.invalidate_pattern(pattern)
        print(f"✅ Cleared cache pattern: {pattern}")
        
        # Close Redis connection
        await redis_client.close()
        print("✅ Cache cleared successfully - courses will be reloaded with validation")
        
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(clear_cache())
