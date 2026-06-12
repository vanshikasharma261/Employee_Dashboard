import styles from "./StatusBadge.module.css";

type BadgeTone = "green" | "amber" | "blue" | "red" | "gray";

/**
 * Maps every backend status enum value (Employee / Asset / Request) to a pill
 * color, per `ui-guidelines.md`. Unknown values fall back to a neutral gray.
 */
const TONE_BY_STATUS: Record<string, BadgeTone> = {
  // Employee
  WORKING: "green",
  ON_NOTICE: "amber",
  RESIGNED: "gray",
  TERMINATED: "red",
  // Asset
  AVAILABLE: "green",
  ALLOCATED: "blue",
  MAINTENANCE: "amber",
  TRASHED: "red",
  // Request
  PENDING: "amber",
  APPROVED: "blue",
  REJECTED: "red",
  COMPLETED: "green",
};

interface StatusBadgeProps {
  status: string;
}

/** Reusable pill badge for entity statuses. Shared across all future tables. */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const tone = TONE_BY_STATUS[status] ?? "gray";
  const label = status.replace(/_/g, " ");
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;
}
