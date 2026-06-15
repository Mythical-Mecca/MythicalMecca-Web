"use client";

import { useEffect, useRef, useState } from "react";
import { Field, inputCls } from "./form";

let mapsPromise: Promise<void> | null = null;

function loadMaps(key: string): Promise<void> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { google?: { maps?: { places?: unknown } } };
    if (w.google?.maps?.places) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export function LocationField({ defaultValue = "" }: { defaultValue?: string }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const inputRef = useRef<HTMLInputElement>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    if (!key || !inputRef.current) return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let ac: any;
    loadMaps(key)
      .then(() => {
        const g = (window as any).google;
        if (!g?.maps?.places || !inputRef.current) return;
        ac = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry"],
        });
        ac.addListener("place_changed", () => {
          const p = ac.getPlace();
          if (p.geometry?.location) {
            setLat(String(p.geometry.location.lat()));
            setLng(String(p.geometry.location.lng()));
          }
        });
      })
      .catch(() => {});
    return () => {
      if (ac && (window as any).google) {
        (window as any).google.maps.event.clearInstanceListeners(ac);
      }
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [key]);

  return (
    <Field
      label="Location"
      icon="mdi:map-marker"
      description={
        key
          ? "Search an address — powered by Google Maps."
          : "Where it's happening (a venue, address, or “Online”)."
      }
    >
      <input
        ref={inputRef}
        name="location"
        defaultValue={defaultValue}
        placeholder="Search a place or address…"
        className={inputCls}
        autoComplete="off"
      />
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
    </Field>
  );
}
