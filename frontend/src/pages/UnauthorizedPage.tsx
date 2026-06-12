import { Link } from "react-router-dom";
import Icon from "../components/common/Icon";
import { ROUTES } from "../constants/routes";
import { selectIsAuthenticated } from "../features/auth/authSelectors";
import { useAppSelector } from "../store/hooks";
import styles from "./UnauthorizedPage.module.css";

/** 403 page shown when a user hits a route their role can't access. */
export default function UnauthorizedPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon}>
          <Icon name="lock" size={28} />
        </span>
        <h1 className={styles.code}>403</h1>
        <h2 className={styles.title}>Access denied</h2>
        <p className={styles.message}>
          You don't have permission to view this page.
        </p>
        <Link
          to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN}
          className={styles.button}
        >
          {isAuthenticated ? "Back to dashboard" : "Go to login"}
        </Link>
      </div>
    </div>
  );
}
