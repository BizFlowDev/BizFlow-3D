import { TableSkeleton } from "@/components/shared/skeletons/table-skeleton";

export default function OrdersLoading() {
  return (
    <TableSkeleton
      title="Đơn hàng"
      description="Danh sách đơn hàng tại quầy và đơn nháp."
      columns={7}
      rows={8}
    />
  );
}
