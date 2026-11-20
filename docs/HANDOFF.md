# Step 1 stabilization handoff

Review baseline: [`ccf30c3ca80f6fc34c62cf208aa6a53456afab93`](https://github.com/weiliang79/nepteer/commit/ccf30c3ca80f6fc34c62cf208aa6a53456afab93). This remains the mock-only v0.1.0-alpha foundation. Stabilization fixes were committed and pushed to `main`; the validated code commit and CI evidence are listed below. `CODEX_STEP1_PROMPT.md` stays ignored and untracked.

## Verified Windows failure

[Original workflow run 44713932976](https://github.com/weiliang79/nepteer/actions/runs/44713932976): macOS succeeded; [Windows job 136212363981](https://github.com/weiliang79/nepteer/actions/runs/44713932976/job/136212363981) failed at `pnpm format:check`.

The exact log shows `prettier --check . && cargo fmt --all -- --check`, followed by Prettier warnings for 31 files and exit 1. **Rust formatting was never executed**, because the first command failed. All later validation/build/upload steps were skipped normally.

Root cause: Windows Git checkout converted LF text to CRLF with no repository `.gitattributes` policy. Prettier expects LF. Reproduced on macOS using `git -c core.autocrlf=true checkout-index --all --prefix=<temporary-directory>/`: the original README has 0 CRLF lines; the simulated Windows checkout has 50. The same installed Prettier rejects that unchanged-content CRLF copy with exit 1.

Added `.gitattributes` with `* text=auto eol=lf` and binary icon exclusions. Repeating the forced-autocrlf checkout produces 0 CRLF lines, passes Prettier and preserves every icon's SHA-256. No formatting checks are skipped or weakened. Both native matrix jobs retain the complete validation sequence. See [Git's line-ending attribute documentation](https://git-scm.com/docs/gitattributes).

## Focused changes

- `.gitattributes`: consistent text checkout on macOS/Windows; no conversion of binary icons.
- `telemetry.rs`, root `package.json`: split explicit `pnpm bindings` generation from the ordinary read-only `bindings_are_current` test and `pnpm bindings:check`. The generator is an ignored test selected explicitly with `--ignored --exact`; no CI-dependent behavior remains. Rust remains the type authority; generated DTO contents did not change. No dependency added.
- `.github/workflows/ci.yml`: retain MSVC x86_64 NSIS build and existing executable/installer upload paths; explicitly require **both** outputs before upload. Extract the actual executable manifest with Windows SDK `mt.exe` and require `asInvoker` / `uiAccess=false`. Fail if the SDK tool, installer, executable or expected manifest is missing.
- `build.rs`, `windows-app-manifest.xml`: embed Common Controls v6 and explicit `asInvoker` / `uiAccess=false` for all MSVC application and test targets, without duplicating Tauri's binary-only manifest. No dependency added.
- Architecture/development docs: document LF policy and generation/check workflow. This handoff records evidence and remaining hardware checks.

Tauri command registration, capabilities, CSP and application runtime code paths were reviewed and remain unchanged. Only `get_telemetry` is allowed from the local main window. IPC tests still reject another window and a remote URL. There are no added shell/filesystem grants or remote origins. NSIS remains `currentUser`; WebView2 runtime setup remains skipped. A supported existing WebView2 runtime is required. [Tauri documents per-user NSIS installation](https://v2.tauri.app/distribute/windows-installer/).

## Local regression results

Host: macOS arm64, Node 24.14.1, pnpm 12.21.0, Rust 1.100.0. Commands run for this stabilization:

| Exact command              | Actual result                                                   |
| -------------------------- | --------------------------------------------------------------- |
| `pnpm format`              | Passed; Prettier and Rust formatting                            |
| `pnpm format:check`        | Passed; Prettier and cargo fmt --check                          |
| `pnpm typecheck`           | Passed                                                          |
| `pnpm lint`                | Passed, zero warnings                                           |
| `pnpm test`                | Passed; 7 frontend tests in 2 files                             |
| `pnpm build:web`           | Passed; Vite production build                                   |
| `pnpm rust:check`          | Passed; cargo check --workspace --locked                        |
| `pnpm rust:test`           | Passed; 4 tests, 1 intentionally ignored explicit generator     |
| `pnpm rust:lint`           | Passed; Clippy all targets with -D warnings                     |
| `pnpm bindings:check`      | Passed; read-only DTO drift assertion                           |
| `pnpm bindings`            | Passed; exactly 1 explicit generator test; bytes unchanged      |
| `pnpm build --bundles app` | Passed; native release executable and 9.75 MiB macOS app bundle |

Additional probes: forced `core.autocrlf=true` checkout reproduces the failure before attributes and passes after them; binary icon hashes match. An intentional temporary DTO mismatch makes `pnpm bindings:check` fail without modifying the mismatched file; original bytes restored in `finally`, then explicit generation produces the original bytes. The drift probe's failure is expected, not an unresolved regression.

Local bundle: `target/release/bundle/macos/Nepteer.app`; executable: `target/release/nepteer`. Generated build outputs remain ignored. Windows compilation/manifest/NSIS validation is performed on the native CI runner, not through macOS cross-compilation.

## CI and artifacts

Checkout/bindings fix commit: [`27bc5a2a4384ed1eaaaca98287e9963d98a1c0d1`](https://github.com/weiliang79/nepteer/commit/27bc5a2a4384ed1eaaaca98287e9963d98a1c0d1), pushed to `main`.

[Stabilization workflow run 44716956321](https://github.com/weiliang79/nepteer/actions/runs/44716956321):

- [macOS job 136222680956](https://github.com/weiliang79/nepteer/actions/runs/44716956321/job/136222680956): **passed**, including every validation step and native application bundle.
- [Windows job 136222680624](https://github.com/weiliang79/nepteer/actions/runs/44716956321/job/136222680624): **failed after formatting/frontend checks and Rust check passed**. The test executable compiled but exited before any tests ran with `0xc0000139 / STATUS_ENTRYPOINT_NOT_FOUND`. The installed Tauri/`embed-resource` sources embed the Common Controls v6 manifest only in application binaries, not test harnesses, matching [upstream Tauri issue 13419](https://github.com/tauri-apps/tauri/issues/13419). The follow-up build-script fix embeds the same explicit manifest across all MSVC targets.
- Windows artifact URL: none from this failed attempt.

Follow-up manifest fix: [`851e85c54af266854c4461cb4095161d2b87937b`](https://github.com/weiliang79/nepteer/commit/851e85c54af266854c4461cb4095161d2b87937b), [workflow run 44717978512](https://github.com/weiliang79/nepteer/actions/runs/44717978512).

- [macOS job 136226122868](https://github.com/weiliang79/nepteer/actions/runs/44717978512/job/136226122868): **passed**, including all validations and the application bundle.
- [Windows job 136226122356](https://github.com/weiliang79/nepteer/actions/runs/44717978512/job/136226122356): **passed**, including formatting, typecheck, lint, 7 frontend tests, Rust check, 4 Rust tests (explicit generator intentionally ignored), Clippy, native x86_64 MSVC release build, NSIS bundling, both-output verification, manifest validation, license inventories and artifact upload.

Verified Windows artifact: [nepteer-windows-x86_64-851e85c54af266854c4461cb4095161d2b87937b](https://github.com/weiliang79/nepteer/actions/runs/44717978512/artifacts/14620034690), 4,700,012-byte ZIP (artifact ID `14620034690`). It was downloaded through the GitHub connector; the successful job's output checks and upload log verify:

- `nepteer.exe`: 8,731,136 bytes.
- `bundle/nsis/Nepteer_0.1.0-alpha.0_x64-setup.exe`: 1,958,307 bytes.
- Windows SDK `mt.exe` extracted the produced executable's manifest and verified `asInvoker` / `uiAccess=false`.

License inventories: [Windows](https://github.com/weiliang79/nepteer/actions/runs/44717978512/artifacts/14621216636), [macOS](https://github.com/weiliang79/nepteer/actions/runs/44717978512/artifacts/14620955934). No installer or executable was run on Steam Deck hardware. The final documentation-only commit records this completed run; it does not change the validated application code.

The Windows build command is `pnpm build --target x86_64-pc-windows-msvc --bundles nsis`. Expected outputs are `target/x86_64-pc-windows-msvc/release/nepteer.exe` and `target/x86_64-pc-windows-msvc/release/bundle/nsis/*-setup.exe`. The workflow requires both, then uploads them as `nepteer-windows-x86_64-<commit SHA>`. Dependency inventories are uploaded separately per platform.

## Actual functionality and remaining manual checks

Actual: native shell, read-only Rust IPC, navigation, theme/unit preference persistence, conversion, capability rendering and retrieval timestamp. Mock: simulated Deck LCD / Windows 11, battery 78% discharging, CPU 54°C, fan 2800 RPM. GPU remains null/unavailable; samples do not change on refresh. There is no physical telemetry, hardware write, driver, controller mapping, power/fan/clock control or game hook.

**Steam Deck hardware testing remains pending.** Follow [WINDOWS_TESTING.md](WINDOWS_TESTING.md): existing WebView2, standard-user install/launch with no unexpected elevation, source labels/values, settings across restart, 1280×800 touch/keyboard layout, planned pages, process exit and uninstall. The embedded manifest check verifies declared privilege, not interactive runtime behavior on Windows 11. Unsigned alpha/SmartScreen handling, macOS signing/notarization, full distribution license/notice review and Windows-specific dependency inventory review remain outstanding. No project-wide MIT compatibility is claimed.
