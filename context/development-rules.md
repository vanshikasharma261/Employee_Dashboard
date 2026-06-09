# Development Rules

## Backend

Framework:

- NestJS

Architecture:

Controller
→ Service
→ Prisma - module to use prisma

Rules:

- No business logic inside controllers
- Services contain business logic

---

## DTO Rules

Use:

- CreateDto
- UpdateDto
- ResponseDto

Validation:

- class-validator
- class-transformer

---

## Error Handling

Use NestJS Exceptions:

- BadRequestException
- UnauthorizedException
- ForbiddenException
- NotFoundException

Never return raw errors.

---

## Frontend

Framework:

- React
- Redux Toolkit

Rules:

- Reusable components
- Feature based folder structure
- API calls inside services
- No direct axios calls inside components

---

## Naming Conventions

Files:

employee.service.ts

employee.controller.ts

employee.module.ts

employee.repository.ts

Variables:

camelCase

Classes:

PascalCase

Constants:

UPPER_SNAKE_CASE

---

## Prisma Rules

- UUID primary keys
- created_at
- updated_at on every table
- Use enums where possible
- Use indexes for search fields
- Use transactions for allocation operations

---

## Git Rules

Branch naming:

feature/employee-module

feature/asset-module

feature/request-module

bugfix/allocation-issue

hotfix/login-fix

---

## Code Quality

Required:

- ESLint
- Prettier

Preferred:

- Husky
- lint-staged
