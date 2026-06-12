## Current Feature

**008 + 009 — Asset Request Management + Asset Allocation History Modules** (implemented together)

Implement two correlated backend modules in one feature branch:

- **008 — Asset Request Management** (`src/asset-request`): the workflow engine. Both employees and admins (an admin is also a company employee — they too need assets, can send them for maintenance, and return them) raise asset requests (`NEW_ASSET` / `REMOVE_ASSET` / `MAINTENANCE`); admins list, view, **approve**, or **reject** them. Approval is the *only* path that mutates asset allocation/status — it runs inside a Prisma transaction and drives the allocation/deallocation/maintenance side effects.
- **009 — Asset Allocation History** (`src/asset-history`): the immutable, append-only audit log. Admin-only read APIs (all history, by-asset timeline, by-employee activity) plus internal `record*` service methods called by the Asset Request approval flow — never created/updated/deleted via API.

They are built together because **history is written as part of approval**: when a request is approved, the same transaction that mutates the asset also writes the matching history record. 009's `record*` methods are the integration point 008 calls.

Specs: [specs/008-assets-requests-crud-apis.md](../specs/008-assets-requests-crud-apis.md) · [specs/009-asset-allocation-history-apis.md](../specs/009-asset-allocation-history-apis.md)

Branch: `feature/asset-request-asset-history` (already created off `main`).

## Status

**Completed & verified.** Both modules built, schema migration applied, client regenerated; `npm run build` and `npm run lint` pass; manual API testing done end-to-end (all flows, RBAC, validation, immutability); DB restored to pristine seed state afterward.

## Goal

Provide a centralized asset-request workflow so any employee (including admins) can request new assets, returns, and maintenance, and admins can approve/reject them — with every approval atomically updating the asset *and* appending an immutable history record, giving the organization a complete audit trail of asset allocation, deallocation, and maintenance events. Direct allocation/deallocation through the Asset module stays out of scope; all of it flows through request approval.

---

## Request lifecycle (confirmed with user)

```
        raise (any type)            admin approve (admin_response)             admin reject (admin_response)
PENDING ───────────────►  PENDING ──────────────────────────►  APPROVED  ──►  COMPLETED   (terminal, read-only)
                                   └──────────────────────────►  REJECTED   (terminal, admin_response stored)
```

On **approve** (single transaction, every request type follows the same flow):

1. status `PENDING` → `APPROVED`, store `admin_response`.
2. perform the asset side effect for the request type (allocate / deallocate / maintenance).
3. write the history record with **`remarks = admin_response`**.
4. status `APPROVED` → `COMPLETED` (terminal — completed requests are read-only).

On **reject**: status `PENDING` → `REJECTED`, store `admin_response`; no asset mutation, no history record.

> This supersedes two spec details: (a) spec 008 sets approved status to `APPROVED` only — we carry it through to `COMPLETED` per business-rules.md; (b) spec 009's fixed remark strings ("Asset allocation is done", etc.) are **not** used — history `remarks` are the admin's `admin_response` from the request.

---

## ⚠️ Required schema change (one additive migration)

Spec 009 needs an **`event_type`** on `AssetAllocationHistory` (used in the response body, the event-type query filter, and to distinguish the three `record*` methods). Neither the live `schema.prisma` nor `context/prisma-schema.md` has it today.

**Decision (user):** do **not** invent a parallel enum — **reuse the existing `RequestType` enum** as the event type, carried over from the `AssetRequest` that triggered the record. `RequestType` already has all three values needed, none left over:

| Request approved | History `event_type` | Asset effect                          |
| ---------------- | -------------------- | ------------------------------------- |
| `NEW_ASSET`      | `NEW_ASSET`          | allocate → `ALLOCATED`, set owner     |
| `REMOVE_ASSET`   | `REMOVE_ASSET`       | deallocate → `AVAILABLE`, clear owner |
| `MAINTENANCE`    | `MAINTENANCE`        | → `MAINTENANCE`                       |

Schema addition to `model AssetAllocationHistory`:

```prisma
event_type RequestType
@@index([event_type])
```

- Mirror the same change in `context/prisma-schema.md`.
- New migration: `add_history_event_type` (additive `ALTER TABLE` adding a NOT NULL column — **safe**: the table is empty, 0 allocation-history rows seeded, so no backfill/default needed). Regenerate the Prisma client afterward.
- The model stays immutable (no `is_deleted`, no `updated_at`) — append-only audit log.

This is the only schema change. Everything else in both modules uses existing fields.

---

## Module structure

```text
backend/src/asset-request
├── asset-request.module.ts
├── asset-request.controller.ts            # thin — delegates to service
├── asset-request.service.ts               # all workflow logic + approval transaction
└── dto/
    ├── create-asset-request.dto.ts        # CreateAssetRequestDto
    ├── approve-request.dto.ts             # ApproveRequestDto  { admin_response }
    ├── reject-request.dto.ts              # RejectRequestDto   { admin_response }
    └── list-asset-requests-query.dto.ts   # ListAssetRequestsQueryDto (added, mirrors 007's query DTO)

backend/src/asset-history
├── asset-history.module.ts                # exports AssetHistoryService
├── asset-history.controller.ts            # admin-only reads
├── asset-history.service.ts               # reads + internal record* methods
└── dto/
    └── list-asset-history-query.dto.ts    # ListAssetHistoryQueryDto (added)
```

> The specs omit list-query DTOs, but the established 005/006/007 pattern validates `page`/`limit`/filters via a dedicated `@Query()` DTO so the controller stays thin and bad input gets a 400 from the global `ValidationPipe`. Add one to each module to match.

## Dependencies / wiring

- `AssetRequestModule` imports `PrismaModule`, `AuthModule`, **and `AssetHistoryModule`** (to inject `AssetHistoryService`). No reverse dependency, so no circular import.
- `AssetHistoryModule` imports `PrismaModule`, `AuthModule`; **exports `AssetHistoryService`**.
- `AssetRequestService` injects `PrismaService`, `AuthService`, `AssetHistoryService`.
- `AssetHistoryService` injects `PrismaService`, `AuthService`.
- Register both modules in `app/app.module.ts`.
- Every public service method first calls the existing `AuthService.isUserActive(user)` via the same `assertActiveSession` helper used in 005/006/007; `false` → `UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION)`.

---

## Authorization (confirmed with user)

Mixed access ⇒ **per-method guards** (mirror `EmployeeController`'s `/me` pattern), not class-level, on the request controller.

| Method | Route                          | Guards                                      | Access            |
| ------ | ------------------------------ | ------------------------------------------- | ----------------- |
| POST   | `/asset-requests`              | `JwtAuthGuard`                              | Any authenticated (EMPLOYEE + ADMIN) |
| GET    | `/asset-requests/my`           | `JwtAuthGuard`                              | Any authenticated — sees only own |
| GET    | `/asset-requests/my/:id`       | `JwtAuthGuard`                              | Any authenticated — own only |
| GET    | `/asset-requests`              | `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` | ADMIN — all employees' requests |
| GET    | `/asset-requests/:id`          | `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` | ADMIN          |
| PATCH  | `/asset-requests/:id/approve`  | `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` | ADMIN          |
| PATCH  | `/asset-requests/:id/reject`   | `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` | ADMIN          |
| GET    | `/asset-history/my`            | `JwtAuthGuard`                              | Any authenticated — sees only own history |
| GET    | `/asset-history`               | `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` | ADMIN          |
| GET    | `/asset-history/asset/:assetId`| `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` | ADMIN          |
| GET    | `/asset-history/employee/:employeeId` | `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` | ADMIN     |

- **Create + `my` routes are NOT `@Roles(EMPLOYEE)`** *(user-confirmed)*: an admin is also a company employee and may raise/view their own requests, so those routes use `JwtAuthGuard` only. The "own only" scoping is enforced in the service (`employee_id = user.id`), not by role. Admins additionally get the admin routes to view/approve/reject *everyone's* requests.
- `ParseUUIDPipe` on every `:id` / `:assetId` / `:employeeId` param.
- Route order: declare `my` and `my/:id` **before** `:id` so `my` isn't captured as an id.
- `AssetHistoryController` is **mixed access** (per-method guards, mirroring `EmployeeController`): `GET /asset-history/my` uses `JwtAuthGuard` only (any authenticated principal, own records only — scoping enforced in the service via `employee_id = user.id`); all other history routes are `JwtAuthGuard + RolesGuard + @Roles(Role.ADMIN)`. Route order: `my` declared before `asset/:assetId` and `employee/:employeeId`.

---

## Business rules — Asset Request (008)

**Create** (`POST /asset-requests`, `CreateAssetRequestDto`):

- Fields: `request_type` (`@IsEnum(RequestType)`), `asset_id` (`@IsUUID`), `description` (`@IsString`/`@IsNotEmpty`, `@MaxLength`).
- Asset must **exist and not be soft-deleted** → else `NotFoundException(ASSET_NOT_FOUND)`.
- Server-set: `employee_id = req.user.id` (**never** from the body), `status = PENDING`. Persist `request_type`, `asset_id`, `description`.
- Return `{ message: REQUEST_CREATED_SUCCESSFULLY, data }` (safe projection).

**Get my requests** (`GET /asset-requests/my`): requests where `employee_id = user.id`, `is_deleted: false`; pagination; newest first.

**Get my request detail** (`GET /asset-requests/my/:id`): request must exist, not deleted, **and belong to `user.id`** → else `NotFoundException(REQUEST_NOT_FOUND)` (don't leak others' requests).

**Get all** (`GET /asset-requests`, admin): all non-deleted requests; pagination + `status` filter + `request_type` filter (`ListAssetRequestsQueryDto`); newest first.

**Get detail** (`GET /asset-requests/:id`, admin): any non-deleted request → else `NotFoundException`.

**Approve** (`PATCH /asset-requests/:id/approve`, admin, `ApproveRequestDto { admin_response }`) — **all inside `this.prisma.$transaction(async (tx) => …)`**, following the lifecycle above:

1. Load request (with asset). Must exist, not deleted, `status === PENDING` → else `REQUEST_NOT_FOUND` / `REQUEST_ALREADY_PROCESSED`. Guard `asset_id` is set.
2. Update request → `status = APPROVED`, `admin_response = dto.admin_response`.
3. Branch on `request_type`:
   - **`NEW_ASSET`**: requesting employee must be `status === WORKING` *(business-rules; user-confirmed)* → else `BadRequest(EMPLOYEE_NOT_ALLOCATABLE)`. Asset must be `status === AVAILABLE` **and** `allocated_to_id === null` → else `Conflict/BadRequest(ASSET_NOT_AVAILABLE)`. Update asset → `allocated_to_id = request.employee_id`, `status = ALLOCATED`. Then `assetHistory.recordAllocation(tx, assetId, employee_id, admin_response)`.
   - **`REMOVE_ASSET`**: asset must currently be `allocated_to_id === request.employee_id` → else `BadRequest(INVALID_ASSET_OWNER)`. Update asset → `allocated_to_id = null`, `status = AVAILABLE`. Then `recordDeallocation(tx, assetId, employee_id, admin_response)`.
   - **`MAINTENANCE`**: asset must exist (already loaded). Update asset → `status = MAINTENANCE` **and `allocated_to_id = null`** (asset is taken away from the employee once it goes to maintenance). Then `recordMaintenance(tx, assetId, employee_id, admin_response)` (`employee_id` = the requester). History is written here, in the same approval transaction — never outside it.
4. Update request → `status = COMPLETED` (terminal, read-only).
5. Return `{ message: REQUEST_APPROVED_SUCCESSFULLY, data }`.

**Reject** (`PATCH /asset-requests/:id/reject`, admin, `RejectRequestDto { admin_response }`): request must exist, not deleted, `PENDING`. Set `status = REJECTED`, store `admin_response` (`@IsString`/`@IsNotEmpty`). No asset mutation, no history. Return `{ message: REQUEST_REJECTED_SUCCESSFULLY, data }`.

---

## Business rules — Asset History (009)

**Read APIs** (admin only; each calls `assertActiveSession` first):

- `GET /asset-history` — all records, `orderBy: { created_at: 'desc' }`, pagination, filters: `asset_id`, `employee_id`, `event_type` (`@IsEnum(RequestType)`) via `ListAssetHistoryQueryDto`. `{ data, pagination }`.
- `GET /asset-history/asset/:assetId` — asset must exist & not soft-deleted → else `ASSET_NOT_FOUND`; full ownership timeline for that asset.
- `GET /asset-history/employee/:employeeId` — employee must exist & not deleted → else `EMPLOYEE_NOT_FOUND`; all that employee's asset activity.

**Self-service read** (any authenticated principal — own records only; `assertActiveSession` first):

- `GET /asset-history/my` — returns the caller's own asset-activity timeline, scoped in the service to `employee_id = user.id` (never from a route param/body), newest first, `{ data }`. Lets an EMPLOYEE see only their own history; an admin can use it for their own activity or the admin routes for everyone's. *(Added at user request — not in spec 009.)*

- A `HISTORY_SAFE_SELECT` returns `id`, `event_type`, `allocated_at`, `returned_at`, `remarks`, `created_at`, plus `asset` summary (`id`, `asset_serial_number`, `asset_category`, `status`) and `employee` summary (`id`, `first_name`, `last_name`, `official_email`).

**Internal `record*` methods** (called only by `AssetRequestService` inside its approval transaction — **not** session-guarded individually; the calling admin flow already validated the session). Each takes the transaction client as first arg so the write joins the same atomic transaction, and `remarks` is the request's `admin_response`:

```ts
recordAllocation(tx, assetId, employeeId, remarks)   // event_type = NEW_ASSET,    allocated_at = now()
recordDeallocation(tx, assetId, employeeId, remarks) // event_type = REMOVE_ASSET, returned_at  = now()
recordMaintenance(tx, assetId, employeeId, remarks)  // event_type = MAINTENANCE
```

- **`employeeId` and `remarks` are required.** The schema's `employee_id` is NOT NULL and `remarks` is the admin's response; spec 009 wrote `employeeId?` for maintenance, but every approval carries `request.employee_id`, so it's always supplied.
- **`remarks = admin_response`** (the admin's response on the request) — replacing spec 009's fixed strings, per the lifecycle decision above.

**Immutability:** no `POST` / `PATCH` / `DELETE` on `/asset-history`; records are only ever created by the system via `record*`.

---

## DTO validation

- `CreateAssetRequestDto`: `request_type` `@IsEnum(RequestType)`; `asset_id` `@IsUUID()`; `description` `@IsString()` `@IsNotEmpty()` `@MaxLength(ASSET_REQUEST_DESCRIPTION_MAX_LENGTH)`.
- `ApproveRequestDto`: `admin_response` `@IsString()` `@IsNotEmpty()` `@MaxLength(ADMIN_RESPONSE_MAX_LENGTH)`.
- `RejectRequestDto`: `admin_response` `@IsString()` `@IsNotEmpty()` `@MaxLength(ADMIN_RESPONSE_MAX_LENGTH)`. (Same shape as approve; kept as a separate DTO for clarity/future divergence.)
- `ListAssetRequestsQueryDto`: optional `page`/`limit` (`@Type(() => Number) @IsInt() @Min(1)`), optional `status` `@IsEnum(RequestStatus)`, optional `request_type` `@IsEnum(RequestType)`.
- `ListAssetHistoryQueryDto`: optional `page`/`limit`, optional `asset_id` `@IsUUID()`, optional `employee_id` `@IsUUID()`, optional `event_type` `@IsEnum(RequestType)`.
- System-managed fields kept out of DTOs; global `ValidationPipe({ whitelist: true })` strips unknown props.

## Messages & constants

Add to the existing singular `backend/src/constant/messages.constant.ts`:

```ts
export const AssetRequestMessages = {
  REQUEST_NOT_FOUND: 'Asset request not found',
  REQUEST_CREATED_SUCCESSFULLY: 'Asset request created successfully',
  REQUEST_APPROVED_SUCCESSFULLY: 'Asset request approved successfully',
  REQUEST_REJECTED_SUCCESSFULLY: 'Asset request rejected successfully',
  REQUEST_ALREADY_PROCESSED: 'Request has already been processed',
  ASSET_NOT_AVAILABLE: 'Asset is not available for allocation',
  INVALID_ASSET_OWNER: 'Asset is not allocated to the employee',
  EMPLOYEE_NOT_ALLOCATABLE: 'Asset cannot be allocated to a non-working employee',
} as const;

export const AssetHistoryMessages = {
  HISTORY_NOT_FOUND: 'Asset history not found',
  ASSET_NOT_FOUND: 'Asset not found',
  EMPLOYEE_NOT_FOUND: 'Employee not found',
} as const;
```

Add to `values.constant.ts`: `ASSET_REQUEST_LIST_DEFAULT_LIMIT` / `_MAX_LIMIT`, `ASSET_HISTORY_LIST_DEFAULT_LIMIT` / `_MAX_LIMIT`, `ASSET_REQUEST_DESCRIPTION_MAX_LENGTH`, `ADMIN_RESPONSE_MAX_LENGTH` (mirror existing list/length constants). No hardcoded strings at throw sites. (No fixed-remark constants — remarks come from `admin_response`.)

---

## Discrepancies / decisions flagged (all confirmed with user)

1. **`event_type` field** — reuse the existing `RequestType` enum (sourced from the triggering request) instead of inventing a `HistoryEventType`; one additive migration adds `event_type RequestType` + index to `AssetAllocationHistory`. All three request types map directly; none left over. **Only schema change in this feature.**
2. **Create + `my` routes allow ADMIN too** — guarded with `JwtAuthGuard` only, not `@Roles(EMPLOYEE)`, because an admin is also an employee. "Own only" is enforced in the service; admins use the separate admin routes to see everyone's requests. *(Amends spec 008's Security wording.)*
3. **Approval is terminal `COMPLETED`, and `admin_response` is required on approve** — lifecycle `PENDING → APPROVED → (history written) → COMPLETED`; the approve endpoint takes `ApproveRequestDto { admin_response }` (the `approve-request.dto.ts` already listed in spec 008's structure). *(Reconciles spec 008's `APPROVED`-only with business-rules.md's `COMPLETED` lifecycle.)*
4. **History `remarks = admin_response`** — replaces spec 009's fixed remark strings, so each history record carries the admin's actual response.
5. **`recordMaintenance` employeeId required** — schema `employee_id` is NOT NULL; spec wrote it optional (`employeeId?`). **Decision (user — Option 1):** keep it **required** for all three `record*` methods and always pass `request.employee_id` (the employee who **raised** the request). For maintenance this means `employee_id` records the **requester**. Always available because `AssetRequest.employee_id` is NOT NULL and server-set to `req.user.id`. No schema change, no nullable column — keeps the single-additive-migration design. **Asset effect (user-confirmed):** approving a `MAINTENANCE` request sets the asset `status = MAINTENANCE` **and clears `allocated_to_id = null`** — the asset is no longer with the employee once it goes to maintenance; the matching history row is written in the same transaction.
6. **Employee-must-be-`WORKING` on `NEW_ASSET` approval** — enforced from business-rules.md (Asset Allocation Rules), though spec 008 doesn't restate it.
7. **`record*` methods are not individually session-guarded** — internal, invoked only inside the admin approval transaction that already validated the session.
8. **Messages path** — singular `src/constant/` (as in 003–007), not the specs' plural `src/constants/`.
9. **List-query DTOs added** — not in the specs, but consistent with 005/006/007 (thin controller, 400 on bad input).
10. **Employee self-service history route added** *(user-requested)* — `GET /asset-history/my` lets any authenticated principal (incl. EMPLOYEE role) view **only their own** history (`employee_id = user.id`, scoped in the service). This makes `AssetHistoryController` mixed-access (per-method guards) rather than the spec's uniform class-level admin guard. Not in spec 009.

---

## Definition of Done

### Asset Request (008)
- [ ] Create / Get My / Get My Detail implemented (any authenticated; own-only scoping).
- [ ] Get All (filters + pagination) / Get Detail implemented (admin).
- [ ] Approve (transactional, `admin_response`, → `COMPLETED`) + Reject (`admin_response`, → `REJECTED`) implemented (admin).
- [ ] `NEW_ASSET`, `REMOVE_ASSET`, `MAINTENANCE` approval flows implemented with correct asset mutations + validations (incl. WORKING check on NEW_ASSET).

### Asset History (009)
- [ ] Get All / Get Asset History / Get Employee Asset History implemented (admin).
- [ ] `recordAllocation` / `recordDeallocation` / `recordMaintenance` implemented (tx-aware, `remarks = admin_response`), called from approval.
- [ ] Records immutable — no create/update/delete API.

### Cross-cutting
- [ ] `event_type RequestType` + index added; migration `add_history_event_type` applied; client regenerated; `context/prisma-schema.md` updated.
- [ ] JWT auth + RBAC + `AuthService.isUserActive` session guard wired; route order (`my` before `:id`) correct.
- [ ] Approval runs in a single Prisma transaction (asset mutation + request status + history record atomic).
- [ ] No hardcoded messages (`AssetRequestMessages` / `AssetHistoryMessages`); safe `select` projections hide internal fields.
- [ ] `npm run build` passes; `npm run lint` passes; manual API testing (each request type, approve→COMPLETED/reject, ownership checks, WORKING check, immutability, RBAC, history filters, remarks = admin_response).

---

## Notes / decisions

- Schema is the source of truth — the only addition is `event_type` (reusing `RequestType`), explicitly approved. Everything else uses existing `AssetRequest` / `AssetAllocationHistory` / `Asset` fields.
- Reuses the auth module (003/004): `JwtAuthGuard`, `RolesGuard`, `@Roles`, exported `AuthService.isUserActive`.
- Mirrors 005/006/007 patterns: `assertActiveSession` helper, single safe `select` per module, `{ data, pagination }` list shape, `{ message, data }` mutation shape, `ParseUUIDPipe`, `RequestType`/`RequestStatus` from `src/generated/prisma/client`.
- Integration is the reason for co-implementation: approval and history-write share one transaction, so 008 depends on 009's tx-aware `record*` methods.
- Branch: `feature/asset-request-asset-history` (per development-rules git naming).

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

- 2026-06-12 — **Started feature 008 + 009 (Asset Request Management + Asset Allocation History), implemented together.** Read specs `008-assets-requests-crud-apis.md` and `009-asset-allocation-history-apis.md` plus the live backend (full schema, business-rules, prisma-schema/database-design context, the 005/006/007 module patterns, auth guards/`AuthService.isUserActive`, `messages.constant.ts`, `values.constant.ts`). Created branch `feature/asset-request-asset-history` off main and rewrote current-feature.md with the combined plan: two modules (`src/asset-request` workflow engine + `src/asset-history` immutable audit log) co-implemented because approval and history-write share one Prisma transaction. **Four decisions confirmed with the user before finalizing the plan:** (1) **`event_type`** — spec 009's field doesn't exist in the schema; reuse the existing `RequestType` enum (carried from the triggering request: NEW_ASSET/REMOVE_ASSET/MAINTENANCE) rather than inventing a `HistoryEventType`; plan adds `event_type RequestType` + `@@index([event_type])` to `AssetAllocationHistory` via additive migration `add_history_event_type` (table empty, safe) — the only schema change. (2) **Create + `my` routes** open to any authenticated principal (`JwtAuthGuard` only, not `@Roles(EMPLOYEE)`) because an admin is also an employee and may raise/view their own requests; own-only scoping enforced in the service, admins use admin routes to see everyone's — amends spec 008's Security wording. (3) **Lifecycle** `PENDING → APPROVED → (history written, remarks = admin_response) → COMPLETED`; approve now takes `ApproveRequestDto { admin_response }`, history `remarks` come from `admin_response` (not spec 009's fixed strings) — reconciles spec 008's APPROVED-only with business-rules' COMPLETED lifecycle. (4) **NEW_ASSET approval enforces requesting employee `status === WORKING`** per business-rules.md. Other flags: `recordMaintenance` employeeId/remarks kept required (schema NOT NULL); `record*` methods tx-aware and not individually session-guarded (internal, inside the already-validated admin transaction); singular `constant/` messages path; list-query DTOs added for consistency. **Per user instruction this remains plan-only — no schema or code changes written yet, pending review.** Status: Planned, ready to implement.

- 2026-06-12 — **Pre-implementation review — `employeeId` discrepancy + maintenance effects (user-confirmed).** Before coding, dug into spec 009's `recordMaintenance(employeeId?)` vs. the schema's NOT-NULL `employee_id`. **Decisions (Option 1):** keep `employeeId` **required** on all three `record*` methods and always pass `request.employee_id`; for MAINTENANCE this means the history `employee_id` records the **requester** (not the asset owner). **MAINTENANCE asset effect clarified:** approval sets asset `status = MAINTENANCE` **and clears `allocated_to_id = null`** (the asset leaves the employee). Confirmed history is only ever written inside the approval transaction. Updated the plan's discrepancy #5 and the MAINTENANCE approval branch accordingly.

- 2026-06-12 — **Implemented (008 + 009).** Schema: added `event_type RequestType` + `@@index([event_type])` to `AssetAllocationHistory` in `schema.prisma` and mirrored it in `context/prisma-schema.md`; generated & applied migration `20260612101015_add_history_event_type` (additive `ALTER TABLE ADD COLUMN ... NOT NULL` — safe, table was empty); ran `prisma generate` (the `migrate dev` run did not refresh the client, so the first build failed on the missing `event_type` type until a manual regenerate). **Constants:** added `AssetRequestMessages` (incl. its own `ASSET_NOT_FOUND`) + `AssetHistoryMessages` to `src/constant/messages.constant.ts`, and `ASSET_REQUEST_LIST_DEFAULT/MAX_LIMIT`, `ASSET_REQUEST_DESCRIPTION_MAX_LENGTH`, `ADMIN_RESPONSE_MAX_LENGTH`, `ASSET_HISTORY_LIST_DEFAULT/MAX_LIMIT` to `values.constant.ts`. **`src/asset-history/`** (009): `AssetHistoryService` with a single `HISTORY_SAFE_SELECT` (id, event_type, allocated_at, returned_at, remarks, created_at + asset & employee summaries), admin reads (`findAll` paginated w/ asset_id/employee_id/event_type filters; `findByAsset`/`findByEmployee` full newest-first timelines with existence guards), **and a `findMyHistory` self-service read** scoped to `employee_id = user.id`; tx-aware `recordAllocation`/`recordDeallocation`/`recordMaintenance` writers (first arg `Prisma.TransactionClient`, `remarks = admin_response`). Controller is **mixed-access per-method guards**: `GET /asset-history/my` (`JwtAuthGuard`) before the admin routes (`GET /`, `/asset/:assetId`, `/employee/:employeeId`). Module exports the service. **`src/asset-request/`** (008): 4 DTOs (`CreateAssetRequestDto` request_type/asset_id/description; `ApproveRequestDto`/`RejectRequestDto` admin_response; `ListAssetRequestsQueryDto` page/limit/status/request_type); `AssetRequestService` with `REQUEST_SAFE_SELECT`, create (asset-exists guard, `employee_id = user.id`, PENDING), `findMy`/`findMyOne` (own-only), admin `findAll`/`findOne`, and the **approval `$transaction`** (load PENDING request → mark APPROVED+admin_response → branch: NEW_ASSET [employee WORKING + asset AVAILABLE/unallocated → allocate + recordAllocation], REMOVE_ASSET [owner check → deallocate + recordDeallocation], MAINTENANCE [status=MAINTENANCE + allocated_to_id=null + recordMaintenance] → COMPLETED) + `reject` (PENDING→REJECTED, no asset/history). Controller mixed-access per-method guards, `my`/`my/:id` before `:id`. Module imports `AssetHistoryModule` to inject the service. Registered both in `app/app.module.ts`. **One scope addition during implementation (user-requested):** the employee `GET /asset-history/my` self-service route (decision #10). `npm run build` and `npm run lint` pass. **Manual API verification still pending.** Status: Implemented; ready for manual verification.

- 2026-06-12 — **Manual API verification (008 + 009) — all scenarios pass.** Ran the dev server (killed a stale port-3000 listener first — the recurring EADDRINUSE gotcha; `migrate dev` had also left the generated client un-refreshed, so an explicit `prisma generate` was needed before the build went green). Tested against a running server with admin (`hr.admin@company.com`, WORKING, EMP001) + a freshly-provisioned test EMPLOYEE (EMP013). **Verified:** NEW_ASSET create→my/my:id→admin-list→approve→`COMPLETED` with asset `ALLOCATED` to requester + allocation history (`event_type=NEW_ASSET`, `remarks=admin_response`); REMOVE_ASSET approve→asset `AVAILABLE`/owner cleared + deallocation history; **MAINTENANCE approve→asset `status=MAINTENANCE` AND `allocated_to_id=null` + maintenance history recorded against the requester** (the confirmed Option-1 behavior); reject→`REJECTED`, no history, asset untouched. **Guards/edge cases:** double-approve→400 `REQUEST_ALREADY_PROCESSED`; REMOVE on non-owned asset→400 `INVALID_ASSET_OWNER` **with full transaction rollback** (request stayed `PENDING`, asset unchanged — confirms atomicity); NEW_ASSET on a MAINTENANCE asset→409 `ASSET_NOT_AVAILABLE`; **WORKING check** (set requester `ON_NOTICE`, approve)→400 `EMPLOYEE_NOT_ALLOCATABLE`; non-existent asset→404 `ASSET_NOT_FOUND`; invalid `request_type`/empty `admin_response`/bad UUID→400; approve non-existent→404. **Auth/RBAC:** unauthenticated→401; EMPLOYEE→admin routes (list/history/approve)→403; EMPLOYEE create + `/asset-requests/my` + `/asset-history/my`→200/201; own-only scoping (employee fetching admin's request via `/my/:id`)→404. **History reads:** `GET /asset-history` + `event_type` filter, `/asset/:assetId` timeline, `/employee/:employeeId`, `/my` self-service all correct. **Immutability:** `POST`/`PATCH`/`DELETE /asset-history`→404 (no such routes). **Cleanup:** a throwaway `tsx` script hard-deleted all test asset_requests + asset_allocation_history rows, reset SCR-2023-0002 back to AVAILABLE, and removed the test employee — DB verified back to the original seed (history 0, requests 0, 0 allocated, 4 MAINTENANCE, 12 employees); script deleted afterward. Status: **Completed & verified.**
