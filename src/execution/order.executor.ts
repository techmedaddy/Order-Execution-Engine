import { ExecuteOrderJob } from '../queue/job.types';
import { OrderStatus } from '../domain/order.types';
import { isTerminalState } from '../domain/order.state-machine';
import { routeDex } from './dex.router';
import { settleOrder } from './settlement.service';
import {
  findOrderById,
  claimOrderForExecution,
  transitionToTerminalStatus,
} from '../persistence/order.repository';
import { setOrderStatus } from '../persistence/order.cache';
import { publishOrderEvent } from '../websocket/ws.publisher';

import {
  ordersExecutedTotal,
  orderExecutionDuration,
} from '../metrics/prometheus';

export async function executeOrder(job: ExecuteOrderJob): Promise<void> {
  // ⛔ Guard: already terminal
  const existingOrder = await findOrderById(job.orderId);
  if (existingOrder && isTerminalState(existingOrder.status)) {
    return;
  }

  // 🔒 Atomic claim
  const order = await claimOrderForExecution(job.orderId);
  if (!order) {
    return;
  }

  // Sync EXECUTING state
  await setOrderStatus(order.id, OrderStatus.EXECUTING);
  publishOrderEvent(order.id, OrderStatus.QUEUED, OrderStatus.EXECUTING);

  // ⏱️ Execution latency metric
  const endTimer = orderExecutionDuration.startTimer();

  try {
    // Execute order
    const dex = await routeDex(job.payload);
    const result = await settleOrder(dex, job.payload);

    // Transition → SUCCESS (idempotent)
    const updated = await transitionToTerminalStatus(
      order.id,
      OrderStatus.SUCCESS
    );

    if (updated) {
      await setOrderStatus(order.id, OrderStatus.SUCCESS);

      publishOrderEvent(
        order.id,
        OrderStatus.EXECUTING,
        OrderStatus.SUCCESS,
        result as unknown as Record<string, unknown> // ✅ explicit + correct
      );
    }

    // ✅ Metrics
    ordersExecutedTotal.inc();
    endTimer();
  } catch (error) {
    endTimer();

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

    // ❌ No rethrow — retries intentionally disabled
  }
}
