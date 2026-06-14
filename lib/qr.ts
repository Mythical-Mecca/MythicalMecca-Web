import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.QR_SIGNING_SECRET || "dev-insecure-qr-secret";

function sig(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 32);
}

/** Signed, URL-safe token encoding a hunt step. Goes inside the QR code. */
export function signStep(huntSlug: string, stepId: string): string {
  const data = `${huntSlug}:${stepId}`;
  return Buffer.from(`${data}:${sig(data)}`).toString("base64url");
}

export function verifyToken(
  token: string
): { huntSlug: string; stepId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [huntSlug, stepId, given] = decoded.split(":");
    if (!huntSlug || !stepId || !given) return null;
    const expected = sig(`${huntSlug}:${stepId}`);
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { huntSlug, stepId };
  } catch {
    return null;
  }
}

export function uplinkUrl(huntSlug: string, stepId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/hunt/scan?t=${signStep(huntSlug, stepId)}`;
}
