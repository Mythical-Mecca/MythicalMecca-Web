import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyProfile } from "@/lib/member";
import { updateProfile } from "../actions";
import { FileUploader } from "@/components/file-uploader";
import { getUserBadges, getUserXp, rankForXp } from "@/lib/gamification";
import { SyncGauge } from "@/components/sync-gauge";

const DIVISIONS = ["tabletop", "arcade", "otaku", "maker"] as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const [profile, xp, badges] = await Promise.all([
    getMyProfile(user.id),
    getUserXp(user.id),
    getUserBadges(user.id),
  ]);
  const rank = rankForXp(xp);
  const { saved, error } = await searchParams;
  const division = profile?.division ?? "";

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Mech <span className="mm-gradient-text">loadout</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          {user.email} · clearance{" "}
          <span className="uppercase tracking-widest text-[var(--mm-gold)]">
            {user.role}
          </span>
        </p>
      </div>

      <section className="mm-glass flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <SyncGauge pct={rank.pct} rank={rank.rank} />
        <div className="text-sm">
          <p className="text-[var(--mm-text-dim)]">XP core</p>
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--mm-gold)]">
            {xp}
          </p>
        </div>
        <div className="flex-1">
          <p className="mb-2 text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
            Badges
          </p>
          {badges.length === 0 ? (
            <p className="text-sm text-[var(--mm-text-dim)]">
              No badges yet — clear an op to earn your first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.code}
                  className="rounded-full border border-[var(--mm-gold)] px-3 py-1 text-xs text-[var(--mm-gold)]"
                >
                  {b.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {saved && (
        <div className="mm-glass border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          Loadout saved.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not save — check your inputs.
        </div>
      )}

      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg tracking-wide">
          Identity
        </h2>
        <form action={updateProfile} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
              Callsign
            </label>
            <input
              name="name"
              defaultValue={profile?.name ?? user.name ?? ""}
              className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
              Division
            </label>
            <select
              name="division"
              defaultValue={division}
              className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm capitalize outline-none focus:border-[var(--mm-violet)]"
            >
              <option value="">Unaffiliated</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d} className="capitalize">
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="mm-btn mm-btn-primary">
            Save loadout
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg tracking-wide">
          Avatar
        </h2>
        <FileUploader entityType="avatar" multiple={false} />
      </section>

      <section className="mm-glass p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
          Join the Armory
        </h2>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          Run a shop, studio or craft? Apply to become a vendor and get your own
          manufacturer page.
        </p>
        <Link
          href="/vendor-application"
          className="mm-btn mm-btn-ghost mt-4 text-sm"
        >
          Apply / track application
        </Link>
      </section>
    </div>
  );
}
