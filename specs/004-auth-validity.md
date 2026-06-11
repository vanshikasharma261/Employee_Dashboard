# AuthService Session Validation Utility

## Overview

Introduce a reusable session validation utility inside the existing `AuthService`.

The purpose of this utility is to provide a consistent mechanism for verifying whether the authenticated employee currently has an active session before executing service-level business logic.

This utility will be reused throughout Employee, Department, Asset, Allocation, and Request modules.

Although `JwtStrategy` already validates authentication, this helper provides an additional service-level safeguard and prevents duplicated session validation logic across modules.

---

## Existing Authenticated User Interface

The authenticated user object already exists at:

```text
src/auth/interfaces/authenticated-user.interface.ts
```

Current structure:

```ts
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
```

The authenticated user is attached to:

```ts
request.user;
```

by the JWT Strategy.

---

## Express User Type Augmentation

To ensure proper typing across controllers and services, extend the Express User interface.

### Location

```text
src/types/express.d.ts
```

### Implementation

```ts
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

export {};
```

### TypeScript Configuration

Ensure the TypeScript compiler includes custom type declaration files.

Verify that `tsconfig.json` includes the `src` directory so that the Express declaration merging is automatically discovered.

---

## Location

```text
src/auth/auth.service.ts
```

---

## Method

Create the following helper method:

```ts
async isUserActive(
  user: Express.User,
): Promise<boolean>
```

---

## Responsibilities

The method should:

1. Accept the authenticated user object.
2. Use `user.id`.
3. Query the Employee table.
4. Read the employee's `is_active` value.
5. Return a boolean indicating whether the employee currently has an active session.

---

## Implementation Behaviour

Example implementation:

```ts
async isUserActive(
  user: Express.User,
): Promise<boolean> {
  const employee = await this.prisma.employee.findUnique({
    where: {
      id: user.id,
    },
    select: {
      is_active: true,
    },
  });

  return employee?.is_active ?? false;
}
```

---

## Constants

All exception messages must be stored inside:

```text
src/constants/messages.constant.ts
```

Example:

```ts
export const AuthMessages = {
  UNAUTHORIZED_EXCEPTION: "User session is inactive",
};
```

---

## Usage

Before executing protected business operations:

```ts
const status = await this.authService.isUserActive(user);

if (!status) {
  throw new UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION);
}
```

---

## Validation Rules

The utility must:

- Use the authenticated employee's `id`.
- Query only the Employee table.
- Never update database records.
- Never modify session data.
- Return only a boolean value.
- Not generate tokens.
- Not modify authentication state.

---

## Source of Truth

The source of truth for session validation is:

```text
Employee.is_active
```

stored in the database.

The utility must always read the latest value from the database rather than relying on JWT payload data.

---

## Integration Requirements

This utility should be available for use across:

- Employee Module
- Department Module
- Asset Module
- Asset Allocation Module
- Asset Request Module

Any service requiring authenticated employee access may validate the employee's active session status before executing business logic.

---

## Definition Of Done

- [ ] Existing `AuthenticatedUser` interface reused.
- [ ] Express User declaration merging implemented.
- [ ] `src/types/express.d.ts` created.
- [ ] `isUserActive()` added to `AuthService`.
- [ ] Method accepts `Express.User`.
- [ ] Method validates `Employee.is_active` using `user.id`.
- [ ] Method returns `Promise<boolean>`.
- [ ] No database updates performed.
- [ ] `AuthMessages.UNAUTHORIZED_EXCEPTION` added.
- [ ] Utility successfully used by Employee module services.
- [ ] Build passes.
- [ ] Lint passes.

---

## Expected Outcome

After implementation, all future modules will have access to a centralized session validation utility that verifies the latest employee session state from the database, ensuring consistent service-level authorization checks throughout the application.
