# Smart Classroom and Timetable Scheduler - Project Structure

## Overview
A full-stack application for automated timetable generation with AI optimization, featuring Django (REST API), FastAPI (AI Engine), and Next.js (Frontend).

---

## Backend Structure

### 1. Django Backend (`backend/django/`)
**Purpose**: REST API, Database Management, Authentication, Business Logic

#### 1.1 Academics App (`academics/`)
Core academic data management and timetable operations.

##### Models (`models/`)
- **`base.py`**: Base models with common fields (timestamps, soft delete)
- **`user.py`**: Custom user model with roles (ADMIN, FACULTY, STUDENT, STAFF)
- **`academic_structure.py`**: School, Department, Program, Batch models
- **`course.py`**: Course, CourseOffering, CourseAllocation models
- **`faculty.py`**: Faculty profile, preferences, availability
- **`student.py`**: Student profile, enrollment, batch assignments
- **`room.py`**: Building, Room, RoomType, capacity management
- **`timetable.py`**: Timetable, TimetableSlot, GenerationJob models

##### Views (`views/`)
- **`auth_views.py`**: Login, logout, token refresh, user registration
- **`user_viewset.py`**: User CRUD, profile management, role-based filtering
- **`academic_viewsets.py`**: School, Department, Program, Batch CRUD
- **`course_viewset.py`**: Course management, offerings, allocations
- **`faculty_viewset.py`**: Faculty CRUD, preferences, availability
- **`student_viewset.py`**: Student CRUD, enrollment, batch management
- **`room_viewsets.py`**: Building, Room CRUD, availability checks
- **`timetable_viewsets.py`**: Timetable CRUD, slot management, filtering
- **`dashboard_views.py`**: Dashboard statistics, analytics, summaries

##### Core Files
- **`timetable_config_models.py`**: TimetableConfiguration model (settings for generation)
- **`timetable_config_serializers.py`**: Configuration serializers
- **`timetable_config_views.py`**: Configuration CRUD, last-used config retrieval
- **`generation_views.py`**: Timetable generation trigger, job status tracking
- **`workflow_views.py`**: Multi-step generation workflow management
- **`conflict_views.py`**: Conflict detection and resolution APIs
- **`conflict_service.py`**: Business logic for conflict checking
- **`timetable_views.py`**: Additional timetable operations
- **`views_optimized.py`**: Performance-optimized view implementations
- **`serializers.py`**: DRF serializers for all models
- **`urls.py`**: URL routing for academics app
- **`celery_tasks.py`**: Async tasks (email, notifications, cleanup)
- **`signals.py`**: Django signals for auto-actions
- **`mixins.py`**: Reusable view mixins
- **`admin.py`**: Django admin customizations

##### Services (`services/`)
- **`department_view_service.py`**: Department-specific data filtering and views

##### Migrations (`migrations/`)
- Database schema migrations with version control

#### 1.2 Core App (`core/`)
System-wide utilities and middleware.

- **`authentication.py`**: JWT authentication, token validation
- **`permissions.py`**: Custom DRF permissions (IsAdmin, IsFaculty, etc.)
- **`rbac.py`**: Role-Based Access Control logic
- **`middleware.py`**: Request/response middleware (logging, CORS)
- **`csrf_middleware.py`**: CSRF protection for API
- **`audit_logging.py`**: User action audit trails
- **`cache_service.py`**: Redis caching utilities
- **`storage.py`**: File storage configuration
- **`health_checks.py`**: Health check endpoints
- **`hardware_detector.py`**: System hardware detection
- **`views.py`**: Core utility views

#### 1.3 ERP Config (`erp/`)
Django project configuration.

- **`settings.py`**: Django settings (DB, middleware, apps, CORS)
- **`urls.py`**: Root URL configuration
- **`wsgi.py`**: WSGI application entry point
- **`asgi.py`**: ASGI application for async support
- **`celery.py`**: Celery configuration
- **`celery_settings.py`**: Celery task settings
- **`security.py`**: Security configurations (HTTPS, headers)

#### 1.4 Root Files
- **`manage.py`**: Django management commands
- **`requirements.txt`**: Python dependencies

---

### 2. FastAPI Backend (`backend/fastapi/`)
**Purpose**: AI-powered timetable generation engine

#### 2.1 API Layer (`api/`)
- **`deps.py`**: Dependency injection (auth, DB connections)
- **`routers/`**: API route handlers
  - Generation endpoints
  - Status tracking
  - Optimization controls
- **`middleware/`**: Request middleware (auth, logging, rate limiting)

#### 2.2 Core (`core/`)
- **`lifespan.py`**: Application startup/shutdown lifecycle
- **`logging_config.py`**: Structured logging configuration
- **`memory_monitor.py`**: Memory usage tracking
- **`cancellation.py`**: Job cancellation management
- **`services/`**: Business logic services
- **`patterns/`**: Design patterns (Factory, Strategy, Observer)

#### 2.3 Engine (`engine/`)
AI optimization algorithms.

##### Subdirectories:
- **`cpsat/`**: Google OR-Tools CP-SAT solver implementation
- **`ga/`**: Genetic Algorithm implementation
- **`rl/`**: Reinforcement Learning (experimental)
- **`hardware/`**: Hardware detection and optimization
- **`context/`**: Execution context management

##### Core Files:
- **`adaptive_executor.py`**: Adaptive algorithm selection
- **`stage1_clustering.py`**: Pre-processing clustering
- **`rate_limiter.py`**: Request rate limiting

#### 2.4 Models (`models/`)
- **`request_models.py`**: API request schemas (Pydantic)
- **`response_models.py`**: API response schemas
- **`timetable_models.py`**: Timetable data structures

#### 2.5 Utils (`utils/`)
- **`django_client.py`**: Django API client for data fetching
- **`cache_manager.py`**: Caching utilities
- **`metrics.py`**: Performance metrics tracking
- **`progress_tracker.py`**: Real-time progress updates

#### 2.6 Tests (`tests/`)
- **`conftest.py`**: Pytest fixtures
- **`test_utils.py`**: Testing utilities
- **`api/`**: API endpoint tests
- **`core/`**: Core logic tests
- **`utils/`**: Utility function tests

#### 2.7 Root Files
- **`main.py`**: FastAPI application entry point
- **`config.py`**: Configuration management
- **`pytest.ini`**: Pytest configuration

---

## Frontend Structure

### 3. Next.js Frontend (`frontend/`)
**Purpose**: User interface for all roles

#### 3.1 App Directory (`src/app/`)
Next.js 14 App Router structure.

##### 3.1.1 Auth (`(auth)/`)
- **`login/page.tsx`**: Login page with role-based redirect

##### 3.1.2 Admin (`admin/`)
Admin dashboard and management.

**Layout**: `layout.tsx` - Admin sidebar, navigation

**Pages**:
- **`dashboard/page.tsx`**: Admin dashboard with statistics
  - Components: StatsCards, Charts, RecentActivity
- **`admins/page.tsx`**: Admin/Staff user management
  - Components: AddEditUserModal, UserTable, Filters
- **`faculty/page.tsx`**: Faculty management
  - Components: AddEditFacultyModal, FacultyTable
- **`students/page.tsx`**: Student management
  - Components: AddEditStudentModal, StudentTable, BulkUpload
- **`academic/`**: Academic structure management
  - **`schools/page.tsx`**: School CRUD
  - **`departments/page.tsx`**: Department CRUD
  - **`programs/page.tsx`**: Program CRUD
  - **`batches/page.tsx`**: Batch CRUD
  - **`courses/page.tsx`**: Course CRUD
  - **`buildings/page.tsx`**: Building CRUD
  - **`rooms/page.tsx`**: Room CRUD
  - **`layout.tsx`**: Academic section navigation
- **`timetables/`**: Timetable management
  - **`page.tsx`**: Timetable list view
  - **`new/page.tsx`**: New timetable generation wizard
  - **`[timetableId]/page.tsx`**: Timetable detail view
  - **`compare/page.tsx`**: Compare multiple timetables
  - **`status/page.tsx`**: Generation job status tracking
- **`approvals/page.tsx`**: Approval workflow management
- **`logs/page.tsx`**: System audit logs

##### 3.1.3 Faculty (`faculty/`)
Faculty portal.

**Layout**: `layout.tsx` - Faculty navigation

**Pages**:
- **`dashboard/page.tsx`**: Faculty dashboard
- **`schedule/page.tsx`**: Personal schedule view
- **`preferences/page.tsx`**: Teaching preferences, availability

##### 3.1.4 Student (`student/`)
Student portal.

**Layout**: `layout.tsx` - Student navigation

**Pages**:
- **`dashboard/page.tsx`**: Student dashboard
- **`timetable/page.tsx`**: Personal timetable view

##### 3.1.5 Root Files
- **`page.tsx`**: Landing/home page
- **`layout.tsx`**: Root layout (theme, auth provider)
- **`globals.css`**: Global styles, Tailwind imports
- **`unauthorized/page.tsx`**: Access denied page

#### 3.2 Components (`src/components/`)
Reusable UI components.

##### Layout Components (`layout/`)
- Sidebar, Header, Footer, Navigation

##### Shared Components (`shared/`)
- DataTable, SearchBar, FilterPanel, ExportButton

##### UI Components (`ui/`)
- Button, Input, Select, Modal, Card, Badge, Spinner

##### Root Components:
- **`dashboard-layout.tsx`**: Dashboard wrapper component
- **`ErrorBoundary.tsx`**: Error handling wrapper
- **`FormFields.tsx`**: Reusable form field components
- **`LoadingSkeletons.tsx`**: Loading state skeletons
- **`OptimizedTimetableList.tsx`**: Virtualized timetable list
- **`Pagination.tsx`**: Pagination component
- **`profile-settings.tsx`**: User profile settings modal
- **`theme-provider.tsx`**: Dark/light theme provider
- **`Toast.tsx`**: Toast notification system

##### Modals (`modals/`)
- AddEditUserModal, ConfirmDialog, etc.

#### 3.3 Context (`src/context/`)
- **`AuthContext.tsx`**: Authentication state management (user, token, role)

#### 3.4 Hooks (`src/hooks/`)
- **`usePaginatedData.ts`**: Pagination logic hook
- **`useProgress.ts`**: Real-time progress tracking hook

#### 3.5 Lib (`src/lib/`)
Utility libraries.

- **`api.ts`**: Main API client (axios wrapper)
- **`api/`**: API endpoint functions organized by resource
- **`auth.ts`**: Auth utilities (token storage, validation)
- **`utils.ts`**: General utilities (date formatting, etc.)
- **`validations.ts`**: Form validation schemas (Zod)
- **`exportUtils.ts`**: Export to PDF/Excel utilities

#### 3.6 Types (`src/types/`)
TypeScript type definitions.

- **`index.ts`**: Common types (User, Role, etc.)
- **`timetable.ts`**: Timetable-specific types
- **`css.d.ts`**: CSS module type declarations

#### 3.7 Config Files
- **`next.config.mjs`**: Next.js configuration
- **`tailwind.config.ts`**: Tailwind CSS configuration
- **`tsconfig.json`**: TypeScript configuration
- **`postcss.config.js`**: PostCSS configuration
- **`package.json`**: Dependencies and scripts
- **`.prettierrc`**: Code formatting rules
- **`.env`**: Environment variables

---

## Key Workflows

### 1. Authentication Flow
1. User logs in via `frontend/src/app/(auth)/login/page.tsx`
2. Request sent to `backend/django/academics/views/auth_views.py`
3. JWT token generated and stored in `AuthContext`
4. Role-based redirect to appropriate dashboard

### 2. Timetable Generation Flow
1. Admin configures settings in `frontend/src/app/admin/timetables/new/page.tsx`
2. Config saved via `backend/django/academics/timetable_config_views.py`
3. Generation triggered via `backend/django/academics/generation_views.py`
4. Django sends request to FastAPI `backend/fastapi/main.py`
5. FastAPI engine processes using algorithms in `backend/fastapi/engine/`
6. Progress tracked via `backend/fastapi/utils/progress_tracker.py`
7. Results saved to Django DB
8. Frontend polls status via `frontend/src/app/admin/timetables/status/page.tsx`

### 3. Data Management Flow
1. Admin manages data via `frontend/src/app/admin/academic/` pages
2. CRUD operations via `backend/django/academics/views/` viewsets
3. Data validated by serializers in `backend/django/academics/serializers.py`
4. Stored in models defined in `backend/django/academics/models/`

---

## Technology Stack

### Backend
- **Django 4.2+**: REST API, ORM, Admin
- **Django REST Framework**: API serialization, viewsets
- **FastAPI**: High-performance AI engine
- **PostgreSQL**: Primary database
- **Redis**: Caching, session storage
- **Celery**: Async task queue
- **OR-Tools**: Constraint programming solver
- **JWT**: Authentication tokens

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Axios**: HTTP client
- **Zod**: Schema validation
- **React Context**: State management

### DevOps
- **Docker**: Containerization
- **Nginx**: Reverse proxy
- **Git**: Version control

---

## Environment Variables

### Backend Django (`.env`)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
FASTAPI_URL=http://localhost:8001
```

### Backend FastAPI (`.env`)
```
DJANGO_API_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379/1
LOG_LEVEL=INFO
```

### Frontend (`.env`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001
```

---

## API Endpoints Summary

### Django REST API (`http://localhost:8000/api/`)
- `/auth/login/` - Login
- `/auth/logout/` - Logout
- `/users/` - User management
- `/schools/` - School CRUD
- `/departments/` - Department CRUD
- `/programs/` - Program CRUD
- `/batches/` - Batch CRUD
- `/courses/` - Course CRUD
- `/faculty/` - Faculty CRUD
- `/students/` - Student CRUD
- `/buildings/` - Building CRUD
- `/rooms/` - Room CRUD
- `/timetables/` - Timetable CRUD
- `/timetable-configs/` - Configuration CRUD
- `/generation/trigger/` - Start generation
- `/generation/status/{job_id}/` - Check status
- `/conflicts/detect/` - Detect conflicts
- `/dashboard/stats/` - Dashboard statistics

### FastAPI Engine (`http://localhost:8001/`)
- `/generate/` - Generate timetable
- `/status/{job_id}/` - Job status
- `/cancel/{job_id}/` - Cancel job
- `/health/` - Health check

---

## Database Schema Overview

### Core Tables
- `users` - User accounts with roles
- `schools` - Academic schools
- `departments` - Departments under schools
- `programs` - Academic programs
- `batches` - Student batches
- `courses` - Course catalog
- `course_offerings` - Courses offered per semester
- `course_allocations` - Faculty-course assignments
- `faculty_profiles` - Faculty details
- `student_profiles` - Student details
- `buildings` - Campus buildings
- `rooms` - Classrooms with capacity
- `timetables` - Generated timetables
- `timetable_slots` - Individual time slots
- `timetable_configurations` - Generation settings
- `generation_jobs` - Job tracking

---

## Development Commands

### Backend Django
```bash
cd backend/django
python manage.py runserver          # Start server
python manage.py makemigrations     # Create migrations
python manage.py migrate            # Apply migrations
python manage.py createsuperuser    # Create admin
python manage.py test               # Run tests
```

### Backend FastAPI
```bash
cd backend/fastapi
uvicorn main:app --reload           # Start server
pytest                              # Run tests
```

### Frontend
```bash
cd frontend
npm install                         # Install dependencies
npm run dev                         # Start dev server
npm run build                       # Production build
npm run lint                        # Lint code
```

---

## File Naming Conventions

### Backend
- Models: `snake_case.py` (e.g., `academic_structure.py`)
- Views: `*_views.py` or `*_viewset.py`
- Serializers: `*_serializers.py`
- Services: `*_service.py`
- Tests: `test_*.py`

### Frontend
- Pages: `page.tsx` (Next.js convention)
- Components: `PascalCase.tsx` (e.g., `UserTable.tsx`)
- Hooks: `use*.ts` (e.g., `usePaginatedData.ts`)
- Utils: `camelCase.ts` (e.g., `exportUtils.ts`)
- Types: `*.d.ts` or `*.ts`

---

## Key Features by File

### Admin Dashboard (`frontend/src/app/admin/dashboard/page.tsx`)
- Total users, courses, timetables count
- Recent activity feed
- Quick action buttons
- System health status

### Timetable Generation (`frontend/src/app/admin/timetables/new/page.tsx`)
- Multi-step wizard (Config → Review → Generate)
- Real-time validation
- Department selection
- Constraint configuration
- Algorithm selection

### Faculty Management (`frontend/src/app/admin/faculty/page.tsx`)
- CRUD operations
- Bulk import from CSV
- Availability management
- Course allocation
- Search and filters

### Student Management (`frontend/src/app/admin/students/page.tsx`)
- CRUD operations
- Batch assignment
- Enrollment management
- Bulk import
- Export to Excel

### Conflict Detection (`backend/django/academics/conflict_service.py`)
- Faculty double-booking
- Room conflicts
- Student batch conflicts
- Capacity violations
- Time constraint violations

### AI Engine (`backend/fastapi/engine/`)
- CP-SAT solver for optimal solutions
- Genetic algorithm for large datasets
- Adaptive algorithm selection
- Hardware-aware optimization
- Real-time progress tracking

---

This structure provides a complete overview of the project architecture, making it easy for AI assistants to understand the codebase and provide accurate assistance.
