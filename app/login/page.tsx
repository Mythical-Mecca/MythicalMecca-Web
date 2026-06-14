import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuroraField } from "@/components/aurora-field";
import { Icon } from "@/components/icon";

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
        style={{ backgroundImage: "url('/MythicMechaAuthBackground.png')" }}
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

      <div className="relative mm-glass w-full max-w-sm p-8 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-widest">
          ENTER THE <span className="mm-gradient-text">HALL</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          Sign your name in the guild ledger.
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: from && from.startsWith("/") ? from : "/dashboard",
            });
          }}
        >
          <button
            type="submit"
            className="mm-btn mm-btn-primary w-full justify-center"
          >
            <Icon icon="logos:google-icon" width={16} /> Continue with Google
          </button>
        </form>

        <p className="mt-6 text-xs text-[var(--mm-text-dim)]">
          New adventurers are welcomed automatically.
        </p>
      </div>
    </div>
  );
}
