export enum OrderType {
  MARKET = 'MARKET'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ROUTING = 'ROUTING',
  BUILDING = 'BUILDING',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED'
}

export interface OrderPayload {
  baseToken: string;
  quoteToken: string;
  amount: number;
  type: OrderType;
}

export interface ExecutionResult {
  txId: string;
  executedPrice: number;
  feePaid: number;
  dex: 'RAYDIUM' | 'METEORA';
}