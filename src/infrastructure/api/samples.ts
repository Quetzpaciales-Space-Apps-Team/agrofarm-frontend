/** Fetches a static sample file from `public/` as a `File` object for demo flows. */
export async function fetchSampleAsset(
  url: string,
  filename: string,
  mimeType: string,
): Promise<File> {
  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load sample file (${response.status})`);
  }
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
}
