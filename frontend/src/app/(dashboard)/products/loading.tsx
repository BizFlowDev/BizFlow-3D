import { TableSkeleton } from "@/components/shared/skeletons/table-skeleton";

export default function ProductsLoading() {
  return (
    <TableSkeleton
      title="Sản phẩm"
      description="Quản lý danh mục sản phẩm, đơn vị quy đổi và giá bán."
      columns={6}
      rows={8}
    />
  );
}
