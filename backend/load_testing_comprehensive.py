"""
Performance Tests using Locust - Tests load and stress scenarios
Run: locust -f test_performance_comprehensive.py --host=http://localhost:8000
"""
from locust import HttpUser, task, between, tag
from random import randint, choice
import json


class AdminUser(HttpUser):
    """Simulates Admin user behavior"""
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks

    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post("/api/login/", json={
            "username": "admin@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get('access')
            self.headers = {'Authorization': f'Bearer {self.access_token}'}
        else:
            self.headers = {}

    @tag('dashboard')
    @task(5)  # Higher weight = more frequent
    def view_dashboard(self):
        """Test dashboard load"""
        self.client.get("/api/dashboard/", headers=self.headers, name="Dashboard")

    @tag('departments')
    @task(3)
    def list_departments(self):
        """Test listing departments"""
        self.client.get("/api/departments/", headers=self.headers, name="List Departments")

    @tag('departments')
    @task(2)
    def view_department(self):
        """Test viewing single department"""
        dept_id = randint(1, 10)
        self.client.get(f"/api/departments/{dept_id}/", headers=self.headers, name="View Department")

    @tag('students')
    @task(4)
    def list_students(self):
        """Test listing students"""
        page = randint(1, 5)
        self.client.get(f"/api/students/?page={page}", headers=self.headers, name="List Students")

    @tag('students')
    @task(2)
    def view_student(self):
        """Test viewing single student"""
        student_id = randint(1, 100)
        self.client.get(f"/api/students/{student_id}/", headers=self.headers, name="View Student")

    @tag('faculty')
    @task(3)
    def list_faculty(self):
        """Test listing faculty"""
        self.client.get("/api/faculty/", headers=self.headers, name="List Faculty")

    @tag('programs')
    @task(2)
    def list_programs(self):
        """Test listing programs"""
        self.client.get("/api/programs/", headers=self.headers, name="List Programs")

    @tag('timetables')
    @task(2)
    def list_timetables(self):
        """Test listing timetables"""
        self.client.get("/api/timetables/", headers=self.headers, name="List Timetables")

    @tag('write')
    @task(1)  # Lower weight for write operations
    def create_department(self):
        """Test creating department (stress test)"""
        data = {
            "name": f"Test Dept {randint(1000, 9999)}",
            "code": f"TD{randint(100, 999)}",
            "organization": 1
        }
        self.client.post("/api/departments/", json=data, headers=self.headers, name="Create Department")


class FacultyUser(HttpUser):
    """Simulates Faculty user behavior"""
    wait_time = between(2, 5)

    def on_start(self):
        """Login as faculty"""
        response = self.client.post("/api/login/", json={
            "username": "faculty@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get('access')
            self.headers = {'Authorization': f'Bearer {self.access_token}'}
        else:
            self.headers = {}

    @tag('attendance')
    @task(5)
    def view_attendance_sessions(self):
        """Test viewing attendance sessions"""
        self.client.get("/api/attendance/sessions/", headers=self.headers, name="Attendance Sessions")

    @tag('attendance')
    @task(3)
    def mark_attendance(self):
        """Test marking attendance"""
        session_id = randint(1, 20)
        data = {
            "session_id": session_id,
            "attendance_records": [
                {"student_id": i, "status": choice(["present", "absent", "late"])}
                for i in range(1, 11)
            ]
        }
        self.client.post("/api/attendance/mark/", json=data, headers=self.headers, name="Mark Attendance")

    @tag('students')
    @task(2)
    def view_my_students(self):
        """Test viewing faculty's students"""
        self.client.get("/api/faculty/my-students/", headers=self.headers, name="My Students")


class StudentUser(HttpUser):
    """Simulates Student user behavior"""
    wait_time = between(3, 7)

    def on_start(self):
        """Login as student"""
        response = self.client.post("/api/login/", json={
            "username": "student@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get('access')
            self.headers = {'Authorization': f'Bearer {self.access_token}'}
        else:
            self.headers = {}

    @tag('profile')
    @task(5)
    def view_profile(self):
        """Test viewing own profile"""
        self.client.get("/api/current-user/", headers=self.headers, name="My Profile")

    @tag('attendance')
    @task(4)
    def view_my_attendance(self):
        """Test viewing own attendance"""
        self.client.get("/api/attendance/my-attendance/", headers=self.headers, name="My Attendance")

    @tag('timetable')
    @task(3)
    def view_timetable(self):
        """Test viewing timetable"""
        self.client.get("/api/timetables/my-timetable/", headers=self.headers, name="My Timetable")


class CacheStressTest(HttpUser):
    """Stress test for cache system"""
    wait_time = between(0.1, 0.5)  # Rapid requests

    def on_start(self):
        response = self.client.post("/api/login/", json={
            "username": "admin@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            data = response.json()
            self.headers = {'Authorization': f'Bearer {data.get("access")}'}
        else:
            self.headers = {}

    @tag('cache-read')
    @task(10)
    def rapid_reads(self):
        """Test cache with rapid reads"""
        endpoints = [
            "/api/departments/",
            "/api/programs/",
            "/api/faculty/",
            "/api/students/"
        ]
        endpoint = choice(endpoints)
        self.client.get(endpoint, headers=self.headers, name="Cache Read Test")

    @tag('cache-write')
    @task(1)
    def cache_invalidation(self):
        """Test cache invalidation under load"""
        data = {
            "name": f"Cache Test {randint(1000, 9999)}",
            "code": f"CT{randint(100, 999)}",
            "organization": 1
        }
        self.client.post("/api/departments/", json=data, headers=self.headers, name="Cache Write Test")


class APILoadTest(HttpUser):
    """General API load test"""
    wait_time = between(1, 2)

    def on_start(self):
        response = self.client.post("/api/login/", json={
            "username": "admin@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            data = response.json()
            self.headers = {'Authorization': f'Bearer {data.get("access")}'}
        else:
            self.headers = {}

    @task
    def load_test_all_endpoints(self):
        """Test all major endpoints"""
        endpoints = [
            "/api/departments/",
            "/api/programs/",
            "/api/subjects/",
            "/api/faculty/",
            "/api/students/",
            "/api/batches/",
            "/api/classrooms/",
            "/api/timetables/"
        ]

        for endpoint in endpoints:
            with self.client.get(endpoint, headers=self.headers, catch_response=True, name="Load Test") as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Failed with status {response.status_code}")


# Custom test scenarios
class PeakLoadScenario(HttpUser):
    """Simulates peak load (e.g., start of semester)"""
    wait_time = between(0.5, 1.5)

    def on_start(self):
        response = self.client.post("/api/login/", json={
            "username": "admin@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            data = response.json()
            self.headers = {'Authorization': f'Bearer {data.get("access")}'}
        else:
            self.headers = {}

    @task(10)
    def student_registration_flow(self):
        """Simulate student registration process"""
        # 1. View programs
        self.client.get("/api/programs/", headers=self.headers)

        # 2. View batches
        self.client.get("/api/batches/", headers=self.headers)

        # 3. View students
        self.client.get("/api/students/", headers=self.headers)

        # 4. Create student (if admin)
        data = {
            "student_id": f"STU{randint(10000, 99999)}",
            "batch": randint(1, 5),
            "organization": 1
        }
        # Note: This will fail without proper user ID, but tests the endpoint


if __name__ == "__main__":
    import os
    os.system("locust -f test_performance_comprehensive.py --host=http://localhost:8000")
