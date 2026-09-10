"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Boxes, CheckCheck, LogOut, QrCode, Search, User, X } from "lucide-react";
import type { UserRole } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/auth-store";
import { useSocketStore, syncAnnouncements } from "@/hooks/useSocket";
import { useUiPreferencesStore } from "@/lib/stores/uiPreferences";

interface HeaderProps {
  role: UserRole;
}

export function Header({ role }: HeaderProps) {
  const router = useRouter();
  // Chỉ render Switch sau khi mount để tránh hydration mismatch
  // (store detect thiết bị ở client, mặc định SSR là true)
  const [mounted, setMounted] = useState(false);
  const { logout } = useAuth();
  const { user } = useAuthStore();
  const { is3DEnabled, toggle3D } = useUiPreferencesStore();

  // ── Notification bell (real-time qua socket) ──
  const notifications = useSocketStore((s) => s.notifications);
  const unreadCount = useSocketStore((s) => s.unreadCount);
  const markNotificationsRead = useSocketStore((s) => s.markNotificationsRead);
  const clearNotifications = useSocketStore((s) => s.clearNotifications);
  const removeNotification = useSocketStore((s) => s.removeNotification);
  const socketStatus = useSocketStore((s) => s.status);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khi user sẵn sàng + socket kết nối → đồng bộ announcements từ server.
  // Phạm vi lưu theo user được kích hoạt bên trong syncAnnouncements
  // (reset + hydrate đúng key riêng của từng user, không ảnh hưởng user khác).
  useEffect(() => {
    if (user?.id && socketStatus === "connected") {
      void syncAnnouncements();
    }
  }, [user?.id, socketStatus]);

  const roleLabel =
    role === "admin" ? "Quản trị viên" : role === "owner" ? "Chủ cửa hàng" : "Nhân viên";

  // Tạo initials từ tên user (VD: "Nguyễn Văn A" → "NA")
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "NV";

  const displayName = user?.fullName || "Người dùng";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <MobileSidebar role={role} />

      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5"
              aria-label="Chế độ 3D"
            >
              <Boxes className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
              <span className="hidden text-xs font-medium md:block">Chế độ 3D</span>
              {mounted ? (
                <Switch
                  checked={is3DEnabled}
                  onCheckedChange={toggle3D}
                  aria-label="Bật hoặc tắt chế độ 3D"
                />
              ) : (
                <div className="h-5 w-9" aria-hidden="true" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {is3DEnabled
              ? "Chế độ 3D đang bật — chọn để chuyển sang giao diện 2D nhanh"
              : "Chế độ 3D đang tắt — giao diện 2D thuần (nhanh, tiết kiệm pin)"}
          </TooltipContent>
        </Tooltip>

        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Thông báo"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Thông báo</span>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs font-medium text-muted-foreground"
                  onClick={clearNotifications}
                >
                  Xóa tất cả
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Chưa có thông báo
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="group relative flex-col items-start gap-0.5 py-2 pr-8"
                    onClick={markNotificationsRead}
                  >
                    <button
                      type="button"
                      aria-label="Xóa thông báo"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      className="absolute right-2 top-2 rounded p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex w-full items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          n.read ? "bg-muted-foreground/30" : "bg-primary",
                        )}
                      />
                      <span className="truncate text-sm font-medium">
                        {n.title}
                      </span>
                    </span>
                    <span className="line-clamp-2 pl-4 text-xs text-muted-foreground">
                      {n.message}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-xs font-medium"
                  onClick={markNotificationsRead}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Đánh dấu đã đọc
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs font-normal text-muted-foreground">{roleLabel}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role !== "admin" && (
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <QrCode className="mr-2 h-4 w-4 text-blue-600" />
                Cài đặt & VietQR
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
