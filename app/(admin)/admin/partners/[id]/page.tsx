import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPartnerById, listMyGallery, listOfferings } from "@/lib/partner";
import { listCategories } from "@/lib/categories";
import {
  inviteUrl,
  listInvitesForPartner,
  listPartnerMembers,
} from "@/lib/partner-invites";
import {
  addPartnerGalleryImages,
  addPartnerOffering,
  deletePartner,
  invitePartnerMemberAsAdmin,
  movePartnerGalleryImage,
  movePartnerOffering,
  removePartnerGalleryImage,
  removePartnerMemberAsAdmin,
  removePartnerOffering,
  revokePartnerInviteAsAdmin,
  setPartnerGalleryCaption,
  setPartnerMemberRoleAsAdmin,
  updatePartnerDetails,
  updatePartnerOffering,
} from "@/app/(admin)/actions-partners";
import {
  CheckboxField,
  FormCard,
  FormSection,
  TextField,
  TextareaField,
  inputCls,
} from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { ImageUploader } from "@/components/image-uploader";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyLink } from "@/components/copy-link";
import { SectionTabs } from "@/components/section-tabs";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { BackLink } from "@/components/back-link";
import { formatPrice } from "@/lib/format";
import { parseReturn } from "@/lib/return-to";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partner = await getPartnerById(id);
  return { title: `${partner?.businessName ?? "Partner"} · Admin` };
}

const ACCENT = "#E18D01";

const TABS = [
  { key: "details", label: "Details", icon: "mdi:pencil-outline" },
  { key: "gallery", label: "Gallery", icon: "mdi:image-multiple-outline" },
  { key: "products", label: "Products", icon: "mdi:tag-outline" },
  { key: "team", label: "Team", icon: "mdi:account-multiple-outline" },
  {
    key: "advanced",
    label: "Advanced",
    icon: "mdi:alert-outline",
    tone: "danger" as const,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", hint: "Being built. Not public.", icon: "mdi:file-outline" },
  { value: "pending", label: "In review", hint: "Submitted by the owner; waiting on you.", icon: "mdi:clock-outline" },
  { value: "approved", label: "Approved", hint: "Public, as long as it is also listed.", icon: "mdi:check-circle-outline" },
  { value: "rejected", label: "Changes requested", hint: "Sent back with the note below.", icon: "mdi:cancel" },
];

const STATUS_COLOR: Record<string, string> = {
  draft: "var(--mm-text-dim)",
  pending: "var(--mm-gold)",
  approved: "var(--mm-live)",
  rejected: "var(--mm-danger)",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "In review",
  approved: "Approved",
  rejected: "Changes requested",
};

const TEAM_ERRORS: Record<string, string> = {
  bademail: "Enter a valid email address, or leave it empty for a link-only invite.",
  member: "That person already manages this stall.",
  duplicate: "There's already an invitation outstanding for that address.",
  limit: "Too many invitations outstanding — revoke some first.",
  lastowner:
    "That's the only owner. Make someone else an owner first, or the stall has nobody who can run its team from the hub.",
};

function stamp(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default async function AdminPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
    slug?: string;
    created?: string;
    invited?: string;
    bademail?: string;
    member?: string;
    duplicate?: string;
    limit?: string;
    lastowner?: string;
    from?: string;
    fromLabel?: string;
  }>;
}) {
  const { id } = await params;
  const [partner, categories, sp] = await Promise.all([
    getPartnerById(id),
    listCategories(),
    searchParams,
  ]);
  if (!partner) notFound();

  const tab: TabKey = TABS.some((t) => t.key === sp.tab)
    ? (sp.tab as TabKey)
    : "details";
  const base = `/admin/partners/${id}`;
  const backTo = parseReturn(sp, {
    href: "/admin/partners",
    label: "All partners",
  });

  const [gallery, offerings, members, invites] = await Promise.all([
    listMyGallery(id),
    listOfferings(id),
    listPartnerMembers(id),
    listInvitesForPartner(id),
  ]);
  const pendingInvites = invites.filter((i) => i.status === "pending" && !i.expired);
  const ownerCount = members.filter((m) => m.role === "owner").length;
  const live = partner.status === "approved" && partner.active;

  const teamError = Object.keys(TEAM_ERRORS).find((k) => k in sp && sp[k as keyof typeof sp]);

  const COUNTS: Record<TabKey, number | undefined> = {
    details: undefined,
    gallery: gallery.length,
    products: offerings.length,
    team: members.length + pendingInvites.length,
    advanced: undefined,
  };

  const sectionHref = (key: TabKey) => {
    const p = new URLSearchParams({ tab: key });
    if (sp.from) p.set("from", sp.from);
    if (sp.fromLabel) p.set("fromLabel", sp.fromLabel);
    return `${base}?${p.toString()}`;
  };

  return (
    <div className="max-w-5xl space-y-6">
      <BackLink to={backTo} />

      <PageHeading
        size="md"
        title={partner.businessName}
        subtitle={
          <>
            {partner.categoryName ?? "No category"}
            {" · "}
            {live ? "Public" : "Not public"}
            {partner.submittedAt ? ` · submitted ${stamp(partner.submittedAt)}` : ""}
          </>
        }
        icon="game-icons:anvil"
        accent={ACCENT}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={STATUS_COLOR[partner.status]}>
              {STATUS_LABEL[partner.status]}
            </Badge>
            {partner.isPremium && (
              <Badge color="var(--mm-gold)" icon="mdi:crown-outline">
                Premium
              </Badge>
            )}
            <Badge color={partner.active ? "var(--mm-live)" : "var(--mm-text-dim)"}>
              {partner.active ? "Listed" : "Unlisted"}
            </Badge>
            <Link
              href={live ? `/partners/${partner.slug}` : `/partners/${partner.slug}?preview=1`}
              className="mm-btn mm-btn-ghost text-sm"
            >
              <Icon icon="mdi:eye-outline" width={16} />
              {live ? "View public page" : "Preview"}
            </Link>
            <Link href={`/partner-hub/${partner.id}`} className="mm-btn mm-btn-ghost text-sm">
              <Icon icon="mdi:storefront-outline" width={16} /> Partner Hub
            </Link>
          </div>
        }
      />

      {sp.created && <Flash>Partner created. Fill in the rest whenever you like.</Flash>}
      {sp.saved && <Flash>Saved.</Flash>}
      {sp.slug && (
        <Flash tone="error">Another partner already uses that slug — nothing was saved.</Flash>
      )}
      {sp.error && (
        <Flash tone="error">That didn&apos;t work — check the fields and try again.</Flash>
      )}
      {teamError && <Flash tone="error">{TEAM_ERRORS[teamError]}</Flash>}

      {partner.status === "approved" && !partner.active && (
        <div className="mm-glass border-[var(--mm-gold)] p-4 text-sm">
          <Icon icon="mdi:eye-off-outline" width={16} className="mr-1.5 inline text-[var(--mm-gold)]" />
          Approved but unlisted — it&apos;s off the public site until you tick
          &ldquo;Listed&rdquo; on the Details tab.
        </div>
      )}
      {partner.status === "pending" && (
        <div className="mm-glass flex flex-wrap items-center justify-between gap-3 border-[var(--mm-gold)] p-4 text-sm">
          <span>
            <Icon icon="mdi:clock-outline" width={16} className="mr-1.5 inline text-[var(--mm-gold)]" />
            The owner submitted this for review.
          </span>
          <Link href="/admin/partners/queue" className="mm-btn mm-btn-ghost text-xs">
            <Icon icon="mdi:gavel" width={14} /> Review in the queue
          </Link>
        </div>
      )}

      <SectionTabs
        label="Partner sections"
        items={TABS.map((t) => ({
          href: sectionHref(t.key),
          label: t.label,
          icon: t.icon,
          tone: "tone" in t ? t.tone : undefined,
          count: COUNTS[t.key],
        }))}
        active={sectionHref(tab)}
        accent={ACCENT}
      />

      {/* ------------------------------------------------------------------ */}
      {tab === "details" && (
        <FormCard title="Partner details" icon="mdi:pencil-outline" accent={ACCENT}>
          <form action={updatePartnerDetails} className="space-y-6">
            <input type="hidden" name="id" value={partner.id} />

            <FormSection title="The stall" icon="game-icons:anvil">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  name="businessName"
                  label="Business name"
                  icon="mdi:storefront-outline"
                  required
                  defaultValue={partner.businessName}
                />
                <TextField
                  name="slug"
                  label="Slug"
                  icon="mdi:link-variant"
                  required
                  defaultValue={partner.slug}
                  description={`The public URL: /partners/${partner.slug}`}
                />
              </div>
              <PickerField
                name="categoryId"
                label="Category"
                icon="mdi:shape-outline"
                hint="optional"
                placeholder="No category"
                defaultValue={partner.categoryId ?? ""}
                description="Decides which sections the public page shows."
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  icon: c.icon ?? undefined,
                }))}
              />
              <TextField
                name="tagline"
                label="Tagline"
                hint="optional"
                icon="mdi:text-short"
                maxLength={200}
                defaultValue={partner.tagline ?? ""}
              />
              <TextareaField
                name="bio"
                label="Bio"
                hint="optional"
                icon="mdi:text-long"
                rows={6}
                maxLength={2000}
                defaultValue={partner.bio ?? ""}
              />
            </FormSection>

            <FormSection title="Links" icon="mdi:link-variant">
              <TextField
                name="shopUrl"
                label="Shop link"
                hint="optional"
                icon="mdi:cart-outline"
                type="url"
                inputMode="url"
                defaultValue={partner.shopUrl ?? ""}
                placeholder="https://…"
              />
              <TextareaField
                name="socials"
                label="Socials"
                hint="one per line"
                icon="mdi:share-variant-outline"
                rows={3}
                defaultValue={partner.socialsRaw ?? ""}
              />
            </FormSection>

            <FormSection title="Images" icon="mdi:image-outline">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-3">
                  {partner.logoUrl && (
                    <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-[var(--mm-surface)]">
                      <Image src={partner.logoUrl} alt="" fill sizes="96px" className="object-cover" />
                    </div>
                  )}
                  <ImageUploader
                    name="logo"
                    entityType="partner_gallery"
                    maxFiles={1}
                    accent={ACCENT}
                    label={partner.logoUrl ? "Replace logo" : "Upload a logo"}
                    description="Square works best"
                  />
                  {partner.logoUrl && (
                    <CheckboxField
                      name="clearLogo"
                      icon="mdi:image-remove-outline"
                      label="Remove the logo"
                    />
                  )}
                </div>
                <div className="space-y-3">
                  {partner.bannerUrl && (
                    <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl bg-[var(--mm-surface)]">
                      <Image src={partner.bannerUrl} alt="" fill sizes="480px" className="object-cover" />
                    </div>
                  )}
                  <ImageUploader
                    name="banner"
                    entityType="partner_gallery"
                    maxFiles={1}
                    accent={ACCENT}
                    label={partner.bannerUrl ? "Replace banner" : "Upload a banner"}
                    description="Wide, behind the name"
                  />
                  {partner.bannerUrl && (
                    <CheckboxField
                      name="clearBanner"
                      icon="mdi:image-remove-outline"
                      label="Remove the banner"
                    />
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection title="Visibility" icon="mdi:eye-outline">
              <PickerField
                name="status"
                label="Status"
                icon="mdi:flag-outline"
                required
                defaultValue={partner.status}
                options={STATUS_OPTIONS}
                description="Public needs Approved and Listed together. Listed on its own is the kill switch."
              />
              <TextareaField
                name="reviewNote"
                label="Review note"
                hint="optional"
                icon="mdi:comment-text-outline"
                rows={2}
                maxLength={500}
                defaultValue={partner.reviewNote ?? ""}
                description="Shown to the owner in their hub. Say what to change when you send it back."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <CheckboxField
                  name="active"
                  icon="mdi:eye-outline"
                  label="Listed"
                  description="On the public site, if approved."
                  defaultChecked={partner.active}
                />
                <CheckboxField
                  name="isPremium"
                  icon="mdi:crown-outline"
                  label="Premium partner"
                  description="Highlighted across the armory."
                  defaultChecked={partner.isPremium}
                />
              </div>
            </FormSection>

            <button type="submit" className="mm-btn mm-btn-primary">
              <Icon icon="mdi:content-save-outline" width={16} /> Save changes
            </button>
          </form>
        </FormCard>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "gallery" && (
        <div className="space-y-6">
          <FormCard title="Add photos" icon="mdi:plus" accent={ACCENT}>
            <form action={addPartnerGalleryImages} className="space-y-5">
              <input type="hidden" name="id" value={partner.id} />
              <ImageUploader
                name="images"
                entityType="partner_gallery"
                maxFiles={12}
                accent={ACCENT}
                label="Gallery photos"
                description="Up to 12 at a time · shown on the public page"
              />
              <PickerField
                name="kind"
                label="These are"
                icon="mdi:shape-outline"
                defaultValue="art"
                options={[
                  { value: "art", label: "Art", hint: "Shown in the art section.", icon: "game-icons:paint-brush" },
                  { value: "product", label: "Products", hint: "Shown in the products section.", icon: "mdi:tag-outline" },
                ]}
              />
              <button type="submit" className="mm-btn mm-btn-primary">
                <Icon icon="mdi:plus" width={16} /> Add to gallery
              </button>
            </form>
          </FormCard>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
              Photos{" "}
              <span className="text-sm text-[var(--mm-text-dim)]">({gallery.length})</span>
            </h2>
            {gallery.length === 0 ? (
              <p className="text-sm text-[var(--mm-text-dim)]">
                No photos yet. The public page shows the banner and logo only.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((g, i) => (
                  <li key={g.id} className="mm-glass overflow-hidden">
                    <div className="relative aspect-[4/3] bg-[var(--mm-surface)]">
                      {g.imageUrl && (
                        <Image
                          src={g.imageUrl}
                          alt={g.caption ?? ""}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover"
                        />
                      )}
                      <span className="absolute left-2 top-2">
                        <Badge color={g.kind === "product" ? "var(--mm-blue)" : "var(--mm-violet)"}>
                          {g.kind === "product" ? "Product" : "Art"}
                        </Badge>
                      </span>
                    </div>
                    <div className="space-y-2 p-3">
                      <form action={setPartnerGalleryCaption} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={partner.id} />
                        <input type="hidden" name="imageId" value={g.id} />
                        <select
                          name="kind"
                          defaultValue={g.kind}
                          aria-label="Kind"
                          className={`${inputCls} w-auto py-1.5 text-xs`}
                        >
                          <option value="art">Art</option>
                          <option value="product">Product</option>
                        </select>
                        <input
                          name="caption"
                          defaultValue={g.caption ?? ""}
                          aria-label="Caption"
                          placeholder="Caption"
                          maxLength={300}
                          className={`${inputCls} min-w-0 flex-1 py-1.5 text-xs`}
                        />
                        <button type="submit" className="mm-btn mm-btn-ghost shrink-0 text-xs" title="Save">
                          <Icon icon="mdi:check" width={14} />
                        </button>
                      </form>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <form action={movePartnerGalleryImage}>
                            <input type="hidden" name="id" value={partner.id} />
                            <input type="hidden" name="imageId" value={g.id} />
                            <input type="hidden" name="dir" value="up" />
                            <button type="submit" disabled={i === 0} title="Move earlier" className="mm-btn mm-btn-ghost text-xs disabled:opacity-35">
                              <Icon icon="mdi:arrow-left" width={14} />
                            </button>
                          </form>
                          <form action={movePartnerGalleryImage}>
                            <input type="hidden" name="id" value={partner.id} />
                            <input type="hidden" name="imageId" value={g.id} />
                            <input type="hidden" name="dir" value="down" />
                            <button type="submit" disabled={i === gallery.length - 1} title="Move later" className="mm-btn mm-btn-ghost text-xs disabled:opacity-35">
                              <Icon icon="mdi:arrow-right" width={14} />
                            </button>
                          </form>
                        </div>
                        <form action={removePartnerGalleryImage}>
                          <input type="hidden" name="id" value={partner.id} />
                          <input type="hidden" name="imageId" value={g.id} />
                          <ConfirmButton
                            label="Remove"
                            confirmLabel="Remove photo"
                            icon="mdi:trash-can-outline"
                            title="Remove this photo?"
                            body="It disappears from the public page. The uploaded file itself stays in storage."
                            className="mm-btn mm-btn-ghost text-xs"
                          />
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "products" && (
        <div className="space-y-6">
          <FormCard title="Add a product or service" icon="mdi:plus" accent={ACCENT}>
            <form action={addPartnerOffering} className="space-y-5">
              <input type="hidden" name="id" value={partner.id} />
              <OfferingFields accent={ACCENT} />
              <button type="submit" className="mm-btn mm-btn-primary">
                <Icon icon="mdi:plus" width={16} /> Add
              </button>
            </form>
          </FormCard>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
              Products &amp; services{" "}
              <span className="text-sm text-[var(--mm-text-dim)]">({offerings.length})</span>
            </h2>
            {offerings.length === 0 ? (
              <p className="text-sm text-[var(--mm-text-dim)]">
                Nothing listed yet. Hidden items stay here but come off the public page.
              </p>
            ) : (
              <ul className="space-y-3">
                {offerings.map((o, i) => (
                  <li key={o.id} className="mm-glass p-4">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                        {o.imageUrl ? (
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--mm-surface)]">
                            <Image src={o.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                          </span>
                        ) : (
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]">
                            <Icon icon={o.kind === "service" ? "mdi:hand-heart-outline" : "mdi:tag-outline"} width={20} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{o.name}</span>
                            <Badge color={o.kind === "service" ? "var(--mm-violet)" : "var(--mm-blue)"}>
                              {o.kind === "service" ? "Service" : "Product"}
                            </Badge>
                            {!o.active && <Badge icon="mdi:eye-off-outline">Hidden</Badge>}
                          </span>
                          <span className="mt-0.5 block text-sm text-[var(--mm-text-dim)]">
                            {o.priceCents != null ? formatPrice(o.priceCents, o.currency) : "No price"}
                            {o.description ? ` · ${o.description}` : ""}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <form action={movePartnerOffering}>
                            <input type="hidden" name="id" value={partner.id} />
                            <input type="hidden" name="offeringId" value={o.id} />
                            <input type="hidden" name="dir" value="up" />
                            <button type="submit" disabled={i === 0} title="Move up" className="mm-btn mm-btn-ghost text-xs disabled:opacity-35">
                              <Icon icon="mdi:arrow-up" width={14} />
                            </button>
                          </form>
                          <form action={movePartnerOffering}>
                            <input type="hidden" name="id" value={partner.id} />
                            <input type="hidden" name="offeringId" value={o.id} />
                            <input type="hidden" name="dir" value="down" />
                            <button type="submit" disabled={i === offerings.length - 1} title="Move down" className="mm-btn mm-btn-ghost text-xs disabled:opacity-35">
                              <Icon icon="mdi:arrow-down" width={14} />
                            </button>
                          </form>
                          <span className="mm-btn mm-btn-ghost text-xs">
                            <Icon icon="mdi:pencil-outline" width={14} />
                            Edit
                            <Icon icon="mdi:chevron-down" width={14} className="transition-transform group-open:rotate-180" />
                          </span>
                        </span>
                      </summary>
                      <div className="mt-4 border-t border-[var(--mm-divider)] pt-4">
                        <form action={updatePartnerOffering} className="space-y-5">
                          <input type="hidden" name="id" value={partner.id} />
                          <input type="hidden" name="offeringId" value={o.id} />
                          <OfferingFields accent={ACCENT} offering={o} />
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="submit" className="mm-btn mm-btn-primary text-sm">
                              <Icon icon="mdi:content-save-outline" width={16} /> Save
                            </button>
                          </div>
                        </form>
                        <form action={removePartnerOffering} className="mt-3">
                          <input type="hidden" name="id" value={partner.id} />
                          <input type="hidden" name="offeringId" value={o.id} />
                          <ConfirmButton
                            label="Remove"
                            confirmLabel="Remove it"
                            icon="mdi:trash-can-outline"
                            title={`Remove "${o.name}"?`}
                            body="Hiding it keeps it here for later; removing does not."
                            className="mm-btn mm-btn-ghost text-sm text-[var(--mm-danger)]"
                          />
                        </form>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "team" && (
        <div className="space-y-6">
          {sp.invited && (
            <div className="mm-glass border-[var(--mm-live)] p-4">
              <p className="flex items-center gap-2 text-sm text-[var(--mm-live)]">
                <Icon icon="mdi:check-circle-outline" width={18} />
                Invitation created
              </p>
              <p className="mt-1 text-sm text-[var(--mm-text-dim)]">
                Send them this link — it&apos;s the only copy. If mail is set up
                they&apos;ve also been emailed.
              </p>
              <div className="mt-3">
                <CopyLink url={inviteUrl(sp.invited)} />
              </div>
            </div>
          )}

          <FormCard title="Add someone" icon="mdi:account-plus-outline" accent={ACCENT}>
            <form action={invitePartnerMemberAsAdmin} className="space-y-5">
              <input type="hidden" name="id" value={partner.id} />
              <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                <TextField
                  name="email"
                  label="Email"
                  hint="optional"
                  icon="mdi:email-outline"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="someone@example.com"
                  description="An existing account is added on the spot. Anyone else gets an invitation link. Leave empty for a link you hand over yourself."
                />
                <PickerField
                  name="role"
                  label="Role"
                  icon="mdi:key-variant"
                  defaultValue="manager"
                  options={[
                    { value: "manager", label: "Manager", hint: "Edits the page, products and gallery.", icon: "mdi:pencil-outline" },
                    { value: "owner", label: "Owner", hint: "Everything a manager can, plus the team.", icon: "mdi:key-variant" },
                  ]}
                />
              </div>
              <button type="submit" className="mm-btn mm-btn-primary">
                <Icon icon="mdi:account-plus-outline" width={16} /> Add
              </button>
            </form>
          </FormCard>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
              Team{" "}
              <span className="text-sm text-[var(--mm-text-dim)]">({members.length})</span>
            </h2>
            {members.length === 0 ? (
              <p className="text-sm text-[var(--mm-text-dim)]">
                Nobody manages this stall yet. Only admins can edit it until someone does.
              </p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => {
                  const isLastOwner = m.role === "owner" && ownerCount <= 1;
                  return (
                    <li key={m.userId} className="mm-glass flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {m.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={m.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]">
                            <Icon icon="mdi:account" width={18} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm">{m.name ?? m.email ?? "Unnamed account"}</p>
                          <p className="truncate text-xs text-[var(--mm-text-dim)]">
                            {m.email ?? "no email"} · since {m.since}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          color={m.role === "owner" ? "var(--mm-violet)" : "var(--mm-text-dim)"}
                          icon={m.role === "owner" ? "mdi:key-variant" : "mdi:pencil-outline"}
                        >
                          {m.role === "owner" ? "Owner" : "Manager"}
                        </Badge>
                        <form action={setPartnerMemberRoleAsAdmin}>
                          <input type="hidden" name="id" value={partner.id} />
                          <input type="hidden" name="userId" value={m.userId} />
                          <input type="hidden" name="role" value={m.role === "owner" ? "manager" : "owner"} />
                          <button
                            className="mm-btn mm-btn-ghost text-xs disabled:opacity-40"
                            disabled={isLastOwner}
                            title={isLastOwner ? "The only owner — make someone else an owner first" : undefined}
                          >
                            Make {m.role === "owner" ? "manager" : "owner"}
                          </button>
                        </form>
                        <form action={removePartnerMemberAsAdmin}>
                          <input type="hidden" name="id" value={partner.id} />
                          <input type="hidden" name="userId" value={m.userId} />
                          <ConfirmButton
                            label="Remove"
                            confirmLabel="Remove from team"
                            icon="mdi:account-minus-outline"
                            title={`Remove ${m.name ?? m.email ?? "this person"}?`}
                            body="They lose access to this stall in the hub. Their account is untouched."
                            className="mm-btn mm-btn-ghost text-xs"
                          />
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {invites.length > 0 && (
            <section>
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
                Invitations{" "}
                <span className="text-sm text-[var(--mm-text-dim)]">({pendingInvites.length} open)</span>
              </h2>
              <ul className="space-y-2">
                {invites.map((inv) => {
                  const open = inv.status === "pending" && !inv.expired;
                  return (
                    <li key={inv.id} className="mm-glass flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {inv.email ?? "Link-only invitation"}
                        </p>
                        <p className="text-xs text-[var(--mm-text-dim)]">
                          {inv.role === "owner" ? "Owner" : "Manager"} · sent {inv.createdAt}
                          {inv.inviterName ? ` by ${inv.inviterName}` : ""}
                          {open ? ` · expires ${inv.expiresAt}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          color={
                            open
                              ? "var(--mm-gold)"
                              : inv.status === "accepted"
                                ? "var(--mm-live)"
                                : "var(--mm-text-dim)"
                          }
                        >
                          {open ? "Open" : inv.status === "accepted" ? "Accepted" : inv.expired && inv.status === "pending" ? "Expired" : "Revoked"}
                        </Badge>
                        {open && (
                          <form action={revokePartnerInviteAsAdmin}>
                            <input type="hidden" name="id" value={partner.id} />
                            <input type="hidden" name="inviteId" value={inv.id} />
                            <button className="mm-btn mm-btn-ghost text-xs">Revoke</button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === "advanced" && (
        <section className="mm-glass p-6" style={{ borderColor: "var(--mm-danger)" }}>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-[var(--mm-danger)]">
            <Icon icon="mdi:alert-outline" width={20} />
            Delete this partner
          </h2>
          <p className="mt-2 text-sm text-[var(--mm-text-dim)]">
            Removes the page, its gallery, products, team and open invitations.
            There is no undo. Unlisting is almost always the better move — the
            page stays, and you can put it back later.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--mm-text-dim)]">
            <li>· {gallery.length} {gallery.length === 1 ? "photo" : "photos"} and {offerings.length} {offerings.length === 1 ? "product" : "products"} go with it.</li>
            <li>· {members.length} {members.length === 1 ? "person loses" : "people lose"} access; their accounts stay.</li>
            <li>· Events hosted here and quest stands at this stall are kept, with the partner link cleared.</li>
          </ul>
          <form action={deletePartner} className="mt-5">
            <input type="hidden" name="id" value={partner.id} />
            <ConfirmButton
              label="Delete partner"
              confirmLabel="Delete permanently"
              icon="mdi:trash-can-outline"
              title={`Delete "${partner.businessName}"?`}
              body="This cannot be undone. The page, gallery, products and team go with it."
              className="mm-btn mm-btn-ghost text-sm text-[var(--mm-danger)]"
            />
          </form>
        </section>
      )}
    </div>
  );
}

/** The fields an offering has, shared by add and edit. */
function OfferingFields({
  accent,
  offering,
}: {
  accent: string;
  offering?: {
    name: string;
    description: string | null;
    kind: "product" | "service";
    priceCents: number | null;
    currency: string;
    externalUrl: string | null;
    imageUrl: string | null;
    active: boolean;
  };
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <TextField
          name="name"
          label="Name"
          icon="mdi:tag-outline"
          required
          maxLength={160}
          defaultValue={offering?.name ?? ""}
          placeholder="e.g. Hand-bound sketchbook"
        />
        <PickerField
          name="kind"
          label="Kind"
          icon="mdi:shape-outline"
          defaultValue={offering?.kind ?? "product"}
          options={[
            { value: "product", label: "Product", icon: "mdi:tag-outline" },
            { value: "service", label: "Service", icon: "mdi:hand-heart-outline" },
          ]}
        />
      </div>
      <TextareaField
        name="description"
        label="Description"
        hint="optional"
        icon="mdi:text-short"
        rows={2}
        maxLength={1000}
        defaultValue={offering?.description ?? ""}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          name="price"
          label="Price"
          hint="optional"
          icon="mdi:cash"
          inputMode="decimal"
          defaultValue={
            offering?.priceCents != null ? (offering.priceCents / 100).toFixed(2) : ""
          }
          placeholder="120.00"
        />
        <TextField
          name="currency"
          label="Currency"
          icon="mdi:currency-usd"
          maxLength={3}
          defaultValue={offering?.currency ?? "ZAR"}
          className="uppercase"
        />
        <TextField
          name="externalUrl"
          label="Buy link"
          hint="optional"
          icon="mdi:open-in-new"
          type="url"
          inputMode="url"
          defaultValue={offering?.externalUrl ?? ""}
          placeholder="https://…"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ImageUploader
          name="image"
          entityType="partner_gallery"
          maxFiles={1}
          accent={accent}
          label={offering?.imageUrl ? "Replace image" : "Image"}
          description="One, optional"
        />
        <div className="space-y-3">
          {offering && (
            <CheckboxField
              name="active"
              icon="mdi:eye-outline"
              label="Shown on the public page"
              defaultChecked={offering.active}
            />
          )}
          {offering?.imageUrl && (
            <CheckboxField
              name="clearImage"
              icon="mdi:image-remove-outline"
              label="Remove the image"
            />
          )}
        </div>
      </div>
    </>
  );
}
