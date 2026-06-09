# Employee Management Dashboard

🚀 Internal Employee & Asset Management Platform

---

# Employee Management Dashboard

A centralized platform for managing employees, departments, company assets, reporting hierarchy, and employee asset requests.

The system is designed to replace spreadsheets, emails, and manual tracking processes with a structured workflow for employee and asset management.

---

# 📌 Problem (Core Idea)

Many organizations manage employee records and company assets using disconnected systems such as spreadsheets, emails, shared documents, and manual processes.

This creates:

- Inconsistent employee records
- Poor visibility into asset ownership
- Missing asset history
- Delayed request handling
- Difficult reporting structure management
- Lack of accountability and auditability

➡️ The Employee Management Dashboard provides one centralized system for managing employees, assets, allocations, and requests.

---

# 👥 Users

| Persona  | Responsibilities                                           |
| -------- | ---------------------------------------------------------- |
| Admin    | Employee management, asset management, request approvals   |
| Employee | View profile, manage asset requests, view allocated assets |

---

# ✨ Core Features

## A) Employee Management

Manage employee lifecycle within the organization.

Capabilities:

- Create employees
- Update employee information
- Assign departments
- Assign reporting managers
- Manage employee status
- View employee directory

---

## B) Department Management

Maintain organizational departments.

Examples:

- Engineering
- Human Resources
- Finance
- Marketing
- Operations
- Product

Capabilities:

- Create departments
- Update departments
- Assign employees

---

## C) Reporting Hierarchy

Maintain reporting structure between employees.

Capabilities:

- Assign reporting managers
- View reporting hierarchy
- Track direct reports

---

## D) Asset Management

Manage company-owned assets and equipment.

Supported Asset Categories:

- Laptop
- Mouse
- Keyboard
- Headset
- Earphone
- Mobile Phone
- Screen
- Cooling Pad
- iPad

Capabilities:

- Register assets
- Update assets
- Allocate assets
- Remove allocations
- Track maintenance
- Mark assets as retired

---

## E) Asset Allocation Tracking

Track ownership and assignment history of company assets.

Capabilities:

- Current allocation tracking
- Historical allocation records
- Asset ownership timeline

---

## F) Asset Request System

Allow employees to request assets and maintenance.

Capabilities:

- New asset requests
- Asset removal requests
- Maintenance requests
- Approval workflow
- Request tracking

---

## G) Authentication & Access Control

Secure platform access based on employee roles.

Roles:

- Admin
- Employee

Capabilities:

- Login
- JWT authentication
- Role-based authorization

---

# 🧱 Tech Stack

| Layer            | Technology    |
| ---------------- | ------------- |
| Frontend         | React         |
| Backend          | NestJS        |
| Database         | PostgreSQL    |
| ORM              | Prisma        |
| Language         | TypeScript    |
| Authentication   | JWT           |
| State Management | Redux Toolkit |
| Styling          | CSS Modules   |

---

# 🔌 High-Level Architecture

```text
Frontend (React)
        ↓
Backend API (NestJS)
        ↓
Prisma ORM
        ↓
PostgreSQL
```

---

# 🚀 MVP Scope

### Employee Management

- Employee CRUD
- Department assignment
- Reporting manager assignment
- Status management

### Asset Management

- Asset CRUD
- Asset allocation
- Asset maintenance tracking

### Asset Requests

- Request creation
- Request approval workflow

### Authentication

- Login
- JWT Authentication
- Role-based authorization

---

# 🔮 Future Enhancements

- Leave Management
- Employee Documents
- Attendance Tracking
- Notifications
- Email Integration
- Audit Logs
- Analytics Dashboard
- CSV Import/Export

---

# 📌 Status

Planning Phase

Ready for:

- Database Design
- Prisma Schema Development
- NestJS Module Development
- React Dashboard Development
- API Design

---

🏗️ Employee Management Dashboard — Manage Employees, Assets & Requests Efficiently.
