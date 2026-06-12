import type { IconName } from "../common/Icon";
import Icon from "../common/Icon";
import styles from "./StatCard.module.css";

type StatTone = "blue" | "green" | "amber" | "red";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconName;
  tone?: StatTone;
}

/** Dashboard stat card (label, big value, hint, tinted icon) per screenshots. */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.icon} ${styles[tone]}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <span className={styles.value}>{value}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
