"use client";

import { Icon as IconifyIcon } from "@iconify/react";

export function Icon({
  icon,
  className,
  width = 20,
  style,
}: {
  icon: string;
  className?: string;
  width?: number;
  style?: React.CSSProperties;
}) {
  return (
    <IconifyIcon
      icon={icon}
      className={className}
      width={width}
      height={width}
      style={style}
      aria-hidden="true"
    />
  );
}
