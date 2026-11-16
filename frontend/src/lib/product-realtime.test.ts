import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { refreshProductQueries } from "./product-realtime";

test("product refresh updates active catalog, warehouse and dashboard while leaving unrelated data alone", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  let serverName = "Old name";
  const keys = [["products", "catalog"], ["products", { search: "A" }], ["inventory", "catalog"], ["inventory", "stock"], ["dashboard", "low-stock"]];
  const cleanups: (() => void)[] = [];
  try {
    for (const queryKey of keys) {
      const queryFn = async () => serverName;
      await client.fetchQuery({ queryKey, queryFn });
      cleanups.push(new QueryObserver(client, { queryKey, queryFn }).subscribe(() => {}));
    }
    client.setQueryData(["orders"], "existing order");
    serverName = "Updated name";
    await refreshProductQueries(client);
    for (const key of keys) assert.equal(client.getQueryData(key), "Updated name");
    assert.equal(client.getQueryState(["orders"])?.isInvalidated, false);
  } finally {
    cleanups.forEach((cleanup) => cleanup());
    client.clear();
  }
});
