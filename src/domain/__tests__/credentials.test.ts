import { describe, expect, it } from 'vitest';
import { utf8ByteLength, validateLogin, validateRegister } from '../credentials';

const valid = { email: 'ana@example.test', password: 'fake-test-pass-01', name: 'Ana Lopez' };

describe('utf8ByteLength', () => {
  it('counts bytes, not characters', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('€')).toBe(3);
    expect(utf8ByteLength('\u{1F33D}')).toBe(4);
  });
});

describe('validateRegister (mirrors the backend rules)', () => {
  it('accepts a valid form', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('requires every field', () => {
    expect(validateRegister({ email: '', password: '', name: '  ' })).toEqual({
      email: 'required',
      password: 'required',
      name: 'required',
    });
  });

  it('rejects an email without a domain', () => {
    expect(validateRegister({ ...valid, email: 'ana@' }).email).toBe('invalid');
    expect(validateRegister({ ...valid, email: 'not an email' }).email).toBe('invalid');
  });

  it('allows an email of at most 254 characters', () => {
    const local = 'a'.repeat(64);
    const longest = `${local}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
    expect(longest.length).toBe(254);
    expect(validateRegister({ ...valid, email: longest }).email).toBeUndefined();
    expect(validateRegister({ ...valid, email: `x${longest}` }).email).toBe('tooLong');
  });

  it('needs a password of at least 10 characters', () => {
    expect(validateRegister({ ...valid, password: '123456789' }).password).toBe('tooShort');
    expect(validateRegister({ ...valid, password: '1234567890' }).password).toBeUndefined();
  });

  it('allows at most 72 bytes in the password', () => {
    expect(validateRegister({ ...valid, password: 'a'.repeat(72) }).password).toBeUndefined();
    expect(validateRegister({ ...valid, password: 'a'.repeat(73) }).password).toBe('tooLong');
  });

  it('counts the 72 bytes in UTF-8, so 40 two-byte characters are too long', () => {
    expect(validateRegister({ ...valid, password: 'é'.repeat(36) }).password).toBeUndefined();
    expect(validateRegister({ ...valid, password: 'é'.repeat(37) }).password).toBe('tooLong');
  });

  it('does not trim the password', () => {
    expect(validateRegister({ ...valid, password: ' '.repeat(10) }).password).toBeUndefined();
  });

  it('allows a name of 1 to 120 characters', () => {
    expect(validateRegister({ ...valid, name: 'A' }).name).toBeUndefined();
    expect(validateRegister({ ...valid, name: 'A'.repeat(120) }).name).toBeUndefined();
    expect(validateRegister({ ...valid, name: 'A'.repeat(121) }).name).toBe('tooLong');
  });
});

describe('validateLogin', () => {
  it('requires an email and a password but does not judge the password rules', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'required',
      password: 'required',
    });
    expect(validateLogin({ email: 'ana@example.test', password: 'x' })).toEqual({});
  });

  it('rejects a malformed email', () => {
    expect(validateLogin({ email: 'ana', password: 'x' }).email).toBe('invalid');
  });
});
