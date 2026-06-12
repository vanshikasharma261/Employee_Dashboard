import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { RequestType } from '../../generated/prisma/client';

/**
 * Query parameters for `GET /asset-history`.
 *
 * Validating here (rather than coercing raw strings in the controller) means
 * non-numeric, malformed-UUID, or out-of-enum values are rejected with a 400 by
 * the global `ValidationPipe` before reaching the service, keeping the
 * controller thin.
 *
 * `event_type` reuses the `RequestType` enum — history records carry the event
 * type from the request that produced them (NEW_ASSET / REMOVE_ASSET /
 * MAINTENANCE).
 */
export class ListAssetHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsUUID()
  asset_id?: string;

  @IsOptional()
  @IsUUID()
  employee_id?: string;

  @IsOptional()
  @IsEnum(RequestType)
  event_type?: RequestType;
}
