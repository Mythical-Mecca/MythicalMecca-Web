"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./icon";

/**
 * Generic "go back" pill — steps back through history when possible, otherwise
 * routes to a sensible fallback. Use inside content areas across every shell
 * (public / app / admin / partner). For the dashboard-specific pill, use
 * `BackToDashboard` instead.
 */
export function PageBack({
  fallback = "/dashboard",
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
