import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ADMIN_RESPONSE_MAX_LENGTH } from '../../constant/values.constant';

/**
 * Trims a string value (leaving non-strings for the validator to reject).
 */
const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

/**
 * Payload for `PATCH /asset-requests/:id/approve`.
 *
 * `admin_response` is required on approval — it is stored on the request and
 * also becomes the `remarks` on the history record written in the same
 * transaction.
 */
export class ApproveRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADMIN_RESPONSE_MAX_LENGTH)
  @Transform(trimString)
  admin_response!: string;
}
