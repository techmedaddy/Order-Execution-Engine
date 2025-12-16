import request from 'supertest';
import { app } from '../app';

describe('Queue & Concurrency', () => {
  it('processes multiple orders concurrently', async () => {
    const requests = Array.from({ length: 5 }).map((_, i) =>
      request(app.server)
        .post('/api/orders/execute')
        .set('Idempotency-Key', `concurrent-${i}`)
        .send({
          baseToken: 'SOL',
          quoteToken: 'USDC',
          amount: 1,
        })
    );

    const results = await Promise.all(requests);

    const orderIds = results.map(r => r.body.orderId);
    const unique = new Set(orderIds);

    expect(unique.size).toBe(5);
  });
});
