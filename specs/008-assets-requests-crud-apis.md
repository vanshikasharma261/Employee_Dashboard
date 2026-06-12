# Feature 008 — Asset Request Management Module

## Feature Overview

Implement the Asset Request Management module for the Employee Management Dashboard backend.

This feature is responsible for handling the complete asset request workflow between employees and administrators.

Employees can raise requests related to company assets, while administrators can review, approve, or reject those requests.

This module acts as the business workflow layer between Employees and Assets.

All allocation, deallocation, and maintenance operations must be initiated through Asset Requests and must not be performed directly through Asset APIs.

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
- @backend/prisma/schema.prisma - it is very important for Dto and managing operations

## API Contract

Refer to:

- @context/api-contract.md

## Important

`/api` is configured globally and must not be manually included in controller routes.

---

# Objective

Provide APIs for:

- Creating asset requests
- Fetching asset requests
- Fetching request details
- Approving requests
- Rejecting requests

The module serves as the workflow engine for asset allocation, asset return, and maintenance requests.

---

# Scope

## Included

### Employee Operations

- Create Asset Request
- View Own Requests

### Admin Operations

- View All Requests
- View Request Details
- Approve Request
- Reject Request

### Request Types

    NEW_ASSET
    REMOVE_ASSET
    MAINTENANCE

### Security

- JWT Authentication
- RBAC
- Session Validation

### Transactions

- Approval workflow transactions

---

## Excluded

### Asset CRUD

Handled by:

    AssetModule

### Asset History Queries

Handled by:

    AssetHistoryModule

---

# Module Structure

    src/asset-request

    ├── asset-request.module.ts
    ├── asset-request.controller.ts
    ├── asset-request.service.ts

    ├── dto
    │   ├── create-asset-request.dto.ts
    │   ├── approve-request.dto.ts
    │   └── reject-request.dto.ts

---

# Dependencies

AssetRequestModule must import:

    PrismaModule
    AuthModule

AssetRequestService must inject:

    PrismaService
    AuthService

through dependency injection.

---

# Authorization Rules

## Employee Access

Employees can:

    Create Requests
    View Own Requests
    View Own Request Details

---

## Admin Access

Admins can:

    View All Requests
    View Request Details
    Approve Requests
    Reject Requests

---

# Routes

## Employee Routes

### Create Request

    POST /asset-requests

### Get My Requests

    GET /asset-requests/my

### Get My Request Details

    GET /asset-requests/my/:id

---

## Admin Routes

### Get All Requests

    GET /asset-requests

### Get Request Details

    GET /asset-requests/:id

### Approve Request

    PATCH /asset-requests/:id/approve

### Reject Request

    PATCH /asset-requests/:id/reject

---

# Create Asset Request

## Endpoint

    POST /asset-requests

## Access

EmployeeAdmin Both can request an asset

---

## DTO

    CreateAssetRequestDto

---

## Required Fields

    request_type
    asset_id
    description

---

## Validation

### Request Type

    @IsEnum(RequestType)

Allowed values:

    NEW_ASSET
    REMOVE_ASSET
    MAINTENANCE

---

### Asset Validation

Asset must:

- Exist
- Not be deleted

---

## Request Status

Automatically set:

    PENDING

---

## Request Owner

Automatically set:

    employee_id = req.user.id

Never accept employee_id from request body.

---

# Get My Requests

## Endpoint

    GET /asset-requests/my

## Access

Employee & Admin both can see thier assets requests though admin can approve their own requests

---

## Purpose

Fetch requests created by logged-in employee.

---

# Get My Request Details

## Endpoint

    GET /asset-requests/my/:id

## Access

Employee & Admin

---

## Rules

Request must belong to logged-in employee.

---

# Get All Requests

## Endpoint

    GET /asset-requests

## Access

Admin Only

---

## Purpose

Fetch all asset requests.

---

## Query Support

    GET /asset-requests?page=1&limit=10&status=PENDING

Support:

- Pagination
- Status Filter
- Request Type Filter

---

# Get Request Details

## Endpoint

    GET /asset-requests/:id

## Access

Admin Only

---

# Approve Request

## Endpoint

    PATCH /asset-requests/:id/approve

## Access

Admin Only

---

## Rules

Request must:

- Exist
- Be PENDING
- Not already processed

---

## Approval Behaviour

All approval operations must execute inside:

    this.prisma.$transaction()

---

# NEW_ASSET Approval

## Validation

Asset must:

    status === AVAILABLE
    allocated_to_id === null

---

## Actions

Update Asset:

    allocated_to_id = request.employee_id

    status = ALLOCATED

Update Request:

    status = APPROVED

Create history entry through AssetHistory module.

---

# REMOVE_ASSET Approval

## Validation

Asset must:

    allocated_to_id === request.employee_id

---

## Actions

Update Asset:

    allocated_to_id = null

    status = AVAILABLE

Update Request:

    status = APPROVED

Create history entry through AssetHistory module.

---

# MAINTENANCE Approval

## Validation

Asset must exist.

---

## Actions

Update Asset:

    status = MAINTENANCE

Update Request:

    status = APPROVED

Create history entry through AssetHistory module.

---

# Reject Request

## Endpoint

    PATCH /asset-requests/:id/reject

## Access

Admin Only

---

## DTO

    RejectRequestDto

---

## Required Fields

    admin_response

---

## Actions

Update Request:

    status = REJECTED

Store rejection reason.

---

# DTO Validation

## CreateAssetRequestDto

Location:

    src/asset-request/dto/create-asset-request.dto.ts

Fields:

    request_type
    asset_id
    description

Validation:

    @IsEnum(RequestType)

    @IsUUID()

    @IsString()
    @IsNotEmpty()

---

## RejectRequestDto

Location:

    src/asset-request/dto/reject-request.dto.ts

Fields:

    admin_response

Validation:

    @IsString()
    @IsNotEmpty()

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

# Messages

Store all messages inside:

    src/constant/messages.constant.ts

Example:

    export const AssetRequestMessages = {
      REQUEST_NOT_FOUND:
        'Asset request not found',

      REQUEST_CREATED_SUCCESSFULLY:
        'Asset request created successfully',

      REQUEST_APPROVED_SUCCESSFULLY:
        'Asset request approved successfully',

      REQUEST_REJECTED_SUCCESSFULLY:
        'Asset request rejected successfully',

      REQUEST_ALREADY_PROCESSED:
        'Request has already been processed',

      ASSET_NOT_AVAILABLE:
        'Asset is not available for allocation',

      INVALID_ASSET_OWNER:
        'Asset is not allocated to the employee',
    };

---

# Security Requirements

## Employee Routes

Protected using:

    JwtAuthGuard
    RolesGuard

    @Roles(Role.EMPLOYEE)

---

## Admin Routes

Protected using:

    JwtAuthGuard
    RolesGuard

    @Roles(Role.ADMIN)

---

# Definition Of Done

## Employee APIs Also for Admin as they are also employee

- [ ] Create Asset Request implemented
- [ ] Get My Requests implemented
- [ ] Get My Request Details implemented

## Admin APIs

- [ ] Get All Requests implemented
- [ ] Get Request Details implemented
- [ ] Approve Request implemented
- [ ] Reject Request implemented

## Request Types

- [ ] NEW_ASSET flow implemented
- [ ] REMOVE_ASSET flow implemented
- [ ] MAINTENANCE flow implemented

## Security

- [ ] JWT authentication implemented
- [ ] RBAC implemented
- [ ] Session validation implemented

## Database

- [ ] Prisma transaction used for approvals
- [ ] Request status transitions validated

## Verification

- [ ] Build passes
- [ ] Lint passes
- [ ] Manual API testing completed
- [ ] Request approval flow verified
- [ ] Request rejection flow verified
- [ ] Allocation workflow verified
- [ ] Deallocation workflow verified
- [ ] Maintenance workflow verified

---

# Expected Outcome

After completion, employees will be able to raise asset-related requests and administrators will be able to approve or reject those requests through a centralized workflow system. Approved requests will drive asset allocation, asset return, and maintenance operations while maintaining a clean separation between inventory management and workflow processing.
