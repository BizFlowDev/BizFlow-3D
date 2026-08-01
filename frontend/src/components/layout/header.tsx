"use client";

import { useState } from "react";
import { Bell, LogOut, Search, User } from "lucide-react";
import type { UserRole } from "@/config/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

interface HeaderProps {
  role: UserRole;
}

export function Header({ role }: HeaderProps) {
  const [notificationCount] = useState(3);
  const roleLabel =
    role === "admin" ? "Quản trị viên" : role === "owner" ? "Chủ cửa hàng" : "Nhân viên";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <MobileSidebar role={role} />

      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeSwitcher />

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-xs">
              {notificationCount}
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">NV</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">Người dùng</div>
              <div className="text-xs font-normal text-muted-foreground">{roleLabel}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User />
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
