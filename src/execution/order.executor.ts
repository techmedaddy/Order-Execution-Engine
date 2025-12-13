import { ExecuteOrderJob } from '../queue/job.types';
import { OrderStatus } from '../domain/order.types';
import { routeDex } from './dex.router';
import { settleOrder } from './settlement.service';
import { updateOrderStatus, claimOrderForExecution } from '../persistence/order.repository';
import { setOrderStatus } from '../persistence/order.cache';
import { publishOrderEvent } from '../websocket/ws.publisher';

export async function executeOrder(job: ExecuteOrderJob): Promise<void> {
  // 1. Try to claim order atomically
  const order = await claimOrderForExecution(job.orderId);

  // 2. If claim failed: Exit silently
  if (!order) {
    return;
  }

  // Sync state for EXECUTING (since claim updated DB)
  await setOrderStatus(order.id, OrderStatus.EXECUTING);
  publishOrderEvent(order.id, OrderStatus.EXECUTING);

  try {
    // 3. Execute mock DEX logic
    const dex = await routeDex(job.payload);
    const result = await settleOrder(dex, job.payload);

    // 4. If execution succeeds: UPDATE order status = SUCCESS
    await updateOrderStatus(order.id, OrderStatus.SUCCESS);
    
    // 6. Emit WebSocket event for the final status
    await setOrderStatus(order.id, OrderStatus.SUCCESS);
    publishOrderEvent(order.id, OrderStatus.SUCCESS, { ...result });

  } catch (error) {
    // 5. If execution fails: UPDATE order status = FAILED
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateOrderStatus(order.id, OrderStatus.FAILED);
    
    // 6. Emit WebSocket event for the final status
    await setOrderStatus(order.id, OrderStatus.FAILED);
    publishOrderEvent(order.id, OrderStatus.FAILED, { error: errorMessage });
    
    // No retries: do not throw
  }
}