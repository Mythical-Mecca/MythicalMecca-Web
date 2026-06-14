"use client";

import { Icon as IconifyIcon } from "@iconify/react";

export function Icon({
  icon,
  className,
  width = 20,
}: {
  icon: string;
  className?: string;
  width?: number;
}) {
  return (
    <IconifyIcon
      icon={icon}
      className={className}
      width={width}
      height={width}
      aria-hidden="true"
    />
  );
}
