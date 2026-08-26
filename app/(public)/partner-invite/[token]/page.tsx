import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { findInviteByToken } from "@/lib/partner-invites";
import { acceptPartnerInvite, declinePartnerInvite } from "../actions";
import { Icon } from "@/components/icon";

export const metadata = { title: "Stall invitation" };

/**
 * Invitation landing page. Deliberately public so a signed-out invitee can read
 * who invited them and to what before being asked to sign in.
 *
 * Accepting is a form POST, never a GET — the router prefetches links, and a
 * GET mutation would accept invitations just by hovering.
 */
export default async function PartnerInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const [invite, session] = await Promise.all([
    findInviteByToken(token),
    auth(),
  ]);

  const dead =
    !invite || invite.status !== "pending" || invite.expired || !!error;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-6 py-16">
      <div className="mm-glass w-full p-8 text-center">
        {dead ? (
          <>
            <Icon
              icon="mdi:link-off"
              width={40}
              className="mx-auto text-[var(--mm-text-dim)]"
            />
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl">
              This invitation is no longer valid
            </h1>
            {/* No partner name here — an invalid token shouldn't leak one. */}
            <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
              It may have expired, been revoked, or already been used. Ask
              whoever invited you to send a new one.
            </p>
            <Link href="/" className="mm-btn mm-btn-ghost mt-6">
              Back to Mythical Mecca
            </Link>
          </>
        ) : !session?.user ? (
          <>
            <Icon
              icon="mdi:account-plus-outline"
              width={40}
              className="mx-auto text-[var(--mm-gold)]"
            />
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl">
              You&apos;ve been invited
            </h1>
            <p className="mt-2 text-[var(--mm-text-dim)]">
              {invite.inviterName ?? "A partner"} invited you to help manage{" "}
              <span className="text-[var(--mm-text)]">{invite.partnerName}</span>
              .
            </p>
            <Link
              href={`/login?from=/partner-invite/${encodeURIComponent(token)}`}
              className="mm-btn mm-btn-primary mt-6"
            >
              Sign in to accept
            </Link>
            {invite.email && (
              <p className="mt-4 text-xs text-[var(--mm-text-dim)]">
                Sign in with <strong>{invite.email}</strong> — the invitation is
                tied to that address.
              </p>
            )}
          </>
        ) : invite.invitedUserId && invite.invitedUserId !== session.user.id ? (
          <Mismatch signedInAs={session.user.email} />
        ) : invite.email &&
          (session.user.email ?? "").toLowerCase() !==
            invite.email.toLowerCase() ? (
          <Mismatch signedInAs={session.user.email} sentTo={invite.email} />
        ) : (
          <>
            <Icon
              icon="game-icons:shop"
              width={40}
              className="mx-auto text-[var(--mm-gold)]"
            />
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl">
              Join {invite.partnerName}
            </h1>
            <p className="mt-2 text-[var(--mm-text-dim)]">
              {invite.inviterName ?? "A partner"} invited you to help manage this
              stall as a{" "}
              <strong className="text-[var(--mm-text)]">
                {invite.role === "owner" ? "owner" : "manager"}
              </strong>
              .
            </p>
            {!invite.email && !invite.invitedUserId && (
              <p className="mt-3 text-xs text-[var(--mm-text-dim)]">
                This is an open link — anyone who has it can join.
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <form action={acceptPartnerInvite}>
                <input type="hidden" name="token" value={token} />
                <button className="mm-btn mm-btn-primary">
                  <Icon icon="mdi:check" width={16} /> Accept invitation
                </button>
              </form>
              <form action={declinePartnerInvite}>
                <input type="hidden" name="token" value={token} />
                <button className="mm-btn mm-btn-ghost">Decline</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A forwarded link opened by the wrong account. There is deliberately no
 * "accept anyway" — that would make every invite bearer-authenticated.
 */
function Mismatch({
  signedInAs,
  sentTo,
}: {
  signedInAs?: string | null;
  sentTo?: string;
}) {
  return (
    <>
      <Icon
        icon="mdi:account-alert-outline"
        width={40}
        className="mx-auto text-[var(--mm-danger)]"
      />
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl">
        This invitation is for someone else
      </h1>
      <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
        {sentTo ? (
          <>
            It was sent to <strong>{sentTo}</strong>, but you&apos;re signed in
            as <strong>{signedInAs ?? "another account"}</strong>.
          </>
        ) : (
          <>
            You&apos;re signed in as{" "}
            <strong>{signedInAs ?? "another account"}</strong>.
          </>
        )}{" "}
        Sign in with the invited account, or ask for a new invitation.
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-6"
      >
        <button className="mm-btn mm-btn-ghost">Sign out</button>
      </form>
    </>
  );
}
