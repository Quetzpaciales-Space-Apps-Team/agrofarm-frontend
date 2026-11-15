import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createTestApi } from '../../test/render';
import { server } from '../../test/server';
import { assessLeaf, isHttps } from '../leaves';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function oldBrowserFile() {
  const file = new File(['photo'], 'leaf.png', { type: 'image/png' });
  Object.defineProperty(file, 'arrayBuffer', { value: undefined });
  return file;
}

it('reads binary photos using FileReader when File.arrayBuffer is unavailable', async () => {
  let body = '';
  server.use(
    http.post('*/v1/farms/farm/leaves/assess', async ({ request }) => {
      body = await request.text();
      return HttpResponse.json({ assessment: 'uncertain' });
    }),
  );
  const { client } = createTestApi();
  await assessLeaf(client, 'farm', oldBrowserFile(), new AbortController().signal);
  expect(body).toBe('photo');
});

it('reports a local file reading failure before making a request', async () => {
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (
    this: FileReader,
  ) {
    this.dispatchEvent(new ProgressEvent('error'));
  });
  const { client } = createTestApi();
  await expect(
    assessLeaf(client, 'farm', oldBrowserFile(), new AbortController().signal),
  ).rejects.toThrow(/could not be read/);
});

it('does not upload after cancellation and allows only HTTPS guidance links', async () => {
  const { client } = createTestApi();
  const post = vi.spyOn(client, 'post');
  const abort = new AbortController();
  abort.abort();
  await expect(
    assessLeaf(client, 'farm', new File(['photo'], 'leaf.png'), abort.signal),
  ).rejects.toThrow(/Aborted/);
  expect(post).not.toHaveBeenCalled();
  expect(isHttps('https://extension.umn.edu')).toBe(true);
  expect(isHttps('http://example.test')).toBe(false);
  expect(isHttps('javascript:alert(1)')).toBe(false);
  expect(isHttps('not a URL')).toBe(false);
});
