import { AsyncLocalStorage } from 'node:async_hooks';

interface CorrelationStore {
  correlationId: string;
}

const als = new AsyncLocalStorage<CorrelationStore>();

export const CorrelationContext = {
  run(correlationId: string, callback: () => void): void {
    als.run({ correlationId }, callback);
  },
  getCorrelationId(): string | undefined {
    return als.getStore()?.correlationId;
  },
};
