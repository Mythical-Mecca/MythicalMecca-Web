import { Icon } from "@/components/icon";

/** Presentational gold stars — `value` out of `max` (default 5). */
export function StarRating({
  value,
  max = 5,
  width = 16,
  className,
}: {
  value: number;
  max?: number;
  width?: number;
  className?: string;
}) {
  const filled = Math.round(value);
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className ?? ""}`}
      role="img"
      aria-label={`${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => (
        <Icon
          key={i}
          icon={i < filled ? "mdi:star" : "mdi:star-outline"}
          width={width}
          className="text-[var(--mm-gold)]"
        />
      ))}
    </span>
  );
}
