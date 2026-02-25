import axios from 'axios';

import type { ForestFailureCode } from '../../../lib/forest-envelope';

export interface ErrorMapping {
  code: ForestFailureCode;
  message: string;
  retryable?: boolean;
  maintenance?: boolean;
  details?: Record<string, any>;
}

export function extractErrorMessage(err: any): string {
  if (typeof err === 'string') return err;
  if (!err) return 'Unknown error';
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    (typeof err === 'object' ? JSON.stringify(err) : String(err)) ||
    'Unknown error'
  );
}

export function mapError(err: any): ErrorMapping {
  const message = extractErrorMessage(err);

  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return { code: 'UNAUTHORIZED', message, retryable: false };
    }
    if (status === 429) {
      return { code: 'RATE_LIMITED', message, retryable: true };
    }
    if (status && status >= 500) {
      return { code: 'UPSTREAM_ERROR', message, retryable: true };
    }
    return { code: 'UPSTREAM_ERROR', message, retryable: false };
  }

  if (/maintenance|disabled|offline/i.test(message)) {
    return {
      code: 'MAINTENANCE',
      message,
      maintenance: true,
      retryable: true,
    };
  }
  if (/timeout|timed out/i.test(message)) {
    return { code: 'TX_TIMEOUT', message, retryable: true };
  }
  if (/revert|no permission|transaction failed|failed with status/i.test(message)) {
    return { code: 'ONCHAIN_REVERT', message, retryable: false };
  }

  return { code: 'INTERNAL_ERROR', message, retryable: false };
}
