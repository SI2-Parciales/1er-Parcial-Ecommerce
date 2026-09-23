import type { ApiErrorResponse } from '../types';

export function handleApiError(error: unknown): ApiErrorResponse {
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    if (err.response && err.response.data) {
      return {
        message: err.response.data.message || 'An error occurred',
        statusCode: err.response.status,
        details: err.response.data.details
      };
    }
  }
  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}
