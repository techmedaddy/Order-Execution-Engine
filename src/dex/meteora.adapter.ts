import { DexAdapter } from './dex.interface';
import { OrderPayload, ExecutionResult } from '../domain/order.types';

export const meteoraAdapter: DexAdapter = {
  name: 'METEORA',
  async getQuote(payload: OrderPayload): Promise<{ price: number; fee: number }> {
    return {
      price: payload.amount * 1.52,
      fee: 2
    };
  },
  async executeSwap(payload: OrderPayload): Promise<ExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      txId: `meteora-tx-${payload.baseToken}-${payload.quoteToken}`,
      executedPrice: payload.amount * 1.52,
      feePaid: 2,
      dex: 'METEORA'
    };
  }
};