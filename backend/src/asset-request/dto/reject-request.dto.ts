import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ADMIN_RESPONSE_MAX_LENGTH } from '../../constant/values.constant';

/**
 * Trims a string value (leaving non-strings for the validator to reject).
 */
const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

/**
 * Payload for `PATCH /asset-requests/:id/reject`.
 *
 * Same shape as {@link ApproveRequestDto}; kept as a separate DTO for clarity
 * and to allow future divergence. `admin_response` is stored on the request; no
 * asset mutation and no history record result from a rejection.
 */
export class RejectRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADMIN_RESPONSE_MAX_LENGTH)
  @Transform(trimString)
  admin_response!: string;
}
