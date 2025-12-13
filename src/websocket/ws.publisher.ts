import { wsClients } from "./ws.server";
import { OrderStatus } from "../domain/order.types";

export function publishOrderEvent(
  orderId: string,
  status: OrderStatus,
  meta?: Record<string, unknown>
): void {
  const message = JSON.stringify({
    orderId,
    status,
    meta,
  });

  for (const client of wsClients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
