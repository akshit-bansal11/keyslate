import { cn } from "@/lib/cn";

interface ChoiceGroupProps<T extends string> {
  legend: string;
  /** Radio group name; unique within the dialog. */
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

/** A small set of exclusive options as native radio buttons. */
export function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-1 text-muted text-sm">{legend}</legend>
      <div className="flex flex-wrap gap-x-5">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 py-1">
            <input
              type="radio"
              name={name}
              className="accent-accent"
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
