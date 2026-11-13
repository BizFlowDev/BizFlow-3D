import type { StockLevelRow } from "@/hooks/useInventory";

export const WAREHOUSE_PAGE_SIZE = 30;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLocaleLowerCase("vi");
}

/** A page represents virtual display slots, never a physical warehouse location. */
export function getWarehousePage(items: StockLevelRow[], query: string, category: string | null, page: number, needsRestock = false) {
  const term = normalize(query.trim());
  const filtered = items.filter(item =>
    (!category || item.categoryId === category) &&
    (!needsRestock || item.status !== "in_stock") &&
    (!term || normalize(`${item.productName} ${item.code}`).includes(term))
  ).sort((a, b) => (needsRestock ? a.currentStock - b.currentStock : 0) || a.code.localeCompare(b.code, "vi", { numeric: true }) || a.productId.localeCompare(b.productId));
  const pageCount = Math.max(1, Math.ceil(filtered.length / WAREHOUSE_PAGE_SIZE));
  const currentPage = Math.max(0, Math.min(pageCount - 1, Math.floor(page) || 0));
  const start = currentPage * WAREHOUSE_PAGE_SIZE;
  return { items: filtered.slice(start, start + WAREHOUSE_PAGE_SIZE), total: filtered.length, pageCount, currentPage, start };
}
