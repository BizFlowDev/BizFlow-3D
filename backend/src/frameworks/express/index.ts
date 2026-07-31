import { createServer } from './server.js';
import env from '../../config/index.js';
import db from '../database/connection.js';
import { getRedisClient } from '../redis/redisClient.js';

async function startServer() {
  try {
    // 1. Check DB Connection
    await db.query('SELECT 1');
    console.log('Connected to PostgreSQL successfully');

    // 2. Init Redis Connection
    getRedisClient();

    // 3. Start Express app
    const app = createServer();
    app.listen(env.PORT, () => {
      console.log(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Call start if this file is run directly (e.g., via tsx or node)
if (require.main === module || process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js')) {
  startServer();
}

export { startServer };
