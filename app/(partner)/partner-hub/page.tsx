import Link from "next/link";
import { auth } from "@/lib/auth";
import { listMyPartners } from "@/lib/partner-access";
import { listPendingInvitesForUser } from "@/lib/partner-invites";
import { stationsForPartner } from "@/lib/hunts";
import { acceptPartnerInviteById } from "../actions";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { PartnerStatusBadge } from "@/components/partner-status-badge";

export const metadata = { title: "Partner Hub" };

export default async function PartnerHubPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; saved?: string }>;
}) {
  const session = await auth();
  const [memberships, stations, pendingInvites] = await Promise.all([
    listMyPartners(session!.user.id),
    stationsForPartner(session!.user.id),
    // Invitations addressed to this account show up here directly, which is how
    // an invite reaches an existing member with no mail provider configured.
    listPendingInvitesForUser(session!.user.id, session!.user.email ?? null),
  ]);
  const { denied } = await searchParams;

  // On event day the running quest is the only thing that matters here, so it
  // goes above everything else — a partner mid-sale shouldn't have to hunt.
  const liveStations = stations.filter((s) => s.open);
  const canCreate = memberships.some((m) => m.status === "approved");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Partner <span className="mm-gradient-text">Hub</span>
        </h1>
        {canCreate && (
          <Link href="/partner-hub/new" className="mm-btn mm-btn-ghost text-sm">
            <Icon icon="mdi:plus" width={16} /> New stall
          </Link>
        )}
      </div>

      {denied && (
        <Flash tone="error">
          You don&apos;t have access to that stall.
        </Flash>
      )}

      {pendingInvites.length > 0 && (
        <section className="mm-glass border-[var(--mm-violet)] p-5">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            <Icon
              icon="mdi:account-plus-outline"
              width={20}
              className="text-[var(--mm-violet)]"
            />
            {pendingInvites.length === 1
              ? "You have an invitation"
              : "You have invitations"}
          </h2>
          <div className="mt-3 space-y-2">
            {pendingInvites.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)] p-3"
              >
                <span className="min-w-0 text-sm">
                  <span className="text-[var(--mm-text)]">{i.partnerName}</span>
                  <span className="text-[var(--mm-text-dim)]">
                    {" "}
                    · as {i.role === "owner" ? "owner" : "manager"}
                  </span>
                </span>
                <form action={acceptPartnerInviteById}>
                  <input type="hidden" name="inviteId" value={i.id} />
                  <button className="mm-btn mm-btn-primary text-xs">
                    <Icon icon="mdi:check" width={14} /> Accept
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {liveStations.length > 0 && (
        <section className="mm-glass border-[var(--mm-live)] p-5">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            <Icon
              icon="game-icons:treasure-map"
              width={20}
              className="text-[var(--mm-live)]"
            />
            Quest running now
          </h2>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Open your station and leave it on the counter. Adventurers scan it
            to check in.
          </p>
          <div className="mt-4 space-y-2">
            {liveStations.map((s) => (
              <Link
                key={s.stepId}
                href={`/partner-hub/station/${s.stepId}`}
                className="mm-btn mm-btn-primary flex w-full items-center justify-between py-4"
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="truncate text-base">Open station</span>
                  <span className="truncate text-xs opacity-80">
                    {/* Labelled by stall — a user may staff several. */}
                    {s.partnerName} · {s.questTitle} · {s.objectiveTitle}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge solid color="var(--mm-gold)">
                    {s.checkIns}
                  </Badge>
                  <Icon icon="mdi:chevron-right" width={20} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {stations.length > 0 && liveStations.length === 0 && (
        <section className="mm-glass p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <Icon
              icon="game-icons:treasure-map"
              width={18}
              className="text-[var(--mm-text-dim)]"
            />
            Your quest stations
          </h2>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            Nothing running right now. Your station goes live when the quest
            does.
          </p>
          <div className="mt-3 space-y-1.5">
            {stations.map((s) => (
              <Link
                key={s.stepId}
                href={`/partner-hub/station/${s.stepId}`}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[var(--mm-text-dim)] transition hover:bg-[var(--mm-surface)] hover:text-[var(--mm-text)]"
              >
                <span className="truncate">
                  {s.partnerName} · {s.questTitle} · {s.objectiveTitle}
                </span>
                <Icon icon="mdi:chevron-right" width={16} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Your stalls{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({memberships.length})
          </span>
        </h2>

        {memberships.length === 0 ? (
          <div className="mm-glass border-[var(--mm-gold)] p-6 text-sm text-[var(--mm-text-dim)]">
            No stall loaded yet. Once your petition is approved, your shop fills
            in here.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {memberships.map((m) => (
              <Link
                key={m.partnerId}
                href={`/partner-hub/${m.partnerId}`}
                className="mm-glass group flex flex-col p-5 transition hover:border-[var(--mm-gold)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon
                    icon="game-icons:shop"
                    width={24}
                    className="text-[var(--mm-gold)]"
                  />
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <PartnerStatusBadge status={m.status} />
                    {m.role === "owner" && (
                      <Badge color="var(--mm-violet)" icon="mdi:key-variant">
                        Owner
                      </Badge>
                    )}
                    {!m.active && (
                      <Badge color="var(--mm-danger)" icon="mdi:pause-circle-outline">
                        Paused
                      </Badge>
                    )}
                  </div>
                </div>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg group-hover:text-[var(--mm-gold)]">
                  {m.businessName}
                </h3>
                <span className="mt-1 text-sm text-[var(--mm-text-dim)]">
                  Manage profile, gallery &amp; more →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
