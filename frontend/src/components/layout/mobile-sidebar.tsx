"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import type { UserRole } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function MobileSidebar({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const homeHref = role === "admin" ? "/admin/stores" : role === "employee" ? "/orders/new" : "/";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
        <div className="flex h-16 items-center border-b px-4">
          <Link
            href={homeHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2"
          >
            <Image src="/images/logo.png" alt="BizFlow 3D" width={32} height={32} />
            <span className="text-lg font-bold">BizFlow 3D</span>
          </Link>
        </div>
        <SidebarNav role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
