# Step 6B.8 — Observation recorded; no new physical test authorized

The [source/privilege report](decisions/step-6b8-steam-deck-tools-gpu-temperature-path.md) preserves the user’s Steam Deck LCD / Windows 11 / Custom APU 0405 / AMD 31.0.21020.1014 observations: GPU temperature is visible in Performance Overlay with Use Kernel Drivers disabled, and launch requests elevation. The user subsequently confirmed installed Steam Deck Tools version 0.7.4; no installed file hashes or successful getter are known. These are user reports, not new agent hardware tests. **Decision D** leaves the observed installation’s exact acquisition chain unresolved. The official overlay elevates unconditionally; its kernel-driver option changes runtime behavior, not the process token. LibreHardwareMonitor 0.9.1 has credible ADL temperature branches, but its `GPU Core` sensor differs from the overlay’s `GPU Temperature` lookup. Ordinary-user ADL support is plausible but unverified (classification B); no GPU-specific administrator requirement is established.

One recommended next investigation: reconcile the installed Steam Deck Tools version/build and four relevant file hashes with official archives and matching immutable source, without launching monitoring or changing settings. No diagnostic implementation or physical execution is authorized. Do not patch Steam Deck Tools manifests, bypass UAC, retry elevated, change driver/tool settings, install drivers/SDKs or run substitute probes. Future original asInvoker/uiAccess=false diagnostic implementation requires separate review/authorization; physical execution requires another explicit authorization after code/artifact review. Existing Windows/macOS CI/packaging/extracted manifests verify unchanged outputs, not ADL target support. Historical checklists below retain their original scope.

---

# Historical Step 6B.7 — No GPU diagnostic or physical execution authorized

The [alternatives decision](decisions/step-6b7-standalone-gpu-telemetry-alternatives.md) is **B — clearance incomplete**. No ADLX, ADL or DXCore diagnostic exists. No hardware query, runtime load/initialization, SDK/driver installation, elevated retry or substitute probe is authorized. New DXCore documentation does not validate this driver or a temperature buffer type. General ADL integrated-GPU support is not Custom APU 0405 certification.

User-reported LCD / Custom APU 0405 / Windows 11 26H2 build 26300.9974 / AMD 31.0.21020.1014 (June 9, 2023) / WDDM 3.1 context is preserved. D3DKMT succeeded but its undisclosed temperature was rejected; no valid reading, no unexpected UAC. No new physical evidence. Existing CI verifies unchanged Windows/macOS packaging and extracted application/blocked-HWiNFO manifests, not sensor compatibility. Future implementation and execution require separate authorization. Proposed Step 6C is battery resilience design with GPU deferred. Historical checklists below retain their original scope.

---

# Historical Step 6B.6 — No ADLX physical execution authorized

The [Rust clearance decision](decisions/step-6b6-adlx-rust-licensing-clearance.md) is **B — conditional**. No ADLX executable exists. MIT component permissions do not settle the exact header/consumer/runtime workflow; trusted runtime discovery, compiled ABI and failure lifecycle also remain gates. Do not load ADLX, run a hardware probe, install an SDK, change the driver or retry elevated. No new physical test is authorized.

A future Step 6B.7 implementation would be separately reviewed before any matching artifact and explicit ordinary-user --run-once authorization. Existing Windows/macOS CI and manifests validate unchanged application/blocked HWiNFO packaging, not ADLX compatibility. Historical user-reported LCD/Custom APU/Valve-driver observations and checklists below retain their original scope.

---

# Historical Step 6B.5 — ADLX physical acceptance blocked and pending

Outcome B is documented in the [ADLX report and future procedure](experiments/step-6b5-adlx-gpu-temperature.md#20-manual-physical-acceptance--blocked-and-pending). No ADLX executable exists. Do not run another experiment, substitute the D3DKMT/HWiNFO artifact, install an SDK, update the Valve driver or retry elevated. Licensing, exact ABI, trusted loading, synthetic checks and reviewed source/artifact must pass before separate explicit approval for at most one ordinary-user `--run-once` invocation.

Known user-reported LCD/Jupiter context: Custom APU 0405, Windows 11 26H2 build 26300.9974, AMD driver 31.0.21020.1014 dated June 9, 2023, WDDM 3.1. D3DKMT API success/rejected undisclosed temperature, Task Manager N/A and HWiNFO's 48.6°C candidate do not predict ADLX compatibility. No new physical evidence is claimed. All earlier checklists retain their original scope and do not authorize Step 6B.5 execution.

---

# Historical Step 6B.4 — No new physical execution

This milestone is research-only; do not run a sensor SDK, WMI discovery, firmware method or hardware diagnostic. The [decision](decisions/step-6b4-standalone-sensor-architecture.md) preserves the user's LCD/Jupiter/Custom APU 0405, Windows 11 26H2/build 26300.9974, AMD driver 31.0.21020.1014 (June 9, 2023), WDDM 3.1 observations. These are user reports, not fresh hardware interrogation.

Step 6B.2 on unmerged `experiment/windows-gpu-temperature-d3dkmt` reportedly selected one adapter/physical adapter and returned API success but rejected its temperature. No raw value was disclosed; do not infer zero or a sentinel. Reported completed timings were 0.020 ms query and 25.199 ms invocation, successful cleanup, no unexpected UAC and responsive Windows/Nepteer. This is not a validated sensor or a verdict on all native GPU interfaces.

Step 6B.3 merged as [PR #14](https://github.com/weiliang79/nepteer/pull/14); its HWiNFO screenshot candidates, elevated launch, suspicious historical minimum and questioned fan reading remain unverified. No shared-memory read occurred. HWiNFO is not selected as a required runtime. A future one-shot ADLX test needs license/contract/code/artifact review and separate explicit physical approval. No checklist below authorizes new Step 6B.4 execution; earlier pending statements retain their historical context.

---

# Step 6B.3 HWiNFO acceptance — pending and blocked

The [manual checklist](experiments/step-6b3-hwinfo-shared-memory.md#12-manual-acceptance--all-pending-physical-modes-blocked) records user-reported HWiNFO64 v8.60 observations separately from untested shared-memory access. Current executable returns interface-blocked and cannot satisfy Test A or B. After a verified implementation is reviewed, use ordinary non-administrator PowerShell; no elevated retry or ACL modification. Candidate extraction requires explicit user approval. Publisher shutdown tests require separate approval. Historical statements below retain their original milestone context.

---

# Step 6B.1 — Manual sensor discovery (pending)

No sensor queries or physical sensor acceptance have been executed. Follow the [safe discovery procedure and evidence template](decisions/step-6b1-windows-sensor-feasibility.md#16-proposed-safe-manual-physical-discovery):

- Record only known LCD model, Windows build, display driver provider/version/date and optional WDDM version from ordinary UI; no full reports or device paths.
- Observe Task Manager GPU temperature availability and sensor labels/units from trusted monitoring apps only if already running/configured. Do not launch/install utilities or change their settings.
- Optionally execute the decision's three projected, local, ordinary-user WMI queries once. Record missing/denied/ambiguous/timeout outcomes without raw error exports; no elevation retry.
- Record exact label/category/unit, numeric availability, tool/API version and source semantics if known. ACPI zone values remain unattributed; DesiredSpeed is requested speed, not actual RPM.
- Do not collect serials/UUIDs/unique paths/account details or sensor history. No register/EC/MSR/PCI/bus/private IOCTL probing, driver changes, protections changes, fan controls or stress experiments.

Step 6B.2 GPU validation is a separate proposal, not a runnable part of this milestone. CPU/GPU/fan remain unavailable in production. CI/browser tests cannot verify physical sensor support.

Step 6A is merged as [PR #12](https://github.com/weiliang79/nepteer/pull/12), with user-reported LCD/Windows 11 acceptance **12/12 passed** and successful [post-merge CI](https://github.com/weiliang79/nepteer/actions/runs/45934968732). The historical Step 6A pending checklist below preserves its original handoff; it does not override that later report.

# Step 6A — Functional Settings acceptance

**Status: pending user testing on Steam Deck LCD / Windows 11.** Step 5F is merged as PR #11 at `a18c6ae47a892c403aff4473c3234fa273b1f1a5`. The PR records user-reported Steam Deck LCD / Windows 11 acceptance, 10/10 passed. [Post-merge Desktop CI](https://github.com/weiliang79/nepteer/actions/runs/45866445385) completed successfully on that exact commit. Historical pending statements below describe their original handoffs; they do not replace that later evidence. Step 6A hardware acceptance is pending.

Use the Windows desktop with **no running game**, the already reviewed X360 navigation configuration, explicit consent and Arm. Record app commit, normal/TEST ONLY artifact, Windows/WebView2 versions, manually known Steam/Tools context and display scaling; no serials, paths, handles or raw input. Installers use the same app identity: exit other instances and never run normal and diagnostic apps together. Record **pass / fail / not tested** for every numbered item and any WebView2-specific behavior. Browser and CI evidence do not satisfy these checks.

## A. Functional settings — not tested

1. Launch Nepteer, explicitly Arm reviewed controller navigation and open QAM with physical ⋯.
2. Navigate to Settings with D-pad and expand with A; parent retains focus.
3. Select Light with Up/Down and A. Confirm QAM changes immediately and dashboard also reflects Light.
4. Select Dark. Confirm both windows return to dark and the selected option retains its focus outline.

## B. Temperature units and persistence — not tested

1. In QAM Settings, select Fahrenheit. Confirm dashboard unit selection and supported formatting follow it.
2. Select Celsius and verify both windows. Choose final non-default values, exit Nepteer fully, relaunch and verify both persist.
3. If no real temperature metric is available, verify unit selection; optionally use explicitly labeled mock samples for formatting (54°C / 129°F). Never invent native sensor readings.

## C. Controller navigation — not tested

1. Verify collapsed order: Close → Refresh → Performance → Controller → Display → Settings; Up/Down wraps.
2. Expand Settings. Verify Dark → Light → Celsius → Fahrenheit follows Settings; all visible options are reachable and scroll into view, then wrap to Close.
3. A selects only the focused option. Re-select the active value; no duplicate action, close or focus jump.
4. B from an option collapses Settings and focuses its parent. Repeat with focus on another top-level control. With no expanded section, B closes QAM.
5. Holding Up/Down does not repeat. Left/Right remain no-op. Busy Refresh remains skipped by D-pad.
6. Repeat in the TEST ONLY build: Slow Refresh appears after Refresh; normal output has no diagnostic control.

## D. Mixed input and visual fit — not tested

1. Select an option by touch, then continue with D-pad. Verify navigation starts at the browser's actual focus.
2. Use Tab/Shift+Tab, Enter and Space through every option, including wrapping; then continue with D-pad.
3. Select by mouse. Check theme changes never steal focus/close QAM, and selected marks, hover, outline and expansion are distinct in both themes.
4. At 1280×800 and the chosen Windows scale, confirm readable text, >=48px option targets, section scrolling, reachable Close/Refresh, no horizontal clipping and reduced motion behavior. Escape still closes.

## E. Actual cross-window synchronization — not tested

1. With dashboard open, change theme in QAM and confirm dashboard updates immediately.
2. With QAM open, change theme in dashboard and confirm QAM updates without moving option focus. Repeat both directions for units.
3. Alternate rapidly between windows and edit different fields; confirm neither overwrites the other field and both converge. Simultaneous same-field edits use deterministic revision ordering; no atomic transaction is promised.
4. Hide/reopen QAM, reload its renderer if using a development setup, and remount dashboard; verify current values and Close-first genuine opening. Restart fully and verify persistence.
5. Record whether storage notifications and BroadcastChannel deliver in the actual shared WebView2 profile. A visible synchronization warning is a failed live-sync check, even if storage fallback works. If events are isolated, report the limitation; do not change permissions or profiles to force a pass.
6. In an authoring/test environment only, simulate denied storage reads/quota writes: values apply for the session with an honest warning, repeated reads do not erase unsaved values or clear the failed-write warning, and selecting an option after storage recovery retries persistence. If both renderers and storage fail, session values cannot survive full exit. Mark not tested if fault simulation is unavailable.

## F. Lifecycle and cleanup — not tested

1. Open/close QAM 20 times; each genuine opening focuses Close once. No stale option activation after reopening.
2. Expand/collapse Settings repeatedly. B restores Settings; removed children cannot retain focus or be targeted.
3. Start battery refresh, navigate/select Settings, and wait for completion/error. Focus remains on the option.
4. Repeat with TEST ONLY Slow Refresh. Confirm async delay, duplicate-read protection, immediate close and stale-delay rejection after reopen remain intact.
5. Explicitly Disarm. Confirm native reader ownership, worker, handle and pending navigation cleanup; pending cleanup is not success.
6. Restart Nepteer and verify no automatic arming. No tool/driver/Steam setting changes are part of this test.

No Rust, HID/parser/mappings, arming/deadlines, reader ownership, queue, claim/completion, visibility epochs, foreground/cleanup, bindings, permissions/CSP, manifest, installer identity/privileges, dependency graph or runtime-version changes. Step 5D desktop-only/pass-through and Step 5F press-edge-only decisions remain authoritative. No automatic arming, game-input interception/isolation, hardware writes, drivers, services or held-repeat.

---

# Step 5F · Controller-friendly interaction acceptance

**Step 5F hardware acceptance: pending.** Base Step 5E (PR #10) passed user-reported LCD/Windows 11 desktop acceptance for ⋯, D-pad/A/B, refresh/slow-refresh focus, mixed inputs, immediate close/reopen and Disarm. Those results do not validate the new outline/recovery. Test on Steam Deck LCD / Windows 11 in the reviewed X360 desktop-navigation configuration, Steam running/Input status as manually known, using the reviewed native interface. No active game or input-isolation experiment. Keep keyboard/touch available; no tool/driver configuration changes.

Record matching SHA/artifact, Windows DPI/theme, manually supplied environment and Pass/Fail/Not tested per item. No raw reports, device paths, serials or histories. Normal builds have six controls; manual TEST-ONLY builds insert Slow Refresh after Refresh. The diagnostics workflow permits main, the retained Step 5E branch and feat/qam-interaction-refinements by explicit dispatch only; see DEVELOPMENT.md. Exit other Nepteer instances before installing/running the same-identity diagnostic artifact.

## A. Focus feedback

1. Explicitly Arm navigation, open QAM with ⋯ and confirm Close has a clear outline. Check after an ordinary pointer interaction as well: controller programmatic focus must remain visible even if WebView2 does not apply :focus-visible.
2. Traverse every normal control with Down: Close → Refresh → Performance → Controller → Display → Settings → Close. Reverse/wrap with Up. All focused controls should show the same outline/keyline/shape; hover alone must not look focused.
3. Repeat dark/light themes at the actual LCD resolution/DPI. Ring must not be clipped when a focused item scrolls into view; maintain touch targets. Check reduced-motion preference: no focus movement animation or delayed outline.

## B. Interaction and explicit recovery

1. Focus Performance and activate A: it expands, shows −/aria-expanded and stays focused. Move Down to Controller: Performance stays expanded without the focus ring. Press B: collapse Performance and return focus to its button. B again closes. Left/Right do nothing.
2. Click/tap an existing control, then use D-pad. It must start from the actual focused element; record WebView2 touch behavior rather than assuming it matches another browser. Tab/Shift+Tab and Enter/Space must interleave normally.
3. If DOM focus is naturally lost inside the still-foreground QAM, the next Up/Down/A recovers Close (or first available approved control) without activating it. Do not force OS focus or modify the app to manufacture this case; synthetic tests cover it if Not observed.
4. Redundant visible notifications, refresh completion and provider updates must not restore old focus. If QAM loses OS focus, it must not navigate or force itself forward. Existing blur-hide and native focus return behavior is unchanged.

## C. Async focus

1. Use normal Refresh: no focus jump on start, success or natural failure. Busy Refresh remains keyboard-focusable but D-pad skips it as a destination; A/repeated clicks/Enter/Space must not add reads.
2. In the manually requested diagnostic build, start Slow Refresh with A. From that busy button, Up reaches Close and Down reaches Performance (both refresh controls skipped). Tab/Shift+Tab can still visit busy controls.
3. During the five-second window move focus with D-pad, Tab and touch; completion must not restore stale focus. Activate a section, collapse with B, or hide using B/Escape/Close/⋯ immediately. Reopen before the old delay ends: no obsolete read/loading state may return. Disarm explicitly and wait for actual cleanup confirmation.

## D. Lifecycle / repeat remains disabled

1. Open/close QAM twenty times via existing controls. Each genuine opening initially focuses Close once; no stale or duplicate activation from old epochs. Navigating elsewhere within the same opening must not reset focus.
2. Hold Up/Down: one action per press, no repeat. Release and press again for another action. A/B/Left/Right/⋯ behavior and independent ⋯ cooldown remain unchanged. No held-repeat setting exists in this milestone.
3. Disarm: no controller navigation, normal keyboard/touch remain. Confirm one-reader exclusion with diagnostics and normal cleanup; relaunch stays Disarmed without automatic reader/startup service.

Do not claim this checklist passed from unit tests or Chrome screenshots. Report any native fault separately; Step 5F does not authorize native lifecycle changes. The existing frozen-renderer/claimed-completion barrier limitation remains. Older milestone checklists below preserve their historical scope/status.

---

# Step 5E · QAM UX acceptance

**Step 5E physical acceptance: user-reported complete on Steam Deck LCD / Windows 11.** The reported slow-refresh observations cover responsive D-pad/Tab/Shift+Tab/mouse/touch during loading, no completion focus theft, duplicate prevention, immediate close, no obsolete delay after reopen and safe explicit Disarm. This is scoped user evidence, not a universal compatibility or input-isolation claim; unreported fault-injection/screen-reader/DPI cases are not newly claimed. Step 5C.2 previously passed user-reported hardware acceptance; earlier checklist status is historical. Use this branch's matching artifact/SHA on Steam Deck LCD / Windows 11 with existing WebView2, standard-user install and the reviewed native collection (28DE:1205, interface 2, FFFF/0001, descriptor/actual65, deck_v1_zero_prefixed65). Keep keyboard/touch available. All navigation testing is desktop-only, without an active game. Do not run game input-suppression experiments or alter drivers/tool settings. Run a scenario only when the corresponding SDT profile is already manually confirmed; otherwise record Not run. Steam must be manually confirmed running for the reviewed profile; Steam Input status may be unknown.

## Retained test-only slow-refresh diagnostic artifact

The user reports normal Refresh now completes successfully, retains focus and supports D-pad navigation after completion on Deck LCD/Windows 11. **Pending-interval physical validation has now passed according to the user**, covering the interaction/close/reopen/disarm observations above. The procedures below remain for regression testing during controller development. Install only the matching `TEST-ONLY-qam-focus-diagnostics-windows-x86_64-<SHA>` artifact, not the normal artifact, and confirm **TEST BUILD ONLY** / **Test Slow Refresh (5s)** in QAM. Same version/app identity: exit Nepteer before installing/replacing it; never run two instances. Do not change tools, drivers, privileges or input configuration. Controller tests require the already reviewed X360 profile, explicit navigation arming and the Windows desktop without an active game. Keyboard/touch tests need no armed HID reader.

### A. D-pad focus during a five-second read

1. Open QAM, focus Test Slow Refresh (between Refresh and Performance), activate with A. Check the normal loading indicator stays for at least approximately five seconds, with focus still on that button.
2. During loading, Up must reach Close (busy normal Refresh is skipped). Down from Close must reach Performance (both refresh controls are busy). Confirm reverse movement as well.
3. Let completion occur while focused elsewhere: no automatic focus reset. If left on the test button, focus remains there. After completion, the seven-control test order is restored; normal production has only six.

### B. Keyboard

1. Start Test Slow Refresh. During loading Tab reaches Performance and Shift+Tab returns to the still-focusable test button. Tab can also reach busy normal Refresh.
2. Try Enter/Space repeatedly while a refresh control is focused: no duplicate read/reset of the five-second interval. Completion does not steal focus. Escape closes normally.

### C. Mouse/touch

1. Start Test Slow Refresh, tap/click Performance during loading: the section responds immediately and retains focus after completion.
2. Start a fresh slow refresh and click Close during loading: QAM hides promptly. Reopen before the old delay would finish: only the new opening's normal telemetry request may update the view; no late busy/reset/old data.
3. With QAM open, normal Refresh remains immediate. If a read fails naturally, test-build error display waits for the five-second minimum; do not alter hardware/services to force errors. Slow/error/overlap cases have deterministic synthetic coverage if not observable manually.

### D. Controller navigation and cleanup

1. Arm reviewed navigation mode explicitly, open QAM with ⋯, focus the test button with D-pad and activate once with A. While pending, additional A presses must not add reads or reset the timer.
2. Navigate to Performance, activate if useful, then B collapses it; B again closes. Also test Escape/Close and ⋯. The JS delay must not hold native claim/completion or delay hiding/Disarm.
3. Repeat a test; Disarm and confirm normal cleanup. Provider changes during a delay may supersede the test request, never replay it. Record safe observations only.

Record build/SHA, mode and Pass/Fail/Not observed for A–D; no raw reports or histories. This is a temporary diagnostic artifact, not a release or input-isolation experiment. By explicit user decision, retain the gated button/flag/module/tests/checker as test-only development infrastructure until controller feature development is complete. The workflow is manual-only and allows main or feat/qam-navigation-ux; normal builds/CI exclude diagnostics. See DEVELOPMENT.md for Actions dispatch/ref selection, the verified feature-branch CLI path and GitHub default-branch discovery caveat. Immediate removal before Step 5E merge is superseded. Preserve the production focus fix.

## Step 5E Refresh focus regression check

The user confirms the production focus fix and subsequent slow-refresh physical checks passed; these instructions remain as regression coverage. Test on the desktop in each already reviewed session mode; controller navigation assertions apply only when navigation is explicitly enabled. The user reported the original jump to Performance in both modes.

1. Open QAM and focus Refresh using keyboard, pointer/touch or D-pad. Activate it: focus must stay on Refresh while reading and after completion. Check the busy/unavailable announcement with a screen reader where available.
2. During an observable pending read, repeat click/tap, Enter/Space or controller A. No additional manual read or focus jump should occur. Fast-read timing, delayed/failing reads and exact request counts also have deterministic synthetic coverage; do not alter devices/services to force failure.
3. While Refresh is busy, Up from it goes to Close and Down to Performance. Down from Close/Up from Performance skip busy Refresh. There is still exactly the original six-control order after the read.
4. Tab/Shift+Tab remains functional, including visiting busy Refresh. Voluntarily tap/click or Tab to Performance during loading; completion must leave focus there. Repeat after a naturally observed read failure, if available; otherwise mark that hardware case Not observed.
5. Escape/Close still hide during loading. In navigation mode B collapses a section or closes as before. Keyboard and touch work in shortcut-only mode; no new controller navigation is enabled there.
6. Hide/reopen and provider changes retain normal telemetry refresh behavior and genuine-open initial focus. No old request completion may unlock a newer pending request or replace its data.

## A. Physical shortcut only

1. Launch/relaunch: confirm Shortcut disarmed, shortcut-only radio selected, both acknowledgments clear, QAM hidden and no automatic reader.
2. Confirm the existing reviewed SDT Desktop configuration; stop diagnostics, rescan and select the eligible vendor collection. Choose **Physical shortcut only**. Check only ⋯ is advertised in controller help and other tools may also react.
3. Complete both acknowledgments and explicitly Arm. Confirm startup/report/released-baseline stages before **Shortcut armed — navigation disabled**, with remaining time. Selection alone must never arm.
4. Press/release ⋯: QAM toggles. D-pad/A/B must not navigate QAM. Use the displayed keyboard shortcut, Tab/Shift+Tab, Enter/Space, Escape and mouse/touch instead.
5. Disarm. Wait for native confirmation before treating cleanup as complete or changing modes.

## B. Controller navigation (desktop only)

1. Confirm the existing reviewed SDT X360 configuration, Steam running/Input unknown if applicable. Stop/disarm the active reader. Choose **Controller navigation (desktop only)**; both acknowledgments must reset.
2. Before Arm, read the prominent warning: controller navigation does not block game input; desktop without an active game. Verify it is associated with the radio group and not conveyed by color alone. Selection must not change external tools or arm.
3. Check help: ⋯ toggle; Up previous; Down next; A focused-item activation; B collapse/close; Left/Right no action. No stick navigation or held repeat is promised.
4. Complete both acknowledgments, explicitly Arm and wait for **Shortcut armed — navigation enabled (desktop only)**, not just configured/waiting baseline.
5. Open with ⋯. Down/Up wrap Close → enabled Refresh → Performance → Controller → Display → Settings. Busy Refresh is skipped by controller navigation but remains keyboard-focusable; help text is never a focus target.
6. A activates enabled controls, B collapses an expanded section then closes, Left/Right do nothing. Hold/release/repress behavior is unchanged. Test Escape, ⋯, Ctrl+Alt+Q and touch/click as well.
7. Disarm and confirm physical navigation stops. Re-arm explicitly for a short repeat smoke test; no duplicate reader or automatic renewal.

## C. Status and recovery

1. Check startup, expiry, disconnect/read error and Disarm messages when naturally observable. Waiting baseline/terminal status must never show navigation enabled. Do not forcibly disconnect internal hardware or reproduce driver failures.
2. Attempt mode changes after completing both acknowledgments while disarmed: both clear, Arm disables. During an active session, cards/setup are locked; Disarm remains available in the persistent bar on other pages.
3. Failed Arm must retain a safe reason/recovery action and must not show armed. Monitoring/probe ownership must block Arm; an armed shortcut must still block diagnostics until explicit Disarm.
4. If a navigation-only error occurs, check keyboard/touch/dashboard fallback and physical ⋯ availability against native status. Do not assume ⋯ works after worker termination. Expand **Technical session diagnostics** to copy the sanitized summary if needed.
5. Navigate pages/remount: current availability comes from native status, not the next-session card. Relaunch must reset opted-in mode/consent. A temporary status connection failure must say **Last known**; this transport case is synthetic-test covered and may be Not observed on hardware.
6. Disarming/pending completion must not claim cleanup completed. Respect the existing frozen-renderer/transport limitation; do not kill or reconfigure another tool as recovery.
7. Confirm ordinary QAM operation after successful disarm/rearm; no new device configuration or reader ownership changes.

## D. Display and accessibility

1. At 1280×800 and the actual Windows DPI setting, check readable radio cards, warning/help and acknowledgments without excessive scrolling. Repeat dark/light themes; technical detail may be expanded separately.
2. Keyboard-only: Tab into the native radio group, use arrows/Space, verify selected state/focus outline, fieldset/legend and accessible names/descriptions with a screen reader where available. Confirm checks remain explicit.
3. Check warning text/contrast and status announcements without continual repetition. Check touch targets and pointer selection.
4. QAM: compact limitation/help, native platform shortcut and keyboard alternatives remain readable. All six controls remain reachable; no help becomes a Tab/controller stop. Verify true opening focuses Close, redundant visible/provider updates preserve actual focus, refresh behavior and settings/theme regression.
5. Enable reduced-motion preference and confirm restrained opening animation is suppressed. Check keyboard, mouse and touch; browser automation is not a substitute for Windows screen-reader/touch validation.

Record build/SHA, screen/DPI/theme, manually supplied environment, each scenario's Pass/Fail/Not run, and safe diagnostic summaries only. No raw reports, serials, device paths or controller history. No gameplay-isolation claim follows from these tests. Normal shutdown/uninstall must still leave no process, driver or service added by Nepteer.

---

# Step 5C.2 · Desktop-only physical QAM navigation acceptance

**New navigation hardware results are pending.** The user supplied Step 5C.1 evidence: eight positive D-pad sessions/two per direction, 40/40 cycles, sixteen idle/opposite/A/B negatives with zero false nominated edges, no incompatible/malformed reports/gaps/unexpected bit changes in clean positives. The manually reported mode was **X360**, Steam running/Input unknown, on LCD/Windows 11, native 28DE:1205 interface2 FFFF/0001 length65, deck_v1_zero_prefixed65. Earlier Desktop-mode evidence was for ⋯, not automatic certification of navigation in Desktop mode.

Run this checklist on the **Windows desktop without an active game**. Keep keyboard/touch available. Leave Steam Deck Tools/Steam/Input/driver/firmware configuration unchanged; if not already in the reviewed configuration, report it instead of having Nepteer change it. No anti-cheat/game testing or input isolation is required/claimed.

1. Exit the previous Nepteer process, install this branch's matching current-user NSIS artifact without elevation, then launch with existing WebView2. Confirm the shortcut starts Disarmed, QAM hidden, no automatic reader and no remembered enabled state.
2. Rescan native interfaces, select exact vendor collection interface2/FFFF:0001/descriptor65, and ensure no diagnostic monitor/probe owns the reader. Other profiles/models are outside scope.
3. In Physical Quick Access Shortcut choose **X360 — ⋯ toggle and desktop-only QAM navigation** only if that is your manually confirmed current environment. Confirm both configuration and passive-observation acknowledgments. Mode selection itself must not change another tool. Desktop remains the legacy ⋯-only option.
4. Arm. Observe existing attempt/open/report/released-baseline stages and Armed, with the thirty-minute limit. Missing/incompatible/access errors remain honest terminal states, never simulation or exclusive takeover.
5. Press ⋯ once: QAM opens with Close focused. Release ⋯ before navigating. Hold a direction across opening: no action until released and pressed again. Likewise initially held A/B must not act.
6. Tap Down repeatedly, releasing between taps: Close → enabled Refresh battery → Performance → Controller → Display → Settings → Close. Disabled Refresh must be skipped. No informational paragraph/reading is a focus target.
7. Tap Up and confirm reverse order; test wrap in both directions.
8. Press A on each enabled control. Close hides; reopen with ⋯. Refresh reads the existing provider; section buttons toggle their informational paragraphs only. No adjustable hardware/settings control appears.
9. Expand Performance with A, then B: paragraph collapses and focus returns to Performance. B again closes QAM through existing native Hide/focus restoration. Reopen with ⋯.
10. Hold Down for several seconds: exactly one step. Release, then press again: one more step. No auto-repeat or navigation cooldown derived from the 350ms ⋯ debounce.
11. Left/Right are no-ops throughout the current UI. They do not adjust volume/brightness/display/power or change sections/focus.
12. Hold A or B: no repeated activation, repeated refresh or repeated close. Navigation while multiple D-pad/A/B controls are held (including diagonals/opposites) is suppressed; release the controls before trying again.
13. Steam or X/Y held with D-pad/A/B should suppress navigation conservatively, requiring release of the navigation control. Verify this does not alter the existing ⋯ toggle behavior when Steam/A/B/X/Y are held.
14. Use keyboard Escape, Ctrl+Alt+Q, Tab and Shift+Tab. Keep the previous wrap, hide, native focus restoration/outside-click behavior and dashboard Open button.
15. Click/touch a section or Tab to it, then use Up/Down: start from actual focus. Telemetry/provider refresh and redundant native status events must not reset focus to Close. A focused Refresh becoming disabled moves to Performance, then does not steal focus back when enabled.
16. Change saved theme/provider in main and reopen/refresh QAM. Verify existing theme, source/availability/telemetry behavior. No polling sensor loop or extra permissions should appear.
17. Close QAM with B, Escape, Close, outside click and ⋯ in separate runs. Navigation while hidden must not activate controls, refresh data or affect main. Each genuine reopening starts fresh focus/baselines.
18. Disarm from the main app while QAM is visible or while tapping directions. Navigation and physical toggle stop after successful cleanup. Copied shortcut diagnostics show no active reader/delivery. No queued action executes after Disarmed returns.
19. Re-arm explicitly in the same reviewed mode and repeat a short navigation smoke test. No duplicate reader, overlay window, stale action or automatic renewal.
20. While armed, Controller Start Monitoring/Rescan must reject with explicit Disarm recovery; while diagnostics/probe owns the reader, Arm must reject with Stop/Abort recovery. Explicitly switch modes, never automatic takeover.
21. Check normal thirty-minute expiry/manual rearm (may be a separate extended test), and naturally observable read/disconnect/access failures only. Do not force internal hardware disconnects. After termination no navigation or old action replay; keyboard/touch fallback stays available.
22. Close main while armed and relaunch. Healthy cleanup must complete without orphan helpers/services; new launch starts Disarmed and no automatic scan/open. Uninstall leaves no controller configuration, service or startup task.
23. Optional stress: rapid ⋯/keyboard/dashboard show/hide interleaved with directions/A/B. A command from the previous opening must not execute in the next. Hold a direction through repeated reopening and confirm release is required. Record safe pass/fail/context, not per-button history.
24. If navigation reports overflow/delivery failure/timeout, use keyboard/touch/⋯, copy **Shortcut Diagnostic Summary**, then Disarm/rearm manually. No retry storm, hardware writes or mode changes. A frozen renderer/failed completion transport may leave Disarming/delivering pending; **do not call that successful cleanup**. Record the safe state without raw streams or process details. Synthetic tests cover that barrier; native failure behavior still needs review.

Controller navigation observes physical buttons without suppressing them. Games or other controller utilities may still receive the same input. If gameplay is separately observed later, record pass-through as a limitation, not input isolation; Step 5C.2 acceptance does not require gameplay. Do not hook games, modify tools/drivers or disable security to obtain different routing. Native CI proves builds/logic only, not these GUI/HID/focus/coexistence results.

---

# Step 5C.1 · D-pad physical evidence matrix

**D-pad physical results: pending. Controller QAM navigation: not implemented.** The user reports merged Step 5B physically tested, but those results do not validate D-pad controls. Use the new branch artifact/SHA and collect fresh, independently reviewable sessions. Leave Steam Deck Tools and Steam configured as they are; all tests in this section run on the **Windows desktop without an active game**. Keep keyboard/touch available.

## Scope and setup

1. Launch as a standard user. Explicitly **Disarm Physical Quick Access Shortcut** and wait for cleanup/reader owner None. Do not run diagnostics and the armed shortcut concurrently.
2. On Controller, rescan native HID interfaces and manually select VID 28DE/PID 1205, **interface 2, usage FFFF/0001, descriptor input length 65**. Do not select mouse/keyboard/virtual Xbox or an alternate profile. Missing/inaccessible device means stop and report the safe limitation; no takeover/reconnect loop.
3. Start normal read-only monitoring. Confirm actual 65-byte reports recognized as `deck_v1_zero_prefixed65`. This is framing observation, not verification of a direction. No compatible reports means inconclusive; never use simulated input as physical evidence.
4. Record manual environment labels: Deck LCD / Windows 11, Steam Deck Tools running, Steam Controller.exe Desktop mode, Steam running, Steam Input known state or Unknown. These labels are not automatically detected. Other models/software/modes are outside this milestone.
5. Select exactly one physical direction in Physical Button Correlation, consent and Start Probe. The existing fixed schedule is unchanged: release/rest 0–4s, idle 4–7s, five cycles at 7/11/15/19/23s (1.5s press, 1s hold, 1.5s release), final hands-off 27–29s; hard Rust deadline 30s. Follow the screen prompts, with no Next clicks during measurement. Keep sticks/trackpads untouched, particularly during preparation, idle and final observation. Do not press diagonals in primary tests.
6. After each run use **Copy Safe Summary** before the next Start replaces the result. Paste only the aggregate JSON plus a manual session label and artifact SHA into a review issue/message. The app uploads/records nothing. Do not share raw bytes, report streams, paths, serials, instance IDs or input history. Safe static candidate bit indices and aggregate unknown-change counts are allowed; unknown masks/values are not.

## Primary positives and repeatability

| Session labels (two fresh runs each) | Nominated physical direction | Candidate bit | Physical results | Independent review |
| ------------------------------------ | ---------------------------- | ------------: | ---------------- | ------------------ |
| P-U1 / P-U2                          | D-pad Up                     |             8 | Pending          | Pending            |
| P-D1 / P-D2                          | D-pad Down                   |            11 | Pending          | Pending            |
| P-L1 / P-L2                          | D-pad Left                   |            10 | Pending          | Pending            |
| P-R1 / P-R2                          | D-pad Right                  |             9 | Pending          | Pending            |

Release every physical control for preparation/idle. Press only the nominated direction for each of five prompts; hold and release on schedule. Repeat the four directions in fresh sessions, not just one run each. If the five-minute monitor expires between sessions, copy the current result, then explicitly Start Monitoring again; do not alter timers. Copy unsuccessful runs too, labeling them as such.

Expected **per positive summary** (these are requirements, not reported hardware results):

| JSON field                                                                    | Expected                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `control` / `candidateBit` / `format`                                         | Corresponding direction/bit above / `deck_v1_zero_prefixed65` |
| `outcome` / `reason`                                                          | `observed` / `completed`                                      |
| `counts.compatibleReports`                                                    | Positive, with fresh samples across all phases                |
| `counts.incompatibleReports` / `malformedReports`                             | 0 / 0                                                         |
| `counts.baselineEstablished`                                                  | true                                                          |
| `counts.observedPressEdges` / `observedReleaseEdges`                          | 5 / 5                                                         |
| `counts.expectedPressEdges` / `expectedReleaseEdges` (accepted on-time edges) | 5 / 5                                                         |
| `counts.completedCycles`                                                      | 5                                                             |
| `counts.missingPresses` / `missingReleases`                                   | 0 / 0                                                         |
| `counts.idleTransitions` / `outsidePhaseEdges`                                | 0 / 0                                                         |
| `counts.earlyEdges` / `lateEdges` / `repeatedEdges`                           | 0 / 0 / 0                                                     |
| `counts.reportGaps` / `framingChanged`                                        | 0 / false                                                     |
| `counts.finalReleased`                                                        | true                                                          |
| `counts.unrelatedKnownChanges` / `unknownBitChanges`                          | Record actual counts and review context; never hide them      |

For a clean isolated direction, investigate unrelated-known changes instead of accepting a diagonal/contaminated run merely because outcome is observed. Unknown-bit changes can be ordinary noise; inspect them without automatically calling the mapping wrong. Neither kind of change is exported as a mask or automatically promoted to verification. Missing samples/timing uncertainty require another fresh session, not guessed success or widened timing. Two positives are necessary evidence, not automatic reviewer approval.

## Negative-control sessions

Run each row once **for each nominated direction**, using fresh Start Probe sessions. Keep all controls released for preparation/idle. For idle-only controls remain hands-off throughout; for wrong-control tests follow the five press/hold/release prompts using only the physical control specified below, never the nominated one.

| Session label pattern                     | Probe nominee                         | Physical activity instead | Expected nominated evidence                    |
| ----------------------------------------- | ------------------------------------- | ------------------------- | ---------------------------------------------- |
| N-U-idle / N-D-idle / N-L-idle / N-R-idle | Up / Down / Left / Right respectively | None for whole session    | No press/release edges or idle false positives |
| N-U-opposite                              | Up                                    | Down only                 | No Up edges                                    |
| N-D-opposite                              | Down                                  | Up only                   | No Down edges                                  |
| N-L-opposite                              | Left                                  | Right only                | No Left edges                                  |
| N-R-opposite                              | Right                                 | Left only                 | No Right edges                                 |
| N-U-A / N-D-A / N-L-A / N-R-A             | Corresponding direction               | A only                    | No nominated edges                             |
| N-U-B / N-D-B / N-L-B / N-R-B             | Corresponding direction               | B only                    | No nominated edges                             |

A valid negative can be `inconclusive` / `incomplete_evidence`: baseline true, compatible reports >0, observed/accepted nominated edges 0/0, completed cycles 0 and missing presses/releases 5/5. That expected lack of nominated cycles is the point. Wrong-control edges should contribute unrelated-known counts, not nominated edges. Interpret actual counts/report gaps, not outcome alone; baseline_missing/deadline/no reports do not establish a clean negative. Any nominated edge during opposite/A/B activity blocks acceptance until investigated. Idle false positives are a failure of the negative control, not evidence of a press. If a result is ambiguous, copy it and repeat without changing drivers/tools.

## Secondary combination observations (only after individual repeats are reviewed)

| Session   | Nominated probe | Secondary control held during five cycles               |
| --------- | --------------- | ------------------------------------------------------- |
| C-U-A     | Up              | A                                                       |
| C-D-B     | Down            | B                                                       |
| C-L-Steam | Left            | Steam                                                   |
| C-R-QAM   | Right           | ⋯, only if safe without disturbing the test environment |

Establish the normal all-released preparation **and idle first**. Only after the idle interval ends, hold the secondary control while cycling the nominated direction; release it before final observation. Holding A/B/Steam/⋯ during initial preparation prevents the existing all-known-buttons-released baseline. Expect secondary known-bit changes and review them as intentional context. Never treat combinations as substitutes for clean individual tests. The physical shortcut must stay disarmed, so probe ⋯ cannot toggle Nepteer, but another controller utility may still react. Record Steam Deck Tools side effects; abort/skip if they interfere. Do not suppress, disable or reconfigure tools to obtain a clean result.

## Readiness and regression handoff

Abort one run midway; Stop Monitoring during another; verify terminal reason and no continued observation. Confirm no native D-pad state/transition is published or QAM navigation performed, including when the panel is open. Keep the existing shortcut/diagnostics conflict and Arm failure diagnostics intact. After stopping diagnostics, separately rearm ⋯ for the existing Step 5B keyboard/touch/physical-toggle regression; disarm before returning to probes. Test clean main-window shutdown and restart defaults. Existing NSIS/current-user/manifest and telemetry/theme tests still apply. No forced internal disconnect, driver change, service, elevation or anti-cheat game test is required.

Independent reviewer records per direction: repeat positives accepted/rejected/pending, negative evidence, combination context, hardware/software scope and unresolved noise/timing issues. No automatic physical promotion or production navigation follows. Step 5C.2 needs reviewed mappings, the desktop-only focus/event/fence design in ARCHITECTURE.md and its own implementation tests. The known game input pass-through limitation remains; input isolation requires a separate future routing review.

---

## Step 5B Arm lifecycle reproduction — pending on the diagnostic fix

The user reports ⋯ toggled Nepteer QAM successfully in Mongil: STAR DIVE, then a later Arm appeared to remain Disarmed after game close/native monitoring. This demonstrates one integration success, not a verified cause of the later failure. Do not infer HID reconnect, Steam Input state or process behavior from it. Use the same previously tested environment only; do not add game hooks, process detection, anti-cheat testing or driver/tool changes.

1. Install/launch the new CI artifact as a standard user. Confirm initial Disarmed and no automatic reader.
2. Rescan/select reviewed vendor collection; acknowledge configuration/consent and Arm. Observe request sent, worker/open/report/baseline progress, then Armed.
3. Open the previously tested game. Confirm one ⋯ press opens/closes QAM; keyboard/dashboard/Escape remain functional.
4. Close the game normally. Before another Arm, copy the safe summary and inspect phase, last attempt, worker termination, worker/open flags and report-observed flag. Record only safe status/context.
5. Open Controller and try native monitoring. If shortcut owns the reader, expect explicit Disarm instruction; confirm the shortcut is not silently stopped.
6. If shortcut ended, note its terminal reason. Explicitly Disarm any active shortcut, then Start Monitoring. Confirm one-reader ownership.
7. Return to shortcut controls. While diagnostics owns the slot, Arm must be visibly unavailable with Stop Monitoring recovery. Controller page-leave Stop is asynchronous: note whether owner becomes None after cleanup.
8. Explicitly stop/disarm the active mode and wait for cleanup. Rescan and select the current vendor collection. Retry Arm; observe pending and either active progress or a concrete rejection/termination reason.
9. If it fails, use Copy Shortcut Diagnostic Summary before retrying. Verify it has no path, serial, raw bytes/word/mask, username/process path or button history. Share only this safe summary and manually stated tool context.
10. Repeat Stop Monitoring→Arm and Disarm→Arm several times. Check stale selection recovery, no duplicate readers, no stale queued toggles and failure visibility after status polling/navigation.
11. If naturally observable, record access denied/busy/read failure/disconnect and manually rescan/rearm. Do not force internal disconnects or change firmware/drivers/tool modes.
12. Confirm 30-minute shortcut, five-minute diagnostics, 30-second probe limits and 350ms cooldown remain unchanged. Close main while armed, restart Disarmed; verify normal input/tools and uninstall cleanup.

CI/synthetic tests cannot reproduce the actual game-close/HID lifecycle. New hardware results and summaries are still required; no merge is authorized.

# Step 5B · Physical Quick Access shortcut testing

**New integration tests remain pending until performed on hardware.** Supplied mapping evidence: LCD/Windows 11, Steam Deck Tools controller Desktop mode, Steam running/Input unknown; exact native profile 28DE:1205, interface 2, FFFF/0001, descriptor/actual 65, zero-prefixed65. Five clean Quick Access bit-50 press/release cycles, Steam-only negative control and Steam-held + QAM cycles support this narrow route. They are not proof of all models/modes/software or this new lifecycle/focus path.

Keep keyboard/touch available. Do not disable/configure tools, Steam/Input/HidHide/Lizard Mode, change drivers/firmware, force disconnects, elevate or test anti-cheat-protected games. Record artifact/build, Windows/scaling/window mode, manually confirmed tool context and pass/fail/not tested. Do not share raw reports, device paths, serials or press histories.

1. Install the matching x64 artifact without elevation, using existing WebView2. NSIS is current-user; no drivers/services/startup entries.
2. Launch fresh: Physical Quick Access Shortcut is Disabled, QAM hidden, no automatic HID open. Restart must require manual selection/consent again.
3. Manually rescan/load and select reviewed native vendor interface 2, FFFF/0001, descriptor 65. Mouse/keyboard/virtual Xbox/other collections remain ineligible.
4. Stop normal diagnostics/probe first. Confirm reviewed LCD/Windows 11/Steam Deck Tools Desktop + Steam-running context only if true (Input may be unknown), consent, then explicitly Arm Physical ⋯ Shortcut. No settings are detected/changed automatically.
5. Confirm WaitingReports/WaitingBaseline before Armed, exact compatible reports and source WINDOWS HID. No reports after five seconds yields a terminal error, not guessed input or fallback. No diagnostic reader competes.
6. Safely hold ⋯ while arming: no initial toggle. Continue holding: no action, status waits for release. Keep keyboard/touch Disarm available.
7. Release and allow >=3 released samples over 200ms; then press once: QAM opens using the existing right-side window/coordinator.
8. Release: QAM does not toggle again. A release is not an action.
9. Hold ⋯ for several seconds after a valid press: only one toggle. Check repeated reports do not duplicate actions.
10. Release, then press ⋯ again: QAM closes. No extra visibility cache or duplicate window.
11. Repeat twenty open/close cycles; interleave holds/releases and check no duplicate reader, window, stuck focus or stale action.
12. Test rapid taps. Distinct accepted observed press edges >=350ms apart should toggle once each. <350ms presses are intentionally discarded and must never trigger later merely because held through cooldown. Record driver buffering/timing limitations honestly.
13. Steam alone: no Nepteer QAM action.
14. A/B/X/Y alone: no Nepteer QAM action despite prior correlation evidence.
15. Hold Steam while cycling ⋯: one toggle per valid ⋯ press, no Steam-derived action.
16. Mix Ctrl+Alt+Q, dashboard Open and physical ⋯; all must use actual current native QAM visibility (keyboard opens/physical closes; dashboard opens/physical closes).
17. Physical ⋯ opens, Escape/Close hides; repeat with outside-click hide. A later physical press operates the actual current state. Outside clicks must not force focus back.
18. Check ordinary desktop and non-anti-cheat borderless-windowed games separately: right placement/DPI/touch, focus capture/return and normal game behavior. Exclusive fullscreen is not guaranteed; record invisibility/minimization/OS activation denial without invasive workarounds.
19. Confirm Steam Deck Tools Desktop mode and ordinary controller behavior continue during/after the shortcut. Do not change settings or stop tools to improve outcomes.
20. Observe whether Steam Deck Tools/Steam independently react to ⋯ (including their own overlay). Record conflicts, do not suppress external actions, and disarm Nepteer if undesirable.
21. Disarm from Dashboard, Settings or the persistent bar on another main page. New edges stop immediately, pending tickets are invalidated and resources are joined/drained before Disarmed returns. Physical ⋯ no longer affects Nepteer; keyboard/dashboard fallback still works.
22. Repeat Arm/Disarm, including switching pages/minimizing/restoring while armed. Navigation/minimization must not implicitly disarm; one app-owned session continues until explicit stop/error/expiry/exit. Stale results/actions must not revive a prior session.
23. While diagnostics/probe owns the reader, Arm is rejected. While shortcut owns it, diagnostic Start/Stop/Rescan is rejected with explicit Disarm instructions; page-leave diagnostic cleanup must not kill the shortcut. Close the old mode before opening the next.
24. Allow native thirty-minute expiry. It must close observation, discard pending actions and require manual rearm with a fresh released baseline. There is no auto-renewal or five-minute diagnostic-worker restart loop.
25. Test naturally observable missing/unsupported reports or access/disconnect errors only if safe. >1.5s gaps require a new released baseline; incompatible framing/read errors terminate with a truthful status. No reconnect/interface/bit/source fallback. Synthetic tests cover faults that cannot safely be reproduced.
26. Close main while armed and QAM open. The fence invalidates before cleanup, read cancellation drains safely and process/windows exit without orphan worker/helper. A broken driver may delay cancellation; never free pending I/O or kill threads to hide it.
27. Restart: Disabled with no persisted arming/reader/input history. Verify Ctrl+Alt+Q and preferences/telemetry, normal diagnostic/probe functionality and source labels still work.
28. Uninstall: no retained controller settings, driver/service, startup entry, remapping, background process or input history remains.

Merge only after review and new hardware testing. Native CI is compilation/logic/packaging evidence, not Windows controller coexistence or focus validation. Other models, modes, tools and exclusive-fullscreen behavior remain outside the reviewed guarantee. No general physical input API/remapping/Steam shortcut is implemented.

---

## Historical Step 5A.1 · Physical Neptune button correlation

**Probe hardware results are pending.** Known user-reported baseline: Steam Deck LCD/Windows 11; Steam Deck Tools installed, Steam Controller.exe running, Desktop mode. Separate Steam client/Steam Input status was not confirmed. Reported collections: mouse interface 0 (0x0001/0x0002, length 6), keyboard interface 1 (0x0001/0x0006, length 9), vendor interface 2 (0xFFFF/0x0001, descriptor 65). Vendor reports: actual 65 bytes, deck_v1_zero_prefixed65, candidate ID 0x00/type 0x09, 42,808 candidate reports, 0 unsupported/malformed; intermittent idle and increased input activity. These aggregates do not fully verify framing or any physical mapping.

Keep a keyboard/touchscreen available. Do not uninstall/disable Steam Deck Tools, stop Steam, change Desktop mode/Steam Input/HidHide/Lizard Mode, modify firmware/drivers, unplug internal hardware, elevate or test anti-cheat-protected games. Unknown Steam/Input labels are valid. Mark each item pass/fail/not tested with safe aggregate results only.

1. Install the matching x86_64 artifact as a standard user with WebView2 already present. No elevation, driver/service or startup entry; QAM starts hidden and HID monitoring stopped.
2. Manually Rescan and inspect the three expected HID collections where present. Mouse/keyboard remain discovery-only. No serial/full device path/unique ID should be displayed or copied.
3. Select the eligible vendor-defined usage-1 descriptor-65 interface explicitly. Do not choose an arbitrary first VID/PID match or virtual Xbox controller.
4. Start normal monitoring and confirm actual length 65, zero prefix candidate report ID 0x00/type 0x09, deck_v1_zero_prefixed65 and normal compatible counts. Both hardware verification flags must remain No. Missing/incompatible reports must not enable the probe.
5. Keep normal monitoring running. The probe must reuse that one worker/handle; no second reader or hidden monitor is created. Check ordinary input still works.
6. In Physical Button Correlation, record Steam Deck Tools running Yes and mode Desktop **only if currently true**. Leave Steam running/Input Unknown unless independently known. These labels must change no controller behavior.
7. Select A. Read the explanation, separately consent, then Start Probe. It must never start from opening the page, choosing a control, consent alone or rescan. No Next clicks are needed after Start.
8. Preparation (0–4s): release all controls, rest the Deck, do not touch pads/sticks. Multiple identical released reports over >=500ms are required. No fresh baseline/no frames yields inconclusive, not verification.
9. Idle (4–7s): keep hands off. Follow five automatic cycles starting around 7/11/15/19/23s: press A in the 1.5s Press window, hold through the 1s Hold window, release in the 1.5s Release window. Keep controls released during the final 27–29s interval. Rust countdown may be sampled by the UI; do not anticipate the prompt.
10. Review the aggregate result and Copy Safe Summary. Expect five in-window presses/releases/completed cycles, final released, no nominated idle/outside-phase edges for a plausible observation. Inspect unrelated known/unknown edge counts independently. An Observed result is pending independent review, never physical verification. Save/share only the safe JSON and build/context, never raw packets/paths/serials.
11. Repeat independently for B/X/Y, preferably more than once each. A plausible A result must not mark B/X/Y or other controls verified.
12. Repeat Steam and Quick Access (⋯) separately, keeping touch/keyboard Abort available. Desktop mode may treat them differently; blocked/missing/ambiguous results are valid inconclusive evidence. Do not reconfigure tools to force access.
13. Compare nominated controls and safe summaries: Steam and ⋯ must be tested distinctly. Neither can open QAM. Do not call either verified from format/cadence alone.
14. Run negative controls: nominate A but leave hands off through all phases; expect missing cycles/inconclusive. Check idle counts do not increase just because reports arrive. If safely testing idle activity, record any false positives without changes to system configuration.
15. Optionally nominate A and press a second physical button with it during a cycle. Verify unrelated **edges**, not repeated held samples, are counted separately. Unknown changes are aggregate only; no raw bit mask should be shown. Record possible noise/contamination rather than treating every change as mapping failure.
16. Abort midway. The button must stay available; native status ends immediately (subject only to IPC delivery), retains only aggregates, and no later probe activity resumes automatically.
17. Stop Monitoring during a probe, leave Controller, rescan or switch the selected/owning interface. Active probe must abort; normal stop joins/releases the existing reader. Reopening shows actual current/terminal status and no stale native pressed cards.
18. Check normal ~29s completion and native hard 30s limit. If status/UI stalls safely, no evidence may be analyzed after the deadline; an incomplete/delayed/no-report run remains inconclusive. Do not manufacture driver failures or alter hardware to test this. Synthetic tests cover delayed tick/deadline logic.
19. Repeat probes and Start/Abort, including returning to Controller, without stale results, duplicate sessions or workers. A late response from a previous token must not alter a newer probe. No automatic retry/reconnect.
20. Confirm Steam Deck Tools Desktop-mode behavior and ordinary controller input keep working during/after the probe. Separate Steam/Input status remains observational; do not stop tools/services or claim universal coexistence.
21. Confirm Ctrl+Alt+Q/dashboard Open Quick Access and existing touch/Escape/focus restoration still work while normal monitoring/probe runs. QAM has no probe controls/permissions.
22. Confirm physical Steam/⋯ never opens QAM or sends keyboard/gamepad output from Nepteer.
23. Confirm normal native physical cards remain Unavailable and native recent transition history empty before/during/after the probe. Simulation remains explicitly SIMULATED INPUT and cannot run a physical probe or verify hardware. Retest telemetry/theme/units/navigation.
24. Close main with monitoring/probe and QAM open; process/worker/windows must exit cleanly. Fresh launch is unscanned/stopped with no result history. Uninstall leaves no driver/service/orphan/persistent controller behavior.

Read NEPTUNE_RESEARCH.md for exact windows/counters. >1.5s report gaps, late/early/missing edges, no hold/final samples or baseline instability intentionally prevent a positive observation. Actual timing synchronization, noise and mode-specific behavior need human review. An independent developer must review repeated per-control real summaries before any future mapping acceptance; this build has no promotion mechanism or physical event API.

---

## Historical Step 5A · Windows Neptune decoding validation

**No Step 5A framing or physical button mapping is verified.** Step 4 passed user-reported hardware checks, but no actual report IDs, lengths or control-correlated evidence was supplied to this task. CI/synthetic fixtures do not establish either. Do not disable Steam Input, elevate, change drivers/firmware, unplug internal hardware or test anti-cheat-protected games.

## Phase A: current build and safe framing observations

Record build/commit/artifact, Windows version, scaling and Steam Input running state. Share only safe interface usage/page/number, descriptor/actual lengths, candidate ID/type/format, counts and outcomes. Never paste raw HID streams, full paths, serials or unique IDs into chat.

1. Install/launch as a standard user with WebView2 already present. QAM is hidden; diagnostics are stopped/unscanned and no controller is automatically opened.
2. Open Controller → Windows native HID → Rescan. Confirm plausible candidate metadata, multiple collections stay separate, no paths/serials and mouse/keyboard/missing metadata stays discovery-only.
3. Select an eligible vendor-defined candidate, Start Monitoring explicitly. Record not-found, denied/busy, open-but-silent and reports-observed separately. No interface is selected automatically to force success.
4. Observe Report format: selected candidate, actual length, candidate HID report ID, message type, layout, recognition and aggregate candidate/unsupported/malformed counts. Expected published candidate body is version 1/type 0x09/declared length 64; a zero-prefixed 65-byte variant is proposed, not established. Bare message ID stays unidentified. Both hardware-verification fields must remain **No**, even for a match.
5. Observe idle count changes for 10 seconds, then press exactly one A button, hold, release and repeat five times. Record only count/format stability and Steam Input behavior. Current physical button cards must remain Unavailable with no transition history. Counts are not button evidence; do not mark Level 3 passed based on them.
6. Repeat safe framing observations for B/X/Y, D-pad directions, L1/R1, Steam and ⋯ individually, then simultaneous pairs. Check QAM is never triggered by physical controller input. Note that unrelated false button transitions cannot be evaluated in this build because native mapping is disabled.
7. Keep Steam running/Input enabled and confirm existing input works during/after observation. Optionally compare when Steam was already absent or another controller tool already holds access; do not terminate tools or take ownership to obtain reports. Stop on any interference.
8. Unknown format remains raw observation with unavailable controls; malformed content shows a bounded parser diagnostic and no releases. Transport-invalid lengths may still stop the worker. Do not force malformed packets on hardware or alter devices to test an error; synthetic tests cover these cases.
9. Stop explicitly: input is unavailable, history empty, counts/time labeled historical and no longer increasing. Repeat Start/Stop 20 times, rescan and reselect; no duplicate worker or stale state. Leave/reopen Controller to check cleanup and current native status.
10. Observe normal five-minute expiry, main close with QAM open, and fresh launch. No active monitor, input history, orphan process, driver/service or startup entry survives normal shutdown/uninstall. Natural disconnect/busy recovery is optional when safely observable, never requires internal unplugging or driver changes.
11. Retest Dashboard, theme/units/provider settings, telemetry and keyboard/touch QAM open/hide/focus. Ctrl+Alt+Q/dashboard entry retains existing behavior while monitoring. Physical Steam/⋯ never opens QAM.
12. Deliberately choose Simulated diagnostics → Rescan → select → Start. SIMULATED INPUT must remain visible. Expect A press/held/release then B+⋯ together; at most 32 ordered simulated transitions with session times, no repeated held presses. Phase 1 released values are neutral and unsupported triggers/rear/sticks/trackpads unavailable. Stop/restart clears input/history and establishes a new baseline; simulation cannot mark hardware verified.

Mark each item pass/fail/not tested with safe observations. Matching candidate headers only supplies review evidence; this build never auto-promotes to framing_verified or button_verified. No unsupported native control should visually highlight.

## Phase B: physical mapping evidence needed before enablement

Current native UI cannot correlate physical buttons with candidate bits: decoding is deliberately disabled. The proposed bounded local correlation probe in NEPTUNE_RESEARCH.md is **not implemented** in this milestone. Do not mistake simulated UI transitions for physical validation. First review the safe Phase A results and confirm the format/interface; if further byte analysis is needed, implement/review that explicit memory-only probe before asking the user to continue:

1. Select the reviewed collection/format and one physical control; opt in to a short local probe with a visible timer/abort. No arbitrary byte inspector, raw export or recording.
2. Start with every control released; establish baseline. Press only the selected button, hold, release, repeat five times. Review aggregate expected presses/releases/repeats and unrelated changes, never packet bytes.
3. Repeat independently for each Phase 1 control. Test idle periods and unsupported controls for false positives. A working A result must not promote Steam, ⋯ or another control.
4. Test simultaneous pairs and different release order, checking deterministic independent transitions with no unrelated false positives. Repeated held reports must yield one press, and first held baseline no historical press.
5. Record safe format/interface/build context and independent user observations, review with the developer, and only then consider an explicit per-control allowlist scoped to the verified format/interface. New sessions/reconnects require fresh baselines. Missing/inaccessible/noisy evidence stays unverified.

Outstanding Step 5B evidence includes actual Windows framing, continuous-versus-change delivery behavior, individual physical Steam/⋯ and other button correlations, false-positive/combination tests and Steam Input coexistence. Controller-driven QAM, mappings and all device writes remain excluded here.

---

## Historical Step 4 · Windows 11 Steam Deck LCD testing

**Step 4 hardware checks passed, as reported by the user.** Native CI builds and synthetic tests do not establish HID report availability, physical button compatibility or Steam Input coexistence. Historical Steps 1–3 passed user-reported tests, including 14 Step 3 tests.

Record branch/commit, CI run/artifact, Windows version, Steam running/not running, scaling and each result as pass/fail/not tested. Record only safe VID/PID/usage/interface metadata and summary counts/lengths/state. Never capture serials, full paths, unique IDs or raw input streams. No internal-controller unplugging, driver changes, unsupported hardware modifications or security bypass is required. Do not test anti-cheat-protected games.

| #   | Check                                                                                                                              | Expected / observation to record                                                                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Install and launch as a standard user with WebView2 already installed.                                                             | No elevation, service or driver. QAM starts hidden and HID is not scanned/opened automatically.                                                                                                                                                             |
| 2   | Open Controller, select Windows native HID, Rescan interfaces.                                                                     | Candidate count or honest not-found/error; no automatic monitoring.                                                                                                                                                                                         |
| 3   | Inspect every candidate.                                                                                                           | Plausible VID 0x28DE/PID 0x1205, optional usage page/usage/interface/length/descriptions. Multiple collections are separate. Keyboard/mouse/missing metadata remain discovery-only.                                                                         |
| 4   | Inspect UI and any shared diagnostic report.                                                                                       | No serials, full HID paths, unique instance IDs or raw bytes. IDs such as scan1-candidate1 are scan-local.                                                                                                                                                  |
| 5   | With Steam running and Steam Input enabled, select an eligible vendor collection and Start Monitoring.                             | Record access-denied/busy, open-but-awaiting-reports or raw-input-only separately. No exclusive takeover or configuration fallback. Leave Steam running; stop if normal input changes.                                                                      |
| 6   | Observe input count/length/time while operating physical controls.                                                                 | All buttons/sticks/trackpads remain Unavailable: there is no verified parser in this milestone. Increasing raw counts do not prove a specific button. No controller input opens QAM.                                                                        |
| 7   | Press Stop Monitoring, then continue normal input.                                                                                 | State stopped, read handle closed, counts/time historical and no longer increasing; no held state. Leaving Controller also requests stop.                                                                                                                   |
| 8   | Repeat explicit Start/Stop 20 times on an eligible interface.                                                                      | No duplicate worker, crash, accumulating handles or extra devices. Repeated Stop is safe; retry after a terminal error is manual.                                                                                                                           |
| 9   | Verify Steam Input and normal desktop/game controls throughout and after stopping.                                                 | Record any disruption; do not disable Steam Input or competing tools to force success. If Steam is already not running, a separate safe test is optional, not a requirement to terminate it. A preexisting other tool may prevent access; do not change it. |
| 10  | Open/close QAM with Ctrl+Alt+Q and dashboard button while monitoring.                                                              | Existing keyboard/touch/Escape/focus behavior works. Monitoring remains independent and controller buttons never toggle QAM.                                                                                                                                |
| 11  | Observe a natural device removal/reconnect only if safely available.                                                               | Disconnected/read error stops and closes. No auto-reconnect; rescan/start manually after reconnection. Otherwise mark not tested; never unplug the internal controller or change drivers/firmware.                                                          |
| 12  | Record access-denied/busy/unsupported outcomes if observable.                                                                      | Clear terminal error, no silent simulation, no elevation/exclusive fallback, manual recovery. Open-but-no-reports remains awaiting reports and expires after five minutes. No fabricated activity.                                                          |
| 13  | Retest Dashboard, Settings, telemetry and source/theme/units. Select explicit simulated diagnostics separately, rescan/start/stop. | Native labels stay WINDOWS HID; development data stays SIMULATED INPUT. Temperature/fan sensing, TDP, clocks, mappings, haptics and other hardware controls remain absent.                                                                                  |
| 14  | Close main while monitoring and QAM is open; repeat normal launch.                                                                 | Worker cancellation/join precedes clean process exit, no orphan windows/workers. Fresh launch is stopped/not scanned. Observe cancellation delay if a driver fails to complete; never bypass safe I/O cleanup.                                              |
| 15  | Uninstall as the same standard user.                                                                                               | No drivers, services, startup entries, orphan helper/process or remapping persists.                                                                                                                                                                         |

Also leave a session running for five minutes to verify native expiry and resource release even without another input report. Compare monitor handle-open status and report count; neither proves decoded button support. If Steam Input prevents passive access or no reports arrive, that is a valid Step 4 observation, not permission for exclusive takeover. Review NEPTUNE_RESEARCH.md before proposing protocol work.

---

## Historical Step 3 · Windows 11 Steam Deck LCD QAM checklist

Steps 1 and 2: CI and user-reported hardware smoke tests passed. **The user reports 14 successful Step 3 hardware tests; exclusive-fullscreen limitations remain.** Automated fake-backend/mock-runtime tests do not prove native activation or fullscreen behavior.

Record branch/commit, CI run/artifact URL, Windows version, display scaling, test application/window mode and observations. Do not collect serials, private application titles or window handles. Keep a keyboard available; Steam/⋯ and native controller interception are not implemented. Do not test anti-cheat-protected games in this initial validation; do not hook, inject into or modify any game.

1. Install the feature branch's x86_64 NSIS artifact as a standard user with existing WebView2. Record unsigned/SmartScreen behavior without disabling security. Stop on unexpected elevation. The runnable executable is also included.
2. Launch Nepteer fresh. The dashboard should appear; QAM must be hidden, not topmost and have no Windows taskbar entry. Restart after leaving QAM open to verify hidden startup again.
3. Use Open Quick Access from the dashboard. Expect one separate, opaque, borderless panel above an ordinary desktop window. A failure should show a dashboard diagnostic, not crash the app. Open again: no duplicate or unexpected focus change.
4. Press Ctrl+Alt+Q while Nepteer is running: toggle visible/hidden once per keypress. Hold/repeat and retest after window changes. Test a registration conflict if safely available; app startup must survive with a message and usable dashboard button. Do not install hooks or change OS security to force registration.
5. At 1280×800, verify right alignment within the active display work area, readable battery/source, no taskbar overlap and usable scrolling. Test configured DPI scaling, a second display if available, moving between displays, resolution/scale changes and monitor removal. Missing display events may require hide/show to recompute. No mode is changed by Nepteer.
6. Use touch, Tab/Shift+Tab, Enter/Space, planned rows and Close. Initial keyboard focus should be on Close, focus rings visible, Tab stay within the panel. Settings information should point to dashboard preferences; planned rows must not change hardware.
7. Reopen and press Escape: hide immediately, with no delayed closing animation. Alt+F4/native QAM close should also hide and leave dashboard running. Test reduced-motion preference for restrained opening.
8. Open from an ordinary foreground application using the shortcut. Explicit Escape/Close should attempt focus return where Windows permits. Close the prior app before hiding and confirm no crash. Foreground denial is permitted; do not use input synthesis or repeated force-focus. Click outside QAM: it should hide after activation and leave focus on the clicked target, not force it back elsewhere. Check for immediate show/hide loops.
9. Repeat show/hide/toggle 20 times, interleave dashboard button/shortcut/Escape/outside clicks, and check no duplicate windows, crashes or stale visibility. OS/app external hiding and display changes should be reflected by the next native query/show. No tray/helper should appear.
10. Confirm LIVE WINDOWS and actual battery/charging state, explicit unavailable/error/no-battery handling and manual refresh. Select mock in dashboard: QAM should show MOCK DATA and sample battery 78%; return to Automatic restores Windows reads. No sensors are polled while QAM remains hidden. CPU/GPU temperatures/fan sensing remain unimplemented.
11. Test ordinary desktop apps separately: keyboard/touch activation, z-order, blur, explicit focus return, minimized/restored dashboard and no taskbar entry for QAM. Record each outcome.
12. Test a non-anti-cheat game in borderless-windowed mode without modifying it. Record whether the panel is visible/interactable and whether focus/input return works. A game pausing on focus loss is game behavior, not a reason to hook it.
13. Test exclusive fullscreen separately if safe. Record invisible panel, minimized game, blocked activation or focus denial as limitations. **Exclusive-fullscreen compatibility is not guaranteed.** Return to windowed mode through the game's own settings for supported-environment testing; Nepteer must not change its display mode.
14. Change dark/light theme and temperature units in dashboard; QAM should follow saved theme on open/storage changes. Provider selection is shared in Rust for the session and resets to Automatic on application restart. Retest existing navigation/settings and telemetry without regressions.
15. Close main while QAM is open: the process and all windows must terminate. Restart and verify shortcut can register again. Uninstall as the same user; verify no orphan overlay, helper, service, driver, tray resident process or startup entry. No hardware restoration is needed.

## Troubleshooting

- Missing panel/shortcut: read the dashboard diagnostic and use Open Quick Access. Avoid multiple app instances. A conflict/OS restriction is not authorization for a keyboard hook or admin elevation.
- Foreground or fullscreen failure: record desktop/borderless/exclusive mode, scaling and reproduction steps. Windows restricts foreground activation even for topmost windows. Anti-cheat apps are out of scope; stop rather than bypass security.
- Wrong position after display change: hide/show recomputes from the display's current work area. Include resolution/scale/multi-display arrangement, not monitor serials.
- Blank/no launch: verify WebView2 and x86_64 build. Use Event Viewer application errors as needed and redact identities. Developer `pnpm dev` supplies terminal diagnostics; release has no persistent app logging plugin.
- Mark each item pass/fail/not tested and distinguish OS limitation from regression. CI success alone does not establish any of these native GUI/hardware results.

## macOS development differences

Control+Option+Q or the dashboard button opens the same panel with mock telemetry by default. Pointer/primary display placement, Escape/Close and main-close exit are implemented. Tauri skip-taskbar is unsupported on macOS; normal app Dock/Spaces rules remain. Explicit hide focuses the dashboard, not an external application. No private panel/Spaces APIs or accessibility hooks are installed. Test these separately from Windows.
