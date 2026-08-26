import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyProfile, getLinkedAccounts } from "@/lib/member";
import { updateProfile, linkSocial } from "../actions";
import { ImageUploader } from "@/components/image-uploader";
import { TextField, FormSection } from "@/components/form";
import { Icon } from "@/components/icon";
import { Flash } from "@/components/flash";

export const metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; linked?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const [profile, linked] = await Promise.all([
    getMyProfile(user.id),
    getLinkedAccounts(user.id),
  ]);
  const { saved, error, linked: justLinked } = await searchParams;

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

      {saved && <Flash>Saved.</Flash>}
      {justLinked && <Flash>Account linked.</Flash>}
      {error && <Flash tone="error">Could not save — check your inputs.</Flash>}

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
          Connected accounts
        </h2>
        <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
          Sign in with Discord or Google — link both to keep one profile.
        </p>
        <div className="mt-4 space-y-2">
          {[
            { key: "discord", label: "Discord", icon: "mdi:discord" },
            { key: "google", label: "Google", icon: "logos:google-icon" },
          ].map((p) => {
            const isLinked = linked.includes(p.key);
            return (
              <div
                key={p.key}
                className="flex items-center justify-between rounded-xl border border-[var(--mm-border)] px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Icon icon={p.icon} width={18} /> {p.label}
                </span>
                {isLinked ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--mm-live)]">
                    <Icon icon="mdi:check-circle" width={14} /> Connected
                  </span>
                ) : (
                  <form action={linkSocial}>
                    <input type="hidden" name="provider" value={p.key} />
                    <button className="mm-btn mm-btn-ghost text-xs">
                      <Icon icon="mdi:link-variant" width={14} /> Link
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mm-glass p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide">
          Become a partner
        </h2>
        <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
          Run a shop, studio or craft? Petition to join our partners and claim
          your own stall.
        </p>
        <Link
          href="/apply"
          className="mm-btn mm-btn-ghost mt-4 text-sm"
        >
          Apply / track application
        </Link>
      </section>
    </div>
  );
}
