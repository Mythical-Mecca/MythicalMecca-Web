"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./icon";

/**
 * Generic "go back" pill — steps back through history when possible, otherwise
 * routes to a sensible fallback. Use inside content areas across every shell
 * (public / apply / admin / partner).
 */
export function PageBack({
  fallback = "/",
  label = "Back",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className="mm-back"
      aria-label={label}
    >
      <Icon icon="mdi:arrow-left" width={16} className="mm-back-arrow" />
      <span>{label}</span>
    </button>
  );
}
