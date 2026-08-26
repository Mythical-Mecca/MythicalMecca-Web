import "server-only";
import { headers } from "next/headers";

/**
 * Tag URLs are built from `NEXT_PUBLIC_APP_URL`, which is correct — a printed
 * QR or an NFC tag has to point at the public site, not at whatever machine
 * generated it. The failure mode is that a wrong value looks completely fine
 * on screen and only bites when someone scans a tag at the event.
 *
 * Comparing the host baked into a tag against the host you're actually
 * browsing catches the common case: a local `.env` copied wholesale into the
 * deployment. Returns null when they agree, or when the tag URL is unparseable.
 */
export async function tagHostWarning(
  sampleTagUrl: string
): Promise<string | null> {
  try {
    const browsingHost = (await headers()).get("host");
    if (!browsingHost) return null;
    const tagHost = new URL(sampleTagUrl).host;
    if (tagHost === browsingHost) return null;

    const looksLocal = /^(localhost|127\.0\.0\.1)(:|$)/i.test(tagHost);
    return looksLocal
      ? `These tags point at ${tagHost} — a local address. Anyone scanning them at the event will get nothing. Set NEXT_PUBLIC_APP_URL to the public site URL and redeploy before printing or writing tags.`
      : `These tags point at ${tagHost}, but you're browsing ${browsingHost}. They'll only work if ${tagHost} is the live site — otherwise fix NEXT_PUBLIC_APP_URL before printing.`;
  } catch {
    return null;
  }
}
