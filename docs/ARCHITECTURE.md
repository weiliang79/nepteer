# Architecture

Nepteer v0.2.0-alpha retains one pnpm desktop package: Tauri 2 + Rust, React/TypeScript/Vite, Tailwind and the local shadcn/ui Button. Small Rust modules keep the shared DTO/provider contract beside the shell. No service or extra crate is introduced.

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

Automatic selection uses WindowsProvider on Windows and MockProvider elsewhere. The Settings provider select deliberately requests mock on any host. This choice is session-only and defaults to Automatic on restart; it does not affect the persisted theme/units. The same permissioned read command handles both modes; there is no mutable provider-switch command or silently substituted reading. Invalid mode values fail deserialization.

Windows native code is conditionally compiled in `telemetry/windows.rs`. Pure conversion helpers also compile in macOS unit tests with synthetic API outputs. The command uses Tauri's blocking worker pool so COM/WMI queries do not block the webview/event loop. Each request creates/uses/drops its WMI connection on one worker. There is no polling timer, subscription, background app service or subprocess. WMI uses the existing Windows management infrastructure, not a service installed by Nepteer. The WMI crate initializes COM when needed; no custom process security overrides are added.

## Read semantics

`GetSystemPowerStatus` supplies percentage and charging flags. API failure is checked before reading the output structure. `255` means unknown, including the entire flags byte (it must not be decoded as a no-battery bitmask). The no-battery flag takes precedence over an apparently valid percentage. Percentages 0–100 remain valid; other values become null. `batteryStatus` distinguishes available percentage, unknown percentage, no battery and API failure. Percentage and charge state are independent: a valid percentage can accompany an unknown charge state.

A known charging flag means charging; known noncharging flags with AC offline mean discharging; AC online + 100% + known noncharging flags is reported as full. The API has no separate full flag, so this is an explicit inference. AC online below 100%, unknown AC (without a known charging flag), unknown/reserved charging flags all remain unknown rather than inventing a state. Battery capability means this provider implements the read, not that a battery is present or the current reading succeeded.

The only WMI query is `SELECT Manufacturer, Model FROM Win32_ComputerSystem` against local ROOT\CIMV2. No `SELECT *`, serial, UUID, SKU, hostname or user fields are requested. Fields are trimmed, common OEM placeholders become null, and query errors are replaced with a fixed diagnostic that cannot leak arbitrary WMI error text. Manufacturer and model are shown verbatim as non-unique system-reported fields; no LCD/OLED classification is made. The native platform label is Windows, not an unverified OS version. A failed identity read does not discard a successful battery read, and vice versa.

The snapshot stays source `windows` on partial/API failures, with null unavailable data and sanitized `issues`. All real-provider CPU/GPU temperatures and fan RPM are null and their capabilities false. Hardware controls remain false everywhere. Mock samples remain fixed battery 78%, CPU 54°C, fan 2800 RPM, unsupported GPU, and simulated device labels. Zero is never used as an unavailable sentinel.

## Contract and rendering

Rust owns the DTOs. `ts-rs` generates committed TypeScript declarations via `pnpm bindings`; normal tests and `pnpm bindings:check` compare without writing. Nullable manufacturer/model, battery availability, diagnostics and provider selection are the only model extensions. The timestamp means snapshot retrieval completion, not simultaneous physical sensor sampling.

The UI identifies returned snapshots as LIVE WINDOWS or MOCK DATA. During initial connection/failure it shows reading/source unavailable rather than guessing the source. Refresh clears old readings while loading and after a transport failure. Partial native failures remain visible with a manual retry button. Unsupported sensors stay unavailable. There is no automatic retry/polling. Theme and unit settings retain validated localStorage persistence; telemetry/device information is not persisted by the app.

Tauri capabilities and CSP remain unchanged: only `get_telemetry` from the local main window, no shell/filesystem grants, plugins or remote origins. The development CSP separately permits Vite. The Windows MSVC manifest workaround still covers app/test binaries, requests Common Controls v6 and explicitly declares `asInvoker` / `uiAccess=false`. NSIS remains current-user with existing WebView2 required.

Sources: [GetSystemPowerStatus](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getsystempowerstatus), [SYSTEM_POWER_STATUS](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-system_power_status), [Win32_ComputerSystem](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-computersystem), [WMI Rust wrapper](https://docs.rs/wmi/0.18.4/wmi/struct.WMIConnection.html).
