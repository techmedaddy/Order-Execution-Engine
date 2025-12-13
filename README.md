# Order Execution Engine

## System Description
A high-throughput order execution engine built with Node.js and TypeScript. It accepts order requests via a REST API, processes them asynchronously using a persistent queue, executes trades against mock decentralized exchanges (DEXs), and streams real-time status updates to clients via WebSockets.

## Architecture
```
[Client] <---> [Fastify API] ----> [PostgreSQL]
   ^               |
   |               v
   |           [Redis Queue]
   |               |
   |               v
   +---------- [Order Worker] ----> [Mock DEX]
                   |
                   +--------------> [PostgreSQL]
```

## Order Lifecycle
Transitions are strict and irreversible.
1.  **CREATED**: Order persisted in database.
2.  **QUEUED**: Job added to execution queue.
3.  **EXECUTING**: Worker atomically claims order.
4.  **SUCCESS**: Trade executed successfully (Terminal).
5.  **FAILED**: Execution failed or rejected (Terminal).

## Idempotency Strategy
Clients must provide a unique `Idempotency-Key` HTTP header.
*   **Database**: `idempotency_key` column has a `UNIQUE` constraint.
*   **Logic**: Uses `INSERT ... ON CONFLICT DO NOTHING`.
*   **Behavior**: Duplicate keys return the existing `orderId` immediately without creating new records or triggering duplicate execution jobs.

## Concurrency Strategy
Race conditions are prevented via atomic database updates.
*   **Mechanism**: Workers execute `UPDATE orders SET status = 'EXECUTING' ... WHERE id = $1 AND status = 'QUEUED'`.
*   **Guarantee**: Only one worker can successfully update the row. If the update affects zero rows, the worker exits immediately.

## Failure Handling
*   **Simulation**: Set `MOCK_DEX_FORCE_FAIL=true` in `.env` to force execution errors.
*   **Behavior**: Any error during execution immediately transitions the order to `FAILED`.
*   **Retries**: Disabled by design (max attempts = 1).
*   **Terminality**: Once `FAILED` (or `SUCCESS`), an order cannot be modified or re-executed.

## How to Run

1.  **Prerequisites**: Node.js, PostgreSQL, Redis (must run in WSL on Windows).
2.  **Environment**: Create a `.env` file:
    ```env
    NODE_ENV=development
    PORT=7542
    DATABASE_URL=postgresql://user:pass@localhost:5432/order_engine
    REDIS_URL=redis://localhost:6379
    MOCK_DEX_FORCE_FAIL=false
    ```
3.  **Database Setup**: Ensure the `orders` table exists and has the unique constraint:
    ```sql
    ALTER TABLE orders ADD COLUMN idempotency_key TEXT UNIQUE;
    ```
4.  **Start**:
    ```bash
    npm install
    npm run dev
    ```
5.  **Verify**:
    *   Health: `GET http://localhost:7542/health`
    *   Execute: `POST http://localhost:7542/api/orders/execute`
