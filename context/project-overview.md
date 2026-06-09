# Employee Management Dashboard

🚀 Internal Employee & Asset Management System

---

# Employee Management Dashboard

A centralized platform for managing employees, company assets, reporting structure, and asset requests.

The system helps HR/Admin teams maintain employee records, track company assets, and handle asset allocation throughout the employee lifecycle.

---

# 📌 Problem Statement

Many organizations manage employee information and asset allocation using spreadsheets, emails, and manual tracking systems.

This leads to:

- Inconsistent employee records
- Asset tracking issues
- Missing ownership history
- Delayed asset requests
- Difficulty managing reporting structures
- Poor visibility into employee status changes

The Employee Management Dashboard provides a centralized system to manage employees, company assets, allocations, and requests.

---

# 🎯 Project Goals

- Manage employee records
- Manage company assets
- Track asset allocations
- Maintain reporting hierarchy
- Handle employee asset requests
- Maintain complete audit history
- Provide role-based access

---

# 👥 User Roles

## Admin

Administrators have full access to the system.

Permissions:

- Add employee
- Update employee details
- Change employee status
- Manage departments
- Manage assets
- Allocate assets
- Remove assets
- Update asset information
- View employee asset history
- View asset requests
- Approve or reject requests

---

## Employee

Employees have limited access.

Permissions:

- View profile information
- View allocated assets
- Submit asset requests
- Request asset maintenance
- Request asset removal
- View request status

---

# 🏢 Employee Management

## Employee Information

Each employee contains:

| Field                | Type           |
| -------------------- | -------------- |
| employee_id          | Auto Generated |
| first_name           | String         |
| last_name            | String         |
| official_email       | String         |
| personal_email       | String         |
| present_address      | Text           |
| permanent_address    | Text           |
| joining_date         | Date           |
| status               | Enum           |
| department_id        | FK             |
| reporting_manager_id | FK(Employee)   |
| created_at           | Timestamp      |
| updated_at           | Timestamp      |

---

## Employee Status

```ts
enum EmployeeStatus {
  WORKING
  ON_NOTICE
  RESIGNED
  TERMINATED
}
```

### Business Rules

- New employee is automatically created with:
  - WORKING status

- Status can only be changed by Admin
- Terminated employees cannot receive new assets
- Resigned employees remain in system for historical records

---

# 🏬 Department Management

Departments are maintained separately.

Examples:

- Engineering
- Human Resources
- Finance
- Marketing
- Operations
- Product

---

## Department Entity

| Field           | Type      |
| --------------- | --------- |
| department_id   | UUID      |
| department_name | String    |
| created_at      | Timestamp |

---

# 👨‍💼 Reporting Structure

Employees can report to another employee.

Example:

CEO
├── Engineering Manager
│ ├── Developer A
│ └── Developer B
└── HR Manager

### Rules

- Reporting Manager references employee_id
- Reporting Manager is optional
- Employee cannot report to themselves

---

# 💻 Asset Management

The company maintains an inventory of assets.

Assets may be:

- Allocated
- Available
- Under Maintenance
- Trashed

---

## Asset Categories

```ts
enum AssetCategory {
  LAPTOP
  MOUSE
  KEYBOARD
  HEADSET
  EARPHONE
  MOBILE_PHONE
  SCREEN
  COOLING_PAD
  IPAD
}
```

---

## Asset Status

```ts
enum AssetStatus {
  AVAILABLE
  ALLOCATED
  MAINTENANCE
  TRASHED
}
```

---

## Asset Entity

| Field               | Type                  |
| ------------------- | --------------------- |
| asset_id            | UUID                  |
| asset_category      | Enum                  |
| asset_serial_number | String                |
| status              | Enum                  |
| allocated_to        | FK(Employee) Nullable |
| created_at          | Timestamp             |
| updated_at          | Timestamp             |

---

# 🔄 Asset Allocation

Admins can:

- Allocate asset to employee
- Remove asset from employee
- Update asset details
- Move asset to maintenance
- Mark asset as trashed

---

## Allocation Rules

### Allocate Asset

Requirements:

- Employee must be WORKING
- Asset must be AVAILABLE

Result:

- Asset status becomes ALLOCATED
- Employee receives asset

---

### Remove Asset

Result:

- Asset becomes AVAILABLE
- Allocation removed

---

### Maintenance

Result:

- Asset status becomes MAINTENANCE
- Asset cannot be allocated

---

### Trash Asset

Result:

- Asset status becomes TRASHED
- Asset cannot be reused

---

# 📋 Asset Request System

Employees can create requests related to assets.

---

## Request Types

```ts
enum RequestType {
  NEW_ASSET
  REMOVE_ASSET
  MAINTENANCE
}
```

---

## Request Status

```ts
enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
}
```

---

## Asset Request Entity

| Field          | Type          |
| -------------- | ------------- |
| request_id     | UUID          |
| employee_id    | FK            |
| asset_id       | FK Nullable   |
| request_type   | Enum          |
| description    | Text          |
| status         | Enum          |
| admin_response | Text Nullable |
| created_at     | Timestamp     |
| updated_at     | Timestamp     |

---

# 🔄 Request Workflow

Employee Creates Request

↓

Admin Reviews Request

↓

Approve / Reject

↓

Action Performed

↓

Request Completed

---

# 🗄️ Database Relationships

## Employee

Relations:

- belongs to Department
- reports to Employee
- has many Assets
- has many Asset Requests

---

## Department

Relations:

- has many Employees

---

## Asset

Relations:

- belongs to Employee (optional)

---

## Asset Request

Relations:

- belongs to Employee
- optionally references Asset

---

# 🔐 Authentication & Authorization

## Authentication

- Email + Password Login
- JWT Access Token
- Refresh Token

---

## Authorization

### Roles

```ts
enum UserRole {
  ADMIN
  EMPLOYEE
}
```

Role Guard Protection:

- Admin Routes → ADMIN only
- Employee Routes → Authenticated users

---

# 🧱 Tech Stack

| Layer             | Technology      |
| ----------------- | --------------- |
| Frontend          | React           |
| Backend           | NestJS          |
| ORM               | Prisma          |
| Database          | PostgreSQL      |
| Language          | TypeScript      |
| Authentication    | JWT             |
| Validation        | class-validator |
| State Management  | Redux Toolkit   |
| API Communication | fetch           |
| Styling           | CSS Modules     |

---

# 📂 Suggested Backend Modules

```text
src/

├── auth
├── employee
├── department
├── asset
├── asset-request
├── admin
├── prisma
├── common
└── config
```

---

# 📂 Suggested Frontend Pages

```text
Admin

/dashboard
/employees
/employees/create
/employees/:id
/assets
/asset-requests

Employee

/dashboard
/profile
/my-assets
/my-requests
/request-asset
```

---

# 🚀 MVP Scope

### Employee Management

- Create Employee
- Update Employee
- Change Status
- Department Assignment
- Reporting Manager Assignment

### Asset Management

- Add Asset
- Update Asset
- Allocate Asset
- Remove Asset

### Asset Requests

- Create Request
- View Requests
- Approve Request
- Reject Request

### Authentication

- Login
- Role Based Access

---

# 📌 Current Status

Planning Phase

Ready for:

- Prisma Schema Design
- Database Architecture
- NestJS Module Setup
- React Dashboard UI Development
- API Design

---

🏗️ Employee Management Dashboard — Manage Employees, Assets & Requests Efficiently.
