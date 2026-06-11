Feature 004 — Employee Management Module

Feature Overview

Implement the Employee Management module for the Employee Management Dashboard backend.

This feature provides all employee-related APIs required for administrators to manage employee records and for authenticated employees to view their own profile information.

The module must follow the established NestJS architecture: Controller ↓ Service ↓ Prisma Service ↓ PostgreSQL

Business logic must reside in the service layer only.

---

References

Project Context

Refer to:

- @context/project-overview.md
- @context/business-rules.md
- @context/database-design.md

Development Standards

Refer to:

- @context/development-rules.md

Database Schema

Refer to:

- @context/prisma-schema.md

Schema remains the source of truth for field names, relationships, enums, and constraints.API Contract

Refer to:

- @context/api-contract.md

### Important

`/api` is configured globally and must not be manually included in controller routes.

---

Objective

Provide APIs for:

- Creating employees
- Fetching employees
- Fetching employee details
- Updating employee information
- Updating employee status
- Soft deleting employees
- Fetching current authenticated employee profile

---

Scope

Included

### Employee APIs

- Get All Employees
- Get Employee By Id
- Create Employee
- Update Employee
- Update Employee Status
- Soft Delete Employee
- Get Current Employee

### DTO Validation

- CreateEmployeeDto
- UpdateEmployeeDto
- UpdateEmployeeStatusDto

### Authorization

- Admin-only employee management APIs
- Authenticated employee profile API

### Business Rules

- Department validation
- Reporting manager validation
- Email uniqueness validation
- Password hashing
- Soft delete support

---

Module Structure

    src/employee

    ├── employee.module.ts
    ├── employee.controller.ts
    ├── employee.service.ts

    ├── dto
    │   ├── create-employee.dto.ts
    │   ├── update-employee.dto.ts
    │   └── update-employee-status.dto.ts

---

Dependencies

EmployeeModule must import: PrismaModule AuthModule

EmployeeService must inject: PrismaService

    AuthService to use isUserAsctive before moving ahead if user is not active just send the unauthorized exception and message must be comming from constant/message.constant.ts - AuthMessage - UNAUTHORIZED_MESSAGE   

through dependency injection.

---

Authorization Rules

Admin Only Routes

Accessible only by: ADMIN

Routes: GET /employees GET /employees/:id POST /employees PATCH /employees/:id PATCH /employees/:id/status DELETE /employees/:id

Protection: @UseGuards(JwtAuthGuard, RolesGuard) @Roles(EmployeeRole.ADMIN)

---

Authenticated Employee Route

Accessible by: ADMIN EMPLOYEE

Route: GET /employees/me

Protection: @UseGuards(JwtAuthGuard)

---

API Specifications

Get All Employees

### Endpoint

    GET /employees

### Access

Admin Only

### Purpose

Fetch all active employees.

### Rules

- Exclude soft deleted employees.
- Do not return sensitive fields.
- Return department information.
- Return reporting manager information when available.

### Excluded Fields

Never return: password refresh_token_hash is_deleted deleted_at created_at updated_at

### Recommended Query Parameters

    GET /employees?page=1&limit=10&search=john

Support:

- pagination
- search

---

Get Employee By Id

### Endpoint

    GET /employees/:id

### Access

Admin Only

### Rules

- Employee must exist.
- Employee must not be soft deleted.
- Return safe employee details only.

---

Create Employee

### Endpoint

    POST /employees

### Access

Admin Only

### DTO

    CreateEmployeeDto

### Required Fields

    first_name
    last_name
    official_email
    personal_email
    password
    role
    department_name
    present_address
    permanent_address
    joining_date

### Optional Fields

    reporting_manager_official_email


    The department name is provided as department_name in body and

reporting manager's email is provided as reporting_manger_official_email

### System Managed Fields

The service must not accept the following from the request body: id status created_at updated_at deleted_at is_deleted is_active refresh_token_hash

### Creation Rules

Validate:

#### Department

- Department must exist.
- Department must not be deleted.

#### Emails

- official_email must be unique.
- personal_email must be unique.

#### Reporting Manager

- Must exist if provided.
- Must not be deleted.
- Must have WORKING status.
- Employee cannot report to themselves.

#### Password

Hash password using: bcrypt.hash()

### Default Values

Automatically set: status = WORKING is_deleted = false is_active = false refresh_token_hash = null deleted_at = null

Database generates: id created_at updated_at

---

Update Employee

### Endpoint

    PATCH /employees/:id

### Access

Admin Only

### DTO

    export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

### Rules

- Employee must exist.
- Employee must not be deleted.
- Validate updated emails for uniqueness.
- Validate updated department.
- Validate updated reporting manager.

### Password Updates

If password is updated: bcrypt.hash()

must be applied before persistence.

---

Update Employee Status

### Endpoint

    PATCH /employees/:id/status

### Access

Admin Only

### DTO

    UpdateEmployeeStatusDto

### Allowed Statuses

    WORKING
    ON_NOTICE
    RESIGNED
    TERMINATED

### Rules

Follow business rules defined in context.

---

Delete Employee

### Endpoint

    DELETE /employees/:id

### Access

Admin Only

### Purpose

Soft delete employee.

### Rules

Never physically remove records.

Update: is_deleted = true deleted_at = new Date()

### Validation

- Employee must exist.
- Employee must not already be deleted.

---

Get Current Employee

### Endpoint

    GET /employees/me

### Access

Authenticated Users

### Purpose

Return the profile information of the currently logged-in user.

### Source

Use: request.user

from JWT Strategy.

### Excluded Fields

Never return: password refresh_token_hash is_deleted deleted_at created_at updated_at

---

DTO Validation

CreateEmployeeDto

Use:

- class-validator
- class-transformer

Validation examples: @IsString() @IsNotEmpty() @IsEmail() @IsUUID() @IsEnum(EmployeeRole) @IsDateString()

---

Exception Handling

Use NestJS exceptions only.

Examples: BadRequestException UnauthorizedException ForbiddenException NotFoundException ConflictException

---

Messages

Do not hardcode messages.

Store all messages inside: src/constants/messages.constant.ts    make a new object called - EmployeeMessages

Examples: EMPLOYEE_NOT_FOUND EMPLOYEE_CREATED_SUCCESSFULLY EMPLOYEE_UPDATED_SUCCESSFULLY EMPLOYEE_DELETED_SUCCESSFULLY DEPARTMENT_NOT_FOUND EMAIL_ALREADY_EXISTS REPORTING_MANAGER_NOT_FOUND

---

Security Requirements

### Passwords

Must always be stored as: bcrypt hashes

Never plain text.

### Route Protection

Admin routes: JwtAuthGuard RolesGuard

Employee route: JwtAuthGuard

### Response Safety

Never expose: password refresh_token_hash

in any response.

---

Definition Of Done

APIs

- Get All Employees implemented
- Get Employee By Id implemented
- Create Employee implemented
- Update Employee implemented
- Update Employee Status implemented
- Delete Employee implemented
- Get Current Employee implemented

Validation

- CreateEmployeeDto implemented
- UpdateEmployeeDto implemented
- UpdateEmployeeStatusDto implemented

Authorization

- Admin routes protected
- Employee route protected

Business Rules

- Department validation implemented
- Reporting manager validation implemented
- Email uniqueness validation implemented
- Password hashing implemented
- Soft delete implemented

Security

- Sensitive fields excluded from responses
- Passwords stored as hashes

Verification

- Build passes
- Lint passes
- Manual API testing completed
- Soft deleted employees excluded from queries
- Unauthorized access blocked
- Role restrictions verified

---

Expected Outcome

After completion, administrators can fully manage employee records through secure APIs while employees can access their own profile information. The module will provide the foundation for Department Management, Asset Allocation, Reporting Hierarchy, and Asset Request features that depend on employee data.
