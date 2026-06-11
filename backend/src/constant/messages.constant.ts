/**
 * Application-wide exception / response messages.
 *
 * Centralised so the same wording is reused across modules rather than being
 * duplicated at each throw site.
 */

/** Authentication / session-validation messages. */
export const AuthMessages = {
  UNAUTHORIZED_EXCEPTION: 'User session is inactive',
} as const;
