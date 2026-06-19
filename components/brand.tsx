import Link from "next/link";
import Image from "next/image";

/**
 * The Mythical Mecca shield emblem — a transparent PNG, shown bare (no badge)
 * so it sits cleanly on any background.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/MMRefined2026.png"
      alt="Mythical Mecca"
      width={1080}
      height={1080}
      priority
      className={`shrink-0 object-contain ${className ?? "h-9 w-9"}`}
    />
  );
}

/** Logo + wordmark lockup used in the site headers. */
export function Brand({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Mythical Mecca — home"
      className={`inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] tracking-widest ${className ?? ""}`}
    >
      <LogoMark />
      <span>
        MYTHICAL<span className="mm-gradient-text"> MECCA</span>
      </span>
    </Link>
  );
}
