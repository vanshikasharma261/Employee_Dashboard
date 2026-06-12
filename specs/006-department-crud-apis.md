# Feature 006 — Department Management Module

## Feature Overview

Implement the Department Management module for the Employee Management Dashboard backend.

This feature provides APIs for managing departments within the organization. All department operations are restricted to authenticated administrators.

The module must follow the same architecture and development standards established in the Employee Management module.

Business logic must reside in the service layer and database interactions must be performed through Prisma.

---

## References

### Project Context

Refer to:

- @context/project-overview.md
- @context/business-rules.md
- @context/database-design.md

### Development Standards

Refer to:

- @context/development-rules.md

### Database Schema

Refer to:

- @context/prisma-schema.md

### API Contract

Refer to:

- @context/api-contract.md

### Important

`/api` is configured globally and must not be manually included in controller routes.

---

## Objective

Provide APIs for:

- Fetching departments
- Creating departments
- Updating departments
- Soft deleting departments

All operations must respect existing business rules and soft-delete implementation.

---

## Scope

### Included

- Department CRUD APIs
- DTO Validation
- Department uniqueness validation
- Soft delete support
- Authorization
- Business rule validation

### Excluded

- Department employee assignment
- Department hierarchy
- Department analytics
- Department reporting
- Employee transfer functionality

---

## Module Structure

```text
src/department

├── department.module.ts
├── department.controller.ts
├── department.service.ts

├── dto
│   ├── create-department.dto.ts
│   └── update-department.dto.ts
```

---

## Dependencies

DepartmentModule must import:

```ts
PrismaModule;
AuthModule;
```

DepartmentService must inject:

```ts
PrismaService;
AuthService;
```

through dependency injection.

---

## Authorization Rules

All department APIs are restricted to administrators.

Routes must be protected using:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
```

---

## Routes

### Get All Departments

```http
GET /departments
```

### Create Department

```http
POST /departments
```

### Update Department

```http
PATCH /departments/:id
```

### Delete Department

```http
DELETE /departments/:id
```

---

# Get All Departments

## Endpoint

```http
GET /departments
```

## Access

Admin Only

## Purpose

Fetch all active departments.

## Rules

- Exclude soft deleted departments.
- Return departments ordered by creation date.
- Return employee count for each department.
- Do not return internal soft-delete fields.

## Recommended Query Parameters

```http
GET /departments?page=1&limit=10&search=hr
```

Support:

- Pagination
- Search

## Excluded Fields

Never return:

```text
is_deleted
deleted_at
created_at
updated_at
```

---

# Create Department

## Endpoint

```http
POST /departments
```

## Access

Admin Only

## DTO

```text
CreateDepartmentDto
```

---

## Required Fields

```ts
name;
```

---

## System Managed Fields

The following fields must never be accepted from the request body:

```text
id
created_at
updated_at
is_deleted by default false
deleted_at by default null
```

---

## Validation Rules

### Department Name

- Required
- Must be unique
- Case-insensitive uniqueness validation
- Cannot belong to a soft deleted department

Example:

```text
Human Resources
human resources
```

should be treated as duplicates.

---

## Creation Rules

Before creating:

- Verify department name does not already exist.
- Verify no active department uses the same name.

---

## Default Values

Automatically set:

```ts
is_deleted = false;
deleted_at = null;
```

Database generates:

```ts
id;
created_at;
updated_at;
```

---

## Success Response

Return newly created department.

---

# Update Department

## Endpoint

```http
PATCH /departments/:id
```

## Access

Admin Only

## DTO

```ts
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
```

---

## Rules

Before updating:

- Department must exist.
- Department must not be soft deleted.
- Updated name must remain unique.
- Case-insensitive uniqueness validation must be applied.

---

## Success Response

Return updated department.

---

# Delete Department

## Endpoint

```http
DELETE /departments/:id
```

## Access

Admin Only

## Purpose

Soft delete department.

---

## Rules

Department must:

- Exist
- Not already be deleted

---

## Employee Validation

Before deleting:

Verify no active employees belong to the department.

Example:

```text
Department cannot be deleted if employees are assigned to it.
```

If active employees exist:

```ts
throw new BadRequestException(DepartmentMessages.DEPARTMENT_HAS_EMPLOYEES);
```

---

## Soft Delete Behaviour

Never physically delete records.

Update:

```ts
is_deleted = true;
deleted_at = new Date();
```

---

## Success Response

Return success message.

---

# DTO Validation

## CreateDepartmentDto

Location:

```text
src/department/dto/create-department.dto.ts
```

Use:

- class-validator
- class-transformer

---

### name

```ts
@IsString()
@IsNotEmpty()
@Transform(({ value }) => value.trim())
```

---

## UpdateDepartmentDto

Location:

```text
src/department/dto/update-department.dto.ts
```

Implementation:

```ts
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
```

---

# Session Validation

Before executing protected business logic:

```ts
const status = await this.authService.isUserActive(user);

if (!status) {
  throw new UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION);
}
```

Apply the existing AuthService session validation utility introduced previously.

---

# Exception Handling

Use NestJS exceptions only.

Examples:

```ts
BadRequestException;
UnauthorizedException;
ForbiddenException;
NotFoundException;
ConflictException;
```

---

# Messages

Do not hardcode messages.

Store all messages inside:

```text
src/constants/messages.constant.ts
```

Example:

```ts
export const DepartmentMessages = {
  DEPARTMENT_NOT_FOUND: "Department not found",
  DEPARTMENT_ALREADY_EXISTS: "Department already exists",
  DEPARTMENT_CREATED_SUCCESSFULLY: "Department created successfully",
  DEPARTMENT_UPDATED_SUCCESSFULLY: "Department updated successfully",
  DEPARTMENT_DELETED_SUCCESSFULLY: "Department deleted successfully",
  DEPARTMENT_HAS_EMPLOYEES:
    "Department cannot be deleted while employees are assigned",
};
```

---

# Security Requirements

### Route Protection

All department routes must use:

```ts
JwtAuthGuard;
RolesGuard;
```

and:

```ts
@Roles(Role.ADMIN)
```

---

### Session Validation

All service methods must validate:

```ts
await this.authService.isUserActive(user);
```

before executing protected operations.

---

# Definition Of Done

## APIs

- [ ] Get All Departments implemented
- [ ] Create Department implemented
- [ ] Update Department implemented
- [ ] Delete Department implemented

## Validation

- [ ] CreateDepartmentDto implemented
- [ ] UpdateDepartmentDto implemented
- [ ] Department name uniqueness validation implemented

## Authorization

- [ ] All routes protected with JWT authentication
- [ ] All routes protected with Admin RBAC
- [ ] Service-level session validation implemented

## Business Rules

- [ ] Soft delete implemented
- [ ] Department uniqueness enforced
- [ ] Department employee dependency validation implemented

## Security

- [ ] No hardcoded exception messages
- [ ] Session validation utility used
- [ ] Unauthorized access blocked

## Verification

- [ ] Build passes
- [ ] Lint passes
- [ ] Manual API testing completed
- [ ] Soft deleted departments excluded from queries
- [ ] Duplicate department creation blocked
- [ ] Department deletion blocked when employees exist

---

# Expected Outcome

After completion, administrators will be able to securely manage departments through a fully validated Department Management module that follows project architecture standards, supports soft deletion, enforces business rules, and provides the foundation for employee and asset management features that depend on departments.
