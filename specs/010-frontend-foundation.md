Feature 010 — Frontend Foundation, Authentication & Application Layout

Feature Overview

Implement the foundational frontend architecture for the Employee Management Dashboard application.

This feature establishes the application structure, authentication flow, routing architecture, Redux Toolkit configuration, layout system, reusable components, and dashboard shell required by future frontend modules.

Dashboard statistics and CRUD screens are out of scope for this feature and will be implemented in dedicated frontend modules.

The primary objective is to create a scalable frontend architecture that supports future Employee, Department, Asset, Asset Request, and Dashboard modules without requiring major refactoring.

---

References

Project Context

Refer to:

- @context/project-overview.md
- @context/development-rules.md

Backend Features

Refer to completed backend modules:

- Feature 003 — Authentication Module
- Feature 004 — Employee Module
- Feature 005 — Department Module
- Feature 007 — Asset Module
- Feature 008 — Asset Request Module
- Feature 009 — Asset History Module

API Contract

Refer to:

- @context/api-contract.md

## Layout References

In the screenshot folder:-

admin_sidebar_ui.pngemployee_sidebar_ui.pngdashboard_ui.pngemployee_my_dashboard_ui.png

---

Objective

Provide the frontend foundation for:

- Application Routing
- Authentication Integration
- Redux Toolkit Setup
- Global State Management
- Layout System
- Sidebar Navigation
- Protected Routes
- Shared Components
- TypeScript Type Safety

This feature prepares the application for all future CRUD modules.

---

Scope

Included

### Authentication

- Login Page
- Login API Integration
- Authentication State Management
- Route Protection
- Role Based Navigation
- Logout State Handling

### Redux Toolkit

- Store Configuration
- Typed Hooks
- Feature Slices
- Async Thunks
- Global State Structure

### Layout System

- Admin Layout
- Employee Layout
- Shared Layout Components
- Sidebar Components
- Header Component

### Routing

- Public Routes
- Admin Routes
- Employee Routes
- Unauthorized Route
- Route Guards

### Shared Infrastructure

- API Configuration
- Global Types
- Constants
- Reusable Components

---

Out Of Scope

The following features will be implemented separately:

### Feature 011

Employee Management UI

### Feature 012

Department Management UI

### Feature 013

Asset Management UI

### Feature 014

Asset Request UI

### Feature 015

Dashboard Analytics UI

---

Frontend Folder Structure

    src

    ├── assets

    ├── app
    │   ├── router.tsx
    │   └── providers.tsx

    ├── layouts
    │   ├── AdminLayout.tsx
    │   └── EmployeeLayout.tsx

    ├── pages
    │   ├── LoginPage.tsx
    │   ├── UnauthorizedPage.tsx
    │   ├── AdminDashboardPage.tsx
    │   └── EmployeeDashboardPage.tsx

    ├── components
    │   ├── sidebar
    │   │   ├── AdminSidebar.tsx
    │   │   └── EmployeeSidebar.tsx
    │   │
    │   ├── common
    │   │   ├── Loader.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   └── EmptyState.tsx

    ├── features
    │   ├── auth
    │   │   ├── authSlice.ts
    │   │   ├── authThunks.ts
    │   │   └── authSelectors.ts
    │   │
    │   ├── employee
    │   │   └── employeeSlice.ts
    │   │
    │   ├── department
    │   │   └── departmentSlice.ts
    │   │
    │   ├── asset
    │   │   └── assetSlice.ts
    │   │
    │   └── asset-request
    │       └── assetRequestSlice.ts

    ├── services
    │   ├── api.ts
    │   └── endpoints.ts

    ├── store
    │   ├── store.ts
    │   └── hooks.ts

    ├── types
    │   ├── auth.types.ts
    │   ├── employee.types.ts
    │   ├── department.types.ts
    │   ├── asset.types.ts
    │   └── asset-request.types.ts

    ├── constants

    ├── styles

    ├── App.tsx

    └── main.tsx

---

Redux Toolkit Setup

Install: npm install @reduxjs/toolkit react-redux

---

Store Configuration

File

    src/store/store.ts

Must export: export type RootState = ReturnType< typeof store.getState >; export type AppDispatch = typeof store.dispatch;

---

Typed Hooks

File

    src/store/hooks.ts

Implementation: export const useAppDispatch = () => useDispatch<AppDispatch>(); export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

---

Authentication Feature

Folder

    src/features/auth

---

Auth State

    {
      loading: false,
      error: null,
      isAuthenticated: false
    }

---

Login Thunk

Use: createAsyncThunk()

Responsibilities:

- Call Login API
- Handle Loading State
- Handle Success State
- Handle Error State

---

Backend Integration

Integrate with existing backend: POST /api/auth/login

Use actual API responses.

No mock authentication.

---

Route Protection

Create: ProtectedRoute.tsx

Responsibilities:

- Check authentication state
- Check role access
- Redirect unauthorized users

---

Admin Access

    Role.ADMIN

---

Employee Access

    Role.EMPLOYEE

---

Login Page

File

    pages/LoginPage.tsx

---

UI Requirements

Centered authentication card.

Fields: Email Password

Button: Login

Header: Login User

Subheading: EMS

---

Behaviour

On submit:

1. Validate fields

2. Dispatch login thunk

3. Show loading state

4. Handle API errors

5. Redirect based on role

---

Layout System

Admin Layout

Contains:

- Header
- Sidebar
- Main Content Area

Uses: AdminSidebar

---

Employee Layout

Contains:

- Header
- Sidebar
- Main Content Area

Uses: EmployeeSidebar

---

Sidebar Navigation

Admin Sidebar

Menu: Dashboard Employees Departments Assets Requests History

Routes only need placeholders for now.

---

Employee Sidebar

Menu: Dashboard My Assets My Requests

Routes only need placeholders for now.

---

Dashboard Pages

Admin Dashboard

Use provided design screenshots for:

- Theme
- Layout
- Navigation
- Card Design

Data displayed can be placeholder values until Feature 015.

---

Employee Dashboard

Use provided employee dashboard screenshots.

Data displayed can be placeholder values until Feature 015.

---

API Service Layer

File

    src/services/api.ts

Create centralized fetch wrapper.

Responsibilities:

- Base URL management
- Authorization header injection
- JSON parsing
- Error handling

---

Application Favicon

Configure favicon from: src/assets

---

Styling Standards

Use: CSS Modules

Requirements:

- Responsive Layout
- Reusable Components
- Consistent Design System
- Shared Utility Classes
- Sidebar Layout Reusability

---

Definition Of Done

Authentication

- Login Page implemented
- Login API integration completed
- Authentication state management completed
- JWT token persistence implemented

Redux

- Redux Toolkit configured
- Store configured
- Typed hooks configured

Routing

- Public routes configured
- Protected routes configured
- Admin routes configured
- Employee routes configured

Layouts

- Admin layout implemented
- Employee layout implemented
- Sidebar navigation implemented

Shared Infrastructure

- API service layer implemented
- Global types created
- Feature slice structure created

Verification

- Login works against backend
- Role-based redirects work
- Protected routes work
- Sidebar navigation works
- Application builds successfully
- ESLint passes

---

Expected Outcome

After completion, the frontend will have a production-ready architecture with authentication, routing, Redux Toolkit integration, layout management, role-based navigation, and reusable infrastructure required for all future Employee, Department, Asset, Asset Request, and Dashboard frontend modules.
