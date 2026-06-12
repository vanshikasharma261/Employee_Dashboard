import { Navigate, Outlet } from "react-router-dom";
import { Role } from "../../constants/roles";
import { ROUTES } from "../../constants/routes";
import { useAppSelector } from "../../store/hooks";
import {
  selectAuthInitializing,
  selectCurrentUser,
  selectIsAuthenticated,
} from "../../features/auth/authSelectors";
import Loader from "./Loader";

interface ProtectedRouteProps {
  /** Role(s) permitted to access the wrapped routes. */
  allow: Role | Role[];
}

/**
 * Route guard enforcing authentication + role access:
 * - while the boot `/me` check is in flight → show a loader (no login flash);
 * - unauthenticated → redirect to `/login`;
 * - authenticated but wrong role → redirect to `/unauthorized`;
 * - otherwise render the nested routes via `<Outlet/>`.
 */
export default function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const initializing = useAppSelector(selectAuthInitializing);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  if (initializing) {
    return <Loader fullscreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!allowed.includes(user.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
}
