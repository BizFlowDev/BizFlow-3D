import { TableSkeleton } from "@/components/shared/skeletons/table-skeleton";

export default function AccountingLoading() {
  return (
    <TableSkeleton
      title="Sổ quỹ & Thu chi"
      description="Quản lý dòng tiền, phiếu thu chi và công nợ."
      columns={6}
      rows={8}
    />
  );
}
