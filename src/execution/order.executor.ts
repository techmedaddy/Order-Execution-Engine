import { ExecuteOrderJob } from '../queue/job.types';
import { OrderStatus } from '../domain/order.types';
import { isTerminalState } from '../domain/order.state-machine';
import { routeDex } from './dex.router';
import { settleOrder } from './settlement.service';
import {
  claimOrderForExecution,
  findOrderById,
  transitionToTerminalStatus,
} from '../persistence/order.repository';
import { setOrderStatus } from '../persistence/order.cache';
import { publishOrderEvent } from '../websocket/ws.publisher';
import {
  ordersExecutedTotal,
  orderExecutionDuration,
} from '../metrics/prometheus';

export async function executeOrder(
  job: ExecuteOrderJob
): Promise<void> {
  // 0. Terminal guard
  const existingOrder = await findOrderById(job.orderId);
  if (existingOrder && isTerminalState(existingOrder.status)) {
    return;
  }

  // 1. Atomic claim
  const order = await claimOrderForExecution(job.orderId);
  if (!order) {
    return;
  }

  // 2. EXECUTING state
  await setOrderStatus(order.id, OrderStatus.EXECUTING);
  publishOrderEvent(
    order.id,
    OrderStatus.QUEUED,
    OrderStatus.EXECUTING
  );

  // ⏱ execution latency metric
  const endTimer = orderExecutionDuration.startTimer();

  try {
    // 3. Execute
    const dex = await routeDex(job.payload);
    const result = await settleOrder(dex, job.payload);

    // 4. SUCCESS (idempotent)
    const updated = await transitionToTerminalStatus(
      order.id,
      OrderStatus.SUCCESS
    );

    if (updated) {
      await setOrderStatus(order.id, OrderStatus.SUCCESS);

      // ✅ wrap result, don’t cast
      publishOrderEvent(
        order.id,
        OrderStatus.EXECUTING,
        OrderStatus.SUCCESS,
        { result }
      );
    }

    // 📈 metric
    ordersExecutedTotal.inc();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    const updated = await transitionToTerminalStatus(
      order.id,
      OrderStatus.FAILED
    );

    if (updated) {
      await setOrderStatus(order.id, OrderStatus.FAILED);
      publishOrderEvent(
        order.id,
        OrderStatus.EXECUTING,
        OrderStatus.FAILED,
        { error: errorMessage }
      );
    }
  } finally {
    endTimer();
  }
}
