import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
        Mech <span className="mm-gradient-text">loadout</span>
      </h1>

      <div className="mm-glass max-w-md p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--mm-text-dim)]">Callsign</dt>
            <dd>{user?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--mm-text-dim)]">Comms</dt>
            <dd>{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--mm-text-dim)]">Clearance</dt>
            <dd className="uppercase tracking-widest text-[var(--mm-gold)]">
              {user?.role ?? "member"}
            </dd>
          </div>
        </dl>
      </div>

      <p className="text-sm text-[var(--mm-text-dim)]">
        Profile editing, avatar upload, division select, badges and the vendor
        application arrive in Phase 2.
      </p>
    </div>
  );
}
