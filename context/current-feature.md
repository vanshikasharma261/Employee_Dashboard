## Current Feature

**006 — Department Management Module**

Implement the Department Management backend APIs: full CRUD for administrators (list, create, update, soft delete) over the `Department` model. Follows the established architecture (Controller → Service → PrismaService → PostgreSQL) with all business logic confined to the service layer, mirroring the Employee module (feature 005). Backend-only; **no schema changes** (the `Department` model already exists with every field this feature needs).

Spec: [specs/006-department-crud-apis.md](../specs/006-department-crud-apis.md)

## Status

**Completed** — module built at `backend/src/department`, wired into `app.module.ts`, build + lint clean, and manually verified end-to-end against a running server (see History 2026-06-12).

## Goal

Provide secure department APIs so administrators can fully manage departments (list with pagination/search + employee counts, create, update, soft delete) with case-insensitive name uniqueness and an employee-dependency guard on deletion — establishing the department foundation that Employee, Asset, Allocation, and Request features depend on.

---

## Scope

### Endpoints (all under global `/api` prefix — do **not** repeat `/api` in routes)

| Method | Route              | Access | Purpose                                                                                   |
| ------ | ------------------ | ------ | ----------------------------------------------------------------------------------------- |
| GET    | `/departments`     | ADMIN  | List active (non-deleted) departments; pagination + search; employee count per department |
| POST   | `/departments`     | ADMIN  | Create department                                                                         |
| PATCH  | `/departments/:id` | ADMIN  | Update department                                                                         |
| DELETE | `/departments/:id` | ADMIN  | Soft delete (blocked if active employees assigned)                                        |

### Module structure (`backend/src/department`)

```text
department.module.ts
department.controller.ts          # thin — no business logic
department.service.ts             # all rules live here, Prisma access here
dto/
  create-department.dto.ts        # CreateDepartmentDto
  update-department.dto.ts        # UpdateDepartmentDto extends PartialType(CreateDepartmentDto)
  list-departments-query.dto.ts   # ListDepartmentsQueryDto (page/limit/search) — mirrors ListEmployeesQueryDto
```

> The spec's module structure omits a list-query DTO, but the established codebase pattern (feature 005) validates `page`/`limit`/`search` via a dedicated `Query()` DTO so the controller stays thin and bad input is rejected with a 400 by the global `ValidationPipe`. Add `ListDepartmentsQueryDto` to match.

### Dependencies / wiring

- `DepartmentModule` imports `PrismaModule` and `AuthModule`.
- `DepartmentService` injects `PrismaService` and `AuthService`.
- Register `DepartmentModule` in `app.module.ts`.
- Before running protected business logic, call the existing `AuthService.isUserActive(user)` (feature 004); if it returns `false`, throw `UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION)`. Reuse the same `assertActiveSession` helper shape used in `EmployeeService`.

---

## Authorization

- **All routes** (`GET`, `POST`, `PATCH /:id`, `DELETE /:id`): `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`.
- `ParseUUIDPipe` on the `:id` param (consistent with the Employee controller).

> **Naming note:** the spec writes `Role.ADMIN` directly here (consistent with the codebase enum at `src/generated/prisma/client`) — no `EmployeeRole` discrepancy this time.

---

## Business rules to enforce (service layer)

**List** (`GET /departments`):

- Exclude soft-deleted departments (`where: { is_deleted: false }`).
- Order by `created_at` (spec: "ordered by creation date").
- Return an **employee count** per department — count **active** employees only (`_count` with `where: { is_deleted: false }`), consistent with the delete dependency rule below.
- Support pagination (`page`, `limit`) and case-insensitive `search` on `name` (Prisma `contains` + `mode: 'insensitive'`).
- **Never** return `is_deleted`, `deleted_at`, `created_at`, `updated_at` — select an explicit safe field set (`id`, `name`, employee count) rather than fetch-then-delete.

**Create** (`CreateDepartmentDto`):

- Required: `name` only.
- **Case-insensitive uniqueness** against **active** departments: before insert, query `findFirst({ where: { name: { equals: dto.name, mode: 'insensitive' }, is_deleted: false } })`; if found → `ConflictException(DepartmentMessages.DEPARTMENT_ALREADY_EXISTS)`. ("Human Resources" and "human resources" are duplicates.)
- Server-set defaults: `is_deleted = false`, `deleted_at = null`. DB generates `id`, `created_at`, `updated_at`.
- **Reject system-managed fields if sent in the body**: `id`, `is_deleted`, `deleted_at`, `created_at`, `updated_at` (the global `ValidationPipe({ whitelist: true })` strips unknown props; keep these out of the DTO).
- Return the newly created department (safe field set).

**Update** (`UpdateDepartmentDto extends PartialType(CreateDepartmentDto)`):

- Department must exist and not be soft deleted → else `NotFoundException(DEPARTMENT_NOT_FOUND)`.
- If `name` changes, re-validate case-insensitive uniqueness against active departments **excluding the current row** (`id: { not: id }`).
- Return the updated department (safe field set).

**Soft delete** (`DELETE /:id`):

- Department must exist and not already be deleted → `NotFoundException` / appropriate exception.
- **Employee-dependency guard:** if any **active** employee belongs to the department (`employee.count({ where: { department_id: id, is_deleted: false } }) > 0`), throw `BadRequestException(DepartmentMessages.DEPARTMENT_HAS_EMPLOYEES)`.
- Set `is_deleted = true`, `deleted_at = new Date()`. Never physically remove.
- Return a success message.

---

## DTO validation

`class-validator` / `class-transformer`:

- `CreateDepartmentDto.name`: `@IsString()`, `@IsNotEmpty()`, `@Transform(({ value }) => value.trim())` (mirror the spec). Consider `@MaxLength` for safety, consistent with the search-length constants pattern.
- `UpdateDepartmentDto`: `export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}` (uses `@nestjs/mapped-types`, already installed for feature 005).
- `ListDepartmentsQueryDto`: copy `ListEmployeesQueryDto` (optional `page`/`limit` as `@Type(() => Number) @IsInt() @Min(1)`, optional trimmed `search` string with `@MaxLength`).

## Messages

Add a new `DepartmentMessages` object to the **existing** singular `backend/src/constant/messages.constant.ts` (matching the established layout, **not** the spec's plural `src/constants/`). Keys:

```ts
export const DepartmentMessages = {
  DEPARTMENT_NOT_FOUND: "Department not found",
  DEPARTMENT_ALREADY_EXISTS: "Department already exists",
  DEPARTMENT_CREATED_SUCCESSFULLY: "Department created successfully",
  DEPARTMENT_UPDATED_SUCCESSFULLY: "Department updated successfully",
  DEPARTMENT_DELETED_SUCCESSFULLY: "Department deleted successfully",
  DEPARTMENT_HAS_EMPLOYEES:
    "Department cannot be deleted while employees are assigned",
} as const;
```

> Note: `EmployeeMessages` already defines `DEPARTMENT_NOT_FOUND` (used when resolving a department for an employee). Keep the department-module copy under `DepartmentMessages` so each module owns its wording; don't reach across into `EmployeeMessages`. No hardcoded strings at throw sites.

---

## Discrepancies / decisions flagged

1. **Spec title** — corrected: the spec file `006-department-crud-apis.md` heading was "Feature 005 …" and is now "Feature 006 — Department Management Module" (005 was the Employee module, already completed).
2. **DB unique constraint vs. spec's "active-only, case-insensitive" rule** — the schema declares `name String @unique`, which is a **case-sensitive** constraint spanning **all** rows (including soft-deleted). The spec wants (a) _case-insensitive_ uniqueness and (b) checked only against _active_ departments. Implications:
   - Case-insensitivity must be enforced in the **service** (Prisma `mode: 'insensitive'` query) — the DB `@unique` alone won't catch `"HR"` vs `"hr"`.
   - The DB `@unique` will still **reject re-creating a name that exactly matches a soft-deleted department's name**, even though the spec's active-only check would allow it. Same tension noted for employee email-uniqueness in feature 005. **Decision:** enforce the spec's active-only + case-insensitive check in the service, and additionally catch Prisma `P2002` and map it to `DEPARTMENT_ALREADY_EXISTS` (friendly conflict) for the soft-deleted-collision edge case. No schema change for this feature. (If the business truly needs to reuse soft-deleted names, that's a separate schema decision — out of scope here.)
3. **Employee count semantics** — "employee count for each department" counted as **active** employees (`is_deleted: false`), aligning with the delete guard. Confirm if the total (including soft-deleted) is wanted instead.
4. **Messages path** — singular `src/constant/` (as in 003/004/005), not the spec's plural `src/constants/`.

---

## Definition of Done (from spec)

- [x] APIs: Get All, Create, Update, Soft Delete — all implemented.
- [x] DTOs: `CreateDepartmentDto`, `UpdateDepartmentDto` (+ `ListDepartmentsQueryDto`) with validation.
- [x] All routes protected with `JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)`; service-level `AuthService.isUserActive` session guard wired in.
- [x] Case-insensitive department-name uniqueness enforced (create + update).
- [x] Soft delete implemented; soft-deleted departments excluded from queries; internal fields never returned.
- [x] Department deletion blocked when active employees are assigned.
- [x] No hardcoded exception messages (`DepartmentMessages`).
- [x] `npm run build` passes; `npm run lint` passes; manual API testing completed (create dup blocked, delete-with-employees blocked, soft-deleted excluded).

---

## Notes / decisions

- Schema is the source of truth — no invented fields. The `Department` model carries only `id`, `name`, `employees[]`, soft-delete fields, and timestamps (**no `description`** field), so **no migration is required**.
- Reuses the auth module (003/004): `JwtAuthGuard`, `RolesGuard`, `@Roles(Role.ADMIN)`, exported `AuthService.isUserActive`.
- Mirror the Employee module patterns: a single safe `select` projection reused by every endpoint, `assertActiveSession` helper, `{ data, pagination }` list shape, `{ message, data }` mutation shape, `{ message }` delete shape, `ParseUUIDPipe` on `:id`, and a `toWriteError`-style `P2002` mapper for race-safe conflicts.
- Suggested branch: `feature/department-crud-apis` (per development-rules git naming).

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

- 2026-06-11 — **Started feature 006 (Department Management Module).** Read spec `specs/006-department-crud-apis.md` and re-checked the live backend (Department schema model, Employee module patterns from 005, `messages.constant.ts`, `ListEmployeesQueryDto`). Rewrote current-feature.md with the 006 plan: 4 admin endpoints (list w/ pagination+search+employee-count, create, update, soft delete) under `src/department` (thin controller, service-only logic, `CreateDepartmentDto` / `UpdateDepartmentDto` / added `ListDepartmentsQueryDto`), all routes `JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)` + service-level `AuthService.isUserActive` guard, case-insensitive active-only name uniqueness (create + update), soft delete with an active-employee dependency guard, a new `DepartmentMessages` constant, and a safe `select` that hides internal fields. **No schema change / no migration** — the `Department` model already has every field (note: **no `description` field** exists — don't invent one). **Flagged four items:** (1) the DB `name @unique` is case-sensitive and spans soft-deleted rows, so case-insensitivity + active-only must be enforced in the service, with a `P2002` fallback mapped to `DEPARTMENT_ALREADY_EXISTS` for the soft-deleted-name-collision edge case; (2) employee count interpreted as active employees only; (3) singular `constant/` messages path (not the spec's plural). Status: Not Started, ready to implement.

- 2026-06-12 — **Implemented & verified (006 — Department Management Module).** Built `src/department/` (module, thin controller, service, 3 DTOs) mirroring the 005 Employee patterns. **Controller:** `@Controller('departments')` with class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` (all 4 routes admin-only); `ParseUUIDPipe` on `:id`. **Service:** every method calls `assertActiveSession` → `AuthService.isUserActive` (throws `UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION)` if inactive); a single `DEPARTMENT_SAFE_SELECT` (`satisfies Prisma.DepartmentSelect`) projecting only `id`, `name`, and a **filtered `_count`** of active employees (`employees: { where: { is_deleted: false } }`) — so `is_deleted`/`deleted_at`/`created_at`/`updated_at` are never selected; a `toDepartment` mapper reshapes the row to `{ id, name, employee_count }`. List: `is_deleted: false`, ordered by `created_at asc`, case-insensitive `contains` search on `name`, `{ data, pagination }` shape (page/limit clamped in service). Create/Update: case-insensitive active-only uniqueness via `assertNameAvailable` (`equals` + `mode: 'insensitive'`, `is_deleted: false`, `NOT: { id }` on update); `P2002` mapped to `DEPARTMENT_ALREADY_EXISTS` via `toWriteError` (catches the soft-deleted-name collision the DB `@unique` enforces). Delete: existence + already-deleted guard, then `employee.count({ department_id, is_deleted: false }) > 0` → `BadRequestException(DEPARTMENT_HAS_EMPLOYEES)`, else set `is_deleted/deleted_at`. **Constants:** added `DepartmentMessages` to `src/constant/messages.constant.ts` (incl. an extra `DEPARTMENT_ALREADY_DELETED` for the double-delete case) and department list/name length limits to `values.constant.ts`. Registered `DepartmentModule` in `app/app.module.ts`. **Manual testing — 18 scenarios, all pass** against a running server (admin `Admin@123`): list (6 depts, safe fields, employee counts, pagination); create dup (case-insensitive) 409; create `'  Legal  '` trimmed → 201; case-insensitive dup 409; empty name 400; update 200; update→existing-name 409; update non-existent 404; bad-UUID 400; delete Finance (2 employees) → 400 `DEPARTMENT_HAS_EMPLOYEES`; delete Legal (no employees) → 200; double-delete → 400; soft-deleted excluded from list (total back to 6); case-insensitive search; delete bad-UUID 400; recreate-dup 409 message; unauthenticated 401; EMPLOYEE→department routes 403 (via a temp account). Test rows (temp employee + Legal department) hard-deleted afterward via a throwaway tsx script; DB back to the original 6 departments / 12 employees. **One EADDRINUSE gotcha:** a stale pre-session server held port 3000 (served 404 for the new routes) — killed it and restarted before testing. `npm run build` and `npm run lint` both pass. Status: Completed.
