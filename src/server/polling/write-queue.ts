let queue: Promise<unknown> = Promise.resolve();

export function enqueueWrite<T>(operation: () => T | Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}
