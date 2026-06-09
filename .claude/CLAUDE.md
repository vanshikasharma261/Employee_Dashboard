# Employee Management Dashboard

Internal employee and asset management platform for managing:

- Employees
- Departments
- Company Assets
- Asset Allocation
- Asset Requests
- Reporting Hierarchy

---

# Project Structure

```text
backend/   → NestJS API
frontend/  → React Application
context/   → AI Context Files
```

---

# Backend (NestJS)

Package Manager:

```bash
npm
```

Run Development Server:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Default Port:

```text
3000
```

API Prefix:

```text
/api
```

---

# Frontend (React)

Run Development Server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Default Port:

```text
5173
```

---

# Context Files

Always read these files before implementing features.

## Project Context

- @context/project-overview.md
- @context/business-rules.md

## Database Context

- @context/prisma-schema.md
- @context/database-design.md

## API Context

- @context/api-contracts.md

## Frontend Context

- @context/frontend-routes.md
- @context/ui-guidelines.md

## Development Context

- @context/development-rules.md
- @context/env-context.md
- @context/ai-instructions.md

## Current Work

- @context/current-feature.md

---

# Current Feature Workflow

Before implementing a feature:

1. Read current-feature.md
2. Read business-rules.md
3. Read prisma-schema.md if database changes are involved
4. Implement feature
5. Update current-feature.md
6. Update feature history

---

# Architecture

Backend:

- NestJS
- Prisma ORM
- PostgreSQL
- JWT Authentication

Frontend:

- React
- Redux Toolkit
- Axios
- CSS Modules

---

# Authentication

Authentication is employee-based.

Employee contains:

- official_email
- password
- role

Roles:

- ADMIN
- EMPLOYEE

JWT is used for authentication.

---

# Conventions

## TypeScript

- Strict TypeScript
- Avoid any
- Prefer explicit typing

## Backend

- Controllers should remain thin
- Business logic belongs in services
- DTO validation required
- Prisma access through services

## Frontend

- Feature-based folder structure
- Reusable components preferred
- API calls through service layer
- Avoid direct API calls inside components

## Database

- UUID primary keys
- Prisma ORM
- PostgreSQL
- Use enums wherever possible
- Use transactions for asset allocation operations

---

# Important Rules

- Do not invent database fields
- Follow prisma-schema.md as source of truth
- Follow business-rules.md for business logic
- Follow api-contracts.md for endpoint structure
- Ask for clarification if requirements are unclear

```

```
