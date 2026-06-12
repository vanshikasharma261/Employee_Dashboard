## Feature 007 — Asset Management Module

## Feature Overview

Implement the Asset Management module for the Employee Management Dashboard backend.

This feature is responsible for managing the organization's asset inventory and maintaining asset lifecycle information.

All operations in this module are restricted to authenticated administrators.

Business logic must reside in the service layer and database interactions must be performed through Prisma.

This module is responsible only for Asset CRUD operations.

Asset allocation, deallocation, request approval workflows, and asset history tracking are out of scope and will be implemented in dedicated modules.

---

## References

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
- @backend/prisma/schema.prisma - for better knowledge of actual db schema and model entities

## API Contract

Refer to:

- @context/api-contract.md

## Important

`/api` is configured globally and must not be manually included in controller routes.

---

## Objective

## Provide APIs for:

- Fetching all assets
- Fetching asset details
- Creating assets
- Updating assets
- Updating asset status
- Soft deleting assets

The module serves as the source of truth for company-owned assets.

---

## Scope

## Included

### Asset CRUD

- Get Assets
- Get Asset By Id
- Create Asset
- Update Asset
- Update Asset Status
- Delete Asset

### Validation

- Asset serial number uniqueness validation
- Asset category validation
- Asset status validation

### Security

- JWT Authentication
- Role Based Authorization
- Session Validation

### Soft Delete

- Asset soft deletion
- Deleted asset exclusion from queries

---

## Excluded

The following functionality belongs to future modules and must not be implemented in this feature:

### Asset Request Module

- New asset requests
- Asset removal requests
- Maintenance requests
- Approval workflow

### Asset History Module

- Allocation history
- Ownership timeline
- Audit tracking

### Asset Allocation

- Asset assignment
- Asset return
- Employee allocation management

---

## Module Structure

    src/asset

    ├── asset.module.ts
    ├── asset.controller.ts
    ├── asset.service.ts

    ├── dto
    │   ├── create-asset.dto.ts
    │   ├── update-asset.dto.ts
    │   └── update-asset-status.dto.ts

---

## Dependencies

AssetModule must import: PrismaModule AuthModule

AssetService must inject: PrismaService AuthService

through dependency injection.

---

## Authorization Rules

All Asset APIs are restricted to administrators.

Routes must be protected using: @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)

---

## Routes

## Get All Assets

    GET /assets

---

## Get Asset By Id

    GET /assets/:id

---

## Create Asset

    POST /assets

---

## Update Asset

    PATCH /assets/:id

---

## Update Asset Status

    PATCH /assets/:id/status

---

## Delete Asset

    DELETE /assets/:id

---

## Get All Assets

Endpoint

    GET /assets

## Access

Admin Only Purpose

---

Fetch all active assets.

---

## Rules

- Exclude soft deleted assets.
- Support pagination.
- Support search on asset_serial_number AND asset_category.
- Include allocated employee information if asset is currently allocated; otherwise allocated_to is null.
- Order by creation date descending.

---

## Recommended Query Parameters

    GET /assets?page=1&limit=10&search=laptop

## Support:

- Pagination
- Search (matches asset_serial_number substring AND asset_category)

---

## Response Fields

Return: id asset_serial_number asset_category status allocated_to

---

## Excluded Fields

Never return: is_deleted deleted_at created_at updated_at

---

## Get Asset By Id

Endpoint

    GET /assets/:id

Access

Admin Only

---

Validation Rules

Asset must:

- Exist
- Not be soft deleted

---

Success Response

Return asset details.

---

## Create Asset

Endpoint

    POST /assets

Access

Admin Only

---

## DTO

    CreateAssetDto

---

## Required Fields

    asset_serial_number
    asset_category

---

Validation Rules

### Asset Serial Number

- Required
- Unique
- Trim whitespace
- Normalize to UPPERCASE before persisting (store canonical uppercase form in the DB)
- Case-insensitive uniqueness validation

Examples: LAPTOP-001 laptop-001

must be treated as duplicates (both stored as `LAPTOP-001`).

---

### Asset Category

Must be validated using: @IsEnum(AssetCategory)

Allowed values originate from Prisma enum: LAPTOP MOUSE KEYBOARD HEADSET EARPHONE MOBILE_PHONE SCREEN COOLING_PAD IPAD

---

## System Managed Fields

Never accept: id status allocated_to_id is_deleted deleted_at created_at updated_at

---

## Default Values

- Automatically set: status = AVAILABLE -allocated_to_id = null is_deleted = false -deleted_at = null

## Database generates:

-id
-created_at
-updated_at

---

## Success Response

Return newly created asset.

---

## Update Asset

### Endpoint

    PATCH /assets/:id

### Access

Admin Only

---

### DTO

    export class UpdateAssetDto extends PartialType(
      CreateAssetDto,
    ) {}

---

### Rules

Before updating:

- Asset must exist.
- Asset must not be deleted.
- Updated serial number must remain unique.

---

### Success Response

Return updated asset.

---

## Update Asset Status

### Endpoint

    PATCH /assets/:id/status

### Access

Admin Only

---

### Purpose

Update asset lifecycle status.

---

### DTO

    UpdateAssetStatusDto

---

### Required Fields

    status

---

### Validation

    @IsEnum(AssetStatus)

Allowed values: AVAILABLE MAINTENANCE TRASHED

---

### Allocation Restriction

Asset status must not be manually changed to: ALLOCATED

Asset allocation is managed through the Asset Request Module.

Attempting to set: status = ALLOCATED

must throw: BadRequestException

---

## Delete Asset

### Endpoint

    DELETE /assets/:id

### Access

Admin Only

---

### Purpose

Soft delete asset.

---

### Validation Rules

Asset must:

- Exist
- Not already be deleted

---

### Allocation Validation

Asset cannot be deleted when: allocated_to_id !== null

Throw: BadRequestException

---

### Soft Delete Behaviour

Never physically delete records.

Update: is_deleted = true deleted_at = new Date()

---

### Success Response

Return success message.

---

## DTO Validation

### CreateAssetDto

Location: src/asset/dto/create-asset.dto.ts

Fields: asset_serial_number asset_category

Validation: @IsString() @IsNotEmpty() @Transform(({ value }) => value.trim().toUpperCase()) // asset_serial_number — trimmed + uppercased @IsEnum(AssetCategory) // asset_category

---

### UpdateAssetDto

Location: src/asset/dto/update-asset.dto.ts

Implementation: export class UpdateAssetDto extends PartialType( CreateAssetDto, ) {}

---

### UpdateAssetStatusDto

Location: src/asset/dto/update-asset-status.dto.ts

Fields: status

Validation: @IsEnum(AssetStatus)

---

## Session Validation

Before executing protected business logic: const status = await this.authService.isUserActive(user); if (!status) { throw new UnauthorizedException( AuthMessages.UNAUTHORIZED_EXCEPTION, ); }

Apply the existing AuthService session validation utility.

---

## Exception Handling

Use NestJS exceptions only.

Examples: BadRequestException UnauthorizedException ForbiddenException NotFoundException ConflictException

---

## Messages

Do not hardcode messages.

Store all messages inside: src/constants/messages.constant.ts

Example: export const AssetMessages = { ASSET_NOT_FOUND: 'Asset not found', ASSET_ALREADY_EXISTS: 'Asset already exists', ASSET_CREATED_SUCCESSFULLY: 'Asset created successfully', ASSET_UPDATED_SUCCESSFULLY: 'Asset updated successfully', ASSET_STATUS_UPDATED_SUCCESSFULLY: 'Asset status updated successfully', ASSET_DELETED_SUCCESSFULLY: 'Asset deleted successfully', ASSET_ALREADY_DELETED: 'Asset already deleted', ASSET_CANNOT_BE_DELETED: 'Allocated asset cannot be deleted', INVALID_ASSET_STATUS: 'Invalid asset status transition', };

---

## Security Requirements

### Route Protection

All asset routes must use: JwtAuthGuard RolesGuard

and: @Roles(Role.ADMIN)

---

### Session Validation

All service methods must validate: await this.authService.isUserActive(user)

before executing protected operations.

---

## Definition Of Done

### APIs

- Get All Assets implemented
- Get Asset By Id implemented
- Create Asset implemented
- Update Asset implemented
- Update Asset Status implemented
- Delete Asset implemented

### Validation

- CreateAssetDto implemented
- UpdateAssetDto implemented
- UpdateAssetStatusDto implemented
- Asset serial number uniqueness validation implemented
- Asset category validation implemented

### Authorization

- All routes protected with JWT authentication
- All routes protected with Admin RBAC
- Service-level session validation implemented

### Business Rules

- Soft delete implemented
- Asset uniqueness enforced
- Asset allocation deletion validation implemented

### Security

- No hardcoded exception messages
- Session validation utility used
- Unauthorized access blocked

### Verification

- Build passes
- Lint passes
- Manual API testing completed
- Duplicate asset creation blocked
- Soft deleted assets excluded from queries
- Asset status updates validated
- Allocated assets cannot be deleted

---

### Expected Outcome

After completion, administrators will be able to manage company assets through a secure Asset Management module that supports inventory tracking, lifecycle status management, soft deletion, and validation rules while providing a clean foundation for future Asset Request and Asset History modules.
