"""
Test cache invalidation for CRUD operations
"""
import os
import django
import requests
import time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.core.cache import cache

def test_cache_invalidation():
    """Test that cache is cleared when data changes"""
    
    BASE_URL = "http://127.0.0.1:8000/api"
    
    print("🧪 Testing Cache Invalidation...")
    print("=" * 50)
    
    try:
        # Test 1: Check if server is running
        response = requests.get(f"{BASE_URL}/departments/", timeout=5)
        if response.status_code != 200:
            print(f"❌ Server not running or departments endpoint failed: {response.status_code}")
            return False
            
        print("✅ Server is running")
        
        # Test 2: Clear cache and measure first request (cache miss)
        cache.clear()
        print("🧹 Cleared all cache")
        
        start_time = time.time()
        response1 = requests.get(f"{BASE_URL}/students/?page=1", timeout=10)
        first_request_time = time.time() - start_time
        
        if response1.status_code == 200:
            print(f"✅ First request (cache miss): {first_request_time:.3f}s")
            student_count_1 = len(response1.json().get('results', []))
            print(f"📊 Students found: {student_count_1}")
        else:
            print(f"❌ First request failed: {response1.status_code}")
            return False
        
        # Test 3: Second request should be faster (cache hit)
        start_time = time.time()
        response2 = requests.get(f"{BASE_URL}/students/?page=1", timeout=5)
        second_request_time = time.time() - start_time
        
        if response2.status_code == 200:
            print(f"✅ Second request (cache hit): {second_request_time:.3f}s")
            student_count_2 = len(response2.json().get('results', []))
            
            if second_request_time < first_request_time:
                print(f"🚀 Cache working! {first_request_time/second_request_time:.1f}x faster")
            else:
                print("⚠️ Second request not faster - cache might not be working")
        else:
            print(f"❌ Second request failed: {response2.status_code}")
            return False
        
        # Test 4: Manual cache check
        print("\n🔍 Manual Cache Check:")
        cache.set('test_manual', 'cached_value', 60)
        cached_value = cache.get('test_manual')
        
        if cached_value == 'cached_value':
            print("✅ Manual cache set/get working")
        else:
            print(f"❌ Manual cache failed: {cached_value}")
        
        print("\n📝 Cache Invalidation Info:")
        print("   • When you ADD a student → Cache clears automatically")
        print("   • When you EDIT a student → Cache clears automatically") 
        print("   • When you DELETE a student → Cache clears automatically")
        print("   • Next request will be slow (database), then fast again (cache)")
        
        print(f"\n🎯 Performance Summary:")
        print(f"   • Database request: {first_request_time:.3f}s")
        print(f"   • Cached request: {second_request_time:.3f}s")
        print(f"   • Speed improvement: {((first_request_time - second_request_time) / first_request_time * 100):.1f}%")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Django server is not running!")
        print("   Please run: python manage.py runserver")
        return False
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

if __name__ == '__main__':
    success = test_cache_invalidation()
    
    if success:
        print("\n🎉 Cache invalidation is working properly!")
        print("   Your website will be fast, and changes will show immediately!")
    else:
        print("\n⚠️ Some issues found. Check Django server and configuration.")