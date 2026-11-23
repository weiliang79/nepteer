# AGENTS.md — Nepteer

## Mission
Nepteer is an independently implemented, open-source-oriented Windows handheld companion, initially targeting the **Steam Deck LCD running Windows 11**. It aims to provide SteamOS-inspired system telemetry, quick controls, input mapping, power/fan profiles, and a controller-friendly Quick Access Menu. **The current milestone is Step 5E non-invasive QAM UX, accessibility and regression testing; no new input capability or isolation.**

Repository: https://github.com/weiliang79/nepteer

## Current milestone: Step 5E — Non-invasive QAM UX

Work on `feat/qam-navigation-ux` from main `335f1e2a6cc1b9871cb04429ad9d2f1bbdb7888e` (PR #9). Step 5D is merged; its decision remains authoritative: retain desktop-only controller navigation and improve non-invasive UX. Commit/push validated changes with native Windows/macOS CI/artifacts; the user reports Step 5E physical acceptance complete on LCD/Windows 11; do not merge automatically.

Frontend-only scope: accessible native radio-style session choices, shortcut-only default (`navigation: false`), explicit desktop navigation (`navigation: true`), both existing acknowledgments reset on mode changes, no auto-arm or saved opt-in. Choices describe a manually confirmed existing SDT Desktop/X360 configuration, never detection or reconfiguration. Active reader sessions lock setup; readiness must come from current native phase/ownership/opened/worker/navigation/error status, not the selected next-session card. Connection failure means last-known state; Disarming is not completed cleanup. Keep safe diagnostics and actionable failures visible.

Prominent text warning before Arm: controller navigation does not block game input; desktop without an active game only. Explain the existing D-pad Up/Down, A, B, Left/Right no-op and physical ⋯ behavior. Reuse platform-native shortcut hints and keyboard/touch/dashboard alternatives. QAM guidance must be static/conditional copy without assuming current navigation mode, adding focus targets or resetting focus. Preserve its exact six-control order, actual focus, wrapping/disabled skipping, A/B handlers, claim/complete, epochs, telemetry and reduced motion.

Do not modify Rust/HID/parser/mappings/session/cooldown/ownership/navigation/window lifecycle/cleanup barriers, Tauri permissions or DTOs/bindings, manifest/installer, dependency graph or runtime version. No new commands, readers, writes, interception, output, hooks, injection, virtual devices, filtering, drivers/elevation/services, provider settings or routing experiments. Add only the feature branch to unchanged CI triggers. Run all standard checks and native packaging CI. Synthetic browser layouts/React tests are not physical Windows acceptance; preserve historical handoffs and Step 5D decision unchanged.

### Retained test-only QAM slow-refresh diagnostics

The user explicitly retains the build-gated **Test Slow Refresh (5s)** capability until controller feature development is complete. It is test-only development infrastructure, not a supported production feature; immediate removal before Step 5E merge is no longer required. Exact `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true` enables it; unset/other values and development mode alone do not. Production keeps its six-control order and no diagnostic delay module. Test builds explicitly add one seventh control between Refresh and Performance, mark TEST BUILD ONLY and use the same telemetry/request ordering with an asynchronous >=5s frontend completion delay, including errors. Both refresh buttons stay keyboard-focusable but are skipped as busy controller destinations and cannot trigger duplicate reads. Timers are canceled/invalidated on hide, new request/provider/open and unmount. Never await the delay in navigation claim/complete or alter native cleanup.

The separate Windows test-artifact workflow must have only workflow_dispatch, with a job guard requiring that event and exact refs/heads/main or refs/heads/feat/qam-navigation-ux. No push, PR, tag, release, workflow_call or workflow_run trigger; normal CI must not dispatch it. GitHub requires the workflow on the default branch for manual dispatch; never work around an unavailable pre-merge dispatch by changing main or adding automatic triggers. Ordinary Windows/macOS CI forces the flag false and checks the final bundle excludes diagnostics. No version, app identity, installer privileges, Rust/HID/telemetry, permissions, native navigation, mappings or lifecycle changes. Test installer replaces the same app: exit other Nepteer instances and never run both simultaneously. Desktop without an active game; arming remains explicit. The user reports physical slow-refresh acceptance: D-pad, Tab/Shift+Tab, mouse/touch, duplicate protection, no completion focus theft, immediate close, stale-delay rejection on reopen and safe explicit Disarm. Preserve those observations separately from CI and avoid broader compatibility claims. Keep the flag/helper/types/tests/checker and gated UI unchanged. Reassess removal after controller development is complete. Preserve the production Refresh focus fix; no native/IPC/permission changes. Do not merge automatically.

## Completed milestone: Step 5D — Controller input-routing feasibility

Work on `research/controller-input-routing` from main `6f879e542feeee37c95a85615d926e6d5a48d64f` (PR #8). The user reports completed Step 5C.2 Windows acceptance. Preserve historical evidence and scope below; prior pending statements describe their original handoffs. This milestone is documentation/research only: audit the existing observer, compare documented Windows/provider input semantics and record an explicit recommendation in `docs/decisions/step-5d-controller-input-routing.md`. Commit/push reviewed research and verify existing native CI; do not merge.

Do not change production HID reading, QAM navigation/lifecycle, arming, capabilities, bindings, manifest, installer, dependency graph or runtime version. No interception, hooks, output/feature reports, exclusive ownership, virtual devices, injection, device hiding/configuration, tool/Steam settings, drivers, services, elevation, raw recordings or automatic recovery. Published Steam Deck Tools user documentation may be researched; its source must not be inspected/copied/translated. No game input experiment is authorized. A documentation-only PR is preferred; enabling its branch in unchanged CI is appropriate. Local native packaging may be skipped for documentation-only changes; retain full native CI, formatting/typecheck/frontend/Rust/Clippy/binding/whitespace checks and exact reporting.

Separate repository facts, documented API capabilities, inference and unknown physical behavior. Focus and native QAM visibility fence local actions; neither proves universal game input isolation. Research must account for API/runtime versions, SDT/Steam Input duplicate paths, unknown consumer APIs and process-independent crash recovery. Existing user-selected X360 context is not automatic detection. No new hardware verification is implied by CI or a conceptual policy model. Preserve all existing safety rules and previous decisions. Any future privileged filtering or virtual-output architecture requires a separately approved security/architecture milestone.

## Completed milestone: Step 5C.2 — Read-only QAM controller navigation

Work on `feat/qam-controller-navigation` from merged main `f638bdd23981aceaf523beaa4e805f387abeb223` (PR #7). Commit/push verified changes and native CI/artifacts; do not merge before hardware acceptance. User-provided LCD/Windows 11 evidence in manually reported Steam Deck Tools **X360 mode**, Steam running/Input unknown: eight positive sessions (two per direction), 40/40 cycles and sixteen idle/opposite/A/B negatives without false nominated edges; clean positives had no framing errors, gaps or unexpected known/unknown changes. Reviewed navigation mappings: Up 8, Down 11, Left 10, Right 9, A 7, B 5. This authorizes only desktop validation on exact 28DE:1205 interface 2, FFFF/0001, descriptor/actual65, deck_v1_zero_prefixed65. No alternative models/modes/formats are implied.

Reuse the existing armed reader and thirty-minute lifecycle. Desktop mode retains the existing ⋯-only path; explicit X360 session selection enables navigation, with both acknowledgments renewed and no setting persisted/detected/changed. Keep the ⋯ bit-50 behavior/cooldown exactly separate. Navigation has independent released baselines per control/opening, no held repeats, no diagonals/multiple navigation controls, and conservative suppression while X/Y/Steam/⋯ is held. Normal diagnostics/probe remain mutually exclusive with armed mode and keep their five-minute/thirty-second limits and non-promotion policy.

Only abstract Previous/Next/Left/Right/Activate/Back actions and ephemeral session/epoch/sequence tokens may target local quick-access. Native actual visibility/epoch and the shortcut fence must validate each claim. Bound pending work to four plus one delivery, including queued-age expiry. A granted UI delivery is a cleanup barrier until trusted completion or destruction of that specific renderer instance. No reader/status locks during window calls or IPC callbacks; no stale failure may disable a new generation. Never claim successful disarm while a granted delivery is outstanding. Document broken-renderer/transport delays honestly. Two QAM-only claim/complete commands may manage only these native offers, never HID ownership. Keep remote navigation/CSP and main-only arming boundaries intact.

React changes local DOM focus/uses existing handlers only: enabled-button wrapping, A activation, B collapse/close, Left/Right no-op. No synthetic OS/keyboard/gamepad input. Native opening epochs initialize focus once; redundant visibility/provider refresh must not steal focus. Initial tests require desktop with no active game. Shared read-only input is **not game input isolation**; no game/tool detection, interception, exclusive access, remapping/emulation, driver/admin/service, writes or game hooks. Preserve all historical architectural/safety rules below; their milestone exclusions describe prior scope. All new hardware behavior remains pending user acceptance.

## Completed milestone: Step 5B — Physical Quick Access shortcut

Work on `feat/neptune-qam-shortcut` from latest main after `6f1ecdd584ea8f3d53b2d4f38c7902ed3092215d`. Commit/push focused changes, verify native macOS/Windows CI and Windows artifacts; do not merge before review and new hardware testing. The user supplied positive A/B/X/Y/Steam/Quick Access correlations from Deck LCD/Windows 11, Steam Deck Tools controller Desktop mode, Steam running, Steam Input status unknown. Quick Access bit 50 had five presses/releases, stable released baseline, no missing/early/late/idle edges or gaps, distinct Steam bit 13, Steam-only negative control and Steam-held + QAM cycling. This authorizes only a narrowly scoped opt-in bit-50 shortcut test, not universal model/mode compatibility or any other input action.

Require explicit session-only consent and reviewed-configuration acknowledgment, native source and exact profile: VID 28DE/PID 1205, interface 2, usage FFFF/0001, descriptor 65, exact zero-prefixed65 v1/type09/body64 framing. Arm starts passive validation; only compatible reports plus fresh stable released baseline permit a press. No startup arming/persistence. Enforce a native monotonic 30-minute deadline, explicit Disarm, no renewal/reconnect. Diagnostics/probe and shortcut modes share one reader slot; reject conflicts and require explicit stop/disarm before switching. Keep diagnostic five-minute and probe thirty-second limits intact. Navigation/minimization does not stop an explicitly armed app-owned session; normal exit does.

Only released-to-pressed bit 50 may request existing QAM Action::Toggle. Initial held, held repeats, releases, invalid packets and timeouts cannot toggle. Require >=3 released reports over 200ms, invalidate on >1.5s stream gaps, and discard presses <350ms after an accepted press without deferred toggles. Invalid framing/read failure ends the session. Keep dispatch bounded and generation/deadline fenced after QAM lock acquisition; disarm invalidates pending work immediately and waits out already-started actions before returning. No reader/status lock during native window operations. Existing keyboard/dashboard/Escape/blur/focus/placement behavior stays authoritative in quick_access.rs.

Expose only minimal safe status/metadata through three main-only arm/disarm/status commands; QAM gains no management grants. No raw reports, held states, press history, unique IDs, new sensors/writes, input injection, remapping, Steam shortcuts, tool configuration/termination, drivers/admin/services/startup, hooks or game interaction. Normal diagnostics still do not publish physical events or automatically promote verification flags; the reviewed QAM shortcut is a separate narrow route. Do not suppress other tools' ⋯ actions or claim their modes were detected. Preserve all prior safety rules; old milestone exclusions are historical. Prefer no new dependency. Document collision/fullscreen/cancellation limits and require the 28-item new hardware checklist before merge.

## Completed milestone: Step 5A.1 — Physical candidate-bit correlation probe

Work on `feat/neptune-button-correlation` from latest main after Step 5A merge `be08de79c369921dac541a5efcb4d4fc8762a4ca`. Commit/push focused changes and validate native macOS/Windows CI/artifacts. Do not merge before code review and hardware testing. Step 5A is complete; this milestone only gathers correlation evidence, never promotes mappings or adds live physical events.

User-reported Windows 11 Deck LCD evidence: Steam Deck Tools installed, Steam Controller.exe running in Desktop mode; separate Steam/Steam Input status not confirmed. Interfaces: mouse 0x0001/0x0002 length 6, keyboard 0x0001/0x0006 length 9 (discovery only), vendor 0xFFFF/0x0001 descriptor 65 (eligible). The vendor interface returned length 65, zero-prefixed candidate type 0x09, 42,808 candidate reports and zero unsupported/malformed reports, with intermittent idle/increased activity during input. These aggregate observations do not fully verify framing or any bit mapping. Preserve the evidence at that strength.

Require manual discovery/interface/normal monitoring/control selection, separate explicit consent and Start Probe. Only the existing checked zero-prefixed 65-byte classifier and twelve candidate controls may feed the probe. No arbitrary offsets/masks, alternate interface selection or separate reader. Rust owns a fixed <=30s monotonic procedure, baseline/idle/five press-hold-release cycles/final release, deadline even without packets, stale-token/generation checks, immediate Abort and owner stop/rescan/error/disconnect/expiry/shutdown cleanup.

Keep only bounded aggregate counters and minimal private comparison state in memory. Expose/copy safe build/interface/format/control/status/environment labels/counts, never raw packets, changed masks, paths, serials or input history. No recordings, analytics, remote data or persistence. Unrelated changes are edge counts separated into known/unknown candidate-word bits, not changes to packet counters/analog fields. Observed candidate-bit correlation is pending independent review; missing/ambiguous/incompatible evidence cannot be positive. Never set framing_verified, physical_buttons_verified or ButtonVerified; normal physical states stay unavailable, native transition history empty, and physical Steam/⋯ QAM actions disabled.

Preserve native shared GENERIC_READ, one opt-in worker, bounded reads/cancellation, five-minute monitor limit, no auto-reconnect, main-only permissions/CSP, QAM shortcut/focus, read-only telemetry and explicit simulation. No HID writes, output/feature/configuration reports, exclusive access, mode/driver/service/admin changes, input injection, tools/Steam shutdown, remapping or new sensors/power controls. Manual environment labels are observation only. Do not consult/copy/translate Steam Deck Tools source. Prefer no new dependency. Report synthetic/CI results separately from actual probe hardware tests.

## Completed milestone: Step 5A — Evidence-gated Neptune input decoding

Work on `feat/neptune-input-decoding` from latest main after Step 4 merge `fdafc925451d2ae2753e54ad6b188d9b728c2bbd`. The user reports Step 4 hardware checks passed. No Windows report IDs, lengths, framing or physical-button correlations were supplied for Step 5A; those remain unverified. Commit/push focused changes to the feature branch, confirm native macOS/Windows CI/artifacts, and do not merge before code review and hardware testing.

Implement a small original safe Rust candidate parser based on primary published protocol facts, with explicit ID/framing/length/version validation and deterministic synthetic tests. Keep published candidate (Level 1), hardware framing verification (Level 2) and per-control physical verification (Level 3) separate. Synthetic tests, matching bytes and CI cannot promote evidence. With no verified physical mapping allowlist, native controls must stay unavailable and emit no transitions. Simulation is explicit and labeled, never an access-failure fallback. Only Phase 1 candidate buttons are implemented; other controls remain unavailable.

First valid state is a baseline, repeated held state creates no duplicate edge, and invalid packets/timeouts never become releases. Format/interface/session switches reset tracking. Keep history bounded, session-only and in memory; clear displayed input/history on stop, disconnect, expiry and shutdown. Parse only private borrowed bytes in the existing worker and emit bounded summaries at the existing rate. No raw-report export, serial/path exposure or disk input logging. Document a safe physical validation procedure and the missing evidence; do not enable physical mappings before independent validation.

Preserve Step 4 native shared GENERIC_READ, opt-in manual lifecycle, one worker, bounded waits/cancellation, five-minute limit, main-only permissions and Steam Input coexistence. Do not change native reader, capabilities or CSP without a verified need. No device writes/configuration, output/feature reports, exclusive takeover, admin, drivers, input injection/remapping, game hooks, services, sensors/power controls or physical Steam/⋯ QAM action. Step 5B behavior is not authorized by this milestone. Do not copy/translate Steam Deck Tools. Record SDL facts, immutable primary source links and applicable attribution/notices; add no dependency without need and license review.

## Completed milestone: Step 4 — Neptune discovery and read-only diagnostics

Work on `feat/neptune-discovery` from updated main after Step 3 merge `42bf0f4834df61d255b58dad6caab6acc25c30a7`. Steps 1–3 passed native CI and user-reported Windows Deck tests; the user reports 14 Step 3 tests passed. This evidence does not validate Step 4. Commit/push focused changes to the feature branch, verify native CI/artifacts, and do not merge until reviewed and hardware-tested.

Implement opt-in Windows HID candidate enumeration for VID 0x28DE / PID 0x1205, with safe metadata and manual rescan. Identifiers indicate candidates only. Never assume the first collection, a keyboard/mouse collection or a virtual Xbox controller is the physical controller input interface. Missing attributes/caps mean discovery-only. macOS native discovery remains unavailable; explicit simulation is labeled and never a read-failure fallback.

Use existing Windows bindings for SetupAPI/HID metadata and shared GENERIC_READ input only. Metadata opens request access zero. No output/feature reports, write access, exclusive fallback, device reconfiguration, detachment, driver changes or arbitrary keyboard observation. No auto-open at startup. Keep private paths in memory behind scan-local opaque IDs, never serials, instance IDs, path logging/IPC or raw report recording.

Rust owns a single worker, cancellation and actual status. Keep reads off the UI thread, timeouts bounded, notifications aggregated, stop/join deterministic, retries manual and sessions visibly bounded. Close main must stop/join monitoring before exit without blocking the native event loop. Only the main local window receives diagnostics commands/events; QAM gains no device permissions. Keep telemetry independent. Unknown report bytes never become buttons; raw readability is distinct from verified decoding. All button states remain unavailable until independently evidenced parser work is explicitly authorized.

No Steam/⋯ QAM action, controller navigation/remapping, virtual output, Lizard Mode, haptics/LED/firmware commands, input injection, hardware writes/sensors, services, startup persistence, admin, game hooks or anti-cheat interaction. Do not take ownership away from Steam Input or claim universal simultaneous access. Preserve all earlier architectural and safety requirements; prior milestone exclusions below describe their historical scopes.

## Completed milestone: Step 3 — Quick Access Menu foundation

Steps 1 and 2 passed native CI and user-reported Windows Steam Deck smoke tests. Step 2 merged at `dcc5fc4b589dbf5cd8f50150b26b6c6a4e0b5adb`. Work on `feat/quick-access-menu` from latest main. Commit/push reviewable changes to that branch, validate native macOS/Windows CI and upload Windows artifacts; do not merge to main without review.

Add exactly one separate `quick-access` window: hidden on startup, borderless, opaque, right-aligned within the selected display work area, on top while visible and absent from the Windows taskbar. Rust owns actual visibility, show/hide/toggle/query, close-to-hide and main-close-to-exit behavior. Reuse the existing telemetry provider and Rust DTOs. QAM may read the session provider but only main may change it. Keep permissions label-specific and minimal; no frontend window creation or arbitrary shortcut registration.

Use the official global-shortcut plugin with Ctrl+Alt+Q (Control+Option+Q on macOS) and a dashboard Open Quick Access fallback. Handle conflicts without crashing and clean up registration on exit. Windows foreground identity may be retained in memory solely for best-effort focus return; never read titles or log handles. Do not synthesize input, repeatedly force focus, attach input threads, bypass activation restrictions or inject into games. Outside-click blur must not steal focus back. Document macOS/Spaces and exclusive-fullscreen limitations and record new verification separately from the user-reported 14 successful Step 3 tests.

No new sensors, TDP/fan/clock writes, controller interception/mapping, virtual controllers, trackpad access, Neptune HID, Steam/⋯ interception, RTSS, drivers, services, startup persistence, game hooks or anti-cheat interaction. The QAM is the only overlay authorized in this milestone. Preserve the safety and architecture rules below; prior milestone exclusions describe their historical scope.

## Completed milestone: Step 2 — Windows read-only telemetry

Step 1 is complete: native macOS/Windows CI passed and the user reported all eight Windows Steam Deck smoke tests passed. Step 2 introduces Windows battery percentage/charging status using `GetSystemPowerStatus`, and non-identifying manufacturer/model via a narrowly selected native WMI query. Windows defaults to the real provider; macOS retains mock development. Explicit session-only mock selection is visible in Settings. Reads must never silently fall back to simulated values. Missing/unknown readings remain unavailable, zero remains valid, and no serial numbers or other unique identifiers are queried, persisted or logged. LCD/OLED classification remains unverified.

Keep the existing shared read-only trait, one typed IPC command, generated bindings, cross-platform tests and native Windows packaging. CPU/GPU temperatures and fan RPM stay unavailable in the real provider. No hardware writes, input mapping/injection, overlays, drivers or new services. Work on `feat/windows-telemetry`, commit/push to that branch as authorized, and do not merge to `main` before review. Report new hardware verification separately from the completed Step 1 smoke test.

## Completed milestone: Step 1 — Foundation
Produce a genuinely runnable Tauri **v2** desktop application with **Rust, React, TypeScript, Vite, pnpm, Tailwind CSS, and shadcn/ui**. macOS is the primary authoring environment; Windows x86_64 is the primary shipping target. Use a **mock-only hardware provider** to demonstrate a safe UI-to-Rust data path. Add CI that verifies the project on Windows and macOS (where supported by hosted runners).

### Required acceptance criteria
- A clean checkout installs dependencies and launches on a correctly prepared macOS development machine with documented commands.
- An x86_64 Windows build succeeds on GitHub Actions; its installable or runnable output is uploaded as a workflow artifact, if supported by the selected Tauri bundling configuration.
- A responsive desktop dashboard renders battery, temperatures, fan RPM and hardware capabilities from explicitly labeled **mock** data; unsupported metrics render as unavailable, never as zero.
- UI-to-Rust communication is demonstrated with a typed, read-only Tauri command returning a mock telemetry snapshot and capability information.
- A **single reusable mock provider interface** exists; no OS/hardware writes are implemented.
- Basic automated tests, lint/type-check/format commands and a clear README are provided; report any checks not executed.
- No administrator requirement, kernel-driver installation, privileged helper, or dependency on Steam Deck Tools.

## Engineering priorities
1. Safety and reversible behavior over feature breadth.
2. Correct and maintainable Rust/TypeScript interfaces over premature abstractions.
3. A working end-to-end vertical slice over placeholders that only look complete.
4. Minimal, explicit dependencies; prefer stable upstream-maintained packages and official Tauri v2 guidance.
5. Code that a solo developer can understand and iterate on.

## Implementation boundaries
- **Read-only/mock only in Step 1.** Never write fan duty, EC registers, TDP, GPU/CPU frequencies, BIOS/firmware settings, display modes, or input-injection controls. Do not install drivers.
- Do not claim mock readings are live. Label every sample value and data source in UI and API.
- Rust is the authority for device capability and telemetry models. Frontend communicates through typed Tauri IPC, not direct host hardware access.
- Separate read-only `TelemetryProvider` capabilities from future write-oriented control traits. For unsupported values, use `Option<T>` (or a typed unavailable status), not fabricated values or sentinel zero.
- Feature-gate/platform-gate Windows-specific integrations so macOS builds remain viable. Do not assume Windows APIs or devices exist on macOS.
- Keep the Tauri command surface narrow and use least-privilege Tauri v2 capabilities. No shell execution plugin or unrestricted filesystem scopes without a documented need.
- Never copy, mechanically translate, or bundle source from `ayufan/steam-deck-tools` (CC BY-NC-SA 4.0) without separate rights review. Independently implement documented interfaces; review and record every third-party dependency license before distribution. Do not assume the entire project is MIT-compatible until audited.
- Do not bypass Windows UAC, Secure Desktop, driver signing, anti-cheat, or operating-system security checks.
- Do not inject or hook into game processes in Step 1.
- Steam button, ⋯ button, rear buttons, trackpads, Neptune HID, Lizard Mode, virtual gamepads, RTSS, FPS limiting, TDP, fan control, and per-game profiles are **future work**, not Step 1 acceptance criteria.

## Design and architecture
Use a small pnpm workspace, with Tauri and the React app co-located to minimize friction. A reasonable starting shape:

```text
apps/desktop/
  src/                  # React + TypeScript UI
  src-tauri/            # Tauri v2 shell and Rust commands
crates/deck-core/       # domain types and read-only provider traits
crates/deck-hardware/   # mock provider now; Windows adapters later
packages/               # add only when demonstrated reuse requires it
 docs/                  # architecture, hardware safety, development
.github/workflows/      # CI
```

Adjust this shape if Tauri scaffolding requires it; document why. Avoid empty crates/packages and avoid creating a separate service in Step 1. If introducing multiple Rust crates complicates development, use internal Rust modules first and extract crates after tests justify the separation.

Initial domain model should support: platform/device identification, battery percentage and charge state, CPU/GPU temperatures, fan RPM, data source (`mock`, `windows`, or `unsupported`) and capability flags. Use defensively typed units and timestamped snapshots. Do not invent telemetry from a live system.

For the UI, create a restrained, controller/touch-friendly dashboard with a clear source indicator, responsive layout, simple navigation, and a future Quick Access Menu entry point. A production game overlay is **not** required now. Prepare navigation and design tokens without implementing OS-level overlay management.

## Development workflow
- Prefer a `feat/foundation` branch and a focused pull request to `main`; do not force-push or rewrite unrelated history.
- Before coding, inspect the repository and current upstream documentation for Tauri v2 and installed toolchain versions. Do not assume an existing project or fabricate passing commands.
- Implement in small checkpoints. Keep formatting, lint, type checks, Rust checks and unit tests executable from documented root scripts.
- Test mock provider behavior and UI rendering; ensure unsupported values are distinguishable from actual zero readings.
- Ensure macOS build/dev commands are documented separately from Windows compilation/test instructions.
- Use GitHub Actions on Windows (`windows-latest`) to validate the target; avoid assuming cross-compilation from macOS produces a supported Windows bundle.
- Keep build outputs, secrets, installer artifacts and machine-specific state out of Git.
- If you lack a Windows Steam Deck, mark hardware verification as pending; never imply CI proves hardware correctness.

## Agent reporting contract
At the end of each milestone, summarize:
1. Files/components added or changed and the reasoning.
2. Exact commands run and whether they passed; separately list commands not run.
3. CI status and the Windows artifact location, if available.
4. Actual versus mocked functionality.
5. Known limitations, dependencies/licenses to review, and next hardware-specific tests.
6. The commit hash and branch, if committed.

Do not silently expand scope. Ask before introducing native kernel access, admin privileges, game injection, or external copyrighted source reuse. Avoid committing/pushing unless the user explicitly requests it in the coding session.

## Planned future phases (not part of Step 1)
- Quick Access Menu: normally hidden controller-friendly window; Win32 focus/fullscreen behavior tested on Windows.
- Windows telemetry: documented Windows APIs and read-only sensors, with LCD/OLED detection.
- Input: Neptune HID observation; Steam/⋯, rear buttons, trackpads; investigate firmware Lizard Mode for UAC cursor fallback.
- Power: refresh rate, FPS limiter, validated TDP/GPU clock and fan controls only after hardware research and safe recovery design.
- Overlay: Tauri Quick Access Menu and potentially RTSS for noninteractive performance HUD.
- Profiles: per-game capability-aware settings and safe restoration.

## Background references
- Tauri v2: https://v2.tauri.app/
- Steam Deck Windows driver support: https://help.steampowered.com/en/faqs/view/6121-ECCD-D643-BAA8/
- Existing project studied for functionality only (do not copy): https://github.com/ayufan/steam-deck-tools
