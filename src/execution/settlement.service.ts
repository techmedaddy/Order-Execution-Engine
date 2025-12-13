import { OrderPayload, ExecutionResult } from '../domain/order.types';
import { DexAdapter } from '../dex/dex.interface';

export async function settleOrder(
  dex: DexAdapter,
  payload: OrderPayload
): Promise<ExecutionResult> {
  return dex.executeSwap(payload);
}