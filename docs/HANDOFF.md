# Step 5A.1 handoff · v0.5.0-alpha.1

Branch `feat/neptune-button-correlation`, based on latest main `be08de79c369921dac541a5efcb4d4fc8762a4ca`. Step 5A was merged. **Actual probe hardware results remain pending; no mapping or framing is automatically promoted.** Nothing is merged to main.

## User-supplied evidence and scope

Windows 11 on Steam Deck LCD, Steam Deck Tools installed, Steam Controller.exe running in Desktop mode; separate Steam client/Steam Input status not independently confirmed. The reported mouse/keyboard/vendor collections are interface 0 (0x0001/0x0002, descriptor 6), interface 1 (0x0001/0x0006, descriptor 9), interface 2 (0xFFFF/0x0001, descriptor 65). Only the vendor interface is eligible. It supplied actual length 65, zero-prefixed candidate ID 0x00/type 0x09, 42,808 compatible candidates and zero unsupported/malformed reports, with intermittent idle and increased physical-test activity. These genuine aggregate observations support the narrow probe, not fully reviewed framing or per-control physical verification.

## Files and architecture

- New `src-tauri/src/neptune/correlation.rs`: safe aggregate DTOs/environment enums, pure fake-time-testable state machine, fixed preparation/idle/five-cycle/final schedule, native Instant deadline adapter, short-lived private prior-word comparison, bounded counters, token/revision/owner generation safeguards. No raw word/mask is serializable; no probe transition history is retained.
- `neptune/mod.rs`/`monitor.rs`: integrate with the one existing worker/reader, current selected native monitor gate, authoritative probe status in diagnostics snapshots, timed progress even on no-report reads and prompt terminal notification. Normal stop/rescan/error/disconnect/expiry/shutdown invalidates ownership. A completed old worker cannot accept a late probe start. Existing five-minute monitor expiry/cancellation/join and native physical-state suppression remain.
- `reports.rs`: internal helper delegates to the existing checked classifier and existing twelve-control mask table, accepting only exactly 65 zero-prefixed Deck-v1 bytes. No duplicated offset decoder. `windows.rs` only adds clearing the completed read buffer after copying; observer packet buffers are cleared after analysis. Native open/read/metadata/ownership APIs remain intact.
- `lib.rs`, `build.rs`, generated permissions and `capabilities/main.json`: three narrow main-only start/status/abort commands. QAM receives no new permission. CSP/navigation, manifest/NSIS policy, global shortcut and focus restoration are unchanged. Bindings regenerated from Rust.
- New `components/controller/PhysicalCorrelation.tsx` and tests: manual nominated control, separate consent/Start, environment labels defaulting to Unknown, Rust-driven guidance/countdown, always-available active Abort, aggregate table and Copy Safe Summary with manual-copy fallback. Parent Controller integration and monitor-generation key preserve cleanup. Reply revisions/tokens prevent stale results from replacing or aborting newer sessions. Existing App/Controller fixtures are extended for the DTOs; dashboard/QAM/settings tests remain.
- Workflow adds the feature branch; versions are 0.5.0-alpha.1. AGENTS, README and architecture/development/safety/research/testing/handoff docs reflect the implemented probe and exact missing evidence. No dependency is added/upgraded; existing license inventory/SDL notices remain applicable.

## Gate, schedule and aggregation

Start requires explicit consent, manual interface/control selection, an active native Windows monitor with the selected candidate/generation, observed deck_v1_zero_prefixed65, confirmed vendor usage-page >=0xFF00/usage 1 and descriptor length 65. The same existing shared GENERIC_READ handle supplies packets. Simulation, unsupported controls, stale generations/tokens, duplicate Start and incompatible metadata/format cannot create another session. Only exact-token Abort affects its session. UI environment labels are closed enums and change nothing in Steam Deck Tools/Steam/Input.

The fixed native schedule is preparation 0–4s, idle 4–7s, five cycles from 7–27s (each Press 1.5s, Hold 1s, Release 1.5s), final observation 27–29s. Normal evaluation is at 29s, with a hard 30s monotonic deadline. If completion was delayed to that deadline, result is inconclusive. Worker ticks at bounded read timeouts even without packets; status queries independently enforce the same deadline. React shows native milliseconds/phase and does not advance based on a JS timer or report counts. No timed Next action or competing reader is needed.

Baseline needs at least three identical words over >=500ms with all twelve known candidate bits released and fresh input at preparation end. For complete compatible packets, only XOR edges in the existing candidate word count: nominated rising/falling edges, popcount edges in the other eleven known masks, and separate popcount outside all twelve. Packet counters/analogs cannot affect counts. Repeated held samples add no press. Each cycle needs an in-window press, observed held-down sample and in-window release; initial state is not a historical edge. Missing/early/late/repeated/outside-phase and idle negative-control counts remain visible. Gaps >1.5s are counted once per gap and prevent positive evidence.

Observed requires baseline, five complete cycles, no nominated idle/outside-phase edges, no gaps and a compatible final released sample. It means **Observed candidate-bit correlation — pending independent review**, not physical verification. Unrelated known/unknown changes may be noise/contamination and stay review diagnostics rather than automatically declaring mapping failure. Missing/unstable/ambiguous timing or final samples are inconclusive; incompatible/malformed framing ends as error. First terminal reason is retained. Detailed exact counter overlap definitions are in NEPTUNE_RESEARCH.md.

## Privacy/safety review and limitations

No output/feature/configuration reports, write permission, exclusive access, tools/Steam shutdown, mode/HidHide/Lizard changes, driver/admin/service/startup, input injection, game hooks, controller remapping, sensors or power controls are added. Native physical states remain null, native transition history empty, framing_verified/physical_buttons_verified false and ButtonVerified unset. Physical Steam/⋯ never triggers QAM or sends OS input. Probe completion cannot update an allowlist.

Only aggregate DTOs and short phase/status data cross IPC, rate-limited with existing <=4Hz diagnostic summaries and prompt terminal events. Raw bytes never cross IPC or disk; no logging, export, analytics or remote upload exists. Private prior-word comparison state is cleared on termination; one aggregate result remains in memory until replaced/process exit. Copy Safe Summary whitelists build/version, numeric non-unique interface metadata, format/control/candidate bit, outcome/reason/time/counts and manual environment enums. It excludes private paths, serials, raw bytes/words/masks, scan IDs, session tokens and input history. User-initiated clipboard copying needs no native plugin/extra permission.

Synthetic tests cannot prove Windows HID coexistence, real finger timing, touchscreen prompt usability or physical bit semantics. A sparse stream (>1.5s gaps), tool-specific behavior, missed prompt or unrelated activity can legitimately be inconclusive. The fixed windows deliberately allow reaction time but are not proof of a human action. Native read cancellation still relies on the Windows driver completing canceled I/O before storage can be freed; a broken driver can delay monitor shutdown. The existing lifecycle serialization gate remains, while probe/data locks are never held across reads/joins/callbacks. No universal Steam Input/Steam Deck Tools or exclusive-fullscreen guarantee is made. Standard-user manifest, existing WebView2 requirement and unsigned-alpha/distribution license review limitations remain.

## Exact local validation

Host: macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust/Cargo 1.100.0.

| Command                                   | Actual result                                                  |
| ----------------------------------------- | -------------------------------------------------------------- |
| `git fetch origin`                        | Passed; branch created from updated main                       |
| `pnpm bindings`                           | Passed; explicit Rust DTO generation                           |
| `pnpm bindings:check`                     | Passed; no-write drift assertion                               |
| `pnpm format` / `pnpm format:check`       | Passed; Prettier/Rustfmt                                       |
| `pnpm typecheck`                          | Passed                                                         |
| `pnpm lint`                               | Passed; zero warnings                                          |
| `pnpm test`                               | Passed; 42 tests in 5 files                                    |
| `pnpm rust:check`                         | Passed                                                         |
| `pnpm rust:test`                          | Passed; 42 tests, one intentionally ignored explicit generator |
| `pnpm rust:lint`                          | Passed; all-target Clippy with -D warnings                     |
| `pnpm build:web`                          | Passed; production Vite bundle                                 |
| `pnpm build --bundles app`                | Passed; native executable/macOS app bundle, 10.72 MiB          |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; dependency package graph unchanged                     |
| `git diff --check`                        | Passed                                                         |

During implementation a synthetic test counter needed an explicit u32 before to_le_bytes; corrected without weakening checks. Test-only bindings declarations are conditionally compiled. The final checks pass; no test/security check was disabled. Final runtime checks and the native macOS build passed again after the transport-error/privacy refinements. Native CI evidence is recorded below after run inspection.

New pure tests cover exact format/metadata gate, unsupported controls, absent/multiple/unreleased baseline, five cycles, held deduplication, early/late/missing/repeated/idle edges, simultaneous/unrelated/unknown changes, counter-only changes, framing/malformed failure, gaps, deadline, token/duplicate/abort/owner reasons, no verification and private serialized fields. Synthetic worker tests cover one reader, stale monitor/token, Stop/Rescan/disconnect/framing change/expiry/shutdown and native physical suppression. Existing cancellation/parser/QAM/telemetry tests remain. React tests cover explicit selections/consent, ineligible/missing/simulated input, environment labels, guidance/countdown, native deadline, Abort/page departure/context change, safe copying, late start cleanup and stale-response protection, plus existing dashboard/QAM/settings regressions. These are synthetic transports/jsdom, not actual Windows hardware tests.

Local outputs: `target/release/nepteer`, `target/release/bundle/macos/Nepteer.app`. Not run locally: Windows build/installer execution, interactive native GUI audit or real Steam Deck probe/coexistence tests. Native Windows build/packaging is delegated to CI; physical checks remain a user task.

## CI / Windows artifact

Pending push and native CI inspection. Expected artifact `nepteer-windows-x86_64-<commit>` contains `nepteer.exe` and `bundle/nsis/Nepteer_0.5.0-alpha.1_x64-setup.exe`, built natively under `target/x86_64-pc-windows-msvc/release/`. All validation steps, MSVC/NSIS, both-output checks and asInvoker/uiAccess=false manifest verification must pass. This section will record actual run/job/artifact URLs after inspection. CI cannot establish physical verification.

## Real Deck handoff / required human review

Follow all 24 Step 5A.1 items in WINDOWS_TESTING.md. Retain the user-reported Steam Deck Tools Desktop-mode baseline without disabling tools or changing drivers/security. Independently label Steam/Input status when known. Manually observe the eligible 65-byte collection, start normal monitoring, then nominate A, consent and Start Probe. Rest hands during preparation/idle, follow five timed press/hold/release cycles, keep final release and inspect safe aggregates. Repeat B/X/Y, then Steam and ⋯ separately, D-pad/L1/R1, negative/idle and optional safe simultaneous-control tests. Test Abort, Stop, rescan/page departure, deadline/expiry, repeated sessions, tool coexistence, keyboard QAM, native unavailable cards and clean shutdown/uninstall. Share only safe summary/context.

Observed results require independent per-control developer review of repeatability, false positives, unrelated changes, delivery gaps and environment before any future mapping acceptance. Do not equate a matching schedule with actual verified finger actions. No automatic promotion, native physical event publication or controller QAM action is implemented. Do not merge before code review and hardware testing.
