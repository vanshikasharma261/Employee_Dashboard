import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Payload for `POST /auth/login`.
 * The email is normalised (trimmed + lower-cased) before validation so it can
 * be matched against the stored `official_email`. No password strength rules
 * are applied on login.
 */
export class LoginDto {
  @IsEmail()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
