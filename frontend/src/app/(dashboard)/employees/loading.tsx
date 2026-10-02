import { TableSkeleton } from "@/components/shared/skeletons/table-skeleton";

export default function EmployeesLoading() {
  return (
    <TableSkeleton
      title="Nhân viên"
      description="Quản lý danh sách và phân quyền nhân viên."
      columns={5}
      rows={8}
    />
  );
}
