import { configureStore } from "@reduxjs/toolkit";
import authReducer, { clearAuth } from "../features/auth/authSlice";
import employeeReducer from "../features/employee/employeeSlice";
import departmentReducer from "../features/department/departmentSlice";
import assetReducer from "../features/asset/assetSlice";
import assetRequestReducer from "../features/asset-request/assetRequestSlice";
import { setUnauthorizedHandler } from "../services/api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employee: employeeReducer,
    department: departmentReducer,
    asset: assetReducer,
    assetRequest: assetRequestReducer,
  },
});

/**
 * Wire the API layer's central 401 handler to the store. Done here (rather than
 * inside `api.ts`) to avoid a circular import: `api.ts` stays dependency-free of
 * the store, and the store injects the dispatch. On any 401 the auth state is
 * cleared; `ProtectedRoute` then redirects to `/login`.
 */
setUnauthorizedHandler(() => {
  store.dispatch(clearAuth());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
