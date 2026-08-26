import { notFound } from "next/navigation";
import { getPartnerForHub, listOfferings } from "@/lib/partner";
import { addOffering, removeOffering, updateOfferingState } from "../../../actions";
import { ImageUploader } from "@/components/image-uploader";
import { TextField, TextareaField, FormCard } from "@/components/form";
import { PickerField } from "@/components/picker-field";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/badge";
import { Flash } from "@/components/flash";
import { formatPrice } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const partner = await getPartnerForHub(partnerId);
  return { title: `${partner?.businessName ?? "Stall"} · Offerings` };
}

export default async function StallOfferingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  // Access is already enforced by the [partnerId] layout.
  const { partnerId } = await params;
  const partner = await getPartnerForHub(partnerId);
  if (!partner) notFound();
  const offerings = await listOfferings(partner.id);
  const { saved, error } = await searchParams;

  return (
    <div className="max-w-3xl space-y-6">
      {saved && <Flash>Offerings updated.</Flash>}
      {error && (
        <Flash tone="error">
          Could not save — check the name, price and link.
        </Flash>
      )}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
          Products &amp; services{" "}
          <span className="text-sm text-[var(--mm-text-dim)]">
            ({offerings.length})
          </span>
        </h2>
        {offerings.length === 0 ? (
          <p className="text-sm text-[var(--mm-text-dim)]">
            Nothing listed yet. Add your first below.
          </p>
        ) : (
          <div className="space-y-2">
            {offerings.map((o) => {
              const price = formatPrice(o.priceCents, o.currency);
              return (
                <div
                  key={o.id}
                  className="mm-glass flex flex-wrap items-center gap-3 p-4"
                >
                  {o.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={o.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[var(--mm-elevated)] text-[var(--mm-text-dim)]">
                      <Icon
                        icon={
                          o.kind === "service"
                            ? "mdi:hand-heart-outline"
                            : "mdi:package-variant"
                        }
                        width={22}
                      />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{o.name}</p>
                    <p className="truncate text-xs text-[var(--mm-text-dim)]">
                      {price ?? "Price on request"}
                      {o.description ? ` · ${o.description}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      color={
                        o.kind === "service"
                          ? "var(--mm-violet)"
                          : "var(--mm-gold)"
                      }
                    >
                      {o.kind === "service" ? "Service" : "Product"}
                    </Badge>
                    {!o.active && (
                      <Badge color="var(--mm-text-dim)">Hidden</Badge>
                    )}
                    <form action={updateOfferingState}>
                      <input type="hidden" name="partnerId" value={partner.id} />
                      <input type="hidden" name="id" value={o.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={o.active ? "0" : "1"}
                      />
                      <button className="mm-btn mm-btn-ghost text-xs">
                        {o.active ? "Hide" : "Show"}
                      </button>
                    </form>
                    <form action={removeOffering}>
                      <input type="hidden" name="partnerId" value={partner.id} />
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        className="mm-btn mm-btn-ghost text-xs"
                        aria-label={`Remove ${o.name}`}
                      >
                        <Icon icon="mdi:close" width={14} />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <FormCard title="Add a product or service" icon="mdi:plus" accent="#E18D01">
        <form action={addOffering} className="space-y-5">
          <input type="hidden" name="partnerId" value={partner.id} />
          <TextField
            name="name"
            label="Name"
            icon="mdi:tag-outline"
            required
            placeholder="e.g. Squad commission"
          />
          <TextareaField
            name="description"
            label="Description"
            hint="optional"
            icon="mdi:text-short"
            rows={3}
            placeholder="What's included?"
          />
          <PickerField
            name="kind"
            label="Kind"
            icon="mdi:shape-outline"
            defaultValue="product"
            options={[
              {
                value: "product",
                label: "Product",
                hint: "Something you sell and ship.",
              },
              {
                value: "service",
                label: "Service",
                hint: "Commissions, workshops, repairs.",
              },
            ]}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="price"
              label="Price"
              hint="leave blank for 'on request'"
              icon="mdi:cash"
              placeholder="450"
            />
            <TextField
              name="currency"
              label="Currency"
              icon="mdi:earth"
              defaultValue="ZAR"
              placeholder="ZAR"
            />
          </div>
          <TextField
            name="externalUrl"
            label="Buy link"
            hint="optional"
            icon="mdi:open-in-new"
            type="url"
            placeholder="https://yourshop.example/item"
          />
          <ImageUploader
            name="image"
            entityType="partner_gallery"
            maxFiles={1}
            accent="#E18D01"
            label="Photo"
            description="Optional — one image"
          />
          <button type="submit" className="mm-btn mm-btn-primary">
            <Icon icon="mdi:plus" width={16} /> Add
          </button>
        </form>
      </FormCard>
    </div>
  );
}
