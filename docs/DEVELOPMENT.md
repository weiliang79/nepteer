# Development

## Step 6B.1 research development

Branch `research/windows-sensor-feasibility` starts at verified main `8d54db41b8995274ccbe37f57257988bb38dd08f` (merged PR #12). [Post-merge CI](https://github.com/weiliang79/nepteer/actions/runs/45934968732) passed; PR #12 records user-reported Step 6A acceptance, 12/12 LCD/Windows 11 checks. Historical pending text below is retained.

Read the [sensor feasibility decision](decisions/step-6b1-windows-sensor-feasibility.md). This is documentation-only research; no experimental binaries, production sensors, generated-binding/dependency changes or hardware access. Run the usual format/typecheck/lint/frontend/bindings/Rust checks, license inventories, links and diff-scope verification. The exact research branch is added only to ordinary CI pushes for unchanged Windows/macOS validation/packaging. No diagnostic dispatch, new test build or hardware-enabled CI is required; the manual diagnostic workflow remains unchanged. Physical discovery is manual and pending, and any GPU API experiment needs a separately reviewed procedure before execution.

## Step 6A settings development

Step 5F is merged as PR #11 at `a18c6ae47a892c403aff4473c3234fa273b1f1a5`. The PR records user-reported Steam Deck LCD / Windows 11 acceptance, 10/10 passed. [Post-merge Desktop CI](https://github.com/weiliang79/nepteer/actions/runs/45866445385) completed successfully on that exact commit. Historical pending statements below describe their original handoffs; they do not replace that later evidence. Step 6A hardware acceptance is pending.

`src/lib/preferences.ts` centralizes validation, field updates, persistence, storage notifications and same-origin BroadcastChannel synchronization. Use `updatePreference(field, value)` rather than writing a stale whole Preferences object. Both roots use the same hook; theme application is in its effect. Metadata extends the existing JSON key, without changing the public model/dependency graph. Session choices survive React remount and transient storage errors; selecting an option retries saving. A read cannot clear a prior failed-write warning. Cross-field concurrency is eventually reconciled; no atomic multi-field transaction is promised.

Run standard root checks, `pnpm licenses:js`, `pnpm licenses:rust`, and both existing `verify-qam-focus-build.mjs` modes. The test suite includes normal/diagnostic expanded control order, A/B, keyboard/touch, stale native claims, storage failures and independent-renderer convergence. Native press-edge-only tests remain unchanged. The script `scripts/verify-preferences-browser.mjs` provides a separate real Chromium storage/channel check with mocked native IPC, not WebView2 verification: start Vite on :1420, launch isolated headless Chrome with `--remote-debugging-port=9226 --user-data-dir=<temporary-profile>`, then run `node scripts/verify-preferences-browser.mjs`. `BROWSER_CDP` can override the loopback debugging URL. It opens/closes its own pages, uses synthetic mock telemetry, asserts bidirectional/rapid changes and fresh-renderer persistence, and saves light/dark screenshots in the OS temporary directory. Never attach it to a personal browser profile. No project dependency is required.

For Step 6A manual TEST ONLY packaging, dispatch `gh workflow run qam-focus-diagnostics.yml --repo weiliang79/nepteer --ref feat/qam-functional-settings`. Only this exact branch is added to the existing ref guard; workflow_dispatch remains the sole trigger. Standard CI forces false and builds native macOS/Windows packages with production exclusion verification. Restore `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=false pnpm build:web` and checker `disabled` after local diagnostic verification. All earlier helper/cancellation/identity warnings still apply. Windows instructions and profile/delivery checks are in [WINDOWS_TESTING.md](WINDOWS_TESTING.md). No Rust, HID/parser/mappings, arming/deadlines, reader ownership, queue, claim/completion, visibility epochs, foreground/cleanup, bindings, permissions/CSP, manifest, installer identity/privileges, dependency graph or runtime-version changes. Step 5D desktop-only/pass-through and Step 5F press-edge-only decisions remain authoritative. No automatic arming, game-input interception/isolation, hardware writes, drivers, services or held-repeat.

## macOS

Use Node 24, pnpm 12.21.0, current stable Rust, rustfmt/clippy, and Xcode Command Line Tools. See [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). This app is developed with Node 24.14.1 and Rust/Cargo 1.100.0; the lockfiles define resolved dependencies.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build --bundles app
```

The bundle is `target/release/bundle/macos/Nepteer.app`. The first native build downloads and compiles the WebView shell and can take several minutes. `pnpm dev` must resolve the `pnpm` executable for its before-dev hook; use `corepack enable` or install the pinned pnpm version. Press Ctrl+C in the launch terminal to stop development. An occupied port 1420 is an error, not an automatic port change.

## Windows build machine

Use a native x86_64 Windows environment, Node 24, pinned pnpm, current stable Rust for `x86_64-pc-windows-msvc`, Microsoft C++ Build Tools (Desktop development with C++, MSVC and Windows SDK), and Microsoft Edge WebView2. The full Visual Studio IDE is unnecessary. Follow [official Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows). Do not attempt to produce a Windows shipping bundle through macOS cross-compilation.

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build:web
pnpm rust:check
pnpm rust:test
pnpm rust:lint
pnpm build --target x86_64-pc-windows-msvc --bundles nsis
```

Tauri automatically merges `tauri.windows.conf.json` to select NSIS on Windows; macOS defaults to an app bundle.

The installer is under `target/x86_64-pc-windows-msvc/release/bundle/nsis/` and the runnable is `target/x86_64-pc-windows-msvc/release/nepteer.exe`. For Rust formatting/checks install the rustfmt and clippy components. `pnpm format:check` checks both languages.

Windows MSVC builds embed `windows-app-manifest.xml` through `build.rs` for both app and test executables. Common Controls v6 is required for Tauri's test harness to load (upstream issue [13419](https://github.com/tauri-apps/tauri/issues/13419)); the manifest explicitly retains `asInvoker` and `uiAccess=false`. This is build metadata, not a driver or privileged helper.

## Quick Access development

Start `pnpm dev`, then use Open Quick Access or Control+Option+Q on macOS / Ctrl+Alt+Q on Windows. The panel starts hidden. Shortcut conflicts are reported in the dashboard; the button remains available. Escape or Close hides QAM; main close exits all windows. Run only one development instance when testing registration. No accessibility/input-hook workaround is installed.

QAM uses the same local Vite/bundled page with `?qam`. Browser preview cannot perform native window operations. Rust owns lifecycle/status; frontend code never calls create-window APIs. Windows skips the QAM taskbar entry; macOS skip-taskbar is unsupported. On macOS, pointer display selection and return-to-dashboard are supported, while external-app/Spaces restoration is not. Native foreground behavior needs manual GUI testing; CI only builds and tests pure/mock-runtime logic.

For changes, run `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm rust:check`, `pnpm rust:test`, `pnpm rust:lint`, `pnpm bindings:check`, `pnpm build:web`, and `pnpm build --bundles app` on macOS. `pnpm bindings` also generates the Rust-owned QAM status event/response type. The plugin registers in Rust only; do not add frontend plugin/window permissions to work around errors. See ARCHITECTURE.md for the async creation and worker-serialization boundary.

## Providers

macOS Automatic mode uses the fixed Rust mock provider. Windows Automatic uses real battery/device reads. In the native app, select Settings → Telemetry provider → Mock samples (development) to deliberately test mock mode, then return to Automatic to restore live Windows reads. Provider selection is session-only in Rust, defaults to Automatic after application restart, and is not stored with theme/unit preferences. QAM reads it without a mode argument; only the main dashboard may change it. No environment variable, shell plugin or extra IPC command is needed. A failed read never changes providers.

The Windows-only dependencies are `windows-sys` 0.61 and `wmi` 0.18.4 (default chrono feature disabled). `GetSystemPowerStatus` is called through its documented binding, checking success before reading the output. WMI queries only `Manufacturer, Model` from local `Win32_ComputerSystem`. COM/WMI stays on one blocking worker per request; the library initializes COM as needed. No unique fields are selected and raw WMI errors are not exposed. A stalled synchronous WMI query can delay that request; cancellation/deadlines are not implemented. There is no background polling.

## IPC and model changes

Edit `apps/desktop/src-tauri/src/telemetry.rs`, then run `pnpm bindings` and review the generated `src/lib/bindings.ts`. Run `pnpm bindings:check` to verify drift without writing files. Ordinary Rust tests always check bindings and never regenerate them; only `pnpm bindings` explicitly runs the ignored export test. Run `pnpm test` for loading/error/retry, settings, zero versus unavailable, and dashboard rendering tests. Rust tests cover synthetic Windows power outputs (including 255, no battery, invalid values, zero and API failure), charge states, device lookup failure/placeholder normalization, provider selection, IPC permissions and binding drift. Native calls are conditionally compiled; conversion tests run on macOS as well.

The browser alone cannot call Rust. A connection error in a browser is expected. Use `pnpm dev` for the native path. If the app reports a command permission failure, inspect the command registration, build manifest and main capability together; do not grant blanket core or filesystem access.

## CI

Pushes to `feat/neptune-qam-shortcut`, `feat/neptune-button-correlation`, `feat/neptune-input-decoding`, `feat/neptune-discovery` and `feat/quick-access-menu` run the same native matrix as main. The workflow runs frontend validation and Rust fmt/check/tests/clippy on native macOS and Windows, then bundles a macOS app and Windows x86_64 NSIS installer. Upload fails if Windows output is missing. Workflow permissions are read-only; nothing publishes a release. License inventories accompany each job. Both local tests and CI use a binding-drift assertion rather than modifying committed models. `.gitattributes` forces LF for text even when Windows Git uses `core.autocrlf=true`; binary icons are excluded from conversion. Hosted runner success is build evidence only; manually validate on Windows Deck hardware.

No automated GUI launch or macOS signing/notarization is claimed. For launch diagnostics use the dev terminal; on Windows use the troubleshooting steps in WINDOWS_TESTING.md.

## Controller diagnostics development

Use Controller → Rescan interfaces → select an eligible collection → Start Monitoring in the native Windows app. Listing/status calls are cached reads. Source selection only takes effect on a deliberate rescan, which first stops any active monitor. No device opens at app startup. Start is opt-in, Stop is idempotent, no auto-reconnect occurs, and sessions expire after five minutes. Leave Controller to stop observation. Opening QAM preserves the active session; controller buttons never operate QAM.

macOS native HID discovery returns unsupported. To exercise the real coordinator/UI without a device, choose Simulated diagnostics (development), rescan and start. This mode is independent of Settings telemetry selection; the SIMULATED INPUT label must remain visible. Never use simulation as automatic recovery from Windows access failure. Browser preview cannot invoke native diagnostics; use `pnpm dev`.

The existing windows-sys dependency now enables SetupAPI, HID, file/overlapped-I/O and threading bindings. Windows links inbox OS libraries; there is no hidapi/libusb DLL to deploy. The read transport deliberately has no write methods. Do not add feature/output/configuration calls to obtain a report stream. See NEPTUNE_RESEARCH.md for API/protocol evidence and why decoding is deferred.

Edit Rust DTOs in `neptune/mod.rs` and run `pnpm bindings`; `pnpm bindings:check` verifies telemetry, QAM and controller declarations together. Run all root validation commands listed above. Rust uses synthetic readers to test candidate policy, duplicate workers, terminal errors, cancellation, expiry, private-ID serialization and permission boundaries. React tests exercise discovery/selection, explicit start/stop, live/simulated/unsupported labels, errors, native-event ordering and cleanup. Neither suite proves Windows driver access or Steam Input coexistence. Build MSVC/NSIS natively in CI and perform the Step 4 hardware checklist separately.

## Step 5A parser development

On macOS, select Simulated diagnostics → Rescan → select interface → Start. The deterministic eight-state cycle repeats each state for ten 50 ms reports: baseline, A press/hold, release, B+⋯ press/hold, release/idle. Phase 1 controls show pressed/held or released with SIMULATED INPUT; other controls stay unavailable. At most 32 ordered transitions show milliseconds since session start. Stop/restart resets history and baseline. No simulated button action affects QAM or Windows.

Native mode classifies candidate framing and exposes safe format/count/error summaries, but **all physical button states remain unavailable**. Hardware framing and per-control meanings have not been independently validated for this Windows reader. There is no setting, environment variable, IPC permission or automatic byte-match path to promote them. Matching a candidate is Level 1 only, not verification. Review NEPTUNE_RESEARCH.md and WINDOWS_TESTING.md before collecting safe hardware observations. No raw input export is provided. Step 5A.1 implements the separate opt-in aggregate correlation probe described below; normal native decoding remains disabled.

Run `pnpm bindings` after Rust DTO changes, then `pnpm bindings:check` and all existing validation/build commands. The parser accepts borrowed bytes with checked lengths/indexing and explicit little endian; synthetic fixtures test protocol logic only. Pure tests cover baseline/held/press/release, simultaneous states, malformed recovery, unsupported/format resets, history limits and the native evidence gate. Worker tests retain cancellation and add simulated stop/restart/expiry cleanup. Frontend tests reject unverified physical highlighting and cover simulation, parser errors and stale cleanup. Native Windows compilation/installer validation stays in CI; user hardware testing is separate.

## Step 5A.1 correlation development

The physical probe is native-Windows-only. Start normal monitoring on a manually selected eligible descriptor-65 vendor collection and observe the zero-prefixed 65-byte candidate. Select exactly one physical control, fill the manual tool/Steam labels (unknown is valid), accept consent, then Start Probe. The UI shows authoritative Rust phases/countdown, never advances based on report counts or a JavaScript clock, and needs no Next click during measurement. Keep keyboard/touch available for Abort. Copy Safe Summary uses the browser's user-initiated clipboard API, with selectable safe JSON fallback; no clipboard plugin or permission is added.

The fixed schedule finishes around 29s, with a hard 30s monotonic bound. A baseline needs multiple stable released samples; sparse/ambiguous input or gaps >1.5s can make evidence inconclusive. Begin with hands off sticks/trackpads and do not change Steam Deck Tools/Steam Input to force reports. This app never configures them. Probe errors do not silently switch interfaces, take exclusive access or publish physical button events. Stop/rescan/page departure/shutdown abort active probes; stale tokens cannot abort a later one.

On macOS, keep using normal simulated diagnostics for the existing parser/UI. Physical-probe development tests use synthetic readers and deterministic fake timestamps; they do not enable a simulated physical probe or imply Windows access. Run all root checks and `pnpm bindings`/`pnpm bindings:check` after model changes. No new dependency or HID API is needed. Manual Windows coexistence, touchscreen/timing accuracy and actual per-control correlations remain pending. See NEPTUNE_RESEARCH.md for counter definitions and WINDOWS_TESTING.md for the user procedure.

## Step 5B shortcut development

Use Dashboard/Settings → Physical Quick Access Shortcut. Rescan native interfaces manually or load the existing cached discovery list; select interface 2/FFFF:0001/descriptor 65, acknowledge the reviewed LCD/Windows 11/Steam Deck Tools Desktop + Steam-running context, consent and Arm. The fields are contextual confirmations, not detection/configuration. A stable release must be observed before any bit-50 edge can toggle. Status and Disarm remain available on other main pages. Do not add page cleanup/minimize disarming or any saved auto-enable preference.

First explicitly stop diagnostic monitoring/probing before Arm. Explicitly Disarm and finish cancellation before switching back. A diagnostic page-leave Stop request is rejected while shortcut owns the slot; it must not kill the independently armed mode. Failed/expired/disconnected sessions require manual rearm, with a fresh generation/baseline. Thirty minutes is native monotonic time; diagnostic five minutes and probe thirty seconds are unchanged. macOS source remains unsupported for physical arming; existing simulated diagnostics still work. Pure/fake-reader and React tests develop the shortcut without a device, not through a hidden simulated physical mode.

Tests cover profile/framing gates, released baseline, initial hold, edge-only toggles, 350ms defensive cooldown, gap recovery, silence/deadline, stale generation/queued actions, bounded dispatch, one-reader conflicts, concurrent arming/disarming, errors/shutdown and existing QAM/native visibility behavior. Run all root checks, bindings generation/drift and native macOS build. CI builds the MSVC/NSIS target and verifies manifest/output paths. Windows hardware integration, rapid-tap behavior and coexistence remain manual; use the 28-item WINDOWS_TESTING.md section before merge. Other utilities may act on ⋯ simultaneously; record conflict and disarm instead of configuring/suppressing them.

### Troubleshooting physical shortcut Arm

Look at **Status**, **Last Arm Attempt**, **Last worker termination**, reader owner and monitor phase separately. Disarmed can be correct after an Arm rejection; the reason/recovery must remain visible. `monitor_active` / `probe_active` means stop diagnostics/probing explicitly; `shortcut_already_active` means Disarm first. Stale candidate/metadata requires native Rescan/reselect; stale generation requires a status refresh/retry. Access/busy/open/read failures require manual retry/rescan as instructed, never elevation or exclusive takeover. Initial report silence has the existing five-second limit, and later >1.5s gaps require a fresh release baseline.

The user reports physical ⋯ successfully toggled QAM during gameplay, followed by an apparently silent rearm attempt after game close/native monitoring. The exact hardware cause is unproven. Prior code returned plain preflight errors without recording them, had no immediate pending indicator, and could disable Arm due to ownership or stale UI selection without a prominent adjacent explanation. Prior `accept` did not clear caught errors on successful polls; that suspected behavior was not reproduced. New tests cover explicit rejected attempts while phase stays Disarmed, worker open/read/spawn/unexpected failure, recovery, delayed responses/events and polling during pending Arm. No game-close detection/reconnect is implemented.

Use **Copy Shortcut Diagnostic Summary** immediately on failure before another attempt replaces the record. It contains only safe enums/booleans/numeric interface metadata/version, not arbitrary OS errors or input. Page departure sends Stop Monitoring asynchronously; wait for owner None, or return to Controller and explicitly Stop. Armed mode intentionally survives navigation/minimization and is not stopped by diagnostic cleanup. New failure details remain in the persistent main-app shortcut section across pages.

## Temporary Step 5E QAM slow-refresh test build

QAM Slow Refresh diagnostics are intentionally retained as a test-only development tool until the controller feature development phase is complete. The user has completed the Step 5E physical acceptance checks on Deck LCD / Windows 11. Retention supersedes the earlier remove-before-merge instruction; this is not a supported production feature.

Default builds (including `pnpm dev`) have no diagnostic control. Only the exact string `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true` enables it. Vite statically replaces this [build-time environment value](https://vite.dev/guide/env-and-mode); localStorage, URL parameters and runtime settings cannot enable a compiled normal build. No dependency is added. Do not persist this flag in an env file or publish the resulting build as a standard release.

macOS authoring / frontend verification:

```sh
VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true pnpm build:web
node scripts/verify-qam-focus-build.mjs enabled
# Native test bundle (or replace build with dev to launch locally):
VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true pnpm build --bundles app
```

Windows PowerShell, prepared native toolchain:

```powershell
$env:VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS = "true"
try {
  pnpm build --target x86_64-pc-windows-msvc --bundles nsis
  node scripts/verify-qam-focus-build.mjs enabled
} finally {
  Remove-Item Env:VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS
}
```

These commands keep the existing version and application identity. Exit Nepteer before replacing/installing; do not run normal and test instances concurrently. The test-only workflow `qam-focus-diagnostics.yml` runs only on explicit manual dispatch, guarded to exact `refs/heads/main`, `refs/heads/feat/qam-navigation-ux` or `refs/heads/feat/qam-interaction-refinements`, and builds Windows separately, verifies the final frontend contains the test label/button and delay chunk, and extracts/verifies `asInvoker`, `uiAccess=false`. It uploads `TEST-ONLY-qam-focus-diagnostics-windows-x86_64-<SHA>` with explicitly renamed executable/installer and a warning README. It does not create a release. The QAM itself labels **TEST BUILD ONLY**. Ordinary Desktop CI forces the flag false and verifies exclusion after native packaging on both platforms.

The test-build order is Close → Refresh battery → Test Slow Refresh (5s) → Performance → Controller → Display → Settings. While loading, both refresh buttons retain keyboard focusability (`aria-disabled`/`aria-busy`) but are skipped as D-pad destinations; A on either is ignored. From focused busy Test Slow Refresh, Up reaches Close and Down reaches Performance. Tab/Shift+Tab can still visit both busy buttons. No hold-repeat or new controller capability is added.

The same refresh function starts the native telemetry read immediately, then coordinates a cancelable non-blocking JS timer with its outcome. Early read errors wait for the timer too; reads slower than five seconds remain pending until they settle. Hide, provider replacement, genuine reopen and unmount invalidate/cancel the old timer. Existing sequence/alive checks fence late telemetry. No native read is canceled/replaced by a fake reading, and no diagnostic timer becomes a native navigation lease: activation returns immediately and completes the existing claim normally.

Normal production verification (repeat after diagnostic builds to restore normal output):

```sh
VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=false pnpm build:web
node scripts/verify-qam-focus-build.mjs disabled
```

On PowerShell set the env variable to `"false"` for that build, then remove it. The checker requires the button text, TEST BUILD ONLY label and dynamic delay chunk all absent, or all present for `enabled`. CI applies the same checks to the frontend input used by native packaging; this is compiled-artifact evidence, not a Windows GUI test. Normal Refresh stays immediate in either build.

The diagnostic UI/flag/helper/types, automated tests and build verification are retained by explicit user decision. Reassess their removal after controller feature development is complete, rather than removing them immediately before Step 5E merge. Keep normal build exclusion and the production focus/duplicate-read fix. See WINDOWS_TESTING.md for the user-reported acceptance and repeatable desktop-only checks.

### Explicit manual packaging in GitHub Actions

1. Open [TEST ONLY - QAM Focus Diagnostics](https://github.com/weiliang79/nepteer/actions/workflows/qam-focus-diagnostics.yml) in the repository's Actions tab.
2. Choose **Run workflow**, then select `feat/qam-interaction-refinements` for Step 5F, the retained `feat/qam-navigation-ux` branch or `main`. Only those exact branch refs pass the job guard; other branches and tags are skipped without an artifact.
3. Click **Run workflow** explicitly. Pushes, PRs, normal CI, releases and tags do not trigger this workflow. No reusable-workflow or completion-event trigger is configured.
4. Open the successful run and download **Artifacts → TEST-ONLY-qam-focus-diagnostics-windows-x86_64-<SHA>**. It contains the explicitly named test executable/NSIS installer and warning README. Check the commit and TEST BUILD ONLY label in QAM before testing.
5. Exit the normal Nepteer instance before installing/running the diagnostic build. The same application identity/version is used; never run both concurrently. Return to the normal artifact for ordinary use.

[GitHub's manual-run documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow) describes write-access and default-branch prerequisites. Observed here: the explicit CLI request on `feat/qam-navigation-ux` was accepted before merge, while `main` did not contain this workflow. This confirms feature-branch CLI eligibility in this repository, not that the web Run workflow button is always available before merge. Use the CLI below if the web control is unavailable. Report any failed/unavailable dispatch honestly; never add a temporary push trigger or modify main to force it. Once the workflow is merged to main, main is also an allowed manual ref; actual main dispatch remains a post-merge check.

CLI equivalent (authenticated GitHub CLI with repository access):

```sh
gh workflow run qam-focus-diagnostics.yml --repo weiliang79/nepteer --ref feat/qam-interaction-refinements
# After merge, choose main instead when desired:
gh workflow run qam-focus-diagnostics.yml --repo weiliang79/nepteer --ref main
```

Neither command is automatic. Standard Desktop CI keeps `VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS: "false"` and its unchanged `node scripts/verify-qam-focus-build.mjs disabled` post-packaging check. Manual diagnostic packaging keeps the exact true flag, enabled-output verification, x86_64/NSIS build, asInvoker/uiAccess=false manifest check, read-only workflow token and test-only upload; it never publishes a GitHub Release.
