"use client";

import { RouteError } from "@/components/route-states";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-6 py-24">
      <RouteError {...props} area="/" areaLabel="Back to the hall" />
    </div>
  );
}
