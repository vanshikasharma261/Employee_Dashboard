import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/dashboard/StatCard";
import Panel from "../components/dashboard/Panel";
import StatusBadge from "../components/common/StatusBadge";
import { selectCurrentUser } from "../features/auth/authSelectors";
import { useAppSelector } from "../store/hooks";
import styles from "./DashboardPage.module.css";

/**
 * Employee dashboard shell matching `employee_my_dashboard_ui.png`. Cards,
 * assets and activity are static placeholders — real data is Feature 015.
 */

const MY_ASSETS = [
  { name: 'MacBook Pro 14"', serial: "LAP-0231", status: "ALLOCATED" },
  { name: "Dell UltraSharp 27", serial: "MON-0114", status: "ALLOCATED" },
  { name: "Keychron K8", serial: "KEY-0190", status: "ALLOCATED" },
];

const ACTIVITY = [
  { title: "Maintenance request for MacBook Pro submitted", time: "2 days ago" },
  { title: "Keychron K8 keyboard allocated to you", time: "1 week ago" },
  { title: "Profile information updated", time: "2 weeks ago" },
  { title: "Dell UltraSharp 27 monitor allocated to you", time: "1 month ago" },
];

export default function EmployeeDashboardPage() {
  const user = useAppSelector(selectCurrentUser);
  const firstName = user?.first_name ?? "there";

  return (
    <div>
      <PageHeader
        title="My Dashboard"
        subtitle={`Welcome back, ${firstName}. Here's your overview.`}
      />

      <div className={`${styles.statGrid} ${styles.three}`}>
        <StatCard
          label="My Assets"
          value={3}
          hint="All currently allocated"
          icon="box"
          tone="blue"
        />
        <StatCard
          label="Open Requests"
          value={1}
          hint="Pending approval"
          icon="requests"
          tone="amber"
        />
        <StatCard
          label="Recent Activity"
          value={4}
          hint="In the last month"
          icon="activity"
          tone="green"
        />
      </div>

      <div className={styles.panelGrid}>
        <Panel title="My Assets" subtitle="Equipment allocated to you.">
          <ul className={styles.list}>
            {MY_ASSETS.map((asset) => (
              <li key={asset.serial} className={styles.listItem}>
                <div className={styles.listText}>
                  <span className={styles.listName}>{asset.name}</span>
                  <span className={styles.listSub}>{asset.serial}</span>
                </div>
                <StatusBadge status={asset.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Recent Activity"
          subtitle="Your latest actions and updates."
        >
          <ul className={styles.activity}>
            {ACTIVITY.map((item) => (
              <li key={item.title} className={styles.activityItem}>
                <span className={styles.dot} />
                <div className={styles.activityText}>
                  <span className={styles.activityTitle}>{item.title}</span>
                  <span className={styles.activityTime}>{item.time}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
