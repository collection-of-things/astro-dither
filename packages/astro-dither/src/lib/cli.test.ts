import { describe, expect, it, afterAll } from "vitest";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../../bin/cli.mjs", import.meta.url));

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function tempDir(name: string): string {
  const dir = join(tmpdir(), `astro-dither-cli-${name}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), "{}");
  return dir;
}

const dirs: string[] = [];
function makeDir(name: string): string {
  const dir = tempDir(name);
  dirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function filesUnder(dir: string, root = dir): string[] {
  const entries: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) entries.push(...filesUnder(full, root));
    else entries.push(full.slice(root.length + 1).replaceAll("\\", "/"));
  }
  return entries;
}

describe("astro-dither add", () => {
  it("add aurora writes the component and its lib deps only", () => {
    const dir = makeDir("aurora");
    const res = run(["add", "aurora"], dir);
    expect(res.status).toBe(0);

    const out = join(dir, "src/components/dither");
    const files = filesUnder(out).sort();
    expect(files).toEqual([
      "components/DitherAurora.astro",
      "lib/effects.ts",
      "lib/mount-ordered-dither.ts",
      "lib/ordered-dither.ts",
    ]);
    expect(files.some((f) => f.endsWith(".test.ts"))).toBe(false);
  });

  it("add image prints the pinned install hint per package manager", () => {
    const pnpmDir = makeDir("pnpm");
    writeFileSync(join(pnpmDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
    const res = run(["add", "image"], pnpmDir);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("pnpm add @paper-design/shaders@0.0.82");

    const npmDir = makeDir("npm");
    const res2 = run(["add", "image"], npmDir);
    expect(res2.stdout).toContain("npm i @paper-design/shaders@0.0.82");
  });

  it("skips existing files without --force and overwrites with it", () => {
    const dir = makeDir("force");
    run(["add", "aurora"], dir);
    const target = join(dir, "src/components/dither/components/DitherAurora.astro");
    writeFileSync(target, "modified");

    const res = run(["add", "aurora"], dir);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("skipped");
    expect(readFileSync(target, "utf8")).toBe("modified");

    const res2 = run(["add", "aurora", "--force"], dir);
    expect(res2.status).toBe(0);
    expect(readFileSync(target, "utf8")).not.toBe("modified");
  });

  it("add globe copies the land.png asset", () => {
    const dir = makeDir("globe");
    const res = run(["add", "globe"], dir);
    expect(res.status).toBe(0);
    expect(existsSync(join(dir, "src/components/dither/assets/land.png"))).toBe(true);
  });

  it("unknown name exits 1 and lists valid names", () => {
    const dir = makeDir("unknown");
    const res = run(["add", "nope"], dir);
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toContain("aurora");
  });

  it("list prints all six components", () => {
    const dir = makeDir("list");
    const res = run(["list"], dir);
    expect(res.status).toBe(0);
    for (const name of ["aurora", "image", "gradient", "effect", "globe", "dither"]) {
      expect(res.stdout).toContain(name);
    }
  });
});
