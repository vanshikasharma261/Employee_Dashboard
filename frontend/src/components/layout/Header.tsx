import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { logout } from "../../features/auth/authThunks";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getFullName, getInitials } from "../../utils/user";
import Icon from "../common/Icon";
import styles from "./Header.module.css";

interface HeaderProps {
  /** Toggle the mobile sidebar drawer. */
  onToggleSidebar: () => void;
}

/**
 * Top app bar: sidebar toggle, a (non-functional in 010) search field,
 * notification bell, and an avatar menu with logout. Shared by both layouts.
 */
export default function Header({ onToggleSidebar }: HeaderProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const [menuOpen, setMenuOpen] = useState(false);

  const name = user ? getFullName(user) : "";

  const handleLogout = async () => {
    setMenuOpen(false);
    await dispatch(logout());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.iconButton}
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        <Icon name="menu" />
      </button>

      <div className={styles.search}>
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Search…"
          aria-label="Search"
          disabled
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Notifications"
        >
          <Icon name="bell" />
        </button>

        <div className={styles.avatarMenu}>
          <button
            type="button"
            className={styles.avatar}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            {getInitials(name)}
          </button>
          {menuOpen && (
            <>
              <div
                className={styles.menuBackdrop}
                onClick={() => setMenuOpen(false)}
              />
              <div className={styles.menu} role="menu">
                <div className={styles.menuHeader}>
                  <span className={styles.menuName}>{name}</span>
                  <span className={styles.menuEmail}>
                    {user?.official_email}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <Icon name="logout" size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
