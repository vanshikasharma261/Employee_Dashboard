import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Loader from "../components/common/Loader";
import ProtectedRoute from "../components/common/ProtectedRoute";
import { Role } from "../constants/roles";
import { ROUTES } from "../constants/routes";
import {
  selectAuthInitializing,
  selectIsAuthenticated,
  selectUserRole,
} from "../features/auth/authSelectors";
import AdminLayout from "../layouts/AdminLayout";
import EmployeeLayout from "../layouts/EmployeeLayout";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import EmployeeDashboardPage from "../pages/EmployeeDashboardPage";
import LoginPage from "../pages/LoginPage";
import PlaceholderPage from "../pages/PlaceholderPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import { useAppSelector } from "../store/hooks";

/**
 * Auth-only gate for the whole app shell. While the boot `/me` check runs it
 * shows a loader (no login flash); unauthenticated users go to `/login`.
 */
function RequireAuth() {
  const initializing = useAppSelector(selectAuthInitializing);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (initializing) return <Loader fullscreen />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <Outlet />;
}

/** Renders the role-appropriate layout (each contains its own `<Outlet/>`). */
function RoleLayout() {
  const role = useAppSelector(selectUserRole);
  return role === Role.ADMIN ? <AdminLayout /> : <EmployeeLayout />;
}

/** `/dashboard` resolves to the admin or employee dashboard by role. */
function DashboardByRole() {
  const role = useAppSelector(selectUserRole);
  return role === Role.ADMIN ? <AdminDashboardPage /> : <EmployeeDashboardPage />;
}

/**
 * Application route tree.
 *
 * - Public: `/login`, `/unauthorized`.
 * - Authenticated shell (`RequireAuth` → `RoleLayout`): shared portal routes
 *   for both roles (`/dashboard`, `/my-assets`, `/my-requests`, `/profile`),
 *   plus an admin-only group (`ProtectedRoute allow=ADMIN`) for the management
 *   modules. All module targets are placeholders in Feature 010.
 */
export default function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<RoleLayout />}>
          <Route
            index
            element={<Navigate to={ROUTES.DASHBOARD} replace />}
          />
          <Route path={ROUTES.DASHBOARD} element={<DashboardByRole />} />

          {/* Shared Employee Portal routes (both roles) */}
          <Route
            path={ROUTES.MY_ASSETS}
            element={<PlaceholderPage title="My Assets" />}
          />
          <Route
            path={ROUTES.MY_REQUESTS}
            element={<PlaceholderPage title="My Requests" />}
          />
          <Route
            path={ROUTES.PROFILE}
            element={<PlaceholderPage title="My Profile" />}
          />

          {/* Admin-only management modules */}
          <Route element={<ProtectedRoute allow={Role.ADMIN} />}>
            <Route
              path={ROUTES.EMPLOYEES}
              element={<PlaceholderPage title="Employees" />}
            />
            <Route
              path={ROUTES.DEPARTMENTS}
              element={<PlaceholderPage title="Departments" />}
            />
            <Route
              path={ROUTES.HIERARCHY}
              element={<PlaceholderPage title="Hierarchy" />}
            />
            <Route
              path={ROUTES.ASSETS}
              element={<PlaceholderPage title="Assets" />}
            />
            <Route
              path={ROUTES.ASSET_REQUESTS}
              element={<PlaceholderPage title="Requests" />}
            />
          </Route>
        </Route>
      </Route>

      {/* Unknown → dashboard (which resolves per role / bounces to login). */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
