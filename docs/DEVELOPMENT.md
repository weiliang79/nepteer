# Development

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

Pushes to `feat/quick-access-menu` run the same native matrix as main. The workflow runs frontend validation and Rust fmt/check/tests/clippy on native macOS and Windows, then bundles a macOS app and Windows x86_64 NSIS installer. Upload fails if Windows output is missing. Workflow permissions are read-only; nothing publishes a release. License inventories accompany each job. Both local tests and CI use a binding-drift assertion rather than modifying committed models. `.gitattributes` forces LF for text even when Windows Git uses `core.autocrlf=true`; binary icons are excluded from conversion. Hosted runner success is build evidence only; manually validate on Windows Deck hardware.

No automated GUI launch or macOS signing/notarization is claimed. For launch diagnostics use the dev terminal; on Windows use the troubleshooting steps in WINDOWS_TESTING.md.
