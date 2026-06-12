import { NavLink } from "react-router-dom";
import logo from "../../assets/acme-hr-logo.png";
import type { NavSection } from "../../constants/nav";
import Icon from "../common/Icon";
import type { IconName } from "../common/Icon";
import styles from "./SidebarShell.module.css";

interface SidebarShellProps {
  /** Brand subtitle under "Acme HR" ("Management Suite" / "Employee Portal"). */
  subtitle: string;
  sections: NavSection[];
  footerName: string;
  footerRole: string;
  footerInitials: string;
  /** Mobile drawer open state. */
  open: boolean;
  /** Close the mobile drawer (called when a link is followed / backdrop tap). */
  onClose: () => void;
}

/**
 * Shared sidebar chrome (brand block + nav sections + user footer) reused by
 * both `AdminSidebar` and `EmployeeSidebar` — satisfies the spec's "Sidebar
 * Layout Reusability". On desktop it's a fixed rail; on mobile a slide-in
 * drawer toggled from the header.
 */
export default function SidebarShell({
  subtitle,
  sections,
  footerName,
  footerRole,
  footerInitials,
  open,
  onClose,
}: SidebarShellProps) {
  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.brand}>
          <img src={logo} alt="" className={styles.logo} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>Acme HR Suite</span>
            <span className={styles.brandSubtitle}>{subtitle}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {sections.map((section) => (
            <div key={section.title} className={styles.section}>
              <p className={styles.sectionTitle}>{section.title}</p>
              {section.items.map((item) => (
                <NavLink
                  key={`${section.title}-${item.label}`}
                  to={item.to}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `${styles.link} ${isActive ? styles.linkActive : ""}`
                  }
                >
                  <Icon name={item.icon as IconName} size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <span className={styles.avatar}>{footerInitials}</span>
          <div className={styles.footerText}>
            <span className={styles.footerName}>{footerName}</span>
            <span className={styles.footerRole}>{footerRole}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
