import request from 'supertest';
import { app } from '../app';

describe('Idempotency', () => {
  it('returns same orderId for duplicate requests', async () => {
    const payload = {
      baseToken: 'SOL',
      quoteToken: 'USDC',
      amount: 1,
    };

    const r1 = await request(app.server)
      .post('/api/orders/execute')
      .set('Idempotency-Key', 'idem-1')
      .send(payload);

    const r2 = await request(app.server)
      .post('/api/orders/execute')
      .set('Idempotency-Key', 'idem-1')
      .send(payload);

    expect(r1.body.orderId).toBe(r2.body.orderId);
  });
});
