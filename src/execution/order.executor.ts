import { ExecuteOrderJob } from '../queue/job.types';
import { OrderStatus } from '../domain/order.types';
import { transitionOrderStatus, Order } from '../domain/order.entity';
import { assertValidTransition } from '../domain/order.state-machine';
import { routeDex } from './dex.router';
import { settleOrder } from './settlement.service';
import { updateOrderStatus } from '../persistence/order.repository';
import { setOrderStatus } from '../persistence/order.cache';
import { publishOrderEvent } from '../websocket/ws.publisher';

export async function executeOrder(job: ExecuteOrderJob): Promise<void> {
  let order: Order = {
    id: job.orderId,
    payload: job.payload,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const processTransition = async (nextStatus: OrderStatus, meta?: Record<string, unknown>) => {
    assertValidTransition(order.status, nextStatus);
    
    order = transitionOrderStatus(order, nextStatus);
    
    await updateOrderStatus(order.id, order.status);
    await setOrderStatus(order.id, order.status);
    publishOrderEvent(order.id, order.status, meta);
  };

  try {
    await processTransition(OrderStatus.ROUTING);
    const dex = await routeDex(job.payload);

    await processTransition(OrderStatus.BUILDING);
    const result = await settleOrder(dex, job.payload);

    await processTransition(OrderStatus.SUBMITTED, { ...result });
    await processTransition(OrderStatus.CONFIRMED);
  } catch (error) {
    await processTransition(OrderStatus.FAILED, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}