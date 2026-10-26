// Builds the static web bundle that ships inside the Android APK.
// Uses the exact same React components as the Next.js app so both stay in sync.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";

const outDir = "apk-web/dist";

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log("› tailwind");
execFileSync(
  "npx",
  ["@tailwindcss/cli", "-i", "apk-web/styles.css", "-o", `${outDir}/styles.css`, "--minify"],
  { stdio: "inherit" },
);

console.log("› esbuild");
await build({
  entryPoints: ["apk-web/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: `${outDir}/main.js`,
  jsx: "automatic",
  tsconfig: "tsconfig.json",
  alias: { "@": "./src" },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".png": "dataurl", ".svg": "dataurl", ".woff2": "file" },
  logLevel: "info",
});

console.log("› html");
copyFileSync("apk-web/index.html", `${outDir}/index.html`);
console.log("✔ apk web bundle ready in", outDir);
