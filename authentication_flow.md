# Authentication & Authorization Architecture

*Complete flow -- every section includes the actual code from the codebase.*

---

## Technology Stack

| Layer | Technology | Config Location |
|-------|-----------|----------------|
| JWT tokens | `djangorestframework-simplejwt` | `erp/settings.py -> SIMPLE_JWT` |
| Token transport | HttpOnly cookies (primary) + `Authorization: Bearer` (fallback) | `core/authentication.py` |
| Password hashing | Django PBKDF2-SHA256 (built into `AbstractUser`) | `erp/settings.py -> AUTH_PASSWORD_VALIDATORS` |
| CORS | `django-cors-headers` | `erp/settings.py -> CORS_*` |
| CSRF bypass for API | Custom `APICSRFExemptMiddleware` | `core/csrf_middleware.py` |
| User model | `academics.User` (UUID PK, org FK, role field) | `academics/models/user.py` |
| Frontend auth state | React Context + `localStorage` (non-sensitive UI data only) | `frontend/src/context/AuthContext.tsx` |
| Frontend API client | Fetch wrapper with `credentials: 'include'` + auto-refresh | `frontend/src/lib/api.ts` |
| Audit trail | `AuditLog` model + middleware | `core/audit_logging.py` |

---

## Token Lifetimes (settings.py)

```python
# backend/django/erp/settings.py

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(hours=1),   # 1 hour -- short window limits damage
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),    # 7 days -- Google standard with rotation

    "ROTATE_REFRESH_TOKENS":    True,   # Each /auth/refresh/ issues a NEW refresh token
    "BLACKLIST_AFTER_ROTATION": True,   # Old refresh token is blacklisted immediately
    "UPDATE_LAST_LOGIN":        True,

    "ALGORITHM":   "HS256",
    "SIGNING_KEY": SECRET_KEY,          # Django SECRET_KEY signs all JWTs

    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",         # Claim embedded in the JWT payload
    "JTI_CLAIM":     "jti",             # JWT ID -- used by blacklist table
}
```

Cookie flags applied to both tokens at login:

| Token | Cookie name | `max_age` | `HttpOnly` | `SameSite` | `Secure` |
|-------|------------|-----------|-----------|-----------|---------|
| Access | `access_token` | 3600 s | Yes | `Lax` | prod only |
| Refresh | `refresh_token` | 604800 s | Yes | `Lax` | prod only |

---

## API Endpoints

| Method | URL | View | Permission |
|--------|-----|------|-----------|
| `POST` | `/api/auth/login/` | `login_view` | `AllowAny` |
| `POST` | `/api/auth/logout/` | `logout_view` | `IsAuthenticated` |
| `POST` | `/api/auth/refresh/` | `refresh_token_view` | `AllowAny` (reads cookie) |
| `GET` | `/api/auth/me/` | `current_user_view` | `IsAuthenticated` |

---

## DRF Authentication + Permission Configuration

```python
# backend/django/erp/settings.py

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "core.authentication.JWTCookieAuthentication",          # 1st: read access_token cookie
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # 2nd: Authorization header
        "rest_framework.authentication.SessionAuthentication",  # 3rd: Django session
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",  # All views require auth by default
    ],
    "DEFAULT_THROTTLE_CLASSES": [] if DEBUG else [
        "rest_framework.throttling.AnonRateThrottle",  # 1000/hour unauthenticated
        "rest_framework.throttling.UserRateThrottle",  # 10000/hour authenticated
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "1000/hour",
        "user": "10000/hour",
    },
}
```

---

## Step 1 -- Login

### Backend: `login_view` (academics/views/auth_views.py)

```python
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    # Attempt 1: authenticate by username
    user = authenticate(username=username, password=password)

    # Attempt 2: if username looks like email, look up the real username first
    if user is None and "@" in username:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass

    if user is None:
        return Response({"error": "Invalid username/email or password"}, status=401)

    if not user.is_active:
        return Response({"error": "User account is disabled"}, status=403)

    # Generate JWT pair -- tokens NEVER sent in response body
    refresh = RefreshToken.for_user(user)
    access_token  = str(refresh.access_token)
    refresh_token = str(refresh)

    response = Response({
        "message": "Login successful",
        "user": {
            "id": str(user.id), "username": user.username,
            "email": user.email, "role": user.role,
            "organization": user.organization.org_name if user.organization else None,
        }
    }, status=200)

    # Set access_token as HttpOnly cookie
    response.set_cookie(
        key=getattr(settings, "JWT_AUTH_COOKIE", "access_token"),
        value=access_token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),  # 3600
        secure=getattr(settings, "JWT_AUTH_SECURE", not settings.DEBUG),
        httponly=getattr(settings, "JWT_AUTH_HTTPONLY", True),   # JS cannot read this
        samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
        path="/",
    )

    # Set refresh_token as HttpOnly cookie
    response.set_cookie(
        key=getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"),
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),  # 604800
        secure=getattr(settings, "JWT_AUTH_SECURE", not settings.DEBUG),
        httponly=getattr(settings, "JWT_AUTH_HTTPONLY", True),
        samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
        path="/",
    )

    return response
```

### Frontend: `AuthContext.login()` (frontend/src/context/AuthContext.tsx)

```tsx
const login = async (username: string, password: string) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiClient.login({ username, password })

      if (response.error || !response.data) {
        setError(response.error || 'Login failed')
        throw new Error(response.error || 'Invalid credentials')
      }

      // JWT tokens are set in HttpOnly cookies by backend -- NEVER in frontend JS
      // We only store non-sensitive user data for UI rendering
      const userData = response.data.user
      const userWithoutPassword = {
        id: userData.id, username: userData.username,
        email: userData.email, role: userData.role,
        organization: userData.organization,
      }

      setUser(userWithoutPassword)
      localStorage.setItem('user', JSON.stringify(userWithoutPassword))  // No tokens here
    } catch (err) {
      setIsLoading(false)
      throw err
    }
}
```

**Why HttpOnly?** `HttpOnly` cookies are invisible to JavaScript. Even if an attacker injects
a script via XSS, `document.cookie` will NOT return the JWT. Tokens stored in
`localStorage` or `sessionStorage` are fully readable by any JS on the page.

---

## Step 2 -- Every Authenticated Request

### Frontend API client: `credentials: 'include'` (frontend/src/lib/api.ts)

```typescript
class ApiClient {
  async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',   // CRITICAL: tells browser to attach HttpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        // NO Authorization header -- tokens travel in cookies automatically
        ...options?.headers,
      },
    });

    // Auto-refresh on 401 (except for login/refresh endpoints themselves)
    if (response.status === 401
        && !endpoint.includes('/auth/login')
        && !endpoint.includes('/auth/refresh')) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        return this.request<T>(endpoint, options)  // Retry original request
      }
      // Refresh failed -- redirect to sign-in
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin'
      }
    }

    const data = await response.json()
    return {
      data: response.ok ? data : undefined,
      error: !response.ok ? data.detail || data.error || 'Request failed' : undefined,
      status: response.status,
    }
  }

  // Token refresh: only sends the refresh_token cookie -- no body needed
  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',  // sends refresh_token cookie
      })
      return response.ok
    } catch {
      return false
    }
  }

  login(credentials)  { return this.request('/auth/login/', {method:'POST', body: JSON.stringify(credentials)}) }
  logout()            { return this.request('/auth/logout/', {method:'POST'}) }
  getCurrentUser()    { return this.request('/auth/me/') }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api')
```

**NOTE -- `useRouter` bug:** The original 401 handler in `api.ts` called `useRouter()` inside
the class method. `useRouter` is a React hook and cannot be used outside a component. The
code above uses `window.location.href` as the correct fix. Silent refresh works fine; only
the redirect was broken in the original.

### Backend middleware stack (erp/settings.py)

```python
MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",        # 1. CORS headers / Origin validated
    "django.middleware.common.CommonMiddleware",
    "core.csrf_middleware.APICSRFExemptMiddleware", # 2. /api/* marked CSRF-exempt
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "core.middleware.RequestResponseLoggingMiddleware",  # 3. Log + mask sensitive fields
]
```

### Backend: `JWTCookieAuthentication` (core/authentication.py)

```python
class JWTCookieAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # 1. Try HttpOnly cookie first
        raw_token = request.COOKIES.get(
            getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
        )

        # 2. Fallback to Authorization: Bearer header (Postman / API clients)
        if raw_token is None:
            header = self.get_header(request)
            if header is None:
                return None
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, AuthenticationFailed):
            return None

    def get_validated_token(self, raw_token):
        # Cookie delivers str; Authorization header delivers bytes -- normalise both
        if isinstance(raw_token, bytes):
            raw_token = raw_token.decode('utf-8')
        return super().get_validated_token(raw_token)
        # Checks: HS256 signature, exp claim, token_type == "access",
        #         jti NOT in outstanding_tokens blacklist table
```

---

## Step 3 -- App Reload: Staying Logged In

### Frontend: `AuthContext useEffect` (frontend/src/context/AuthContext.tsx)

```tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)   // true while checkAuth() runs on mount

  useEffect(() => {
    // On every page load: silently verify the cookie is still valid
    const checkAuth = async () => {
      try {
        const response = await apiClient.getCurrentUser()  // GET /api/auth/me/
        if (response.data) {
          setUser(response.data)     // Cookie valid -- user stays logged in
        }
      } catch {
        setUser(null)                // Cookie expired/missing -- show login page
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])
  // isLoading = true while checkAuth() runs -- prevents flash of login page
  // isLoading = false, user non-null  -- render app
  // isLoading = false, user null      -- render login page
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### Session persistence settings (erp/settings.py)

```python
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Session survives browser restart
SESSION_SAVE_EVERY_REQUEST      = True   # Session TTL resets on every request
SESSION_COOKIE_AGE              = 1209600  # 14 days max session life

# As long as the refresh_token cookie (7-day max_age) is alive,
# /api/auth/me/ will succeed and the user stays logged in.
```

---

## Step 4 -- Access Token Refresh (Silent)

```python
# backend/django/academics/views/auth_views.py

@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token_view(request):
    refresh_token_str = request.COOKIES.get(
        getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token")
    )

    if not refresh_token_str:
        return Response({"error": "Refresh token not found. Please login again."}, status=401)

    try:
        refresh_token = RefreshToken(refresh_token_str)
        # ROTATE_REFRESH_TOKENS = True -- calling .access_token rotates the pair:
        # old token is blacklisted, new refresh token issued
        new_access_token  = str(refresh_token.access_token)
        new_refresh_token = str(refresh_token)

        response = Response({"message": "Token refreshed successfully"}, status=200)

        response.set_cookie(
            key="access_token", value=new_access_token,
            max_age=3600, httponly=True, samesite="Lax",
            secure=not settings.DEBUG, path="/",
        )

        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
            response.set_cookie(
                key="refresh_token", value=new_refresh_token,
                max_age=604800, httponly=True, samesite="Lax",
                secure=not settings.DEBUG, path="/",
            )

        return response

    except (TokenError, InvalidToken):
        return Response({"error": "Invalid or expired refresh token."}, status=401)
```

**Token rotation protection:** If an attacker steals a refresh token and uses it, the original
is blacklisted. When the real user next calls `/auth/refresh/`, both their copy and the
attacker's copy are dead.

---

## Step 5 -- Logout

```python
# backend/django/academics/views/auth_views.py

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.COOKIES.get(
            getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token")
        )

        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()  # Writes to outstanding_tokens + blacklisted_tokens tables

        response = Response({"message": "Successfully logged out"}, status=200)
        response.delete_cookie(key="access_token",  path="/", samesite="Lax")
        response.delete_cookie(key="refresh_token", path="/", samesite="Lax")
        return response

    except TokenError:
        response = Response({"message": "Logged out (token already invalid)"}, status=200)
        response.delete_cookie("access_token",  path="/")
        response.delete_cookie("refresh_token", path="/")
        return response
```

```tsx
// frontend/src/context/AuthContext.tsx

const logout = async () => {
    try {
      await apiClient.logout()   // POST /api/auth/logout/ -- blacklists refresh token
    } catch {
      // Logout anyway even if backend call fails
    } finally {
      setUser(null)
      localStorage.removeItem('user')
      // Cookies deleted by backend Set-Cookie: Max-Age=0
    }
}
```

---

## User Model (academics/models/user.py)

```python
class User(AbstractUser):
    ROLE_CHOICES = [
        ("super_admin",  "Super Admin (Platform)"),
        ("org_admin",    "Organization Admin"),
        ("dean",         "Dean"),
        ("hod",          "Head of Department"),
        ("faculty",      "Faculty"),
        ("student",      "Student"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     null=True, db_column='org_id')
    role         = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    is_active    = models.BooleanField(default=True)

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["organization", "role", "is_active"], name="user_org_role_idx"),
            models.Index(fields=["username"], name="user_username_idx"),
            models.Index(fields=["email"],    name="user_email_idx"),
        ]
```

Multi-tenancy: every queryset that filters data uses `request.user.organization_id`
so users from org A cannot see org B's timetables.

---

## Authorization -- Permission Classes

### core/permissions.py -- General purpose

```python
class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and request.user.role == "admin")

class IsFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and request.user.role in ["admin", "faculty"])

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        for attr in ("created_by", "user", "owner"):
            if hasattr(obj, attr):
                return getattr(obj, attr) == request.user
        return False

class DepartmentBasedPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        if request.user.role == "faculty":
            dept = getattr(obj, 'department', None) or getattr(obj, 'department_id', None)
            return str(dept) == str(request.user.department) if dept else False
        return False
```

### core/rbac.py -- Timetable domain

```python
class Role:
    REGISTRAR   = "registrar"
    DEPT_HEAD   = "dept_head"
    COORDINATOR = "coordinator"

class CanManageTimetable(permissions.BasePermission):
    """Registrar + Dept Head can generate and edit timetables"""
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and request.user.role in [Role.REGISTRAR, Role.DEPT_HEAD])

class CanApproveTimetable(permissions.BasePermission):
    """Only Registrar can approve"""
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and request.user.role == Role.REGISTRAR)

class DepartmentAccessPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user.role == Role.REGISTRAR:
            return True   # Registrar sees all departments
        department_id = request.query_params.get('department_id') or request.data.get('department_id')
        if not department_id:
            return False
        return has_department_access(request.user, department_id)
```

### Permission matrix (core/rbac.py)

```python
PERMISSION_MATRIX = {
    'generate_timetable':        [Role.REGISTRAR],
    'approve_timetable':         [Role.REGISTRAR],
    'view_timetable':            [Role.REGISTRAR, Role.DEPT_HEAD, Role.COORDINATOR],
    'edit_timetable':            [Role.REGISTRAR, Role.DEPT_HEAD],
    'view_department_timetable': [Role.REGISTRAR, Role.DEPT_HEAD, Role.COORDINATOR],
    'manage_faculty':            [Role.REGISTRAR, Role.DEPT_HEAD],
    'manage_courses':            [Role.REGISTRAR, Role.DEPT_HEAD],
    'manage_rooms':              [Role.REGISTRAR],
    'view_conflicts':            [Role.REGISTRAR, Role.DEPT_HEAD, Role.COORDINATOR],
    'resolve_conflicts':         [Role.REGISTRAR, Role.DEPT_HEAD],
}
```

### `@require_role` decorator (core/rbac.py)

```python
def require_role(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            if request.user.role not in roles:
                return JsonResponse({'error': 'Insufficient permissions'}, status=403)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage:
@require_role(Role.REGISTRAR, Role.DEPT_HEAD)
def my_view(request):
    ...
```

---

## SSE Stream Auth Guard (progress_endpoints.py)

`stream_progress()` is a plain Django view -- DRF permission classes do not run on it.
Explicit guards added before the generator starts:

```python
@csrf_exempt
@require_http_methods(["GET"])
def stream_progress(request, job_id):
    # Guard 1: must be logged in
    if not request.user.is_authenticated:
        return HttpResponse(status=401)

    # Guard 2: job must belong to the user's own organisation (multi-tenant isolation)
    try:
        _job = GenerationJob.objects.only('organization_id').get(id=job_id)
        if str(_job.organization_id) != str(getattr(request.user, 'organization_id', None)):
            return HttpResponse(status=403)
    except GenerationJob.DoesNotExist:
        return HttpResponse(status=404)

    def event_stream():
        ...  # SSE generator
```

---

## CSRF Strategy (core/csrf_middleware.py)

```python
class APICSRFExemptMiddleware(CsrfViewMiddleware):
    """
    Exempts all /api/* routes from Django's CSRF token check.

    Replacement protection:
      1. HttpOnly cookies  -- JS cannot steal the token for a forged request
      2. SameSite=Lax      -- browser refuses to send cookies on cross-site POST
      3. 1-hour expiry     -- damage window is minimal even if a forged request slips through
    """
    def process_request(self, request):
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return super().process_request(request)
```

Django admin (`/admin/`) still requires a CSRF token -- only `/api/*` is exempt.

---

## CORS Configuration (erp/settings.py)

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",        # Next.js dev
    "http://127.0.0.1:3000",
    "https://sih28.onrender.com",   # Production frontend
]

CORS_ALLOW_CREDENTIALS = True  # MUST be True -- without this the browser strips cookies
                                # from all cross-origin requests, breaking all auth

CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization",
    "content-type", "dnt", "origin", "user-agent",
    "x-csrftoken", "x-requested-with",
]
```

---

## Security Properties Summary

| Attack | Mitigation | Code |
|--------|-----------|------|
| XSS stealing tokens | `httponly=True` on both cookies | `auth_views.py -> set_cookie` |
| CSRF forged POST | `SameSite=Lax` + `APICSRFExemptMiddleware` | `csrf_middleware.py` |
| Stolen refresh token | `ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION` | `settings.py -> SIMPLE_JWT` |
| Long-lived token abuse | 1-hour access token expiry | `ACCESS_TOKEN_LIFETIME = timedelta(hours=1)` |
| Cross-tenant data leak | `organization_id` check on SSE + queryset filters | `progress_endpoints.py` |
| Brute force | PBKDF2 password hashing + `PasswordValidator` | `security.py` |
| Credential logging | `mask_sensitive_data()` in logging middleware | `core/middleware.py` |
| Privilege escalation | `role` field from DB; never from JWT claim | `authentication.py -> get_user()` |
| Network eavesdropping | `Secure=True` in production (`not DEBUG`) | `auth_views.py -> set_cookie` |

---

## File Reference

| File | What it does |
|------|-------------|
| `backend/django/academics/views/auth_views.py` | `login_view`, `logout_view`, `refresh_token_view`, `current_user_view` |
| `backend/django/core/authentication.py` | `JWTCookieAuthentication` -- cookie -> header fallback, bytes/str normalisation |
| `backend/django/core/permissions.py` | `IsAdmin`, `IsFaculty`, `IsStudent`, `IsOwnerOrAdmin`, `DepartmentBasedPermission` |
| `backend/django/core/rbac.py` | `IsRegistrar`, `CanManageTimetable`, `CanApproveTimetable`, `PERMISSION_MATRIX`, `@require_role` |
| `backend/django/core/csrf_middleware.py` | `APICSRFExemptMiddleware` -- CSRF exempt for `/api/*` |
| `backend/django/core/middleware.py` | `RequestResponseLoggingMiddleware` -- logs requests, masks `password` field |
| `backend/django/core/audit_logging.py` | `AuditLog` model -- who/what/when/where/IP for every privileged action |
| `backend/django/erp/security.py` | `PasswordValidator` -- uppercase, lowercase, digit, special char rules |
| `backend/django/erp/settings.py` | `SIMPLE_JWT`, `REST_FRAMEWORK`, `SESSION_*`, `CORS_*`, `CSRF_*` |
| `backend/django/academics/models/user.py` | `User` model -- UUID PK, org FK, role field, `users` table |
| `backend/django/academics/progress_endpoints.py` | `stream_progress` -- manual auth + org-ownership guard for SSE |
| `frontend/src/context/AuthContext.tsx` | React auth state -- `login()`, `logout()`, mount hydration via `useEffect` |
| `frontend/src/lib/api.ts` | `ApiClient` -- `credentials: 'include'`, auto-refresh on 401, all API methods |
