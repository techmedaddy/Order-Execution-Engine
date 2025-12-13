import { OrderPayload, ExecutionResult } from '../domain/order.types';

export interface DexAdapter {
  name: 'RAYDIUM' | 'METEORA';
  getQuote(payload: OrderPayload): Promise<{ price: number; fee: number }>;
  executeSwap(payload: OrderPayload): Promise<ExecutionResult>;
}