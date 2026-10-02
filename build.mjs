// node build.mjs  → crea la cartella docs/ pronta da pubblicare (GitHub Pages)
import { build } from "esbuild";
import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";

const OUT = "docs";
rmSync(OUT, { recursive: true, force: true });
cpSync("public", OUT, { recursive: true });

await build({
  entryPoints: { app: "src/main.js" },
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: ["es2020"],
  outdir: OUT,
  chunkNames: "chunks/[name]-[hash]",
  logLevel: "warning",
});

// Versione nel service worker + precache dei pezzi di codice
const chunks = readdirSync(`${OUT}/chunks`).map((f) => `"chunks/${f}"`).join(", ");
const sw = readFileSync(`${OUT}/sw.js`, "utf8")
  .replace("__VERSIONE__", Date.now().toString(36))
  .replace('"icons/icon-512.png"]', `"icons/icon-512.png", ${chunks}]`);
writeFileSync(`${OUT}/sw.js`, sw);
writeFileSync(`${OUT}/.nojekyll`, "");
console.log("Build pronta in", OUT);
