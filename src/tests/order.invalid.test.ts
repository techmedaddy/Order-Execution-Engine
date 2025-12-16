import request from 'supertest';
import { app } from '../app';

describe('Create Order – Invalid Payload', () => {
  beforeAll(async () => {
    await app.ready();
  });

  it('fails when amount is missing', async () => {
    const res = await request(app.server)
      .post('/api/orders/execute')
      .set('Idempotency-Key', 'invalid-1')
      .send({
        baseToken: 'SOL',
        quoteToken: 'USDC',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
