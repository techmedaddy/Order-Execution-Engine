import websocket from '@fastify/websocket';
import WebSocket from 'ws';

export const wsClients = new Set<WebSocket>();

export function registerWebSocketServer(fastify: any): void {
  fastify.register(websocket);

  fastify.register(async (instance: any) => {
    instance.get('/ws', { websocket: true }, (connection: any) => {
      const socket: WebSocket = connection.socket;

      wsClients.add(socket);

      socket.on('close', () => {
        wsClients.delete(socket);
      });

      socket.on('error', () => {
        wsClients.delete(socket);
      });
    });
  });
}
