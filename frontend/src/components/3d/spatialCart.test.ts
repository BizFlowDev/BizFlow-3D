import test from "node:test";
import assert from "node:assert/strict";
import { addSpatialCartItem, updateSpatialCartQuantity, type CartItem3D } from "./spatialCart";

const item: CartItem3D = {
  productId: "shirt", productName: "Áo thun", code: "SP-002", unitId: "each",
  unitName: "Cái", conversionFactor: 1, unitPrice: 150000, quantity: 29, availableStock: 29,
};

test("repeated shelf adds cannot reserve 58 units from stock of 29", () => {
  const first = addSpatialCartItem([], item, 29);
  const repeated = addSpatialCartItem(first, item, 29);
  assert.equal(repeated[0].quantity, 29);
});

test("different units share the same base-unit stock", () => {
  const first = addSpatialCartItem([], { ...item, quantity: 2, unitId: "pack", conversionFactor: 10 }, 29);
  const repeated = addSpatialCartItem(first, { ...item, quantity: 10 }, 29);
  assert.equal(repeated.reduce((sum, line) => sum + line.quantity * line.conversionFactor, 0), 20);
});

test("unknown stock cannot be replaced with an item's stale availableStock", () => {
  assert.deepEqual(addSpatialCartItem([], item, undefined), []);
});

test("rapid queued adds use the latest cart instead of overselling", () => {
  const one = { ...item, quantity: 1 };
  let lines: CartItem3D[] = [];
  for (let click = 0; click < 100; click++) lines = addSpatialCartItem(lines, one, 29);
  assert.equal(lines[0].quantity, 29);
});

test("POS quantity increases respect reservations in other units", () => {
  const lines = [{ ...item, quantity: 2, unitId: "pack", conversionFactor: 10 }, { ...item, quantity: 9 }];
  assert.equal(updateSpatialCartQuantity(lines, "shirt", "each", 10, 29), lines);
  assert.equal(updateSpatialCartQuantity(lines, "shirt", "each", 8, undefined)[1].quantity, 8);
});

test("stock decreases or failures block new additions without deleting the cart", () => {
  const lines = [{ ...item, quantity: 5 }];
  assert.equal(addSpatialCartItem(lines, { ...item, quantity: 1 }, 3), lines);
  assert.equal(updateSpatialCartQuantity(lines, "shirt", "each", 6, undefined), lines);
  assert.equal(updateSpatialCartQuantity(lines, "shirt", "each", 2, 3)[0].quantity, 2);
});

test("invalid quantities and conversion factors never enter the cart", () => {
  for (const quantity of [0, -1, 1.5, NaN, Infinity]) assert.deepEqual(addSpatialCartItem([], { ...item, quantity }, 29), []);
  for (const conversionFactor of [0, -1, NaN, Infinity]) assert.deepEqual(addSpatialCartItem([], { ...item, quantity: 1, conversionFactor }, 29), []);
});
