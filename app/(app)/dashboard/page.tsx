import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLiveEvent } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { getUserXp, rankForXp, getUserBadges } from "@/lib/gamification";
import { getMyVendor } from "@/lib/vendor";
import { getMyApplication } from "@/lib/member";
import { SyncGauge } from "@/components/sync-gauge";
import { Icon } from "@/components/icon";

// slightly transparent so the scene shows through the cards
const softCard = {
  background: "color-mix(in srgb, var(--mm-surface) 40%, transparent)",
} as const;

const LINKS = [
  {
    href: "/events",
    title: "Events",
    desc: "Feasts, gatherings & quests",
    icon: "game-icons:campfire",
    color: "#5cc08c",
  },
  {
    href: "/hunts",
    title: "Quests",
    desc: "Scavenger trails & leaderboards",
    icon: "game-icons:crossed-swords",
    color: "#9a6cff",
  },
  {
    href: "/arcade",
    title: "Training Yard",
    desc: "Trials of skill",
    icon: "mdi:target",
    color: "#48c8d6",
  },
  {
    href: "/armory",
    title: "Partners",
    desc: "The Armory — makers & merchants",
    icon: "game-icons:anvil",
    color: "#E18D01",
  },
  {
    href: "/profile",
    title: "Character",
    desc: "Your hero & achievements",
    icon: "game-icons:visored-helm",
    color: "#e0b0ff",
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Adventurer";
  const [liveEvent, xp, myBadges, vendor, application] = await Promise.all([
    getLiveEvent(),
    getUserXp(session!.user.id),
    getUserBadges(session!.user.id),
    getMyVendor(session!.user.id),
    getMyApplication(session!.user.id),
  ]);
  const rank = rankForXp(xp);
  // An in-progress application — draft (not yet submitted) or pending (under review).
  const openApplication =
    !vendor &&
    (application?.status === "draft" || application?.status === "pending")
      ? application
      : null;
  const isDraft = openApplication?.status === "draft";

  const stats = [
    { label: "Rank", value: rank.rank, icon: "mdi:shield-star-outline", color: "#E18D01" },
    { label: "Renown", value: xp.toLocaleString(), icon: "mdi:star-four-points", color: "#4aa8ff" },
    {
      label: rank.next ? `To ${rank.next}` : "Standing",
      value: rank.next ? rank.toNext.toLocaleString() : "Max",
      icon: "mdi:trending-up",
      color: "#5cc08c",
    },
    { label: "Badges", value: String(myBadges.length), icon: "mdi:medal-outline", color: "#9a6cff" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome + gauge (compact) */}
      <section
        className="mm-glass flex flex-col items-start justify-between gap-5 p-6 md:flex-row md:items-center"
        style={softCard}
      >
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--mm-gold)]">
            <Icon icon="game-icons:gamepad" width={15} /> Player one
          </p>
          <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl tracking-wide md:text-3xl">
            Welcome back, <span className="mm-gradient-text">{name}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
            {rank.next
              ? `${rank.toNext} renown to ${rank.next}.`
              : "Highest standing achieved."}
          </p>
        </div>
        <SyncGauge pct={rank.pct} rank={rank.rank} />
      </section>

      {/* Stats strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="mm-glass flex items-center gap-3 p-4"
            style={softCard}
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
              style={{ background: `${s.color}22`, color: s.color }}
            >
              <Icon icon={s.icon} width={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-lg leading-tight">
                {s.value}
              </p>
              <p className="truncate text-[11px] uppercase tracking-wider text-[var(--mm-text-dim)]">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Live event (compact) */}
      {liveEvent && (
        <Link
          href={`/events/${liveEvent.slug}`}
          className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--mm-live)] p-4 transition hover:brightness-110"
          style={{
            background:
              "linear-gradient(135deg, rgba(92,192,140,0.16), rgba(44,123,229,0.14))",
          }}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--mm-live)]">
              <span className="mm-dot-live" /> A gathering awaits
            </p>
            <h2 className="mt-1 truncate font-[family-name:var(--font-display)] text-lg">
              {liveEvent.title}
            </h2>
            <p className="mt-0.5 truncate text-sm text-[var(--mm-text-dim)]">
              {formatDateTime(liveEvent.startsAt)} · {liveEvent.location}
            </p>
          </div>
          <span className="mm-btn mm-btn-primary shrink-0 text-sm">
            <Icon icon="mdi:arrow-right" width={16} /> View
          </span>
        </Link>
      )}

      {/* Explore */}
      <section>
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg tracking-wide">
          <Icon icon="game-icons:compass" width={20} className="text-[var(--mm-gold)]" />
          Explore
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="mm-glass group flex items-start gap-3 p-4 transition hover:border-[var(--mm-violet)]"
              style={softCard}
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg"
                style={{ background: `${l.color}22`, color: l.color }}
              >
                <Icon icon={l.icon} width={22} />
              </span>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-base group-hover:text-[var(--mm-gold)]">
                  {l.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--mm-text-dim)]">{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Vendor stall — active vendor account */}
      {vendor && (
        <section>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg tracking-wide">
            <Icon icon="game-icons:anvil" width={20} className="text-[var(--mm-gold)]" />
            Your stall
          </h2>
          <div
            className="mm-glass mt-4 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
            style={softCard}
          >
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-xl tracking-wide">
                {vendor.businessName}
              </p>
              <p className="mt-0.5 text-sm text-[var(--mm-text-dim)]">
                {vendor.tagline || "Manage your Armory stall and gallery."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/forge" className="mm-btn mm-btn-primary text-sm">
                <Icon icon="mdi:storefront-outline" width={16} /> Manage stall
              </Link>
              <Link href="/forge/gallery" className="mm-btn mm-btn-ghost text-sm">
                <Icon icon="mdi:image-multiple-outline" width={16} /> Gallery
              </Link>
              <Link
                href={`/armory/${vendor.slug}`}
                className="mm-btn mm-btn-ghost text-sm"
              >
                <Icon icon="mdi:open-in-new" width={16} /> Public page
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Vendor application in progress — draft or pending */}
      {openApplication && (
        <section>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg tracking-wide">
            <Icon icon="game-icons:shop" width={20} className="text-[var(--mm-gold)]" />
            Vendor application
          </h2>
          <div
            className="mm-glass mt-4 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
            style={softCard}
          >
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mm-gold)] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-widest text-[var(--mm-gold)]">
                <Icon
                  icon={isDraft ? "mdi:file-document-edit-outline" : "mdi:clock-outline"}
                  width={13}
                />
                {isDraft ? "Draft" : "Pending"}
              </span>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl tracking-wide">
                {openApplication.businessName || "Your application"}
              </p>
              <p className="mt-0.5 text-sm text-[var(--mm-text-dim)]">
                {isDraft
                  ? "Not submitted yet — add your demo images to send it to the Keep."
                  : "Under review by the Keep — we'll let you know when there's a verdict."}
              </p>
            </div>
            <Link
              href="/vendor-application"
              className="mm-btn mm-btn-primary shrink-0 text-sm"
            >
              <Icon icon="mdi:arrow-right" width={16} />{" "}
              {isDraft ? "Finish application" : "Track application"}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
