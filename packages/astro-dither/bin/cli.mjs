#!/usr/bin/env node
// astro-dither CLI: copy component source into a project.
// Node built-ins only, Node 18+.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));

const COMPONENTS = {
  aurora: { file: "components/DitherAurora.astro", description: "The aurora effect with all its knobs" },
  image: { file: "components/DitherImage.astro", description: "Ordered dithering over any image" },
  gradient: { file: "components/DitherGradient.astro", description: "Linear, radial, conic or wave gradients" },
  effect: { file: "components/DitherEffect.astro", description: "18 procedural effects; use globe for the land-mask effect" },
  globe: { file: "components/DitherGlobe.astro", description: "An orthographic globe dithered from a land mask" },
  dither: { file: "components/Dither.astro", description: "Paper's animated dither shapes" },
};

const ALIASES = new Map();
for (const [name, entry] of Object.entries(COMPONENTS)) {
  ALIASES.set(name, name);
  ALIASES.set(basename(entry.file, ".astro").toLowerCase(), name);
}
ALIASES.set("all", "all");

const IMPORT_RE = /(?:from|import)\s*["']([^"']+)["']/g;
const VALID_NAMES = [...Object.keys(COMPONENTS), "all"].join(", ");

function usage() {
  return `astro-dither

Usage:
  astro-dither add <name...> [--dir <path>] [--force]
  astro-dither list
  astro-dither --version
  astro-dither --help

add names: ${VALID_NAMES}
  --dir   output directory (default: src/components/dither)
  --force overwrite files that differ from the source`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function readPackageJson() {
  try {
    return JSON.parse(await readFile(join(PKG_ROOT, "package.json"), "utf8"));
  } catch {
    return {};
  }
}

/** Collect a source file plus every relative import it makes, recursively. */
function collect(entryPath, seen) {
  if (seen.has(entryPath) || entryPath.endsWith(".test.ts")) return seen;
  if (!existsSync(entryPath)) return seen;
  seen.add(entryPath);
  const text = readFileSync(entryPath, "utf8");
  for (const match of text.matchAll(IMPORT_RE)) {
    const specifier = match[1];
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) continue;
    const base = resolve(dirname(entryPath), specifier);
    const candidates = [base, `${base}.ts`, `${base}.d.ts`, join(base, "index.ts")];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        collect(candidate, seen);
        break;
      }
    }
  }
  return seen;
}

/** True when any copied file pulls in an npm package (a non-relative import). */
function externalImports(files) {
  const found = new Set();
  for (const file of files) {
    if (file.endsWith(".png")) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      if (!specifier.startsWith("./") && !specifier.startsWith("../") && !specifier.startsWith("astro")) {
        found.add(specifier);
      }
    }
  }
  return found;
}

function detectPackageManager(cwd) {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return ["pnpm", "pnpm add"];
  if (existsSync(join(cwd, "bun.lock")) || existsSync(join(cwd, "bun.lockb"))) return ["bun", "bun add"];
  if (existsSync(join(cwd, "yarn.lock"))) return ["yarn", "yarn add"];
  return ["npm", "npm i"];
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    process.exit(command ? 0 : 1);
  }
  if (command === "--version" || command === "-v") {
    const pkg = await readPackageJson();
    console.log(pkg.version ?? "0.0.0");
    return;
  }
  if (command === "list") {
    for (const [name, entry] of Object.entries(COMPONENTS)) {
      console.log(`${name.padEnd(9)} ${entry.file.padEnd(36)} ${entry.description}`);
    }
    return;
  }
  if (command !== "add") fail(`Unknown command "${command}".\n\n${usage()}`);

  const names = [];
  let outDir = "src/components/dither";
  let force = false;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--force") {
      force = true;
    } else if (arg === "--dir") {
      const next = args[++i];
      if (!next) fail("--dir needs a path");
      outDir = next;
    } else if (arg.startsWith("--")) {
      fail(`Unknown flag "${arg}"`);
    } else {
      names.push(arg);
    }
  }
  if (names.length === 0) fail(`Nothing to add. Names: ${VALID_NAMES}`);

  const picked = new Set();
  for (const name of names) {
    const key = ALIASES.get(name.toLowerCase());
    if (!key) fail(`Unknown component "${name}". Valid names: ${VALID_NAMES}`);
    if (key === "all") {
      Object.keys(COMPONENTS).forEach((each) => picked.add(each));
    } else {
      picked.add(key);
    }
  }

  const cwd = process.cwd();
  const targetRoot = resolve(cwd, outDir);
  if (!existsSync(join(cwd, "package.json"))) {
    console.warn(`warning: no package.json in ${cwd}; copying anyway`);
  }

  const wanted = new Set();
  for (const key of picked) {
    const rel = COMPONENTS[key].file;
    collect(join(SRC_ROOT, rel), wanted);
  }

  const written = [];
  const skipped = [];
  const unchanged = [];
  for (const source of wanted) {
    const rel = source.startsWith(SRC_ROOT) ? source.slice(SRC_ROOT.length) : basename(source);
    const target = join(targetRoot, rel);
    const content = readFileSync(source);
    if (existsSync(target)) {
      const existing = readFileSync(target);
      if (existing.equals(content)) {
        unchanged.push(rel);
        continue;
      }
      if (!force) {
        skipped.push(rel);
        continue;
      }
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    written.push(rel);
  }

  for (const rel of written) console.log(`wrote ${join(outDir, rel)}`);
  for (const rel of unchanged) console.log(`unchanged ${join(outDir, rel)}`);
  for (const rel of skipped) console.log(`skipped ${join(outDir, rel)} (exists; use --force to overwrite)`);

  if (written.length > 0) {
    const main = [...picked][0];
    const componentName = basename(COMPONENTS[main].file, ".astro");
    console.log(`\nImport it in your pages, e.g.:`);
    console.log(`  import ${componentName} from "../components/dither/${COMPONENTS[main].file}";`);
    console.log(`  (adjust the path: files went to ${outDir}${sep})`);
  }

  const external = externalImports([...wanted]);
  const pkg = await readPackageJson();
  for (const specifier of external) {
    const version = pkg.dependencies?.[specifier] ?? "latest";
    const [, installCmd] = detectPackageManager(cwd);
    console.log(`\nThis component also needs ${specifier}:`);
    console.log(`  ${installCmd} ${specifier}@${version}`);
  }
}

main().catch((error) => fail(String(error)));
