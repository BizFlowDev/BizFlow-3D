"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function Loading() {
  return <p role="status" className="flex items-center gap-2 p-8"><Loader2 className="h-5 w-5 animate-spin" />Đang tải…</p>;
}

const Orders = dynamic(() => import("../../orders/ManagementContent"), { loading: Loading });
const Customers = dynamic(() => import("../../customers/ManagementContent"), { loading: Loading });
const CustomerDetail = dynamic(() => import("../../customers/[id]/CustomerDetailContent"), { loading: Loading });

export type POSSection = "orders" | "customers";

/** Business tabs render inside the same physical monitor as the sales screen. */
export function POSWorkspace({ section }: { section: POSSection }) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  return (
    <div data-pos-workspace={section} role="region" aria-label={section === "orders" ? "Đơn hàng POS" : "Khách hàng POS"} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-background p-4 text-foreground [&_th]:min-w-0 [&_th]:px-2 [&_td]:px-2 [&_td:nth-child(3)]:max-w-[220px]">
      {section === "orders" ? <Orders /> : customerId ? <CustomerDetail key={customerId} id={customerId} onBack={() => setCustomerId(null)} /> : <Customers onSelectCustomer={setCustomerId} />}
    </div>
  );
}
