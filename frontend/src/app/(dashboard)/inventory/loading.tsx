import { TableSkeleton } from "@/components/shared/skeletons/table-skeleton";

export default function InventoryLoading() {
  return (
    <TableSkeleton
      title="Kho hàng"
      description="Quản lý tồn kho và biến động sản phẩm."
      columns={6}
      rows={8}
    />
  );
}
