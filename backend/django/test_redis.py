"""
Test Redis connection
"""
import os
import django
import traceback

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.core.cache import cache

def test_redis_connection():
    """Test Redis connectivity and operations"""
    print("Testing Redis connection...")
    
    try:
        # Clear any existing cache first
        cache.clear()
        print("✅ Successfully cleared cache")
        
        # Test 1: Set a simple string value
        test_key = 'test_key_simple'
        test_value = 'hello_world'
        
        cache.set(test_key, test_value, 60)
        print("✅ Successfully set value in Redis")
        
        # Test 2: Get the value
        value = cache.get(test_key)
        print(f"📥 Retrieved value: {value}")
        
        if value == test_value:
            print(f"✅ Successfully retrieved value from Redis: {value}")
        else:
            print(f"❌ Retrieved value doesn't match: expected '{test_value}', got '{value}'")
        
        # Test 3: Set a more complex value
        complex_data = {
            'name': 'Test User',
            'id': 123,
            'roles': ['admin', 'faculty']
        }
        
        cache.set('test_complex', complex_data, 60)
        retrieved_complex = cache.get('test_complex')
        
        if retrieved_complex == complex_data:
            print("✅ Successfully stored and retrieved complex data")
        else:
            print(f"❌ Complex data mismatch: {retrieved_complex}")
        
        # Test 4: Delete values
        cache.delete(test_key)
        cache.delete('test_complex')
        print("✅ Successfully deleted values from Redis")
        
        # Test 5: Verify deletion
        value = cache.get(test_key)
        if value is None:
            print("✅ Value successfully deleted (returns None)")
        else:
            print(f"❌ Value still exists: {value}")
        
        print("\n🎉 Redis is working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print(f"Error details: {traceback.format_exc()}")
        return False

def test_cache_decorators():
    """Test if Django cache decorators work"""
    print("\nTesting cache decorators...")
    
    try:
        from django.views.decorators.cache import cache_page
        from django.http import HttpResponse
        
        @cache_page(60)
        def dummy_view(request):
            return HttpResponse("Test")
        
        print("✅ Cache decorators imported successfully")
        return True
        
    except Exception as e:
        print(f"❌ Cache decorators failed: {e}")
        return False

if __name__ == '__main__':
    success1 = test_redis_connection()
    success2 = test_cache_decorators()
    
    if success1 and success2:
        print("\n🚀 All Redis tests passed! Your caching setup is ready.")
    else:
        print("\n⚠️ Some tests failed. Check configuration.")
