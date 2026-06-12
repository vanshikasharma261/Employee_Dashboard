import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import logo from "../assets/acme-hr-logo.png";
import { ROUTES } from "../constants/routes";
import {
  selectAuthError,
  selectAuthLoading,
  selectIsAuthenticated,
} from "../features/auth/authSelectors";
import { clearError } from "../features/auth/authSlice";
import { login } from "../features/auth/authThunks";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { LoginCredentials } from "../types/auth.types";
import styles from "./LoginPage.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Centered auth card. Validates the two fields (RHF), dispatches the two-step
 * `login` thunk, shows a loading button, surfaces the normalized API error,
 * and redirects to `/dashboard` (role decides which layout renders) on success.
 */
export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const loading = useAppSelector(selectAuthLoading);
  const apiError = useAppSelector(selectAuthError);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    defaultValues: { email: "", password: "" },
  });

  // Redirect once authenticated (covers both fresh login and already-logged-in).
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear any stale API error when the page mounts.
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const onSubmit = (values: LoginCredentials) => {
    dispatch(login(values));
  };

  return (
    <div className={styles.page}>
      <form
        className={styles.card}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className={styles.brand}>
          <img src={logo} alt="Acme HR Suite" className={styles.logo} />
        </div>

        <h1 className={styles.title}>Login User</h1>
        <p className={styles.subtitle}>EMS</p>

        {apiError && <div className={styles.alert}>{apiError}</div>}

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={errors.email ? "true" : "false"}
            {...register("email", {
              required: "Email is required.",
              pattern: {
                value: EMAIL_PATTERN,
                message: "Enter a valid email address.",
              },
            })}
          />
          {errors.email && (
            <span className={styles.error}>{errors.email.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? "true" : "false"}
            {...register("password", {
              required: "Password is required.",
            })}
          />
          {errors.password && (
            <span className={styles.error}>{errors.password.message}</span>
          )}
        </div>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
