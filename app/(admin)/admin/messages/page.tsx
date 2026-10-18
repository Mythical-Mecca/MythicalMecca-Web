import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { collabSubmissions } from "@/lib/db/schema";
import { PageHeading } from "@/components/page-heading";
import { Icon } from "@/components/icon";

export const metadata = { title: "Contact Inquiries · Admin" };

export default async function AdminMessagesPage() {
  const useDb = !!process.env.DATABASE_URL;
  let messages: (typeof collabSubmissions.$inferSelect)[] = [];

  if (useDb) {
    try {
      messages = await db
        .select()
        .from(collabSubmissions)
        .orderBy(desc(collabSubmissions.createdAt));
    } catch (err) {
      console.error("Failed to load collab submissions:", err);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        size="md"
        title="Contact Messages"
        subtitle="Inquiries submitted through the public Contact Us form."
        icon="mdi:email-outline"
        accent="#5865F2"
      />

      {/* Resend Notice banner */}
      <div className="mm-glass rounded-xl border border-[color-mix(in_srgb,var(--mm-gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--mm-gold)_8%,transparent)] p-4 text-xs text-[var(--mm-text-dim)]">
        <div className="flex items-start gap-2.5">
          <Icon icon="mdi:information-outline" width={18} className="mt-0.5 shrink-0 text-[var(--mm-gold)]" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Email Inbox Forwarding:</p>
            <p>
              All messages submitted on the website are recorded here in real-time. To also forward copies directly into your Google Workspace email inbox (<strong>information@mythical-mecca.com</strong>), set your <code className="text-[var(--mm-gold)] font-mono">RESEND_API_KEY</code> in your Vercel Environment Variables.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
          <span>Inquiries</span>
          <span className="rounded-full bg-[var(--mm-elevated)] px-2 py-0.5 text-xs text-[var(--mm-text-dim)]">
            {messages.length}
          </span>
        </h2>

        {messages.length === 0 ? (
          <div className="mm-glass flex flex-col items-center justify-center rounded-2xl p-12 text-center text-sm text-[var(--mm-text-dim)]">
            <Icon icon="mdi:email-open-outline" width={36} className="text-[var(--mm-border)]" />
            <p className="mt-3">No contact inquiries received yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="mm-glass mm-panel rounded-2xl p-5 transition hover:border-[color-mix(in_srgb,var(--mm-border)_80%,transparent)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--mm-divider)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-display)] text-base font-semibold text-white">
                      {m.name}
                    </span>
                    {m.org && (
                      <span className="rounded-md bg-[var(--mm-elevated)] px-2 py-0.5 text-xs text-[var(--mm-text-dim)]">
                        {m.org}
                      </span>
                    )}
                    {m.spam && (
                      <span className="rounded-md bg-red-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400 border border-red-800/50">
                        Quarantined
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--mm-text-dim)]">
                    {new Date(m.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--mm-text)]">
                    {m.message}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--mm-divider)]">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--mm-text-dim)]">
                    <Icon icon="mdi:email-outline" width={14} />
                    <span className="font-mono text-white select-all">{m.email}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(
                        "Re: Mythical Mecca Inquiry"
                      )}`}
                      className="mm-btn mm-btn-primary text-xs"
                    >
                      <Icon icon="mdi:reply" width={14} />
                      <span>Reply to {m.name}</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
