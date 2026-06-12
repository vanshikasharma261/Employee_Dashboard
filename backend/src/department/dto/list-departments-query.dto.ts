import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { DEPARTMENT_SEARCH_MAX_LENGTH } from '../../constant/values.constant';

/**
 * Trims a string value (leaving non-strings for the validator to reject) so
 * blank/padded search terms are normalised before they reach the service.
 */
const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

/**
 * Query parameters for `GET /departments`.
 *
 * Validating here (rather than coercing raw strings in the controller) means
 * non-numeric or out-of-range values are rejected with a 400 by the global
 * `ValidationPipe` before reaching the service, and keeps the controller thin.
 */
export class ListDepartmentsQueryDto {
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
  @Transform(trimString)
  @IsString()
  @MaxLength(DEPARTMENT_SEARCH_MAX_LENGTH)
  search?: string;
}
