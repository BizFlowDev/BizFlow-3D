import type { UserRole } from "@/config/navigation";

const STORAGE_KEY = "bizflow.user";

export function getStoredRole(): UserRole {
  if (typeof window === "undefined") {
    return "owner";
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return "owner";
    }
    const parsed = JSON.parse(raw) as { role?: UserRole } | null;
    const role = parsed?.role;
    return role === "admin" || role === "owner" || role === "employee" ? role : "owner";
  } catch {
    return "owner";
  }
}
