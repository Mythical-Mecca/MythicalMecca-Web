import Link from "next/link";
import { auth } from "@/lib/auth";
import { getEventsDigest } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/badge";
import { getMyPartner } from "@/lib/partner";
import { getMyApplication } from "@/lib/member";
import { listHunts } from "@/lib/hunts";
import { EventOriginBadge } from "@/components/event-origin-badge";
import { LiveEventCard } from "@/components/live-event-card";
import { Card, EmptyState } from "@/components/card";
import { PageHeading } from "@/components/page-heading";
import { Icon } from "@/components/icon";

/*
 * Layout follows the "snapshot strip + main/rail" pattern: each element is its
 * own condensed card. Modules are entry points, not full renders — each row
 * drills into its page.
 */

export default async function DashboardPage() {
	const session = await auth();
	const name = session?.user?.name ?? "Adventurer";

	// One round trip per data source — events are fetched ONCE and the live +
	// upcoming views are derived locally.
	const [{ live: liveEvent, upcoming }, partner, application, hunts] =
		await Promise.all([
			getEventsDigest(3),
			getMyPartner(session!.user.id),
			getMyApplication(session!.user.id),
			listHunts(session!.user.id),
		]);
	const openQuests = hunts.slice(0, 3);

	const openApplication =
		!partner && (application?.status === "draft" || application?.status === "pending") ? application : null;
	const isDraft = openApplication?.status === "draft";

	return (
		<div className="space-y-5">
			{/* ---------- Welcome header ------------------------------------------ */}
			<PageHeading
				eyebrow="The guild hall"
				icon="game-icons:castle"
				title={
					<>
						Welcome back, <span className="mm-gradient-text">{name}</span>
					</>
				}
			/>

			{/* ---------- Live now: time-critical, conditional ------------------- */}
			{liveEvent && (
				<div>
					<LiveEventCard event={liveEvent} />
				</div>
			)}

			{/* ---------- Main column + rail ------------------------------------ */}
			<div className="grid gap-5 lg:grid-cols-3">
				<div className="space-y-5 lg:col-span-2">
					{/* Events — the "soon" layer */}
					<Card title="Events" icon="game-icons:campfire" accent="#5cc08c" action={{ href: "/events", label: "All events" }}>
						{upcoming.length === 0 ? (
							<EmptyState
								href="/events/submit"
								text="The calendar is quiet — know of a gathering the collective would love?"
								cta="Submit an event"
							/>
						) : (
							<ul className="divide-y divide-[var(--mm-border)]">
								{upcoming.map((e) => (
									<li key={e.slug}>
										<Link href={`/events/${e.slug}`} className="group flex items-center gap-3 py-2.5">
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-[family-name:var(--font-display)] opacity-90 group-hover:text-[var(--mm-gold)]">
													{e.title}
												</span>
												<span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[var(--mm-text-dim)]">
													<Icon icon="mdi:clock-outline" width={12} /> {formatDateTime(e.startsAt)}
												</span>
											</span>
											<span className="shrink-0">
												<EventOriginBadge origin={e.origin} />
											</span>
										</Link>
									</li>
								))}
							</ul>
						)}
					</Card>
				</div>

				{/* ---------- Rail: slower-changing, glanceable ------------------- */}
				<div className="space-y-5">
					{/* Quests — the standing "something to do" slot */}
					<Card title="Quest board" icon="game-icons:treasure-map" accent="#9a6cff" action={{ href: "/quests", label: "All quests" }}>
						{openQuests.length === 0 ? (
							<EmptyState href="/quests" text="No trails are open right now — new ones appear around events." cta="Visit the board" />
						) : (
							<div className="divide-y divide-[var(--mm-border)]">
								{openQuests.map((q) => {
									const complete = q.steps > 0 && q.done === q.steps;
									return (
										<Link key={q.slug} href={`/quests/${q.slug}`} className="group flex items-center gap-3 py-2.5">
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm opacity-90 group-hover:text-[var(--mm-gold)]">{q.title}</span>
												<span className="block text-[11px] text-[var(--mm-text-dim)]">
													{/* Progress beats a raw step count — it's the thing that pulls
													    someone back mid-event. */}
													{q.done > 0 ? `${q.done} of ${q.steps} cleared` : `${q.steps} objective${q.steps === 1 ? "" : "s"}`}
												</span>
												{q.done > 0 && !complete && (
													<span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[var(--mm-surface)]">
														<span
															className="block h-full rounded-full bg-[var(--mm-gold)]"
															style={{ width: `${Math.round((q.done / q.steps) * 100)}%` }}
														/>
													</span>
												)}
											</span>
											{complete ? (
												<Icon icon="game-icons:laurels-trophy" width={17} className="shrink-0 text-[var(--mm-gold)]" />
											) : (
												<Icon icon="mdi:chevron-right" width={16} className="shrink-0 text-[var(--mm-text-dim)]" />
											)}
										</Link>
									);
								})}
							</div>
						)}
					</Card>

					{/* Partner stall — contextual */}
					{partner && (
						<Card
							title="Your stall"
							icon="game-icons:anvil"
							action={{ href: `/partners/${partner.slug}`, label: "Public page" }}
						>
							<p className="truncate font-[family-name:var(--font-display)] text-sm opacity-90">{partner.businessName}</p>
							<p className="mt-0.5 truncate text-xs text-[var(--mm-text-dim)]">
								{partner.tagline || "Manage your shop profile and gallery."}
							</p>
							<div className="mt-3 flex gap-2">
								<Link href={`/partner-hub/${partner.id}`} className="mm-btn mm-btn-primary text-xs">
									<Icon icon="mdi:storefront-outline" width={14} /> Manage
								</Link>
								<Link href={`/partner-hub/${partner.id}/gallery`} className="mm-btn mm-btn-ghost text-xs">
									Gallery
								</Link>
							</div>
						</Card>
					)}

					{/* Partner application in progress — contextual */}
					{openApplication && (
						<Card title="Partner application" icon="game-icons:shop">
							<Link href="/apply" className="block transition hover:opacity-80">
								<Badge color="var(--mm-gold)" icon={isDraft ? "mdi:file-document-edit-outline" : "mdi:clock-outline"}>
									{isDraft ? "Draft" : "Pending"}
								</Badge>
								<p className="mt-2 truncate font-[family-name:var(--font-display)] text-sm opacity-90">
									{openApplication.businessName || "Your application"}
								</p>
								<p className="mt-0.5 text-xs text-[var(--mm-text-dim)]">
									{isDraft
										? "Not submitted yet — finish it to send it for review."
										: "Under review — we'll let you know the verdict."}
								</p>
							</Link>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
