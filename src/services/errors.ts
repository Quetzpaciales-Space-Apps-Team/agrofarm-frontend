import { isApiError } from '../infrastructure/api/errorNormalizer';

/** i18n key that explains an error to the user. Components never see raw HTTP errors. */
export function errorKey(error: unknown): string {
  if (!isApiError(error)) return 'errors.generic';
  if (error.code === 'network_error') return 'errors.network';
  if (error.code === 'timeout') return 'errors.timeout';
  switch (error.status) {
    case 401:
      return 'errors.unauthorized';
    case 404:
      return 'errors.notFound';
    case 429:
      return 'errors.rateLimited';
    case 503:
      return 'errors.unavailable';
    default:
      return 'errors.generic';
  }
}

/** Specific messages for `POST /v1/auth/demo`. */
export function demoErrorKey(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 404) return 'auth.demo.disabled';
    if (error.status === 429) return 'auth.demo.rateLimited';
    if (error.status === 503) return 'auth.demo.full';
    if (error.code === 'network_error' || error.code === 'timeout') return errorKey(error);
  }
  return 'auth.demo.failed';
}
