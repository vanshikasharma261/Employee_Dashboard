import type { RootState } from "../../store/store";

export const selectAuth = (state: RootState) => state.auth;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectUserRole = (state: RootState) => state.auth.user?.role ?? null;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthInitializing = (state: RootState) =>
  state.auth.initializing;
export const selectAuthError = (state: RootState) => state.auth.error;
