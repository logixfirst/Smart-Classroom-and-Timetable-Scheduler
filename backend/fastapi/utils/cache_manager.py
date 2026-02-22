"""
Enterprise-grade caching system for timetable scheduling.
Provides intelligent caching with Redis and database synchronization.
"""

import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Intelligent cache manager with Redis backend and database fallback.
    
    Features:
    - Multi-level caching (Redis + in-memory)
    - Automatic cache invalidation
    - Smart cache warming
    - Database synchronization
    """
    
    def __init__(self, redis_client=None, db_conn=None):
        self.redis_client = redis_client
        self.db_conn = db_conn
        self.memory_cache = {}  # Fallback in-memory cache
        self.cache_ttl = {
            'courses': 1800,      # 30 minutes
            'faculty': 3600,      # 1 hour
            'rooms': 3600,        # 1 hour
            'students': 1800,     # 30 minutes
            'time_slots': 7200,   # 2 hours
            'config': 86400,      # 24 hours
            'departments': 7200,  # 2 hours
        }
    
    def _generate_cache_key(self, resource_type: str, org_id: str, **kwargs) -> str:
        """Generate unique cache key with hash for complex parameters"""
        key_parts = [resource_type, org_id]
        
        # Add additional parameters
        for k, v in sorted(kwargs.items()):
            if v is not None:
                key_parts.append(f"{k}:{v}")
        
        key = ":".join(str(p) for p in key_parts)
        
        # If key is too long, use hash
        if len(key) > 200:
            key_hash = hashlib.md5(key.encode()).hexdigest()
            key = f"{resource_type}:{org_id}:{key_hash}"
        
        return key
    
    async def get(self, resource_type: str, org_id: str, **kwargs) -> Optional[Any]:
        """
        Get cached data with multi-level fallback.
        
        Args:
            resource_type: Type of resource (courses, faculty, rooms, etc.)
            org_id: Organization ID
            **kwargs: Additional parameters for cache key generation
        
        Returns:
            Cached data if found, None otherwise
        """
        cache_key = self._generate_cache_key(resource_type, org_id, **kwargs)
        
        # Try Redis first
        if self.redis_client:
            try:
                cached_data = self.redis_client.get(cache_key)
                if cached_data:
                    logger.debug(f"[CACHE] Redis HIT: {cache_key}")
                    return json.loads(cached_data)
            except Exception as e:
                logger.warning(f"[CACHE] Redis read error: {e}")
        
        # Fallback to in-memory cache
        if cache_key in self.memory_cache:
            cache_entry = self.memory_cache[cache_key]
            if cache_entry['expires_at'] > datetime.now():
                logger.debug(f"[CACHE] Memory HIT: {cache_key}")
                return cache_entry['data']
            else:
                # Expired, remove from memory cache
                del self.memory_cache[cache_key]
        
        logger.debug(f"[CACHE] MISS: {cache_key}")
        return None
    
    async def set(self, resource_type: str, org_id: str, data: Any, ttl: Optional[int] = None, **kwargs):
        """
        Cache data in Redis and memory.
        
        Args:
            resource_type: Type of resource
            org_id: Organization ID
            data: Data to cache
            ttl: Time to live in seconds (uses default if not provided)
            **kwargs: Additional parameters for cache key generation
        """
        cache_key = self._generate_cache_key(resource_type, org_id, **kwargs)
        ttl = ttl or self.cache_ttl.get(resource_type, 3600)
        
        # Serialize data
        try:
            serialized_data = json.dumps(data)
        except Exception as e:
            logger.error(f"[CACHE] Serialization error for {cache_key}: {e}")
            return
        
        # Store in Redis
        if self.redis_client:
            try:
                self.redis_client.setex(cache_key, ttl, serialized_data)
                logger.debug(f"[CACHE] Redis SET: {cache_key} (TTL: {ttl}s)")
            except Exception as e:
                logger.warning(f"[CACHE] Redis write error: {e}")
        
        # Store in memory cache as fallback
        self.memory_cache[cache_key] = {
            'data': data,
            'expires_at': datetime.now() + timedelta(seconds=ttl)
        }
        
        # Clean up old memory cache entries (keep last 100)
        if len(self.memory_cache) > 100:
            # Remove oldest entries
            sorted_keys = sorted(
                self.memory_cache.keys(),
                key=lambda k: self.memory_cache[k]['expires_at']
            )
            for old_key in sorted_keys[:20]:
                del self.memory_cache[old_key]
    
    async def invalidate(self, resource_type: str, org_id: str, **kwargs):
        """
        Invalidate cache for specific resource.
        
        Args:
            resource_type: Type of resource to invalidate
            org_id: Organization ID
            **kwargs: Additional parameters for cache key generation
        """
        cache_key = self._generate_cache_key(resource_type, org_id, **kwargs)
        
        # Remove from Redis
        if self.redis_client:
            try:
                self.redis_client.delete(cache_key)
                logger.debug(f"[CACHE] Redis INVALIDATE: {cache_key}")
            except Exception as e:
                logger.warning(f"[CACHE] Redis delete error: {e}")
        
        # Remove from memory cache
        if cache_key in self.memory_cache:
            del self.memory_cache[cache_key]
    
    async def invalidate_pattern(self, pattern: str):
        """
        Invalidate all cache keys matching pattern.
        
        Args:
            pattern: Pattern to match (e.g., "courses:*")
        """
        # Redis pattern matching
        if self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                    logger.debug(f"[CACHE] Redis INVALIDATE PATTERN: {pattern} ({len(keys)} keys)")
            except Exception as e:
                logger.warning(f"[CACHE] Redis pattern delete error: {e}")
        
        # Memory cache pattern matching
        matching_keys = [k for k in self.memory_cache.keys() if self._matches_pattern(k, pattern)]
        for key in matching_keys:
            del self.memory_cache[key]
        
        if matching_keys:
            logger.debug(f"[CACHE] Memory INVALIDATE PATTERN: {pattern} ({len(matching_keys)} keys)")
    
    def _matches_pattern(self, key: str, pattern: str) -> bool:
        """Check if key matches pattern (simple * wildcard support)"""
        import re
        regex_pattern = pattern.replace('*', '.*').replace('?', '.')
        return bool(re.match(f"^{regex_pattern}$", key))
    
    async def warm_cache(self, org_id: str, client):
        """
        Pre-load frequently accessed data into cache.
        
        Args:
            org_id: Organization ID
            client: DjangoAPIClient instance for fetching data
        """
        logger.info(f"[CACHE] Warming cache for org {org_id}")
        
        try:
            # Fetch and cache configuration
            config = await self._fetch_and_cache_config(org_id, client)
            
            # Fetch and cache departments
            departments = await self._fetch_and_cache_departments(org_id, client)
            
            logger.debug(f"[CACHE] Cache warmed: config={bool(config)}, departments={len(departments) if departments else 0}")
            
            return {
                'config': config,
                'departments': departments
            }
            
        except Exception as e:
            logger.error(f"[CACHE] Cache warming failed: {e}")
            return None
    
    async def _fetch_and_cache_config(self, org_id: str, client) -> Optional[Dict]:
        """Fetch configuration from database and cache it"""
        try:
            cursor = client.db_conn.cursor()
            cursor.execute("""
                SELECT working_days, slots_per_day, start_time, end_time,
                       slot_duration_minutes, lunch_break_enabled, 
                       lunch_break_start, lunch_break_end
                FROM timetable_config
                WHERE org_id = %s AND is_active = true
                ORDER BY created_at DESC
                LIMIT 1
            """, (org_id,))
            
            config_row = cursor.fetchone()
            cursor.close()
            
            if config_row:
                config = {
                    'working_days': config_row['working_days'],
                    'slots_per_day': config_row['slots_per_day'],
                    'start_time': config_row['start_time'],
                    'end_time': config_row['end_time'],
                    'slot_duration_minutes': config_row['slot_duration_minutes'],
                    'lunch_break_enabled': config_row['lunch_break_enabled'],
                    'lunch_break_start': config_row['lunch_break_start'],
                    'lunch_break_end': config_row['lunch_break_end'],
                }
                
                # Cache for 24 hours
                await self.set('config', org_id, config, ttl=86400)
                logger.debug(f"[CACHE] Cached config: {config['working_days']} days, {config['slots_per_day']} slots/day")
                return config
            
            logger.warning(f"[CACHE] No config found for org {org_id}")
            return None
            
        except Exception as e:
            logger.error(f"[CACHE] Config fetch error: {e}")
            return None
    
    async def _fetch_and_cache_departments(self, org_id: str, client) -> Optional[List[str]]:
        """Fetch departments from database and cache them"""
        try:
            cursor = client.db_conn.cursor()
            cursor.execute("""
                SELECT DISTINCT dept_id 
                FROM courses 
                WHERE org_id = %s
                AND is_active = true
                ORDER BY dept_id
            """, (org_id,))
            
            dept_rows = cursor.fetchall()
            cursor.close()
            
            departments = [row['dept_id'] for row in dept_rows]
            
            # Cache for 2 hours
            await self.set('departments', org_id, departments, ttl=7200)
            logger.debug(f"[CACHE] Cached {len(departments)} departments")
            return departments
            
        except Exception as e:
            logger.error(f"[CACHE] Departments fetch error: {e}")
            return None
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        stats = {
            'memory_cache_size': len(self.memory_cache),
            'memory_cache_keys': list(self.memory_cache.keys())[:10],  # First 10 keys
            'redis_available': self.redis_client is not None,
        }
        
        if self.redis_client:
            try:
                info = self.redis_client.info('stats')
                stats['redis_keys'] = self.redis_client.dbsize()
                stats['redis_hits'] = info.get('keyspace_hits', 0)
                stats['redis_misses'] = info.get('keyspace_misses', 0)
                stats['redis_hit_rate'] = (
                    stats['redis_hits'] / (stats['redis_hits'] + stats['redis_misses'])
                    if (stats['redis_hits'] + stats['redis_misses']) > 0 else 0
                )
            except Exception as e:
                logger.warning(f"[CACHE] Stats fetch error: {e}")
        
        return stats
    
    def clear_memory_cache(self) -> int:
        """
        Clear in-memory cache (for memory pressure relief)
        
        Returns:
            Approximate bytes freed
        
        Use case: Called by MemoryMonitor during cleanup
        """
        count = len(self.memory_cache)
        # Estimate size (rough approximation)
        size_bytes = sum(len(str(v)) for v in self.memory_cache.values()) * 2
        
        self.memory_cache.clear()
        logger.info(f"[CACHE] Cleared {count} in-memory cache entries (~{size_bytes/(1024**2):.1f} MB)")
        
        return size_bytes
    
    def clear_all(self) -> int:
        """
        Clear ALL caches (memory + Redis)
        
        Returns:
            Approximate bytes freed
        
        WARNING: This clears everything. Use only for:
        - Manual admin action
        - Critical memory pressure
        - Testing
        """
        total_freed = 0
        
        # Clear memory cache
        total_freed += self.clear_memory_cache()
        
        # Clear Redis cache
        if self.redis_client:
            try:
                keys_deleted = 0
                # Delete only our namespace keys (careful!)
                for pattern in ['courses:*', 'faculty:*', 'rooms:*', 'students:*', 'time_slots:*', 'config:*', 'departments:*']:
                    keys = self.redis_client.keys(pattern)
                    if keys:
                        self.redis_client.delete(*keys)
                        keys_deleted += len(keys)
                
                logger.debug(f"[CACHE] Cleared {keys_deleted} Redis keys")
                # Rough estimate: assume 10KB per key
                total_freed += keys_deleted * 10 * 1024
            except Exception as e:
                logger.error(f"[CACHE] Redis clear error: {e}")
        
        return total_freed
