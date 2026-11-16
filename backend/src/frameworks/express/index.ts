import { createServer as createHttpServer } from 'http';
import { createServer } from './server.js';
import env from '../../config/index.js';
import db from '../database/connection.js';
import { getRedisClient } from '../redis/redisClient.js';
import { initSocketServer } from '../websocket/socketServer.js';
import { initEventListeners } from '../websocket/eventEmitter.js';
import { listen } from './listen.js';

async function startServer() {
  try {
    // 1. Check DB Connection
    await db.query('SELECT 1');
    console.log('Connected to PostgreSQL successfully');

    // 2. Init Redis Connection
    getRedisClient();

    // 3. Create Express app + HTTP server
    const app = createServer();
    const httpServer = createHttpServer(app);

    // 4. Initialize Socket.IO on the HTTP server
    initSocketServer(httpServer);

    // 5. Register domain event → socket broadcast listeners
    initEventListeners();

    // 6. Start listening
    await listen(httpServer, env.PORT);
    console.log(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`WebSocket ready on port ${env.PORT}`);

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.error(`Port ${env.PORT} is already in use. Stop the other backend instance or set PORT to an available port before restarting.`);
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}

// Call start if this file is run directly (e.g., via tsx or node)
if (require.main === module || process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js')) {
  startServer();
}

export { startServer };

