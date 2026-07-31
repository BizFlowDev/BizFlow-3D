import { createServer } from './frameworks/express/server.js';

/**
 * Exported Express app instance for unit/integration testing (e.g., with Supertest).
 * The server does not start listening here.
 */
const app = createServer();

export default app;
