import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function request(path: string, role = "employee") {
  const payload = Buffer.from(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return new NextRequest(`http://localhost:3000${path}`, { headers: { cookie: `bizflow.accessToken=header.${payload}.signature` } });
}

test("employee can enter 3D and every existing sales route including customer details", () => {
  for (const path of ["/store-3d", "/orders", "/orders/new", "/customers", "/customers/customer-123", "/change-password"]) {
    assert.equal(middleware(request(path)).headers.get("x-middleware-next"), "1", path);
  }
});

test("direct URLs cannot bypass employee navigation restrictions", () => {
  for (const path of ["/", "/products", "/inventory", "/reports", "/employees", "/accounting", "/settings", "/admin/stores", "/orders-other"]) {
    assert.equal(middleware(request(path)).headers.get("location"), "http://localhost:3000/orders/new", path);
  }
});

test("owner can still access sales and management pages", () => {
  for (const path of ["/", "/store-3d", "/products", "/inventory", "/reports", "/employees", "/accounting", "/settings"]) {
    assert.equal(middleware(request(path, "owner")).headers.get("x-middleware-next"), "1", path);
  }
});
