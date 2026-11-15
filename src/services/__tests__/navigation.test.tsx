import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loginPath, navigate, parseRoute, useRoute } from '../navigation';

describe('parseRoute', () => {
  it('knows the app routes and falls back to the start page', () => {
    expect(parseRoute('').path).toBe('/');
    expect(parseRoute('/farm').path).toBe('/farm');
    expect(parseRoute('/login').path).toBe('/login');
    expect(parseRoute('/register').path).toBe('/register');
    expect(parseRoute('/nope').path).toBe('/');
  });

  it('reads the return path of the login page and only accepts known app paths', () => {
    expect(parseRoute('/login?next=%2Ffarm').next).toBe('/farm');
    expect(parseRoute('/login?next=https%3A%2F%2Fevil.test').next).toBeNull();
    expect(parseRoute('/login?next=%2F%2Fevil.test').next).toBeNull();
    expect(parseRoute('/login?next=%2Flogin').next).toBeNull();
  });
});

describe('loginPath', () => {
  it('keeps the original path as the return path', () => {
    expect(loginPath('/farm')).toBe('/login?next=%2Ffarm');
  });
});

describe('useRoute and navigate', () => {
  it('follows navigate() at once and updates the address bar hash', () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current.path).toBe('/');
    act(() => navigate('/login?next=%2Ffarm'));
    expect(result.current.path).toBe('/login');
    expect(result.current.next).toBe('/farm');
    expect(window.location.hash).toBe('#/login?next=%2Ffarm');
  });

  it('replaces history on request', () => {
    const { result } = renderHook(() => useRoute());
    const before = window.history.length;
    act(() => navigate('/register', { replace: true }));
    expect(result.current.path).toBe('/register');
    expect(window.history.length).toBe(before);
  });

  it('follows the browser back button (hashchange)', () => {
    const { result } = renderHook(() => useRoute());
    act(() => {
      window.location.hash = '#/register';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.path).toBe('/register');
  });
});
