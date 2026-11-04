# Publishing astro-dither

The library is `packages/astro-dither`. The workspace root and `site` are private and are not published. The first planned version is `0.1.0`; it has not been published yet.

## Prepare a release

1. Review the package README, examples, metadata and changelog against the components.
2. For the first release, keep version `0.1.0`. For later releases, choose a new version in `packages/astro-dither/package.json` and add its changelog entry. Published versions cannot be reused.
3. Run from the repository root:

   ```sh
   pnpm install --frozen-lockfile
   pnpm run ci
   pnpm --filter astro-dither pack --pack-destination .release
   ```

4. Inspect the archive. It should contain the six components, library modules, globe mask, CLI, README, licence, third-party notices and changelog. It should exclude tests, the site, dependencies and local configuration.
5. Install the archive in a separate Astro project and build a page that imports the components. Run the CLI from the archive too. Workspace imports alone do not check the published archive.

## Publish manually

Enable two-factor authentication on the `screendev` npm account. Log in using npm's interactive flow; do not put credentials in the repository.

```sh
npm login
npm whoami
```

Confirm that `npm whoami` prints `screendev`. From `packages/astro-dither`, preview the upload:

```sh
npm publish --dry-run
```

When the release is approved, publish from that same directory:

```sh
npm publish --access public
```

This publishes the name `astro-dither` under the logged-in account. If the name is unavailable, stop and choose a name before changing the package, site install snippets and CLI docs together.

## After publication

- Check `npm view astro-dither version` and install that version in a separate Astro project.
- Restore npm version/download badges in the root README once the package exists.
- Commit and tag the released source, then publish release notes on the repository host.

CI currently validates and packs the package; it does not publish. Automated releases can be configured later using npm trusted publishing.

See npm's [publishing guide](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/) and [trusted publishing guide](https://docs.npmjs.com/trusted-publishers/).
