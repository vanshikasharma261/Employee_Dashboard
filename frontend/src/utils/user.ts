import type { AuthUser } from "../types/auth.types";

/** "Priya Nair" → "Priya Nair" (full display name). */
export function getFullName(user: Pick<AuthUser, "first_name" | "last_name">) {
  return `${user.first_name} ${user.last_name}`.trim();
}

/** "Priya Nair" → "PN" (avatar initials; falls back to "?"). */
export function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
