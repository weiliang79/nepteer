# Step 5F — QAM interaction refinements

## Step 6A — Functional QAM Settings handoff

Branch `feat/qam-functional-settings`, based on verified main `a18c6ae47a892c403aff4473c3234fa273b1f1a5`. Do not merge automatically. Step 5F is merged as PR #11 at `a18c6ae47a892c403aff4473c3234fa273b1f1a5`. The PR records user-reported Steam Deck LCD / Windows 11 acceptance, 10/10 passed. [Post-merge Desktop CI](https://github.com/weiliang79/nepteer/actions/runs/45866445385) completed successfully on that exact commit. Historical pending statements below describe their original handoffs; they do not replace that later evidence. Step 6A hardware acceptance is pending.

QAM Settings now exposes Dark/Light and Celsius/Fahrenheit as four semantic pressed-state buttons. Dashboard and QAM use the shared field-update preference store, existing key plus per-field revisions, storage notifications and same-origin BroadcastChannel request/state messages. Both theme and selected units update immediately; existing dashboard temperature formatting consumes the selected unit, without inventing native sensors. Storage failures retain session values and an unsaved warning; choosing an option retries. See [architecture](ARCHITECTURE.md#step-6a-preference-and-focus-contracts) for concurrency, migration, source evidence, error recovery and runtime limits.

Collapsed order: Close, Refresh, Performance, Controller, Display, Settings. Expanded order appends Dark, Light, Celsius, Fahrenheit; diagnostic order additionally inserts Slow Refresh immediately after Refresh. A invokes the actual focused button; B collapses/restores its owner, otherwise closes using native completion. Left/Right remain no-op. Expansion/selection retains current focus, parent restoration precedes removal, and refresh/external preferences do not move focus. Tab wraps all visible options; Enter/Space and pointer/touch use the same handlers. The section list scrolls within the existing window, keeping Close and Refresh accessible.

Browser evidence: independent same-origin Chromium pages used real localStorage/BroadcastChannel with mocked native IPC; bidirectional edits, rapid concurrent different fields and fresh-renderer dark/Fahrenheit persistence passed. At 400×760, document dimensions were 400×760, navigation scrolled internally, all preference targets were 147×48px, and actual focused options had a 3px theme outline. Screenshots were inspected in both themes. This is not Windows WebView2 or physical controller evidence. [Windows A–F checklist](WINDOWS_TESTING.md#step-6a--functional-settings-acceptance) remains pending, including actual profile/event delivery, full app restart and diagnostic cleanup.

Local validation passed: formatting, typecheck, ESLint, 157 frontend tests (64 QAM, 18 preference-store), binding drift, Rust check/test/Clippy (74 tests passed, one explicit generator ignored), and frontend builds. Diagnostic output verification confirmed button/label/delay present when enabled; normal output then confirmed all absent and was restored. JavaScript license inventory parsed ten groups; Rust inventory parsed 459 packages, with no dependency changes. All 29 relative documentation links resolved; the added primary documentation URLs were opened and reviewed. Workflow YAML parsed and the diff contains only the authorized exact-branch additions. `git diff --check` passed. Native sources, permissions, lockfiles, bindings, manifest and Step 5D/5F decisions remain byte-for-byte unchanged from the base.

Matching feature [native CI](https://github.com/weiliang79/nepteer/actions/workflows/ci.yml?query=branch%3Afeat%2Fqam-functional-settings) and [manual TEST ONLY builds](https://github.com/weiliang79/nepteer/actions/workflows/qam-focus-diagnostics.yml?query=branch%3Afeat%2Fqam-functional-settings), including exact final commit/artifact links and results, are recorded in the delivery report. The retained exact-true diagnostic gate/helper/tests/checker are unchanged. Only the exact feature branch is added to normal push CI and the manual diagnostic allowlist. No Rust, HID/parser/mappings, arming/deadlines, reader ownership, queue, claim/completion, visibility epochs, foreground/cleanup, bindings, permissions/CSP, manifest, installer identity/privileges, dependency graph or runtime-version changes. Step 5D desktop-only/pass-through and Step 5F press-edge-only decisions remain authoritative. No automatic arming, game-input interception/isolation, hardware writes, drivers, services or held-repeat.

Historical Step 5F handoff follows unchanged below; its original pending acceptance language is superseded by the PR #11 evidence above.

Branch `feat/qam-interaction-refinements`, based on latest main/PR #10 `c246bd268d12bb393f362200e63d44b6cf69c8ba`. Merged Step 5E tree matched the prior reviewed branch. No merge authorized; runtime version remains v0.5.0-alpha.2. Step 5E user hardware acceptance is retained; new Step 5F Windows visual/recovery acceptance remains pending. Step 5D decision is unchanged.

## Audited before edits

Rust owns private input edge/baseline handling, exact profile/framing, sole reader/session/cleanup, actual window visibility epochs and bounded generation/sequence-fenced claim/completion. React owns actual DOM focus, local click/section behavior, async rendering and defensive native-claim checks. Existing held reports do not repeat. Async focus/duplicate protection and stale-delivery handling were already implemented and reused.

Before: shared focus-visible styling could miss pointer-mode programmatic focus; controller navigation queried any enabled button; missing DOM focus made Previous/Next step away from implicit Close while Activate focused Close. Baseline synthetic tests (foreground QAM with missing DOM focus) reproduced the directional inconsistency and incidental-button targeting: three failed, Activate baseline passed. This is DOM-level evidence, not a newly claimed Windows hardware defect.

After: QAM-only actual-focus outline/keyline/background in theme colors, rounded section rows, distinct +/−/linked paragraph expansion cue. Explicit control markers retain normal six/test-only seven DOM order; hidden/inert/aria-hidden/CSS-hidden and disabled/busy controls cannot become controller destinations or activations. Busy Refresh remains focusable as an origin and in Tab order. Explicit Previous/Next/Activate with missing/hidden focus focuses the first available approved control, normally Close, without activating. Back retains collapse/close behavior, with safe fallback if the section owner is unavailable. No polling, input-mode selection state, pointer focus forcing or OS focus changes. Native claim/completion code and all async refresh/diagnostic logic remain unchanged.

## Visual and regression evidence

Synthetic browser verification used isolated headless Chrome 158.0.8127.37 and temporary local IPC fixtures, not Tauri/HID access. At 400×760, a pointer click then controller-style Next focused Controller with focus-visible=false, yet a 3px solid theme outline remained visible in dark/light screenshots. Performance remained expanded with − while Controller owned the ring. Browser touch moved DOM focus to Display; Next moved to Settings. Reduced-motion genuine reopen focused Close with transition 0s and zero opening animations. Missing DOM focus recovery also focused Close. Screenshots/fixture scripts remain under /tmp, not in Git. Chrome behavior is not Windows WebView2/DPI/touch acceptance; manual checklist is pending.

Local validation passed: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (128 passed in six files, including 54 QAM tests), `pnpm bindings:check` (one passed), `pnpm rust:check`, `pnpm rust:test` (74 passed, one intentionally ignored explicit generator), `pnpm rust:lint` (warnings denied) and `pnpm build:web`. The final type check first caught a test fixture assigning disabled to a generic HTMLElement; using the native disabled attribute corrected that test without changing runtime code. Sixteen additional frontend cases cover explicit order/wrapping in both builds, missing/hidden/unrelated targets, keyboard/touch interleaving, expansion/Back ownership and OS-focus rejection alongside existing busy, failure, stale provider/open, claim/unmount and reduced-motion coverage. No native test expectations change.

`VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true pnpm build:web` and `node scripts/verify-qam-focus-build.mjs enabled` passed (button, test label and delay chunk present). Ordinary `pnpm build:web` and checker `disabled` then passed (all three absent); final output remains production-only. `pnpm licenses:js` and `pnpm licenses:rust` inventories parsed successfully (ten JS license groups, 459 Rust packages); no dependency additions. Ruby Psych AST validated both workflow YAML files and sole diagnostic dispatch trigger; inline Python checked documentation relative links. `git diff --check` passed. Native/IPC/binding/dependency/diagnostic helper/checker and Step 5D decision sources compare unchanged against the base. Local native packaging was deferred to native Windows/macOS CI. Matching post-push CI/artifacts are identified by the delivery report and [Step 5F branch runs](https://github.com/weiliang79/nepteer/actions?query=branch%3Afeat%2Fqam-interaction-refinements); no build is evidence of physical acceptance.

## Held-repeat conclusion / scope

[Step 5F feasibility note](decisions/step-5f-dpad-held-repeat.md): repeat is plausible only with separately reviewed monotonic scheduling, fresh delivery/released baselines and atomic delivery credit, not HID frequency or catch-up queues. Candidate 600ms initial/180ms interval and 250ms freshness are unvalidated proposal values requiring hardware evidence. Benefits for six items are limited. Production stays press-edge-only; no repeat code, flag or setting. Step 5F.1 needs explicit approval.

Changed files/components: QuickAccess.tsx and its tests (targeting/recovery/semantic expansion), styles.css (QAM-only focus), AGENTS/README/architecture/safety/Windows checklist/this handoff plus the repeat proposal. DEVELOPMENT and the manual diagnostic workflow allow the new exact feature ref; normal CI adds the feature push trigger only. No shared Button, Rust/HID/parser/mappings/eligibility, arming/deadline/ownership/queue/claim/epoch/foreground/cleanup, DTO/bindings/capabilities, manifest/installer, dependency or runtime-version changes. Test diagnostics remain exact-true gated, manual-only, separately labeled and same-identity; do not run normal/test processes together. No game input suppression or new controls.

---

# Step 5E — Non-invasive QAM UX

Branch `feat/qam-navigation-ux`, based on merged main `335f1e2a6cc1b9871cb04429ad9d2f1bbdb7888e` (PR #9). No merge authorized. Runtime remains v0.5.0-alpha.2. Step 5D decision unchanged; Step 5E physical hardware acceptance is now user-reported complete. No automatic merge.

## Finalization: retained test-only diagnostics, manual packaging

Verified starting local/remote HEAD: `992178e55469612b4bd84a0989fc67c2b728d15b`. The user explicitly retains Slow Refresh diagnostics until controller feature development is complete, superseding immediate removal before Step 5E merge. It remains test-only infrastructure, not a production feature. No UI, tests, Vite flag handling, delay helper/checker or native behavior is changed in this follow-up.

Physical acceptance supplied by the user on Steam Deck LCD / Windows 11: D-pad, Tab/Shift+Tab and mouse/touch remain responsive during pending refresh; completion does not steal focus; duplicate activation is prevented; QAM closes immediately; reopen does not resume an obsolete delay; explicit Disarm completes safely. These observations preserve the original production focus fix and do not establish gameplay input isolation or unreported model/mode/failure compatibility. Historical implementation/test results below remain separate from the later acceptance report.

Only diagnostic workflow triggers/guard and documentation change. `qam-focus-diagnostics.yml` now has solely workflow_dispatch; the job also requires that event and exact main or feat/qam-navigation-ux branch refs. Push/PR/tag/release/normal-CI events cannot automatically start it. The true diagnostic flag, x86_64 executable/NSIS, enabled-output and asInvoker/uiAccess=false checks, contents-read permission, TEST-ONLY artifact naming and same-identity warning README remain. Standard CI is byte-for-byte unchanged: false flag plus compiled exclusion verification. The packaged README now describes retention rather than immediate removal.

Updated AGENTS/README/DEVELOPMENT/WINDOWS_TESTING/ARCHITECTURE and this handoff record retention, manual Actions/CLI ref selection, artifact retrieval, test-only/same-identity restrictions and user hardware evidence. GitHub documents a default-branch prerequisite, but the explicit CLI request here was accepted before merge with main still lacking the workflow. Document that observed feature-branch CLI behavior separately from possible web-button discovery limitations. Actual main dispatch remains a post-merge check; do not alter main or restore push triggers to force it. Local validation passed: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (112 passed, including 38 QAM cases), `pnpm bindings:check` (one drift test), `pnpm rust:check`, `pnpm rust:test` (74 passed/one intentionally ignored explicit generator) and `pnpm rust:lint` with warnings denied. `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true pnpm build:web` plus checker `enabled` passed; afterward ordinary `pnpm build:web` plus checker `disabled` passed and restored clean production output. No diagnostic contamination is left in the final dist. Ruby Psych AST parsed both workflow YAML files and verified the sole dispatch trigger, exact event/ref guard, diagnostic true flag and contents-read permission. Documentation links and `git diff --check` passed. All apps/scripts/normal-CI/dependency/binding/native files and the Step 5D record compare unchanged against the starting HEAD. No new tests or dependencies were needed for this workflow/documentation change. Exact post-push CI/dispatch results are in the delivery report and [branch runs](https://github.com/weiliang79/nepteer/actions?query=branch%3Afeat%2Fqam-navigation-ux); no new native acceptance is claimed by a build.

Observed post-push verification on implementation commit `54b9a61435bbe412f918c1b7a3071114a80f4616`: the push created only Desktop CI (event push), with no automatic diagnostic run. The authorized `gh workflow run qam-focus-diagnostics.yml --repo weiliang79/nepteer --ref feat/qam-navigation-ux` then returned a diagnostic run explicitly marked workflow_dispatch. A documentation-only follow-up records that observation and corrects the initially overbroad default-branch caveat. Final matching CI/manual-run/artifact links are supplied in the delivery report; main has not been modified or merged.

## Temporary slow-refresh diagnostic follow-up

User-reported physical evidence on Deck LCD/Windows 11: the production focus fix retains Refresh focus, reads complete and D-pad works afterward. This initial report led to the slow-refresh build. The subsequent pending-interaction acceptance is now supplied by the user and recorded above.

Exact build flag `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true` adds **Test Slow Refresh (5s)** and **TEST BUILD ONLY**, between normal Refresh and Performance. Default/unset/other flag values, development alone, storage and URL overrides cannot enable it in normal builds. A direct compile-time gate removes the dynamic `qam-focus-diagnostics` module from normal output. Vite build config normalizes unset/non-true values to an explicit false constant before chunk generation. The build checker verifies the button/label/chunk are all absent (normal) or present (test). The same real telemetry workflow is used, with handled success/error coordinated with an asynchronous >=5s timer; no main-thread or Rust sleep, fake native values or extra reader. Slow native reads still wait for their actual outcome.

The existing synchronous guard blocks both refresh controls while busy. Both remain keyboard-focusable but are skipped as controller destinations; from busy test button Up reaches Close, Down Performance. Completion never restores focus. New request/provider/open, hide or unmount cancels/invalidates the old timer, and sequence/alive fences prevent stale data/loading writes. The memoized refresh callback keeps the existing window-subscription effect stable; native claim/complete never awaits the telemetry timer. Production keeps its original six controls and immediate normal Refresh.

Changed files: QuickAccess.tsx/test; a temporary delay helper, Vite env type and build-time Vite config normalization; `scripts/verify-qam-focus-build.mjs`; normal CI forces/checks disabled output; separate `qam-focus-diagnostics.yml` builds/labels a Windows test artifact without releasing it. AGENTS, README, DEVELOPMENT, ARCHITECTURE, WINDOWS_TESTING and this handoff document scope, build commands, manual checks and removal. No native Rust/HID/telemetry/controller/lifecycle, IPC/permissions, bindings, version, dependency or installer privilege changes. Test installer uses the same app identity: exit Nepteer before replacing it, never run both instances, and return to a normal artifact afterward.

Local checks passed: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (112 passed across six files, including 38 QAM cases), `pnpm bindings:check` (one drift test), `pnpm rust:check`, `pnpm rust:test` (74 passed, one intentionally ignored explicit generator), `pnpm rust:lint` (warnings denied), JavaScript/Rust license inventories (ten groups/459 packages; no dependency changes), documentation link checks and `git diff --check`. One parallel formatting/inventory run encountered an ephemeral pnpm `_tmp` file ENOENT; running format serially after inventory completed passed without exclusions. No check was skipped or relaxed.

Normal `pnpm build:web` and explicit false builds passed `node scripts/verify-qam-focus-build.mjs disabled` (button/label/chunk absent). `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true pnpm build:web` passed the same checker with `enabled` (all present). Normal and diagnostic native packaging run separately in CI; [feature branch runs](https://github.com/weiliang79/nepteer/actions?query=branch%3Afeat%2Fqam-navigation-ux) identify each workflow by commit and the delivery report supplies matching run/artifact links. Local native packaging was not repeated; Windows diagnostic/macOS normal builds are CI work. Normal and diagnostic build verification runs independently; the verifier caught an orphaned delay chunk during implementation and the direct build-time gate and unset-value normalization corrected it. Fake clocks prove five-second success/error/long-read behavior and cancellation. Controlled pending promises with real DOM events cover keyboard/touch/controller interactions without waiting five seconds; existing normal focus/native fencing tests remain. No timers/timeouts or warnings are weakened to pass tests. The user has subsequently completed the physical slow-refresh checks and explicitly approved retention until controller development is complete. The earlier remove-before-merge plan is superseded; preserve the production focus fix.

## Step 5E follow-up: Refresh focus regression

User-reported on Deck LCD/Windows 11 in both session modes: Refresh automatically moved focus to Performance. Proven cause was the `[loading]` focus effect and native `disabled` on Refresh. Removed that effect. Refresh now retains DOM focus with `aria-disabled`/`aria-busy`; a synchronous in-flight ref blocks all manual activations (rapid clicks, Enter, Space, controller A), even before React commits loading state. The latest-request completion alone clears the guard; existing automatic open/provider reads can supersede pending reads using the unchanged sequence checks.

Controller Previous/Next retains all six buttons as ordering/origin information, skips busy aria-disabled destinations, and A ignores an aria-disabled target. In particular, Up from focused busy Refresh goes to Close, Down to Performance; Up from Performance/Down from Close skip busy Refresh. Keyboard Tab/Shift+Tab intentionally keeps the busy button focusable. Neither success nor failure moves focus; voluntary movement is respected. Close/Escape/B and the native claim/complete protocol remain unchanged. Older milestone references to automatically moving disabled Refresh focus describe the superseded behavior.

Changed files for this fix: QuickAccess.tsx, QuickAccess.test.tsx, ARCHITECTURE.md, WINDOWS_TESTING.md and this handoff only. No Rust, HID, IPC, permissions, bindings, native lifecycle or dependency changes. Added pending/success/failure, rapid mixed activation, controller A/Up/Down, voluntary pointer/Tab focus, Close/Escape/B and automatic provider/reopen request-order regression coverage. Fix-specific local validation passed: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (97 passed, including 23 QAM cases), `pnpm build:web`, `pnpm bindings:check` (one passed), `pnpm rust:check`, `pnpm rust:test` (74 passed, one intentionally ignored explicit bindings generator), `pnpm rust:lint` (warnings denied), documentation relative-link checks and `git diff --check`. Native/IPC/bindings/dependency files compare unchanged against the previous branch HEAD. Native packaging remains in the existing Windows/macOS matrix; [branch CI runs](https://github.com/weiliang79/nepteer/actions?query=branch%3Afeat%2Fqam-navigation-ux) identify the fix by its commit, with the matching run/artifact in the delivery report. Subsequent user-reported Windows testing confirms the fix and pending-refresh behavior as recorded above.

## Changes and contracts

Before: a Desktop/X360 dropdown mixed with detailed reader diagnostics, generic Armed status and footer-only pass-through copy. After: native radio cards with explicit **Physical shortcut only** (false/default/Desktop reviewed context) and **Controller navigation (desktop only)** (true/X360 reviewed context), prominent pre-Arm pass-through warning, concise mode-specific controls and platform-aware keyboard/touch/dashboard alternatives. Both existing acknowledgments still reset on mode changes; active/busy/pending setup stays disabled; no persistence or automatic Arm. Cards choose the next request, not a detected tool mode.

Native phase/source/owner/handle/worker plus configured/error fields determine displayed readiness independently of card selection. Waiting/terminal/disarming states never advertise navigation enabled. Last-known wording survives status connection failure; exact successful repeat status can reconfirm connection without overwriting state or accepting stale updates. Pending Disarm is not successful cleanup. Navigation error recovery only promises physical ⋯ when native active status and connection permit it; failures remain outside the technical disclosure. Safe summary copying, counters and timing details are retained under Technical session diagnostics.

QAM gains static 'when enabled' guidance near the header and native shortcut/Tab/Enter/Space/Escape footer help. No mode API or assumption, new interactive element, permission or claim/complete change. Existing six-control order and keyboard/controller/touch handlers remain intact. CSS adds responsive cards, text/border warning, focus indicators and compact short-viewport information spacing while preserving >=48px targets, themes and reduced motion.

Files: App.tsx passes its existing native hint; PhysicalQuickAccess.tsx handles presentation/status text; QuickAccess.tsx changes static copy only; styles.css handles layout; their existing tests and App.test.tsx cover updated labels/fixtures and new integration cases. Documentation updates AGENTS/README/architecture/safety/Windows checklist/this handoff. CI adds only the feature-branch trigger. No Rust, report mapping, reader/session/lifecycle, bindings, permissions, manifest, installer, dependency graph, runtime version or Step 5D decision changes.

## Validation

Local macOS validation passed (Node v24.14.1, pnpm 12.21.0, rustc 1.100.0):

- `pnpm format:check` — Prettier and Rust formatting passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed with zero warnings.
- `pnpm test` — 89 passed in six files: 32 shortcut, 15 QAM, 15 correlation, 12 diagnostics, 13 App, two telemetry. Includes fifteen added cases for native radio keyboard operation/default/consent/payload, warnings/control help, native readiness/remount/terminal/error/connection/disarm, static QAM focus/help/keyboard behavior and reduced motion. Existing stale event/claim/completion/controller/settings regressions remain.
- `pnpm bindings:check` — one drift test passed, generated file unchanged.
- `pnpm rust:check` — passed.
- `pnpm rust:test` — 74 passed, zero failures, one intentionally ignored explicit bindings generator; main/doc targets zero tests.
- `pnpm rust:lint` — Clippy all targets with warnings denied passed.
- `pnpm build:web` — TypeScript/Vite production build passed (48 modules).
- `pnpm licenses:js`, `pnpm licenses:rust` — inventories generated and JSON parsed (ten JavaScript license groups, 459 Rust packages). No dependency/license-policy changes.
- Inline Python check — documentation relative links and unchanged native/IPC/bindings/dependency/decision boundaries passed.
- `git diff --check` — passed.

Initial regression run passed 74 existing tests. Added tests initially exposed three assertions that needed to include the remaining-time suffix; corrected assertions then passed. No tests/checks were disabled. Native packaging ran successfully in the unchanged Windows/macOS CI matrix for implementation `a1c6ff3e809361e53852407947d7ab63bd8ce612`: [run 45057903832](https://github.com/weiliang79/nepteer/actions/runs/45057903832). Both jobs passed all validation (89 React tests, 74 Rust tests/one ignored generator) and license inventory uploads. macOS ran `pnpm build --bundles app`; Windows ran `pnpm build --target x86_64-pc-windows-msvc --bundles nsis` and verified the executable manifest `asInvoker`, `uiAccess=false`. [Matching Windows executable + installer](https://github.com/weiliang79/nepteer/actions/runs/45057903832/artifacts/14768550737). Local native packaging was not repeated; it was executed natively by CI.

The final follow-up commit records this observed result only. Its matching CI is discoverable under [feature branch runs](https://github.com/weiliang79/nepteer/actions?query=branch%3Afeat%2Fqam-navigation-ux); final delivery identifies its exact SHA/run/artifact rather than asserting future success in the file being tested.

Synthetic layout experiment: isolated headless Chrome, loopback Vite and temporary in-memory IPC fixtures, no native hardware/API access. At 1280×800 setup had no horizontal overflow; at 400×760 QAM document height was 760 with all six controls visible, heights 49–51px. Dark/light screenshots were inspected; fixtures/screenshots live only under /tmp and are not shipped. This is browser evidence, not Windows WebView2/DPI/touch/assistive-technology acceptance. Opening local test listeners required sandbox approval; no runtime permission changed.

New manual scenarios A–D in WINDOWS_TESTING cover shortcut-only, navigation consent/help, recovery/remount/last-known state and display/accessibility. Run on the desktop without an active game, in an already reviewed environment; record unmatched provider modes as Not run instead of altering tools. Existing native cleanup-barrier delays remain; no input isolation, interception or suppression is implemented.

---

# Step 5D — Controller input-routing feasibility

Branch `research/controller-input-routing`, based on main `6f879e542feeee37c95a85615d926e6d5a48d64f` (PR #8). Runtime version stays 0.5.0-alpha.2. The user reports Step 5C.2 hardware acceptance; earlier handoffs retain their historical pending status. No merge is authorized.

The [technical decision record](decisions/step-5d-controller-input-routing.md) contains the audited input pipeline, confidence-labeled diagram, Windows focus/version findings, all seven alternatives across the requested feasibility dimensions, fifteen failure/recovery cases, source register, evidence gaps and next-milestone proposal. Recommendation **2: retain desktop-only navigation and improve non-invasive UX**. No universal isolation contract was established; controlling the game-visible output or filtering devices would need a separately approved architecture. No production behavior, permissions, bindings, manifest, installer, dependency or version changes. No raw input, game/process inspection, new hardware experiment, routing simulation or third-party source reuse.

Changed files: AGENTS.md (research boundaries); README.md (current research link); architecture/safety/Neptune research (decision cross-links and scope); this handoff; new decision record; `.github/workflows/ci.yml` (research push trigger only, validation/packaging unchanged).

## Validation

Local macOS checks passed (Node v24.14.1, pnpm 12.21.0, rustc 1.100.0):

- `pnpm format:check` — Prettier and `cargo fmt --all -- --check` passed.
- `pnpm typecheck`, `pnpm lint` — passed, zero ESLint warnings.
- `pnpm test` — 74 passed across six files.
- `pnpm rust:check` — passed.
- `pnpm rust:test` — 74 passed, zero failures, one intentionally ignored explicit binding generator; main/doc targets zero tests.
- `pnpm rust:lint` — Clippy all targets with warnings denied passed.
- `pnpm bindings:check` — one binding-drift test passed; generated files unchanged.
- `pnpm build:web` — TypeScript/Vite production build passed (48 modules).
- Inline Python documentation consistency check — seven documents' relative links, 21 source references, A–H decision sections, fifteen failure rows and docs/CI-only scope passed; workflow diff adds exactly one branch trigger.
- `pnpm licenses:js` and `pnpm licenses:rust` — passed; temporary JSON inventories parsed successfully (JavaScript: ten license groups; Rust: 459 packages). No dependency or license-policy changes.
- `git diff --check` — passed.

No new automated tests were needed for a documentation-only change. Existing synthetic tests do not prove input isolation. Native CI for research commit `30a67a93cd70b213a52735b2036a10301efbe3dd` passed on both macOS and Windows: [run 45054234250](https://github.com/weiliang79/nepteer/actions/runs/45054234250). Each matrix job ran the unchanged validation and license inventory steps; macOS built its app bundle, Windows built x86_64 MSVC/NSIS and verified the executable manifest `asInvoker`, `uiAccess=false`. [Windows executable + installer artifact](https://github.com/weiliang79/nepteer/actions/runs/45054234250/artifacts/14767176220). These are the unchanged application, not an input-routing prototype.

A follow-up documentation commit fixes adjacent reference-link rendering, qualifies the XInput conclusion as a documented-authority limitation, and records validation. Its matching CI is available under [research branch runs](https://github.com/weiliang79/nepteer/actions?query=branch%3Aresearch%2Fcontroller-input-routing); the final delivery report identifies that commit/run. This avoids asserting future CI success in the file being tested. Local native packaging is intentionally skipped for documentation-only changes, as authorized for Step 5D. Existing Windows/macOS CI packaging remains enabled. Research/source inspection is not a test of game isolation. No new physical test is required for this docs-only change; unresolved consumer/provider paths and future approval gates are in the decision record.

---

# Step 5C.2 — Read-only desktop QAM controller navigation

Branch `feat/qam-controller-navigation`, based on merged main `f638bdd23981aceaf523beaa4e805f387abeb223` (PR #7). Source/instructions and Step 5C.1 proposal were inspected before edits. No merge is authorized. Package version remains 0.5.0-alpha.2; artifact SHA identifies this new navigation build. Historical handoffs below retain the evidence/status at the time they were written.

## Evidence / compatibility

User-provided LCD/Windows 11 results in manually reported Steam Deck Tools **X360**, Steam running/Input unknown: eight D-pad positives/two per direction, 40/40 cycles, sixteen idle/opposite/A/B negatives with zero nominated false edges, no incompatible/malformed frames/gaps/unexpected known/unknown changes in clean positives. Scoped reviewed bits are Up8/Down11/Left10/Right9/A7/B5/⋯50, on native 28DE:1205/interface2/FFFF:0001/descriptor+actual65/deck_v1_zero_prefixed65. No model/firmware/mode detection or universal compatibility claim. This evidence supports implementation; **new navigation hardware acceptance is pending**.

## Implemented architecture / changed files

- New `neptune/navigation.rs`: pure per-control released edge machine, typed six-action/event/request/claim/diagnostic DTOs, bounded queue/one in-flight claim, pending-age deadline, safe issues, logical completion barrier and instance-scoped destruction cleanup. Tests exercise mappings/holds/gaps/combinations, epochs/generation/expiry, overflow/timeouts, partial failures, disarm barrier and recreation.
- `shortcut.rs`/`neptune/mod.rs`: same existing native observer/read handle parses navigation alongside unchanged ⋯ logic. Request `navigation` defaults false for old callers. Existing dispatch tags private tickets for navigation versus Toggle; no general controller stream. The diagnostic worker stays separate/mutually exclusive with five-minute/probe thirty-second limits. Shortcut stays thirty minutes. Cleanup reports Disarming while an already-granted delivery is outstanding, after dropping/draining the reader; it does not claim success early. Synthetic integration proves one backend open handles both action routes and read error ends both.
- `quick_access.rs`: authoritative actual visibility/existence epoch, private window-instance destruction callback, bounded navigation drainer and native claim/completion/Hide coordination. All keyboard/dashboard/physical/blur/Close/Escape lifecycle paths retain existing focus/geometry behavior. Redundant visibility does not create an epoch. Old renderer callbacks cannot release a new renderer's claim.
- `lib.rs`, `build.rs`, QAM capability, two generated permission files: QAM-only local `qam_navigation_claim` and `qam_navigation_complete`; main/other/remote denied, QAM still denied HID management. No CSP/navigation/shell/filesystem or Windows manifest broadening. Generated bindings extended explicitly, not handwritten.
- `QuickAccess.tsx`/`lib/quick-access.ts`: typed subscription, native status/claim validation and bounded client ordering, direct local focus/button behavior and completion even after stale response/unmount. No synthesized OS keys. Close/Back during navigation defer native Hide until completion so the action cannot wait on its own lease. Redundant visible/provider events no longer reset focus; disabled Refresh has deterministic fallback. Tests cover the actual React handlers, duplicates/late delivery, queued response order, hidden/reopen, cleanup and paused response.
- `PhysicalQuickAccess.tsx`/`lib/physical-shortcut.ts`: **reviewed session mode** selector, default Desktop (existing ⋯ only) or explicitly X360 (desktop navigation). Changing mode resets both existing acknowledgments. No tool configuration/detection or persisted opt-in. Safe copied diagnostics add only configured/pending/delivering/fixed issue, never actions/history. Existing test DTOs updated and X360 opt-in tested.
- AGENTS/README/current architecture/safety/research/Windows checklist and CI feature-branch trigger updated. No dependency added, no HID/telemetry implementation changed.

## Actual semantics / lifecycle safety

Up/Down wrap Close → enabled Refresh → Performance → Controller → Display → Settings. A activates only the actual focused enabled button; invalid focus is focused safely before activation rather than clicked blindly. B collapses a section/restores its button focus, otherwise native Hide. Left/Right are no-ops. Initial holds, reopening while held, >1.5s gaps, diagonals and multiple navigation controls require released baselines; no repeat. X/Y/Steam/⋯ held suppress navigation conservatively. Original ⋯ baseline/cooldown/behavior with other buttons held is unchanged. Normal diagnostic native states/history and verification flags are unchanged.

Wire offer: `qam-navigation` only to quick-access, `{ request: {generation, epoch, sequence}, action }`. Native claim checks actual visibility/current epoch/outstanding request/session fence/opt-in/deadline before authorizing one action. Four pending plus one delivery; 500ms from enqueue including queue time. Frontend checks native-derived current epoch, document visibility/focus, exact tokens and elapsed client monotonic request time before applying local handlers. One bounded pending client offer handles completion-reply ordering without an event backlog. Complete acknowledges even discarded or unmounted work. Native performs requested Hide only when the same session/epoch/deadline remains valid; window-inspection failure releases completion without Hide.

Disarm/error/expiry invalidates new/unclaimed work immediately. Native hide/show/toggle and successful reader cleanup wait for already-granted delivery acknowledgment outside coordinator/reader/status locks. QAM completion does not take reader operations mutex, preventing a join/ack cycle. Old epoch/generation/sequence/delivery failures are ignored, and destruction cleanup is scoped to the actual window instance. No pending input is replayed in a fresh opening or later session.

**Deviation/tradeoff from the proposal:** grant lifetime is not force-revoked at 500ms. A paused frontend might otherwise act after successful cleanup. An unresponsive but still-live renderer or failed completion transport can therefore delay Hide/disarm/shutdown; main status stays Disarming/delivering until completion/destruction. No false Disarmed result, forced thread kill, early I/O free, renderer watchdog or hard cleanup deadline. Existing broken-driver cancellation delay remains. This is an explicit native failure-mode review/hardware acceptance limitation. Healthy source/renderer shutdown is covered synthetically; actual OS focus/transport/HID behavior is not proven by tests.

Delivery overflow/failure/timeout disables only navigation for the current generation until explicit Disarm/rearm. No reconnect/retry storm or interface/source fallback. Keyboard/touch/dashboard and valid ⋯ Toggle remain available during ordinary navigation failures; an outstanding granted claim can defer window operations until completion, as described above. A/B/Steam/X/Y general shortcuts, controller emulation/remapping/input injection, exclusive access, configuration/writes, drivers/admin/services and game/anti-cheat hooks remain absent. Navigation observes shared input; it does not isolate a game. Test with **no active game**.

## Validation / remaining hardware work

Local validation passed on macOS arm64 (Node 24.14.1, pnpm 12.21.0, Rust 1.100.0):

| Command                                   | Actual result                                                   |
| ----------------------------------------- | --------------------------------------------------------------- |
| `git fetch origin`                        | Passed; branch from requested merged main                       |
| `pnpm bindings`                           | Passed; explicit generated DTO update                           |
| `pnpm format` / `pnpm format:check`       | Passed; Prettier/Rustfmt                                        |
| `pnpm typecheck` / `pnpm lint`            | Passed; zero ESLint warnings                                    |
| `pnpm test`                               | 74 passed in 6 files, including 13 QAM and 19 shortcut UI cases |
| `pnpm bindings:check`                     | Passed; no-write drift check                                    |
| `pnpm rust:check`                         | Passed                                                          |
| `pnpm rust:test`                          | 74 passed, one intentionally ignored explicit generator         |
| `pnpm rust:lint`                          | Passed; all-target Clippy with -D warnings                      |
| `pnpm build:web`                          | Passed; production Vite bundle                                  |
| `pnpm build --bundles app`                | Passed; native macOS executable and app bundle                  |
| `pnpm licenses:rust` / `pnpm licenses:js` | Passed; dependency graph unchanged                              |
| `git diff --check`                        | Passed                                                          |

Native tests add edge/baseline/combination semantics, bounded age/queue/partial-failure/instance/disarm barriers, actual single-reader integration, native epoch coordination and QAM-only IPC ACL checks. Frontend tests exercise actual internal focus/activation/Back/Close, disabled Refresh, Left/Right no-op, native status ordering, stale/paused/duplicate offers, completion-reply ordering, cleanup, provider/theme and X360 consent. All previous regression suites remain enabled. Initial DTO fixture/import and React ref-lint errors were corrected, not suppressed. No check or capability was disabled to make tests pass.

Implementation commit `8d3cb7450c260d94e2b1e3acecde7bcae7a53823`: [Desktop CI run 45048797614](https://github.com/weiliang79/nepteer/actions/runs/45048797614) passed on both platforms.

- [macOS job](https://github.com/weiliang79/nepteer/actions/runs/45048797614/job/137289141425): validation, binding drift and actual macOS app bundle passed.
- [Windows job](https://github.com/weiliang79/nepteer/actions/runs/45048797614/job/137289141242): validation, binding drift, MSVC x86_64/NSIS, output/manifest verification and uploads passed.
- Both logs confirm 74 frontend and 74 Rust tests passed, one ignored explicit generator and `bindings_are_current` passed. All existing checks remained enabled.
- [Matching executable/installer artifact](https://github.com/weiliang79/nepteer/actions/runs/45048797614/artifacts/14765066110): `nepteer.exe` (10,251,264 bytes) and `bundle/nsis/Nepteer_0.5.0-alpha.2_x64-setup.exe` (2,238,676 bytes). Extracted executable manifest verification printed `Verified executable manifest: asInvoker, uiAccess=false`; current-user installation/WebView2 requirements are unchanged.

The following handoff-only commit changes no implementation. No merge has been performed. CI is not hardware acceptance. Windows installer execution, physical input/navigation and actual native focus/coexistence/failure-mode checks were not run locally. The 24-step Step 5C.2 checklist at the top of WINDOWS_TESTING.md covers opt-in, all actions/focus/wrapping, holds/diagonals/reopening, keyboard/touch/theme/provider, visibility/disarm/reader conflicts, stress, expiry and clean exit. No gameplay test is required. New physical navigation tests, standard-user installer execution and native GUI/focus/coexistence/failure-mode validation remain pending until the user reports them. No automatic evidence promotion or input-isolation claim.

---

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

Implementation/test/documentation commit `771cd899ab65774754fd94fde488a5d6b31eb7b0`: [Desktop CI run 44907342876](https://github.com/weiliang79/nepteer/actions/runs/44907342876) passed on both platforms.

- [Native macOS job](https://github.com/weiliang79/nepteer/actions/runs/44907342876/job/136855632780): validation, binding drift and actual macOS bundle passed.
- [Native Windows job](https://github.com/weiliang79/nepteer/actions/runs/44907342876/job/136855633109): validation, binding drift, MSVC x86_64 build, NSIS, manifest/output checks and uploads passed.
- Both logs: 65 frontend tests and 62 Rust tests passed, one intentionally ignored explicit generator; `bindings_are_current` passed. Formatting, TypeScript, ESLint, Rust check, all-target Clippy and web production build remained enabled.
- [Matching Windows executable/installer artifact](https://github.com/weiliang79/nepteer/actions/runs/44907342876/artifacts/14708621948): `nepteer.exe` (10,057,216 bytes) and `bundle/nsis/Nepteer_0.5.0-alpha.2_x64-setup.exe` (2,200,264 bytes). Extracted manifest verification printed `Verified executable manifest: asInvoker, uiAccess=false`; current-user NSIS and WebView2 requirements are unchanged. Exit the old app before installing this same-version branch build and check the D-pad guidance appears after selecting a direction.

The following handoff-only result commit changes no runtime/test behavior. CI is not physical verification; no merge has been performed. Not run locally: Windows installer execution, actual D-pad/probe/GUI/game/tool coexistence tests. Synthetic results cannot establish actual D-pad mappings, Windows GUI behavior, Steam Input coexistence or isolation. Physical matrix and reviewer decisions remain pending. Existing Step 5B historical logs below are not Step 5C.1 results.

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
