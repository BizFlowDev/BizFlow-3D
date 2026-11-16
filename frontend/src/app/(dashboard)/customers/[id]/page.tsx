"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import CustomerDetailContent from "./CustomerDetailContent";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  return <CustomerDetailContent id={id} onBack={() => router.push("/customers")} />;
}
