import WebSocket from 'ws';
import { wsClients } from './ws.server';
import { OrderStatus } from '../domain/order.types';

export function publishOrderEvent(
  orderId: string,
  previousStatus: OrderStatus | null,
  currentStatus: OrderStatus,
  meta?: Record<string, unknown>
): void {
  if (!wsClients || wsClients.size === 0) {
    return; // valid: no subscribers
  }

  const message = JSON.stringify({
    orderId,
    previousStatus,
    currentStatus,
    timestamp: new Date().toISOString(),
    meta,
  });

  for (const client of wsClients) {
    if (!client) continue;

    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    } catch {
      // Never crash business logic because of WS
      wsClients.delete(client);
    }
  }
}
