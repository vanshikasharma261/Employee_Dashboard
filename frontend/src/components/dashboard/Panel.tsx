import type { ReactNode } from "react";
import styles from "./Panel.module.css";

interface PanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Bordered content panel with a title/subtitle header (dashboard sections). */
export default function Panel({ title, subtitle, children }: PanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
