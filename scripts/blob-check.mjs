// Standalone Vercel Blob credential check — no app, no auth, no browser.
// Exercises the SAME credential the /api/upload route uses to mint client tokens.
//
//   node scripts/blob-check.mjs
//
// Loads .env then .env.local (without clobbering vars already in your shell),
// reports which Blob credentials are present, then does a REAL put()+del() so a
// green result means uploads will actually work.

import { readFileSync } from "node:fs";
import { put, del } from "@vercel/blob";

// Minimal .env loader: later files win, real shell env always wins.
function loadEnv(file) {
  let text;
  try {
    text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv(".env");
loadEnv(".env.local");

const present = (v) => (v ? `SET (${v.length} chars)` : "— missing");
console.log("Blob credentials visible to this process:");
console.log("  BLOB_READ_WRITE_TOKEN :", present(process.env.BLOB_READ_WRITE_TOKEN));
console.log("  VERCEL_OIDC_TOKEN     :", present(process.env.VERCEL_OIDC_TOKEN));
console.log("  BLOB_STORE_ID         :", present(process.env.BLOB_STORE_ID), "(identifier only, NOT a credential)");
console.log();

const hasCredential =
  !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.VERCEL_OIDC_TOKEN;
if (!hasCredential) {
  console.error(
    "RESULT: ❌ No token-minting credential. Uploads will fail with\n" +
      '        "Failed to retrieve the client token".\n' +
      "        Add BLOB_READ_WRITE_TOKEN to .env.local and re-run."
  );
  process.exit(1);
}

const key = `diagnostics/blob-check-${Date.now()}.txt`;
try {
  const blob = await put(key, "ok", {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: true,
  });
  console.log("RESULT: ✅ put() succeeded — credential is valid and can mint tokens.");
  console.log("        uploaded:", blob.url);
  await del(blob.url);
  console.log("        cleaned up test blob.");
  process.exit(0);
} catch (err) {
  console.error("RESULT: ❌ put() failed — credential present but rejected:");
  console.error("        ", err?.message || err);
  process.exit(1);
}
