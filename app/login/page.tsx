import Link from "next/link";
import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuroraField } from "@/components/animations/aurora-field";
import { Icon } from "@/components/icon";
import { LogoMark } from "@/components/brand";
import { Flash } from "@/components/flash";
import { pageMetadata } from "@/lib/metadata";
import { continueHref, homeForUser } from "@/lib/home";

export const metadata = pageMetadata({
  title: "Sign in",
  description:
    "Sign in to Mythical Mecca to run a stall or keep the hall.",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const session = await auth();
  const { from, error } = await searchParams;
  // A bare startsWith("/") also admits "//evil.com", which browsers read as a
  // protocol-relative absolute URL.
  const safeFrom =
    from && from.startsWith("/") && !from.startsWith("//") ? from : null;

  if (session?.user) redirect(await homeForUser(session.user, safeFrom));

  const afterSignIn = continueHref(safeFrom);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url('/MythicMechaAuthBackground.webp')" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,10,22,0.32), rgba(8,10,22,0.62))",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <AuroraField />
      </div>

      <Link
        href="/"
        className="absolute left-6 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--mm-border)] bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)] px-4 py-2 text-sm text-[var(--mm-text-dim)] backdrop-blur transition hover:text-[var(--mm-text)]"
      >
        <Icon icon="mdi:arrow-left" width={18} /> Back
      </Link>

      <div className="relative mm-glass w-full max-w-sm p-8 text-center">
        <LogoMark className="mx-auto mb-6 h-24 w-24" />
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-widest">
          ENTER THE <span className="mm-gradient-text">HALL</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          Stallholders and keepers sign in here.
        </p>

        {/* Auth.js sends a refused sign-in back here with a code. The only one
            we turn away ourselves is a banned account — see the signIn
            callback in lib/auth.ts. */}
        {error && (
          <Flash tone="error" className="mt-6 text-left">
            {error === "AccessDenied"
              ? "This account can't sign in. If you think that's a mistake, get in touch."
              : "That sign-in didn't go through. Please try again."}
          </Flash>
        )}

        <div className="mt-8 space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("discord", {
                redirectTo: afterSignIn,
              });
            }}
          >
            <button
              type="submit"
              className="mm-btn w-full justify-center text-white"
              style={{ background: "#5865F2" }}
            >
              <Icon icon="mdi:discord" width={18} /> Continue with Discord
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("google", {
                redirectTo: afterSignIn,
              });
            }}
          >
            <button
              type="submit"
              className="mm-btn mm-btn-ghost w-full justify-center"
            >
              <Icon icon="logos:google-icon" width={16} /> Continue with Google
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-[var(--mm-text-dim)]">
          Visitors can browse the site without an account. Sign in to apply
          for a stall, run one, or keep the hall.
        </p>
      </div>
    </div>
  );
}
