# Nepteer · v0.1.0-alpha

An independently implemented handheld companion foundation for **Steam Deck LCD running Windows 11**. This milestone is a real Tauri 2 desktop app backed exclusively by a read-only **mock** Rust provider.

The dashboard displays fixed battery, CPU temperature and fan samples. GPU temperature is deliberately unavailable. Navigation, theme and temperature-unit preferences work; Quick Access, Performance and Controller pages describe future work. Nothing reads or changes physical hardware.

## Run on macOS

Install Xcode Command Line Tools (`xcode-select --install`), current stable Rust with rustfmt/clippy, Node.js 24 and pnpm 12.21.0. Follow [Tauri's official prerequisites](https://v2.tauri.app/start/prerequisites/). If pnpm is absent, enable Corepack (`corepack enable`) or use `corepack pnpm` in place of `pnpm` below.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` opens the native app and starts Vite. `pnpm --filter @nepteer/desktop dev` starts only the browser frontend, which intentionally shows an IPC connection error; it does not fabricate a frontend hardware provider.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build:web
pnpm rust:check
pnpm rust:test
pnpm rust:lint
pnpm format:check
pnpm build --bundles app
```

`pnpm format` formats JS/TS/CSS/JSON/Markdown and Rust. `pnpm bindings` regenerates the checked-in Rust-derived TypeScript models. See [development](docs/DEVELOPMENT.md) for Windows prerequisites, native compilation, and troubleshooting.

## Windows CI and testing

[Foundation CI](https://github.com/weiliang79/nepteer/actions/workflows/ci.yml) validates macOS and Windows and compiles an actual x86_64 Windows application. After a successful run, download **nepteer-windows-x86_64-&lt;commit&gt;** from the run's Artifacts section. It contains a per-user NSIS installer and standalone `nepteer.exe`. Microsoft Edge WebView2 must already be installed; the installer deliberately skips runtime installation to avoid requesting privilege. No Visual Studio is needed to run the artifact.

Native macOS and Windows x86_64 CI builds passed for the stabilization code; see the [handoff](docs/HANDOFF.md) for run and artifact URLs. Steam Deck hardware verification remains **pending**. An unsigned alpha may show SmartScreen or publisher warnings; do not disable OS security. See the [Windows checklist](docs/WINDOWS_TESTING.md).

## Layout

```text
apps/desktop/src/            React dashboard, settings, UI tests, generated DTOs
apps/desktop/src-tauri/      Tauri shell, Rust models/provider, one read command
.github/workflows/ci.yml     Native macOS and Windows validation/builds
scripts/                    Dependency license inventory
 docs/                      Architecture, safety, development, handoff
```

Internal Rust modules keep the first vertical slice small; no speculative crates or service are necessary. The provisional application identifier is `io.github.weiliang79.nepteer`, based on the repository account, not a claim of ownership over a separate domain.

Read [architecture](docs/ARCHITECTURE.md), [safety](docs/SAFETY.md), [dependency licenses](docs/LICENSES.md), and [validation handoff](docs/HANDOFF.md). Distribution requires a complete third-party license/notice review. No Steam Deck Tools source is used. The project has not yet selected a project-wide license; do not assume MIT compatibility for the complete application.
