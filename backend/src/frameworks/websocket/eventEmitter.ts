import { EventEmitter } from 'events';
import { emitToStore, emitToUser } from './socketServer.js';

// ── Typed Event Definitions ──────────────────────────────

export interface OrderConfirmedEvent {
  storeId: string;
  orderId: string;
  orderCode: string;
}

export interface OrderCreatedEvent {
  storeId: string;
  orderId: string;
  customerName: string | null;
  totalAmount: number;
}

export interface LowStockEvent {
  storeId: string;
  productId: string;
  productName: string;
  currentStock: number;
}

export interface GeneralNotificationEvent {
  storeId?: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
}

/** Map of all application event names to their payload types. */
export interface AppEventMap {
  'order:confirmed': OrderConfirmedEvent;
  'order:created': OrderCreatedEvent;
  'inventory:low_stock': LowStockEvent;
  'notification:general': GeneralNotificationEvent;
}

// ── Typed Event Emitter ──────────────────────────────────

/**
 * Strictly-typed EventEmitter for application-level domain events.
 *
 * Use cases call `appEventEmitter.emit(event, data)` without importing
 * socket.io directly, keeping the core layer decoupled from transport.
 */
class AppEventEmitter extends EventEmitter {
  emit<K extends keyof AppEventMap>(event: K, data: AppEventMap[K]): boolean {
    return super.emit(event, data);
  }

  on<K extends keyof AppEventMap>(event: K, listener: (data: AppEventMap[K]) => void): this {
    return super.on(event, listener);
  }
}

/** Singleton instance used across the application. */
export const appEventEmitter = new AppEventEmitter();

// ── Event Listeners (bridge to Socket.IO) ────────────────

/**
 * Register all event listeners that forward domain events to Socket.IO rooms.
 * Call this once after `initSocketServer()` during server bootstrap.
 */
export function initEventListeners(): void {
  // Order confirmed
  appEventEmitter.on('order:confirmed', (data) => {
    emitToStore(data.storeId, 'order_confirmed', {
      orderId: data.orderId,
      orderCode: data.orderCode,
    });
    console.log(`[Event] order:confirmed → store:${data.storeId}`);
  });

  // New order created (counter sale)
  appEventEmitter.on('order:created', (data) => {
    emitToStore(data.storeId, 'new_order', {
      orderId: data.orderId,
      customerName: data.customerName,
      totalAmount: data.totalAmount,
    });
    console.log(`[Event] order:created → store:${data.storeId}`);
  });

  // Low stock alert
  appEventEmitter.on('inventory:low_stock', (data) => {
    emitToStore(data.storeId, 'low_stock_alert', {
      productId: data.productId,
      productName: data.productName,
      currentStock: data.currentStock,
    });
    console.log(`[Event] inventory:low_stock → store:${data.storeId} (${data.productName}: ${data.currentStock})`);
  });

  // General notification — routes to store or user room
  appEventEmitter.on('notification:general', (data) => {
    const payload = {
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
    };

    if (data.userId) {
      emitToUser(data.userId, 'notification', payload);
    }
    if (data.storeId) {
      emitToStore(data.storeId, 'notification', payload);
    }
    console.log(`[Event] notification:general → ${data.storeId ? 'store:' + data.storeId : ''} ${data.userId ? 'user:' + data.userId : ''}`);
  });

  console.log('[Event] All event listeners registered');
}
