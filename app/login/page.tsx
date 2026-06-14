import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { from } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="mm-glass w-full max-w-sm p-8 text-center">
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
          <button type="submit" className="mm-btn mm-btn-primary w-full justify-center">
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-xs text-[var(--mm-text-dim)]">
          New adventurers are welcomed automatically.
        </p>
      </div>
    </div>
  );
}
