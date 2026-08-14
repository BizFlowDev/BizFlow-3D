"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SocketProvider } from "@/components/layout/socket-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/config/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, _hasHydrated } = useAuthStore();

  // Lấy role từ auth store, fallback "owner" khi chưa hydrate
  const role: UserRole = user?.role ?? "owner";

  // Loading state khi Zustand chưa hydrate từ localStorage
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          role={role}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header role={role} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <SocketProvider />
    </TooltipProvider>
  );
}
