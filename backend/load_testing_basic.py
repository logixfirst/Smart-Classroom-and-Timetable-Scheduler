# Performance Testing Script
# Tests all API endpoints and measures response times

import requests
import time
import json
from typing import Dict, List

# Base URL
BASE_URL = "http://localhost:8000/api"

# Test credentials
TEST_CREDENTIALS = {
    "username": "admin",
    "password": "m@dhubala"
}

class PerformanceTester:
    def __init__(self):
        self.token = None
        self.results: List[Dict] = []

    def login(self):
        """Login and get auth token"""
        print("🔐 Logging in...")
        response = requests.post(
            f"{BASE_URL}/auth/login/",
            json=TEST_CREDENTIALS
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('token')
            print(f"✅ Login successful! Token: {self.token[:20]}...")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(response.text)
            return False

    def test_endpoint(self, name: str, endpoint: str, method='GET', auth_required=True):
        """Test a single endpoint and measure performance"""
        headers = {}
        if auth_required and self.token:
            headers['Authorization'] = f'Token {self.token}'

        print(f"\n🧪 Testing {name}...")
        print(f"   URL: {BASE_URL}{endpoint}")

        try:
            start_time = time.time()

            if method == 'GET':
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            elif method == 'POST':
                response = requests.post(f"{BASE_URL}{endpoint}", headers=headers)

            elapsed_time = (time.time() - start_time) * 1000  # Convert to ms

            result = {
                'name': name,
                'endpoint': endpoint,
                'status_code': response.status_code,
                'response_time_ms': round(elapsed_time, 2),
                'content_length': len(response.content)
            }

            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, dict):
                        result['count'] = data.get('count', 'N/A')
                        result['has_pagination'] = 'next' in data
                except:
                    pass

                print(f"   ✅ Status: {response.status_code}")
                print(f"   ⚡ Response Time: {result['response_time_ms']}ms")
                print(f"   📦 Content Size: {result['content_length']} bytes")
                if 'count' in result:
                    print(f"   📊 Record Count: {result['count']}")
            else:
                print(f"   ❌ Status: {response.status_code}")
                print(f"   💬 Response: {response.text[:200]}")

            self.results.append(result)
            return result

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return None

    def print_summary(self):
        """Print summary of all test results"""
        print("\n" + "="*60)
        print("📊 PERFORMANCE TEST SUMMARY")
        print("="*60)

        successful = [r for r in self.results if r['status_code'] == 200]
        failed = [r for r in self.results if r['status_code'] != 200]

        print(f"\n✅ Successful: {len(successful)}/{len(self.results)}")
        print(f"❌ Failed: {len(failed)}/{len(self.results)}")

        if successful:
            avg_time = sum(r['response_time_ms'] for r in successful) / len(successful)
            max_time = max(r['response_time_ms'] for r in successful)
            min_time = min(r['response_time_ms'] for r in successful)

            print(f"\n⚡ Response Times:")
            print(f"   Average: {avg_time:.2f}ms")
            print(f"   Min: {min_time:.2f}ms")
            print(f"   Max: {max_time:.2f}ms")

            print(f"\n📋 Detailed Results:")
            print(f"{'Endpoint':<30} {'Status':<10} {'Time (ms)':<12} {'Size (KB)':<12}")
            print("-" * 64)
            for r in self.results:
                status_symbol = "✅" if r['status_code'] == 200 else "❌"
                size_kb = r['content_length'] / 1024
                print(f"{r['name']:<30} {status_symbol} {r['status_code']:<8} {r['response_time_ms']:<12.2f} {size_kb:<12.2f}")

        if failed:
            print(f"\n❌ Failed Endpoints:")
            for r in failed:
                print(f"   - {r['name']}: {r['status_code']}")

        print("\n" + "="*60)

def main():
    tester = PerformanceTester()

    print("🚀 Starting API Performance Tests")
    print("="*60)

    # Login first
    if not tester.login():
        print("Cannot proceed without authentication")
        return

    # Test all endpoints
    endpoints = [
        ("Users List", "/users/?page=1", True),
        ("Faculty List", "/faculty/?page=1", True),
        ("Students List", "/students/?page=1", True),
        ("Departments", "/departments/", True),
        ("Courses", "/courses/", True),
        ("Subjects", "/subjects/", True),
        ("Classrooms", "/classrooms/", True),
        ("Labs", "/labs/", True),
        ("Batches", "/batches/", True),
        ("Attendance", "/attendance/?page=1", True),
    ]

    for name, endpoint, auth_required in endpoints:
        tester.test_endpoint(name, endpoint, auth_required=auth_required)
        time.sleep(0.5)  # Small delay between requests

    # Print summary
    tester.print_summary()

    # Performance thresholds
    print("\n🎯 Performance Targets:")
    print("   ✅ Excellent: < 1000ms")
    print("   ⚠️  Acceptable: 1000-2000ms")
    print("   ❌ Needs Optimization: > 2000ms")

if __name__ == "__main__":
    main()
