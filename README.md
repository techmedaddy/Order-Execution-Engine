# Order Execution Engine

## Failure Simulation

To verify system behavior under failure conditions, you can force all mock DEX executions to fail.

### How to Enable

Set the following environment variable in your `.env` file or execution environment:

```bash
MOCK_DEX_FORCE_FAIL=true
```

### Expected Behavior

When enabled:
1.  All order executions will fail immediately after the mock delay.
2.  Orders will transition from `EXECUTING` to `FAILED`.
3.  No retries will be attempted (as per the no-retry policy).
4.  A `FAILED` WebSocket event will be emitted.

### Verification

1.  Enable the flag.
2.  Submit an order via `POST /api/orders/execute`.
3.  Observe the order status via `GET /api/orders/:id` or WebSocket.
4.  Status should be `FAILED`.
