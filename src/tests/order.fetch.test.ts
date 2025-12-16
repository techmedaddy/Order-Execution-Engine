import request from 'supertest';
import { app } from '../app';

describe('Fetch Order by ID', () => {
  it('returns order status and payload', async () => {
    const create = await request(app.server)
      .post('/api/orders/execute')
      .set('Idempotency-Key', 'fetch-1')
      .send({
        baseToken: 'SOL',
        quoteToken: 'USDC',
        amount: 1,
      });

    const orderId = create.body.orderId;

    const res = await request(app.server)
      .get(`/api/orders/${orderId}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
    expect(res.body.payload).toBeDefined();
  });
});
