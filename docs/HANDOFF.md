# Step 4 handoff · v0.4.0-alpha.0

Branch `feat/neptune-discovery`, based on updated main `42bf0f4834df61d255b58dad6caab6acc25c30a7`. Steps 1–3 passed native CI and user-reported Steam Deck tests; the user reports 14 Step 3 tests passed. **All Step 4 real HID, controller and Steam Input coexistence observations remain pending.** Do not merge before review and hardware testing.

## Implementation and changed files

- `src-tauri/src/neptune/{mod,windows,monitor,reports}.rs`: Rust-owned candidate/state/error/control DTOs, scan-local opaque IDs and private paths, Windows metadata/shared-read adapter, opt-in worker, cancellation/cleanup, report counts/length/time only, synthetic transport and lifecycle tests. No verified parser, button state or transition is produced.
- `lib.rs`, `quick_access.rs`, `build.rs`, main capability and generated command permissions: five main-only diagnostics commands, scoped summary events, shutdown gate to stop/join off the native UI thread before exit. Existing QAM capability, navigation restriction and CSP are unchanged.
- `components/controller/ControllerDiagnostics.tsx` and tests, `lib/neptune.ts`, `App.tsx`/tests and CSS: practical Controller page, manual source/rescan/selection/start/stop/status, truthful source/availability/error labels, keyboard-accessible controls, cleanup on departure and protection against stale command responses overtaking newer events. Existing Dashboard/Settings/QAM regression tests remain.
- Rust/TypeScript bindings exporter and generated declarations: preserve the Rust type authority and no-write drift check. Root/package/Tauri/Cargo versions become 0.4.0-alpha.0. Existing windows-sys enables native HID/SetupAPI/I/O features; no package is added.
- CI includes the new branch and retains native macOS/Windows validation, MSVC x86_64/NSIS build, manifest checks and artifact/license uploads. AGENTS, README, architecture, development, safety, Windows checklist, license notes and independent research document reflect the actual scope.

## Approach and supported behavior

Native Windows enumeration uses SetupAPI/HID cached metadata, candidate VID 0x28DE/PID 0x1205 and safe descriptions/usage/interface metadata. Desired access zero is used for metadata opens. Unknown/missing descriptors and mouse/keyboard collections are discovery-only. A vendor-defined candidate is merely eligible for an attempt, not confirmed Neptune-compatible or readable. Virtual Xbox controllers are not substitutes.

Explicit Start opens only shared GENERIC_READ, revalidates attributes/caps and runs one overlapped read at a time on one dedicated worker. Waits are bounded to 100 ms, normal input summaries to four per second plus lifecycle changes. Stop/rescan/shutdown cancel and join; five-minute native expiry bounds an abandoned session. No auto-reconnect occurs. CancelIoEx is drained before storage/handles are freed; Windows drivers must complete cancellation, so a broken driver can delay cleanup/shutdown. No unsafe thread kill/free workaround is used.

A candidate, successful open and observable reports are distinct UI/DTO states. Published protocol references exist, but no Windows passive report framing/semantics have been verified for Nepteer. All Steam/⋯, face/D-pad/shoulder/trigger/rear/stick/trackpad controls remain unavailable. The raw-input-only path does not parse content or fabricate held/transitional events. Raw bytes never cross IPC or go to disk. See NEPTUNE_RESEARCH.md for primary sources and the reason for deferring decoding.

macOS native diagnostics return unsupported; explicit Simulated diagnostics exercises the same coordinator with labeled synthetic reports and no hardware. It is independent of telemetry mock selection and is never a Windows read-failure fallback. Existing Windows battery/WMI telemetry, settings and keyboard QAM shortcut remain. No controller action opens QAM. Steam Input may prevent opening or reporting, and shared access does not prove nondisruption; no universal coexistence claim is made.

No serial/instance-ID query, path logging/exposure, exclusive access, output/feature/configuration reports, write access, injection/mapping, firmware/haptics/LED changes, driver, admin requirement, service, autostart or new sensor/control is implemented. No Steam Deck Tools source was consulted/copied/translated. No hidapi/libusb/SDL dependency or runtime DLL is introduced; Windows supplies native HID/SetupAPI libraries through existing windows-sys (MIT OR Apache-2.0). Existing WebView2 and distribution notice/signing limitations remain.

## Local validation

Host: macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust 1.100.0. Exact final commands/results are recorded below; a check-only temporary compilation of the native adapter supplements but does not replace native Windows CI.

| Command                                   | Actual result                                                |
| ----------------------------------------- | ------------------------------------------------------------ |
| `git fetch origin`                        | Passed; branch created from updated main                     |
| `pnpm bindings`                           | Passed; generated controller DTOs                            |
| `pnpm bindings:check`                     | Passed; no-write drift check                                 |
| `pnpm format` / `pnpm format:check`       | Passed                                                       |
| `pnpm typecheck`                          | Passed                                                       |
| `pnpm lint`                               | Passed; zero warnings                                        |
| `pnpm test`                               | Passed; 27 tests in 4 files                                  |
| `pnpm rust:check`                         | Passed                                                       |
| `pnpm rust:test`                          | Passed; 23 tests, 1 intentionally ignored explicit generator |
| `pnpm rust:lint`                          | Passed; all-target Clippy with -D warnings                   |
| `pnpm build:web`                          | Passed; production Vite bundle                               |
| `pnpm build --bundles app`                | Passed; native executable and 10.53 MiB macOS app bundle     |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; no dependency package addition                       |
| `git diff --check`                        | Passed                                                       |

Rust tests cover conservative candidate/usage policy, multiple collections, missing metadata/no device/enumeration failure, opaque-ID privacy, stale scan IDs, opt-in/idempotent start/stop, single worker/resources, open/read/disconnect errors without reconnect, expiry, cancellation/join, length bounds, no decoded input, read-only transport/source API guard and main/QAM/unknown/remote IPC restrictions. Existing QAM/focus/telemetry tests remain. React tests cover unscanned/not-found/detected, selection/start/stop, real/simulated/unsupported labels, busy/denied/disconnect, retry, event ordering, unavailable controls, keyboard access and page cleanup, plus dashboard/QAM/settings regressions. These use synthetic readers/mock IPC/jsdom; they prove no actual Windows HID, game or physical input behavior.

Local output: `target/release/nepteer`, `target/release/bundle/macos/Nepteer.app`. No local Windows build/run, Steam Deck, game, real controller fixture or actual native HID access is claimed. Native app interactive GUI testing has not been performed for Step 4 on this host.

## Native CI and Windows artifact

Pending push/run completion. The final validated runtime commit, native run/job URLs and downloadable artifact will be recorded here after inspection. Expected artifact is `nepteer-windows-x86_64-<commit>` with `nepteer.exe` and `bundle/nsis/Nepteer_0.4.0-alpha.0_x64-setup.exe`, built natively under `target/x86_64-pc-windows-msvc/release/`. NSIS remains currentUser, manifest asInvoker/uiAccess=false, WebView2 already installed. CI success is build/test evidence, not Steam Deck validation.

## Manual handoff

Complete all 15 Step 4 items in WINDOWS_TESTING.md plus native five-minute expiry. Prioritize candidate metadata/privacy, read access versus silent handle, safe Steam Input coexistence, 20 Start/Stop repetitions, no stale input, QAM regression and process cleanup. Natural disconnect/access-conflict tests are optional when safely observable; do not unplug internal devices, disable Steam Input, terminate competing tools or modify drivers to force results. A blocked/silent shared interface is a valid diagnostic outcome. Unsupported exclusive fullscreen and anti-cheat environments remain outside the initial validation scope. Nothing is merged to main.
