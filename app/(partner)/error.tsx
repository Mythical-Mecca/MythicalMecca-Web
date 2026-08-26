"use client";

import { RouteError } from "@/components/route-states";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError {...props} area="/partner-hub" areaLabel="Back to your hub" />
  );
}
