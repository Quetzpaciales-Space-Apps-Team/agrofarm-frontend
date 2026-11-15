/** Client-side checks that mirror the backend rules in docs/contract/openapi.yaml. The server stays the authority. */

export type FieldCode = 'required' | 'invalid' | 'tooShort' | 'tooLong';
export type FieldIssues<K extends string> = Partial<Record<K, FieldCode>>;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}
export interface LoginInput {
  email: string;
  password: string;
}

export const EMAIL_MAX_CHARS = 254;
export const PASSWORD_MIN_CHARS = 10;
export const PASSWORD_MAX_BYTES = 72;
export const NAME_MAX_CHARS = 120;

/** Length in UTF-8 bytes (bcrypt, used by the API, only reads the first 72 bytes). */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

// One "@", something on both sides, a dot in the domain, no spaces. The server does the strict check.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailIssue(email: string): FieldCode | undefined {
  const value = email.trim();
  if (!value) return 'required';
  if (value.length > EMAIL_MAX_CHARS) return 'tooLong';
  if (!EMAIL_SHAPE.test(value)) return 'invalid';
  return undefined;
}

export function validateRegister(input: RegisterInput): FieldIssues<keyof RegisterInput> {
  const issues: FieldIssues<keyof RegisterInput> = {};
  const email = emailIssue(input.email);
  if (email) issues.email = email;
  if (!input.password) issues.password = 'required';
  else if ([...input.password].length < PASSWORD_MIN_CHARS) issues.password = 'tooShort';
  else if (utf8ByteLength(input.password) > PASSWORD_MAX_BYTES) issues.password = 'tooLong';
  const name = input.name.trim();
  if (!name) issues.name = 'required';
  else if ([...name].length > NAME_MAX_CHARS) issues.name = 'tooLong';
  return issues;
}

/** Login only checks that something was typed: the password rules apply when choosing one, not when using it. */
export function validateLogin(input: LoginInput): FieldIssues<keyof LoginInput> {
  const issues: FieldIssues<keyof LoginInput> = {};
  const email = input.email.trim();
  if (!email) issues.email = 'required';
  else if (!EMAIL_SHAPE.test(email)) issues.email = 'invalid';
  if (!input.password) issues.password = 'required';
  return issues;
}
