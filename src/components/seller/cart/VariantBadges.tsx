import * as React from "react";

function truncateText(input: string, maxChars: number) {
  if (!input) return input;
  if (input.length <= maxChars) return input;
  return `${input.slice(0, Math.max(0, maxChars - 1))}…`;
}

export type VariantBadgesProps = {
  color?: string | null;
  size?: string | null;
  variantAttributes?: Record<string, any> | null;
  /** Max characters per pill before truncating with an ellipsis */
  maxChars?: number;
  /** Layout classes for the wrapper (e.g. "flex gap-1" or "flex flex-col gap-1") */
  className?: string;
  /** Use shorter labels (e.g. omit "Talla:") for tight spaces like thumbnails */
  compact?: boolean;
};

export function VariantBadges({
  color,
  size,
  variantAttributes,
  maxChars = 10,
  className = "flex gap-1 flex-wrap",
  compact = false,
}: VariantBadgesProps) {
  const resolvedColor = color ?? variantAttributes?.color ?? null;
  const resolvedSize =
    size ??
    variantAttributes?.size ??
    variantAttributes?.talla ??
    variantAttributes?.tamaño ??
    null;

  if (!resolvedColor && !resolvedSize) return null;

  const pillBase =
    "inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium leading-none backdrop-blur";

  return (
    <div className={className} aria-label="Variantes seleccionadas">
      {resolvedColor && (
        <span
          className={`${pillBase} bg-muted/80 text-foreground`}
          title={resolvedColor}
        >
          {truncateText(resolvedColor, maxChars)}
        </span>
      )}
      {resolvedSize && (
        <span
          className={`${pillBase} bg-accent/70 text-accent-foreground`}
          title={resolvedSize}
        >
          {compact
            ? truncateText(String(resolvedSize), maxChars)
            : `Talla: ${truncateText(String(resolvedSize), maxChars)}`}
        </span>
      )}
    </div>
  );
}
