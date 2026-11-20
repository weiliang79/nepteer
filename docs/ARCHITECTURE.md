# Architecture

Nepteer v0.4.0-alpha.0 retains one pnpm desktop package: Tauri 2 + Rust, React/TypeScript/Vite, Tailwind and the local shadcn/ui Button. Small Rust modules keep the shared DTO/provider contract beside the shell. No service or extra crate is introduced.

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

Rust owns the DTOs. `ts-rs` generates committed TypeScript declarations via `pnpm bindings`; normal tests and `pnpm bindings:check` compare without writing. Telemetry, QAM and controller diagnostic DTOs all use the same explicit generator and no-write drift check. The timestamp means snapshot retrieval completion, not simultaneous physical sensor sampling.

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

## Neptune observation subsystem (Step 4)

`neptune/mod.rs` owns Rust DTOs, a small coordinator and a read-only transport trait, independent of TelemetryProvider. `windows.rs` conditionally compiles native SetupAPI/HID calls; `monitor.rs` owns the worker/read loop; `reports.rs` validates bounded lengths and deliberately does not decode bytes. No new crate or frontend framework is introduced. Public research and dependency choices are recorded in [NEPTUNE_RESEARCH.md](NEPTUNE_RESEARCH.md).

Five main-only commands are `neptune_list` (cached candidates), `neptune_rescan(mode)`, `neptune_start(candidateId)`, `neptune_stop`, and `neptune_status` (cached current state). Querying or opening the page never scans or opens a device. Rescan and stop/start coordination run on blocking workers; one operation mutex serializes them. Rescan stops/joins before replacing session-private paths. IDs such as scan2-candidate1 are opaque, not persistent identities. No serial API or unique instance property is used. Paths have no Debug/Serialize/TS implementation and never cross IPC. Safe descriptions, VID/PID, optional usage/interface/descriptor length and sanitized failure kinds are public.

Native enumeration queries present HID interfaces, conservatively filters the known USB VID/PID path pattern, opens candidates with desired access zero, then verifies HID attributes and cached descriptor caps. Missing metadata stays unavailable. All matching collections may appear, but only confirmed vendor-defined usages (page >= 0xFF00, nonzero usage, bounded nonzero input length) are eligible for an attempted read. Mouse/keyboard/unknown collections are excluded. This policy can miss a nonstandard transport/path; it never broadens to arbitrary devices.

Discovery states are not_scanned/scanning/candidates/not_found/unsupported/error. Monitor states are stopped/starting/awaiting_reports/raw_input_only/access_denied/device_busy/disconnected/unsupported_report_format/read_error. Detected, handle-open and reports-observed remain separate. Readable report bytes do not imply a verified protocol. All controls have null state, decoding=false and transitions empty. Report lengths are checked against the descriptor and 4096-byte cap; unknown content is counted without parsing.

Start validates a cached ID and eligibility, then creates one named worker. It opens GENERIC_READ with FILE_SHARE_READ|FILE_SHARE_WRITE, revalidates VID/PID/caps and performs one overlapped ReadFile at a time. No write, feature, exclusive fallback or configuration API exists on the read transport. Waits are at most 100 ms; pending reads survive timeout without issuing duplicate reads. Cancellation calls CancelIoEx and waits for I/O completion before freeing the OVERLAPPED/buffer or closing handles. Driver completion is outside application control: a broken kernel driver can delay cancellation/shutdown, and Nepteer does not free in-flight memory or force-kill a worker to hide that limitation.

Repeated Start for the current active ID is idempotent; another ID requires stop. Stop cancels and joins, clears held/transition state, and retains labeled historical report totals/time. Errors are terminal with no auto-reconnect; rescan/start are deliberate recovery. The worker expires after five minutes, closes resources before publishing terminal state, keeps no unbounded report queue, and emits summaries at most four times per second plus lifecycle transitions. Raw buffers are ephemeral and cleared on normal completion. No report stream or button history is persisted.

Events target only main (`neptune-diagnostics`), using generated DTOs. React subscribes before reading cached state, ignores command results superseded by newer events and requests stop on page departure (including completion of an in-flight action). A failed cleanup/webview crash is still bounded by the native five-minute session. Main close/normal ExitRequested blocks new starts and joins off the native UI thread before final process exit; repeated exit requests cannot bypass the join. QAM coordination is independent and keeps its existing shortcut/focus behavior; opening QAM does not start or stop observation.

The explicit simulated backend exercises the same coordinator, with a synthetic vendor collection and reports, always source=simulated and without any hardware API. macOS native requests return unsupported. Main alone gains five command grants and event listen/unlisten; QAM, unknown windows and remote URLs are denied by capability/runtime checks. CSP and remote navigation restrictions are unchanged. Tests cover these boundaries without claiming actual Windows HID coexistence.
