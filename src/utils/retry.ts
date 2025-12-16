interface RetryOptions {
  attempts: number;
  backoffMs?: number;
}

/**
 * Retry an async operation with bounded attempts and optional backoff.
 * Intended for transient failures (network, timeouts, external APIs).
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < options.attempts && options.backoffMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.backoffMs)
        );
      }
    }
  }

  throw lastError;
}
