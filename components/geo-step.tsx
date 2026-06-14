"use client";

import { useState } from "react";
import { completeStep } from "@/app/(app)/hunts/actions";

export function GeoStep({
  huntSlug,
  stepId,
}: {
  huntSlug: string;
  stepId: string;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function locate() {
    setBusy(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation unavailable.");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(false);
      },
      () => {
        setError("Could not get your position.");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        className="mm-btn mm-btn-ghost text-sm"
      >
        {busy ? "Locating…" : coords ? "Re-acquire position" : "Get my position"}
      </button>
      {error && <p className="text-sm text-[var(--mm-danger)]">{error}</p>}
      {coords && (
        <form action={completeStep} className="flex items-center gap-3">
          <input type="hidden" name="huntSlug" value={huntSlug} />
          <input type="hidden" name="stepId" value={stepId} />
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
          <span className="text-xs text-[var(--mm-text-dim)]">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
          <button className="mm-btn mm-btn-primary text-sm">Check in</button>
        </form>
      )}
    </div>
  );
}
