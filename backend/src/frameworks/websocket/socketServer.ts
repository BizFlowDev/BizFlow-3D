import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../../config/index.js';

// ── Types ────────────────────────────────────────────────

interface SocketUserPayload {
  userId: string;
  storeId: string | null;
  role: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user: SocketUserPayload;
  };
}

// ── Singleton ────────────────────────────────────────────

let io: Server | null = null;

/**
 * Initialize the Socket.IO server, attach to the existing HTTP server.
 *
 * - JWT authentication on every connection handshake.
 * - Auto-joins users into `store:{storeId}` and `user:{userId}` rooms.
 * - Listens for `subscribe:store` and `subscribe:user` client events.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Authentication Middleware ──
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: Token không được cung cấp'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as SocketUserPayload;
      (socket as AuthenticatedSocket).data = {
        user: {
          userId: decoded.userId,
          storeId: decoded.storeId ?? null,
          role: decoded.role,
        },
      };
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token không hợp lệ'));
    }
  });

  // ── Connection Handler ──
  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { userId, storeId } = socket.data.user;

    console.log(`[WebSocket] User connected: ${userId} (store: ${storeId})`);

    // Auto-join rooms
    socket.join(`user:${userId}`);
    if (storeId) {
      socket.join(`store:${storeId}`);
    }

    // ── Client Events ──

    /**
     * subscribe:store — Client explicitly requests joining a store room.
     * Validates that the requested storeId matches the authenticated user's storeId.
     */
    socket.on('subscribe:store', (requestedStoreId: string) => {
      if (requestedStoreId === storeId) {
        socket.join(`store:${requestedStoreId}`);
        socket.emit('subscribed', { room: `store:${requestedStoreId}` });
      } else {
        socket.emit('error', { message: 'Không có quyền truy cập store này' });
      }
    });

    /**
     * subscribe:user — Client explicitly requests joining a personal room.
     */
    socket.on('subscribe:user', () => {
      socket.join(`user:${userId}`);
      socket.emit('subscribed', { room: `user:${userId}` });
    });

    socket.on('disconnect', (reason: string) => {
      console.log(`[WebSocket] User disconnected: ${userId} (${reason})`);
    });
  });

  console.log('[WebSocket] Socket.IO server initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 * Throws if called before `initSocketServer()`.
 */
export function getSocketServer(): Server {
  if (!io) {
    throw new Error('Socket.IO server chưa được khởi tạo. Gọi initSocketServer() trước.');
  }
  return io;
}

// ── Broadcast Helpers ──────────────────────────────────────

/**
 * Emit an event to all sockets in a store room.
 */
export function emitToStore(storeId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`store:${storeId}`).emit(event, data);
}

/**
 * Emit an event to a specific user's personal room.
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Broadcast an event to all connected clients.
 */
export function emitToAll(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}
