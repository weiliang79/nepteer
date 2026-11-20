# Step 3 handoff · v0.3.0-alpha.0

Branch `feat/quick-access-menu`, from latest main `dcc5fc4b589dbf5cd8f50150b26b6c6a4e0b5adb`. Steps 1 and 2 passed native CI and user-reported Windows Steam Deck smoke tests. **Step 3 GUI/Deck/game verification remains pending.** Do not merge this branch until review.

## Architecture and changed components

- `quick_access.rs`: serialized Rust coordinator, fixed-label Tauri backend, native visibility queries, hidden creation/recreation, DPI/work-area placement, topmost while shown, taskbar suppression on Windows, focus/blur policy and lifecycle tests. `quick_access/focus.rs` isolates Windows-only foreground capture/validation and one best-effort activation request, with no title/process inspection or handle logging.
- `lib.rs`, `build.rs`, capability files and generated bindings: four explicitly permissioned QAM lifecycle/status commands plus the existing telemetry command. Rust retains main's session provider selection; QAM reads it without a mode and cannot change it. Status payloads remain generated from Rust. CSP is unchanged.
- `components/quick-access/`, `main.tsx`, IPC/preferences helpers, dashboard and CSS: separate opaque QAM route, native-open-triggered battery reads, LIVE WINDOWS/MOCK DATA, explicit unavailability/errors, Close-first focus, Escape, Tab wrapping, manual refresh and informational planned rows. Shared saved theme and native session provider; no state framework. Main adds Open Quick Access, shortcut information and errors. Application version is 0.3.0-alpha.0 throughout.
- Cargo dependency/lockfile, workflow, README/AGENTS and architecture/development/safety/testing/license docs updated. No new frontend package, hardware write, service, startup entry, controller interception, sensor or game integration.

## Window lifecycle and shortcut

QAM is a separate `quick-access` WebviewWindow, created hidden and unfocused during setup. No native visibility is cached in React or Rust. Show/hide are idempotent, toggle reads native visibility, and missing windows are recreated with the same label. Async command/event workers serialize operations to avoid duplicate creation and synchronous Windows WebView2 creation hazards. Native events only queue work; movement/resize/DPI placement compares geometry to avoid feedback loops. Unreported display changes recover on the next hide/show; no display polling is added.

QAM Escape/Close/native close hide it. Blur hides after keyboard focus was established and actual focus has moved elsewhere; it never restores focus over an outside click. Main close explicitly exits Nepteer even if QAM is visible. No tray resident process or helper is introduced.

Actual implemented shortcut: **Ctrl+Alt+Q on Windows; Control+Option+Q on macOS**. The official plugin registers once during startup; pressed events toggle and Windows uses upstream MOD_NOREPEAT. Conflicts/registration failures produce a diagnostic and retain the dashboard fallback. Registration is independent of window recreation and cleanup unregisters on normal application exit. No frontend shortcut registration permission or low-level hook exists.

Windows capture retains only a previous foreground handle in memory. Explicit hide while QAM held focus validates the prior visible window and makes one SetForegroundWindow attempt. OS denial is accepted; there is no forced activation loop, synthesized input, AttachThreadInput or security bypass. macOS explicit hide returns focus to the main dashboard; external-app/Spaces restoration is not implemented. Tauri skip-taskbar is unsupported on macOS. Topmost does not guarantee compatibility with exclusive fullscreen, other virtual desktops, elevated/Secure Desktop windows or games. Anti-cheat-protected games are outside initial testing.

## Exact local validation

Host: macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust 1.100.0.

| Command                                   | Actual result                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `git fetch origin`                        | Passed; verified latest main merge base                                                        |
| `cargo fetch`                             | Passed with approved registry access; official plugin resolved to 2.4.1                        |
| `pnpm install --lockfile-only`            | Passed; no frontend dependency change                                                          |
| `pnpm bindings`                           | Passed; adds generated QAM Status DTO                                                          |
| `pnpm bindings:check`                     | Passed; no-write drift check                                                                   |
| `pnpm format`                             | Passed                                                                                         |
| `pnpm format:check`                       | Passed; Prettier and Rust formatting                                                           |
| `pnpm typecheck`                          | Passed                                                                                         |
| `pnpm lint`                               | Passed with zero warnings                                                                      |
| `pnpm test`                               | Passed; 18 tests in 3 files                                                                    |
| `pnpm rust:check`                         | Passed                                                                                         |
| `pnpm rust:test`                          | Passed; 16 tests, 1 intentionally ignored explicit generator                                   |
| `pnpm rust:lint`                          | Passed; all-target Clippy with -D warnings                                                     |
| `pnpm build --bundles app`                | Passed; production frontend, actual Rust executable and 10.22 MiB macOS app bundle             |
| `pnpm dev`                                | Compiled/launched native app and Vite; terminal startup smoke only, not a full GUI/focus audit |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; updated declared-license inventory                                                     |
| `git diff --check`                        | Passed                                                                                         |

Initial development corrections: generic runtime parameters were required on injected AppHandle/WebviewWindow arguments to preserve mock-runtime IPC tests; an async request-counter cleanup triggered an ESLint ref warning and was corrected. Final checks passed. No test or permission was disabled to pass validation.

Pure Rust tests cover hidden initial state, idempotence, repeated toggles with one creation, missing/destroyed/external-hidden recovery, blur/focus denial and return behavior, close-versus-exit policy, local-only navigation, shortcut/creation failure recovery, bounded DPI/negative-monitor geometry, existing telemetry conversion and generated bindings. Mock-runtime IPC tests verify main/QAM/other/remote capability boundaries, shared provider reads and rejection of QAM mode changes/window show. These do not exercise native OS activation.

React tests cover both source labels, zero/unavailable/no battery, errors/retry, hidden startup with no telemetry read, native open/provider-triggered reads, Close/Escape, initial focus/Tab wrap, saved theme, planned rows, dashboard Open action/errors and all existing settings/telemetry behavior. jsdom does not validate actual native focus, touch or game compatibility.

Local output: `target/release/bundle/macos/Nepteer.app` and `target/release/nepteer`. No Windows executable, installer or game was run locally. No Step 3 Deck GUI tests are claimed.

## CI / Windows artifact

Feature push/native matrix results are pending at this implementation checkpoint. Add the actual commit, run/job and artifact URLs after native CI completes. The workflow includes `feat/quick-access-menu` and retains every validation step, macOS bundle, Windows x86_64 MSVC executable/NSIS build, both-output checks, asInvoker/uiAccess=false manifest extraction, and artifact/license uploads.

Expected artifact `nepteer-windows-x86_64-<commit>` contains `nepteer.exe` and `bundle/nsis/Nepteer_0.3.0-alpha.0_x64-setup.exe`, built under `target/x86_64-pc-windows-msvc/release/`. NSIS remains currentUser and requires existing WebView2. No release publication or merge to main is authorized.

## Dependency/license review

The only new direct dependency is official `tauri-plugin-global-shortcut` 2.4.1, Apache-2.0 OR MIT; `global-hotkey` 0.8.0 is also Apache-2.0 OR MIT. All newly locked target/support package metadata is recorded in LICENSE_INVENTORY.md and explained in LICENSES.md. No SteamOS assets or Steam Deck Tools source was copied. Full distribution notice/license review remains outstanding; there is no project-wide MIT compatibility claim.

## Remaining manual validation

Complete the 15-item WINDOWS_TESTING.md checklist on Windows 11 Deck LCD at 1280×800: hidden startup, button/shortcut/conflict, placement/DPI, touch/keyboard/Close/Escape, normal desktop focus return and outside click, repeated toggles/recreation, battery/source, theme/unit/provider regressions, main-close cleanup and uninstall. Test desktop, non-anti-cheat borderless games and exclusive fullscreen separately, recording unsupported behavior rather than adding invasive workarounds. Do not log private window titles/handles or unique hardware IDs. Cancellation of existing synchronous WMI queries, distribution signing/notarization and full license review remain limitations.
