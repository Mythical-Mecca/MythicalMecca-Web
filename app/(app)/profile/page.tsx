import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyProfile } from "@/lib/member";
import { updateProfile } from "../actions";
import { ImageUploader } from "@/components/image-uploader";
import { TextField, FormSection } from "@/components/form";
import { Icon } from "@/components/icon";
import { getUserBadges, getUserXp, rankForXp } from "@/lib/gamification";
import { SyncGauge } from "@/components/sync-gauge";

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

  const avatar = profile?.avatarUrl ?? user.image ?? null;
  const banner = profile?.bannerUrl ?? null;
  const displayName = profile?.name ?? user.name ?? "Adventurer";

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile header: banner + avatar */}
      <section className="overflow-hidden rounded-2xl border border-[var(--mm-border)]">
        <div
          className="h-36 bg-cover bg-center"
          style={
            banner
              ? { backgroundImage: `url('${banner}')` }
              : { background: "linear-gradient(135deg,#2c7be5,#7c3aed)" }
          }
        />
        <div className="flex items-end gap-4 px-6 pb-5">
          <div className="-mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-[var(--mm-bg)] bg-[var(--mm-elevated)]">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl text-[var(--mm-text-dim)]">
                <Icon icon="game-icons:visored-helm" width={32} />
              </span>
            )}
          </div>
          <div className="pb-1">
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {displayName}
            </h1>
            <p className="text-sm text-[var(--mm-text-dim)]">
              {user.email} · standing{" "}
              <span className="uppercase tracking-widest text-[var(--mm-gold)]">
                {user.role}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Renown + badges */}
      <section className="mm-glass flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <SyncGauge pct={rank.pct} rank={rank.rank} />
        <div className="text-sm">
          <p className="text-[var(--mm-text-dim)]">Renown</p>
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
              No badges yet — clear a quest to earn your first.
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
        <div className="mm-glass flex items-center gap-2 border-[var(--mm-live)] p-3 text-sm text-[var(--mm-live)]">
          <Icon icon="mdi:check" width={16} /> Saved.
        </div>
      )}
      {error && (
        <div className="mm-glass border-[var(--mm-danger)] p-3 text-sm text-[var(--mm-danger)]">
          Could not save — check your inputs.
        </div>
      )}

      {/* Edit */}
      <form action={updateProfile} className="space-y-7">
        <TextField
          name="name"
          label="Adventurer name"
          icon="game-icons:visored-helm"
          defaultValue={profile?.name ?? user.name ?? ""}
          placeholder="Your name"
        />

        <FormSection title="Avatar" icon="mdi:account-circle-outline">
          <ImageUploader
            name="avatarUrl"
            entityType="avatar"
            maxFiles={1}
            accent="#4aa8ff"
            label="Upload a new avatar"
            description="Square works best · up to 10 MB"
          />
        </FormSection>

        <FormSection title="Portrait banner" icon="mdi:image-outline">
          <ImageUploader
            name="bannerUrl"
            entityType="banner"
            maxFiles={1}
            accent="#7c3aed"
            label="Upload a banner"
            description="Wide image for your profile header · up to 10 MB"
          />
        </FormSection>

        <button type="submit" className="mm-btn mm-btn-primary">
          <Icon icon="mdi:content-save-outline" width={16} /> Save changes
        </button>
      </form>

      <section className="mm-glass p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
          Join the Armory
        </h2>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          Run a shop, studio or craft? Petition to join the Armory and claim
          your own stall.
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
