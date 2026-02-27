# Frontend Documentation — SIH28 Timetable Optimization Platform
**For UI/UX Developers · Last Updated: February 2026**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Design System & Global Styles](#4-design-system--global-styles)
5. [Tailwind Configuration](#5-tailwind-configuration)
6. [Typography System](#6-typography-system)
7. [Color Palette](#7-color-palette)
8. [Component Inventory](#8-component-inventory)
9. [Layout Components](#9-layout-components)
10. [Page-by-Page Breakdown](#10-page-by-page-breakdown)
11. [Authentication Flow](#11-authentication-flow)
12. [API Client Layer](#12-api-client-layer)
13. [Custom Hooks](#13-custom-hooks)
14. [Types & Interfaces](#14-types--interfaces)
15. [Utility Functions](#15-utility-functions)
16. [Responsive Design Patterns](#16-responsive-design-patterns)
17. [Dark Mode Implementation](#17-dark-mode-implementation)
18. [UI/UX Patterns & Conventions](#18-uiux-patterns--conventions)
19. [Known UX Gaps & Enhancement Opportunities](#19-known-ux-gaps--enhancement-opportunities)

---

## 1. Project Overview

SIH28 is an **AI-powered timetable optimization platform** for educational institutions. The frontend is a Next.js 14 App Router application that serves three user roles:

| Role | Routes | Purpose |
|------|--------|---------|
| **Admin** | `/admin/*` | Manage users, faculty, students, academic structure, timetable generation, approvals, logs |
| **Faculty** | `/faculty/*` | View personal schedule, set teaching preferences, availability |
| **Student** | `/student/*` | View personal timetable, enrolled courses |

The root `/` page immediately redirects to `/login`. Route protection is enforced at every layout via `AuthContext`.

---

## 2. Tech Stack & Dependencies

| Category | Library / Tool | Usage |
|----------|---------------|-------|
| Framework | **Next.js 14** (App Router) | SSR/CSR hybrid, file-based routing |
| UI Styling | **Tailwind CSS** | Utility-first CSS, dark mode via `class` strategy |
| Component Library | **Custom** (no shadcn) | All UI components hand-rolled |
| Forms | **react-hook-form** + **zod** | Validation using `zodResolver` |
| Auth | **HttpOnly Cookies** (JWT) | Cookie-based, no localStorage for tokens |
| State / Context | **React Context API** | `AuthContext`, `ToastContext` |
| Icons | **lucide-react** | For Toast and ErrorBoundary icons |
| HTTP | **Fetch API** (custom wrapper) | `ApiClient` class in `lib/api.ts` |
| Real-time | **EventSource / SSE** | Progress stream for timetable generation |
| Export | **jsPDF**, **html2canvas**, **xlsx**, **file-saver** | PDF/Excel/CSV/ICS export |
| Theme | **next-themes** | Dark/light toggle with system preference |
| Fonts | **Google Fonts** (Inter + Poppins) | Loaded via both `@import` in CSS and `next/font/google` |
| Caching | **sessionStorage** + **in-memory Map** | Stale-while-revalidate pattern |
| Utilities | **clsx** + **tailwind-merge** | `cn()` utility for conditional classes |

---

## 3. Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── layout.tsx            # Root layout — wraps all pages
│   │   ├── page.tsx              # Root page — redirects to /login
│   │   ├── globals.css           # Global styles, CSS custom properties, component classes
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx      # Login page
│   │   ├── admin/
│   │   │   ├── layout.tsx        # Admin auth guard + DashboardLayout wrapper
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── admins/page.tsx
│   │   │   ├── faculty/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/   # AddEditFacultyModal
│   │   │   ├── students/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/   # AddEditStudentModal
│   │   │   ├── academic/
│   │   │   │   ├── page.tsx      # Redirects to /admin/academic/schools
│   │   │   │   ├── layout.tsx    # In-content tab navigation
│   │   │   │   ├── schools/
│   │   │   │   ├── departments/
│   │   │   │   ├── buildings/
│   │   │   │   ├── rooms/
│   │   │   │   ├── courses/
│   │   │   │   └── programs/
│   │   │   ├── timetables/
│   │   │   │   ├── page.tsx      # Timetable list (grid/list view)
│   │   │   │   ├── new/          # New generation form
│   │   │   │   ├── status/       # Generation job status with SSE progress
│   │   │   │   ├── compare/      # Variant comparison
│   │   │   │   └── [timetableId]/ # Timetable detail view
│   │   │   ├── approvals/page.tsx
│   │   │   └── logs/page.tsx
│   │   ├── faculty/
│   │   │   ├── layout.tsx        # Faculty auth guard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── schedule/page.tsx
│   │   │   └── preferences/page.tsx
│   │   ├── student/
│   │   │   ├── layout.tsx        # Student auth guard
│   │   │   ├── dashboard/page.tsx
│   │   │   └── timetable/page.tsx
│   │   └── unauthorized/         # 403 page
│   │
│   ├── components/
│   │   ├── dashboard-layout.tsx  # Primary shell: header + sidebar + content area
│   │   ├── ErrorBoundary.tsx     # React class error boundary
│   │   ├── FormFields.tsx        # FormField, SelectField, TextAreaField components
│   │   ├── LoadingSkeletons.tsx  # Skeleton, TableSkeleton, TimetableCardSkeleton, etc.
│   │   ├── OptimizedTimetableList.tsx
│   │   ├── Pagination.tsx        # Full pagination with keyboard support
│   │   ├── profile-settings.tsx
│   │   ├── theme-provider.tsx    # next-themes wrapper
│   │   ├── Toast.tsx             # ToastProvider + useToast hook
│   │   ├── layout/
│   │   │   ├── Header.tsx        # Simple top bar (used in legacy view)
│   │   │   └── Sidebar.tsx       # Role-aware collapsible sidebar
│   │   ├── modals/
│   │   │   └── SubstitutionModal.tsx
│   │   ├── shared/
│   │   │   ├── DataTable.tsx     # Reusable sortable/searchable/paginated table
│   │   │   ├── ExportButton.tsx  # PDF/Excel/CSV/ICS export dropdown
│   │   │   ├── LoadingComponents.tsx
│   │   │   ├── PageHeader.tsx    # Title + description + action slot
│   │   │   ├── ProfileDropdown.tsx
│   │   │   └── TimetableGrid.tsx # Week-view timetable (mobile card + desktop table)
│   │   └── ui/
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── GoogleSpinner.tsx # Material Design indeterminate spinner
│   │       ├── InContentNav.tsx  # Tab pill navigation bar
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress-bar.tsx
│   │       ├── select.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── textarea.tsx
│   │       └── timetableform.tsx
│   │
│   ├── context/
│   │   └── AuthContext.tsx       # Global auth state: user, login(), logout(), isLoading
│   │
│   ├── hooks/
│   │   ├── usePaginatedData.ts   # Generic paginated fetch hook with debounced search
│   │   └── useProgress.ts        # SSE-based real-time progress hook for generation jobs
│   │
│   ├── lib/
│   │   ├── api.ts                # ApiClient class — all backend endpoints
│   │   ├── auth.ts               # Cookie-based auth helpers (mostly legacy compatibility)
│   │   ├── exportUtils.ts        # PDF, Excel, CSV, ICS export functions
│   │   ├── utils.ts              # cn() utility
│   │   ├── validations.ts        # Zod schemas for all forms
│   │   └── api/
│   │       ├── timetable.ts      # Timetable-specific API functions
│   │       └── optimized-client.ts # In-memory cached API client
│   │
│   └── types/
│       ├── index.ts              # User interface
│       ├── timetable.ts          # All timetable-related TypeScript interfaces
│       └── css.d.ts              # CSS module declarations
│
├── tailwind.config.ts            # Extended theme: colors, fonts, spacing
├── next.config.mjs
├── package.json
└── .env                          # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DJANGO_API_URL, etc.
```

---

## 4. Design System & Global Styles

All global design tokens and reusable CSS component classes live in `src/app/globals.css`. This file is the **single source of truth** for the visual language.

### 4.1 CSS Layer Structure

```css
@tailwind base;      /* Resets + base HTML element styles */
@tailwind components; /* Named component classes (.btn-primary, .card, etc.) */
@tailwind utilities;  /* Atomic utility overrides */
```

### 4.2 Custom Animation: Google Material Spinner

A pixel-accurate Material Design indeterminate progress animation built purely in CSS:

```css
/* Full rotation of the SVG ring — 2s linear */
@keyframes gsp-rotate { 100% { transform: rotate(360deg); } }

/* Arc expand → contract → sweep away */
@keyframes gsp-dash {
  0%   { stroke-dasharray: 1, 200;   stroke-dashoffset: 0;    }
  50%  { stroke-dasharray: 100, 200; stroke-dashoffset: -15;  }
  100% { stroke-dasharray: 100, 200; stroke-dashoffset: -125; }
}

.gsp-rotate { animation: gsp-rotate 2s linear infinite; }
.gsp-arc    { animation: gsp-dash 1.5s cubic-bezier(0.4, 0.0, 0.2, 1) infinite; }
```

Applied by the `GoogleSpinner` component (see §8.9).

---

## 5. Tailwind Configuration

File: `tailwind.config.ts`

### Dark Mode
```ts
darkMode: 'class'  // toggled by adding/removing 'dark' class on <html>
```

### Extended Color Tokens

| Token | Range | Purpose |
|-------|-------|---------|
| `brand.*` | 50–900 | Project accent (sky blue) |
| `primary.*` | 50–900 | Action elements (blue) |
| `success.*` | 50–700 | Confirmations, approved states |
| `warning.*` | 50–700 | Pending, caution states |
| `danger.*` | 50–700 | Errors, destructive actions |
| `neutral.*` | 50–900 | Text, borders, backgrounds |

### Font Families
```ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

### Content Scanning
```ts
content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
           './src/components/**/*.{js,ts,jsx,tsx,mdx}',
           './src/app/**/*.{js,ts,jsx,tsx,mdx}']
```

---

## 6. Typography System

### Fonts Loaded
- **Inter** (300–800 weights) — body, UI text
- **Poppins** (300–800 weights) — headings only

### Heading Scale (responsive)

| Tag | Mobile | Tablet | Desktop |
|-----|--------|--------|---------|
| `h1` | `text-2xl` | `text-3xl` | `text-4xl` |
| `h2` | `text-xl` | `text-2xl` | `text-3xl` |
| `h3` | `text-lg` | `text-xl` | `text-2xl` |
| `h4` | `text-base` | `text-lg` | `text-xl` |
| `h5` | `text-sm` | `text-base` | `text-lg` |
| `h6` | `text-xs` | `text-sm` | `text-base` |

All headings: `font-semibold tracking-tight`, font-family `Poppins → Inter → sans-serif`.

### Body Text
- Default: `Inter`, 16px
- Anti-aliased: `antialiased` applied globally on `<body>`

---

## 7. Color Palette

### Primary Brand Colors (exact hex values used in code)

| Role | Light Mode | Dark Mode | Usage |
|------|-----------|-----------|-------|
| **Primary Blue** | `#2196F3` | `#2196F3` | Buttons, links, focus rings |
| **Primary Dark** | `#1976D2` | — | Button hover |
| **Background** | `#FFFFFF` | `#121212` | Body background |
| **Surface** | `#F5F5F5` | `#1E1E1E` | Cards, panels |
| **Surface Elevated** | — | `#2A2A2A` | Modals, dropdowns on dark |
| **Text Primary** | `#2C2C2C` | `#FFFFFF` | Main headings, body |
| **Text Secondary** | `#606060` | `#AAAAAA` | Descriptions, labels |
| **Text Muted** | `#6B6B6B` | `#B3B3B3` | Placeholder, tertiary |
| **Border** | `#E0E0E0` | `#2A2A2A` | Card/input borders |
| **Border Strong** | — | `#404040` | Input borders on dark |

### Semantic Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| Success / Approved | `#4CAF50` → hover `#388E3C` | Approved timetables, success toasts |
| Warning / Pending | `#FF9800` / `#fbbc05` | Pending approvals, warnings |
| Danger / Error | `#F44336` → hover `#D32F2F` | Errors, rejected, delete |
| Info | `#2196F3` | Info toasts, neutral data |
| Google Blue | `#1a73e8` | Login logo, dashboard stat icons |
| Google Green | `#34a853` | Active courses stat, system health |
| Google Yellow | `#fbbc05` | Pending approvals stat |

---

## 8. Component Inventory

### 8.1 Button Classes (CSS in globals.css)

All buttons use `@layer components` Tailwind classes:

| Class | Color | Use Case |
|-------|-------|----------|
| `.btn-primary` | Blue `#2196F3` | Primary actions (Submit, Save, Generate) |
| `.btn-secondary` | White/Gray border | Secondary actions (Cancel, Back) |
| `.btn-success` | Green `#4CAF50` | Confirm, approve |
| `.btn-danger` | Red `#F44336` | Delete, reject, destructive |
| `.btn-ghost` | Transparent | Pagination controls, subtle actions |

All share: `px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`

### 8.2 Input Classes

| Class | State |
|-------|-------|
| `.input-primary` | Default — blue focus ring |
| `.input-error` | Error state — red border + ring |
| `.input-field` | With disabled support |

Common styles: `w-full px-4 py-3 rounded-lg text-sm border … focus:outline-none focus:ring-2 transition-colors duration-200`

### 8.3 Card Classes

| Class | Description |
|-------|-------------|
| `.card` | Standard card with shadow + hover transition |
| `.card-flat` | No shadow variant |
| `.card-header` | Bottom border divider inside card |
| `.card-title` | `text-xl font-semibold` heading inside card |
| `.card-description` | `text-sm text-secondary` subtitle |

### 8.4 Badge Classes

| Class | Color |
|-------|-------|
| `.badge` | Base — inline-flex, rounded-full, xs font |
| `.badge-success` | Green |
| `.badge-warning` | Yellow/Amber |
| `.badge-danger` | Red |
| `.badge-info` | Blue |

### 8.5 Navigation Classes

| Class | Description |
|-------|-------------|
| `.nav-link` | Sidebar item — muted text, hover highlights |
| `.nav-link-active` | Active page — `#f1f1f1` background dark text |

### 8.6 Header Circle Buttons

| Class | Description |
|-------|-------------|
| `.header-circle-btn` | 40×40 round button — neutral |
| `.header-circle-btn-primary` | 40×40 round button — blue |
| `.header-circle-notification` | Notification bell with red badge support |
| `.header-circle-logo` | 48×48 gradient blue brand mark |
| `.notification-badge` | `-top-1 -right-1` red dot with count |

### 8.7 Table Classes

| Class | Usage |
|-------|-------|
| `.table` | `<table>` — full width |
| `.table-header` | `<thead>` — light gray background |
| `.table-header-cell` | `<th>` — padding + text |
| `.table-row` | `<tr>` — hover effect |
| `.table-cell` | `<td>` — padding + text style |

### 8.8 Form Group Classes

| Class | Usage |
|-------|-------|
| `.form-group` | Wraps label + input |
| `.form-label` | `text-sm font-medium` label |

### 8.9 GoogleSpinner (`components/ui/GoogleSpinner.tsx`)

Material Design indeterminate circular progress indicator. Uses two SVG `<circle>` elements:
- **Track ring** — 15% opacity arc, always visible for visual anchor
- **Animated arc** — uses `.gsp-arc` keyframe (defined in globals.css)

```tsx
// Props
{
  size?: number     // default 48 (px). StrokeWidth scales: size * 0.083, clamped 2.5–4
  className?: string
  color?: string    // default '#4285F4' (Google blue). Pass 'white' for colored buttons
  singleColor?: string  // deprecated alias
}
```

**Where used:** Layout loading screens, inline table/button spinners, `PageLoader`, `Spinner` wrapper in `LoadingSkeletons.tsx`.

---

## 9. Layout Components

### 9.1 DashboardLayout (`components/dashboard-layout.tsx`)

The **primary shell** used by all authenticated pages. This is the component every admin/faculty/student page renders inside.

**Props:**
```ts
{
  children: React.ReactNode
  role: 'admin' | 'faculty' | 'student'
  pageTitle?: string        // Override auto-derived title
  pageDescription?: string
}
```

**State managed:**
| State | Type | Purpose |
|-------|------|---------|
| `sidebarOpen` | `boolean` | Mobile drawer open/close |
| `sidebarCollapsed` | `boolean` | Desktop icon-only collapse |
| `showSignOutDialog` | `boolean` | Blur overlay + confirmation |
| `showSettings` | `boolean` | Settings dropdown |
| `showNotifications` | `boolean` | Notification panel |
| `copiedJobRef` | `boolean` | "Copied" feedback on UUID badge click |

**Page title derivation:** Reads `usePathname()` and auto-generates a human-readable title from the last URL segment. If the last segment is a UUID, it shows the parent segment label and a short `#XXXXXXXX` reference badge that copies the full UUID on click.

**Structure:**
```
<div min-h-screen bg-white dark:bg-#121212>
  <Sidebar />                    (fixed left, z-60)
  <div ml-16 or ml-56>          (slides with collapse)
    <header sticky top-0 z-30>  (page title + notification + settings)
    <main p-4 lg:p-6>           (children render here)
  </div>
</div>

<!-- Sign-out confirmation dialog (portal-like overlay) -->
```

**Blur on modal:** When `showSignOutDialog` is true, the main wrapper gets `blur-sm` applied.

### 9.2 Sidebar (`components/layout/Sidebar.tsx`)

**Props:** `sidebarOpen`, `sidebarCollapsed`, `setSidebarOpen`, `setSidebarCollapsed`, `role`, `setShowSignOutDialog`

**Navigation items by role:**

| Role | Nav Items |
|------|-----------|
| `admin` | Dashboard · Admins · Faculty · Students · Academic · Timetables · Approvals · Logs |
| `faculty` | Dashboard · Schedule · Preferences |
| `student` | Dashboard · Timetable |

**Behavior:**
- **Mobile** (`< md`): Full-width drawer slides in from left, darkness overlay closes it
- **Desktop** (`≥ md`): Persistent sidebar, collapses to icon-only (w-16) on toggle
- Width: `w-56` expanded, `md:w-16` collapsed
- Active route: `pathname === item.href || pathname.startsWith(item.href + '/')` detection
- User info shown at bottom (username + email from `localStorage`)

### 9.3 Header (`components/layout/Header.tsx`)

Simplified header used in the legacy/standalone view. The main shell's header is inline inside `DashboardLayout`.

**Features:**
- Hamburger toggle (≥md: collapses sidebar, <md: opens drawer)
- Brand logo + "SIH28" title
- Notification bell with hardcoded badge count (3)
- Settings dropdown (My Profile / Settings / Sign Out)
- Click-outside detection via `useRef` + `mousedown` event

---

## 10. Page-by-Page Breakdown

### 10.1 Root Page (`app/page.tsx`)
```tsx
// Immediately redirects to /login
redirect('/login')
```
No UI rendered.

---

### 10.2 Login Page (`app/(auth)/login/page.tsx`)

**Route:** `/login`
**Access:** Public (no auth)

**Functionality:**
- `react-hook-form` + `zod` (`loginSchema`) for validation
- Calls `useAuth().login(username, password)`
- On success: reads `localStorage.user.role` and pushes to role-appropriate dashboard
- On failure: shows error toast via `useToast()`
- Password visibility toggle button (inline SVG eye icons)

**UI Structure:**
```
min-h-screen flex items-center justify-center
  .card max-w-sm sm:max-w-md
    Logo (gradient rounded-xl "S" + "SIH28" title)
    "Welcome Back" headline
    "Sign in to your account" subtitle
    <form>
      <FormField name="username" />
      <FormField name="password" type="password" /> + eye toggle
      <button type="submit" .btn-primary w-full>
        (shows GoogleSpinner when loading)
      </button>
    </form>
```

**Styling specifics:**
- Background: `bg-[#f9f9f9] dark:bg-[#212121]`
- Card: `.card` utility class
- Logo: `bg-[#1a73e8]` (Google blue), `rounded-xl`

---

### 10.3 Admin Layout (`app/admin/layout.tsx`)

**Auth guard logic:**
1. While loading → full-screen `GoogleSpinner` on `bg-[#f9f9f9] dark:bg-[#212121]`
2. No user → `router.push('/login')`
3. Wrong role → `router.push('/unauthorized')`
4. Valid admin roles: `admin`, `org_admin`, `super_admin` (case-insensitive)
5. Renders `<DashboardLayout role="admin">{children}</DashboardLayout>`

Same pattern used for `app/faculty/layout.tsx` (role: `faculty`) and `app/student/layout.tsx` (role: `student`).

---

### 10.4 Admin Dashboard (`app/admin/dashboard/page.tsx`)

**Route:** `/admin/dashboard`

**Data fetching:**
- `GET /api/dashboard/stats/` — total users, active courses, pending approvals, system health
- Stale-while-revalidate via `sessionStorage` (TTL: 2 minutes)
- Falls back to zero values on error (never crashes)

**Stats Cards (4-column grid → 2-col tablet → 1-col mobile):**

| Card | Icon BG | Metric | Extra |
|------|---------|--------|-------|
| Total Users | `#1a73e8` blue | `stats.totalUsers` | "↗ 12% vs last month" |
| Active Courses | `#34a853` green | `stats.activeCourses` | "↗ 8% vs last month" |
| Pending Approvals | `#fbbc05` yellow | `stats.pendingApprovals` | Clickable → `/admin/approvals` + `badge-warning` |
| System Health | `#34a853` green | 98% | "All services online" |

**Faculty Availability Section:**
- Grid of faculty toggle cards (1→2→3→4 column responsive grid)
- Each card: faculty name, department, custom CSS toggle switch (peer-checked blue)
- Data from `data.faculty` in dashboard stats response

**Strategic Actions Panel:**
- Routes to: `/admin/users`, `/admin/logs`, `/admin/settings`
- Simulated: `backup` (2s delay), `reports` (1.5s delay) — show info/success toasts

**Data Actions Panel:**
- `import` → simulated CSV import (2s)
- `export` → simulated PDF export (1.5s)
- `backup` → shared simulate function
- `restore` → `window.confirm()` guard → 3s simulation

---

### 10.5 Admin Timetables (`app/admin/timetables/page.tsx`)

**Route:** `/admin/timetables`

**Key State:**
```ts
viewMode: 'grid' | 'list'          // toggle between card grid and list
timetables: TimetableListItem[]    // from /api/generation-jobs/?page=N&page_size=20
loading: boolean
currentPage: number
totalCount: number
runningJobs: RunningJob[]          // derived from timetables (no extra API call)
```

**Caching Pattern:** Seeded from `sessionStorage` ('admin_timetables_cache', 60s TTL) so the page renders data instantly while a background refresh runs.

**Background Polling:** `setInterval` every 8 seconds while active (pending/running) jobs exist. Stops after 2 consecutive polls with no active jobs.

**Prefetch Warmup:** After each load, fetches variants for the 3 most recent completed/failed jobs (fire-and-forget) to warm Redis cache.

**`transformJobs()` function:** Maps raw API response to `TimetableListItem` shape:
```ts
TimetableListItem {
  id: string           // job_id or id
  department: string   // organization_name fallback 'All Departments'
  batch: string | null
  semester: number
  academic_year: string
  status: 'approved' | 'pending' | 'draft' | 'rejected' | 'running' | 'completed' | 'failed'
  lastUpdated: string  // formatted date
  conflicts: number
  score: number | null
}
```

**Status color mapping:**
```
approved  → green (#4CAF50 bg-10%)
pending   → orange (#FF9800 bg-10%)
draft     → gray (#6B6B6B)
rejected  → red (#F44336 bg-10%)
```

**Status icons:** ✅ approved · ⏳ pending · 📝 draft · ❌ rejected · 📄 default

**Grouped view:** `getGroupedBySemester()` (memoized) groups by `academic_year-semester` key.

**Skeleton:** `TimetableListSkeleton` shown only on first load (no stale data).

---

### 10.6 Admin Faculty (`app/admin/faculty/page.tsx`)

**Route:** `/admin/faculty`

**State:**
```ts
faculty: Faculty[]
isLoading: boolean       // first load
isTableLoading: boolean  // pagination only
searchTerm: string       // 500ms debounced
selectedDepartment: string
currentPage, totalPages, totalCount, itemsPerPage: number
isModalOpen: boolean
selectedFaculty: Faculty | null   // null = create, Faculty = edit
isDeleting: number | null         // ID of faculty being deleted
```

**API Calls:**
- `apiClient.getFaculty(page, pageSize, search)` — paginated list
- `apiClient.createFaculty(data)` — POST
- `apiClient.updateFaculty(id, data)` — PUT
- `apiClient.deleteFaculty(id)` — DELETE

**Faculty interface:**
```ts
{
  id: number
  faculty_id: string          // e.g. "FAC001"
  faculty_code: string
  first_name, middle_name?, last_name: string
  designation: string         // Professor, Associate Professor, etc.
  specialization: string
  department: { dept_id, dept_name }
  max_workload: number
  status: string              // active | inactive | on_leave
  email?: string
  phone?: string
}
```

**UI Pattern (mobile/desktop dual view):**
- Mobile: card per faculty with inline edit/delete buttons
- Desktop: table with `<td>` cells for each field
- Both use `GoogleSpinner` during initial load
- Deletion: `isDeleting` state shows loading spinner on that row's delete button

**Child Component:** `AddEditFacultyModal` inside `./components/` — controlled by `isModalOpen` + `selectedFaculty`

---

### 10.7 Admin Students (`app/admin/students/page.tsx`)

**Route:** `/admin/students`

Identical pattern to Faculty page. Key differences:

**Student interface:**
```ts
{
  id: number
  student_id: string       // e.g. "STU001"
  name: string
  email, phone: string
  department: { department_id, department_name }
  course: { course_id, course_name }
  electives: string
  year: number             // 1–4
  semester: number         // 1–8
  faculty_advisor: { faculty_id, faculty_name } | null
}
```

**Filter states:** `searchTerm`, `selectedDepartment`, `selectedYear` (not yet wired to API).

---

### 10.8 Admin Approvals (`app/admin/approvals/page.tsx`)

**Route:** `/admin/approvals`
**Status:** Mostly static/demo data. Not yet wired to real API.

**Stats cards (4-col grid):**
- Total Pending: 12 (yellow bg)
- High Priority: 3 (red font)
- Approved Today: 8 (green font)
- Avg. Response Time: 2.4h (blue font)

**Approval items:** Hardcoded array of `{ id, type, requester, department, date, priority }`.

**Filter selects:** "All Types" and "All Priority" (UI only, no filter logic).

**Dual view pattern:**
- Mobile: card per approval item
- Desktop: full table
- Each item has "Approve" (`btn-success`) and "Reject" (`btn-danger`) buttons
- `handleApprove(id)` / `handleReject(id)` — currently just `console.log`

**Priority badge colors:**
- High → `badge-danger`
- Medium → `badge-warning`
- Low → `badge-success`

---

### 10.9 Admin Logs (`app/admin/logs/page.tsx`)

**Route:** `/admin/logs`
**Status:** Static demo data.

**Log levels and badge mapping:**
| Level | Badge Class |
|-------|-------------|
| SUCCESS | `badge-success` |
| WARNING | `badge-warning` |
| ERROR | `badge-danger` |
| INFO | `badge-info` |

**UI:** Filter by level dropdown + search input (no functionality). Mobile cards + desktop table dual view.

---

### 10.10 Admin Academic (`app/admin/academic/`)

**Route:** `/admin/academic/`
**Root page:** Immediately redirects to `/admin/academic/schools` via `router.replace()`.

**Layout (`app/admin/academic/layout.tsx`):** Renders an `InContentNav` tab bar with items:
- Schools · Departments · Buildings · Rooms · Courses · Programs

Each sub-route renders a CRUD management page for the corresponding entity.

---

### 10.11 Faculty Dashboard (`app/faculty/dashboard/page.tsx`)

**Route:** `/faculty/dashboard`

**Data sources (parallel fetch via `Promise.all`):**
1. `GET /api/faculty/profile/` → `FacultyProfile` object
2. `apiClient.getLatestApprovedTimetable()` → timetable/schedule data

**Caching:** `sessionStorage` 'faculty_profile_cache' — 5 minute TTL.

**FacultyProfile interface:**
```ts
{
  faculty_id, faculty_code, faculty_name: string
  email, phone, department, department_code: string
  specialization, qualification, designation: string
  max_workload_per_week: number
  is_active: boolean
  assigned_courses: Subject[]   // list of teaching assignments
  total_courses: number
}
```

**Subject (assigned course) interface:**
```ts
{
  offering_id, course_code, course_name: string
  credits: number
  department: string | null
  academic_year: string
  semester_type: string
  semester_number: number
  total_enrolled, max_capacity, number_of_sections: number
  offering_status: string
}
```

**Export:** `ExportButton` lazy-loaded via `dynamic()` to defer ~800KB of jsPDF/html2canvas/xlsx from the initial bundle.

**TimetableGrid:** `<TimetableGrid schedule={mySchedule} isAdminView={false} />` — read-only, no click handler.

---

### 10.12 Faculty Preferences (`app/faculty/preferences/page.tsx`)

**Route:** `/faculty/preferences`
**Status:** Static UI, not wired to API.

**Two-column grid cards:**

1. **Time Preferences**
   - Preferred Start Time (select: 08:00, 09:00, 10:00 AM)
   - Preferred End Time (select: 04:00, 05:00, 06:00 PM)
   - Preferred Days (checkboxes Mon–Sat, Saturday defaultUnchecked)

2. **Course Preferences**
   - Max Classes Per Day (select: 2–5)
   - Preferred Room Type (select: Any, Lecture Hall, Laboratory, Seminar Room)
   - Break Between Classes (select: 15/30/45/60 min)

**Availability Calendar:**
- Grid 7 columns (Time + Mon–Sat)
- Time slots 09:00–16:00
- Each cell is a toggle button with a 12×12 green dot (all showing available, no toggle logic)

---

### 10.13 Faculty Schedule (`app/faculty/schedule/`)

Renders the faculty's weekly schedule in `TimetableGrid` format.

---

### 10.14 Student Dashboard (`app/student/dashboard/page.tsx`)

**Route:** `/student/dashboard`

**Data sources (parallel `Promise.all`):**
1. `GET /api/student/profile/` → `StudentProfile`
2. `apiClient.getLatestApprovedTimetable()` → timetable data

**Caching:** `sessionStorage` 'student_profile_cache' — 5 minute TTL.

**StudentProfile interface:**
```ts
{
  student_id, enrollment_number, roll_number: string
  student_name, email, phone: string
  department, department_code, program, program_code: string
  current_semester, current_year, admission_year: number
  cgpa, total_credits_earned, current_semester_credits: number | null
  academic_status: string | null
  is_active: boolean
  enrolled_courses: Course[]
  total_courses: number
}
```

**Today's classes:** Derived by filtering timetable slots for the current weekday, then labeling each as `upcoming | current | completed` based on parsed start time vs `new Date()`.

**`ExportButton`** lazy-loaded (same pattern as faculty dashboard).

---

### 10.15 Student Timetable (`app/student/timetable/page.tsx`)

**Route:** `/student/timetable`

**Data:** `GET /api/timetable/student/me/` → `{ success, slots, student }`

**Caching:** `sessionStorage` 'student_schedule_cache' — 10 minute TTL.

**Local TimetableGrid implementation** (page-level, not the shared component):
- Days: Monday–Saturday
- Time slots: `['08:00', '09:00', ..., '16:00']`
- Slot matching: `s.day === day && s.time_slot?.startsWith(time)`
- Each cell shows: subject_code (bold), faculty_name, room_number
- Error state: shows ⚠️ icon + retry button

---

## 11. Authentication Flow

### 11.1 AuthContext (`context/AuthContext.tsx`)

**Provider:** `<AuthProvider>` wraps the entire app in `RootLayout`.

**Context value:**
```ts
{
  user: User | null
  login: (username, password) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
}
```

**`User` interface:**
```ts
{
  id: number
  username, email, role: string   // role: 'admin' | 'faculty' | 'student'
  first_name?, last_name?: string
  organization?: string            // organization_id
  department?: string              // department_id
}
```

**Mount behavior:** On mount, makes `GET /api/auth/me/` to restore session from existing HttpOnly cookies. If 401 → user stays `null`.

**`login()` flow:**
1. `POST /api/auth/login/` with `{ username, password }`
2. Backend sets JWT access + refresh tokens in HttpOnly cookies
3. Frontend stores only non-sensitive user metadata in `localStorage`

**`logout()` flow:**
1. `POST /api/auth/logout/` — blacklists refresh token on backend
2. Clears `localStorage.user`
3. Cookies deleted by backend response

**Security:** JWT tokens are **never accessible to JavaScript** (HttpOnly). This prevents XSS token theft. The pattern mirrors Google/Meta's authentication approach.

### 11.2 Token Refresh (`lib/auth.ts`)

- `refreshAccessTokenViaCookie()`: `POST /api/auth/refresh/` with `credentials: 'include'`
- Uses a singleton `refreshPromise` to deduplicate concurrent refresh calls
- Automatic retry happens inside `ApiClient.request()` on any 401 response
- After failed refresh: imperatively redirects to `/login` via `window.location.href` (not `useRouter` — class method cannot use hooks)

### 11.3 Route Protection Pattern

Every role-specific `layout.tsx` follows this pattern:
```tsx
const { user, isLoading } = useAuth()

// While loading: show GoogleSpinner full screen
// No user: router.push('/login')
// Wrong role: router.push('/unauthorized')
// Valid: render <DashboardLayout role={role}>{children}</DashboardLayout>
```

---

## 12. API Client Layer

### 12.1 Main ApiClient (`lib/api.ts`)

A class-based HTTP client. All requests use `credentials: 'include'` (cookie auth).

**Base URL:** `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'`

**Key methods:**
```ts
// Auth
login(credentials: { username, password })
logout()
getCurrentUser()

// Users
getUsers(page, pageSize, search)
getUser(id), createUser(data), updateUser(id, data), deleteUser(id)

// Faculty
getFaculty(page, pageSize, search)
createFaculty(data), updateFaculty(id, data), deleteFaculty(id)

// Students
getStudents(page, pageSize, search)
createStudent(data), updateStudent(id, data), deleteStudent(id)

// Academic
getDepartments(page, pageSize, search, organizationId)
getBuildings(), getRooms(), getCourses(), getPrograms()

// Timetable
getLatestApprovedTimetable()
// ... and many more
```

**Auto-refresh:** On any 401, calls `refreshToken()` once and retries. If refresh fails, redirects to `/login`. Guards against redirect loops: only redirects if `!pathname.startsWith('/login')`.

### 12.2 Timetable API (`lib/api/timetable.ts`)

Separate module for timetable-specific operations using two base URLs:
- `DJANGO_API_BASE` (port 8000) — CRUD/workflow endpoints
- `FASTAPI_BASE` (port 8001) — generation engine
- `FASTAPI_WS_BASE` — WebSocket base

```ts
// Key functions
fetchTimetableWorkflows(filters?)       → TimetableWorkflow[]
fetchTimetableVariants(filters?)        → TimetableVariant[]
selectVariant(variantId)               → { message, timetable_id }
generateTimetable(request)             → GenerateTimetableResponse
fetchGenerationJobStatus(jobId)        → GenerationJob
approveTimetable(workflowId, comments?)
rejectTimetable(workflowId, reason)
```

Graceful error handling: returns `[]` on 5xx rather than throwing.

### 12.3 Optimized Client (`lib/api/optimized-client.ts`)

In-memory `Map<string, { data, expires }>` cache with configurable TTL:

```ts
fetchTimetablesOptimized()     // 2 min TTL
fetchFacultyOptimized(pageSize) // 5 min TTL
fetchDepartmentsOptimized(orgId) // 10 min TTL
clearCache()
```

Features 5-second fetch timeout via `AbortController`.

---

## 13. Custom Hooks

### 13.1 `usePaginatedData<T>` (`hooks/usePaginatedData.ts`)

Generic hook for server-side paginated lists.

**Options:**
```ts
{
  fetchFn: (page: number, pageSize: number, search: string) => Promise<any>
  initialPageSize?: number   // default 25
  enableSearch?: boolean     // default true
}
```

**Returns:**
```ts
{
  data: T[]
  isLoading: boolean       // first page load
  isTableLoading: boolean  // pagination changes
  error: string | null
  searchTerm, setSearchTerm: string
  currentPage, setCurrentPage: number
  totalPages, totalCount: number
  itemsPerPage, setItemsPerPage: number
  refetch: () => void
}
```

**Debounced search:** 500ms debounce, auto-resets to page 1.

### 13.2 `useProgress` (`hooks/useProgress.ts`)

Real-time progress subscription via **Server-Sent Events (SSE)**.

**Signature:**
```ts
useProgress(
  jobId: string | null,
  onComplete?: (data: ProgressData) => void,
  onError?: (error: string) => void
): UseProgressReturn
```

**Returns:**
```ts
{
  progress: ProgressData | null
  isConnected: boolean
  error: string | null
  reconnectAttempt: number
}
```

**ProgressData shape:**
```ts
{
  job_id: string
  stage: string            // 'Clustering', 'OR-Tools solver', etc.
  stage_progress: number   // 0–100 within current stage
  overall_progress: number // 0–100 overall
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  eta_seconds: number | null
  started_at: number       // Unix timestamp
  last_updated: number
  metadata: Record<string, any>
}
```

**SSE events listened:**
| Event | Behavior |
|-------|---------|
| `connected` | Sets `isConnected = true`, resets reconnect counter |
| `progress` | Updates `ProgressData` state |
| `done` | Calls `onComplete`, closes EventSource |
| `error` (named) | Logs, does not close (server already closed) |

**Exponential backoff:** On `onerror`, `reconnectTimeoutRef` delays next connection attempt with increasing delays up to a configurable max. `reconnectCountRef` (a `useRef`) tracks actual count to avoid stale closure issues from React state.

**Security:** `EventSource` created with `{ withCredentials: true }` to send HttpOnly auth cookies to the SSE endpoint.

---

## 14. Types & Interfaces

### 14.1 `types/index.ts` — User
```ts
interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'faculty' | 'student'
  first_name?, last_name?: string
  organization?: string       // organization_id (not name)
  department?: string         // department_id (not name)
  organization_name?: string
  department_name?: string
}
```

### 14.2 `types/timetable.ts` — Timetable Models

**`GenerationJob`**
```ts
{ id: string(UUID), status: 'pending'|'running'|'completed'|'failed',
  progress: number(0-100), error_message, timetable_data }
```

**`TimetableWorkflow`**
```ts
{ id, job_id, organization_id, department_id, semester, academic_year,
  status: 'pending_review'|'approved'|'rejected'|'draft',
  created_by, approved_by, rejection_reason, variant, timetable_entries[], reviews[] }
```

**`TimetableVariant`**
```ts
{ id, job_id, variant_number, score, conflict_count,
  room_utilization, faculty_workload_balance,
  timetable_entries[], is_selected, metadata }
```

**`TimetableEntry`**
```ts
{ day, start_time, end_time, subject_id, subject_code, subject_name,
  faculty_id, faculty_name, batch_id, batch_name,
  classroom_id, classroom_number, is_lab, is_elective }
```

**`TimetableReview`**
```ts
{ review_type: 'approve'|'request_changes'|'reject', comments }
```

### 14.3 Zod Validation Schemas (`lib/validations.ts`)

| Schema | Key Rules |
|--------|-----------|
| `loginSchema` | username required, password required |
| `userSchema` | username 3–150 chars `[a-zA-Z0-9_]`, strong password regex, role enum |
| `facultySchema` | faculty_id `^[A-Z0-9]+$`, email, phone 10 digits, workload 1–40 |
| `simpleFacultySchema` | Same + `status: 'active'|'inactive'|'on_leave'` |
| `studentSchema` | student_id `^[A-Z0-9]+$`, year, semester |
| `simpleStudentSchema` | Used in modal |
| `roomSchema` | capacity, room_type enum |
| `courseSchema` | course_code, credits 1–6, type enum |
| `departmentSchema` | dept_code, school required |

---

## 15. Utility Functions

### 15.1 `lib/utils.ts`
```ts
// Merges Tailwind classes safely (no conflicting utilities)
cn(...inputs: ClassValue[]) → string
// Uses clsx for conditional classes + tailwind-merge for deduplication
```

### 15.2 `lib/exportUtils.ts`

**`exportTimetableToPDF(elementId, slots, options)`**
- Uses `html2canvas` to capture the DOM element at 2× scale
- Generates A4 landscape PDF via `jsPDF`
- Adds title, department, semester, academic year header
- Multi-page support with page numbers + generation date footer

**`exportTimetableToExcel(slots, options)`**
- Creates XLSX workbook via `xlsx` library
- Header row: Day, Time Slot, Subject, Faculty, Classroom, Batch
- Bold + gray fill on header cells
- Downloads via `file-saver`

**`exportTimetableToCSV(slots, options)`**
- Plain CSV with same columns
- Direct `Blob` download

**`exportTimetableToICS(slots, options)`**
- iCalendar format for calendar app import
- Maps timetable slots to recurring weekly events

---

## 16. Responsive Design Patterns

### Breakpoints (Tailwind defaults)
| Prefix | Min Width | Device |
|--------|-----------|--------|
| (none) | 0px | Mobile first |
| `sm:` | 640px | Tablet |
| `md:` | 768px | Laptop |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Wide |

### Dual View Pattern (Mobile Card + Desktop Table)

Extremely consistent across all CRUD pages (Faculty, Students, Logs, Approvals):

```html
<!-- Mobile: visible on xs/sm -->
<div class="block sm:hidden space-y-3">
  {items.map(item => <div class="card">...</div>)}
</div>

<!-- Desktop: visible on sm+ -->
<div class="hidden sm:block overflow-x-auto">
  <table class="table">...</table>
</div>
```

### Grid Patterns
```
Stats: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
Faculty availability: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
Form two-col: grid-cols-1 lg:grid-cols-2
```

### Sidebar Responsive
```
Mobile (<md): fixed drawer, translates off-screen, overlay on open
Desktop (≥md): persistent sidebar (w-56), icon-only when collapsed (w-16)
Content area: md:ml-56 when expanded, md:ml-16 when collapsed
```

### Padding Patterns
```
Page padding: p-4 lg:p-6
Section spacing: space-y-4 sm:space-y-6
Card padding: p-6 (inside .card)
```

---

## 17. Dark Mode Implementation

### Strategy
`next-themes` library with `darkMode: 'class'` in Tailwind. The `dark` class is applied to `<html>`.

**Provider:** `<ThemeProvider>` inside `RootLayout` in `app/layout.tsx`.

### Color Pairs (every element has both)
```
bg-white dark:bg-[#1E1E1E]
bg-[#F5F5F5] dark:bg-[#2A2A2A]
text-[#2C2C2C] dark:text-[#FFFFFF]
text-[#606060] dark:text-[#AAAAAA]
border-[#E0E0E0] dark:border-[#2A2A2A]
```

### `suppressHydrationWarning`
Applied on `<html>` in `RootLayout` to prevent hydration mismatch when server renders before theme is known.

### Dark Mode for Spinners
`GoogleSpinner` always uses `#4285F4` (works on both light and dark backgrounds). For spinners inside colored buttons: `color="white"` with 30% track opacity.

---

## 18. UI/UX Patterns & Conventions

### Toast Notifications (`components/Toast.tsx`)

**Pattern:** Provider → Context → `useToast()` hook

**Available methods:**
```ts
showToast(type: 'success'|'error'|'warning'|'info', message, duration?)
showSuccessToast(message, duration?)   // default 5000ms
showErrorToast(message, duration?)
showWarningToast(message, duration?)
showInfoToast(message, duration?)
removeToast(id)
```

**Visual:** Fixed top-right stack (`top-4 right-4 z-50`). Each toast:
- Colored background: `bg-green-50 border-green-200` / `bg-red-50` etc.
- Icon from `lucide-react`: CheckCircle, AlertCircle, AlertTriangle, Info
- Close button (X icon)
- Auto-dismiss after `duration` ms

### Loading States Pattern

Three distinct loading states used across the app:

1. **Full-page first load:** `GoogleSpinner` centered, nothing else shown
2. **Table pagination/search:** `isTableLoading` — table fades or shows overlay, header stays visible
3. **Button loading:** Replace button text with `GoogleSpinner size={16} color="white"`
4. **Skeleton screens:** `TimetableCardSkeleton`, `TableSkeleton` for structural loading

### Error States Pattern

Three error presentations:

1. **Inline error in table area:** Red text + retry button
2. **Toast:** Non-blocking error toasts via `showErrorToast()`
3. **Full-page ErrorBoundary:** Catches React render errors, shows reset + home buttons

### Stale-While-Revalidate (SWR-like) Pattern

Used in: Admin Dashboard, Timetables List, Faculty Dashboard, Student Dashboard, Student Timetable.

```ts
// On component init
useState(() => {
  const raw = sessionStorage.getItem(CACHE_KEY)
  if (raw) {
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts < TTL) return data  // serve stale immediately
  }
  return defaultValue
})

// After fetch completes
sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
```

### Form Validation Pattern

All forms use `react-hook-form` + `zodResolver`:
```tsx
const { register, handleSubmit, formState: { errors } } = useForm<Schema>({
  resolver: zodResolver(schema)
})
```

Error display: Red border on input (`input-error` class) + red icon + error message below via `FormField`.

### Pagination Component (`components/Pagination.tsx`)

**Features:**
- Smart page number windowing (shows 7 pages max with `...` ellipsis)
- Keyboard navigation: `ArrowLeft`, `ArrowRight`, `Home`, `End`
- Items per page selector (if `showItemsPerPage=true`)
- "Showing X to Y of Z results" count

**Props:**
```ts
{ currentPage, totalPages, totalCount, itemsPerPage,
  onPageChange, onItemsPerPageChange?, showItemsPerPage?, className? }
```

### DataTable Component (`components/shared/DataTable.tsx`)

Reusable client-side table with:
- Client-side search (filters all columns)
- Client-side sort (click column header, toggle asc/desc)
- Client-side pagination
- Sort indicator arrows (↑/↓)

**Props:**
```ts
{ data: any[], columns: Column[], searchable?, pagination?, pageSize? }
```
Note: For server-paginated data (Faculty, Students), each page uses its own inline table, not this component.

### TimetableGrid Component (`components/shared/TimetableGrid.tsx`)

**Props:**
```ts
{
  schedule: TimeSlot[]
  className?: string
  isAdminView?: boolean     // enables click on conflicted slots
  onSlotClick?: (slot) => void
}
```

**Standard time slots:** `['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00']`

**Standard days:** `['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']`

**Mobile view:** One card per day, each card lists all slots for that day.
**Desktop view:** Classic week grid table — days as columns, time slots as rows.

**Conflict visualization:**
- Normal: `bg-blue-100 border-blue-200` dark: `bg-blue-900/30`
- Conflict: `bg-red-100 border-red-200` dark: `bg-red-900/30`
- Conflict badge: Red dot at `-top-1 -right-1` on desktop cells

### ExportButton Component (`components/shared/ExportButton.tsx`)

Dropdown button with four format options:

| Format | Library | Notes |
|--------|---------|-------|
| PDF | jsPDF + html2canvas | Requires `tableElementId` in DOM |
| Excel | xlsx + file-saver | `.xlsx` format |
| CSV | Blob | Plain text |
| ICS | Blob | Calendar import |

Shows `GoogleSpinner` during export. Lazy-loaded in dashboards to avoid ~800KB bundle impact on initial paint.

### UUID Job ID Badge

In `DashboardLayout`, when the route contains a UUID segment, a clickable badge renders showing `#XXXXXXXX` (first 8 chars). On click: copies full UUID to clipboard, shows "Copied ✓" feedback for 2 seconds. On hover: tooltip shows full UUID with label "Job ID".

### Sign-Out Confirmation Dialog

In `DashboardLayout`: state `showSignOutDialog` blurs the main layout wrapper and renders a confirmation modal with Cancel + Sign Out buttons. Calls `useAuth().logout()` then `router.push('/login')`.

---

## 19. Known UX Gaps & Enhancement Opportunities

### Critical Gaps (Not Yet Implemented)

| Feature | Current State | Recommendation |
|---------|--------------|----------------|
| **Approvals page** | All static/demo data | Wire to real `submitReview()` API |
| **Logs page** | Static demo data | Wire to real audit log API with live filtering |
| **Faculty Preferences** | UI only, no save | Connect to `POST /api/faculty/preferences/` |
| **Notifications** | Hardcoded "New timetable generated" | Real notification feed |
| **Theme toggle** | `ThemeProvider` wrapped but no toggle button | Add dark/light toggle in header settings dropdown |
| **Admins page** | Page exists, content unclear | Implement admin CRUD similar to faculty page |
| **Faculty availability toggle** | `console.log` only | Save to backend |

### UX Improvements Available

1. **Optimistic UI:** Faculty/Student CRUD currently refreshes full list after save. Could add optimistic update then reconcile.

2. **Debounce department filter:** `selectedDepartment` filter state exists in Faculty/Students but isn't yet passed to the API call.

3. **Toast positioning:** Currently `top-4 right-4` — could use a toast queue with slide-in animation (`.animate-slide-in` referenced in `ToastItem` but the keyframe isn't defined in globals.css).

4. **Timetable comparison:** `/admin/timetables/compare/` route exists but is a stub.

5. **Progress page:** `/admin/timetables/status/[jobId]` uses `useProgress` SSE hook — the most complex page. Progress bar should use `.progress-bar` UI component.

6. **Empty states:** Most pages show plain "No data available" text — opportunity for illustrated empty states with call-to-action buttons.

7. **Form field `SelectField`:** The full `SelectField` and `TextAreaField` are implemented in `FormFields.tsx` but the login page only uses `FormField`. Consider extending modal forms.

8. **`InContentNav`** (`components/ui/InContentNav.tsx`): Used in academic layout for sub-navigation tabs. Styling could be enhanced with bottom-border active indicator.

9. **Mobile: Pagination controls** are fully working with keyboard support — ensure they are accessible with ARIA labels on all page number buttons.

10. **Loading Skeletons vs Spinner:** Skeletons are defined for timetables — ensure Faculty and Students pages also use `TableSkeleton` on initial load rather than full-page spinner.

---

## Appendix A: Environment Variables

| Variable | Default | Used By |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | `api.ts`, `useProgress`, dashboards |
| `NEXT_PUBLIC_DJANGO_API_URL` | `http://localhost:8000/api` | `timetable.ts`, `optimized-client.ts` |
| `NEXT_PUBLIC_FASTAPI_URL` | `http://localhost:8001` | `timetable.ts` |
| `NEXT_PUBLIC_FASTAPI_WS_URL` | `ws://localhost:8001` | `timetable.ts` |

---

## Appendix B: Alias Mapping (`tsconfig.json`)

All imports use the `@/` alias pointing to `src/`:
```
@/components/* → src/components/*
@/context/*    → src/context/*
@/hooks/*      → src/hooks/*
@/lib/*        → src/lib/*
@/types/*      → src/types/*
@/app/*        → src/app/*
```

---

## Appendix C: Key CSS Classes Quick Reference

```
Layout:        min-h-screen flex items-center justify-center
Spacing:       space-y-4 sm:space-y-6  |  p-4 lg:p-6  |  gap-4 sm:gap-6
Grid:          grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
Card:          .card  .card-flat  .card-header  .card-title  .card-description
Buttons:       .btn-primary  .btn-secondary  .btn-success  .btn-danger  .btn-ghost
Inputs:        .input-primary  .input-error  .input-field
Badges:        .badge  .badge-success  .badge-warning  .badge-danger  .badge-info
Navigation:    .nav-link  .nav-link-active
Header:        .header-circle-btn  .header-circle-notification  .notification-badge
Table:         .table  .table-header  .table-header-cell  .table-row  .table-cell
Forms:         .form-group  .form-label
Spinner:       .gsp-rotate  .gsp-arc  (applied by GoogleSpinner component)
Dark pairs:    Always dark: prefix variants on all color/bg/border classes
```
