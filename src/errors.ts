import type { MessageKey } from './i18n';

/** Stable error codes keep protocol parsing independent of the UI language. */
export class LocalizedError extends Error {
  constructor(readonly key: MessageKey) {
    super(key);
    this.name = 'LocalizedError';
  }
}
