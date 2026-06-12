import styles from "./Loader.module.css";

interface LoaderProps {
  /** Center the loader within the full viewport (used for boot/route waits). */
  fullscreen?: boolean;
  label?: string;
}

/** Minimal accessible spinner used during auth boot and route transitions. */
export default function Loader({ fullscreen, label = "Loading…" }: LoaderProps) {
  return (
    <div
      className={fullscreen ? styles.fullscreen : styles.inline}
      role="status"
      aria-live="polite"
    >
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
