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
