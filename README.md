# Nepteer · v0.5.0-alpha.1

An independently implemented, read-only handheld companion targeting **Windows 11 on Steam Deck LCD**, developable on macOS with Tauri 2, Rust, React and TypeScript.

Windows defaults to **LIVE WINDOWS**: actual battery percentage/charging status from `GetSystemPowerStatus` and manufacturer/model from a local WMI query selecting only those fields. Missing, unknown and failed readings remain unavailable; zero remains a valid value. CPU/GPU temperatures and fan RPM are not implemented in the real provider. LCD/OLED identification remains unverified.

macOS uses the preserved **MOCK DATA** provider. On any host, Settings → Telemetry provider → Mock samples deliberately selects fixed development samples. This selection resets to Automatic at restart; it is never a fallback for failed Windows reads. Theme/units persist separately. Telemetry refresh is manual, with an additional read on QAM open/provider change: no timer, subprocess, service, driver, unique-identifier collection or hardware write is added.

## Quick Access Menu

Use **Open Quick Access** in the dashboard or **Ctrl + Alt + Q** on Windows (**Control + Option + Q** on macOS). The separate panel starts hidden and shows battery/source information from the same session provider. Escape or Close hides it; clicking outside hides it after activation. Closing the dashboard exits the app and panel. No tray/startup persistence is added.

The opaque, borderless panel fits the display work area and sits above ordinary desktop windows while visible. Shortcut conflicts leave the dashboard button available. Windows focus return is best effort and respects OS restrictions; outside clicks do not force focus back. macOS uses the pointer's display and returns focus to the dashboard on explicit hide; external-app/Spaces restoration is not implemented. Exclusive fullscreen is not guaranteed. Performance/controller/display rows remain informational. No game hooks or hardware controls are added.

## Read-only controller diagnostics

Open **Controller** in the main dashboard, then **Rescan interfaces**. Windows enumerates candidate Valve 0x28DE / 0x1205 HID collections and displays safe metadata only. Select an eligible vendor-defined collection and explicitly press **Start Monitoring** to attempt shared, read-only input. Discovery is not proof of readability. Steam Input may prevent access or no reports may arrive; Nepteer never takes exclusive ownership or sends configuration commands.

Reports are counted and length/time summarized. A safe candidate parser recognizes a published 64-byte Deck message or its proposed zero-prefixed 65-byte Windows framing. **No physical framing or button mapping is verified; native button states stay unavailable and physical decoding is disabled.** Recognition never promotes verification. Raw input is not saved or sent to React. Stop is explicit, leaving Controller requests stop, and sessions expire after five minutes. Closing main joins the worker before exiting. No startup scan/open, auto-reconnect or controller-driven QAM action exists.

On macOS, native input discovery is unavailable. Select **Simulated diagnostics (development)** and rescan to test the complete UI/worker lifecycle without hardware. Simulation runs deterministic press/hold/release sequences through the candidate parser and transition detector: Phase 1 A/B/X/Y, D-pad, L1/R1, Steam and ⋯; it shows current simulated state and at most 32 recent transitions. Triggers, rear buttons, sticks and trackpads remain unavailable. This is independent of telemetry mock selection and always labeled SIMULATED INPUT. Read failures never choose simulation. See [research and limitations](docs/NEPTUNE_RESEARCH.md).

### Physical Button Correlation

On Windows, select the eligible vendor-defined descriptor-65 interface, start normal monitoring and observe `deck_v1_zero_prefixed65`. In **Physical Button Correlation**, nominate one of the twelve Phase 1 controls, record tool/Steam status (Unknown is valid), read/accept consent and separately press **Start Probe**. Rust guides preparation, idle control and five press/hold/release cycles, normally finishing at 29 seconds with a hard 30-second deadline. No timed Next clicks are needed; Abort remains available. Stop/rescan/page departure/owner failure or expiry ends an active probe.

The result contains local, memory-only aggregates and can be shared with **Copy Safe Summary**. Observed candidate-bit correlation is pending independent review, never physical verification. Missing reports, unstable baseline, out-of-window transitions or incompatible framing give an honest inconclusive/error result. This reuses the same reader, changes no controller/tool settings and never enables native physical events or controller QAM actions. The user reported a compatible 65-byte stream with Steam Deck Tools Desktop mode; individual bits remain unverified. Follow the [Step 5A.1 checklist](docs/WINDOWS_TESTING.md).

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

Steps 1–4 passed native CI and user-reported Windows Steam Deck checks, including 14 Step 3 tests. **Step 5A.1 probe hardware tests and physical-button verification remain pending.** See the [handoff](docs/HANDOFF.md) for this branch's validation, CI and artifacts. An unsigned alpha may show SmartScreen or publisher warnings; do not disable OS security. See the [Windows checklist](docs/WINDOWS_TESTING.md).

## Layout

```text
apps/desktop/src/            React dashboard, settings, UI tests, generated DTOs
apps/desktop/src-tauri/      Tauri shell, telemetry provider, QAM and HID diagnostics
.github/workflows/ci.yml     Native macOS and Windows validation/builds
scripts/                    Dependency license inventory
 docs/                      Architecture, safety, development, handoff
```

Internal Rust modules keep the first vertical slice small; no speculative crates or service are necessary. The provisional application identifier is `io.github.weiliang79.nepteer`, based on the repository account, not a claim of ownership over a separate domain.

Read [architecture](docs/ARCHITECTURE.md), [safety](docs/SAFETY.md), [dependency licenses](docs/LICENSES.md), and [validation handoff](docs/HANDOFF.md). Distribution requires a complete third-party license/notice review. No Steam Deck Tools source is used. The project has not yet selected a project-wide license; do not assume MIT compatibility for the complete application.
