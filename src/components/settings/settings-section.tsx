import type { ReactNode } from "react";
import type { SectionInfo } from "@/components/settings/settings-constants";
import { cn } from "@/lib/cn";

interface SettingsSectionProps {
  section: SectionInfo;
  className?: string;
  children: ReactNode;
}

/** One headed block of the settings page, and the target of its section link. */
export function SettingsSection({ section, className, children }: SettingsSectionProps) {
  const headingId = `${section.id}-heading`;

  return (
    <section
      id={section.id}
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-4 border-border border-b pb-6 last:border-b-0", className)}
    >
      <h3 id={headingId} className="font-semibold text-lg">
        {section.title}
      </h3>
      {children}
    </section>
  );
}
