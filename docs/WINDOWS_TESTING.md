# Windows 11 Steam Deck LCD smoke test

Status: **pending**. This checklist is ready for the first successful Windows CI artifact. macOS and hosted Windows builds cannot verify Steam Deck hardware behavior.

Record the workflow run URL, commit, artifact name, Windows version, Steam Deck LCD model, display scaling and WebView2 runtime version. Keep a keyboard available; native controller input is not implemented.

1. Download `nepteer-windows-x86_64-<commit>` from the successful Foundation CI run. Extract it. Confirm Microsoft Edge WebView2 is already installed (Windows Settings → Apps → Installed apps). Runtime setup is deliberately not bundled.
2. Run the unsigned alpha installer as a standard user, selecting the current-user location. Record any publisher/SmartScreen warning and follow your normal trusted-software policy; do not disable OS security. Stop and report an unexpected elevation request. Alternatively launch `nepteer.exe` from the extracted artifact without installing.
3. Open Nepteer. Confirm the window title, MOCK DATA badge, source Mock, and simulated Steam Deck LCD / Windows 11 identification. Expect battery 78%, CPU 54°C, fan 2800 RPM and GPU Unavailable. These are samples, regardless of actual device conditions.
4. Refresh. The retrieval timestamp should update; the fixed readings should remain the same. GPU remains unavailable. No permission prompt or physical hardware change should occur.
5. Switch Dashboard → Settings. Change theme and Celsius/Fahrenheit, return to Dashboard (54°C becomes 129°F), then close and reopen to verify preferences persist. No hardware state should change.
6. Open Quick Access, Performance and Controller. Each should identify itself as planned, with no working power/fan/input controls. No OS overlay should appear.
7. At 1280×800, resize the window and check navigation, text, scrolling and card layout. Also try a narrow window. Use touch, Tab/Shift+Tab, Enter/Space and native select keyboard controls. Existing controller-as-pointer behavior may be tested if already configured externally; Nepteer does not supply it.
8. Close using the normal titlebar button. Confirm the process exits and no service/driver/helper remains. If installed, uninstall through Windows Settings as the same user. No hardware restoration is necessary because there were no hardware writes. Webview preferences may remain after uninstall; record observed behavior.

## Troubleshooting and evidence

- Blank window or no launch: verify WebView2 and the x86_64 artifact. Record Windows Event Viewer → Windows Logs → Application errors for Nepteer/WebView2, including timestamp and faulting module. Do not install drivers as a workaround.
- Telemetry error: record the exact visible error. Confirm this is the native executable, not Vite in a browser. Permission failures need a code/configuration fix rather than broader grants.
- Layout or input issue: record resolution, scale percentage, window size, active theme and interaction method; include a screenshot if convenient.
- Developer reproduction on a Windows build machine: run `pnpm dev` in PowerShell to capture terminal errors. Use `pnpm --filter @nepteer/desktop tauri build --debug --no-bundle` for a debug binary. Release builds do not include a console or an app log plugin; no persistent application log file is promised. CI logs are downloadable from the workflow run.
- Report expected versus observed behavior, artifact/run URL and exact reproduction steps. Mark each checklist item pass/fail/not tested. Never infer hardware telemetry/control correctness from this mock-only test.
