import websocket from "@fastify/websocket";

export const wsClients = new Set<any>();

export function registerWebSocketServer(fastify: any): void {
  fastify.register(websocket);

  fastify.register(async (instance: any) => {
    instance.get("/ws", { websocket: true }, (connection: any) => {
      wsClients.add(connection.socket);

      connection.socket.on("close", () => {
        wsClients.delete(connection.socket);
      });
    });
  });
}
