"use client";

import { RouteError } from "@/components/route-states";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} area="/admin" areaLabel="Back to admin" />;
}
