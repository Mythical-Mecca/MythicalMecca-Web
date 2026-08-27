import "server-only";
import QRCode from "qrcode";

/**
 * QR codes that have to survive a real venue: read across a counter, at an
 * angle, in mixed lighting, by a queue of phones of wildly varying quality.
 *
 * Three things matter, and all three were previously working against us:
 *  - **Quiet zone.** The spec wants 4 modules of margin. With less, decoders
 *    struggle to find the symbol against a busy background.
 *  - **Resolution.** The bitmap must be at least the size it is displayed at,
 *    or every module edge is interpolated into mush when upscaled.
 *  - **Contrast.** Pure black on white decodes far more reliably than a
 *    branded palette. This is signage, not decoration — the branding belongs
 *    in the frame around it.
 *
 * Whatever renders the result must not clip its corners: a rounded `<img>`
 * eats into the finder patterns. Round a wrapper element instead.
 *
 * `width` is the bitmap's pixel size. 512 is right for a screen; print wants
 * more. A QR reproduced at 85mm needs roughly 1000px to stay near the 300dpi
 * that keeps module edges crisp on paper — at 512 the same symbol lands around
 * 150dpi and the edges soften just as the scanner is working hardest.
 */
export async function qrDataUrl(text: string, width = 512): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 4,
    width,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
