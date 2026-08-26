import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyPartner, listMyGallery } from "@/lib/partner";
import { stationsForPartner } from "@/lib/hunts";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";

export const metadata = { title: "Partner Hub" };

export default async function PartnerHubOverviewPage() {
  const session = await auth();
  const partner = await getMyPartner(session!.user.id);
  const [gallery, stations] = await Promise.all([
    partner ? listMyGallery(partner.id) : Promise.resolve([]),
    stationsForPartner(session!.user.id),
  ]);
  // On event day the running quest is the only thing that matters here, so it
  // goes above everything else — a vendor mid-sale shouldn't have to hunt.
  const liveStations = stations.filter((s) => s.open);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Partner <span className="mm-gradient-text">Hub</span>
      </h1>

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
                    {s.questTitle} · {s.objectiveTitle}
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
                  {s.questTitle} · {s.objectiveTitle}
                </span>
                <Icon icon="mdi:chevron-right" width={16} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {!partner ? (
        <div className="mm-glass border-[var(--mm-gold)] p-4 text-sm text-[var(--mm-text-dim)]">
          No stall loaded yet. Once a database is connected and your petition is
          approved, your shop fills in here.
        </div>
      ) : (
        <>
          <div className="mm-glass p-6">
            <p className="text-xs uppercase tracking-widest text-[var(--mm-gold)]">
              Stall
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl">
              {partner.businessName}
            </h2>
            <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
              {partner.tagline ?? "Add a tagline in your profile."}
            </p>
            <Link
              href={`/partners/${partner.slug}`}
              className="mt-4 inline-block text-sm text-[var(--mm-gold)] hover:text-[var(--mm-gold-hi)]"
            >
              View public page →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/partner-hub/gallery" className="mm-glass p-5">
              <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                Gallery items
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
                {gallery.length}
              </p>
            </Link>
            <Link href="/partner-hub/profile" className="mm-glass p-5">
              <p className="text-xs uppercase tracking-widest text-[var(--mm-text-dim)]">
                Stall profile
              </p>
              <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
                Edit tagline, bio & socials →
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
