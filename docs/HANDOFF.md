# Step 5B handoff · v0.5.0-alpha.2

Branch `feat/neptune-qam-shortcut`, based on main `6f1ecdd584ea8f3d53b2d4f38c7902ed3092215d`. Previous milestones were merged. **New physical shortcut integration tests remain pending before merge.** Supplied correlation evidence authorizes the narrow path below, not a universal compatibility claim. Nothing is merged to main.

## Evidence and exact scope

User-reported LCD/Windows 11 tests used Steam Deck Tools installed with Steam Controller.exe Desktop mode, Steam running and Steam Input status unknown. The selected physical collection was VID 28DE/PID 1205, interface 2, usage FFFF/0001, descriptor/actual length 65, deck_v1_zero_prefixed65. A/B/X/Y/Steam/Quick Access had positive correlations. Quick Access full-word bit 50 showed five presses/releases, stable released baseline, no missing/early/late/idle transitions or gaps, distinct Steam bit 13, a Steam-only negative control without QAM edges and five QAM cycles while Steam was held. Only Quick Access is authorized for production handling; Steam and face buttons remain excluded. Actual new arm/disarm/focus/coexistence behavior has not been hardware-tested by the agent.

## Changed files / architecture

- New `neptune/shortcut.rs`: exact metadata gate, pure bit-50 edge/baseline/cooldown/deadline logic, safe DTOs, private generation/deadline fence, bounded dispatcher state, thirty-minute worker and synthetic unit/integration tests. No raw states or individual press history are public.
- `neptune/mod.rs`: common discovery and one tagged worker slot coordinate mutually exclusive diagnostic/probe versus shortcut modes. Explicit mode conflicts require stop/disarm; no automatic takeover/restart. Native app shutdown invalidates shortcut work before joining. The five-minute diagnostic and thirty-second probe bounds stay intact.
- `quick_access.rs`: existing perform/coordinator path now accepts an optional physical ticket; after acquiring QAM coordination it validates the fence immediately before applying the same Action::Toggle. Existing normal keyboard/dashboard show/hide/query/focus/blur/placement code is reused. One bounded physical drainer prevents per-report/per-press unbounded tasks. Old failures/actions cannot affect a newer generation.
- `windows.rs`: existing native shared reader remains, with stricter revalidation that actual usage matches the selected metadata in addition to VID/PID/length. No new API, output/configuration operation, DLL or dependency is introduced.
- `lib.rs`, `build.rs`, main capability, generated permissions and bindings: three main-only shortcut arm/disarm/status commands and scoped status event. QAM capability/CSP/navigation are unchanged. Existing local/other-window/remote IPC tests cover the added commands with valid argument shapes; status starts Disarmed.
- New `components/shortcut/PhysicalQuickAccess.tsx`/tests and `lib/physical-shortcut.ts`: explicit setup on Dashboard/Settings, manual native rescan/cached discovery/select, reviewed-environment acknowledgment, consent/Arm and persistent main-app Disarm/status bar on other pages. Native revisions prevent stale state revival. This App-owned component does not disarm on navigation, minimization or document visibility changes. It does not cache QAM visibility or send HID data through React.
- App/Controller/probe/QAM copy and tests distinguish diagnostic events from the separate armed route. Existing themes/units/provider/telemetry and keyboard/dashboard QAM behavior remain. Workflow includes feature branch; all version fields become 0.5.0-alpha.2. Requested docs/AGENTS updated, with 28 hardware checks. Dependency graph and license inventory are unchanged.

## Lifecycle, edge semantics and cancellation

Explicit Arm requires consent/context acknowledgment, cached manual selection, native Windows source and exact metadata: 28DE:1205, interface 2, FFFF/0001, descriptor 65, verified attributes/read eligibility. The acknowledgment is not automatic detection of LCD, tools mode or Steam status. No reader/probe may already be active; a terminal old worker is joined before another opens. The same read-only adapter validates every packet through the existing exact65 classifier (zero prefix, body version 1/type09/declared64). There is no bare64/keyboard/mouse/virtual Xbox/source/bit fallback.

States include Disarmed, Arming, WaitingReports, WaitingBaseline, Armed, Disarming, Expired, Disconnected, AccessDenied/Busy, UnsupportedInterface/Format and Error. Arm starts validation, not an immediate input press. Initial silence beyond five seconds closes with an error. At least three actual released reports spanning 200ms establish the bit-50 baseline; initial held state must release first. Only a later released→pressed edge requests Toggle. Holds/releases and Steam/face bits never act; Steam held does not block a released QAM baseline.

A defensive 350ms interval between accepted observed presses bounds glitch/burst activity. Shorter presses are discarded entirely while held state still updates, so no delayed toggle occurs when cooldown expires. Valid longer cycles remain distinct. This is report-arrival timing, not proof of finger timing if a driver buffers input. >1.5s no-report gaps invalidate held/baseline state without synthesizing release, requiring fresh stable release. Incompatible framing, read/disconnect/access error terminates the session without retry/reconnect. Thirty minutes is native monotonic time starting at Arm, applied also to queued tickets. Explicit rearm creates a new generation/baseline; no preference, startup arm, auto-renewal or diagnostic-worker restart loop exists.

At most four pending physical tickets plus one in-flight action share a single drainer. Overflow/QAM operation failure ends the session safely. After QAM lock acquisition, ticket execution checks current generation and native deadline. Disarm invalidates/clears pending work before cancellation/join and waits out any already-started native action via a separate barrier; it cannot force-cancel a window API midway. No old pending action toggles after Disarmed returns. Stale dispatch failure is generation checked atomically and cannot cancel a newly rearmed session. No HID reader/status lock is held during native UI operations/callbacks. Shutdown invalidates before background cleanup; the same safe overlapped I/O cancellation/drain frees storage only after completion. Broken drivers/window APIs can delay cleanup; no forced kill or hard shutdown deadline is promised.

## Privacy, safety and known limitations

No HID output/feature/write/exclusive/configuration, driver/admin/service/tray/autostart, input injection/emulation/remapping, Steam shortcut, game hook/anti-cheat interaction, firmware/Lizard/HidHide control, new sensor/power control or tool communication is added. No Steam Deck Tools source is consulted/copied/translated. Raw packets/word/held state and individual press history remain private, ephemeral and unlogged/unpersisted; only source/owner/phase/time/safe metadata/generation/revision/issue reach main IPC. Normal physical diagnostic events/history remain unavailable; automatic verification promotion is still absent. Only the private reviewed QAM request path is enabled.

The exact metadata plus user-confirmed environment is a compatibility scope, not identification of every possible model/firmware with those IDs. Other modes/software/hardware remain unvalidated. Steam Deck Tools/Steam can independently react to ⋯ or open another overlay. Nepteer does not suppress or reconfigure those actions; users should disarm and record conflict. Exclusive fullscreen, elevated/Secure Desktop, virtual desktop and anti-cheat environments retain prior limitations. Existing focus restoration is best effort; no synthesized input or repeated forcing. New thirty-minute app-owned observation intentionally survives navigation/minimization, while exit/restart ends it. Unsigned distribution, existing WebView2 requirement and full third-party notice/signing audit remain limitations; no new dependency/license review is needed.

## Exact local validation

Host: macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust/Cargo 1.100.0.

| Command                                   | Actual result                                                   |
| ----------------------------------------- | --------------------------------------------------------------- |
| `git fetch origin`                        | Passed; branch created from updated main                        |
| `pnpm bindings`                           | Passed; explicit Rust DTO generation                            |
| `pnpm bindings:check`                     | Passed; no-write drift assertion                                |
| `pnpm format` / `pnpm format:check`       | Passed; Prettier and Rustfmt                                    |
| `pnpm typecheck`                          | Passed                                                          |
| `pnpm lint`                               | Passed; zero warnings                                           |
| `pnpm test`                               | Passed; 50 tests in 6 files                                     |
| `pnpm rust:check`                         | Passed                                                          |
| `pnpm rust:test`                          | Passed; 53 tests, one intentionally ignored explicit generator  |
| `pnpm rust:lint`                          | Passed; all-target Clippy with -D warnings                      |
| `pnpm build:web`                          | Passed; production Vite bundle                                  |
| `pnpm build --bundles app`                | Passed; actual native executable and 10.94 MiB macOS app bundle |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; dependency graph unchanged                              |
| `git diff --check`                        | Passed                                                          |

One pre-existing React telemetry-status assertion became ambiguous when a second status region was added; it was scoped to the intended telemetry message while retaining its status-role check. No test/check/permission was disabled. Final tests/builds pass.

Rust covers exact gate/wrong IDs/interface/usage/length/source, released/initial held baseline, one press/release/long hold, rapid cycles and cooldown, Steam/face negatives and Steam-held+QAM, malformed/unknown formats, gaps/timeouts/expiry, bounded queue, stale generation/deadline/dispatch failure, disarm execution barrier, synthetic access/read/disconnect errors without reconnect, repeated/concurrent arm/disarm, one-reader conflicts, shutdown and dispatch outside reader locks. Existing QAM coordinator tests cover mixed keyboard/physical/dashboard toggles plus Escape/Close/blur/native actual visibility; existing parser/probe/telemetry/cancellation/IPC regressions remain. React tests cover disabled/explicit arm/consent/profile/context, conflict/error/status/countdown, expiry/restart baseline, Disarm, stale events, app navigation/document visibility and QAM independence, plus prior dashboard/Controller/probe/QAM/settings tests.

Local outputs: `target/release/nepteer`, `target/release/bundle/macos/Nepteer.app`. Not run locally: Windows compile/installer execution, interactive native GUI/focus audit, actual physical shortcut press/hold/debounce, thirty-minute hardware session, Steam Deck Tools coexistence or game tests. Windows compilation/packaging belongs to native CI; hardware results remain pending. Synthetic/fake backend/jsdom tests do not prove OS activation or actual controller compatibility.

## CI / Windows artifact

Implementation commit `9b5adcb`, documentation/CI-trigger commit `eb631ba3701914101043299a5426599922df5859`. [Desktop CI run 44873112355](https://github.com/weiliang79/nepteer/actions/runs/44873112355) passed on both native platforms:

- [macOS job](https://github.com/weiliang79/nepteer/actions/runs/44873112355/job/136751814507): all validations and actual macOS application bundle succeeded.
- [Windows job](https://github.com/weiliang79/nepteer/actions/runs/44873112355/job/136751814765): all validations, x86_64 MSVC build, NSIS packaging, output/manifest checks and artifact upload succeeded.
- Both jobs: 50 frontend tests passed; 53 Rust tests passed, one explicit generator intentionally ignored; `bindings_are_current` passed within the Rust suite. Formatting, TypeScript, ESLint, Rust check, all-target Clippy and production frontend build succeeded.
- [Windows executable + installer artifact](https://github.com/weiliang79/nepteer/actions/runs/44873112355/artifacts/14694836494), `nepteer-windows-x86_64-eb631ba3701914101043299a5426599922df5859`. Contains `nepteer.exe` (10,013,696 bytes) and `bundle/nsis/Nepteer_0.5.0-alpha.2_x64-setup.exe` (2,190,222 bytes), uploaded from `target/x86_64-pc-windows-msvc/release/`.
- Extracted executable manifest verification printed `Verified executable manifest: asInvoker, uiAccess=false`. Existing current-user NSIS configuration and WebView2 requirement are preserved. Installer execution and actual standard-user device operation still require manual testing.

This evidence is tied to the exact tested commit above. Subsequent handoff-only commits do not change the implementation. CI cannot establish new hardware success; no merge has been performed.

## Real Deck handoff

Run all 28 checks in WINDOWS_TESTING.md before merge: startup Disabled, manual exact interface/context/consent/Arm, initial held and released baseline, one toggle per press, long holds/releases, twenty cycles/rapid taps, Steam/face negatives and Steam-held+QAM, keyboard/dashboard/Escape/blur/focus mix, desktop/borderless placement/coexistence, duplicate external overlays, explicit disarm from any main page, repeated/concurrent mode switching, real expiry/manual rearm, naturally observable errors and clean exit/restart/uninstall. Do not stop tools, alter drivers/firmware, force disconnects or test anti-cheat games. Record only safe status/context; no raw streams/paths/serials/history. Do not merge until code review and new Windows Deck integration tests are completed.
