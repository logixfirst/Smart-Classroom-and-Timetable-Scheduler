"""
Simple cache invalidation demo
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.core.cache import cache
from academics.models import Student, Faculty

def demo_cache_invalidation():
    """Demonstrate how cache invalidation works"""
    
    print("🎯 Cache Invalidation Demo")
    print("=" * 40)
    
    # 1. Clear cache
    cache.clear()
    print("✅ Cleared all cache")
    
    # 2. Set some test cache values
    cache.set('students_list_page1', 'cached_students_data', 300)
    cache.set('faculty_list_page1', 'cached_faculty_data', 300)
    
    print("✅ Set test cache values")
    
    # 3. Verify cache exists
    students_cache = cache.get('students_list_page1')
    faculty_cache = cache.get('faculty_list_page1')
    
    print(f"📦 Students cache: {students_cache}")
    print(f"📦 Faculty cache: {faculty_cache}")
    
    # 4. Simulate cache invalidation (what happens on CRUD operations)
    print("\n🔄 Simulating database change...")
    
    # This is what happens when you create/update/delete via API
    try:
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection("default")
        
        # Find and delete cache keys
        pattern = "sih28:1:views.decorators.cache.cache_page*"
        keys = redis_conn.keys(pattern)
        
        print(f"🔍 Found {len(keys)} cache keys matching pattern")
        
        if keys:
            redis_conn.delete(*keys)
            print("🗑️ Deleted cached pages")
        
        # Also clear our test keys
        cache.delete('students_list_page1')
        cache.delete('faculty_list_page1')
        
    except:
        # Fallback
        cache.clear()
        print("🗑️ Cleared all cache (fallback method)")
    
    # 5. Verify cache is cleared
    students_cache_after = cache.get('students_list_page1')
    faculty_cache_after = cache.get('faculty_list_page1')
    
    print(f"📭 Students cache after: {students_cache_after}")
    print(f"📭 Faculty cache after: {faculty_cache_after}")
    
    print("\n✨ How it works in your website:")
    print("   1️⃣  User visits Students page → Slow (database query) → Cache saved")
    print("   2️⃣  User visits again → Fast (Redis cache)")
    print("   3️⃣  Admin adds new student → Cache cleared automatically")
    print("   4️⃣  Next visit → Slow (fresh data) → Cache saved again")
    print("   5️⃣  Subsequent visits → Fast (updated cache)")
    
    print(f"\n🚀 Result: Users always see fresh data + get performance benefits!")

if __name__ == '__main__':
    demo_cache_invalidation()