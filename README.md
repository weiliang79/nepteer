# Nepteer · v0.5.0-alpha.2

An independently implemented, read-only handheld companion targeting **Windows 11 on Steam Deck LCD**, developable on macOS with Tauri 2, Rust, React and TypeScript.

Windows defaults to **LIVE WINDOWS**: actual battery percentage/charging status from `GetSystemPowerStatus` and manufacturer/model from a local WMI query selecting only those fields. Missing, unknown and failed readings remain unavailable; zero remains a valid value. CPU/GPU temperatures and fan RPM are not implemented in the real provider. LCD/OLED identification remains unverified.

macOS uses the preserved **MOCK DATA** provider. On any host, Settings → Telemetry provider → Mock samples deliberately selects fixed development samples. This selection resets to Automatic at restart; it is never a fallback for failed Windows reads. Theme/units persist separately. Telemetry refresh is manual, with an additional read on QAM open/provider change: no timer, subprocess, service, driver, unique-identifier collection or hardware write is added.

## Current milestone: Step 5F interaction refinements

Step 5C.2 passed user-reported Windows Steam Deck acceptance. The [controller input-routing decision record](docs/decisions/step-5d-controller-input-routing.md) recommends retaining **desktop-only controller navigation** and non-invasive touch/keyboard alternatives. QAM navigation observes buttons without suppressing input to games or other tools. Research does not identify a universal supported isolation API under the current safety boundaries; controlling game-visible virtual output or device filtering would require separate architectural/security approval. Step 5E improves setup, guidance and readiness messages without changing native input behavior or the runtime version. The user reports Step 5E hardware acceptance complete on Steam Deck LCD / Windows 11, including pending-refresh interaction and safe cleanup; this does not establish input isolation.

Step 5F adds a QAM-only outline tied to actual DOM focus in dark/light themes, explicit approved focus targets and predictable recovery to Close (or the first available control) only when an explicit controller action finds missing/hidden focus. No activation occurs on that recovery. Hover has no focus outline; expanded sections use +/−, `aria-expanded` and a separate content border, so expansion can remain while focus moves elsewhere. Refresh and Slow Refresh retain the accepted busy-focus behavior; no async update resets focus. Mouse/touch use the browser's actual focused element without forced pointer focus handlers. New Step 5F Windows/WebView2 visual acceptance is pending.

**Held-repeat remains disabled.** Holding D-pad emits no repeated navigation. The [feasibility note](docs/decisions/step-5f-dpad-held-repeat.md) proposes only a separately approved future experiment, not an implemented feature. Existing native input, lifecycle, permissions, explicit arming and desktop-only/no-isolation boundaries are unchanged.

### Retained test-only focus diagnostics

Only explicit `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true` builds show **TEST BUILD ONLY / Test Slow Refresh (5s)** in QAM. Normal artifacts exclude the button and delay module. The separately named test Windows artifact uses the same application identity: exit Nepteer before replacing it and never run both instances. See [build instructions](docs/DEVELOPMENT.md#temporary-step-5e-qam-slow-refresh-test-build) and [manual checks](docs/WINDOWS_TESTING.md). QAM Slow Refresh diagnostics are intentionally retained as a test-only development tool until the controller feature development phase is complete. The [diagnostic workflow](https://github.com/weiliang79/nepteer/actions/workflows/qam-focus-diagnostics.yml) is **manual-only**: use Actions → TEST ONLY - QAM Focus Diagnostics → Run workflow, select `feat/qam-interaction-refinements`, `feat/qam-navigation-ux` or `main`, then download its clearly marked TEST-ONLY Windows artifact. Explicit feature-branch CLI dispatch has been accepted before merge; GitHub documents a default-branch prerequisite for manual-workflow discovery, so use the CLI instructions if the web button is unavailable. Normal push/PR CI cannot launch diagnostic packaging. It remains development infrastructure, not a supported production feature; no native input/telemetry behavior changes.

## Quick Access Menu

Use **Open Quick Access** in the dashboard or **Ctrl + Alt + Q** on Windows (**Control + Option + Q** on macOS). The separate panel starts hidden and shows battery/source information from the same session provider. Escape or Close hides it; clicking outside hides it after activation. Closing the dashboard exits the app and panel. No tray/startup persistence is added.

The opaque, borderless panel fits the display work area and sits above ordinary desktop windows while visible. Shortcut conflicts leave the dashboard button available. Windows focus return is best effort and respects OS restrictions; outside clicks do not force focus back. macOS uses the pointer's display and returns focus to the dashboard on explicit hide; external-app/Spaces restoration is not implemented. Exclusive fullscreen is not guaranteed. Performance/controller/display rows remain informational. No game hooks or hardware controls are added.

## Physical controller sessions (Step 5E)

Choose an explicitly armed, session-only mode under **Physical Quick Access Shortcut** in Dashboard/Settings:

| Session choice                           | Existing behavior                                    | Manually reviewed environment                                      |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| **Physical shortcut only** (default)     | Physical ⋯ opens/closes QAM; no D-pad/A/B navigation | Steam Deck Tools Desktop mode                                      |
| **Controller navigation (desktop only)** | ⋯ toggle, Up/Down focus, A activate, B back/close    | Steam Deck Tools X360 mode, Windows desktop without an active game |

These choices describe your existing configuration; Nepteer does not detect or change Steam Deck Tools or Steam Input. Stop diagnostics, rescan/select the reviewed vendor collection, choose a mode and complete both acknowledgments before Arm. Changing modes clears both acknowledgments and never arms automatically. Disarm before reconfiguring an active session. Opt-in is not persisted; restart is Disarmed/shortcut-only.

The status bar reflects native phase, reader ownership and navigation status independently of the next-session selection. It distinguishes navigation enabled/disabled/error, waiting for a released baseline, Disarming and terminal states. Connection failure shows **Last known**, not confirmed readiness. A navigation-only error can leave ⋯ available if native status confirms it; otherwise use the dashboard, keyboard or touch. Disarm/rearm explicitly to recover, respecting any pending cleanup. **Technical session diagnostics** retains safe summary copying and detailed troubleshooting.

The navigation warning appears before Arm, with the essential controls alongside it. **Other ways to use Quick Access** explains the native platform shortcut, Tab/Shift+Tab, Enter/Space, Escape, dashboard Open Quick Access and mouse/touch. QAM repeats compact static guidance without assuming that navigation is currently enabled. These alternatives do not pause or isolate gameplay.

Open with ⋯, move using Up/Down, activate the focused enabled button with A, and use B to collapse an informational section or close. Left/Right do nothing because there are no adjustable QAM controls. Release before pressing again; held buttons, diagonals or multiple controls do not repeat navigation. Keyboard, mouse and touch remain available. Disarm ends both routes; only one reader exists and the thirty-minute shortcut limit is unchanged.

**Desktop testing without an active game only. Controller navigation observes physical buttons without suppressing them. Games or other controller utilities may still receive the same input.** There is no input isolation, injection or Steam Input/Tools configuration. Native lifecycle tokens and claim/completion prevent stale offers from becoming actions; a completely unresponsive renderer/IPC after a granted claim can delay cleanup, which is never reported as successful early. See the current [hardware checklist](docs/WINDOWS_TESTING.md) and [handoff](docs/HANDOFF.md).

## Read-only controller diagnostics

Open **Controller** in the main dashboard, then **Rescan interfaces**. Windows enumerates candidate Valve 0x28DE / 0x1205 HID collections and displays safe metadata only. Select an eligible vendor-defined collection and explicitly press **Start Monitoring** to attempt shared, read-only input. Discovery is not proof of readability. Steam Input may prevent access or no reports may arrive; Nepteer never takes exclusive ownership or sends configuration commands.

Reports are counted and length/time summarized. A safe candidate parser recognizes a published 64-byte Deck message or its proposed zero-prefixed 65-byte Windows framing. **Normal diagnostics keep physical button states unavailable and never automatically promote verification.** The separately armed QAM route enables the reviewed ⋯ toggle and, only in the explicitly selected X360 session, the six scoped navigation actions. Raw input is not saved or sent to React. Stop is explicit, leaving Controller requests stop, and sessions expire after five minutes. Closing main joins the worker before exiting. No startup scan/open or auto-reconnect exists. Diagnostic/probe events cannot operate QAM.

On macOS, native input discovery is unavailable. Select **Simulated diagnostics (development)** and rescan to test the complete UI/worker lifecycle without hardware. Simulation runs deterministic press/hold/release sequences through the candidate parser and transition detector: Phase 1 A/B/X/Y, D-pad, L1/R1, Steam and ⋯; it shows current simulated state and at most 32 recent transitions. Triggers, rear buttons, sticks and trackpads remain unavailable. This is independent of telemetry mock selection and always labeled SIMULATED INPUT. Read failures never choose simulation. See [research and limitations](docs/NEPTUNE_RESEARCH.md).

### Physical Button Correlation

On Windows, select the eligible vendor-defined descriptor-65 interface, start normal monitoring and observe `deck_v1_zero_prefixed65`. In **Physical Button Correlation**, nominate one of the twelve Phase 1 controls, record tool/Steam status (Unknown is valid), read/accept consent and separately press **Start Probe**. Rust guides preparation, idle control and five press/hold/release cycles, normally finishing at 29 seconds with a hard 30-second deadline. No timed Next clicks are needed; Abort remains available. Stop/rescan/page departure/owner failure or expiry ends an active probe.

The result contains local, memory-only aggregates and can be shared with **Copy Safe Summary**. Observed candidate-bit correlation is pending independent review, never physical verification. Missing reports, unstable baseline, out-of-window transitions or incompatible framing give an honest inconclusive/error result. This reuses the same reader, changes no controller/tool settings and never enables native physical events or controller QAM actions itself. The separate shortcut mode requires diagnostics/probing to stop first. The original Desktop-mode framing observations alone did not verify button bits; later X360 correlations support only the scoped navigation route described above. Follow the [Step 5A.1 checklist](docs/WINDOWS_TESTING.md).

## Physical Quick Access Shortcut

Dashboard/Settings provides **Arm Physical ⋯ Shortcut**, disabled by default and never saved. Manually rescan/select the reviewed native interface, confirm the test configuration and consent to passive observation. Required metadata is Valve 28DE:1205, interface 2, usage FFFF/0001, descriptor 65; only exact zero-prefixed65 Deck-v1 reports are accepted. The reviewed environment is Steam Deck LCD/Windows 11, Steam Deck Tools controller in Desktop mode, Steam running; Steam Input status was unknown. Nepteer does not detect or change tool settings.

After compatible reports and >=3 released samples over 200ms, released→pressed bit 50 toggles the existing QAM. Initial held state, holds, releases, Steam and face buttons never trigger it. A defensive 350ms minimum between accepted presses discards shorter intervals without delayed actions. Gaps over 1.5s require a new released baseline; invalid reports, disconnect/read errors and expiry close the session. Initial silence beyond 5s ends with a clear error, without retry.

The separate session lasts at most **30 minutes**, survives page navigation/minimization, and has a persistent **Disarm Shortcut** control on every main-app page. Disarm/exit cancels and joins the reader, discards pending actions and clears input state. No automatic renewal/reconnect or resident service exists. Diagnostics and correlation cannot own a reader concurrently; explicitly stop/disarm to switch. The diagnostic five-minute limit is unchanged.

Steam Deck Tools/Steam may independently react to ⋯, including another overlay. Nepteer does not intercept/suppress their input; disarm if behavior conflicts. Normal desktop/windowed support and best-effort focus restrictions remain, with no exclusive-fullscreen guarantee or anti-cheat testing. [New hardware checklist](docs/WINDOWS_TESTING.md) must pass before merge. No general physical input events, remapping or hardware configuration is added.

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

Steps 1–4 passed native CI and user-reported Windows Steam Deck checks, including 14 Step 3 tests. **Step 5B was merged and physically tested; repeatable user-supplied X360 D-pad evidence supports the new route, but Step 5C.2 navigation/focus/lifecycle hardware acceptance remains pending.** See the [handoff](docs/HANDOFF.md) for this branch's validation, CI and artifacts. An unsigned alpha may show SmartScreen or publisher warnings; do not disable OS security. See the [Windows checklist](docs/WINDOWS_TESTING.md).

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
