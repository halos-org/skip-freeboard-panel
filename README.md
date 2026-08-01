# @halos-org/skip-freeboard-panel

Signal K server plugin that registers [Skip](https://github.com/halos-org/skip) as a
[Freeboard-SK](https://github.com/SignalK/freeboard-sk) **plotter-extension**: a toolbar
button that opens Skip in a side panel, plus Wind Steer chart widgets.

It ships no UI of its own — the panel and widget iframes load the Skip webapp served by the
companion `@halos-org/skip` package at its fixed serving path (`/@halos-org/skip/`). Install
this plugin and the Skip webapp comes with it (declared via `signalk.requires`).

## Relationship to `@halos-org/skip`

This package is the server-plugin half of Skip's Freeboard-SK integration, split out so the
Skip webapp package stays webapp-only (webapp updates then need no Signal K server restart).
The two form a **cross-package contract**: this plugin's manifest URLs must track Skip's
serving path, widget-type ids, and embed routes (`#/widget/:type`, `#/widget-config/:type`).
A change to those in Skip requires a coordinated release here.

## Development

```bash
./run build     # compile TypeScript to dist/
./run test      # run the vitest suite
./run lint      # ESLint
./run ci        # typecheck + lint + format:check + test
./run bumpversion patch   # bump VERSION + package.json (patch|minor|major)
```

Published to npm as `@halos-org/skip-freeboard-panel` (OIDC trusted publishing on stable
release). Part of the [HaLOS](https://github.com/halos-org/halos) distribution.
