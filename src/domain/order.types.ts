export enum OrderType {
  MARKET = 'MARKET'
}

export enum OrderStatus {
  CREATED = 'CREATED',
  QUEUED = 'QUEUED',
  EXECUTING = 'EXECUTING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface OrderPayload {
  baseToken: string;
  quoteToken: string;
  amount: number;
  type: OrderType;
  idempotencyKey?: string;
}

export interface ExecutionResult {
  txId: string;
  executedPrice: number;
  feePaid: number;
  dex: 'RAYDIUM' | 'METEORA';
}