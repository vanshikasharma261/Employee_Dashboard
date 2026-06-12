import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DEPARTMENT_NAME_MAX_LENGTH } from '../../constant/values.constant';

/**
 * Trims a string value (leaving non-strings for the validator to reject) so
 * padded names are normalised before they reach the service.
 */
const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

/**
 * Payload for `POST /departments`.
 *
 * Only `name` is accepted. System-managed fields (`id`, `is_deleted`,
 * `deleted_at`, `created_at`, `updated_at`) are intentionally absent — the
 * global `ValidationPipe({ whitelist: true })` strips them if sent.
 */
export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEPARTMENT_NAME_MAX_LENGTH)
  @Transform(trimString)
  name!: string;
}
