## Current Feature

**005 — Employee Management Module**

Implement all employee-related backend APIs: full CRUD for administrators plus a self-profile endpoint for any authenticated employee. Follows the established architecture (Controller → Service → PrismaService → PostgreSQL) with all business logic confined to the service layer. Backend-only; **no schema changes** (the `Employee` model already exists with every field this feature needs).

Spec: [specs/005-employee-crud-apis.md](../specs/005-employee-crud-apis.md)

## Status

**Completed & verified** — all 7 endpoints implemented, built, linted, and manually tested end-to-end against a running server. Both open questions resolved: (1) `employee_code` is **auto-generated** (`EMPxxx`, sequential) in the service create transaction — not a DTO input; (2) messages live at the existing singular `src/constant/messages.constant.ts`.

## Goal

Provide secure employee APIs so administrators can fully manage employee records (create, list, read, update, change status, soft delete) and any authenticated employee can fetch their own profile — establishing the employee foundation that Department, Asset, Allocation, and Request features depend on.

---

## Scope

### Endpoints (all under global `/api` prefix — do **not** repeat `/api` in routes)

| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/employees` | ADMIN | List active (non-deleted) employees; pagination + search |
| GET | `/employees/me` | ADMIN, EMPLOYEE | Current authenticated employee's profile (from `request.user`) |
| GET | `/employees/:id` | ADMIN | Single employee (must exist, not deleted) |
| POST | `/employees` | ADMIN | Create employee |
| PATCH | `/employees/:id` | ADMIN | Update employee |
| PATCH | `/employees/:id/status` | ADMIN | Update employee status |
| DELETE | `/employees/:id` | ADMIN | Soft delete |

> **Route ordering:** declare `GET /employees/me` **before** `GET /employees/:id` in the controller so `me` is not captured as an `:id`.

### Module structure (`backend/src/employee`)

```text
employee.module.ts
employee.controller.ts        # thin — no business logic
employee.service.ts           # all rules live here, Prisma access here
dto/
  create-employee.dto.ts      # CreateEmployeeDto
  update-employee.dto.ts      # UpdateEmployeeDto extends PartialType(CreateEmployeeDto)
  update-employee-status.dto.ts
```

### Dependencies / wiring

- `EmployeeModule` imports `PrismaModule` and `AuthModule`.
- `EmployeeService` injects `PrismaService` and `AuthService`.
- Before running protected business logic, call the existing `AuthService.isUserActive(user)` (feature 004); if it returns `false`, throw `UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION)`.

---

## Authorization

- **Admin routes** (`GET /employees`, `GET /employees/:id`, `POST`, `PATCH /:id`, `PATCH /:id/status`, `DELETE /:id`): `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`.
- **Self route** (`GET /employees/me`): `@UseGuards(JwtAuthGuard)` only.

> **Naming note:** the spec writes `EmployeeRole.ADMIN`, but the generated enum in this codebase is `Role` (`src/generated/prisma/client`), and the existing `@Roles` decorator is typed `(...roles: Role[])`. Use `Role.ADMIN` for consistency with the auth module already in place.

---

## Business rules to enforce (service layer)

**Create** (`CreateEmployeeDto`):
- Required: `first_name`, `last_name`, `official_email`, `personal_email`, `password`, `role`, `department_name`, `present_address`, `permanent_address`, `joining_date`.
- Optional: `reporting_manager_official_email`.
- Resolve **`department_name` → `department_id`**: department must exist and not be soft deleted, else `BadRequest`/`NotFound` (`DEPARTMENT_NOT_FOUND`).
- `official_email` and `personal_email` must be unique → `ConflictException` (`EMAIL_ALREADY_EXISTS`).
- Resolve **`reporting_manager_official_email` → `reporting_manager_id`** when provided: manager must exist, not be deleted, have `status = WORKING`, and cannot be the employee themselves → `REPORTING_MANAGER_NOT_FOUND` / appropriate `BadRequest`.
- Hash `password` with `bcrypt.hash()` before persistence.
- Server-set defaults: `status = WORKING`, `is_deleted = false`, `is_active = false`, `refresh_token_hash = null`, `deleted_at = null`. DB generates `id`, `created_at`, `updated_at`.
- **Reject system-managed fields if sent in the body**: `id`, `status`, `created_at`, `updated_at`, `deleted_at`, `is_deleted`, `is_active`, `refresh_token_hash` (the global `ValidationPipe({ whitelist: true })` already strips unknown props; keep these out of the DTO).

**Update** (`UpdateEmployeeDto extends PartialType(CreateEmployeeDto)`):
- Employee must exist and not be deleted.
- Re-validate uniqueness for any changed email, re-validate department/manager if changed, re-hash password if provided.

**Update status** (`UpdateEmployeeStatusDto`):
- `@IsEnum(EmployeeStatus)` — one of `WORKING | ON_NOTICE | RESIGNED | TERMINATED`.
- Admin only. Employee history must never be deleted (status change only).

**Soft delete** (`DELETE /:id`):
- Employee must exist and not already be deleted.
- Set `is_deleted = true`, `deleted_at = new Date()`. Never physically remove.

---

## Security / response safety

- **Never** return `password`, `refresh_token_hash`, `is_deleted`, `deleted_at`, `created_at`, `updated_at` from any employee endpoint — select an explicit safe field set (do not `select` the excluded columns) rather than fetching-then-deleting.
- Include `department` info, and `reporting_manager` info when present, in list/detail responses.
- All list/read queries must exclude soft-deleted employees (`where: { is_deleted: false }`).
- Passwords always stored as bcrypt hashes, never plain text.

---

## DTO validation

`class-validator` / `class-transformer`: `@IsString()`, `@IsNotEmpty()`, `@IsEmail()` (emails), `@IsEnum(Role)` (role), `@IsEnum(EmployeeStatus)` (status DTO), `@IsDateString()` (`joining_date`), `@IsOptional()` (`reporting_manager_official_email`). Mirror the existing `LoginDto` style (trim/lowercase emails via `@Transform` where appropriate).

## Messages

Add a new `EmployeeMessages` object to the **existing** `backend/src/constant/messages.constant.ts` (singular `constant/` — matching the established codebase layout, **not** the spec's plural `src/constants/`). Suggested keys: `EMPLOYEE_NOT_FOUND`, `EMPLOYEE_CREATED_SUCCESSFULLY`, `EMPLOYEE_UPDATED_SUCCESSFULLY`, `EMPLOYEE_DELETED_SUCCESSFULLY`, `EMPLOYEE_ALREADY_DELETED`, `DEPARTMENT_NOT_FOUND`, `EMAIL_ALREADY_EXISTS`, `REPORTING_MANAGER_NOT_FOUND`, `CANNOT_REPORT_TO_SELF`. No hardcoded strings at throw sites.

---

## Open questions (resolve before/while implementing)

1. **`employee_code`** — the schema requires `employee_code String @unique` (no default), but the spec's `CreateEmployeeDto` does **not** list it as an input. Decision needed: auto-generate it in the service (e.g. a sequence/prefix scheme, as the seed data used as a business key) **or** add it to the DTO as a required unique input. Cannot create an employee without one.
2. **Messages directory** — spec says `src/constants/` (plural); codebase uses `src/constant/` (singular). Plan follows the existing singular path for consistency; confirm this is acceptable.

---

## Definition of Done (from spec)

- [x] APIs: Get All, Get By Id, Create, Update, Update Status, Soft Delete, Get Current — all implemented.
- [x] DTOs: `CreateEmployeeDto`, `UpdateEmployeeDto`, `UpdateEmployeeStatusDto` implemented with validation.
- [x] Admin routes protected with `JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)`; `/employees/me` protected with `JwtAuthGuard`.
- [x] Department, reporting-manager, email-uniqueness validation + password hashing + soft delete implemented.
- [x] Sensitive fields excluded from all responses; passwords stored as bcrypt hashes.
- [x] Soft-deleted employees excluded from queries; unauthorized/role-restricted access blocked.
- [x] `AuthService.isUserActive` inactive-session guard wired in.
- [x] `npm run build` passes; `npm run lint` passes; manual API testing completed.

---

## Notes / decisions

- Schema is the source of truth — no invented fields. The `Employee` model already carries everything (`status`, `is_active`, `refresh_token_hash`, soft-delete fields, reporting-manager self-relation), so **no migration is required** for this feature.
- Reuses the auth module built in features 003/004: `JwtAuthGuard`, `RolesGuard`, `@Roles(Role.ADMIN)`, and the exported `AuthService.isUserActive`.
- Input uses business keys (`department_name`, `reporting_manager_official_email`) which the service resolves to FKs (`department_id`, `reporting_manager_id`) — consistent with how the seed data referenced relationships by business key.
- Suggested branch: `feature/employee-module` (per development-rules git naming).

## History

2026-06-09 — Reviewed spec 001 and all referenced context (prisma-schema, database-design, business-rules). Populated current-feature.md with scope, schema summary, and Definition of Done. Status: Not Started, ready to implement.
2026-06-09 — User confirmed soft delete required for every delete. Updated prisma-schema.md blueprint: added is_deleted + deleted_at + is_deleted index to Department, Employee, Asset, AssetRequest. AssetAllocationHistory left as immutable audit log.
2026-06-09 — Implemented & verified (001). Installed Prisma 7.8.0 with the PostgreSQL driver adapter (@prisma/adapter-pg), Query Compiler enabled. Per Prisma 7: prisma.config.ts holds the datasource url (env("DATABASE_URL"), loaded via dotenv/config) — the schema datasource no longer accepts url; the prisma-client generator (runtime nodejs, moduleFormat cjs) emits the client to src/generated/prisma (gitignored + eslint-ignored). Created the full schema (6 enums, 5 models + soft-delete fields, FKs/relations/indexes) per the blueprint. Built PrismaService (extends generated PrismaClient, builds PrismaPg adapter from ConfigService, onModuleInit→$connect, onModuleDestroy→$disconnect) and PrismaModule (providers/exports PrismaService; imported explicitly by feature modules — not @Global, per user preference). Added ConfigModule.forRoot({ isGlobal: true, validate }) with class-validator env validation (boots-fail on missing DATABASE_URL/JWT_SECRET/JWT_EXPIRES_IN); main.ts sets /api prefix + enableShutdownHooks(). Initial migration 20260609105719_init generated via prisma migrate dev (no db push) and applied. Verified: schema validates, client generates, migration applies; DB has 5 domain tables, 6 enums, 27 indexes, 7 FK constraints; npm run build compiles; runtime smoke test confirmed "Prisma connected" on startup and "Prisma disconnected" on app.close(); lint clean.
2026-06-10 — Started feature 002 (seed data). Reviewed spec 002 and re-read the live schema, database-design, package.json, and prisma.config.ts. Updated current-feature.md to the 002 plan: Prisma 7 seed wiring (config in prisma.config.ts, bcrypt to be added), the seed.ts + seed-data/ file layout, per-model seed requirements with exact enum values, the HR Admin bcrypt requirement, dependency-safe insert order (Departments → Employees → Assets), and the explicit exclusions (no allocations, no asset requests). Status: Not Started, ready to implement.
2026-06-10 — Implemented & verified (002). Branched feature/database-seed-data off main (after 001 merged). Added deps: bcrypt (runtime), @types/bcrypt + tsx (dev). Configured migrations.seed = 'tsx prisma/seed.ts' in prisma.config.ts. Runner change from plan: ts-node fails on the generated client's .js import specifiers (MODULE_NOT_FOUND: ./internal/class.js) under the nodenext tsconfig — verified by probe; switched to tsx, which resolves them natively. Created prisma/seed-data/{departments,employees,assets}\_seed_data.ts (data-only, typed, relationships referenced by business keys — department name, manager employee_code) and prisma/seed.ts (instantiates the generated PrismaClient via PrismaPg from DATABASE_URL/dotenv, mirroring PrismaService; hashes passwords with bcrypt rounds=10; inserts Departments → Employees → Assets via upsert for idempotency). Seeded 6 departments, 12 employees (incl. HR Admin hr.admin@company.com, role ADMIN), 19 assets across all 9 categories (statuses AVAILABLE/MAINTENANCE only). Verified: npx prisma db seed succeeds and is re-runnable (idempotent); admin password is bcrypt-hashed (bcrypt.compare true, not plaintext); 6 reporting-manager links resolve correctly (managers inserted before reports); 0 allocations / 0 allocation-history / 0 asset-requests and 0 allocated assets (out-of-scope exclusions honored); npm run build compiles; generated client remains gitignored. Status: Completed.

- 2026-06-11 — **Started feature 003 (authentication & authorization).** Read spec 003 and all referenced context (project-overview, prisma-schema, database-design, business-rules, api-contracts, development-rules) plus the live backend (schema, env.validation, main.ts, app.module, prisma.service, package.json). Rewrote current-feature.md with the 003 plan: required new deps (`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser` + types), the schema additions (`is_active`, `refresh_token_hash`) + migration `add_authentication_session_fields`, the full `src/auth` module layout, login/refresh/logout flows, JWT strategy + guards + RBAC, cookie/validation-pipe wiring in main.ts, and the Definition of Done. **Flagged two spec discrepancies:** (1) JWT refresh env vars are NOT actually configured in `env.validation.ts` (must be added)

- 2026-06-11 — **Implemented & verified (003).** Branched `feature/authentication` off main. Added deps `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser` (+ `@types/passport-jwt`, `@types/cookie-parser`). Added `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` (required) to `env.validation.ts` (they were already present in `.env`). Added `is_active Boolean @default(false)` + `refresh_token_hash String?` to the Employee model; generated & applied migration `20260611062935_add_authentication_session_fields` (additive `ALTER TABLE` only — existing seed data preserved: 12 employees / 6 departments / 19 assets intact); regenerated the client. Built the full `src/auth` module: thin controller (`POST /auth/login|refresh|logout`, `@HttpCode(200)`, `@Res({ passthrough:true })`), service with all logic, `LoginDto` (email `@Transform` trim+lowercase, password `@IsString/@IsNotEmpty`), `JwtStrategy` (cookie extractor, reloads employee, rejects missing/soft-deleted/inactive), `JwtAuthGuard`, `RolesGuard` + `@Roles` decorator (Reflector-based RBAC), interfaces. Wired `main.ts`: `cookieParser()` + global `ValidationPipe({ whitelist, transform })` with field-keyed `exceptionFactory`. Registered `AuthModule` in `app.module.ts` (imports PrismaModule explicitly, JwtModule.registerAsync via ConfigService — per-token secret/expiry passed explicitly when signing/verifying). Tokens delivered as httpOnly cookies (`secure` in prod, `sameSite: 'lax'`, maxAge mirrors TTL). **Two implementation decisions worth noting:** (a) `JwtSignOptions.expiresIn` requires the `ms` `StringValue` union, so the validated env string is cast to `JwtSignOptions['expiresIn']`; (b) **refresh-token rotation bug found during manual testing & fixed** — bcrypt only hashes the first 72 bytes, and two of the same employee's 249-byte refresh JWTs share their first 72 bytes (header + leading `sub`), so `bcrypt(rawToken)` could not distinguish them and the old token still validated after rotation. Fix (user-approved): SHA-256 the token to a 64-hex digest before `bcrypt.hash`/`bcrypt.compare` (still bcrypt + bcrypt.compare per spec). **Verified end-to-end against a running server:** valid login → 200 + both cookies + `is_active=true` + bcrypt hash stored; invalid email/password → 401 (generic, no leak); bad email format → 400 field-keyed (`{"email":...,"password":...}`); forged access token → 401; refresh rotation works and **invalidates the old token** (old → 401, current → 200); logout → 200 + `is_active=false` + `refresh_token_hash=null`; refresh after logout (inactive) → 401. `npm run build` and `npm run lint` both pass. **Tooling note:** Windows Defender false-positive-quarantined `node_modules/prisma/build/index.js` (`Trojan:JS/ShaiWorm.DBA!MTB`, ML heuristic) on install, blocking all Prisma CLI commands; confirmed false positive (only that one bundled file ever flagged, across every copy) — resolved via a scoped Defender folder exclusion + restore, then reinstalled. Status: Completed.

- 2026-06-11 — **Implemented & verified (004 — AuthService session-validation utility).** Read spec `specs/004-auth-validity.md`. Added a small, forward-looking helper for future modules. Changes: (1) created `backend/src/types/express.d.ts` — declaration merging `interface User extends AuthenticatedUser` under `namespace Express` (reuses the existing `AuthenticatedUser` interface; not redefined), so `request.user` / `Express.User` carries `id`/`email`/`role`. `tsconfig.json` has no `include`, so `src/**` (incl. `.d.ts`) is already compiled and the merge auto-discovers; disabled ESLint `@typescript-eslint/no-empty-object-type` on that one line since the empty body is the intended merge pattern. (2) Added `AuthService.isUserActive(user: Express.User): Promise<boolean>` — `findUnique` on `user.id` with `select: { is_active: true }`, returns `employee?.is_active ?? false`; read-only (no writes, no token generation, no session mutation), always reads the live DB value rather than the JWT payload. (3) `AuthModule` now `exports: [AuthService]` so future Employee/Department/Asset/Allocation/Request modules can inject it (they must also import `AuthModule`). (4) Added `AuthMessages.UNAUTHORIZED_EXCEPTION = 'User session is inactive'`. **Deviation from spec:** placed the messages constant at `backend/src/constant/messages.constant.ts` (singular `constant/`) to match the existing `src/constant/values.constant.ts`, not the spec's plural `src/constants/`. **Integration deferred:** the DoD item "used by Employee module services" cannot be completed yet — no Employee/Department/Asset modules exist; the utility is ready and exported for them to consume. `npm run build` and `npm run lint` both pass. Status: Completed.

- 2026-06-11 — **Started feature 005 (Employee Management Module).** Read spec `specs/005-employee-crud-apis.md` and all referenced context (project-overview, business-rules, database-design, development-rules, prisma-schema, api-contracts) plus the live backend (Employee schema model, auth module: `@Roles`/`Role`, guards, `AuthenticatedUser`, `AuthService.isUserActive`, `messages.constant.ts`). Rewrote current-feature.md with the 005 plan: 7 endpoints (CRUD + status + soft delete + `/employees/me`), the `src/employee` module layout (thin controller, service-only logic, 3 DTOs), authorization matrix (`JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)` for admin routes; `JwtAuthGuard` for `/me`), full business-rule set (department/manager/email-uniqueness validation, bcrypt hashing, server-set defaults, soft delete, inactive-session guard via `AuthService.isUserActive`), response-safety field exclusions, DTO validation decorators, and the new `EmployeeMessages` constant. **No schema change / no migration** — the Employee model already has every field. **Flagged two discrepancies:** (1) spec says `EmployeeRole.ADMIN` but the codebase enum is `Role` (use `Role.ADMIN`); (2) `employee_code` is a required `@unique` schema field absent from the spec's CreateEmployeeDto — needs a decision (auto-generate vs. accept as input). Also noted route ordering (`/me` before `/:id`) and the singular `constant/` messages path. Status: Not Started, ready to implement.

- 2026-06-11 — **Implemented & verified (005 — Employee Management Module).** Branched `feature/employee-crud-apis` off main. Installed `@nestjs/mapped-types@2.1.1` (was missing) for `PartialType` in `UpdateEmployeeDto`. Created `src/employee/` (module, thin controller, service, 3 DTOs). **Decisions:** (1) `employee_code` auto-generated `EMPxxx` (user-approved) — `generateEmployeeCode(tx)` reads the current max inside the create `$transaction` and increments (zero-padded to 3), matching the seed convention; not a DTO field. (2) Used `Role.ADMIN` (codebase enum), not the spec's `EmployeeRole`. (3) Messages added as `EmployeeMessages` in the existing singular `src/constant/messages.constant.ts`; added `PASSWORD_HASH_ROUNDS` (10) + list-limit constants to `values.constant.ts`. **Service design:** every admin method calls `assertActiveSession` → `AuthService.isUserActive` (throws `UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION)` if inactive); a single `EMPLOYEE_SAFE_SELECT` (typed `satisfies Prisma.EmployeeSelect`) is the only projection used by every endpoint, so `password`/`refresh_token_hash`/`is_active`/`is_deleted`/`deleted_at`/`created_at`/`updated_at` are never selected; includes `department` + `reporting_manager` summaries. Business keys (`department_name`, `reporting_manager_official_email`) resolved to FKs in the service; email-uniqueness checked across **all** rows (the `@unique` constraint spans soft-deleted too); manager must exist + not deleted + WORKING + not self; password bcrypt-hashed; create sets server defaults explicitly; P2002 races mapped to friendly conflicts via `toWriteError`. Controller: `@Query` page/limit/search (parsed+clamped in service), `ParseUUIDPipe` on `:id`, `/employees/me` declared before `/:id`. **Return shapes:** list → `{ data, pagination }`; reads → safe employee; mutations → `{ message, data }`; delete → `{ message }`. Registered `EmployeeModule` in `app.module.ts`. **Manual testing — 23 scenarios, all pass** against a running server (admin `Admin@123`): login; `/me`; paginated list (total 12, safe fields); search; create (auto `EMP013`, w/ manager); duplicate-email 409; bad-department 404; self-report 400; manager-not-WORKING 400 (anika.verma ON_NOTICE); DTO validation 400 (bad email + short password, field-keyed); update (name+dept); status update; bad-enum 400; bad-UUID 400; soft delete; double-delete 400; soft-deleted excluded from GET/:id (404) & list; unauthenticated 401; EMPLOYEE→admin routes 403; EMPLOYEE→`/me` 200. Note: seeded **employee** passwords don't match the current `.env` `SEED_EMPLOYEE_PASSWORD` (admin does) — RBAC tested via a freshly-created known-password account. Test rows (EMP013/EMP014) hard-deleted afterward; DB back to the original 12 seeded employees. `npm run build` and `npm run lint` both pass. Status: Completed.
