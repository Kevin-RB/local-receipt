import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, next, vitest, shadcn],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "README.md",
    "components/ui/**",
    "hooks/use-mobile.ts",
  ],
  jsPlugins: shadcn.jsPlugins,
});
