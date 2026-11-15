import type { Middleware } from './middleware';
import { REQUEST_ID_HEADER } from './requestId';

export type ApiErrorCode =
  | 'network_error'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'validation_error'
  | 'server_error'
  | 'unavailable'
  | 'unknown_error'
  | (string & {});

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(init: {
    code: ApiErrorCode;
    message: string;
    status: number;
    details?: unknown;
    requestId?: string | null;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.details = init.details ?? null;
    this.requestId = init.requestId ?? null;
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError;

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status === 422 || status === 400) return 'validation_error';
  if (status === 503) return 'unavailable';
  if (status >= 500) return 'server_error';
  return 'unknown_error';
}

const requestIdOf = (init?: RequestInit) => new Headers(init?.headers).get(REQUEST_ID_HEADER);
const nameOf = (value: unknown) =>
  value instanceof Error || value instanceof DOMException ? value.name : '';

async function fromResponse(response: Response, init?: RequestInit): Promise<ApiError> {
  const headerId = response.headers.get(REQUEST_ID_HEADER) ?? requestIdOf(init);
  let problem: Record<string, unknown> | null = null;
  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('json')) {
    try {
      const parsed: unknown = await response.json();
      if (typeof parsed === 'object' && parsed !== null)
        problem = parsed as Record<string, unknown>;
    } catch {
      problem = null;
    }
  }
  const text = (key: string) =>
    typeof problem?.[key] === 'string' ? (problem[key] as string) : null;
  return new ApiError({
    code: text('code') ?? codeFromStatus(response.status),
    message: text('detail') ?? text('title') ?? `Request failed with status ${response.status}.`,
    status: response.status,
    details: problem?.errors ?? null,
    requestId: text('request_id') ?? headerId,
  });
}

/** Everything that leaves the client as an error is an `ApiError`, except a caller abort. */
export function errorNormalizer(): Middleware {
  return (next) => async (input, init) => {
    let response: Response;
    try {
      response = await next(input, init);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const timedOut =
        nameOf(error) === 'TimeoutError' || nameOf(init?.signal?.reason) === 'TimeoutError';
      if (timedOut) {
        throw new ApiError({
          code: 'timeout',
          message: 'The request took too long.',
          status: 0,
          requestId: requestIdOf(init),
        });
      }
      if (nameOf(error) === 'AbortError') throw error;
      throw new ApiError({
        code: 'network_error',
        message: 'The network request failed.',
        status: 0,
        requestId: requestIdOf(init),
      });
    }
    if (response.ok) return response;
    throw await fromResponse(response, init);
  };
}
