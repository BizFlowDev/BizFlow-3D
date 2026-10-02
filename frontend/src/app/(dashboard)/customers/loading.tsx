import { TableSkeleton } from "@/components/shared/skeletons/table-skeleton";

export default function CustomersLoading() {
  return (
    <TableSkeleton
      title="Khách hàng"
      description="Quản lý hồ sơ khách hàng, lịch sử giao dịch và công nợ."
      columns={5}
      rows={8}
    />
  );
}
