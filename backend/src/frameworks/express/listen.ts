import type { Server } from 'node:http';

export function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    try {
      server.listen(port);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
