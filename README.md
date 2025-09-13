# SIH28 - Timetable Optimization Platform

A comprehensive timetable optimization platform with AI-powered scheduling, role-based dashboards, and responsive design.

## 🚀 Project Overview

SIH28 is a modern web application that automates timetable generation and management for educational institutions. It features role-based access control, AI-powered optimization, and a responsive user interface.

### ✨ Key Features

- **AI-Powered Scheduling**: Intelligent timetable generation using OR-Tools
- **Role-Based Dashboards**: Separate interfaces for Admin, Staff, Faculty, and Students
- **Responsive Design**: Mobile-first approach with dark/light theme support
- **Real-time Optimization**: Conflict detection and resolution
- **Modern UI**: Built with Next.js 14 and Tailwind CSS

## 🏗️ Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with ShadCN/UI components
- **State Management**: Zustand for lightweight global state
- **Features**: Responsive design, role-based dashboards, theme toggle

### Backend (Hybrid Architecture)

#### Django Service (Core API)
- **Framework**: Django 5+ with Django REST Framework
- **Purpose**: User management, authentication, RBAC, core data management
- **Database**: PostgreSQL with Django ORM
- **Authentication**: JWT-based with role-based permissions

#### FastAPI Service (AI Engine)
- **Framework**: FastAPI for high-performance AI operations
- **Purpose**: Timetable optimization using OR-Tools
- **Features**: Constraint satisfaction, conflict resolution, optimization scoring

## 📁 Project Structure

```
SIH28/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages and layouts
│   │   │   ├── admin/       # Admin dashboard pages
│   │   │   ├── staff/       # Staff dashboard pages
│   │   │   ├── faculty/     # Faculty dashboard pages
│   │   │   ├── student/     # Student dashboard pages
│   │   │   ├── globals.css  # Global styles and Tailwind config
│   │   │   └── layout.tsx   # Root layout component
│   │   ├── components/      # Reusable UI components
│   │   │   └── dashboard-layout.tsx  # Main dashboard layout
│   │   └── lib/            # Utilities and helper functions
│   ├── package.json        # Frontend dependencies
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── next.config.js      # Next.js configuration
├── backend/
│   ├── django/             # Django core service
│   │   ├── apps/           # Django applications
│   │   ├── config/         # Django settings and configuration
│   │   └── requirements.txt # Python dependencies
│   └── fastapi/            # FastAPI AI service
│       ├── src/
│       │   ├── app/        # FastAPI application modules
│       │   └── main.py     # FastAPI entry point
│       └── requirements.txt # Python dependencies
├── docker-compose.yml      # Multi-service orchestration
└── README.md              # Project documentation
```

## 🛠️ Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://python.org/))
- **Git** ([Download](https://git-scm.com/))
- **Docker** & **Docker Compose** (Optional, for containerized setup)

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/SIH28.git

# Navigate to project directory
cd SIH28
```

### 2. Frontend Setup (Next.js)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: `http://localhost:3000`

### 3. Backend Setup

#### Django Service

```bash
# Navigate to Django backend
cd backend/django

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start Django server
python manage.py runserver
```

Django API will be available at: `http://localhost:8000`

#### FastAPI Service

```bash
# Navigate to FastAPI backend
cd backend/fastapi

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn src.main:app --reload --port 8001
```

FastAPI AI Service will be available at: `http://localhost:8001`

### 4. Docker Setup (Alternative)

```bash
# Start all services with Docker
docker-compose up --build

# Run in background
docker-compose up -d --build
```

**Service URLs:**
- Frontend: `http://localhost:3000`
- Django API: `http://localhost:8000`
- FastAPI AI Service: `http://localhost:8001`
- PostgreSQL: `localhost:5432`

## 🎯 Usage

### Role-Based Access

The application provides different dashboards based on user roles:

1. **Admin Dashboard** (`/admin/dashboard`)
   - User management and system configuration
   - Course and classroom CRUD operations
   - Timetable generation and approval workflows
   - System health monitoring and audit trails

2. **Staff Dashboard** (`/staff/dashboard`)
   - Approval workflows and reporting
   - Faculty workload management
   - Resource booking and analytics
   - Inter-departmental communication

3. **Faculty Dashboard** (`/faculty/dashboard`)
   - Personal schedule management
   - Preference settings and leave requests
   - Student performance analytics
   - Resource request systems

4. **Student Dashboard** (`/student/dashboard`)
   - Personal timetable view
   - Course enrollment and clash detection
   - Academic tracking and notifications
   - Anonymous feedback system

### Key Components

#### Dashboard Layout (`src/components/dashboard-layout.tsx`)
- Responsive sidebar with role-based navigation
- Mobile-first design with collapsible sidebar
- Theme toggle and user settings
- Smooth scroll effects and rubber band behavior

#### Global Styles (`src/app/globals.css`)
- Tailwind CSS configuration
- Custom component classes
- Responsive design utilities
- Dark/light theme support

## 🔧 Development Workflow

### Git Workflow

#### 1. Create a New Branch
```bash
# Create and switch to new branch
git checkout -b feature/your-feature-name

# Or create branch from specific commit
git checkout -b feature/your-feature-name main
```

#### 2. Make Changes and Commit
```bash
# Check status
git status

# Add files to staging
git add .
# Or add specific files
git add src/components/new-component.tsx

# Commit changes
git commit -m "feat: add new dashboard component"

# Or commit with detailed message
git commit -m "feat: implement user management dashboard

- Add user CRUD operations
- Implement role-based permissions
- Add responsive table component
- Include search and filter functionality"
```

#### 3. Push Changes
```bash
# Push to remote repository
git push origin feature/your-feature-name

# Set upstream for first push
git push -u origin feature/your-feature-name
```

#### 4. Create Pull Request
1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Add description and submit

### Commit Message Convention

Follow conventional commits format:

```bash
# Feature
git commit -m "feat: add user authentication system"

# Bug fix
git commit -m "fix: resolve sidebar navigation issue"

# Documentation
git commit -m "docs: update API documentation"

# Style changes
git commit -m "style: improve button hover effects"

# Refactoring
git commit -m "refactor: optimize dashboard layout component"

# Performance
git commit -m "perf: improve timetable generation algorithm"

# Tests
git commit -m "test: add unit tests for user service"
```

### Branch Naming Convention

```bash
# Features
feature/user-authentication
feature/timetable-optimization
feature/responsive-dashboard

# Bug fixes
bugfix/sidebar-mobile-issue
bugfix/api-error-handling

# Hotfixes
hotfix/critical-security-patch

# Documentation
docs/api-documentation
docs/setup-instructions
```

## 🌐 API Endpoints

### Django API (Port 8000)
- `POST /api/v1/auth/login/` - User authentication
- `GET /api/v1/auth/profile/` - User profile
- `GET /api/v1/users/` - User management
- `GET /api/v1/courses/` - Course management
- `GET /api/v1/classrooms/` - Classroom management
- `GET /api/v1/timetables/` - Timetable management

### FastAPI AI Service (Port 8001)
- `POST /api/v1/optimize` - Timetable optimization
- `GET /api/v1/status` - Service status
- `GET /health` - Health check

## 🚀 Deployment

### Production Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_AI_SERVICE_URL=https://your-ai-service-domain.com
```

#### Django (.env)
```env
SECRET_KEY=your-secret-key
DEBUG=False
DB_HOST=your-db-host
DB_NAME=sih28
DB_USER=your-db-user
DB_PASSWORD=your-db-password
ALLOWED_HOSTS=your-domain.com
```

#### FastAPI (.env)
```env
DEBUG=False
API_KEY=your-api-key
DATABASE_URL=postgresql://user:password@host:port/database
```

### Deployment Options

1. **Frontend**: Deploy to Vercel, Netlify, or AWS Amplify
2. **Backend**: Deploy to Render, Railway, or AWS EC2
3. **Database**: Use managed PostgreSQL (Supabase, Neon, or AWS RDS)

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests
cd backend/django
python manage.py test

cd backend/fastapi
pytest
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Style Guidelines

- **Frontend**: Follow ESLint and Prettier configurations
- **Backend**: Follow PEP 8 for Python code
- **Commits**: Use conventional commit messages
- **Documentation**: Update README for significant changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Frontend Developer**: Next.js, React, Tailwind CSS
- **Backend Developer**: Django, FastAPI, PostgreSQL
- **AI/ML Engineer**: OR-Tools, Optimization Algorithms
- **UI/UX Designer**: Responsive Design, User Experience
