/**
 * Private Blob store → public display.
 *
 * Our Blob store is PRIVATE: its URLs (`https://<id>.private.blob.vercel-storage.com/…`)
 * are not directly fetchable. To show an image we proxy it through `/api/media`,
 * which streams the bytes via the server SDK's `get()` (see app/api/media/route.ts).
 *
 * `toMediaSrc` rewrites a stored Blob URL into that same-origin proxy URL. It only
 * touches Vercel Blob URLs — local assets (`/logo.png`), data URLs, and external
 * provider avatars (Google/Discord CDNs) are returned unchanged. Apply it at the
 * data-read boundary so display components never need to know the store is private.
 */
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export function toMediaSrc(input: string): string;
export function toMediaSrc(input: null): null;
export function toMediaSrc(input: undefined): undefined;
export function toMediaSrc(input: string | null): string | null;
export function toMediaSrc(input: string | undefined): string | undefined;
export function toMediaSrc(
  input: string | null | undefined
): string | null | undefined;
export function toMediaSrc(input: string | null | undefined) {
  if (!input) return input;
  try {
    const url = new URL(input);
    if (url.hostname.endsWith(BLOB_HOST_SUFFIX)) {
      const pathname = url.pathname.replace(/^\/+/, "");
      return `/api/media?pathname=${encodeURIComponent(pathname)}`;
    }
  } catch {
    // Not an absolute URL (e.g. "/local-asset.png") — leave it as-is.
  }
  return input;
}
