import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ASSET_REQUEST_DESCRIPTION_MAX_LENGTH } from '../../constant/values.constant';
import { RequestType } from '../../generated/prisma/client';

/**
 * Trims a string value (leaving non-strings for the validator to reject) so a
 * padded description is normalised before it reaches the service.
 */
const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

/**
 * Payload for `POST /asset-requests`.
 *
 * Only the business-facing fields are accepted. System-managed fields
 * (`employee_id`, `status`, `admin_response`, `is_deleted`, `deleted_at`,
 * timestamps) are intentionally absent — `employee_id` is always taken from the
 * authenticated principal, and the global `ValidationPipe({ whitelist: true })`
 * strips any other unknown props.
 */
export class CreateAssetRequestDto {
  @IsEnum(RequestType)
  request_type!: RequestType;

  @IsUUID()
  asset_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(ASSET_REQUEST_DESCRIPTION_MAX_LENGTH)
  @Transform(trimString)
  description!: string;
}
