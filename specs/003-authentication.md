# Feature 003 — Authentication & Authorization Module

## Feature Overview

Implement the complete Authentication and Authorization system for the Employee Management Dashboard backend.

This feature establishes the security foundation of the application by providing:

- Employee Login
- JWT Authentication
- Refresh Token System
- Logout Functionality
- Route Protection
- Role-Based Access Control (RBAC)
- Active Session Tracking

The implementation must follow all project development standards and integrate with the existing Prisma, PostgreSQL, and NestJS architecture.

---

# References

## Project Context

Refer to:

- `@context/project-overview.md`
- `@context/prisma-schema.md`
- `@context/database-design.md`
- `@context/business-rules.md`

## API Contract

Refer to:

- `@context/api-contract.md`

Authentication routes must strictly follow the contract.

### Important

- `/api` is configured as the global API prefix.
- Controllers must not manually include `/api` in route decorators.

## Development Standards

Refer to:

- `@context/development-rules.md`

All implementation must follow existing project standards.

---

# Objective

Provide secure authentication and authorization for the platform by implementing:

1. Employee login using email and password.
2. JWT Access Token generation and validation.
3. Refresh Token generation and rotation.
4. Session management.
5. Logout functionality.
6. Route protection using NestJS Guards.
7. Role-based authorization for Admin and Employee users.

---

# Scope

## Authentication

- Login API
- JWT Access Token generation
- JWT Refresh Token generation
- Refresh Token API
- Logout API

## Authorization

- JWT Strategy
- JWT Auth Guard
- Roles Guard
- Roles Decorator

## Validation

- Login DTO validation
- Global ValidationPipe configuration

## Database

- Active session tracking
- Refresh token storage

---

# Out Of Scope

The following features are not part of this implementation:

- Forgot Password
- Reset Password
- Change Password
- Email Verification
- OTP Authentication
- Multi-Factor Authentication
- Social Authentication
- Audit Logs

---

# Database Changes

## Employee Model Updates

Add the following fields to the Employee model:

```prisma
is_active Boolean @default(false)

refresh_token_hash String?
```

### Purpose

#### is_active

Tracks whether the employee currently has an active authenticated session.

#### refresh_token_hash

Stores a bcrypt hash of the currently valid refresh token.

The raw refresh token must never be stored in the database.

---

# Session Rules

### On Login

```text
Generate Access Token
Generate Refresh Token

Store:
- is_active = true
- refresh_token_hash = bcrypt(refresh_token)
```

### On Refresh

```text
Validate refresh token
Verify hash matches stored hash
Generate new access token
Generate new refresh token

Update:
refresh_token_hash = bcrypt(new_refresh_token)
```

### On Logout

```text
is_active = false
refresh_token_hash = null
```

All existing refresh tokens become invalid immediately.

---

# Migration Requirements

Create a Prisma migration.

```bash
npx prisma migrate dev --name add_authentication_session_fields
```

Acceptance Criteria:

- Migration generated successfully.
- Migration applied successfully.
- Existing data preserved.
- Migration committed to source control.

---

# Required Environment Variables

```env
JWT_SECRET=
JWT_EXPIRES_IN=

JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=
```

Application startup must fail if any required JWT configuration is missing. It is already configured in @backend/src/config/env.validation.ts
Use config module to get the env variables

---

# Authentication Module Structure

```text
src/auth

├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts

├── dto
│   └── login.dto.ts

├── guards
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts

├── strategies
│   └── jwt.strategy.ts

├── decorators
│   └── roles.decorator.ts

├── interfaces
│   └── jwt-payload.interface.ts
```

Import the Prisma module and use @backend/src/prisma/prisma.service.ts to instantiate prisma service via DI to use prisma for queries.

# Login Implementation

## Endpoint

```http
POST /auth/login
```

Global API prefix automatically becomes:

```http
POST /api/auth/login
```

---

# Login DTO

Location:

```text
src/auth/dto/login.dto.ts
```

### email

Validation:

```ts
@IsEmail()
@Transform(({ value }) => value.trim().toLowerCase())
```

### password

Validation:

```ts
@IsString()
@IsNotEmpty()
```

Password strength validation is not required during login.

---

# Global Validation Pipe

Configure a global ValidationPipe in main.ts.

Validation errors must return a field-based object structure suitable for frontend consumption.

Example:

```json
{
  "email": "Invalid email format",
  "password": "Password is required"
}
```

---

# Login Flow

1. Find employee by official email.
2. Verify employee exists.
3. Verify employee is not soft deleted.
4. Verify employee status allows login.

Allowed:

```text
WORKING
ON_NOTICE
```

Blocked:

```text
RESIGNED
TERMINATED
```

5. Compare password using bcrypt.
6. Generate Access Token.
7. Generate Refresh Token.
8. Hash refresh token using bcrypt.
9. Update employee:

```ts
is_active = true;
refresh_token_hash = hashedRefreshToken;
```

10. Set authentication cookies.
11. Return success response.

---

# Login Response

Response body:

```json
{
  "success": true,
  "message": "Logged in successfully"
}
```

Authentication tokens must be delivered using HTTP-only cookies.

---

# Cookie Requirements

## Access Token Cookie

```text
access_token
```

## Refresh Token Cookie

```text
refresh_token
```

Both cookies must:

- be httpOnly
- be secure in production
- use sameSite protection

---

# JWT Payload

Location:

```text
src/auth/interfaces/jwt-payload.interface.ts
```

```ts
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
```

Only required claims should be stored.

---

# JWT Strategy

Location:

```text
src/auth/strategies/jwt.strategy.ts
```

## Responsibilities

1. Extract access token from cookies.
2. Verify JWT signature.
3. Verify expiration.
4. Extract payload.
5. Verify employee exists.
6. Verify employee is not soft deleted.
7. Verify employee is active.
8. Return authenticated employee.

Authenticated employee should be attached to:

```ts
request.user;
```

---

# JWT Auth Guard

Location:

```text
src/auth/guards/jwt-auth.guard.ts
```

Implementation:

```ts
AuthGuard("jwt");
```

Used for protecting authenticated routes.

---

# Refresh Token Implementation

## Endpoint

```http
POST /auth/refresh
```

Global Route:

```http
POST /api/auth/refresh
```

---

# Refresh Flow

1. Extract refresh token from cookies.
2. Verify refresh token signature.
3. Verify employee exists.
4. Verify employee is active.
5. Verify employee is not soft deleted.
6. Compare incoming refresh token with stored refresh_token_hash.
7. Generate new access token.
8. Generate new refresh token.
9. Hash new refresh token.
10. Replace stored refresh_token_hash.
11. Update cookies.
12. Return success response.

---

# Refresh Token Security

Refresh token rotation is required.

Every successful refresh must:

```text
Invalidate previous refresh token
Issue new refresh token
Store hash of new refresh token
```

Only one active refresh token is allowed per employee.

---

# Logout Implementation

## Endpoint

```http
POST /auth/logout
```

Global Route:

```http
POST /api/auth/logout
```

Protected using:

```ts
@UseGuards(JwtAuthGuard)
```

---

# Logout Flow

1. Authenticate employee.
2. Update employee:

```ts
is_active = false;
refresh_token_hash = null;
```

3. Clear authentication cookies.
4. Return success response.

---

# Role-Based Access Control

Supported roles:

```text
ADMIN
EMPLOYEE
```

---

# Roles Decorator

Location:

```text
src/auth/decorators/roles.decorator.ts
```

Example:

```ts
@Roles(Role.ADMIN)
```

---

# Roles Guard

Location:

```text
src/auth/guards/roles.guard.ts
```

Responsibilities:

1. Read required role metadata.
2. Read authenticated employee role.
3. Compare roles.
4. Allow or deny access.

---

# Security Requirements

### Password Verification

Use:

```ts
bcrypt.compare();
```

### Route Protection

Use:

```ts
@UseGuards(JwtAuthGuard)
```

### Admin Route Protection

Use:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
```

### Authentication Validation

Authentication requests must be rejected when:

- JWT signature is invalid
- JWT is expired
- Employee does not exist
- Employee is soft deleted
- Employee is inactive
- Refresh token hash validation fails

No database updates should occur for invalid JWT requests.

---

# Definition Of Done

## Database

- [ ] is_active field added
- [ ] refresh_token_hash field added
- [ ] Migration created
- [ ] Migration applied successfully

## Authentication

- [ ] Login API implemented
- [ ] Access token generation implemented
- [ ] Refresh token generation implemented
- [ ] Refresh token rotation implemented
- [ ] Logout API implemented

## Authorization

- [ ] JWT Strategy implemented
- [ ] JWT Auth Guard implemented
- [ ] Roles Decorator implemented
- [ ] Roles Guard implemented

## Validation

- [ ] LoginDto implemented
- [ ] Global ValidationPipe configured

## Security

- [ ] Password verification uses bcrypt
- [ ] Refresh token stored as hash
- [ ] Tokens delivered via httpOnly cookies
- [ ] JWT configuration comes from environment variables
- [ ] Protected routes require valid JWT
- [ ] Admin routes enforce RBAC

## Verification

- [ ] Successful login creates active session
- [ ] Invalid password rejected
- [ ] Invalid email rejected
- [ ] Invalid JWT rejected
- [ ] Invalid refresh token rejected
- [ ] Refresh token rotation works correctly
- [ ] Logout invalidates session
- [ ] Inactive employee cannot refresh token
- [ ] Build passes
- [ ] Lint passes
- [ ] Manual API testing completed

---

# Expected Outcome

After completion, the application will have a secure authentication and authorization layer supporting:

- Login
- JWT Authentication
- Refresh Tokens
- Refresh Token Rotation
- Logout
- Route Protection
- Role-Based Access Control
- Active Session Management
