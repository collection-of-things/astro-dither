import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";

// Measure the home page's module scripts and static imports, counting each asset once.
const dist = resolve("site/dist");
const html = readFileSync(resolve(dist, "index.html"), "utf8");
const files = new Set();
let bytes = 0;
let gzip = 0;

function collect(file) {
  if (files.has(file)) return;
  files.add(file);
  const source = readFileSync(file);
  bytes += source.length;
  gzip += gzipSync(source).length;
  for (const match of source.toString().matchAll(/\b(?:from\s*|import\s*)["']([^"']+\.js)["']/g)) {
    if (match[1].startsWith(".")) collect(resolve(dirname(file), match[1]));
  }
}

for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  const src = /\bsrc="([^"]+)"/.exec(match[1]);
  if (src) collect(resolve(dist, src[1].replace(/^\//, "")));
  else if (match[2].trim()) {
    const source = Buffer.from(match[2]);
    bytes += source.length;
    gzip += gzipSync(source).length;
  }
}

console.log(JSON.stringify({ bytes, gzip, modules: files.size, kB: (bytes / 1000).toFixed(1), gzipKB: (gzip / 1000).toFixed(1) }));
