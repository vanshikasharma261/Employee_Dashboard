import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { RequestStatus, RequestType } from '../../generated/prisma/client';

/**
 * Query parameters for `GET /asset-requests` (admin) and `GET /asset-requests/my`.
 *
 * Validating here (rather than coercing raw strings in the controller) means
 * non-numeric or out-of-enum values are rejected with a 400 by the global
 * `ValidationPipe` before reaching the service, keeping the controller thin.
 */
export class ListAssetRequestsQueryDto {
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
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsEnum(RequestType)
  request_type?: RequestType;
}
