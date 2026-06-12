import { IsIn } from 'class-validator';
import { AssetMessages } from '../../constant/messages.constant';
import { AssetStatus } from '../../generated/prisma/client';

/**
 * Statuses an admin may set manually via `PATCH /assets/:id/status`.
 *
 * `ALLOCATED` is deliberately excluded — allocation is owned by the future
 * Asset Request module and must never be set by a direct status edit. This is
 * the single source of truth for both the DTO validation below and the
 * service-level defence-in-depth guard.
 */
export const MANUAL_ASSET_STATUSES: AssetStatus[] = [
  AssetStatus.AVAILABLE,
  AssetStatus.MAINTENANCE,
  AssetStatus.TRASHED,
];

/**
 * Payload for `PATCH /assets/:id/status`.
 *
 * Validation rejects any value outside {@link MANUAL_ASSET_STATUSES} — including
 * `ALLOCATED` — at the request boundary, so the restriction is visible here
 * rather than hidden in the service.
 */
export class UpdateAssetStatusDto {
  @IsIn(MANUAL_ASSET_STATUSES, { message: AssetMessages.INVALID_ASSET_STATUS })
  status!: AssetStatus;
}
