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

export type AuthField = 'email' | 'password' | 'name';
/** A message for one field: an i18n key we own, or plain text the server sent. */
export type FieldMessage = { key: string } | { text: string };

export interface AuthFailure {
  fields: Partial<Record<AuthField, FieldMessage>>;
  /** i18n key for a message that belongs to the whole form. */
  formKey: string | null;
}

/** Login never says which part was wrong or whether the email exists: one message for every credential problem. */
export function loginErrorKey(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 429) return 'auth.login.rateLimited';
    if (error.code === 'network_error' || error.code === 'timeout') return errorKey(error);
    if (error.status === 503 || error.status >= 500) return 'errors.unavailable';
  }
  return 'auth.login.failed';
}

const AUTH_FIELDS: readonly string[] = ['email', 'password', 'name'];

/** Reads `errors: [{ field, message }]` from a problem+json answer; `body.email` counts as `email`. */
function serverFieldErrors(error: unknown): AuthFailure['fields'] {
  const fields: AuthFailure['fields'] = {};
  if (!isApiError(error) || !Array.isArray(error.details)) return fields;
  for (const item of error.details as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const { field, message } = item as { field?: unknown; message?: unknown };
    if (typeof field !== 'string' || typeof message !== 'string') continue;
    const name = field.split('.').pop() ?? '';
    if (AUTH_FIELDS.includes(name) && !(name in fields)) {
      fields[name as AuthField] = { text: message };
    }
  }
  return fields;
}

/** Turns a failed registration into messages for fields or for the whole form. */
export function registerFailure(error: unknown): AuthFailure {
  const fields = serverFieldErrors(error);
  if (Object.keys(fields).length > 0) return { fields, formKey: null };
  if (isApiError(error) && error.status === 409) {
    return { fields: { email: { key: 'auth.register.emailTaken' } }, formKey: null };
  }
  if (isApiError(error) && (error.status === 400 || error.status === 422)) {
    return { fields: {}, formKey: 'auth.register.rejected' };
  }
  return { fields: {}, formKey: errorKey(error) };
}
