import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Biome owns formatting, imports and most lint. ESLint is here for the two
// things Biome does not do: the React hooks rules and type-aware checks.
export default tseslint.config(
  { ignores: ["dist", "target", "src-tauri", "crates", "node_modules", "playwright-report"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      // An async function with no await is how a synchronous throw becomes a
      // rejection, which the Backend contract requires of every method.
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    },
  },
  {
    files: ["eslint.config.js"],
    ...tseslint.configs.disableTypeChecked,
  },
);
