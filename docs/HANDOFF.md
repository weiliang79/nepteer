# Step 2 handoff · v0.2.0-alpha

Branch: `feat/windows-telemetry`, based on main `9b172af`. No merge to main is authorized. Step 1 native CI passed, and the user reported all eight Windows Steam Deck foundation smoke tests passed before requesting Step 2. New battery/device hardware verification remains pending.

## Implemented

- `telemetry/windows.rs`: WindowsProvider through the existing TelemetryProvider trait. Documented GetSystemPowerStatus for percentage/charging status and local WMI SELECT of Manufacturer and Model only. Native calls are Windows-gated; conversion helpers run with synthetic outputs on macOS and Windows.
- `telemetry.rs`, `lib.rs`, generated `bindings.ts`: one async read-only IPC command with typed auto/mock selection, blocking request worker, nullable identity fields, typed battery availability and sanitized diagnostics. No fallback from Windows to mock after a read failure.
- React UI/IPC/tests: LIVE WINDOWS versus MOCK DATA, actual/system-reported battery/identity, explicit unavailable sensors, manual refresh/retry and session-only Settings mock selector. Existing theme/unit persistence, navigation and responsive touch-friendly styling retained.
- Versions bumped together to 0.2.0-alpha.0, workflow includes the focused feature branch and retains the complete native matrix, MSVC x86_64 NSIS build, both-output and asInvoker manifest checks, uploads and read-only workflow permissions.
- README, agent milestone guidance, architecture, safety, development, Windows checklist and license inventory updated. No new app service, crate/workspace architecture, UI dependency or IPC permission added.

The only Windows dependencies added directly are `windows-sys` 0.61.2 and `wmi` 0.18.4, both MIT OR Apache-2.0. windows-sys was already transitive; wmi's default chrono feature is disabled. New locked packages: wmi and futures 0.3.34, also MIT OR Apache-2.0. Purposes/licenses are recorded in LICENSES.md and LICENSE_INVENTORY.md. Full distribution notice/license review remains outstanding.

## Exact local validation

Host: macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust/Cargo 1.100.0.

| Command                        | Actual result                                                 |
| ------------------------------ | ------------------------------------------------------------- |
| `cargo fetch`                  | Passed with approved registry access; two new locked packages |
| `pnpm install --lockfile-only` | Passed; frontend dependency graph unchanged                   |
| `pnpm bindings`                | Passed; explicit generator updated DTOs from Rust             |
| `pnpm bindings:check`          | Passed; read-only drift check                                 |
| `pnpm format`                  | Passed                                                        |
| `pnpm format:check`            | Passed; Prettier and cargo fmt                                |
| `pnpm typecheck`               | Passed                                                        |
| `pnpm lint`                    | Passed, zero warnings                                         |
| `pnpm test`                    | Passed; 12 tests across 2 files                               |
| `pnpm build:web`               | Passed; Vite production build                                 |
| `pnpm rust:check`              | Passed; cargo check --workspace --locked                      |
| `pnpm rust:test`               | Passed; 10 tests, 1 intentionally ignored explicit generator  |
| `pnpm rust:lint`               | Passed; all-target Clippy with -D warnings                    |
| `pnpm build --bundles app`     | Passed; native release executable and 9.70 MiB macOS bundle   |
| `pnpm licenses:rust`           | Passed; updated complete locked metadata inventory            |
| `pnpm licenses:js`             | Passed; frontend metadata inventory                           |
| `git diff --check`             | Passed                                                        |

Rust coverage includes valid/zero/255/invalid battery percentages, unknown versus no-battery flags, charging/discharging/full/unknown interpretations, API failure, null serialization, identity failure/placeholder normalization, Windows/macOS selection, explicit mock mode, deterministic mock samples, generated DTO parity and IPC permissions. The Windows factory selection test also reads the real host provider in native Windows CI; its data is not logged and it does not assert a battery or Deck exists.

Frontend coverage includes live/mock labels, identity/unknown fields, unsupported sensors, source-preserving partial failure/retry, transport failure clearing stale data, no battery versus zero, session-only mock reset, existing preferences and the typed invoke arguments. One initial UI test assertion incorrectly applied a string matcher to absent localStorage; it was corrected to treat absent storage as empty. All final local tests passed.

No actual Windows APIs, WMI or Windows executable can be run on the macOS authoring host. Native GUI interaction was not re-tested locally for this milestone; automated UI tests use jsdom and command tests use Tauri's mock runtime.

## CI and artifact evidence

Implementation committed/pushed to `feat/windows-telemetry`: [`20334741b7e29c87873bae30ed2eaa426fd54fd8`](https://github.com/weiliang79/nepteer/commit/20334741b7e29c87873bae30ed2eaa426fd54fd8).

[Desktop CI run 44732291833](https://github.com/weiliang79/nepteer/actions/runs/44732291833) **passed on both platforms**:

- [macOS job 136274837504](https://github.com/weiliang79/nepteer/actions/runs/44732291833/job/136274837504): all validation, production application bundle and license metadata upload passed.
- [Windows job 136274837711](https://github.com/weiliang79/nepteer/actions/runs/44732291833/job/136274837711): formatting, typecheck, lint, all 12 frontend tests, Rust check, all 10 Rust tests (explicit generator intentionally ignored), Clippy, MSVC x86_64 production executable, NSIS bundling, both-output verification, manifest extraction and artifact uploads passed. The Windows-only API/WMI path compiled and the default-provider test ran on the hosted Windows machine.

[Download Windows artifact](https://github.com/weiliang79/nepteer/actions/runs/44732291833/artifacts/14626354747): `nepteer-windows-x86_64-20334741b7e29c87873bae30ed2eaa426fd54fd8`, artifact ID `14626354747`, 4,797,707-byte ZIP. Build/output logs verified `nepteer.exe` (8,851,456 bytes) and `bundle/nsis/Nepteer_0.2.0-alpha.0_x64-setup.exe` (1,996,035 bytes). Windows SDK manifest extraction reported **asInvoker, uiAccess=false**.

Dependency inventories: [Windows](https://github.com/weiliang79/nepteer/actions/runs/44732291833/artifacts/14627765961), [macOS](https://github.com/weiliang79/nepteer/actions/runs/44732291833/artifacts/14627166174). A documentation-only follow-up records this completed run; the implementation/artifact code is the commit above. Nothing was merged into main. CI success is not Step 2 Steam Deck hardware verification.

The Windows command remains `pnpm build --target x86_64-pc-windows-msvc --bundles nsis`. The expected artifact `nepteer-windows-x86_64-<commit>` contains `nepteer.exe` and `bundle/nsis/Nepteer_0.2.0-alpha.0_x64-setup.exe`, from `target/x86_64-pc-windows-msvc/release/`. The workflow requires both and extracts the executable manifest to require asInvoker / uiAccess=false. NSIS remains currentUser, with existing WebView2 required. No release publication or merge is performed.

## Actual versus mock and limitations

Actual on Windows: Windows-reported aggregate battery percentage and charge flags; manufacturer/model if local WMI provides them. No device is presumed to be a Deck. Full charge is inferred only from AC-online, known noncharging flags and 100%; plugged in below 100% can remain unknown. A valid percentage and unknown charging state can coexist. API failure/unknown/no battery do not yield fabricated zero. WMI failure does not discard a successful battery read. CPU/GPU temperatures and fan RPM remain null/unsupported.

Mock on macOS or deliberate selection: simulated Valve/Steam Deck LCD/Windows 11 labels, battery 78% discharging, CPU 54°C, fan 2800 RPM, GPU unavailable. Settings mode resets to Automatic on restart. No physical telemetry is read in mock mode.

Tauri capabilities/CSP remain unchanged; only the existing local-main read command is allowed. No shell/filesystem permission, remote origin, unique hardware identifier, telemetry persistence/logging, hardware write, driver, input mapping, overlay or app background service is introduced. A synchronous WMI query can stall its request worker and delay the snapshot; cancellation/deadlines are not implemented. Unsigned distribution, full license/notice review and actual OS/firmware reporting accuracy remain limitations.

## Windows 11 Steam Deck checks remaining

Follow WINDOWS_TESTING.md using the branch artifact: verify standard-user install/launch, LIVE WINDOWS defaults, battery percentage versus Windows and plugged/unplugged charge states with manual refresh, non-unique manufacturer/model display, explicit unknown values, all unsupported sensors, deliberate mock/automatic switching and restart reset, theme/unit persistence, 1280×800 touch/keyboard layout, no unexpected elevation/hardware changes, exit and uninstall. Do not collect serials/UUIDs in reports. LCD/OLED classification stays unverified. Hosted CI success must not be reported as Step 2 Deck hardware success.
