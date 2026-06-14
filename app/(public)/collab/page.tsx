import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { collabSubmissions } from "@/lib/db/schema";
import { logActivity } from "@/lib/logging";

export const metadata = { title: "Collab — Mythic Mecha" };

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  org: z.string().max(160).optional(),
  message: z.string().min(10).max(4000),
});

async function submitBeacon(formData: FormData) {
  "use server";
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    org: formData.get("org") || undefined,
    message: formData.get("message"),
  });
  if (!parsed.success) redirect("/collab?error=1");

  const data = parsed.data;
  if (process.env.DATABASE_URL) {
    try {
      await db.insert(collabSubmissions).values({
        name: data.name,
        email: data.email,
        org: data.org,
        message: data.message,
      });
    } catch {
      redirect("/collab?error=1");
    }
  }
  await logActivity({ action: "collab.submit", metadata: { email: data.email } });
  redirect("/collab?sent=1");
}

export default async function CollabPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Send a <span className="mm-gradient-text">raven</span>
      </h1>
      <p className="mt-3 text-[var(--mm-text-dim)]">
        Want to collaborate, sponsor, host, or propose something? Send a raven to
        the Keep and we&apos;ll write back.
      </p>

      {sent && (
        <div className="mm-glass mt-6 border-[var(--mm-live)] p-4 text-sm text-[var(--mm-live)]">
          Your raven was received. The Keep will be in touch.
        </div>
      )}
      {error && (
        <div className="mm-glass mt-6 border-[var(--mm-danger)] p-4 text-sm text-[var(--mm-danger)]">
          The raven didn&apos;t make it — check your inputs and try again.
        </div>
      )}

      <form action={submitBeacon} className="mt-8 space-y-5">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Guild / organisation (optional)" name="org" />
        <div>
          <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
            Message
          </label>
          <textarea
            name="message"
            required
            rows={5}
            className="w-full rounded-2xl border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--mm-violet)]"
          />
        </div>
        <button type="submit" className="mm-btn mm-btn-primary">
          Send the raven
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-[var(--mm-text-dim)]">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--mm-violet)]"
      />
    </div>
  );
}
