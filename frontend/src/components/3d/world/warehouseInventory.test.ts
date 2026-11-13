import { test } from "node:test";
import assert from "node:assert/strict";
import type { StockLevelRow } from "@/hooks/useInventory";
import { getWarehousePage } from "./warehouseInventory";

function inventory(count: number): StockLevelRow[] {
  return Array.from({ length: count }, (_, index) => ({
    productId: `p-${index}`, productName: index === 0 ? "Đường trắng" : `Hàng ${index}`,
    code: `SKU-${index}`, categoryId: index % 2 ? "a" : "b", categoryName: null,
    productUnitId: `unit-${index}`, unitName: "Cái", currentStock: 10,
    maxStock: 100, minStock: 5, lastUpdated: "", status: "in_stock", stockRatio: 0.1,
  }));
}

test("8 products occupy only rack A, with no repeated items in rack B", () => {
  const page = getWarehousePage(inventory(8), "", null, 0);
  assert.equal(page.items.slice(0, 15).length, 8);
  assert.equal(page.items.slice(15).length, 0);
});

test("all products are reachable exactly once, including the partial last page", () => {
  for (const count of [0, 15, 16, 30, 31, 160, 1001]) {
    const items = inventory(count);
    const first = getWarehousePage(items, "", null, 0);
    const visible = Array.from({ length: first.pageCount }, (_, i) => getWarehousePage(items, "", null, i).items).flat();
    assert.equal(visible.length, count);
    assert.equal(new Set(visible.map(item => item.productId)).size, count);
    assert.ok(first.items.length <= 30);
    assert.equal(items[0]?.productId, count ? "p-0" : undefined);
  }
});

test("search works without Vietnamese accents and combines with category", () => {
  assert.equal(getWarehousePage(inventory(100), "duong trang", "b", 0).total, 1);
  assert.equal(getWarehousePage(inventory(100), "ĐƯỜNG", "a", 0).total, 0);
  assert.equal(getWarehousePage(inventory(100), "SKU-99", null, 0).items[0].productId, "p-99");
});

test("deleting or filtering products clamps an out-of-range page", () => {
  assert.equal(getWarehousePage(inventory(31), "", null, 50).currentPage, 1);
  assert.equal(getWarehousePage(inventory(8), "", null, 5).currentPage, 0);
  const empty = getWarehousePage([], "", null, -1);
  assert.equal(empty.currentPage, 0);
  assert.equal(empty.total, 0);
  assert.equal(empty.pageCount, 1);
});

test("restock mode includes low and empty stock, prioritizes empty items, and preserves search/category filters", () => {
  const items = inventory(40);
  items[0] = { ...items[0], currentStock: 3, status: "low_stock" };
  items[2] = { ...items[2], currentStock: 0, status: "out_of_stock" };
  assert.deepEqual(getWarehousePage(items, "", null, 0, true).items.map(item => item.productId), ["p-2", "p-0"]);
  assert.equal(getWarehousePage(items, "duong", "b", 3, true).items[0].productId, "p-0");
  assert.equal(getWarehousePage(items, "", "a", 0, true).total, 0);
  assert.equal(getWarehousePage(items, "", null, 0).total, 40);
});
