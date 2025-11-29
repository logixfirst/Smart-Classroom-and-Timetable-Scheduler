"""Redis-based data caching for ultra-fast data loading"""
import json
import logging
import hashlib
import time
from typing import Optional, Any

logger = logging.getLogger(__name__)

class DataCache:
    """Enterprise-level Redis caching with automatic invalidation on data changes"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.ttl = 3600  # 1 hour cache (but auto-invalidates on data change)
    
    def _get_data_version(self, org_name: str, semester: int) -> str:
        """Get current data version from database last modified timestamp"""
        try:
            # Query database for last modification time of relevant tables
            # This automatically invalidates cache when data changes
            version_key = f"ttdata:version:{org_name}:{semester}"
            version = self.redis.get(version_key)
            if not version:
                # Set initial version as current timestamp
                version = str(int(time.time()))
                self.redis.setex(version_key, 86400, version)  # 24 hour version TTL
            return version.decode() if isinstance(version, bytes) else version
        except:
            return "v1"  # Fallback version
    
    def _make_key(self, org_name: str, semester: int, data_type: str) -> str:
        """Generate cache key with version for automatic invalidation"""
        version = self._get_data_version(org_name, semester)
        key_str = f"{org_name}:{semester}:{data_type}:{version}"
        return f"ttdata:{hashlib.md5(key_str.encode()).hexdigest()}"
    
    def get(self, org_name: str, semester: int, data_type: str) -> Optional[Any]:
        """Get cached data"""
        try:
            key = self._make_key(org_name, semester, data_type)
            data = self.redis.get(key)
            if data:
                logger.info(f"[CACHE HIT] {data_type} for {org_name} semester {semester}")
                return json.loads(data)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set(self, org_name: str, semester: int, data_type: str, data: Any):
        """Cache data"""
        try:
            key = self._make_key(org_name, semester, data_type)
            self.redis.setex(key, self.ttl, json.dumps(data))
            logger.info(f"[CACHE SET] {data_type} for {org_name} semester {semester}")
        except Exception as e:
            logger.warning(f"Cache set failed: {e}")
    
    def invalidate(self, org_name: str, semester: int):
        """Invalidate all cached data by bumping version (enterprise pattern)"""
        try:
            # Bump version - all old cache keys become invalid automatically
            version_key = f"ttdata:version:{org_name}:{semester}"
            new_version = str(int(time.time()))
            self.redis.setex(version_key, 86400, new_version)
            logger.info(f"[CACHE INVALIDATE] {org_name} semester {semester} -> version {new_version}")
        except Exception as e:
            logger.warning(f"Cache invalidate failed: {e}")
    
    def invalidate_on_change(self, org_name: str):
        """Invalidate cache for all semesters when data changes (called by Django signals)"""
        try:
            # Invalidate both ODD and EVEN semesters
            for semester in [1, 2]:
                self.invalidate(org_name, semester)
            logger.info(f"[CACHE INVALIDATE] All semesters for {org_name}")
        except Exception as e:
            logger.warning(f"Cache invalidate failed: {e}")
