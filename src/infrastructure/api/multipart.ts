/**
 * Builds a `multipart/form-data` body with one file by hand. The bytes are exact and the
 * request does not depend on the runtime's FormData class.
 */
export async function encodeMultipartFile(
  field: string,
  file: File,
): Promise<{ body: Uint8Array<ArrayBuffer>; contentType: string }> {
  const boundary = `----agrofarm${crypto.randomUUID().replace(/-/g, '')}`;
  const quote = (value: string) => value.replace(/[\r\n"]/g, '_');
  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${quote(field)}"; filename="${quote(file.name)}"\r\n` +
      `Content-Type: ${quote(file.type || 'application/octet-stream')}\r\n\r\n`,
  );
  const content = new Uint8Array(await file.arrayBuffer());
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.length + content.length + tail.length);
  body.set(head, 0);
  body.set(content, head.length);
  body.set(tail, head.length + content.length);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}
