/**
 * Scans the source tree for iconify icon names and writes an offline bundle
 * (lib/icon-bundles.json) so the client never fetches icon data from
 * api.iconify.design at runtime. Re-run whenever you add a new icon:
 *   npx tsx scripts/build-icons.mts
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getIcons } from "@iconify/utils";
import type { IconifyJSON } from "@iconify/types";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib"];
const ICON_RE = /["'`](mdi|game-icons|logos):([a-z0-9-]+)["'`]/g;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(tsx?|mts)$/.test(entry.name)) yield p;
  }
}

const found = new Map<string, Set<string>>();
for (const dir of SCAN_DIRS) {
  for await (const file of walk(path.join(ROOT, dir))) {
    const src = await readFile(file, "utf8");
    for (const m of src.matchAll(ICON_RE)) {
      const [, prefix, name] = m;
      if (!found.has(prefix)) found.set(prefix, new Set());
      found.get(prefix)!.add(name);
    }
  }
}

const bundles: IconifyJSON[] = [];
for (const [prefix, names] of found) {
  const pkg = path.join(ROOT, "node_modules", `@iconify-json/${prefix}`, "icons.json");
  const full: IconifyJSON = JSON.parse(await readFile(pkg, "utf8"));
  const subset = getIcons(full, [...names]);
  if (!subset) continue;
  const missing = [...names].filter(
    (n) => !subset.icons[n] && !subset.aliases?.[n]
  );
  if (missing.length) {
    console.warn(`[${prefix}] not found (will fall back to API):`, missing.join(", "));
  }
  bundles.push(subset);
  console.log(`[${prefix}] bundled ${Object.keys(subset.icons).length} icons`);
}

await writeFile(
  path.join(ROOT, "lib", "icon-bundles.json"),
  JSON.stringify(bundles)
);
console.log("wrote lib/icon-bundles.json");
