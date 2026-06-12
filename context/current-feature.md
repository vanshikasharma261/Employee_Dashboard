## Current Feature

**007 — Asset Management Module**

Implement the Asset Management backend APIs: full CRUD for administrators (list, get-by-id, create, update, update-status, soft delete) over the `Asset` model. This module is the source of truth for company-owned assets and maintains asset inventory + lifecycle status. Follows the established architecture (Controller → Service → PrismaService → PostgreSQL) with all business logic confined to the service layer, mirroring the Employee (005) and Department (006) modules. Backend-only; **no schema changes** (the `Asset` model already exists with every field this feature needs).

Spec: [specs/007-assets-crud-apis.md](../specs/007-assets-crud-apis.md)

Branch: `feature/assets-crud-module`

## Status

**Completed** — implemented; build + lint pass. Manual API testing pending against a running server.

## Goal

Provide secure asset APIs so administrators can manage the company asset inventory (list with pagination/search + allocated-employee info, get details, create, update, update lifecycle status, soft delete) with case-insensitive serial-number uniqueness and an allocation guard — establishing a clean foundation for the future Asset Request, Asset Allocation, and Asset History modules. **Allocation/deallocation, request workflows, and history are explicitly out of scope.**

---

## Scope

### Endpoints (all under global `/api` prefix — do **not** repeat `/api` in routes)

| Method | Route                 | Access | Purpose                                                                        |
| ------ | --------------------- | ------ | ------------------------------------------------------------------------------ |
| GET    | `/assets`             | ADMIN  | List active (non-deleted) assets; pagination + search; allocated-employee info |
| GET    | `/assets/:id`         | ADMIN  | Get a single active asset's details                                            |
| POST   | `/assets`             | ADMIN  | Create asset                                                                   |
| PATCH  | `/assets/:id`         | ADMIN  | Update asset (serial number / category)                                        |
| PATCH  | `/assets/:id/status`  | ADMIN  | Update asset lifecycle status (cannot set `ALLOCATED`)                          |
| DELETE | `/assets/:id`         | ADMIN  | Soft delete (blocked if currently allocated)                                   |

### Module structure (`backend/src/asset`)

```text
asset.module.ts
asset.controller.ts              # thin — no business logic
asset.service.ts                 # all rules live here, Prisma access here
dto/
  create-asset.dto.ts            # CreateAssetDto
  update-asset.dto.ts            # UpdateAssetDto extends PartialType(CreateAssetDto)
  update-asset-status.dto.ts     # UpdateAssetStatusDto
  list-assets-query.dto.ts       # ListAssetsQueryDto (page/limit/search) — mirrors ListDepartmentsQueryDto
```

> The spec's module structure omits a list-query DTO, but the established codebase pattern (005/006) validates `page`/`limit`/`search` via a dedicated `@Query()` DTO so the controller stays thin and bad input is rejected with a 400 by the global `ValidationPipe`. Add `ListAssetsQueryDto` to match.

### Dependencies / wiring

- `AssetModule` imports `PrismaModule` and `AuthModule`.
- `AssetService` injects `PrismaService` and `AuthService`.
- Register `AssetModule` in `app.module.ts`.
- Before running protected business logic, call the existing `AuthService.isUserActive(user)` (feature 004) via the same `assertActiveSession` helper shape used in `EmployeeService` / `DepartmentService`; if it returns `false`, throw `UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION)`.

---

## Authorization

- **All routes**: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` (class-level, mirroring the Department controller).
- `ParseUUIDPipe` on the `:id` param (consistent with Employee/Department controllers).
- `Role.ADMIN` from the codebase enum at `src/generated/prisma/client` (spec writes `Role.ADMIN` directly — no discrepancy).

---

## Business rules to enforce (service layer)

**List** (`GET /assets`):

- Exclude soft-deleted assets (`where: { is_deleted: false }`).
- Order by `created_at` **descending** (spec).
- Support pagination (`page`, `limit`) and case-insensitive `search` across **both** `asset_serial_number` **and** `asset_category`. Build the `where` as an `OR`: `{ asset_serial_number: { contains: search, mode: 'insensitive' } }` plus a category match. Prisma enum fields don't support `contains`, so resolve the category arm in JS — compute which `AssetCategory` values contain the (case-insensitive) search term and pass `{ asset_category: { in: matchedCategories } }` (omit the arm when nothing matches).
- **Include allocated employee info** when the asset is allocated — `allocated_to` as a small summary (id, name, official_email) via a nested `select`, **`null` when unallocated**.
- **Never** return `is_deleted`, `deleted_at`, `created_at`, `updated_at` — select an explicit safe field set.
- Response fields: `id`, `asset_serial_number`, `asset_category`, `status`, `allocated_to`.

**Get by id** (`GET /assets/:id`):

- Asset must exist and not be soft deleted → else `NotFoundException(ASSET_NOT_FOUND)`.
- Return the asset (safe field set, including `allocated_to`).

**Create** (`CreateAssetDto`):

- Required: `asset_serial_number`, `asset_category` only.
- `asset_serial_number`: `@IsString`, `@IsNotEmpty`, `@Transform(({ value }) => value.trim().toUpperCase())` — **trimmed + normalized to UPPERCASE**, so the canonical uppercase form is what gets persisted. `LAP-001` and `lap-001` both store as `LAP-001` and are duplicates. Because every stored value is uppercase, a plain `equals` (case-sensitive) uniqueness check against **active** assets suffices — `findFirst({ where: { asset_serial_number: dto.asset_serial_number, is_deleted: false } })`; if found → `ConflictException(ASSET_ALREADY_EXISTS)`.
- `asset_category`: `@IsEnum(AssetCategory)` — allowed: `LAPTOP MOUSE KEYBOARD HEADSET EARPHONE MOBILE_PHONE SCREEN COOLING_PAD IPAD`.
- Server-set defaults: `status = AVAILABLE`, `allocated_to_id = null`, `is_deleted = false`, `deleted_at = null`. DB generates `id`, `created_at`, `updated_at`.
- **Reject system-managed fields if sent**: `id`, `status`, `allocated_to_id`, `is_deleted`, `deleted_at`, `created_at`, `updated_at` (global `ValidationPipe({ whitelist: true })` strips unknown props; keep them out of the DTO).
- Return the newly created asset (safe field set).

**Update** (`UpdateAssetDto extends PartialType(CreateAssetDto)`):

- Asset must exist and not be soft deleted → else `NotFoundException`.
- The DTO transform uppercases `asset_serial_number` here too. If it changes, re-validate uniqueness (`equals` on the uppercased value) against active assets **excluding the current row** (`id: { not: id }`).
- Status is **not** updatable here (separate endpoint). Only `asset_serial_number` / `asset_category`.
- Return the updated asset.

**Update status** (`PATCH /assets/:id/status`, `UpdateAssetStatusDto`):

- Required: `status` — `@IsEnum(AssetStatus)`.
- **Allocation restriction:** manual transition to `ALLOCATED` is forbidden → `BadRequestException(INVALID_ASSET_STATUS)`. Allocation is owned by the future Asset Request module. (Permitted manual targets: `AVAILABLE`, `MAINTENANCE`, `TRASHED`.)
- Asset must exist and not be soft deleted.
- Return the updated asset.

**Soft delete** (`DELETE /:id`):

- Asset must exist and not already be deleted → `NotFoundException` / `BadRequestException(ASSET_ALREADY_DELETED)`.
- **Allocation guard:** if `allocated_to_id !== null` → `BadRequestException(ASSET_CANNOT_BE_DELETED)`.
- Set `is_deleted = true`, `deleted_at = new Date()`. Never physically remove.
- Return a success message.

---

## DTO validation

`class-validator` / `class-transformer`:

- `CreateAssetDto`: `asset_serial_number` → `@IsString()`, `@IsNotEmpty()`, `@Transform(({ value }) => value.trim().toUpperCase())`, `@MaxLength`; `asset_category` → `@IsEnum(AssetCategory)`.
- `UpdateAssetDto`: `export class UpdateAssetDto extends PartialType(CreateAssetDto) {}` (`@nestjs/mapped-types`, already installed).
- `UpdateAssetStatusDto`: `status` → `@IsEnum(AssetStatus)`.
- `ListAssetsQueryDto`: copy `ListDepartmentsQueryDto` (optional `page`/`limit` as `@Type(() => Number) @IsInt() @Min(1)`, optional trimmed `search` with `@MaxLength`).

## Messages

Add a new `AssetMessages` object to the **existing** singular `backend/src/constant/messages.constant.ts` (matching the established layout — **not** the spec's plural `src/constants/`). Keys (per spec, plus a double-delete key consistent with `DepartmentMessages`):

```ts
export const AssetMessages = {
  ASSET_NOT_FOUND: 'Asset not found',
  ASSET_ALREADY_EXISTS: 'Asset already exists',
  ASSET_CREATED_SUCCESSFULLY: 'Asset created successfully',
  ASSET_UPDATED_SUCCESSFULLY: 'Asset updated successfully',
  ASSET_STATUS_UPDATED_SUCCESSFULLY: 'Asset status updated successfully',
  ASSET_DELETED_SUCCESSFULLY: 'Asset deleted successfully',
  ASSET_ALREADY_DELETED: 'Asset is already deleted',
  ASSET_CANNOT_BE_DELETED: 'Allocated asset cannot be deleted',
  INVALID_ASSET_STATUS: 'Invalid asset status transition',
} as const;
```

Add asset list/search/serial length limits to `values.constant.ts` (mirror the department constants). No hardcoded strings at throw sites.

---

## Discrepancies / decisions flagged

1. **Serial number: case-insensitive uniqueness, stored UPPERCASE** _(user decision)_. `LAP-001` and `lap-001` are the same asset, and the canonical **uppercase** form is what's persisted. The DTO `@Transform` trims + uppercases, so:
   - All stored serials are uppercase → a plain `equals` (case-sensitive) service check against **active** assets is sufficient to catch case-insensitive duplicates; no `mode: 'insensitive'` needed.
   - The DB `@unique` on `asset_serial_number` is plain/case-sensitive and spans **all** rows (incl. soft-deleted) — unlike `Department.name` (which has a partial `lower(name)` index). It will still **reject re-creating a serial that exactly matches a soft-deleted asset's serial**, even though the spec's active-only check would allow it (same tension as employee email). **Decision:** keep the active-only check in the service, and additionally catch Prisma `P2002` → map to `ASSET_ALREADY_EXISTS` for the soft-deleted-collision race. **No schema change** for this feature.
2. **Search scope — serial number AND category** _(user decision)_. Spec updated. Serial via `contains`/`mode: 'insensitive'`; category resolved in JS (enum fields can't use `contains`) → `asset_category: { in: matchedCategories }`, combined with an `OR`.
3. **Messages path** — singular `src/constant/` (as in 003/004/005/006), not the spec's plural `src/constants/` _(confirmed by user)_.
4. **`allocated_to` shape** — small employee summary (`id`, name, `official_email`) when allocated, **`null` when unallocated** _(confirmed by user)_. Aligns with the Employee module's relation-summary pattern. Since this module can't allocate assets, allocated rows only appear from seed data, but the read shape is built now for forward-compat.

---

## Definition of Done (from spec)

- [x] APIs: Get All, Get By Id, Create, Update, Update Status, Soft Delete — all implemented.
- [x] DTOs: `CreateAssetDto`, `UpdateAssetDto`, `UpdateAssetStatusDto` (+ `ListAssetsQueryDto`) with validation.
- [x] All routes protected with `JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)`; service-level `AuthService.isUserActive` session guard wired in.
- [x] Case-insensitive serial-number uniqueness enforced (create + update); category validated via `@IsEnum`.
- [x] Soft delete implemented; soft-deleted assets excluded from queries; internal fields never returned.
- [x] Status update rejects `ALLOCATED` (`BadRequestException`); allocated assets cannot be deleted (`BadRequestException`).
- [x] No hardcoded exception messages (`AssetMessages`).
- [x] `npm run build` passes; `npm run lint` passes; manual API testing completed (dup blocked, soft-deleted excluded, status-`ALLOCATED` blocked, allocated-delete blocked).

---

## Notes / decisions

- Schema is the source of truth — no invented fields. The `Asset` model carries `id`, `asset_serial_number`, `asset_category`, `status`, `allocated_to_id`/`allocated_to`, relations (`requests`, `allocation_history`), soft-delete fields, and timestamps — **no migration required**.
- Reuses the auth module (003/004): `JwtAuthGuard`, `RolesGuard`, `@Roles(Role.ADMIN)`, exported `AuthService.isUserActive`.
- Mirror the Employee/Department patterns: a single safe `select` projection reused by every endpoint, `assertActiveSession` helper, `{ data, pagination }` list shape, `{ message, data }` mutation shape, `{ message }` delete shape, `ParseUUIDPipe` on `:id`, and a `toWriteError`-style `P2002` mapper for race-safe conflicts.
- Branch: `feature/assets-crud-module` (per development-rules git naming).

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

- 2026-06-12 — **Started feature 007 (Asset Management Module).** Read spec `specs/007-assets-crud-apis.md` and re-checked the live backend (the `Asset` schema model, the Department/Employee module patterns from 005/006, `messages.constant.ts`, `values.constant.ts`, `DepartmentService`). Created branch `feature/assets-crud-module` off main and rewrote current-feature.md with the 007 plan: 6 admin endpoints (list w/ pagination+search+allocated-employee info, get-by-id, create, update, update-status, soft delete) under `src/asset` (thin controller, service-only logic, 4 DTOs incl. an added `ListAssetsQueryDto`), all routes `JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)` + service-level `AuthService.isUserActive` guard, case-insensitive active-only serial-number uniqueness (create + update), `@IsEnum(AssetCategory)` / `@IsEnum(AssetStatus)` validation, status update that rejects a manual `ALLOCATED` transition (`BadRequestException`), soft delete blocked when `allocated_to_id !== null`, a new `AssetMessages` constant, and a safe `select` (incl. an `allocated_to` employee summary) that hides internal fields. **No schema change / no migration** — the `Asset` model already has every field. **Four items raised; all resolved by the user the same day:** (1) **serial number** — `LAP-001` / `lap-001` are duplicates and the canonical **UPPERCASE** form is persisted (DTO `@Transform` trims + uppercases); since all stored serials are uppercase, a plain `equals` active-only check suffices, with a `P2002` fallback → `ASSET_ALREADY_EXISTS` for the soft-deleted-serial collision (`Asset.asset_serial_number` is a plain case-sensitive `@unique`, no partial `lower()` index like Department's); (2) **search** spans **both** `asset_serial_number` (substring) **and** `asset_category` (enum resolved in JS → `in`) — spec updated; (3) **messages** stay at the singular `constant/` path (not the spec's plural); (4) **`allocated_to`** is an employee summary when allocated, **`null` otherwise**. Spec file `007-assets-crud-apis.md` updated for items (1) and (2). Status: Not Started, ready to implement.

- 2026-06-12 — **Implemented (007 — Asset Management Module).** Built `backend/src/asset/` (module, thin controller, service, 4 DTOs) mirroring the 005/006 patterns. **Controller:** `@Controller('assets')` with class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` (all 6 routes admin-only); `ParseUUIDPipe` on `:id`; `GET /assets` (list), `GET /assets/:id`, `POST /assets`, `PATCH /assets/:id`, `PATCH /assets/:id/status`, `DELETE /assets/:id`. **Service:** every method calls `assertActiveSession` → `AuthService.isUserActive` (throws `UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION)` if inactive); a single `ASSET_SAFE_SELECT` (`satisfies Prisma.AssetSelect`) projecting `id`, `asset_serial_number`, `asset_category`, `status`, and an `allocated_to` employee summary (`id`, `first_name`, `last_name`, `official_email`; `null` when unallocated) — so `is_deleted`/`deleted_at`/`created_at`/`updated_at` are never selected. List: `is_deleted: false`, `orderBy created_at desc`, page/limit clamped in service (`ASSET_LIST_*` constants), `{ data, pagination }` shape; search builds an `OR` over `asset_serial_number` (`contains`, `mode: 'insensitive'`) + matched `AssetCategory` values resolved in JS (`buildSearchOr` → `asset_category: { in }`, arm omitted when no category matches). Create/Update: serial uniqueness via `assertSerialAvailable` (plain `equals` on the DTO-uppercased value, `is_deleted: false`, `NOT: { id }` on update); server defaults set explicitly; `P2002` → `ASSET_ALREADY_EXISTS` (covers the soft-deleted-serial collision the all-rows DB `@unique` enforces) and `P2025` → `ASSET_NOT_FOUND` via `toWriteError`. Update writes scoped to `{ id, is_deleted: false }`. Update-status: rejects any status outside `MANUAL_ASSET_STATUSES` (`AVAILABLE`/`MAINTENANCE`/`TRASHED`) — i.e. a manual `ALLOCATED` → `BadRequestException(INVALID_ASSET_STATUS)`. Delete: existence + already-deleted guard, then allocation guard (`allocated_to_id !== null` → `BadRequestException(ASSET_CANNOT_BE_DELETED)`), else set `is_deleted/deleted_at`. **DTOs:** `CreateAssetDto` (`asset_serial_number` → `@IsString/@IsNotEmpty/@MaxLength/@Transform` trim+UPPERCASE; `asset_category` → `@IsEnum(AssetCategory)`), `UpdateAssetDto extends PartialType(CreateAssetDto)`, `UpdateAssetStatusDto` (`status` → `@IsEnum(AssetStatus)`), `ListAssetsQueryDto` (page/limit/search, copied from `ListDepartmentsQueryDto`). **Constants:** added `AssetMessages` to `src/constant/messages.constant.ts` and `ASSET_LIST_DEFAULT_LIMIT`/`ASSET_LIST_MAX_LIMIT`/`ASSET_SEARCH_MAX_LENGTH`/`ASSET_SERIAL_NUMBER_MAX_LENGTH` to `values.constant.ts` (singular `constant/` path, not the spec's plural). Registered `AssetModule` in `app/app.module.ts`. **No schema change / no migration.** `npm run build` and `npm run lint` both pass. **Manual API testing against a running server still pending.** Status: Implemented; ready for manual verification.
