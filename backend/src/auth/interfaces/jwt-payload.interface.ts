import { Role } from '../../generated/prisma/client';

/**
 * Claims carried by both the access and refresh JWTs.
 * Only the minimum required to identify and authorize the employee is stored.
 */
export interface JwtPayload {
  sub: string; // employee id
  email: string; // official_email
  role: Role;
}
