import { ADMIN_NAV } from "../../constants/nav";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { useAppSelector } from "../../store/hooks";
import { getInitials, getFullName } from "../../utils/user";
import SidebarShell from "../layout/SidebarShell";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Admin sidebar — Administration + Employee Portal sections (per screenshots). */
export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const user = useAppSelector(selectCurrentUser);
  const name = user ? getFullName(user) : "";

  return (
    <SidebarShell
      subtitle="Management Suite"
      sections={ADMIN_NAV}
      footerName={name}
      footerRole="Administrator"
      footerInitials={getInitials(name)}
      open={open}
      onClose={onClose}
    />
  );
}
