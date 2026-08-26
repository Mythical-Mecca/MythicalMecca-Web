import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/partner-access";
import { getPartnerForHub } from "@/lib/partner";
import {
  listPartnerMembers,
  listInvitesForPartner,
  inviteUrl,
} from "@/lib/partner-invites";
import {
  invitePartnerMember,
  revokePartnerInvite,
  removePartnerMember,
  setPartnerMemberRole,
} from "../../../actions";
import { TextField, FormCard } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { CopyLink } from "@/components/copy-link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const partner = await getPartnerForHub(partnerId);
  return { title: `${partner?.businessName ?? "Stall"} · Team` };
}

const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  member: "That person already manages this stall.",
  duplicate: "There's already an invitation outstanding for that address.",
  limit: "Too many invitations outstanding — revoke some first.",
  lastowner: "A stall must keep at least one owner.",
  "1": "Something went wrong — please try again.",
};

export default async function StallTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ invited?: string; saved?: string; error?: string }>;
}) {
  const { partnerId } = await params;
  const session = await auth();
  // The layout already gated access; this re-read tells us the caller's role,
  // which decides whether the management controls render at all.
  const membership = await getMembership(
    session!.user.id,
    partnerId,
    session!.user.role
  );
  if (!membership) notFound();

  const [members, invites] = await Promise.all([
    listPartnerMembers(partnerId),
    listInvitesForPartner(partnerId),
  ]);
  const { invited, saved, error } = await searchParams;

  const isOwner = membership.role === "owner";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <div className="max-w-3xl space-y-6">
      {saved && <Flash>Team updated.</Flash>}
      {error && <Flash tone="error">{ERRORS[error] ?? ERRORS["1"]}</Flash>}

      {invited && (
        <div className="mm-glass border-[var(--mm-live)] p-4">
          <p className="flex items-center gap-2 text-sm text-[var(--mm-live)]">
            <Icon icon="mdi:check-circle-outline" width={18} />
            Invitation created
          </p>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Send them this link. If they already have an account, it&apos;s also
            waiting in their Partner Hub.
          </p>
          <div className="mt-3">
            <CopyLink url={inviteUrl(invited)} />
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Team{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({members.length})
          </span>
        </h2>
        <div className="space-y-2">
          {members.map((m) => {
            const isLastOwner = m.role === "owner" && ownerCount <= 1;
            return (
              <div
                key={m.userId}
                className="mm-glass flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {m.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]">
                      <Icon icon="mdi:account" width={18} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm">{m.name ?? m.email}</p>
                    <p className="truncate text-xs text-[var(--mm-text-dim)]">
                      Since {m.since}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    color={
                      m.role === "owner" ? "var(--mm-violet)" : "var(--mm-text-dim)"
                    }
                    icon={m.role === "owner" ? "mdi:key-variant" : "mdi:pencil-outline"}
                  >
                    {m.role === "owner" ? "Owner" : "Manager"}
                  </Badge>
                  {isOwner && !isLastOwner && (
                    <>
                      <form action={setPartnerMemberRole}>
                        <input type="hidden" name="partnerId" value={partnerId} />
                        <input type="hidden" name="userId" value={m.userId} />
                        <input
                          type="hidden"
                          name="role"
                          value={m.role === "owner" ? "manager" : "owner"}
                        />
                        <button className="mm-btn mm-btn-ghost text-xs">
                          Make {m.role === "owner" ? "manager" : "owner"}
                        </button>
                      </form>
                      <form action={removePartnerMember}>
                        <input type="hidden" name="partnerId" value={partnerId} />
                        <input type="hidden" name="userId" value={m.userId} />
                        <button
                          className="mm-btn mm-btn-ghost text-xs"
                          aria-label={`Remove ${m.name ?? m.email}`}
                        >
                          <Icon icon="mdi:close" width={14} /> Remove
                        </button>
                      </form>
                    </>
                  )}
                  {isLastOwner && (
                    <span className="text-xs text-[var(--mm-text-dim)]">
                      Last owner
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {invites.length > 0 && (
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
            Pending invitations{" "}
            <span className="text-sm text-[var(--mm-text-dim)]">
              ({invites.length})
            </span>
          </h2>
          <div className="space-y-2">
            {invites.map((i) => (
              <div
                key={i.id}
                className="mm-glass flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {i.email ?? "Anyone with the link"}
                  </p>
                  <p className="text-xs text-[var(--mm-text-dim)]">
                    {i.expired
                      ? "Expired"
                      : `Expires ${i.expiresAt.slice(0, 10)}`}{" "}
                    · {i.role === "owner" ? "Owner" : "Manager"}
                  </p>
                </div>
                {isOwner && (
                  <form action={revokePartnerInvite}>
                    <input type="hidden" name="partnerId" value={partnerId} />
                    <input type="hidden" name="inviteId" value={i.id} />
                    <button className="mm-btn mm-btn-ghost text-xs">
                      <Icon icon="mdi:close" width={14} /> Revoke
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {isOwner ? (
        <FormCard title="Invite someone" icon="mdi:account-plus-outline" accent="#E18D01">
          <form action={invitePartnerMember} className="space-y-5">
            <input type="hidden" name="partnerId" value={partnerId} />
            <TextField
              name="email"
              label="Email address"
              icon="mdi:email-outline"
              type="email"
              placeholder="them@example.com"
              description="Works whether or not they already have an account. Leave blank to create a link anyone can use."
            />
            <PickerField
              name="role"
              label="Access level"
              icon="mdi:key-variant"
              defaultValue="manager"
              options={[
                {
                  value: "manager",
                  label: "Manager",
                  hint: "Can edit the profile and gallery.",
                },
                {
                  value: "owner",
                  label: "Owner",
                  hint: "Can also invite people and submit for review.",
                },
              ]}
            />
            <button type="submit" className="mm-btn mm-btn-primary">
              <Icon icon="mdi:send-outline" width={16} /> Create invitation
            </button>
          </form>
        </FormCard>
      ) : (
        <p className="text-sm text-[var(--mm-text-dim)]">
          Only owners can invite or remove people.
        </p>
      )}
    </div>
  );
}
