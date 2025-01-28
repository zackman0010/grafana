import { useCallback, useRef } from 'react';

type AsyncFn<T, V> = (value: T) => V | Promise<V>;

/**
 * Wraps an async function to ensure that only the latest call is resolved.
 * Used to prevent a faster call being overwritten by an earlier slower call.
 */
export function useLatestAsyncCall<T, V>(fn: AsyncFn<T, V>): AsyncFn<T, V> {
  const latestValueCount = useRef<number>(0);

  const wrappedFn = useCallback(
    (value: T) => {
      latestValueCount.current++;
      const requestCount = latestValueCount.current;

      const maybePromise = fn(value);
      // No need do the requestCount if it's a sync function
      if (!(maybePromise instanceof Promise)) {
        return maybePromise;
      }

      return maybePromise.then((result) => {
        if (requestCount === latestValueCount.current) {
          return result;
        }

        throw new StaleResultError();
      });
    },
    [fn]
  );

  return wrappedFn;
}

export class StaleResultError extends Error {
  constructor() {
    super('This result is stale and is discarded');
    this.name = 'StaleResultError';
    Object.setPrototypeOf(this, new.target.prototype); // Necessary for instanceof to work correctly
  }
}
