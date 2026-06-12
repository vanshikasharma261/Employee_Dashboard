import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import EmployeeSidebar from "../components/sidebar/EmployeeSidebar";
import styles from "./layout.module.css";

/** Employee shell: EmployeeSidebar + Header + scrollable content (`<Outlet/>`). */
export default function EmployeeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <EmployeeSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={styles.body}>
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
