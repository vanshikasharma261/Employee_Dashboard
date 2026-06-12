# Feature 009 — Asset Allocation History Module

## Feature Overview

Implement the Asset Allocation History module for the Employee Management Dashboard backend.

This feature is responsible for maintaining and exposing the complete audit trail of asset ownership and lifecycle changes across the organization.

The module acts as the single source of truth for asset allocation history and must provide visibility into:

- Asset allocations
- Asset deallocations
- Asset maintenance events
- Asset ownership timeline

History records must never be modified or deleted once created.

This module is intended to function as an immutable audit log.

---

# References

## Project Context

Refer to:

- @context/project-overview.md
- @context/business-rules.md
- @context/database-design.md

## Development Standards

Refer to:

- @context/development-rules.md

## Database Schema

Refer to:

- @context/prisma-schema.md

## API Contract

Refer to:

- @context/api-contract.md

---

# Important

`/api` is configured globally and must not be manually included in controller routes.

---

# Objective

Provide APIs for:

- Viewing asset allocation history
- Viewing asset ownership timeline
- Viewing employee asset history

Provide service methods for:

- Recording asset allocation events
- Recording asset deallocation events
- Recording maintenance events

This module is not responsible for approving requests or modifying assets directly.

---

# Scope

## Included

### Read Operations

- Get Asset History
- Get Employee Asset History
- Get Complete History Listing

### Write Operations

- Record Allocation History
- Record Deallocation History
- Record Maintenance History

### Audit Tracking

- Asset ownership timeline
- Allocation records
- Return records
- Maintenance records

---

## Excluded

### Asset CRUD

Handled by:

    AssetModule

---

### Asset Request Workflow

Handled by:

    AssetRequestModule

---

### Asset Status Updates

Handled by:

    AssetModule
    AssetRequestModule

---

# Module Structure

    src/asset-history

    ├── asset-history.module.ts
    ├── asset-history.controller.ts
    ├── asset-history.service.ts

---

# Dependencies

AssetHistoryModule must import:

    PrismaModule
    AuthModule

AssetHistoryService must inject:

    PrismaService
    AuthService

through dependency injection.

---

# Authorization Rules

All history endpoints are Admin Only.

Routes must be protected using:

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)

---

# Routes

## Get All History

    GET /asset-history

---

## Get Asset History

    GET /asset-history/asset/:assetId

---

## Get Employee Asset History

    GET /asset-history/employee/:employeeId

---

# Get All History

## Endpoint

    GET /asset-history

## Access

Admin Only

---

## Purpose

Fetch complete asset allocation history records.

---

## Query Support

    GET /asset-history?page=1&limit=10

Support:

- Pagination
- Asset Filter
- Employee Filter
- Event Type Filter

---

## Ordering

Return newest records first.

    orderBy: {
      created_at: 'desc'
    }

---

# Get Asset History

## Endpoint

    GET /asset-history/asset/:assetId

## Access

Admin Only

---

## Purpose

Fetch complete ownership timeline of a specific asset.

---

## Validation Rules

Asset must:

- Exist
- Not be soft deleted

---

## Response Includes

    asset
    employee
    allocated_at
    returned_at
    event_type
    remarks
    created_at

---

# Get Employee Asset History

## Endpoint

    GET /asset-history/employee/:employeeId

## Access

Admin Only

---

## Purpose

Fetch all asset activity related to a specific employee.

---

## Validation Rules

Employee must:

- Exist
- Not be deleted

---

# History Event Types

History records represent one of:

    ALLOCATION
    DEALLOCATION
    MAINTENANCE

---

# Service Methods

These methods are internal service utilities and are intended to be called by AssetRequestModule.

---

## Record Allocation

### Method

    recordAllocation(
      assetId: string,
      employeeId: string,
       remarks:text
    )

---

### Purpose

Create allocation history record when a NEW_ASSET request is approved.

---

### Behaviour

Create AssetAllocationHistory record:

    asset_id = assetId

    employee_id = employeeId

    event_type = ALLOCATION

    remarks = "Asset allocation is done"

    allocated_at = new Date()

---

## Record Deallocation

### Method

    recordDeallocation(
      assetId: string,
      employeeId: string,
    remarks:text,
    )

---

### Purpose

Record asset return event when REMOVE_ASSET request is approved.

---

### Behaviour

Create AssetAllocationHistory record:

    asset_id = assetId

    employee_id = employeeId

    event_type = DEALLOCATION
    remarks = "asset is taken over from this employee"

    returned_at = new Date()

---

## Record Maintenance

### Method

    recordMaintenance(
      assetId: string,
      employeeId?: string,
    remarks:text,
    )

---

### Purpose

Record maintenance activity when MAINTENANCE request is approved.

---

### Behaviour

Create AssetAllocationHistory record:

    asset_id = assetId

    employee_id = employeeId

    event_type = MAINTENANCE
    remarks ="this request has gone to the maintenance"

    created_at = new Date()

---

# Immutability Rules

History records are immutable.

The following operations must never exist:

    PATCH /asset-history/:id

    DELETE /asset-history/:id

    POST /asset-history

---

## Restrictions

History records:

- Cannot be updated.
- Cannot be deleted.
- Cannot be manually created through API.

Only system-generated records are allowed.

---

# Session Validation

Before executing protected business logic:

    const status = await this.authService.isUserActive(user);

    if (!status) {
      throw new UnauthorizedException(
        AuthMessages.UNAUTHORIZED_EXCEPTION,
      );
    }

Apply the existing AuthService session validation utility.

---

# Exception Handling

Use NestJS exceptions only.

Examples:

    BadRequestException
    UnauthorizedException
    ForbiddenException
    NotFoundException

---

# Messages

Do not hardcode messages.

Store all messages inside:

    src/constant/messages.constant.ts

Example:

    export const AssetHistoryMessages = {
      HISTORY_NOT_FOUND:
        'Asset history not found',

      ASSET_NOT_FOUND:
        'Asset not found',

      EMPLOYEE_NOT_FOUND:
        'Employee not found',
    };

---

# Security Requirements

## Route Protection

All history routes must use:

    JwtAuthGuard
    RolesGuard

and:

    @Roles(Role.ADMIN)

---

## Session Validation

All service methods must validate:

    await this.authService.isUserActive(user)

before executing protected operations.

---

# Integration Requirements

AssetRequestModule must call AssetHistoryService when:

---

## NEW_ASSET Approved

    recordAllocation()

---

## REMOVE_ASSET Approved

    recordDeallocation()

---

## MAINTENANCE Approved

    recordMaintenance()

---

# Definition Of Done

## APIs

- [ ] Get All History implemented
- [ ] Get Asset History implemented
- [ ] Get Employee Asset History implemented

## Service Methods

- [ ] recordAllocation implemented
- [ ] recordDeallocation implemented
- [ ] recordMaintenance implemented

## Security

- [ ] JWT authentication implemented
- [ ] Admin RBAC implemented
- [ ] Session validation implemented

## Business Rules

- [ ] History records immutable
- [ ] No update APIs
- [ ] No delete APIs
- [ ] No manual create APIs

## Integration

- [ ] AssetRequestModule integrated
- [ ] Allocation events recorded
- [ ] Deallocation events recorded
- [ ] Maintenance events recorded

## Verification

- [ ] Build passes
- [ ] Lint passes
- [ ] Manual API testing completed
- [ ] Allocation history verified
- [ ] Deallocation history verified
- [ ] Maintenance history verified
- [ ] History records remain immutable

---

# Expected Outcome

After completion, the system will maintain a complete immutable audit trail of all asset allocation, deallocation, and maintenance activities. Administrators will be able to track asset ownership history, employee asset usage history, and asset lifecycle events while preserving full historical accountability across the organization.
