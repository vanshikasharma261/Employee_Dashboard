import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ASSET_SERIAL_NUMBER_MAX_LENGTH } from '../../constant/values.constant';
import { AssetCategory } from '../../generated/prisma/client';

/**
 * Normalises a serial number (trim + UPPERCASE) so the canonical uppercase form
 * is what reaches the service and gets persisted — `LAP-001` and `lap-001` both
 * store as `LAP-001` and are therefore treated as duplicates. Non-strings are
 * passed through untouched for the validator to reject.
 */
const normaliseSerial = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : (value as unknown);

/**
 * Payload for `POST /assets`.
 *
 * Only the business-facing fields are accepted. System-managed fields (`id`,
 * `status`, `allocated_to_id`, `is_deleted`, `deleted_at`, `created_at`,
 * `updated_at`) are intentionally absent — the global
 * `ValidationPipe({ whitelist: true })` strips them if sent.
 */
export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(ASSET_SERIAL_NUMBER_MAX_LENGTH)
  @Transform(normaliseSerial)
  asset_serial_number!: string;

  @IsEnum(AssetCategory)
  asset_category!: AssetCategory;
}
