import { useState } from "react";
import { cn } from "@/lib/cn";

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** A whole-number step also means only whole numbers are accepted. */
  step?: number;
  onCommit: (value: number) => void;
  className?: string;
}

/**
 * A number setting that applies as soon as what is typed is within its limits.
 * The half-typed text is kept locally: committing "1" on the way to "18" would
 * be rejected by settings validation and snap the field to its default.
 */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
  className,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-muted text-sm">
        {label} ({min} to {max})
      </span>
      <input
        type="number"
        className="ks-input w-28"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = event.target.valueAsNumber;
          const whole = !Number.isInteger(step) || Number.isInteger(next);
          if (Number.isFinite(next) && next >= min && next <= max && whole) onCommit(next);
        }}
        // Leaving the field with something out of range puts back the value in use.
        onBlur={() => setDraft(String(value))}
      />
    </label>
  );
}
