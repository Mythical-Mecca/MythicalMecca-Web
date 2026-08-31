import { Icon } from "@/components/icon";
import { BackLink } from "@/components/back-link";
import { CollabForm } from "@/components/collab-form";
import { parseReturn } from "@/lib/return-to";
import { formStamp, HONEYPOT_FIELD } from "@/lib/spam";
import { turnstileSiteKey } from "@/lib/turnstile";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Want to collaborate, sponsor a night, host an event or take a stall? Send us a message and we will write back.",
});

const DISCORD = "https://discord.gg/NKWMAtq2B";

/** What people actually write in about, so the form is not a blank stare. */
const REASONS = [
  {
    icon: "game-icons:shop",
    title: "Take a stall",
    body: "Makers, artists and shops trading at the gatherings we run.",
  },
  {
    icon: "game-icons:campfire",
    title: "Host or sponsor a night",
    body: "Bring us an evening of your own, or put your name behind one of ours.",
  },
  {
    icon: "game-icons:anvil",
    title: "Work together",
    body: "Anything that does not fit the two above. Tell us what you had in mind.",
  },
];

export default async function CollabPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; fromLabel?: string }>;
}) {
  const sp = await searchParams;
  // Reached from the footer of every public page and from the partner flow, so
  // the way back is wherever the reader actually came from. The old page had
  // no back link at all, which left the dashboard breadcrumb as the only exit.
  const backTo = parseReturn(sp, { href: "/", label: "Back to home" });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <BackLink to={backTo} />

      {/* Asymmetric on purpose: the form carries the weight and the column
          beside it answers "what do people write in about" and "is there a
          faster way to reach you". Stacks under the form on a phone. */}
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-14">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight tracking-wide sm:text-4xl">
            Get in <span className="mm-gradient-text">touch</span>
          </h1>
          <p className="mt-3 max-w-prose text-[var(--mm-text-dim)]">
            One form, and it reaches the people who run the place. Tell us what
            you are after and we will write back to the address you leave.
          </p>

          <div className="mm-glass mm-panel mt-7 p-5 sm:p-7">
            <CollabForm
              stamp={formStamp()}
              turnstileSiteKey={turnstileSiteKey()}
              honeypotField={HONEYPOT_FIELD}
            />
          </div>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-24">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
              What people write in about
            </h2>
            <ul className="mt-4 space-y-4">
              {REASONS.map((r) => (
                <li key={r.title} className="flex gap-3">
                  <Icon
                    icon={r.icon}
                    width={20}
                    className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{r.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--mm-text-dim)]">
                      {r.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-[var(--mm-divider)] pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mm-text-dim)]">
              Faster than a form
            </h2>
            <p className="mt-3 text-sm text-[var(--mm-text-dim)]">
              For anything quick, the Discord gets you an answer the same day.
            </p>
            <a
              href={DISCORD}
              target="_blank"
              rel="noopener noreferrer"
              className="mm-btn mt-4 w-full justify-center text-white"
              style={{ background: "#5865F2" }}
            >
              <Icon icon="mdi:discord" width={18} /> Join our Discord
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
