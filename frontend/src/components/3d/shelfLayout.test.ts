import { test } from "node:test";
import assert from "node:assert/strict";
import { getShelfProductPosition } from "./shelfLayout";

test("one or two products are centered at a readable shelf level", () => {
  const single = getShelfProductPosition(0, 1);
  assert.ok(Math.abs(single[0]) < 1e-10);
  assert.ok(single[1] > 1.5);
  assert.ok(Math.abs(getShelfProductPosition(0, 2)[0] + getShelfProductPosition(1, 2)[0]) < 1e-10);
});

test("a full shelf has twenty distinct positions within its frame", () => {
  const positions = Array.from({ length: 20 }, (_, index) => getShelfProductPosition(index, 20));
  assert.equal(new Set(positions.map(position => position.join(","))).size, 20);
  assert.ok(positions.every(([x, y]) => Math.abs(x) < 2.8 && y > 0 && y < 3.8));
});
