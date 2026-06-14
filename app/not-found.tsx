import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-[family-name:var(--font-display)] text-6xl mm-gradient-text">
        404
      </p>
      <h1 className="mt-4 text-xl">Lost in the wilds</h1>
      <p className="mt-2 max-w-sm text-[var(--mm-text-dim)]">
        These lands are uncharted. The path you sought leads nowhere in the
        realm.
      </p>
      <Link href="/" className="mm-btn mm-btn-primary mt-8">
        Return to the hall
      </Link>
    </div>
  );
}
