# Step 3 · Windows 11 Steam Deck LCD QAM checklist

Steps 1 and 2: CI and user-reported hardware smoke tests passed. **Step 3 overlay, focus and game compatibility are pending user verification.** Automated fake-backend/mock-runtime tests do not prove native activation or fullscreen behavior.

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
