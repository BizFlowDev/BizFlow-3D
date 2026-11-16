import { test } from "node:test";
import assert from "node:assert/strict";

// Exercise the persisted store without a browser or API connection.
const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
} });

test("live announcement and reconnect sync share one entry and preserve read/deleted state", async () => {
  const { useSocketStore, makeNotification } = await import("./useSocket");
  const store = useSocketStore;
  store.getState().resetNotifications();
  const item = { id: "announcement-1", type: "announcement", title: "Tin mới", message: "Nội dung", createdAt: "2026-11-16T00:00:00Z", read: false };
  const live = makeNotification(item);
  assert.equal(live.id, item.id);
  assert.equal(live.createdAt, item.createdAt);
  store.getState().pushNotification(live);
  store.getState().markNotificationsRead();
  store.getState().mergeAnnouncements([item]);
  store.getState().pushNotification(item); // sync can finish before socket delivery
  assert.equal(store.getState().notifications.length, 1);
  assert.equal(store.getState().unreadCount, 0);
  assert.equal(store.getState().notifications[0].read, true);
  store.getState().removeNotification(item.id);
  store.getState().pushNotification(item);
  store.getState().mergeAnnouncements([item]);
  assert.equal(store.getState().notifications.length, 0);
  assert.equal(store.getState().unreadCount, 0);
});

test("separate announcements with identical text remain separate; duplicate sync rows do not", async () => {
  const { useSocketStore: store, makeNotification } = await import("./useSocket");
  store.getState().resetNotifications();
  const first = makeNotification({ id: "first", type: "announcement", title: "Same", message: "Same" });
  const second = { ...first, id: "second" };
  store.getState().mergeAnnouncements([first, first, second]);
  assert.equal(store.getState().notifications.length, 2);
  assert.equal(store.getState().unreadCount, 2);
  store.getState().clearNotifications();
  store.getState().pushNotification(first);
  store.getState().mergeAnnouncements([first, second]);
  assert.equal(store.getState().notifications.length, 0);
});

test("deleting an unread announcement updates the bell count", async () => {
  const { useSocketStore: store } = await import("./useSocket");
  store.getState().resetNotifications();
  store.getState().pushNotification({ id: "unread", type: "announcement", title: "A", message: "B", createdAt: "2026-11-16T00:00:00Z", read: false });
  store.getState().removeNotification("unread");
  assert.equal(store.getState().unreadCount, 0);
});
