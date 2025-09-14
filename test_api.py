import requests
import json

# Test Django API endpoint
def test_django_api():
    try:
        # Test basic connection
        response = requests.get('http://localhost:8000/api/v1/timetables/')
        print(f"Django API Status: {response.status_code}")
        
        # Test the generate endpoint with sample data
        sample_data = {
            "department": "cs",
            "semester": "1",
            "academicYear": "2023-24",
            "maxClassesPerDay": 6,
            "classrooms": [
                {
                    "id": "1",
                    "roomNumber": "101",
                    "capacity": 30,
                    "type": "lecture"
                }
            ],
            "batches": [
                {
                    "id": "1",
                    "name": "CS-A",
                    "strength": 60
                }
            ],
            "subjects": [
                {
                    "id": "1",
                    "name": "Data Structures",
                    "code": "CS301",
                    "classesPerWeek": 3
                }
            ],
            "faculty": [
                {
                    "id": "1",
                    "name": "Dr. John Doe"
                }
            ],
            "fixedSlots": []
        }
        
        response = requests.post(
            'http://localhost:8000/api/v1/timetables/generate/',
            json=sample_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Generate API Status: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Error testing Django API: {e}")

if __name__ == "__main__":
    test_django_api()