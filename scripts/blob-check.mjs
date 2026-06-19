// Standalone PRIVATE Vercel Blob check — no app, no auth, no browser.
// Exercises the exact pipeline the app uses:
//   1. put(..., access:'private')  — what client uploads land as
//   2. get(pathname, access:'private') — what /api/media streams back
//   3. del() — cleanup
//
//   node scripts/blob-check.mjs
//
// Loads .env then .env.local (without clobbering real shell vars).

import { readFileSync } from "node:fs";
import { put, get, del } from "@vercel/blob";

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
    const val = m[2].replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv(".env");
loadEnv(".env.local");

const present = (v) => (v ? `SET (${v.length} chars)` : "— missing");
console.log("Blob credentials visible to this process:");
console.log("  BLOB_READ_WRITE_TOKEN :", present(process.env.BLOB_READ_WRITE_TOKEN));
console.log("  BLOB_STORE_ID         :", present(process.env.BLOB_STORE_ID));
console.log();

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("RESULT: ❌ BLOB_READ_WRITE_TOKEN missing — uploads cannot work. Add it and re-run.");
  process.exit(1);
}

const key = `diagnostics/blob-check-${Date.now()}.txt`;
try {
  // 1. Upload a private blob (mirrors a client upload).
  const blob = await put(key, "ok", {
    access: "private",
    contentType: "text/plain",
    addRandomSuffix: true,
  });
  console.log("✅ put(access:'private') ok →", blob.pathname);

  // 2. Read it back via get() — exactly what /api/media does.
  const result = await get(blob.pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error(`get() returned ${result ? result.statusCode : "null"}`);
  }
  const text = await new Response(result.stream).text();
  console.log("✅ get(access:'private') ok → body:", JSON.stringify(text), "contentType:", result.blob.contentType);

  // 3. Clean up.
  await del(blob.url);
  console.log("✅ del() ok — cleaned up.");
  console.log("\nRESULT: ✅ Private store pipeline works (put → get → del). Uploads + /api/media are good.");
  process.exit(0);
} catch (err) {
  console.error("\nRESULT: ❌ Private pipeline failed:");
  console.error("        ", err?.message || err);
  process.exit(1);
}
