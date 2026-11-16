import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '../i18n';
import { resetStubState } from './handlers';

afterEach(() => {
  cleanup();
  resetStubState();
  if (typeof window !== 'undefined')
    window.history.replaceState(null, '', window.location.pathname);
});
