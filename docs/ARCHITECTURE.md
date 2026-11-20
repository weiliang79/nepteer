# Architecture

The pnpm workspace contains one desktop package. Tauri 2 hosts a local React/TypeScript/Vite frontend; Tailwind 4 supplies styling and tokens. A small shadcn/ui-derived Button lives in source with its license notice. Native HTML selects provide keyboard-accessible settings without another component framework.

```text
React → getTelemetry() → Tauri invoke("get_telemetry")
                               ↓
                     managed MockProvider
                               ↓
                TelemetryProvider::snapshot()
                               ↓
                  Rust Snapshot → JSON → UI
```

Rust owns the models. `ts-rs` generates the committed DTO declarations through `pnpm bindings`; CI compares them with Rust's output. TypeScript uses `invoke<Snapshot>`, never a second runtime mock provider. The provider trait is read-only, Send + Sync, and reusable without OS dependencies. Separate control traits can be designed when there is a validated need. There is no service or Windows adapter in this milestone.

`Percent` and `Celsius` validate construction and serialize transparently. RPM uses an unsigned unit wrapper. Unsupported readings are `Option<T>` / JSON null. Capability flags describe the provider, not detected hardware. Source is explicit (`mock`, `windows`, `unsupported`); the only implementation returns `mock`. Model and target platform are labeled simulated; host platform describes the actual compile host. Battery 78%, CPU 54°C and fan 2800 RPM remain fixed. GPU temperature is unsupported. The Unix millisecond timestamp records retrieval, not sensor sampling.

Loading, failure and manual refresh are explicit. Refresh clears old readings while waiting and after failure. There is no pseudo-live polling or random telemetry. Theme and unit choices persist as validated webview localStorage preferences; corrupt or inaccessible storage falls back safely.

Tauri's app manifest enumerates the single command so its generated permission can be granted only to the local main window. No core default grant, plugins, shell, filesystem, network requests, custom titlebar privileges or remote capabilities are required. Production CSP allows bundled scripts/styles and Tauri IPC. The separate development CSP permits the local Vite websocket and inline React refresh preamble. Development uses the configured local Vite origin; never ship a development server build.

Navigation is local UI state; future pages do not expose pretend controls. The responsive layout supports a narrow window, 1280×800 handheld screens, visible keyboard focus and touch targets of at least 48px. Standard window decorations handle closing and moving the app.
