import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Box,
  Boxes,
  Cog,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Package,
  PieChart,
  Receipt,
  ShoppingCart,
  Store,
  UserPlus,
  Users,
} from "lucide-react";

export type UserRole = "admin" | "owner" | "employee";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Chính",
    items: [
      {
        title: "Tổng quan",
        href: "/",
        icon: LayoutDashboard,
        roles: ["owner"],
      },
      {
        title: "Cửa hàng 3D",
        href: "/store-3d",
        icon: Box,
        roles: ["employee", "owner"],
      },
    ],
  },
  {
    title: "Bán hàng",
    items: [
      {
        title: "Tạo đơn hàng",
        href: "/orders/new",
        icon: ShoppingCart,
        roles: ["employee", "owner"],
      },
      {
        title: "Đơn hàng",
        href: "/orders",
        icon: Receipt,
        roles: ["employee", "owner"],
      },
      {
        title: "Khách hàng",
        href: "/customers",
        icon: Users,
        roles: ["employee", "owner"],
      },
    ],
  },
  {
    title: "Kho & Sản phẩm",
    items: [
      {
        title: "Sản phẩm",
        href: "/products",
        icon: Package,
        roles: ["owner"],
      },
      {
        title: "Kho hàng",
        href: "/inventory",
        icon: Boxes,
        roles: ["owner"],
      },
    ],
  },
  {
    title: "Quản lý",
    items: [
      {
        title: "Báo cáo",
        href: "/reports",
        icon: BarChart3,
        roles: ["owner"],
      },
      {
        title: "Nhân viên",
        href: "/employees",
        icon: UserPlus,
        roles: ["owner"],
      },
      {
        title: "Kế toán",
        href: "/accounting",
        icon: BookOpen,
        roles: ["owner"],
      },
      {
        title: "Cài đặt Cửa hàng",
        href: "/settings",
        icon: Cog,
        roles: ["owner"],
      },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      {
        title: "Cửa hàng",
        href: "/admin/stores",
        icon: Store,
        roles: ["admin"],
      },
      {
        title: "Thông báo nền tảng",
        href: "/admin/system",
        icon: Megaphone,
        roles: ["admin"],
      },
      {
        title: "Báo cáo nền tảng",
        href: "/admin/analytics",
        icon: PieChart,
        roles: ["admin"],
      },
      {
        title: "Gói đăng ký",
        href: "/admin/subscriptions",
        icon: CreditCard,
        roles: ["admin"],
      },
    ],
  },
];

export function getNavSections(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
