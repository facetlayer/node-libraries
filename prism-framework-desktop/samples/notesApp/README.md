# Prism Notes Desktop Sample

A minimal Electron desktop app built on `@facetlayer/prism-framework-desktop`.
The same `PrismApp` runs in two modes:

- **Electron mode** — IPC via `window.electron.apiCall`. Launched by `main.ts`.
- **Web mode** — Express HTTP server. Launched by `serve.ts`. Useful for driving the UI with `playwright-cli` or any standard browser tool.

Both modes share one `createApp()` factory and one HTML file. A small client shim (`web/apiClient.js`) picks the right transport at load time.

## Run (Electron)

```bash
pnpm build
pnpm start
# or: candle start prism-desktop-sample
```

## Run (web mode, for agent testing)

```bash
pnpm build
pnpm serve
# → http://localhost:4810/
# or: candle start prism-desktop-sample-web
```

Then drive it:

```bash
playwright-cli open http://localhost:4810/
playwright-cli snapshot
playwright-cli fill e6 "A title"
playwright-cli fill e7 "A body"
playwright-cli click e8
playwright-cli snapshot
playwright-cli close
```

See [../../docs/ElectronTesting.md](../../docs/ElectronTesting.md) for the full rationale and setup guide.

## Layout

- `src/createApp.ts` — shared `PrismApp` factory (used by both entry points)
- `src/notesService.ts` — CRUD endpoints over an in-memory list
- `src/main.ts` — Electron entry point
- `src/serve.ts` — web (Express) entry point
- `web/index.html` — UI
- `web/apiClient.js` — transport shim (`window.api.call`)
