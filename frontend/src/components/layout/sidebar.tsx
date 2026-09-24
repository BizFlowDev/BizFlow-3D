"use client";

import Link from "next/link";
import { Boxes, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { UserRole } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ role, collapsed, onToggleCollapsed }: SidebarProps) {
  const homeHref = role === "admin" ? "/admin/stores" : role === "employee" ? "/orders/new" : "/";

  return (
    <aside
      className={cn(
        "hidden h-full flex-col border-r bg-background transition-all duration-300 md:flex",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <Link href={homeHref} className="flex items-center gap-2">
          <Boxes className="h-7 w-7 shrink-0 text-primary" />
          {!collapsed && <span className="whitespace-nowrap text-lg font-bold">BizFlow 3D</span>}
        </Link>
      </div>

      <SidebarNav role={role} collapsed={collapsed} />

      <div className={cn("shrink-0 border-t p-3", collapsed && "flex justify-center")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  );
}
