import type { ApiError } from "../types/common.types";

/**
 * Centralized fetch wrapper for the backend API.
 *
 * Auth is cookie-based (httpOnly): every request sends `credentials: 'include'`
 * so the browser attaches the auth cookies — there is no Authorization header
 * and no localStorage token. Responses are JSON-parsed; non-2xx responses are
 * normalized into an {@link ApiError} that carries the backend message and any
 * field-keyed validation errors. A `401` from any call (except where opted out)
 * invokes the central unauthorized handler so the app drops to `/login`.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/**
 * Central 401 handler, injected by the store layer to avoid a circular import
 * (api → store → slices → … → api). Called when a request returns 401.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  /** Skip the central 401 handler (e.g. the login call, which expects 401s). */
  skipAuthRedirect?: boolean;
}

/** Type guard for a flat record of string values (field-keyed 400 body). */
function isFieldErrorBody(body: unknown): body is Record<string, string> {
  return (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    Object.values(body).every((v) => typeof v === "string")
  );
}

/** Turn an arbitrary backend error body into a normalized {@link ApiError}. */
function normalizeError(status: number, body: unknown): ApiError {
  // Nest standard exceptions: { statusCode, message, error }.
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body
  ) {
    const message = (body as { message: unknown }).message;
    return {
      status,
      message: Array.isArray(message)
        ? String(message[0])
        : String(message),
    };
  }

  // ValidationPipe field-keyed body: { email: "...", password: "..." }.
  if (isFieldErrorBody(body)) {
    const fieldErrors = body;
    const first = Object.values(fieldErrors)[0];
    return {
      status,
      message: first ?? "Validation failed.",
      fieldErrors,
    };
  }

  return { status, message: "Something went wrong. Please try again." };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Network / CORS failure — no response was received.
    throw {
      status: 0,
      message: "Unable to reach the server. Check your connection.",
    } satisfies ApiError;
  }

  if (response.status === 401 && !options.skipAuthRedirect) {
    onUnauthorized?.();
  }

  // 204 No Content (or empty body) — nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw normalizeError(response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};
