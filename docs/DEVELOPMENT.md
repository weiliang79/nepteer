# Development

## macOS

Use Node 24, pnpm 12.21.0, current stable Rust, rustfmt/clippy, and Xcode Command Line Tools. See [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). This foundation was authored with Node 24.14.1 and Rust/Cargo 1.100.0; the lockfiles define resolved dependencies.

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

## IPC and model changes

Edit `src-tauri/src/telemetry.rs`, then run `pnpm bindings` and review the generated `src/lib/bindings.ts`. Run `pnpm bindings:check` to verify drift without writing files. Ordinary Rust tests always check bindings and never regenerate them; only `pnpm bindings` explicitly runs the ignored export test. Run `pnpm test` for loading/error/retry, settings, zero versus unavailable, and dashboard rendering tests. Rust unit tests validate domain units, source/capability semantics, stability and serialization.

The browser alone cannot call Rust. A connection error in a browser is expected. Use `pnpm dev` for the native path. If the app reports a command permission failure, inspect the command registration, build manifest and main capability together; do not grant blanket core or filesystem access.

## CI

The workflow runs frontend validation and Rust fmt/check/tests/clippy on native macOS and Windows, then bundles a macOS app and Windows x86_64 NSIS installer. Upload fails if Windows output is missing. Workflow permissions are read-only; nothing publishes a release. License inventories accompany each job. Both local tests and CI use a binding-drift assertion rather than modifying committed models. `.gitattributes` forces LF for text even when Windows Git uses `core.autocrlf=true`; binary icons are excluded from conversion. Hosted runner success is build evidence only; manually validate on Windows Deck hardware.

No automated GUI launch or macOS signing/notarization is claimed. For launch diagnostics use the dev terminal; on Windows use the troubleshooting steps in WINDOWS_TESTING.md.
