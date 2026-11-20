# Step 5A handoff · v0.5.0-alpha.0

Branch `feat/neptune-input-decoding`, based on updated main `fdafc925451d2ae2753e54ad6b188d9b728c2bbd`. Steps 1–4 passed user-reported Windows Deck checks. **No Step 5A Windows framing or physical button correlation was supplied or verified.** This delivers the explicitly allowed offline candidate-parser phase. No physical mapping is enabled and nothing is merged to main.

## Implementation and changed components

- `neptune/reports.rs`: original checked-slice candidate classifier, explicit little-endian button-word interpretation, twelve Phase 1 candidate mappings, pure baseline/transition model, 32-entry session-only history and evidence gate. No unsafe parsing, header searching or analog/sensor parsing. Native mode never publishes button values/transitions; explicit simulation does. Unsupported content and malformed known candidates are distinct; neither fabricates releases.
- `neptune/mod.rs`, `monitor.rs`: Rust-owned recognition/verification/error/history DTOs, deterministic simulated source, parser work outside the state mutex, terminal-state input cleanup and worker regression tests. Existing native reader, discovery and shared GENERIC_READ path are unchanged. One opt-in worker, 100 ms read waits, five-minute expiry, manual rescan/retry, cancellation/drain/join and four-Hz summary events remain.
- Controller UI/tests, App test fixtures, IPC active-phase helper and CSS: safe format identity/count/error panel, explicit three evidence levels, candidate versus simulated per-control labels, held/released/unavailable grid and at most 32 ordered source-labeled transitions with session times. Terminal/unsupported/malformed states cannot leave an active highlight. Existing Dashboard/Settings/QAM behavior and regression tests remain.
- Generated TypeScript bindings reflect Rust authority; the existing explicit generator and read-only drift check are retained. Package/Cargo/Tauri versions become 0.5.0-alpha.0. CI includes the feature branch and preserves all validations and native packaging.
- AGENTS, README, architecture/development/safety/research/Windows/handoff docs explain current scope and missing evidence. SDL/Valve source revision and conservative upstream notices are recorded; no dependency package is added or upgraded.

## Candidate layouts, evidence and limitations

Immutable public sources and the format-evidence table are in [NEPTUNE_RESEARCH.md](NEPTUNE_RESEARCH.md). Primary references are SDL revision `28736f296913b3f54d31cf404a82683ab2ad3a78` (`SDL_hidapi_steamdeck.c`, Valve-authored `controller_structs.h` and `controller_constants.h`) and Microsoft HID report/descriptor documentation. The published SDL body is 64 bytes with LE u16 version 1, message type 0x09 and declared length 0x40; the button word is LE u64 at message bytes 8–15. `deck_v1_bare64` implements that **candidate**. `deck_v1_zero_prefixed65` additionally tests a proposed zero HID-ID prefix motivated by Windows HID length conventions; it is not a claim that Windows supplies that variant. Type 0x09 is not a HID report ID. Bare-message HID ID stays unidentified.

Candidate full-word bits are A/B/X/Y = 7/5/6/4, D-pad U/D/L/R = 8/11/10/9, L1/R1 = 3/2, Steam = 13, ⋯ = 50. These published facts are used only for synthetic observations. Digital triggers, rear buttons, stick clicks, trackpad touch/click, analog values, gyro and all other fields are unsupported. Actual Windows report cadence, interface format and every physical mapping remain unknown.

Level 1 means candidate published facts/synthetic logic. Level 2 needs independent Windows identity/length/structural observations. Level 3 needs each physical control's repeatable independent press/release correlation and no unrelated false transitions. This build has no physical allowlist or promotion command/toggle; byte matches and CI never set framingVerified/physicalButtonsVerified. All native controls remain null and native transitions empty. Simulation is explicit, source-preserving and cannot verify hardware. A working simulated A mapping says nothing about physical A or any other control.

The first valid state establishes a baseline without a press. Repeated held states create no edge. Complete valid changes yield deterministic press/release order. Unknown formats reset baseline/history; format/interface/session changes also reset. Malformed content invalidates displayed input but preserves valid baseline/history, generating no release or duplicate recovery press. Timeouts create no release. Stop/error/disconnect/expiry clears current state/history. Only bounded summaries cross IPC; raw bytes remain private, ephemeral and unrecorded.

## Safety/privacy and dependency review

Reviewed the diff: `windows.rs`, capabilities, native command surface, CSP, window/navigation restrictions, manifest and installer policy are unchanged. There are no HID writes/output/feature/configuration operations, special reporting modes, exclusive fallback, serial/path exposure, raw export, disk input history, driver/admin/service/startup changes, injected input, game hooks, mappings or physical controller-to-QAM actions. No Steam Deck Tools source was consulted/copied/translated. Existing Windows focus/fullscreen restrictions remain.

The existing windows-sys dependency is still the only HID binding, with inbox Windows DLLs and no new runtime package. SDL/Valve protocol facts are attributed at an immutable revision; the original Nepteer implementation does not mechanically translate SDL driver source. Zlib notices are retained in THIRD_PARTY_NOTICES.md. Broader distribution license/signing review remains outstanding. No project-wide compatibility certification is made.

Steam Input coexistence is preserved architecturally, not newly guaranteed by tests. Shared read can still be denied/busy/silent; no fallback changes ownership or configuration. Windows must complete canceled I/O before its memory is freed; a broken kernel driver can delay shutdown. These existing limits remain documented.

## Exact local validation

Host: macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust/Cargo 1.100.0.

| Command                                   | Actual result                                                  |
| ----------------------------------------- | -------------------------------------------------------------- |
| `git fetch origin`                        | Passed; created feature branch from updated main               |
| `pnpm bindings`                           | Passed; explicitly generated Rust-owned DTOs                   |
| `pnpm bindings:check`                     | Passed; no-write drift assertion                               |
| `pnpm format` / `pnpm format:check`       | Passed; Prettier and Rustfmt                                   |
| `pnpm typecheck`                          | Passed                                                         |
| `pnpm lint`                               | Passed; zero warnings                                          |
| `pnpm test`                               | Passed; 31 tests in 4 files                                    |
| `pnpm rust:check`                         | Passed                                                         |
| `pnpm rust:test`                          | Passed; 31 tests, one intentionally ignored explicit generator |
| `pnpm rust:lint`                          | Passed; all-target Clippy with -D warnings                     |
| `pnpm build:web`                          | Passed; production Vite build                                  |
| `pnpm build --bundles app`                | Passed; native executable and 10.55 MiB macOS app bundle       |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; no new package/dependency license graph                |
| `git diff --check`                        | Passed                                                         |

During implementation, typecheck identified old test fixtures missing the new DTO fields; fixtures were updated rather than weakening types. Final checks passed with no disabled tests or loosened permission.

Rust tests include known/unknown prefix/type/version, exact/truncated/oversized/invalid lengths, arbitrary slices, independent byte/mask fixtures, simultaneous/repeated held states, initial baseline, ordered press/release, bounded history, malformed recovery without false release, format/unknown resets, native evidence gate, source preservation, timeout/cancel/disconnect/stop/restart/expiry cleanup, read-only API guard and existing IPC/QAM/telemetry coverage. React tests cover candidate physical suppression, simulated pressed/released/unsupported states, history/source/session labels, malformed/unknown diagnostics, terminal stale cleanup, Start/Stop/Rescan/retry, keyboard access and existing dashboard/QAM/settings regressions. Synthetic tests do not prove Neptune compatibility or physical button semantics.

Local outputs: `target/release/nepteer` and `target/release/bundle/macos/Nepteer.app`. Not run locally: Windows compilation/installer execution, interactive macOS GUI audit, actual Steam Deck input, Steam Input/game/coexistence tests, physical framing/bit correlations. Native Windows build is delegated to CI; actual hardware validation remains a separate user task.

## Native CI and Windows artifacts

Implementation commit: `9510f1f`; research/CI/handoff commit: [`c2c76faea110a35c83e8c1f095b178dfc352eb75`](https://github.com/weiliang79/nepteer/commit/c2c76faea110a35c83e8c1f095b178dfc352eb75). [Native CI run 44786198786](https://github.com/weiliang79/nepteer/actions/runs/44786198786) **passed on macOS and Windows**. Job summaries and decoded logs were inspected:

- [macOS job 136461602276](https://github.com/weiliang79/nepteer/actions/runs/44786198786/job/136461602276): all applicable validation, 31 frontend tests, 31 Rust tests (one ignored explicit generator), binding drift assertion, Clippy, production macOS bundle and license upload passed.
- [Windows job 136461602663](https://github.com/weiliang79/nepteer/actions/runs/44786198786/job/136461602663): all validations and the same test counts, x86_64 MSVC executable, NSIS packaging, both-output/manifest verification and uploads passed. The actual built executable manifest was checked as **asInvoker, uiAccess=false**. Only platform-inapplicable packaging steps were skipped.

[Download Windows artifact](https://github.com/weiliang79/nepteer/actions/runs/44786198786/artifacts/14655485088): `nepteer-windows-x86_64-c2c76faea110a35c83e8c1f095b178dfc352eb75`, ID `14655485088`, 5,144,903-byte ZIP. Output/build/upload logs confirm `nepteer.exe` (9,629,696 bytes) and `bundle/nsis/Nepteer_0.5.0-alpha.0_x64-setup.exe` (2,124,182 bytes), built under `target/x86_64-pc-windows-msvc/release/`. Digest: `sha256:a80d81a25f72966a934616115442d1bd1c7317daa2a42cb713ff5d9380339db5`. License artifacts: [Windows](https://github.com/weiliang79/nepteer/actions/runs/44786198786/artifacts/14654651546), [macOS](https://github.com/weiliang79/nepteer/actions/runs/44786198786/artifacts/14655345888).

Installer remains currentUser with existing WebView2 required. This documentation-only follow-up records validated runtime/artifact provenance above. CI cannot verify physical input behavior and does not promote any evidence level. Nothing was merged to main.

## Hardware handoff and Step 5B evidence

Follow [WINDOWS_TESTING.md](WINDOWS_TESTING.md): record safe collection metadata/descriptor and actual lengths/identity/format counts, compare idle and single-control activity with Steam Input left enabled, repeat Start/Stop 20 times, check five-minute expiry, QAM/settings regressions and clean exit/uninstall. No raw input streams, device paths or serials should be shared. Denied/busy/silent access is a valid observation, not permission for takeover.

Current native controls remain unavailable, so this build alone cannot correlate physical bits. The research/checklist explicitly proposes, but does not implement, a future short, opt-in, one-control-at-a-time local memory-only correlation probe with aggregate expected/unrelated transition counts and no raw export. After review of real framing evidence, use that reviewed method to repeat individual press/hold/release and simultaneous controls, reject false positives, and independently approve each mapping before any allowlist is enabled. Actual Windows framing, delivery behavior and per-control physical correlations are outstanding for Step 5B; physical ⋯/Steam QAM behavior is not implemented or authorized here. Do not merge until review and hardware testing.
