## Current Feature

**003 — Authentication & Authorization Module**

Implement the complete Authentication and Authorization system for the backend: employee login, JWT access tokens, refresh-token rotation, logout, route protection via Guards, and Role-Based Access Control (RBAC). Tokens are delivered as httpOnly cookies. Active session state and the refresh-token hash are persisted on the Employee model. This is backend-only and must integrate with the existing Prisma 7 / PostgreSQL / NestJS architecture.

Spec: [specs/003-authentication.md](../specs/003-authentication.md)

## Status

Completed — implemented, built, linted, and manually verified end-to-end.

## Goal

Provide a secure auth layer: login with email + password, signed JWT access/refresh tokens, refresh-token rotation (one active refresh token per employee, stored only as a bcrypt hash), logout that invalidates the session, NestJS guards protecting routes, and RBAC for ADMIN vs EMPLOYEE.

---

## Dependencies to add (NOT currently installed)

Verified against [backend/package.json](../backend/package.json) — only `bcrypt`/`@types/bcrypt` are present. Need to install:

- `@nestjs/jwt` — JWT signing/verification.
- `@nestjs/passport`, `passport`, `passport-jwt` — Passport JWT strategy + AuthGuard.
- `@types/passport-jwt` (dev) — types for the strategy.
- `cookie-parser` + `@types/cookie-parser` (dev) — parse the `access_token` / `refresh_token` cookies so the JWT strategy and refresh flow can read them from `request.cookies`.

`bcrypt` (runtime) and `@types/bcrypt` (dev) are already installed (from feature 002).

---

## Environment variables — discrepancy to fix

The spec (line 202) states the JWT refresh vars are "already configured in `env.validation.ts`" — **they are not.** [backend/src/config/env.validation.ts](../backend/src/config/env.validation.ts) currently validates only `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`. Must add (required, boot-fails if missing — matches the env-context rule already used for the existing JWT vars):

```ts
@IsString() @IsNotEmpty() JWT_REFRESH_SECRET!: string;
@IsString() @IsNotEmpty() JWT_REFRESH_EXPIRES_IN!: string;
```

All JWT config must be read via `ConfigService` (no hardcoding) — mirror how `PrismaService` reads `DATABASE_URL`.

---

## Database changes

Add two fields to the `Employee` model in [backend/prisma/schema.prisma](../backend/prisma/schema.prisma):

```prisma
is_active          Boolean @default(false)
refresh_token_hash String?
```

- `is_active` — whether the employee currently has an active authenticated session.
- `refresh_token_hash` — bcrypt hash of the **current** valid refresh token. The raw refresh token is never stored.

**Migration:** `npx prisma migrate dev --name add_authentication_session_fields`. Existing data must be preserved (both fields have safe defaults / are nullable). After generating, regenerate the client and commit the migration. (Migration workflow / Prisma 7 adapter config established in feature 001 — use Context7 for current Prisma 7 docs if needed.)

---

## Module structure (per spec)

Create under `backend/src/auth/`:

```text
auth.module.ts
auth.controller.ts        # thin — POST /auth/login, /auth/refresh, /auth/logout
auth.service.ts           # all business logic
dto/login.dto.ts
guards/jwt-auth.guard.ts  # AuthGuard('jwt')
guards/roles.guard.ts
strategies/jwt.strategy.ts
decorators/roles.decorator.ts
interfaces/jwt-payload.interface.ts
```

- `AuthModule` imports `PrismaModule` (PrismaModule is NOT `@Global` — must be imported explicitly, per the feature-001 decision), `JwtModule` (registerAsync via ConfigService), `PassportModule`, and `ConfigModule` (global). Use `PrismaService` via DI ([backend/src/prisma/prisma.service.ts](../backend/src/prisma/prisma.service.ts)).
- Register `AuthModule` in [backend/src/app/app.module.ts](../backend/src/app/app.module.ts).

---

## main.ts changes

[backend/src/main.ts](../backend/src/main.ts) currently sets the `/api` prefix and shutdown hooks. Add:

1. `app.use(cookieParser())` — enable cookie reading.
2. Global `ValidationPipe` with `whitelist: true`, `transform: true`, and a custom `exceptionFactory` that maps validation errors to a **field-keyed object** for frontend consumption, e.g. `{ "email": "Invalid email format", "password": "Password is required" }` (spec "Global Validation Pipe" section).

---

## DTO

`dto/login.dto.ts`:

- `email`: `@IsEmail()` + `@Transform(({ value }) => value.trim().toLowerCase())`.
- `password`: `@IsString()` + `@IsNotEmpty()`. No strength validation on login.

---

## JWT payload + cookies

- `interfaces/jwt-payload.interface.ts`:

```ts
export interface JwtPayload {
  sub: string; // employee id
  email: string;
  role: Role; // import Role from generated Prisma enums
}
```

- Two cookies: `access_token` and `refresh_token`. Both `httpOnly`, `secure` in production only, `sameSite` protection. Set expiries to match the token TTLs.

---

## Login flow (`POST /auth/login` → `/api/auth/login`)

1. Find employee by `official_email`.
2. Verify exists; verify not soft-deleted (`is_deleted = false`).
3. Verify status allows login: **WORKING** or **ON_NOTICE** allowed; **RESIGNED** / **TERMINATED** blocked.
4. `bcrypt.compare(password, employee.password)`.
5. Generate access token (JWT_SECRET / JWT_EXPIRES_IN) and refresh token (JWT_REFRESH_SECRET / JWT_REFRESH_EXPIRES_IN).
6. `refresh_token_hash = bcrypt.hash(refreshToken)`; set `is_active = true`.
7. Set both httpOnly cookies.
8. Return `{ "success": true, "message": "Logged in successfully" }`.

Invalid email or password → `UnauthorizedException` (do not leak which one failed).

---

## JWT strategy

`strategies/jwt.strategy.ts` (passport-jwt):

- Extract access token from the `access_token` cookie (custom `jwtFromRequest` reading `req.cookies`).
- Verify signature + expiration (secret from ConfigService).
- In `validate(payload)`: load employee by `payload.sub`; reject if not found, soft-deleted, or `is_active = false`. Return the employee (attached to `request.user`).

`guards/jwt-auth.guard.ts` → `export class JwtAuthGuard extends AuthGuard('jwt') {}`.

---

## Refresh flow (`POST /auth/refresh` → `/api/auth/refresh`)

1. Read refresh token from `refresh_token` cookie.
2. Verify refresh token signature (JWT_REFRESH_SECRET).
3. Load employee; verify exists, `is_active = true`, not soft-deleted.
4. `bcrypt.compare(incomingRefreshToken, employee.refresh_token_hash)` — reject on mismatch.
5. Issue new access + new refresh token (**rotation** — old refresh token invalidated).
6. Store `bcrypt.hash(newRefreshToken)` replacing the old hash.
7. Update both cookies.
8. Return success response.

Only one active refresh token per employee. No DB writes on any invalid/expired/forged token.

---

## Logout flow (`POST /auth/logout` → `/api/auth/logout`)

- Protected with `@UseGuards(JwtAuthGuard)`.
- Set `is_active = false`, `refresh_token_hash = null`.
- Clear both cookies. Return success response.

---

## RBAC

- `decorators/roles.decorator.ts`: `export const Roles = (...roles: Role[]) => SetMetadata('roles', roles)` — usage `@Roles(Role.ADMIN)`.
- `guards/roles.guard.ts`: read required roles via `Reflector`, compare against `request.user.role`, allow/deny (`ForbiddenException` when role insufficient).
- Admin route pattern: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`.

---

## Security requirements (must all hold)

- Passwords verified with `bcrypt.compare`.
- Refresh token stored only as a bcrypt hash; raw token never persisted.
- Tokens delivered via httpOnly cookies (secure in prod, sameSite).
- All JWT config from environment via ConfigService.
- Requests rejected when: JWT signature invalid, JWT expired, employee missing, employee soft-deleted, employee inactive, or refresh-hash mismatch.
- **No DB updates on invalid JWT requests.**
- Use NestJS exceptions only (`UnauthorizedException`, `ForbiddenException`, etc.) — never raw errors (development-rules).

---

## Out of scope

Forgot/Reset/Change password, email verification, OTP, MFA, social auth, audit logs.

---

## Definition of Done (from spec)

**Database:** `is_active` + `refresh_token_hash` added; migration created & applied; existing data preserved; migration committed.
**Auth:** login, access-token gen, refresh-token gen, refresh rotation, logout — all implemented.
**Authorization:** JWT strategy, JwtAuthGuard, Roles decorator, RolesGuard.
**Validation:** LoginDto + global ValidationPipe (field-keyed errors).
**Security:** bcrypt password verify, refresh stored as hash, httpOnly cookies, JWT config from env, protected routes require valid JWT, admin routes enforce RBAC.
**Verification:** successful login creates active session; invalid email/password/JWT/refresh rejected; rotation works; logout invalidates session; inactive employee cannot refresh; `npm run build` passes; `npm run lint` passes; manual API testing completed.

---

## Notes / decisions

- Schema is the source of truth — do not invent fields. The only new fields are `is_active` and `refresh_token_hash`.
- **Env discrepancy:** `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` are NOT yet in `env.validation.ts` despite the spec's claim — add them (required).
- Login allows **WORKING and ON_NOTICE** (note: business-rules' reporting-manager rule about WORKING is unrelated to login eligibility).
- PrismaModule is imported explicitly (not `@Global`) — follow the feature-001 convention in AuthModule.
- Suggested branch: `feature/authentication` (git rule: `feature/<module>`).

## History

2026-06-09 — Reviewed spec 001 and all referenced context (prisma-schema, database-design, business-rules). Populated current-feature.md with scope, schema summary, and Definition of Done. Status: Not Started, ready to implement.
2026-06-09 — User confirmed soft delete required for every delete. Updated prisma-schema.md blueprint: added is_deleted + deleted_at + is_deleted index to Department, Employee, Asset, AssetRequest. AssetAllocationHistory left as immutable audit log.
2026-06-09 — Implemented & verified (001). Installed Prisma 7.8.0 with the PostgreSQL driver adapter (@prisma/adapter-pg), Query Compiler enabled. Per Prisma 7: prisma.config.ts holds the datasource url (env("DATABASE_URL"), loaded via dotenv/config) — the schema datasource no longer accepts url; the prisma-client generator (runtime nodejs, moduleFormat cjs) emits the client to src/generated/prisma (gitignored + eslint-ignored). Created the full schema (6 enums, 5 models + soft-delete fields, FKs/relations/indexes) per the blueprint. Built PrismaService (extends generated PrismaClient, builds PrismaPg adapter from ConfigService, onModuleInit→$connect, onModuleDestroy→$disconnect) and PrismaModule (providers/exports PrismaService; imported explicitly by feature modules — not @Global, per user preference). Added ConfigModule.forRoot({ isGlobal: true, validate }) with class-validator env validation (boots-fail on missing DATABASE_URL/JWT_SECRET/JWT_EXPIRES_IN); main.ts sets /api prefix + enableShutdownHooks(). Initial migration 20260609105719_init generated via prisma migrate dev (no db push) and applied. Verified: schema validates, client generates, migration applies; DB has 5 domain tables, 6 enums, 27 indexes, 7 FK constraints; npm run build compiles; runtime smoke test confirmed "Prisma connected" on startup and "Prisma disconnected" on app.close(); lint clean.
2026-06-10 — Started feature 002 (seed data). Reviewed spec 002 and re-read the live schema, database-design, package.json, and prisma.config.ts. Updated current-feature.md to the 002 plan: Prisma 7 seed wiring (config in prisma.config.ts, bcrypt to be added), the seed.ts + seed-data/ file layout, per-model seed requirements with exact enum values, the HR Admin bcrypt requirement, dependency-safe insert order (Departments → Employees → Assets), and the explicit exclusions (no allocations, no asset requests). Status: Not Started, ready to implement.
2026-06-10 — Implemented & verified (002). Branched feature/database-seed-data off main (after 001 merged). Added deps: bcrypt (runtime), @types/bcrypt + tsx (dev). Configured migrations.seed = 'tsx prisma/seed.ts' in prisma.config.ts. Runner change from plan: ts-node fails on the generated client's .js import specifiers (MODULE_NOT_FOUND: ./internal/class.js) under the nodenext tsconfig — verified by probe; switched to tsx, which resolves them natively. Created prisma/seed-data/{departments,employees,assets}\_seed_data.ts (data-only, typed, relationships referenced by business keys — department name, manager employee_code) and prisma/seed.ts (instantiates the generated PrismaClient via PrismaPg from DATABASE_URL/dotenv, mirroring PrismaService; hashes passwords with bcrypt rounds=10; inserts Departments → Employees → Assets via upsert for idempotency). Seeded 6 departments, 12 employees (incl. HR Admin hr.admin@company.com, role ADMIN), 19 assets across all 9 categories (statuses AVAILABLE/MAINTENANCE only). Verified: npx prisma db seed succeeds and is re-runnable (idempotent); admin password is bcrypt-hashed (bcrypt.compare true, not plaintext); 6 reporting-manager links resolve correctly (managers inserted before reports); 0 allocations / 0 allocation-history / 0 asset-requests and 0 allocated assets (out-of-scope exclusions honored); npm run build compiles; generated client remains gitignored. Status: Completed.

- 2026-06-11 — **Started feature 003 (authentication & authorization).** Read spec 003 and all referenced context (project-overview, prisma-schema, database-design, business-rules, api-contracts, development-rules) plus the live backend (schema, env.validation, main.ts, app.module, prisma.service, package.json). Rewrote current-feature.md with the 003 plan: required new deps (`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser` + types), the schema additions (`is_active`, `refresh_token_hash`) + migration `add_authentication_session_fields`, the full `src/auth` module layout, login/refresh/logout flows, JWT strategy + guards + RBAC, cookie/validation-pipe wiring in main.ts, and the Definition of Done. **Flagged two spec discrepancies:** (1) JWT refresh env vars are NOT actually configured in `env.validation.ts` (must be added)

- 2026-06-11 — **Implemented & verified (003).** Branched `feature/authentication` off main. Added deps `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser` (+ `@types/passport-jwt`, `@types/cookie-parser`). Added `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` (required) to `env.validation.ts` (they were already present in `.env`). Added `is_active Boolean @default(false)` + `refresh_token_hash String?` to the Employee model; generated & applied migration `20260611062935_add_authentication_session_fields` (additive `ALTER TABLE` only — existing seed data preserved: 12 employees / 6 departments / 19 assets intact); regenerated the client. Built the full `src/auth` module: thin controller (`POST /auth/login|refresh|logout`, `@HttpCode(200)`, `@Res({ passthrough:true })`), service with all logic, `LoginDto` (email `@Transform` trim+lowercase, password `@IsString/@IsNotEmpty`), `JwtStrategy` (cookie extractor, reloads employee, rejects missing/soft-deleted/inactive), `JwtAuthGuard`, `RolesGuard` + `@Roles` decorator (Reflector-based RBAC), interfaces. Wired `main.ts`: `cookieParser()` + global `ValidationPipe({ whitelist, transform })` with field-keyed `exceptionFactory`. Registered `AuthModule` in `app.module.ts` (imports PrismaModule explicitly, JwtModule.registerAsync via ConfigService — per-token secret/expiry passed explicitly when signing/verifying). Tokens delivered as httpOnly cookies (`secure` in prod, `sameSite: 'lax'`, maxAge mirrors TTL). **Two implementation decisions worth noting:** (a) `JwtSignOptions.expiresIn` requires the `ms` `StringValue` union, so the validated env string is cast to `JwtSignOptions['expiresIn']`; (b) **refresh-token rotation bug found during manual testing & fixed** — bcrypt only hashes the first 72 bytes, and two of the same employee's 249-byte refresh JWTs share their first 72 bytes (header + leading `sub`), so `bcrypt(rawToken)` could not distinguish them and the old token still validated after rotation. Fix (user-approved): SHA-256 the token to a 64-hex digest before `bcrypt.hash`/`bcrypt.compare` (still bcrypt + bcrypt.compare per spec). **Verified end-to-end against a running server:** valid login → 200 + both cookies + `is_active=true` + bcrypt hash stored; invalid email/password → 401 (generic, no leak); bad email format → 400 field-keyed (`{"email":...,"password":...}`); forged access token → 401; refresh rotation works and **invalidates the old token** (old → 401, current → 200); logout → 200 + `is_active=false` + `refresh_token_hash=null`; refresh after logout (inactive) → 401. `npm run build` and `npm run lint` both pass. **Tooling note:** Windows Defender false-positive-quarantined `node_modules/prisma/build/index.js` (`Trojan:JS/ShaiWorm.DBA!MTB`, ML heuristic) on install, blocking all Prisma CLI commands; confirmed false positive (only that one bundled file ever flagged, across every copy) — resolved via a scoped Defender folder exclusion + restore, then reinstalled. Status: Completed.
