import { DexAdapter } from './dex.interface';
import { OrderPayload, ExecutionResult } from '../domain/order.types';

export const raydiumAdapter: DexAdapter = {
  name: 'RAYDIUM',
  async getQuote(payload: OrderPayload): Promise<{ price: number; fee: number }> {
    return {
      price: payload.amount * 1.5,
      fee: 5
    };
  },
  async executeSwap(payload: OrderPayload): Promise<ExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      txId: `raydium-tx-${payload.baseToken}-${payload.quoteToken}`,
      executedPrice: payload.amount * 1.5,
      feePaid: 5,
      dex: 'RAYDIUM'
    };
  }
};