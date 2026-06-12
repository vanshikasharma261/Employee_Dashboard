import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/dashboard/StatCard";
import Panel from "../components/dashboard/Panel";
import StatusBadge from "../components/common/StatusBadge";
import { getInitials } from "../utils/user";
import styles from "./DashboardPage.module.css";

/**
 * Admin dashboard shell matching `dashboard_ui.png`. All figures and rows are
 * static placeholders — real data is wired in Feature 015.
 */

const RECENT_REQUESTS = [
  { employee: "Aarav Mehta", asset: 'MacBook Pro 14"', status: "PENDING" },
  { employee: "Yuki Tanaka", asset: "External Monitor", status: "APPROVED" },
  { employee: "Fatima Khan", asset: "Headset", status: "PENDING" },
  { employee: "Noah Wilson", asset: "Old Laptop", status: "COMPLETED" },
];

const RECENTLY_ADDED = [
  { name: "Aarav Mehta", role: "Senior Engineer · Engineering", status: "WORKING" },
  { name: "Sofia Rossi", role: "Product Manager · Product", status: "WORKING" },
  { name: "Liam O'Brien", role: "HR Specialist · Human Resources", status: "ON_NOTICE" },
  { name: "Yuki Tanaka", role: "Frontend Engineer · Engineering", status: "WORKING" },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of employees, assets, and pending requests."
      />

      <div className={styles.statGrid}>
        <StatCard
          label="Total Employees"
          value={117}
          hint="Across 6 departments"
          icon="employees"
          tone="blue"
        />
        <StatCard
          label="Working Employees"
          value={102}
          hint="87% active headcount"
          icon="user-check"
          tone="green"
        />
        <StatCard
          label="Assets Allocated"
          value={284}
          hint="38 available in inventory"
          icon="box"
          tone="blue"
        />
        <StatCard
          label="Pending Requests"
          value={9}
          hint="3 awaiting approval today"
          icon="requests"
          tone="amber"
        />
      </div>

      <div className={styles.panelGrid}>
        <Panel
          title="Recent Requests"
          subtitle="Latest asset and maintenance requests."
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Asset</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_REQUESTS.map((row) => (
                <tr key={`${row.employee}-${row.asset}`}>
                  <td>{row.employee}</td>
                  <td className={styles.muted}>{row.asset}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Recently Added"
          subtitle="New employees in the directory."
        >
          <ul className={styles.list}>
            {RECENTLY_ADDED.map((person) => (
              <li key={person.name} className={styles.listItem}>
                <span className={styles.avatar}>
                  {getInitials(person.name)}
                </span>
                <div className={styles.listText}>
                  <span className={styles.listName}>{person.name}</span>
                  <span className={styles.listSub}>{person.role}</span>
                </div>
                <StatusBadge status={person.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
