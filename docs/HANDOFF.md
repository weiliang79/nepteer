# Step 5C.1 — D-pad physical correlation and QAM navigation readiness

Branch `feat/neptune-dpad-correlation`, based on latest merged main `245480a1bbac357b4661805fb6cfa7f8b5b1fbd0` (Step 5B, PR #6). Fetched upstream, confirmed a clean checkout and that the main tree matches the reviewed Step 5B implementation before branching. The user reports Step 5B physically tested on Deck LCD/Windows 11/Steam Deck Tools Desktop mode. **No physical D-pad evidence has been provided. No navigation or input isolation is implemented.** Production version remains 0.5.0-alpha.2; this readiness milestone does not need a runtime/version/dependency migration. No merge is performed.

## Audit result and exact changes

The existing probe is sufficient for independent D-pad Up/Down/Left/Right correlation; no parser, monitor, correlation algorithm, shortcut or QAM runtime fix was justified. Audited mappings remain Up 8, Down 11, Left 10, Right 9. All share the existing checked zero-prefixed65 parser, native source/monitor ownership gate, preparation/idle/five cycles/final release, <30s deadline, cancellation and safe aggregates. Simulated source, unsupported controls/framing and stale owners are rejected. No native button events or verification promotion follow a probe.

- `PhysicalCorrelation.tsx`: conditional D-pad testing guidance — disarm first, exact manually selected reviewed collection, all released, one direction/no primary diagonals, original timed prompts, hands off pads/sticks, repeat fresh sessions, desktop/no active game and no navigation/isolation claim. No new state machine or probe.
- `PhysicalCorrelation.test.tsx`: four parameterized UI cases check independent direction selection, the guidance, consent, original Start request/press prompt and Abort availability.
- `neptune/correlation.rs`: tests only, covering all four exact candidate lookups/five-cycle scalar evidence, idle/opposite/A/B negatives, diagonal/multi-bit contamination, unknown edges, framing and initially held baseline. Published bits/production code are untouched.
- `.github/workflows/ci.yml`: add the requested branch to the existing native CI triggers; keep every validation, build, manifest and upload step.
- `NEPTUNE_RESEARCH.md`, `WINDOWS_TESTING.md`, `ARCHITECTURE.md`, `SAFETY.md`, this handoff: scope/evidence distinction, positive/repeat/negative/secondary matrices, safe copying, concrete current QAM focus audit and conceptual Step 5C.2 contract, pass-through limitation and independent review requirements.

Rust DTOs/generated bindings, capabilities/CSP, read-only native access, one-reader policy, Step 5B Arm diagnostics, 350ms cooldown, 30-minute shortcut/five-minute monitor/30-second probe limits and current QAM keyboard/touch/focus behavior are unchanged. AGENTS/README retain the production Step 5B specification; no new runtime convention/functionality is introduced. Historical milestone sections below preserve their original evidence context rather than asserting current pending/merge state.

## Evidence and future navigation gates

Use the Step 5C.1 matrix at the top of WINDOWS_TESTING.md. Require two fresh five-cycle positives per direction plus idle/opposite/A/B negative summaries for each. Negative runs can be inconclusive because no nominated cycles occur; inspect actual counters, sample availability and unrelated activity. Unknown-bit changes are diagnostics, not automatic mapping failures. A diagonal can yield observed nominated timing while unrelated-known edges increase: do not accept that as a clean primary direction test. Secondary A-held+Up, B-held+Down, Steam-held+Left and optional ⋯-held+Right only follow reviewed individual evidence; establish released preparation/idle first and document tool side effects without changing tools. Copy each safe aggregate before the next Start; no raw bytes/paths/serials/history or automatic upload.

The audited QAM has six buttons: Close → enabled Refresh battery → Performance → Controller → Display → Settings. All expanded sections are informational; no settings are adjustable in QAM. Every visible notification focuses Close/refreshes telemetry; Escape requests native Hide and Tab wraps enabled buttons. Proposed Step 5C.2 actions are Previous/Next/Left/Right/Activate/Back, scoped only to local QAM from the existing armed worker. The design includes native visibility epoch/generation/deadline fencing, four bounded pending actions plus one acknowledged delivery, no initial held/repeat/diagonal actions, and no global keyboard simulation. It is documentation only, not an emitted event/API. Left/Right are no-ops for current controls. Physical direction/A/B reviews and desktop-only implementation tests remain prerequisites.

User-reported game input pass-through is expected for shared observation. Navigation would let Nepteer react, while isolation would stop game reactions; the latter is not provided by focus/visibility or this architecture. Step 5C.2 starts on the Windows desktop without an active game. Gameplay navigation needs separate routing feasibility/review because duplicate actions can reach both. No exclusive access, interception, remapping, emulation/injection, game hook or Steam/Tools reconfiguration is introduced or authorized.

## Validation / artifacts

Local validation passed on macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust 1.100.0:

| Exact command                             | Result                                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| `git fetch origin`                        | Passed; latest main is requested PR #6 merge            |
| `pnpm format` / `pnpm format:check`       | Passed; Prettier and Rustfmt                            |
| `pnpm typecheck` / `pnpm lint`            | Passed; zero ESLint warnings                            |
| `pnpm test`                               | 65 passed in 6 files (15 physical correlation UI cases) |
| `pnpm bindings:check`                     | Passed; generated bindings unchanged                    |
| `pnpm rust:check`                         | Passed                                                  |
| `pnpm rust:test`                          | 62 passed, one intentionally ignored explicit generator |
| `pnpm rust:lint`                          | Passed; all-target Clippy with -D warnings              |
| `pnpm build:web`                          | Passed; production Vite build                           |
| `pnpm build --bundles app`                | Passed; actual macOS executable / 10.96 MiB app bundle  |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; no new dependencies                             |
| `git diff --check`                        | Passed                                                  |

Explicit binding generation was unnecessary because no DTO changed; the read-only drift assertion passed independently and in the Rust suite. Four added Rust tests and four parameterized frontend cases provide direction-specific coverage; existing cancellation, no-write/privacy, one-reader conflicts, Arm diagnostics and QAM/telemetry/settings tests remain enabled. No native production Rust change, new permission or test weakening occurred.

Native macOS/Windows CI and matching Windows artifact are pending push for this branch. Not run locally: Windows installer execution, actual D-pad/probe/GUI/game/tool coexistence tests. Synthetic results cannot establish actual D-pad mappings, Windows GUI behavior, Steam Input coexistence or isolation. Physical matrix and reviewer decisions remain pending. Existing Step 5B historical logs below are not Step 5C.1 results.

---

# Step 5B stabilization — observable physical shortcut Arm attempts

Still v0.5.0-alpha.2 on `feat/neptune-qam-shortcut`, reviewed base `21bf467aa5163cbe0a695f5f823d600c63867720`. No new milestone or merge. User reports physical ⋯ successfully toggled QAM during gameplay. This fix has not been retested on the Deck.

## Findings and uncertainty

Proven code gaps: preflight rejections left no native attempt record while phase correctly stayed Disarmed; disabled Arm lacked an immediate prominent explanation; pending IPC had no visible request-sent indication; worker open errors shared a generic read-failure issue. Unexpected worker unwinding previously had no terminal-state guard. Original polling/accept did not clear caught frontend errors, so no evidence supports that suspected cause. Controller cleanup issues asynchronous Stop and can briefly retain the reader slot while navigation proceeds. Native monitoring actively owning the reader is a valid rejection, not permission for takeover.

The exact game-close failure is unproven without the new hardware summary. No game-close callback/process observation exists. Read/disconnect/open/format errors or expiry terminate safely; later silence only invalidates baseline. We do not claim the game reconnects or reconfigures HID.

## Changes and lifecycle review

- `neptune/shortcut.rs`: Rust enums and one bounded attempt record separate from phase, safe rejection/termination reasons, staged HID open/report/baseline evidence, worker state and rescan recommendation. Open-versus-read failures and unexpected unwinding are distinguished; handle cleanup precedes terminal state. Old worker progress cannot replace a newer rejected attempt. Existing input semantics/fence/dispatch remain.
- `neptune/mod.rs`: record every accepted Arm IPC attempt, including consent/source/ownership/candidate/generation rejection; emit after unlocking. Keep one worker slot and join completed workers before replacement. Separate monitor/probe/shortcut conflicts and spawn-failure diagnosis; disarm/shutdown reasons survive cleanup.
- `PhysicalQuickAccess.tsx`, `lib/physical-shortcut.ts`: immediate pending/duplicate suppression, always-visible preflight/failure/recovery, sticky errors, native attempt/termination display, generation+revision and request-identity ordering, safe Disarm→Arm sequencing, whitelist-only copy action. Existing Controller UI already displays Start Monitoring rejection. Generated bindings and existing fixture types updated; no new IPC command/capability/dependency/version bump.
- New Rust/React regressions cover Disarmed+explicit rejection, consent/source/profile/stale selection/generation, monitoring/probe conflicts, Stop→Arm/Disarm→Arm, spawn/open/access/busy/read/panic/silence failures, recovery and single-reader preservation, pending polls/late events/responses/errors, compact navigation and sanitized copying. Prior invalid-ticket/no-write/ACL/QAM/focus/timing tests remain.

Native lifecycle lock ordering stays operations→short-lived state/data/probe locks; reader I/O, thread joins and QAM/event callbacks never hold shortcut status locks. Rejection notification releases operations first. Worker unwind drops the reader using existing safe cancel/drain before reporting terminal status. No additional handle, automatic reconnect, input history or device/game write is introduced. Only the reviewed bit-50 QAM route remains; 350ms cooldown and all three session limits are unchanged.

## Validation / CI

Local validation passed on macOS arm64:

| Command                                   | Result                                                 |
| ----------------------------------------- | ------------------------------------------------------ |
| `pnpm bindings`                           | Passed; explicit DTO generation                        |
| `pnpm format` / `pnpm format:check`       | Passed, Prettier and Rustfmt                           |
| `pnpm typecheck` / `pnpm lint`            | Passed, zero lint warnings                             |
| `pnpm test`                               | 61 passed in 6 files, including 18 shortcut UI tests   |
| `pnpm bindings:check`                     | Passed, no-write drift check                           |
| `pnpm rust:check`                         | Passed                                                 |
| `pnpm rust:test`                          | 58 passed, 1 intentionally ignored explicit generator  |
| `pnpm rust:lint`                          | Passed, all-target Clippy with -D warnings             |
| `pnpm build:web`                          | Passed; also rebuilt by native beforeBuildCommand      |
| `pnpm build --bundles app`                | Passed, actual macOS executable / 10.96 MiB app bundle |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; no dependency changes                          |
| `git diff --check`                        | Passed                                                 |

Five new Rust tests cover rejection/preflight, diagnostic+probe ownership/recovery, stale scans/spawn failure, immediate open/read/unexpected failures with replacement, and no-report expiry. Eleven additional shortcut UI cases cover pending/duplicate prevention, real interval polling, rejection/retry, stale events/generations/IPC responses, worker termination in compact view, safe error text/copying, Disarm fencing a late rejected Arm, and subscription failure with polling fallback. Initial TypeScript fixture errors were corrected by extending the existing test DTOs; no check or permission was disabled.

Fix commit `a0e9366f7b4d91c13623492f311a98e258d40bcc`: [Desktop CI run 44897797106](https://github.com/weiliang79/nepteer/actions/runs/44897797106) passed on both native platforms.

- [macOS job](https://github.com/weiliang79/nepteer/actions/runs/44897797106/job/136827075156): all validation and native app bundle passed.
- [Windows job](https://github.com/weiliang79/nepteer/actions/runs/44897797106/job/136827074987): all validation, x86_64 MSVC/NSIS build, manifest/output verification and uploads passed.
- Both logs confirm 61 frontend tests, 58 Rust tests passed, one explicit generator ignored and `bindings_are_current` passed. No checks were skipped to enable packaging; opposite-platform-only build steps remain conditional as before.
- [Windows executable and installer artifact](https://github.com/weiliang79/nepteer/actions/runs/44897797106/artifacts/14704324896), tied to the fix SHA above: `nepteer.exe` (10,056,704 bytes) and `bundle/nsis/Nepteer_0.5.0-alpha.2_x64-setup.exe` (2,197,323 bytes). Logs confirm `Verified executable manifest: asInvoker, uiAccess=false`; current-user NSIS/WebView2 configuration is unchanged.

Subsequent handoff-only commits do not change this implementation. Prior Step 5B evidence below remains historical and tied to its tested SHA. Exit the previous Nepteer process before installing this same-version diagnostic build; confirm the Last Arm Attempt and Copy Shortcut Diagnostic Summary controls are present. Actual game-close reproduction, Windows installer execution, new interactive GUI/focus/coexistence tests and the focused checklist at the top of WINDOWS_TESTING.md remain pending on hardware. CI does not establish their success. Do not merge.

---

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
