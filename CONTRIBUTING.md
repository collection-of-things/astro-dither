# Contributing

## Setup

Requires Node 22.23.4 or newer (see `.nvmrc`) and pnpm.

```sh
pnpm install
pnpm dev      # site at http://localhost:4321
```

## Layout

The repo is a pnpm workspace. The library lives in `packages/astro-dither` and the documentation site in `site`. The site only imports the package by name, which proves the package exports work. See "Repository layout" in the root README for the file tree.

## Adding an effect

1. Write a `field(vec2 uv, vec2 res, float t)` GLSL function in `packages/astro-dither/src/lib/effects.ts`. It returns a tone 0 to 1 (negative means transparent) and reads its params as `p_<name>` uniforms. `hash21`, `vnoise` and `fbm` helpers are provided.
2. Add a registry entry with `params`, `stillTime`, `palette` and `speed`.
3. Add a test in `ordered-dither.test.ts` (registry coverage runs over every entry; add a param-parse assertion for anything non-trivial).
4. Add a row to the effects table in `packages/astro-dither/README.md`.
5. Add a tile to `site/src/pages/examples.astro`.

## Before opening a pull request

```sh
pnpm test      # vitest
pnpm check     # astro check on package and site
pnpm build     # site build
```

If you changed what the package ships, also run `pnpm --filter astro-dither pack` and check the tarball contents.

## Style

- Short imperative commit messages ("add horizon effect", "fix shebang line endings").
- Plain language in docs, no em dashes.
- Add an entry to `packages/astro-dither/CHANGELOG.md` for user-facing changes.
