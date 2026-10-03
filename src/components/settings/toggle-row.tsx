import { cn } from "@/lib/cn";

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

/** An on/off setting as a native checkbox. */
export function ToggleRow({ label, checked, onChange, className }: ToggleRowProps) {
  return (
    <label className={cn("flex items-center gap-2 py-1", className)}>
      <input
        type="checkbox"
        className="accent-accent"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
