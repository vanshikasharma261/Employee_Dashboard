import { createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../services/api";
import { AUTH, EMPLOYEES } from "../../services/endpoints";
import type { ApiError } from "../../types/common.types";
import type { AuthUser, LoginCredentials } from "../../types/auth.types";

/**
 * Login is a two-step flow because the backend's `POST /auth/login` sets
 * httpOnly cookies and returns only `{ success, message }` — no role/user.
 * Step 1 authenticates (cookies are stored by the browser); step 2 reads
 * `GET /employees/me` to obtain the safe employee (incl. `role`) for redirect
 * and header identity. The `/login` 401 is shown as an error, not redirected.
 */
export const login = createAsyncThunk<
  AuthUser,
  LoginCredentials,
  { rejectValue: ApiError }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    await api.post(
      AUTH.LOGIN,
      { email: credentials.email, password: credentials.password },
      { skipAuthRedirect: true },
    );
    return await api.get<AuthUser>(EMPLOYEES.ME, { skipAuthRedirect: true });
  } catch (error) {
    return rejectWithValue(error as ApiError);
  }
});

/**
 * Boot/reload session rehydration. The httpOnly cookie persists across reloads;
 * `GET /employees/me` re-derives auth state. 200 → authenticated; 401 → not.
 * Skips the central redirect so the boot check itself doesn't bounce the app.
 */
export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: ApiError }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    return await api.get<AuthUser>(EMPLOYEES.ME, { skipAuthRedirect: true });
  } catch (error) {
    return rejectWithValue(error as ApiError);
  }
});

/**
 * Logout clears cookies server-side. State is always cleared in the slice's
 * reducers regardless of whether the call succeeds, so a failed network call
 * still logs the user out locally.
 */
export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await api.post(AUTH.LOGOUT);
  } catch {
    // Ignore — the slice clears auth state on settle either way.
  }
});
