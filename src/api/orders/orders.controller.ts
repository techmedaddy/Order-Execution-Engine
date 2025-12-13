import { randomUUID } from 'crypto';
import { ExecuteOrderRequestSchema } from './orders.schema';
import { orderQueue } from '../../queue/order.queue';
import { createOrder } from '../../domain/order.entity';
import { createOrder as persistOrder } from '../../persistence/order.repository';
import { OrderType } from '../../domain/order.types';

export async function executeOrderController(request: any, reply: any): Promise<void> {
  const body = ExecuteOrderRequestSchema.parse(request.body);
  const orderId = randomUUID();

  const payload = {
    baseToken: body.baseToken,
    quoteToken: body.quoteToken,
    amount: body.amount,
    type: OrderType.MARKET
  };

  const order = createOrder(orderId, payload);

  await persistOrder(order);

  await orderQueue.add('execute-order', {
    orderId,
    payload
  });

  reply.code(202).send({ orderId });
}