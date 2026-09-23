/**
 * Allow a small HTML subset for Easy-mode copy.
 *
 * The admin editor writes this; the player page renders it. Keeping the
 * allowlist here (rather than trusting the browser) means a pasted blob of
 * markup cannot carry scripts or event handlers onto the public quest page.
 */
export function sanitizeEasyModeHtml(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "<br>" || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return null;
  }

  // Drop anything that is not a tag we allow, and strip every attribute
  // except href on anchors (http/https/mailto/# only).
  const withoutComments = trimmed.replace(/<!--[\s\S]*?-->/g, "");
  const withoutScripts = withoutComments
    .replace(/<\/?(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  const cleaned = withoutScripts.replace(
    /<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
    (full, tag: string, attrs = "") => {
      const name = tag.toLowerCase();
      const allowed = new Set([
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "ul",
        "ol",
        "li",
        "a",
        "h3",
        "h4",
      ]);
      if (!allowed.has(name)) return "";
      if (name === "br") return "<br>";
      const closing = full.startsWith("</");
      if (closing) return `</${name}>`;
      if (name === "a") {
        const hrefMatch = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const href = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "").trim();
        if (!/^(https?:\/\/|mailto:|#)/i.test(href)) return "<a>";
        const safe = href.replace(/"/g, "&quot;");
        return `<a href="${safe}" rel="noopener noreferrer" target="_blank">`;
      }
      return `<${name}>`;
    }
  );

  const text = cleaned.replace(/<[^>]+>/g, "").trim();
  return text ? cleaned : null;
}
