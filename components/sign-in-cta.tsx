import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * The ask at the bottom of a public teaser.
 *
 * `from` is what makes a shared link worth following: signing in has to land
 * you back on the quest you were sent, not on a generic dashboard, or the
 * person who shared it has to send it twice.
 */
export function SignInCta({
  from,
  headline,
  blurb,
}: {
  from: string;
  headline: string;
  blurb: string;
}) {
  return (
    <section className="mm-glass mm-panel mt-6 p-5 text-center sm:p-6">
      <Icon
        icon="game-icons:castle"
        width={30}
        className="mx-auto text-[var(--mm-gold)]"
      />
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl tracking-wide">
        {headline}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--mm-text-dim)]">
        {blurb}
      </p>
      <Link
        href={`/login?from=${encodeURIComponent(from)}`}
        className="mm-btn mm-btn-primary mt-4"
      >
        <Icon icon="mdi:account" width={18} /> Sign in to continue
      </Link>
    </section>
  );
}
