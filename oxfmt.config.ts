import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "README.md",
    "components/ui/**",
    "components/ai-elements/**",
    "hooks/use-mobile.ts",
  ],
});
