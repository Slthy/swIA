import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // Device-local time and installability are browser-only values; hydrate them after mount.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  globalIgnores([".next/**", "node_modules/**", "coverage/**", "next-env.d.ts", "public/sw.js"]),
]);
