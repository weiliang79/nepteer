# AGENTS.md — Nepteer

## Mission
Nepteer is an independently implemented, open-source-oriented Windows handheld companion, initially targeting the **Steam Deck LCD running Windows 11**. It aims to provide SteamOS-inspired system telemetry, quick controls, input mapping, power/fan profiles, and a controller-friendly Quick Access Menu. **The current milestone is v0.1.0-alpha foundation, not hardware control.**

Repository: https://github.com/weiliang79/nepteer

## Current milestone: Step 1 — Foundation
Produce a genuinely runnable Tauri **v2** desktop application with **Rust, React, TypeScript, Vite, pnpm, Tailwind CSS, and shadcn/ui**. macOS is the primary authoring environment; Windows x86_64 is the primary shipping target. Use a **mock-only hardware provider** to demonstrate a safe UI-to-Rust data path. Add CI that verifies the project on Windows and macOS (where supported by hosted runners).

### Required acceptance criteria
- A clean checkout installs dependencies and launches on a correctly prepared macOS development machine with documented commands.
- An x86_64 Windows build succeeds on GitHub Actions; its installable or runnable output is uploaded as a workflow artifact, if supported by the selected Tauri bundling configuration.
- A responsive desktop dashboard renders battery, temperatures, fan RPM and hardware capabilities from explicitly labeled **mock** data; unsupported metrics render as unavailable, never as zero.
- UI-to-Rust communication is demonstrated with a typed, read-only Tauri command returning a mock telemetry snapshot and capability information.
- A **single reusable mock provider interface** exists; no OS/hardware writes are implemented.
- Basic automated tests, lint/type-check/format commands and a clear README are provided; report any checks not executed.
- No administrator requirement, kernel-driver installation, privileged helper, or dependency on Steam Deck Tools.

## Engineering priorities
1. Safety and reversible behavior over feature breadth.
2. Correct and maintainable Rust/TypeScript interfaces over premature abstractions.
3. A working end-to-end vertical slice over placeholders that only look complete.
4. Minimal, explicit dependencies; prefer stable upstream-maintained packages and official Tauri v2 guidance.
5. Code that a solo developer can understand and iterate on.

## Implementation boundaries
- **Read-only/mock only in Step 1.** Never write fan duty, EC registers, TDP, GPU/CPU frequencies, BIOS/firmware settings, display modes, or input-injection controls. Do not install drivers.
- Do not claim mock readings are live. Label every sample value and data source in UI and API.
- Rust is the authority for device capability and telemetry models. Frontend communicates through typed Tauri IPC, not direct host hardware access.
- Separate read-only `TelemetryProvider` capabilities from future write-oriented control traits. For unsupported values, use `Option<T>` (or a typed unavailable status), not fabricated values or sentinel zero.
- Feature-gate/platform-gate Windows-specific integrations so macOS builds remain viable. Do not assume Windows APIs or devices exist on macOS.
- Keep the Tauri command surface narrow and use least-privilege Tauri v2 capabilities. No shell execution plugin or unrestricted filesystem scopes without a documented need.
- Never copy, mechanically translate, or bundle source from `ayufan/steam-deck-tools` (CC BY-NC-SA 4.0) without separate rights review. Independently implement documented interfaces; review and record every third-party dependency license before distribution. Do not assume the entire project is MIT-compatible until audited.
- Do not bypass Windows UAC, Secure Desktop, driver signing, anti-cheat, or operating-system security checks.
- Do not inject or hook into game processes in Step 1.
- Steam button, ⋯ button, rear buttons, trackpads, Neptune HID, Lizard Mode, virtual gamepads, RTSS, FPS limiting, TDP, fan control, and per-game profiles are **future work**, not Step 1 acceptance criteria.

## Design and architecture
Use a small pnpm workspace, with Tauri and the React app co-located to minimize friction. A reasonable starting shape:

```text
apps/desktop/
  src/                  # React + TypeScript UI
  src-tauri/            # Tauri v2 shell and Rust commands
crates/deck-core/       # domain types and read-only provider traits
crates/deck-hardware/   # mock provider now; Windows adapters later
packages/               # add only when demonstrated reuse requires it
 docs/                  # architecture, hardware safety, development
.github/workflows/      # CI
```

Adjust this shape if Tauri scaffolding requires it; document why. Avoid empty crates/packages and avoid creating a separate service in Step 1. If introducing multiple Rust crates complicates development, use internal Rust modules first and extract crates after tests justify the separation.

Initial domain model should support: platform/device identification, battery percentage and charge state, CPU/GPU temperatures, fan RPM, data source (`mock`, `windows`, or `unsupported`) and capability flags. Use defensively typed units and timestamped snapshots. Do not invent telemetry from a live system.

For the UI, create a restrained, controller/touch-friendly dashboard with a clear source indicator, responsive layout, simple navigation, and a future Quick Access Menu entry point. A production game overlay is **not** required now. Prepare navigation and design tokens without implementing OS-level overlay management.

## Development workflow
- Prefer a `feat/foundation` branch and a focused pull request to `main`; do not force-push or rewrite unrelated history.
- Before coding, inspect the repository and current upstream documentation for Tauri v2 and installed toolchain versions. Do not assume an existing project or fabricate passing commands.
- Implement in small checkpoints. Keep formatting, lint, type checks, Rust checks and unit tests executable from documented root scripts.
- Test mock provider behavior and UI rendering; ensure unsupported values are distinguishable from actual zero readings.
- Ensure macOS build/dev commands are documented separately from Windows compilation/test instructions.
- Use GitHub Actions on Windows (`windows-latest`) to validate the target; avoid assuming cross-compilation from macOS produces a supported Windows bundle.
- Keep build outputs, secrets, installer artifacts and machine-specific state out of Git.
- If you lack a Windows Steam Deck, mark hardware verification as pending; never imply CI proves hardware correctness.

## Agent reporting contract
At the end of each milestone, summarize:
1. Files/components added or changed and the reasoning.
2. Exact commands run and whether they passed; separately list commands not run.
3. CI status and the Windows artifact location, if available.
4. Actual versus mocked functionality.
5. Known limitations, dependencies/licenses to review, and next hardware-specific tests.
6. The commit hash and branch, if committed.

Do not silently expand scope. Ask before introducing native kernel access, admin privileges, game injection, or external copyrighted source reuse. Avoid committing/pushing unless the user explicitly requests it in the coding session.

## Planned future phases (not part of Step 1)
- Quick Access Menu: normally hidden controller-friendly window; Win32 focus/fullscreen behavior tested on Windows.
- Windows telemetry: documented Windows APIs and read-only sensors, with LCD/OLED detection.
- Input: Neptune HID observation; Steam/⋯, rear buttons, trackpads; investigate firmware Lizard Mode for UAC cursor fallback.
- Power: refresh rate, FPS limiter, validated TDP/GPU clock and fan controls only after hardware research and safe recovery design.
- Overlay: Tauri Quick Access Menu and potentially RTSS for noninteractive performance HUD.
- Profiles: per-game capability-aware settings and safe restoration.

## Background references
- Tauri v2: https://v2.tauri.app/
- Steam Deck Windows driver support: https://help.steampowered.com/en/faqs/view/6121-ECCD-D643-BAA8/
- Existing project studied for functionality only (do not copy): https://github.com/ayufan/steam-deck-tools
