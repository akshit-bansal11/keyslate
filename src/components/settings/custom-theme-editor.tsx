import { Check, TriangleAlert } from "lucide-react";
import { COLOR_ROLES, SCHEME_LABEL } from "@/components/settings/settings-constants";
import { cn } from "@/lib/cn";
import type { Theme } from "@/lib/settings/settings-schema";
import { themeContrastIssues } from "@/lib/themes/contrast";
import { deleteCustomTheme, updateCustomTheme } from "@/lib/themes/custom-themes";

interface CustomThemeEditorProps {
  theme: Theme;
  className?: string;
}

/** Edits one of the user's own themes. Every change is applied and saved as it is made. */
export function CustomThemeEditor({ theme, className }: CustomThemeEditorProps) {
  const issues = themeContrastIssues(theme);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap gap-4">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-muted text-sm">Theme name</span>
          {/* Uncontrolled: an empty name is not a valid theme, so it is never stored while typing. */}
          <input
            type="text"
            className="ks-input"
            defaultValue={theme.name}
            maxLength={40}
            required
            onChange={(event) => {
              const name = event.target.value.trim();
              if (name) updateCustomTheme(theme.id, { name });
            }}
            onBlur={(event) => {
              if (!event.target.value.trim()) event.target.value = theme.name;
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted text-sm">Kind</span>
          <select
            className="ks-input"
            value={theme.scheme}
            onChange={(event) =>
              updateCustomTheme(theme.id, {
                scheme: event.target.value === "light" ? "light" : "dark",
              })
            }
          >
            <option value="dark">{SCHEME_LABEL.dark}</option>
            <option value="light">{SCHEME_LABEL.light}</option>
          </select>
        </label>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-1 text-muted text-sm">Colours</legend>
        <div className="grid gap-x-4 md:grid-cols-2">
          {COLOR_ROLES.map(({ role, label }) => (
            <label key={role} className="flex items-center gap-2 py-1">
              <input
                type="color"
                className="h-7 w-10 shrink-0"
                value={theme.colors[role]}
                onChange={(event) =>
                  updateCustomTheme(theme.id, {
                    colors: { ...theme.colors, [role]: event.target.value },
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div role="status" aria-live="polite" className="flex flex-col gap-1 text-sm">
        {issues.length === 0 ? (
          <p className="flex items-center gap-1.5">
            <Check aria-hidden="true" focusable="false" className="size-4 shrink-0" />
            Every colour pair meets its contrast target.
          </p>
        ) : (
          <>
            <p className="flex items-center gap-1.5">
              <TriangleAlert aria-hidden="true" focusable="false" className="size-4 shrink-0" />
              Some pairs are hard to read. The theme still works; adjust these when you can.
            </p>
            <ul className="selectable list-disc pl-6 text-muted">
              {issues.map((issue) => (
                <li key={issue}>{issue}.</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <button
          type="button"
          className="ks-button border-danger text-danger"
          onClick={() => void deleteCustomTheme(theme.id)}
        >
          Delete this theme
        </button>
      </div>
    </div>
  );
}
