import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/**
 * Augments Express's `User` type with our authenticated principal so that
 * `request.user` (and any `Express.User` parameter) is correctly typed as the
 * employee attached by {@link JwtStrategy} — giving `user.id`, `user.email` and
 * `user.role` across controllers and services without per-call casting.
 */
declare global {
  namespace Express {
    // Empty body is intentional: this is declaration merging onto Express's
    // existing `User` interface, adopting all of AuthenticatedUser's members.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthenticatedUser {}
  }
}

export {};
