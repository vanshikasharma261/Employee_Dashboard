import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EMPLOYEE_TEXT_MAX_LENGTH } from '../../constant/values.constant';
import { Role } from '../../generated/prisma/client';

/**
 * Normalises an email-like value (trim + lower-case) so it can be matched
 * against the stored, normalised emails. Non-strings are passed through
 * untouched for the validator to reject.
 */
const normaliseEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown);

/**
 * Payload for `POST /employees`.
 *
 * Only the business-facing fields are accepted. Relationships are supplied as
 * business keys (`department_name`, `reporting_manager_official_email`) and the
 * service resolves them to foreign keys. System-managed fields (`id`, `status`,
 * `employee_code`, `is_*`, `*_at`, `refresh_token_hash`) are intentionally
 * absent — the global `ValidationPipe({ whitelist: true })` strips them if sent.
 */
export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(EMPLOYEE_TEXT_MAX_LENGTH)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(EMPLOYEE_TEXT_MAX_LENGTH)
  last_name!: string;

  @IsEmail()
  @Transform(normaliseEmail)
  official_email!: string;

  @IsEmail()
  @Transform(normaliseEmail)
  personal_email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @IsNotEmpty()
  @MaxLength(EMPLOYEE_TEXT_MAX_LENGTH)
  department_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(EMPLOYEE_TEXT_MAX_LENGTH)
  present_address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(EMPLOYEE_TEXT_MAX_LENGTH)
  permanent_address!: string;

  @IsDateString()
  joining_date!: string;

  @IsOptional()
  @IsEmail()
  @Transform(normaliseEmail)
  reporting_manager_official_email?: string;
}
