import request from 'supertest';
import { app } from '../app';

describe('Create Order – Happy Path', () => {
  it('creates an order and returns orderId', async () => {
    const res = await request(app.server)
      .post('/api/orders/execute')
      .set('Idempotency-Key', 'test-create-1')
      .send({
        baseToken: 'SOL',
        quoteToken: 'USDC',
        amount: 1,
      });

    expect(res.status).toBe(202);
    expect(res.body.orderId).toBeDefined();
  });
});
