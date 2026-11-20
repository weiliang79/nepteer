# Step 1 handoff

Implemented on macOS arm64, 2026-11-20, branch `feat/foundation`. The repository began without commits. No commit, push or PR was created; there is no commit hash to report. The supplied AGENTS.md and CODEX_STEP1_PROMPT.md remain unchanged.

## Delivered components

- One pnpm workspace package at `apps/desktop`, with React 19, TypeScript, Vite 7, Tailwind 4 and a local MIT-noticed shadcn/ui-derived Button. Responsive dashboard/navigation, loading/error/retry states, planned pages, and local theme/unit settings.
- Tauri 2 shell, one explicitly permissioned `get_telemetry` command, a reusable read-only Rust provider trait, deterministic mock provider, defensively typed units, timestamps and capability flags. Internal modules avoid speculative crates/services.
- Rust-derived checked-in TypeScript DTOs and CI drift checks; UI behavior, transport and Rust IPC/permission tests.
- Native macOS and Windows CI, Windows x86_64 NSIS/executable upload, platform-specific bundle defaults, desktop icons generated from a project-owned SVG, lockfiles and root scripts.
- README, architecture/development/safety documentation, Windows manual test guide, dependency purposes, license metadata inventory and copied-source notice.

## Validation results

Final successful commands on this host:

| Exact command                                                                   | Result                                                                                                     |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                | Passed using approved cache/network access; lockfile unchanged                                             |
| `pnpm format`                                                                   | Passed; Prettier and cargo fmt                                                                             |
| `pnpm format:check`                                                             | Passed; Prettier and cargo fmt --check                                                                     |
| `pnpm typecheck`                                                                | Passed; tsc --noEmit                                                                                       |
| `pnpm lint`                                                                     | Passed; ESLint, zero warnings                                                                              |
| `pnpm test`                                                                     | Passed; 7 tests across 2 files                                                                             |
| `pnpm build:web`                                                                | Passed; production Vite output                                                                             |
| `pnpm rust:check`                                                               | Passed; cargo check --workspace --locked                                                                   |
| `pnpm rust:test`                                                                | Passed; 4 Rust tests, no failures                                                                          |
| `CI=true pnpm rust:test`                                                        | Passed; verifies checked-in bindings rather than regenerating them                                         |
| `pnpm rust:lint`                                                                | Passed; cargo clippy --workspace --all-targets --locked -- -D warnings                                     |
| `pnpm build --bundles app`                                                      | Passed; actual release executable and 9.75 MiB macOS app bundle                                            |
| `pnpm dev`                                                                      | Vite started and actual native executable compiled/launched; stopped with Ctrl+C after startup smoke check |
| `pnpm licenses:js`                                                              | Passed; recursive JS dependency metadata inventory                                                         |
| `pnpm licenses:rust`                                                            | Passed; 436 locked Rust packages including local project and target-only dependencies                      |
| `corepack pnpm --filter @nepteer/desktop tauri icon src-tauri/icons-source.svg` | Passed; unused mobile/store icons removed                                                                  |

Rust tests verify unit validation, stable mock values, null serialization and capability/source flags, generated DTO parity, and actual Tauri command dispatch with managed provider state. IPC tests accept the main local window and reject another window and a remote URL. Frontend tests cover rendering, unavailable versus zero, refresh, loading/error/retry, preferences, planned pages, corrupt settings and the invoke wrapper. These use a DOM/mock runtime, not an automated real-webview end-to-end harness.

Initial failures were corrected: missing icon during Rust compilation, React effect-state lint, an unused test parameter, duplicate macOS plist symbols from two context macro expansions, and the IPC test using a production URL with development context. ESLint 9's deprecation warning prompted an upgrade to ESLint 10. Registry/cache downloads failed under the sandbox; approved retries succeeded. An inventory originally used Python; the final script uses Node for both supported platforms. The remaining deprecated transitive `whatwg-encoding` is test-only through jsdom; its metadata is recorded.

Not executed: Windows compilation/NSIS build, hosted GitHub Actions, Windows installation/uninstallation, real Steam Deck testing, automated native GUI interaction, signed/notarized distribution. Native launch was checked from terminal process startup, not a full visual or accessibility audit. `pnpm bindings` was not separately invoked; the same exporter ran successfully in `pnpm rust:test`, and CI-mode comparison passed.

## Build output and CI

Local app: `target/release/bundle/macos/Nepteer.app`; executable: `target/release/nepteer`. Build outputs are ignored by Git.

CI is configured but unrun because nothing was pushed. After a successful run, the workflow's Artifacts section will contain `nepteer-windows-x86_64-<commit SHA>` with `nepteer.exe` and the NSIS installer from `target/x86_64-pc-windows-msvc/release/bundle/nsis/`. There is currently no Windows artifact URL or verified Windows result. The workflow also uploads per-platform license metadata.

## Actual versus mock

Actual: native shell, read-only frontend/Rust IPC, settings persistence, theme and temperature conversion, navigation, source/capability rendering and retrieval timestamp.

Mock: model/target OS, battery 78% discharging, CPU 54°C and fan 2800 RPM. GPU is unsupported/null. Refresh repeats these samples. No real sensors, hardware writes, drivers, overlay, controller integration, fan/TDP/clock settings or input injection are implemented. App host identification only reflects the build platform.

## Remaining verification

Run the Windows CI job, review its native build/installer logs and license inventories, then follow WINDOWS_TESTING.md on Windows 11 Steam Deck LCD. Verify standard-user launch/install, pre-existing WebView2, 1280×800 touch/keyboard layout, settings persistence, mock labels, no UAC/hardware changes, process exit and uninstall. Native controller support is future work; existing external pointer behavior is optional to observe.

The application is unsigned and macOS is not notarized. The identifier is provisional. Dependency metadata review is recorded, but full notice/source obligations and Windows-specific optional binaries/runtime/installer licensing need review before public distribution. No project-wide license was assumed. Future live telemetry requires independent read-only interface research, platform gates and actual hardware verification; it is outside this milestone.
