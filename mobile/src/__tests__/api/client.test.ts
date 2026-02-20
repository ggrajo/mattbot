import { extractApiError } from '../../api/client';
import axios from 'axios';

describe('extractApiError', () => {
  it('extracts message from API error response', () => {
    const error = new axios.AxiosError(
      'Request failed',
      '400',
      {} as any,
      {},
      {
        status: 400,
        data: { error: { code: 'validation_error', message: 'Invalid email format', request_id: 'r1', details: [] } },
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      }
    );
    expect(extractApiError(error)).toBe('Invalid email format');
  });

  it('returns network error message when no response', () => {
    const error = new axios.AxiosError('Network Error', 'ERR_NETWORK', {} as any, {});
    expect(extractApiError(error)).toBe('Network error. Please check your connection and try again.');
  });

  it('returns generic message for unknown errors', () => {
    expect(extractApiError(new Error('something'))).toBe('An unexpected error occurred. Please try again.');
  });
});
