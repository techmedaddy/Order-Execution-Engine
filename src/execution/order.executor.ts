import { ExecuteOrderJob } from '../queue/job.types';
import { OrderStatus } from '../domain/order.types';
import { isTerminalState } from '../domain/order.state-machine';
import { routeDex } from './dex.router';
import { settleOrder } from './settlement.service';
import { updateOrderStatus, claimOrderForExecution, findOrderById, transitionToTerminalStatus } from '../persistence/order.repository';
import { setOrderStatus } from '../persistence/order.cache';
import { publishOrderEvent } from '../websocket/ws.publisher';

export async function executeOrder(job: ExecuteOrderJob): Promise<void> {
  // 0. Terminal state guard: Check if order is already final
  const existingOrder = await findOrderById(job.orderId);
  if (existingOrder && isTerminalState(existingOrder.status)) {
    return;
  }

  // 1. Try to claim order atomically
  const order = await claimOrderForExecution(job.orderId);

  // 2. If claim failed: Exit silently
  if (!order) {
    return;
  }

  // Sync state for EXECUTING (since claim updated DB)
  await setOrderStatus(order.id, OrderStatus.EXECUTING);
  publishOrderEvent(order.id, OrderStatus.QUEUED, OrderStatus.EXECUTING);

  try {
    // 3. Execute mock DEX logic
    const dex = await routeDex(job.payload);
    const result = await settleOrder(dex, job.payload);

    // 4. If execution succeeds: UPDATE order status = SUCCESS
    // Idempotent side effect: only emit event if DB update actually happened
    const updated = await transitionToTerminalStatus(order.id, OrderStatus.SUCCESS);
    
    if (updated) {
      // 6. Emit WebSocket event for the final status
      await setOrderStatus(order.id, OrderStatus.SUCCESS);
      publishOrderEvent(order.id, OrderStatus.EXECUTING, OrderStatus.SUCCESS, { ...result });
    }

  } catch (error) {
    // 5. If execution fails: UPDATE order status = FAILED
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Idempotent side effect: only emit event if DB update actually happened
    const updated = await transitionToTerminalStatus(order.id, OrderStatus.FAILED);
    
    if (updated) {
      // 6. Emit WebSocket event for the final status
      await setOrderStatus(order.id, OrderStatus.FAILED);
      publishOrderEvent(order.id, OrderStatus.EXECUTING, OrderStatus.FAILED, { error: errorMessage });
    }
    
    // Retries are intentionally disabled.
    // We swallow the error here to prevent BullMQ from retrying.
    // The order is already in a terminal FAILED state.
  }
}