import "server-only";
import QRCode from "qrcode";

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 220,
    color: { dark: "#070b1e", light: "#f5c451" },
  });
}
