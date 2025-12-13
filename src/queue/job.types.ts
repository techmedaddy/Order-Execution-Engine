import { OrderPayload } from '../domain/order.types';

export interface ExecuteOrderJob {
  orderId: string;
  payload: OrderPayload;
}