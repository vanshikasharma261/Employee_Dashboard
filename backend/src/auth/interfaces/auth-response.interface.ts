/**
 * Shape of the success body returned by the auth endpoints
 * (login / refresh / logout). Tokens are delivered via cookies, not the body.
 */
export interface AuthSuccessResponse {
  success: true;
  message: string;
}
