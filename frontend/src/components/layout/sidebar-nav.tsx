"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavSections, type UserRole } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { InventoryAlertBadge } from "@/components/layout/inventory-alert-badge";
import { AiOrdersBadge } from "@/components/layout/ai-orders-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavProps {
  role: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ role, collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const sections = getNavSections(role);

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
      {sections.map((section) => (
        <div key={section.title}>
          {!collapsed && (
            <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <span className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="truncate">{item.title}</span>
                      {item.href === "/inventory" && <InventoryAlertBadge />}
                      {item.href === "/ai-orders" && <AiOrdersBadge />}
                    </span>
                  )}
                </Link>
              );
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
