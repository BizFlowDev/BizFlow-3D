export interface CartItem3D {
  productId: string;
  productName: string;
  code: string;
  imageUrl?: string | null;
  unitId: string;
  unitName: string;
  conversionFactor: number;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

export function addSpatialCartItem(
  lines: CartItem3D[], item: CartItem3D, stock: number | undefined,
): CartItem3D[] {
  if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
      !Number.isFinite(item.conversionFactor) || item.conversionFactor <= 0 ||
      !Number.isFinite(item.unitPrice) || item.unitPrice < 0 ||
      item.quantity * item.conversionFactor > remainingSpatialStock(lines, item.productId, stock)) return lines;
  const index = lines.findIndex(line => line.productId === item.productId && line.unitId === item.unitId);
  if (index < 0) return [...lines, item];
  return lines.map((line, i) => i === index ? { ...line, quantity: line.quantity + item.quantity } : line);
}

/** Stock is always in base units, shared by every cart line for this product. */
export function remainingSpatialStock(lines: CartItem3D[], productId: string, stock: number | undefined): number {
  if (stock === undefined || !Number.isFinite(stock) || stock < 0) return 0;
  const reserved = lines.filter(line => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity * line.conversionFactor, 0);
  return Math.max(0, stock - reserved);
}

export function updateSpatialCartQuantity(
  lines: CartItem3D[], productId: string, unitId: string, quantity: number, stock: number | undefined,
): CartItem3D[] {
  const item = lines.find(line => line.productId === productId && line.unitId === unitId);
  if (!item || !Number.isSafeInteger(quantity) || quantity < 1) return lines;
  // Reductions remain possible when stock has fallen or a refetch failed.
  if (quantity > item.quantity &&
      (quantity - item.quantity) * item.conversionFactor > remainingSpatialStock(lines, productId, stock)) return lines;
  return lines.map(line => line === item ? { ...line, quantity } : line);
}
