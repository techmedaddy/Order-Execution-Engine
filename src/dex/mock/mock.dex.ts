import { DexAdapter } from '../dex.interface';
import { OrderPayload, ExecutionResult } from '../../domain/order.types';
import { env } from '../../config/env';

export function createMockDexAdapter(
  name: 'RAYDIUM' | 'METEORA',
  failureRate: number
): DexAdapter {
  return {
    name,
    async getQuote(payload: OrderPayload): Promise<{ price: number; fee: number }> {
      const delay = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
      await new Promise(resolve => setTimeout(resolve, delay));

      const priceMultiplier = name === 'RAYDIUM' ? 1.5 : 1.52;
      const fee = name === 'RAYDIUM' ? 5 : 2;

      return {
        price: payload.amount * priceMultiplier,
        fee
      };
    },
    async executeSwap(payload: OrderPayload): Promise<ExecutionResult> {
      const delay = Math.floor(Math.random() * (400 - 100 + 1)) + 100;
      await new Promise(resolve => setTimeout(resolve, delay));

      if (env.MOCK_DEX_FORCE_FAIL) {
        throw new Error(`Forced failure: MOCK_DEX_FORCE_FAIL is enabled`);
      }

      if (Math.random() < failureRate) {
        throw new Error(`Swap execution failed on ${name}`);
      }

      const priceMultiplier = name === 'RAYDIUM' ? 1.5 : 1.52;
      const feePaid = name === 'RAYDIUM' ? 5 : 2;
      const prefix = name === 'RAYDIUM' ? 'mock-raydium-' : 'mock-meteora-';

      return {
        txId: `${prefix}${payload.baseToken}-${payload.quoteToken}-${Date.now()}`,
        executedPrice: payload.amount * priceMultiplier,
        feePaid,
        dex: name
      };
    }
  };
}