# Architecture

Nepteer v0.3.0-alpha.0 retains one pnpm desktop package: Tauri 2 + Rust, React/TypeScript/Vite, Tailwind and the local shadcn/ui Button. Small Rust modules keep the shared DTO/provider contract beside the shell. No service or extra crate is introduced.

```text
React → getTelemetry(mode: auto | mock) → get_telemetry
                                             ↓ async blocking worker
                                      provider_for(mode)
                              WindowsProvider or MockProvider
                                             ↓
                                TelemetryProvider::snapshot()
                                             ↓
                               Rust Snapshot → JSON → UI
```

Automatic selection uses WindowsProvider on Windows and MockProvider elsewhere. The Settings provider select deliberately requests mock on any host. This choice is session-only and defaults to Automatic on restart; it does not affect the persisted theme/units. The same permissioned read command handles both modes. Rust retains the session choice supplied by main; QAM calls it without a mode. A mode argument from QAM is rejected. There is no separate provider-switch command or silently substituted reading. Invalid mode values fail deserialization.

Windows native code is conditionally compiled in `telemetry/windows.rs`. Pure conversion helpers also compile in macOS unit tests with synthetic API outputs. The telemetry command uses Tauri's blocking worker pool so COM/WMI queries do not block the webview/event loop. Each request creates/uses/drops its WMI connection on one worker. There is no polling timer, subscription, background app service or subprocess. WMI uses the existing Windows management infrastructure, not a service installed by Nepteer. The WMI crate initializes COM when needed; no custom process security overrides are added.

## Read semantics

`GetSystemPowerStatus` supplies percentage and charging flags. API failure is checked before reading the output structure. `255` means unknown, including the entire flags byte (it must not be decoded as a no-battery bitmask). The no-battery flag takes precedence over an apparently valid percentage. Percentages 0–100 remain valid; other values become null. `batteryStatus` distinguishes available percentage, unknown percentage, no battery and API failure. Percentage and charge state are independent: a valid percentage can accompany an unknown charge state.

A known charging flag means charging; known noncharging flags with AC offline mean discharging; AC online + 100% + known noncharging flags is reported as full. The API has no separate full flag, so this is an explicit inference. AC online below 100%, unknown AC (without a known charging flag), unknown/reserved charging flags all remain unknown rather than inventing a state. Battery capability means this provider implements the read, not that a battery is present or the current reading succeeded.

The only WMI query is `SELECT Manufacturer, Model FROM Win32_ComputerSystem` against local ROOT\CIMV2. No `SELECT *`, serial, UUID, SKU, hostname or user fields are requested. Fields are trimmed, common OEM placeholders become null, and query errors are replaced with a fixed diagnostic that cannot leak arbitrary WMI error text. Manufacturer and model are shown verbatim as non-unique system-reported fields; no LCD/OLED classification is made. The native platform label is Windows, not an unverified OS version. A failed identity read does not discard a successful battery read, and vice versa.

The snapshot stays source `windows` on partial/API failures, with null unavailable data and sanitized `issues`. All real-provider CPU/GPU temperatures and fan RPM are null and their capabilities false. Hardware controls remain false everywhere. Mock samples remain fixed battery 78%, CPU 54°C, fan 2800 RPM, unsupported GPU, and simulated device labels. Zero is never used as an unavailable sentinel.

## Contract and rendering

Rust owns the DTOs. `ts-rs` generates committed TypeScript declarations via `pnpm bindings`; normal tests and `pnpm bindings:check` compare without writing. Nullable manufacturer/model, battery availability, diagnostics and provider selection are the only model extensions. The timestamp means snapshot retrieval completion, not simultaneous physical sensor sampling.

The UI identifies returned snapshots as LIVE WINDOWS or MOCK DATA. During initial connection/failure it shows reading/source unavailable rather than guessing the source. Refresh clears old readings while loading and after a transport failure. Partial native failures remain visible with a manual retry button. Unsupported sensors stay unavailable. There is no automatic retry/polling. Theme and unit settings retain validated localStorage persistence; telemetry/device information is not persisted by the app.

## Quick Access window coordination

`quick_access.rs` contains a testable coordinator and Tauri backend. All operations are serialized through a mutex on blocking workers. No cached visibility boolean exists: every operation reads `get_webview_window("quick-access")` / `is_visible()`. Missing windows are recreated on show with the same label, hidden before positioning. Initial creation happens in setup. Creation is never done in a synchronous Windows event handler (Tauri documents that deadlock hazard).

Native commands are `show_quick_access`, `hide_quick_access`, `toggle_quick_access`, `quick_access_status`, plus existing `get_telemetry`. Show/hide are idempotent. Window close is prevented for QAM and queued as hide; main close explicitly exits the application even if QAM is visible. Unexpected destruction or external hiding is reflected by actual native queries and recovered on next show. Move/resize/DPI events reposition visible QAM, comparing size/position first to avoid feedback loops. Every show recomputes placement from the current display/work area. Monitor removal without a delivered event is recovered on next show; no display polling is added.

Physical placement uses a 400-DIP preferred width, up to 760-DIP height and 12-DIP margins, clamped to the monitor work area. Windows prefers the foreground window's monitor; pointer display then primary display are fallbacks. macOS uses pointer/primary. Native Tauri APIs handle geometry, visibility, topmost, focus and taskbar suppression; full-window transparency, private macOS APIs and custom Win32 window styles are not used. Tauri does not support skip-taskbar on macOS; the panel belongs to the existing app, with normal OS Dock/Spaces behavior.

The official `tauri-plugin-global-shortcut` registers Control+Alt+Q once at startup. macOS labels Alt as Option. Only pressed events toggle; Windows upstream uses RegisterHotKey with MOD_NOREPEAT, not a low-level hook. Failure produces a visible diagnostic and keeps Open Quick Access available. Registration is not coupled to window recreation and is unregistered on application exit. No frontend global-shortcut permission is granted.

Windows-only `quick_access/focus.rs` retains an opaque foreground handle in memory. It reads no titles/process metadata and logs no handles. Explicit hide after QAM held focus makes one validated SetForegroundWindow attempt to the previous visible window. Denial is ignored, not bypassed. Blur hides only after focus was established and actual focus is now elsewhere; stale activation blur events are ignored, and blur dismissal never restores focus over the user's click. macOS explicit hide returns to the dashboard; external-application restoration is not implemented. No SetForegroundWindow retries, AttachThreadInput, synthesized input or game interaction exists. Recycled handles and OS focus races cannot be perfectly identified from an opaque handle; focus restoration is best effort.

QAM is an `index.html?qam` React root, with a dialog landmark, focusable 48px targets, Close-first focus, Tab wrapping and Escape. Optional opening animation honors reduced motion; hide/restore never waits for animation. Native visibility-change events trigger telemetry reads; hidden startup, focus/resize events and status queries do not poll sensors. Initial subscribe-then-query covers webview readiness. Provider changes while visible trigger a fresh read through the same IPC command. Stale async results are ignored. Theme is loaded on open and follows cross-window localStorage changes; provider choice stays in Rust and is not persisted.

## Permissions

CSP is unchanged. `main` may read/select telemetry and show/hide/toggle/query the fixed QAM. `quick-access` may read the current provider, hide, query status and listen/unlisten to native events. It cannot select a provider, show/toggle/create windows, register shortcuts, emit native events, exit the app, use shell/filesystem APIs or load remote content. Tests exercise these label boundaries. Event/command payload DTOs are generated from Rust with existing drift checks. The Windows manifest remains asInvoker / uiAccess=false and NSIS currentUser.

Sources: [Tauri window builder limitations](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html), [global shortcut plugin](https://v2.tauri.app/plugin/global-shortcut/), [Windows foreground restrictions](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow).

Sources: [GetSystemPowerStatus](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getsystempowerstatus), [SYSTEM_POWER_STATUS](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-system_power_status), [Win32_ComputerSystem](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-computersystem), [WMI Rust wrapper](https://docs.rs/wmi/0.18.4/wmi/struct.WMIConnection.html).

QAM navigation is explicitly restricted in its native builder to the local bundled entry page (or the exact configured Vite origin during development). Remote origins, other local pages and non-app URL schemes are rejected; this does not broaden CSP.
