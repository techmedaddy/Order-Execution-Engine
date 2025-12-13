import { z } from 'zod';

export const ExecuteOrderRequestSchema = z.object({
  baseToken: z.string(),
  quoteToken: z.string(),
  amount: z.number().gt(0),
  idempotencyKey: z.string().optional()
});

export type ExecuteOrderRequest = z.infer<typeof ExecuteOrderRequestSchema>;

export const ExecuteOrderResponseSchema = z.object({
  orderId: z.string()
});

export type ExecuteOrderResponse = z.infer<typeof ExecuteOrderResponseSchema>;