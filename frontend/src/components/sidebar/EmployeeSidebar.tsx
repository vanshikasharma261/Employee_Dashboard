import { EMPLOYEE_NAV } from "../../constants/nav";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { useAppSelector } from "../../store/hooks";
import { getInitials, getFullName } from "../../utils/user";
import SidebarShell from "../layout/SidebarShell";

interface EmployeeSidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Employee sidebar — Employee Portal section only (per screenshots). */
export default function EmployeeSidebar({ open, onClose }: EmployeeSidebarProps) {
  const user = useAppSelector(selectCurrentUser);
  const name = user ? getFullName(user) : "";
  // No job-title field exists in the safe employee shape; show the department
  // (falls back to a generic label) as the footer role line.
  const role = user?.department?.name ?? "Employee";

  return (
    <SidebarShell
      subtitle="Employee Portal"
      sections={EMPLOYEE_NAV}
      footerName={name}
      footerRole={role}
      footerInitials={getInitials(name)}
      open={open}
      onClose={onClose}
    />
  );
}
