import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
    // Ambient Deno declarations used only by `pnpm verify:functions`, which
    // type-checks supabase/functions with tsc (they are excluded from the app
    // tsconfig because they run on Deno).
    "deno-edge-shim.d.ts",
    // Generated test artifacts (Playwright bundles its tracing UI as minified
    // JS; linting third-party bundles produces hundreds of false errors).
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
