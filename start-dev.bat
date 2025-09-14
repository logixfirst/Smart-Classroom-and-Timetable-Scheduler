@echo off
echo Starting SIH28 Development Environment...

echo.
echo Starting Django Backend...
start "Django" cmd /k "cd backend\django && python manage.py runserver"

echo.
echo Starting FastAPI AI Service...
start "FastAPI" cmd /k "cd backend\fastapi && uvicorn src.main:app --reload --port 8001"

echo.
echo Starting Next.js Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services starting...
echo Django: http://localhost:8000
echo FastAPI: http://localhost:8001  
echo Frontend: http://localhost:3000
pause