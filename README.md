# Nepteer · v0.3.0-alpha.0

An independently implemented, read-only handheld companion targeting **Windows 11 on Steam Deck LCD**, developable on macOS with Tauri 2, Rust, React and TypeScript.

Windows defaults to **LIVE WINDOWS**: actual battery percentage/charging status from `GetSystemPowerStatus` and manufacturer/model from a local WMI query selecting only those fields. Missing, unknown and failed readings remain unavailable; zero remains a valid value. CPU/GPU temperatures and fan RPM are not implemented in the real provider. LCD/OLED identification remains unverified.

macOS uses the preserved **MOCK DATA** provider. On any host, Settings → Telemetry provider → Mock samples deliberately selects fixed development samples. This selection resets to Automatic at restart; it is never a fallback for failed Windows reads. Theme/units persist separately. Telemetry refresh is manual, with an additional read on QAM open/provider change: no timer, subprocess, service, driver, unique-identifier collection or hardware write is added.

## Quick Access Menu

Use **Open Quick Access** in the dashboard or **Ctrl + Alt + Q** on Windows (**Control + Option + Q** on macOS). The separate panel starts hidden and shows battery/source information from the same session provider. Escape or Close hides it; clicking outside hides it after activation. Closing the dashboard exits the app and panel. No tray/startup persistence is added.

The opaque, borderless panel fits the display work area and sits above ordinary desktop windows while visible. Shortcut conflicts leave the dashboard button available. Windows focus return is best effort and respects OS restrictions; outside clicks do not force focus back. macOS uses the pointer's display and returns focus to the dashboard on explicit hide; external-app/Spaces restoration is not implemented. Exclusive fullscreen is not guaranteed. Performance/controller/display rows remain informational. No game hooks or hardware controls are added.

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

[Desktop CI](https://github.com/weiliang79/nepteer/actions/workflows/ci.yml) validates macOS and Windows and compiles an actual x86_64 Windows application. After a successful run, download **nepteer-windows-x86_64-&lt;commit&gt;** from the run's Artifacts section. It contains a per-user NSIS installer and standalone `nepteer.exe`. Microsoft Edge WebView2 must already be installed; the installer deliberately skips runtime installation to avoid requesting privilege. No Visual Studio is needed to run the artifact.

Steps 1 and 2 passed native CI and user-reported Windows Steam Deck hardware smoke tests. **Step 3 QAM hardware verification remains pending.** See the [handoff](docs/HANDOFF.md) for this branch's validation, CI and artifacts. An unsigned alpha may show SmartScreen or publisher warnings; do not disable OS security. See the [Windows checklist](docs/WINDOWS_TESTING.md).

## Layout

```text
apps/desktop/src/            React dashboard, settings, UI tests, generated DTOs
apps/desktop/src-tauri/      Tauri shell, Rust models/provider, one shared read command
.github/workflows/ci.yml     Native macOS and Windows validation/builds
scripts/                    Dependency license inventory
 docs/                      Architecture, safety, development, handoff
```

Internal Rust modules keep the first vertical slice small; no speculative crates or service are necessary. The provisional application identifier is `io.github.weiliang79.nepteer`, based on the repository account, not a claim of ownership over a separate domain.

Read [architecture](docs/ARCHITECTURE.md), [safety](docs/SAFETY.md), [dependency licenses](docs/LICENSES.md), and [validation handoff](docs/HANDOFF.md). Distribution requires a complete third-party license/notice review. No Steam Deck Tools source is used. The project has not yet selected a project-wide license; do not assume MIT compatibility for the complete application.
