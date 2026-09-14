import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeForUser } from "@/lib/home";
import { isSafePath } from "@/lib/return-to";

/**
 * Post-login router. OAuth lands here because the JWT is only minted after
 * the callback, so `/login` cannot yet tell an admin from a visitor.
 */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  const { from } = await searchParams;
  const safeFrom =
    from && isSafePath(from) ? from : null;

  if (!session?.user) {
    redirect(
      safeFrom ? `/login?from=${encodeURIComponent(safeFrom)}` : "/"
    );
  }

  redirect(await homeForUser(session.user, safeFrom));
}
