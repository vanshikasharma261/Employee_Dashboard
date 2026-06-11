import { Role } from '../../generated/prisma/client';

/**
 * The authenticated principal attached to `request.user` by {@link JwtStrategy}.
 *
 * Deliberately a minimal, safe subset of the Employee record — it never carries
 * secrets such as `password` or `refresh_token_hash`.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
