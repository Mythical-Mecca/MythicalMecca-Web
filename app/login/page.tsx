import Link from "next/link";
import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuroraField } from "@/components/animations/aurora-field";
import { Icon } from "@/components/icon";
import { LogoMark } from "@/components/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { from } = await searchParams;

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
          Sign your name in the guild ledger.
        </p>

        <div className="mt-8 space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("discord", {
                redirectTo: from && from.startsWith("/") ? from : "/dashboard",
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
                redirectTo: from && from.startsWith("/") ? from : "/dashboard",
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
          New adventurers are welcomed automatically · sign in with either and
          link the other later.
        </p>
      </div>
    </div>
  );
}
