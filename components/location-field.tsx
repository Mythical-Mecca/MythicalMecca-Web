"use client";

import { useEffect, useRef, useState } from "react";
import { Field, inputCls } from "./form";
import { Icon } from "./icon";

let mapsPromise: Promise<void> | null = null;

/* eslint-disable @typescript-eslint/no-explicit-any */
function loadMaps(key: string): Promise<void> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const g = (window as any).google;
    if (g?.maps?.importLibrary) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Enough of a dark style to sit inside the app's panels. Deliberately quiet:
 * the preview exists to confirm "yes, that's the right spot", not to be read
 * like a map.
 */
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a2238" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa3bd" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b0f1c" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#27304d" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1526" }] },
];

interface Suggestion {
  id: string;
  main: string;
  secondary: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  prediction: any;
}

/**
 * Location input with Places autocomplete and a map preview.
 *
 * Suggestions come from `AutocompleteSuggestion.fetchAutocompleteSuggestions`
 * and are rendered into our own list rather than Google's widget, for two
 * reasons. The legacy `places.Autocomplete` widget is closed to projects
 * created after March 2025 — it constructs without error and then silently
 * never attaches, which is exactly how it failed here. And its replacement,
 * `PlaceAutocompleteElement`, brings its own shadow-DOM input, which can't
 * hold a free-typed value like "Online" and can't be styled to match anything
 * around it.
 *
 * So the text input stays ours and stays free-text; the suggestions merely
 * fill it in. Typing an address Google has never heard of still works.
 *
 * The coordinates matter more than they look: a quest's venue check measures
 * from them, so a location that reads correctly but sits on the wrong side of
 * the city fails silently on the day, at the stand, in front of a queue. The
 * preview square is there to make that visible while it's still cheap to fix.
 */
export function LocationField({
  defaultValue = "",
  defaultLat = null,
  defaultLng = null,
  label = "Location",
}: {
  defaultValue?: string;
  /** Existing coordinates. Submitted unchanged unless a new place is picked,
   *  so opening a saved record and pressing Save doesn't wipe them. */
  defaultLat?: number | string | null;
  defaultLng?: number | string | null;
  label?: string;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [text, setText] = useState(defaultValue);
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(
    defaultLat != null && defaultLng != null && defaultLat !== "" && defaultLng !== ""
      ? { lat: String(defaultLat), lng: String(defaultLng) }
      : null
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tokenRef = useRef<any>(null);
  /** Guards against a slow response for an older query overwriting a newer one. */
  const queryIdRef = useRef(0);
  /**
   * Picking a suggestion rewrites the input with the chosen address, which
   * looks to the search effect exactly like typing — so without this it
   * immediately searches for what you just picked, re-opening the list over
   * the result and burning a billed request and a fresh session token.
   */
  const skipSearchRef = useRef(false);

  // ---- suggestions ---------------------------------------------------------
  useEffect(() => {
    if (!key || failed) return;
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const q = text.trim();
    // Too short to search. Clearing the list is the onChange handler's job —
    // an effect that sets state as its first act just re-renders on arrival.
    if (q.length < 3) return;

    const id = ++queryIdRef.current;
    // Debounced: this fires per keystroke, and each call is billed.
    const timer = setTimeout(async () => {
      try {
        await loadMaps(key);
        const g = (window as any).google;
        const places = await g?.maps?.importLibrary?.("places");
        if (!places?.AutocompleteSuggestion) return;
        if (!tokenRef.current) {
          tokenRef.current = new places.AutocompleteSessionToken();
        }
        setBusy(true);
        const { suggestions: found } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: q,
            sessionToken: tokenRef.current,
          });
        if (id !== queryIdRef.current) return;
        setSuggestions(
          (found ?? [])
            .filter((s: any) => s.placePrediction)
            .slice(0, 6)
            .map((s: any) => ({
              id: s.placePrediction.placeId,
              main:
                s.placePrediction.mainText?.toString() ??
                s.placePrediction.text.toString(),
              secondary: s.placePrediction.secondaryText?.toString() ?? "",
              prediction: s.placePrediction,
            }))
        );
        setActiveIndex(-1);
      } catch {
        // Key missing a Places grant, quota, offline — the field still works
        // as a plain text box, which is the important part.
        setFailed(true);
        setSuggestions([]);
      } finally {
        if (id === queryIdRef.current) setBusy(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [text, key, failed]);

  const choose = async (s: Suggestion) => {
    setSuggestions([]);
    setActiveIndex(-1);
    skipSearchRef.current = true;
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "location"] });
      setText(place.formattedAddress ?? `${s.main}${s.secondary ? `, ${s.secondary}` : ""}`);
      if (place.location) {
        setCoords({
          lat: String(place.location.lat()),
          lng: String(place.location.lng()),
        });
      }
    } catch {
      // Couldn't resolve details — keep the label, leave coordinates alone.
      setText(`${s.main}${s.secondary ? `, ${s.secondary}` : ""}`);
    } finally {
      // A session ends at the selection; the next search starts a new one.
      tokenRef.current = null;
    }
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Clicking anywhere else dismisses the list.
  useEffect(() => {
    if (suggestions.length === 0) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [suggestions.length]);

  // ---- preview map ---------------------------------------------------------
  const mapRef = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mapObj = useRef<any>(null);
  const lat = coords?.lat;
  const lng = coords?.lng;

  useEffect(() => {
    if (!key || !lat || !lng || !mapRef.current) return;
    let cancelled = false;
    loadMaps(key)
      .then(async () => {
        const g = (window as any).google;
        await g?.maps?.importLibrary?.("maps");
        if (cancelled || !mapRef.current || !g?.maps?.Map) return;
        const center = { lat: Number(lat), lng: Number(lng) };
        if (Number.isNaN(center.lat) || Number.isNaN(center.lng)) return;
        if (mapObj.current) {
          mapObj.current.setCenter(center);
          return;
        }
        mapObj.current = new g.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          // A preview, not a map you drive: no controls, no panning, no POI
          // click targets to swallow the pointer.
          disableDefaultUI: true,
          gestureHandling: "none",
          keyboardShortcuts: false,
          clickableIcons: false,
          styles: DARK_MAP_STYLE,
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [key, lat, lng]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const open = suggestions.length > 0;

  return (
    <div className="space-y-3">
      <div ref={wrapRef} className="relative">
        <Field
          label={label}
          icon="mdi:map-marker"
          description={
            key && !failed
              ? "Start typing to search — powered by Google Maps. Free text is fine too."
              : "Where it's happening (a venue, address, or “Online”)."
          }
        >
          <input
            name="location"
            value={text}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setText(v);
              if (v.trim().length < 3) setSuggestions([]);
            }}
            onKeyDown={(e) => {
              if (!open) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % suggestions.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex(
                  (i) => (i - 1 + suggestions.length) % suggestions.length
                );
              } else if (e.key === "Enter") {
                // Only swallow Enter when a suggestion is actually highlighted,
                // so Enter still submits the form the rest of the time.
                if (activeIndex >= 0) {
                  e.preventDefault();
                  void choose(suggestions[activeIndex]!);
                }
              } else if (e.key === "Escape") {
                setSuggestions([]);
              }
            }}
            placeholder="Search a place or address…"
            className={inputCls}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="location-suggestions"
          />
        </Field>

        {busy && (
          <Icon
            icon="mdi:loading"
            width={15}
            className="mm-gear absolute right-3 top-[2.6rem] text-[var(--mm-text-dim)]"
          />
        )}

        {open && (
          <ul
            id="location-suggestions"
            role="listbox"
            className="mm-pop absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-[var(--mm-border)] bg-[var(--mm-elevated)] shadow-xl"
          >
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => void choose(s)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition ${
                    i === activeIndex ? "bg-[var(--mm-surface)]" : ""
                  }`}
                >
                  <Icon
                    icon="mdi:map-marker-outline"
                    width={15}
                    className="mt-0.5 shrink-0 text-[var(--mm-gold)]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{s.main}</span>
                    {s.secondary && (
                      <span className="block truncate text-xs text-[var(--mm-text-dim)]">
                        {s.secondary}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <input type="hidden" name="lat" value={coords?.lat ?? ""} />
        <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      </div>

      {coords && (
        <div className="flex flex-wrap items-start gap-3">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-[var(--mm-border)] bg-[var(--mm-surface)]">
            <div ref={mapRef} className="absolute inset-0" />
            {/* The map is centred on the place and can't be moved, so the pin
                is simply drawn at the centre — no marker API, no map id, and
                it uses the app's own icon. The nudge up puts the point of the
                pin on the spot rather than its middle. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+7px)]"
            >
              <Icon
                icon="mdi:map-marker"
                width={30}
                className="text-[var(--mm-gold)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]"
              />
            </span>
          </div>

          <div className="min-w-0 text-xs text-[var(--mm-text-dim)]">
            <p className="flex items-center gap-1.5 text-[var(--mm-live)]">
              <Icon icon="mdi:crosshairs-gps" width={14} />
              Coordinates set
            </p>
            <p className="mt-1 font-mono">
              {Number(coords.lat).toFixed(5)}, {Number(coords.lng).toFixed(5)}
            </p>
            <p className="mt-1">Venue check-ins are measured from here.</p>
            <button
              type="button"
              onClick={() => setCoords(null)}
              className="mt-2 inline-flex items-center gap-1 underline underline-offset-2 hover:text-[var(--mm-text)]"
            >
              <Icon icon="mdi:close" width={12} /> Clear coordinates
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p className="text-xs text-[var(--mm-gold)]">
          <Icon icon="mdi:alert-outline" width={13} className="mr-1 inline" />
          Place search is unavailable — you can still type the location, but
          coordinates have to be set by hand.
        </p>
      )}
    </div>
  );
}
