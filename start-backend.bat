@echo off
echo Starting SIH28 Backend Services...

echo.
echo Starting Django Server (Port 8000)...
start "Django Server" cmd /k "cd backend\django && python manage.py runserver"

timeout /t 3 /nobreak >nul

echo.
echo Starting FastAPI Server (Port 8001)...
start "FastAPI Server" cmd /k "cd backend\fastapi && uvicorn main:app --reload --port 8001"

echo.
echo Both servers are starting...
echo Django: http://localhost:8000
echo FastAPI: http://localhost:8001
echo.
pause