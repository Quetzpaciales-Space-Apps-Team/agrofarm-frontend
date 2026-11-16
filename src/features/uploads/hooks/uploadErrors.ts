import { isApiError } from '../../../infrastructure/api/errorNormalizer';
import { errorKey } from '../../../services/errors';

export interface UploadErrorView {
  key: string;
  params: { message: string };
  /** The request may have reached the server before it failed. */
  maybeStored: boolean;
}

/** Maps a failed `POST /uploads` to catalog keys. Components never see raw HTTP errors. */
export function uploadErrorView(error: unknown): UploadErrorView {
  if (isApiError(error)) {
    const maybeStored = error.code === 'network_error' || error.code === 'timeout';
    if (error.status === 413)
      return { key: 'uploads.error.tooLarge', params: { message: '' }, maybeStored };
    if (error.status === 422) {
      return { key: 'uploads.error.rejected', params: { message: error.message }, maybeStored };
    }
    return { key: errorKey(error), params: { message: error.message }, maybeStored };
  }
  return { key: errorKey(error), params: { message: '' }, maybeStored: false };
}
