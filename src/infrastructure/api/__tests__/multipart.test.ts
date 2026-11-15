import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTokenStore } from '../auth';
import { createApiClient } from '../client';
import { encodeMultipartFile } from '../multipart';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('encodeMultipartFile', () => {
  it('builds a multipart body with the field name, a safe file name and the raw bytes', async () => {
    const file = new File(['a,b\n1,2\n'], 'we"ird\r\nname.csv', { type: 'text/csv' });
    const { body, contentType } = await encodeMultipartFile('file', file);
    expect(contentType).toMatch(/^multipart\/form-data; boundary=\S+$/);
    const text = new TextDecoder().decode(body);
    expect(text).toContain('name="file"; filename="we_ird__name.csv"');
    expect(text).toContain('Content-Type: text/csv');
    expect(text).toContain('\r\n\r\na,b\n1,2\n\r\n--');
    expect(text.endsWith('--\r\n')).toBe(true);
  });
});

describe('api client uploads', () => {
  it('posts the file as multipart with the extra headers and the bearer token', async () => {
    let seen: {
      type: string | null;
      key: string | null;
      auth: string | null;
      name: string;
      text: string;
    } | null = null;
    server.use(
      http.post('http://api.test/v1/up', async ({ request }) => {
        const form = await request.formData();
        const file = form.get('file') as File;
        seen = {
          type: request.headers.get('content-type'),
          key: request.headers.get('idempotency-key'),
          auth: request.headers.get('authorization'),
          name: file.name,
          text: await file.text(),
        };
        return HttpResponse.json({ ok: true }, { status: 201 });
      }),
    );
    const tokens = createTokenStore();
    tokens.set('fake.token');
    const client = createApiClient({ baseUrl: 'http://api.test', tokens });
    await client.post('/v1/up', {
      upload: { field: 'file', file: new File(['x,y\n1,2'], 'data.csv', { type: 'text/csv' }) },
      headers: { 'Idempotency-Key': 'key-1' },
    });
    expect(seen).toEqual({
      type: expect.stringMatching(/^multipart\/form-data; boundary=/),
      key: 'key-1',
      auth: 'Bearer fake.token',
      name: 'data.csv',
      text: 'x,y\n1,2',
    });
  });
});
