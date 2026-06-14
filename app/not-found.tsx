import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-[family-name:var(--font-display)] text-6xl mm-gradient-text">
        404
      </p>
      <h1 className="mt-4 text-xl">Signal lost</h1>
      <p className="mt-2 max-w-sm text-[var(--mm-text-dim)]">
        This sector is empty space. The coordinates you requested don&apos;t map
        to anything in the hangar.
      </p>
      <Link href="/" className="mm-btn mm-btn-primary mt-8">
        Return to base
      </Link>
    </div>
  );
}
