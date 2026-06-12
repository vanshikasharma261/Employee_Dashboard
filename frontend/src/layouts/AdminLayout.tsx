import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import AdminSidebar from "../components/sidebar/AdminSidebar";
import styles from "./layout.module.css";

/** Admin shell: AdminSidebar + Header + scrollable content (`<Outlet/>`). */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.body}>
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
