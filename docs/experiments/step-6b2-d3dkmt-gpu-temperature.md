# Step 6B.2 — Bounded D3DKMT GPU temperature experiment

**EXPERIMENTAL — GPU TEMPERATURE PROBE — MANUAL RUN ONLY**

Status: implementation for review; physical discovery and execution **pending**. API success does not equal validated GPU telemetry. CPU temperature and fan RPM remain deferred. No production integration is authorized.

## 1. Scope and provenance

Base: latest verified `origin/main`, `82d16da561de11757b30f4f8d03b68e77b04f755`, merged Step 6B.1 [PR #13](https://github.com/weiliang79/nepteer/pull/13). Its push-triggered [post-merge Desktop CI 45937693567](https://github.com/weiliang79/nepteer/actions/runs/45937693567) completed successfully, checked before implementation. Branch: `experiment/windows-gpu-temperature-d3dkmt`. Do not merge automatically.

This is an independently implemented, optional, ordinary-user Windows x86_64 console diagnostic for the known Steam Deck LCD / Windows 11 target with its existing Valve APU driver. It obtains evidence for the next decision. It performs no installation, background sampling, network access, hardware control or persistent hardware logging. It is outside the root Cargo workspace, Tauri application, normal installer and QAM diagnostic build.

## 2. Relationship to Step 6B.1

The [authoritative decision](../decisions/step-6b1-windows-sensor-feasibility.md), especially sections 7 and 12–17, identifies a candidate interface, not verified target support. This separately authorized experiment implements only its GPU diagnostic path. Installed driver provider/version/date, WDDM version, exact Windows build, sensor origin and freshness are unknown until manually observed. The published Valve package date is not an installed driver version.

Production `cpuTemperatureCelsius`, `gpuTemperatureCelsius`, `fanRpm` stay null; CPU/GPU/fan/hardware-controls capabilities stay false. Mock samples, `get_telemetry`, preferences, controller/HID, navigation, permissions and installer contracts are unchanged.

## 3. Official contracts reviewed before implementation

Reviewed 2026-11-27; documentation contracts are distinct from target observations.

| Contract                  | Official reference                                                                                                                                                                                                                                                                                                                                                                              | Established / unresolved                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| User-mode query           | [D3DKMTQueryAdapterInfo](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/nf-d3dkmthk-d3dkmtqueryadapterinfo)                                                                                                                                                                                                                                                            | Gdi32 entry point; NTSTATUS; no caller timeout or universal target support promise                                           |
| Query descriptor          | [D3DKMT_QUERYADAPTERINFO](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/ns-d3dkmthk-_d3dkmt_queryadapterinfo), [query enum](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/ne-d3dkmthk-_kmtqueryadapterinfotype)                                                                                                                             | Handle, type, private output pointer and byte size; web enum may omit later entries                                          |
| Interval performance data | [D3DKMT_ADAPTER_PERFDATA](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/ns-d3dkmthk-_d3dkmt_adapter_perfdata)                                                                                                                                                                                                                                                         | Main adapter temperature in 0.1°C; physical adapter index; no sample timestamp, documented universal sentinel or GPU subtype |
| Enumeration               | [CreateDXGIFactory1](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-createdxgifactory1), [EnumAdapters1](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-idxgifactory1-enumadapters1)                                                                                                                                                                        | DXGI reference ownership; NOT_FOUND terminates enumeration; order is not identity                                            |
| Adapter metadata          | [GetDesc1](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-idxgiadapter1-getdesc1), [DXGI_ADAPTER_DESC1](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/ns-dxgi-dxgi_adapter_desc1)                                                                                                                                                                                  | Vendor/software classification and private LUID; legacy zero vendor fails closed                                             |
| Open / release            | [OpenAdapterFromLuid](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/nf-d3dkmthk-d3dkmtopenadapterfromluid), [open structure](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/ns-d3dkmthk-_d3dkmt_openadapterfromluid), [CloseAdapter](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/nf-d3dkmthk-d3dkmtcloseadapter) | Matching D3DKMT handle lifecycle, distinct from Win32 HANDLE                                                                 |
| Selection guards          | [D3DKMT_ADAPTERTYPE](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/ns-d3dkmthk-_d3dkmt_adaptertype), [physical count](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/d3dkmthk/ns-d3dkmthk-_d3dkmt_physical_adapter_count)                                                                                                                             | Reject unsupported/ambiguous topology before temperature query                                                               |
| Bindings                  | [Microsoft windows-rs 0.62.2](https://github.com/microsoft/windows-rs/tree/0.62.2), [performance query constant](https://microsoft.github.io/windows-docs-rs/doc/windows/Wdk/Graphics/Direct3D/constant.KMTQAITYPE_ADAPTERPERFDATA.html)                                                                                                                                                        | Microsoft-generated definitions; installed SDK assertions validate the exact ABI                                             |

The proposed application contract needs inbox DXGI/Gdi32 and the existing display driver, with no new kernel driver, service or elevation. No elevation requirement is listed for these calls; ordinary-user success on the target is still untested. Generic query minimum Vista does not imply support for this later performance query. Physical count requires Windows 10/WDDM 2.0; related performance caps document Windows 10 1803/WDDM 2.4. Target Windows 11 is necessary context, not a driver support guarantee. Unsupported query/metadata stops; no alternative API fallback.

## 4. Exact functions and structures

`CreateDXGIFactory1<IDXGIFactory1>` → bounded `EnumAdapters1` / `GetDesc1` → `D3DKMTOpenAdapterFromLuid(D3DKMT_OPENADAPTERFROMLUID)` → `D3DKMTQueryAdapterInfo(D3DKMT_QUERYADAPTERINFO)` for selection-only `KMTQAITYPE_ADAPTERTYPE` (15) and `KMTQAITYPE_PHYSICALADAPTERCOUNT` (30) → **at most one** `KMTQAITYPE_ADAPTERPERFDATA` (62) → `D3DKMTCloseAdapter(D3DKMT_CLOSEADAPTER)`.

There are at most three sequential adapter-info calls: two metadata guards and one temperature attempt. “One query” means one performance query, not polling or repeated reads. Only `Temperature` is read from the returned performance structure. Fan, power, memory/clock and override fields are never interpreted, displayed or promoted. Private query helper accepts only the three statically selected structures; no user-controlled query type, buffer or adapter index.

## 5. Binding and ABI validation

The production dependency is `windows-sys` 0.61.2; it contains WDK definitions but current production features do not enable them. `windows` 0.62.2 is already in the production locked transitive graph and provides COM RAII. The isolated package pins that version with only required feature families; it uses its own lockfile and changes no production dependencies/features. No community layout, SDK source, monitoring provider or Steam Deck Tools source was copied.

Native Windows Rust assertions and compile-only [SDK comparison](../../tools/windows-gpu-temp-probe/abi-check.cpp) require:

| Type                          | x64 size / alignment | Relevant offsets                                                                       |
| ----------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| D3DKMT_ADAPTER_PERFDATA       | 64 / 8               | index 0; five u64 members 8/16/24/32/40; fan 48; power 52; temperature 56; override 60 |
| D3DKMT_QUERYADAPTERINFO       | 24 / 8               | handle 0; type 4; pointer 8; byte size 16                                              |
| D3DKMT_OPENADAPTERFROMLUID    | 12 / 4               | LUID 0; handle 8                                                                       |
| D3DKMT_CLOSEADAPTER           | 4 / 4                | handle 0                                                                               |
| D3DKMT_ADAPTERTYPE            | 4 / 4                | UINT union value                                                                       |
| D3DKMT_PHYSICAL_ADAPTER_COUNT | 4 / 4                | count 0                                                                                |

Both sides check enum values. C++ checks actual SDK APIENTRY/NTSTATUS/pointee signatures; Rust checks generated wrapper signatures without calling functions. Generated mutable pointers for in/out structures are compatible with SDK const structure pointers; pointed-to buffers and handles follow SDK ownership. C++ is compiled with MSVC `/c`, never linked or run. A mismatch fails CI and blocks physical execution. macOS tests validate portable policy only; they cannot prove Windows ABI.

## 6. Adapter selection policy

Enumerate at most 16 DXGI adapters, plus one bounded lookahead to detect truncation. Every description must succeed; duplicated LUIDs, truncated enumeration or any enumeration error fail closed. Ignore explicitly software adapters; require **exactly one hardware adapter**, vendor AMD (0x1002). More than one hardware adapter is ambiguous even if only one is AMD. Selection is independent of enumeration position and temperature.

Open only that adapter by its private LUID. Require render and display support; reject software, hybrid discrete, indirect, paravirtualized, detachable, compute-only, prototype and test devices. Require physical-adapter count **exactly one**. Only then is physical index zero justified. HybridIntegrated is an optional hybrid-topology flag, not universal proof of an integrated APU; it is not required or used as universal detection.

This policy finds a sole AMD hardware render/display candidate on the manually confirmed LCD target. It does **not** automatically identify a Deck, establish UMA, or prove physical sensor attribution. If context conflicts (external GPU/virtual session/other hardware, unexpected adapter), stop. Do not remove devices or change configuration to force selection. Future broader topology support needs separate review. No LUID, hardware ID or driver description is exported.

## 7. Temperature conversion and numeric admission

Use a distinct `RawDeciCelsius(u32)` and `CandidateCelsius(f64)`: `f64::from(raw) / 10.0`. No Kelvin subtraction or Fahrenheit conversion. The structure is zero initialized, including index and padding semantics supplied by the binding; output is read only after exact STATUS_SUCCESS. Unknown success/informational statuses are not accepted as complete output.

Raw zero remains indeterminate because the contract does not establish whether it represents a live 0°C sample or an unimplemented/untouched field. The experiment displays only raw 1 through 1200 inclusive (0.1–120.0°C), a conservative **display admission envelope**, not a documented silicon operating range, calibration or validity guarantee. Larger integers including `u32::MAX` are rejected by range; no undocumented universal sentinel is asserted. Values are not clamped. Passing this envelope is insufficient for measurement validation; plausible nonzero garbage remains possible.

## 8. Result semantics and output

Output has version/compiled commit, query name, fixed selection outcome, stage, fixed API category and optional hexadecimal status, optional candidate, attribution/freshness unresolved, completed performance-call elapsed milliseconds, cleanup outcome and total completed-attempt elapsed time. Build artifacts include COMMIT.txt. No arguments prints help without admission, enumeration or querying. Only exact `--run-once` permits hardware access on Windows x86_64. Other platforms reject it.

A candidate line is always **Candidate adapter temperature**, never validated GPU edge, hotspot, junction or CPU package. API success plus rejected numeric output is explicitly distinguished from API failure. Exit 0 means a displayed candidate with successful close, still **inconclusive**; exit 2 means no candidate/admission failure or failed close. Help exits 0. A failed close does not certify resource release.

## 9. Errors and unsupported results

Exact STATUS_SUCCESS is required for open/metadata/performance/close. Fixed NTSTATUS categories cover NOT_IMPLEMENTED/NOT_SUPPORTED, ACCESS_DENIED, DEVICE_REMOVED, INVALID_PARAMETER, NO_SUCH_DEVICE, NO_MEMORY/INSUFFICIENT_RESOURCES and other OS/driver failures. Invalid parameter is not automatically relabeled unsupported. DXGI HRESULT categories are handled separately, including adapter-not-found enumeration termination and device removed/reset. Unexpected statuses remain failures. No arbitrary system error formatting, raw memory/structures or error strings.

Permission/driver failures authorize no elevation, installation, retry, alternative driver, extra control query or fallback provider. Cleanup errors are shown separately from the read result and require stopping experiments.

## 10. Ownership and cleanup

Generated DXGI COM wrappers release each adapter and factory reference on every returning/error path. Only private LUIDs survive enumeration until this invocation exits. D3DKMT open success must return a nonzero owned handle. The Rust adapter guard performs one close attempt on normal return, validation failure, query failure, rejected value and unwinding after a returned call. It takes ownership out before close, preventing a failed close from being retried by Drop. No handle caching/reuse across invocations.

No close can run while a synchronous query remains outstanding on this thread. Close itself can fail or block; exactly one release attempt is not proof of successful release. Errors stop the experiment; process exit releases process-owned OS resources without an application-controlled driver recovery guarantee. A native crash, process termination or nonreturning call cannot promise Rust destructor execution. No unsafe cancellation, process killing or watchdog is implemented.

## 11. Admission, blocking and cancellation

One foreground process, one synchronous call at a time, no worker/thread, async task, queue, polling, automatic retry, recurring timer or stress load. A fixed **local-session named mutex**, zero wait, admits only one live invocation in that desktop session; occupied or observed abandoned ownership stops admission. The mutex remains owned across enumeration, queries and adapter cleanup. Do not run experiments across different Windows sessions/accounts. It is a collision guard, not persistent crash history; a vanished mutex does not authorize retry after a stall/crash.

All display-stack operations, including enumeration/open/query/close, can stall. Documentation provides no hard caller-controlled timeout. Elapsed time is measured monotonically **after a call completes** and is not sample age. No dropping futures, promise timeout, closing an in-use handle, replacement worker, process-kill or hidden recovery. If no completion arrives, there is no completed duration or cleanup evidence: **stop further experiments**, do not relaunch. This milestone specifies no hung-driver recovery procedure; normal Windows interaction and the user's own system recovery choices remain outside the probe.

## 12. Privacy, safety and licensing

Console-only sanitized allowlist; no network, disk sensor history, unique IDs, LUIDs, paths, serials, UUIDs, usernames/process names, full diagnostic exports or raw driver data. Adapter descriptions and unused DXGI fields exist only transiently inside the fixed OS structure; they are not printed or persisted. No EC/ACPI execution, bus/I²C/SMBus, MSR/SMU, PCI configuration access, undocumented IOCTL, register scanning, hardware control, driver/service, elevation, security-setting change, tool/Steam setting change, HID access or controller interaction. No third-party hardware API fallback.

Only Microsoft binding/runtime support crates and their macro dependencies are locked. Declared licenses are MIT OR Apache-2.0; unicode-ident additionally requires Unicode-3.0. The [notice bundle](../../tools/windows-gpu-temp-probe/THIRD-PARTY-NOTICES.txt) retains MIT and Unicode texts for all 15 external locked packages. Windows/DXGI/Gdi32 are inbox OS components, not redistributed DLLs. CI includes full standalone dependency metadata separately from unchanged production inventories. No project-wide license has been selected; this is an internal review artifact, not public release/compliance certification. See [existing license policy](../LICENSES.md).

## 13. Independent manual discovery prerequisites — pending

Before choosing to execute, review source, exact commit, passed Windows SDK/Rust ABI checks and artifact procedure. Record only:

1. Known device: Steam Deck LCD, Windows 11 version/build from Settings → System → About.
2. Device Manager → Display adapters → existing AMD adapter → Properties → Driver: provider, **installed** version and date. Cancel any elevation prompt.
3. WDDM version if readily visible in the existing DirectX Diagnostic Tool Display tab; do not export its report.
4. Task Manager → Performance → GPU: is there an explicitly labeled temperature, and what unit/label? Absence proves no API conclusion.
5. Exact sensor labels/units and tool version from a trusted tool **already running/configured**, if any. Unknown is acceptable; no installation, launch, configuration change or additional scan.

Do not record device IDs/paths, serials, UUIDs, account names, complete screenshots/exports or hardware histories. Driver context is pending and must not block compilation/tests. This checklist requires ordinary UI only; the older Step 6B.1 optional CPU/fan WMI observations are unnecessary for this experiment.

## 14. Deliberate manual execution — not yet performed

1. Confirm LCD/Windows 11 and complete the context above. No remote/virtual session, external GPU or active game. Do not reconfigure hardware to satisfy the probe.
2. Review this procedure and explicitly choose to run the exact reviewed artifact. Merely compiling/downloading it does not authorize execution. No agent or CI executes it for you.
3. Exit unrelated experimental sensor utilities only if safe/convenient; do not change Steam/Steam Deck Tools settings or terminate system/protected processes. Do not start a stress workload.
4. Open ordinary PowerShell in the extracted artifact directory. Do not use Run as administrator. Run once:

```powershell
.\EXPERIMENTAL-GPU-TEMPERATURE-PROBE-MANUAL-RUN-ONLY.exe --run-once
```

5. Record sanitized console result, duration and close outcome in the template below; no persistent sensor log/redirection or full system export.
6. Observe that normal Windows interaction and an already-open Nepteer remain responsive. Nepteer does not participate in the experiment. Confirm production GPU stays unavailable.
7. After any error, stall, failed cleanup, permission/driver prompt or unexpected behavior, stop; no automatic/manual repeated retries to force support. Cancel any prompt without changing security/driver/tool settings.
8. Report the single outcome and limitations. A second ordinary desktop observation may be considered only after a successful, responsive first invocation and a **separate deliberate user choice**. No load generation. Agreement with another tool alone proves neither accuracy nor source identity/freshness.

## 15. Windows acceptance checklist — all pending

Record pass / fail / not tested; no CI result substitutes for these:

- Reviewed exact commit/artifact, explicit user choice, ordinary account, LCD/Windows context recorded.
- No unexpected UAC, installation, permission, settings or security request.
- Adapter selection outcome agrees with known context; ambiguity stops before performance query.
- One completed performance attempt or sanitized unsupported/failure; no retries/background activity.
- Candidate, if any, labeled experimental; units distinct; zero/rejected values absent from candidate output.
- Attribution/freshness remain unresolved unless separately supported by adequate evidence.
- Completed call duration recorded, responsiveness observed, close succeeded or failure honestly recorded.
- No identifiers/raw structures or persistent logs exported; no extra sensor/control information.
- Nepteer retains null CPU/GPU/fan and false capabilities; QAM/HID/preferences unchanged.
- Optional second observation only under step 14 conditions; no stress test or compatibility generalization.

## 16. Sanitized evidence template

| Field                                                         | Observation                                     |
| ------------------------------------------------------------- | ----------------------------------------------- |
| Probe version / commit / artifact                             | Pending                                         |
| Device / Windows version and build                            | Steam Deck LCD / Windows 11 / build pending     |
| Installed display-driver provider / version / date            | Pending (not Valve package date)                |
| WDDM version if visible                                       | Pending / not observed                          |
| Task Manager exact temperature label/unit/presence            | Pending                                         |
| Already-running trusted tool/version, exact label/unit if any | Pending / none / unknown                        |
| Ordinary user, no active game, known physical context         | Pending                                         |
| Selection / stage / fixed API category / safe numeric status  | Pending                                         |
| Candidate adapter temperature if displayed                    | Pending; never validated GPU telemetry          |
| Performance-query elapsed / total elapsed / cleanup           | Pending                                         |
| Windows and Nepteer responsiveness / unexpected behavior      | Pending                                         |
| Attribution evidence / remaining limits                       | Unresolved                                      |
| Freshness evidence / remaining limits                         | Unresolved; retrieval elapsed is not sensor age |
| Outcome / decision                                            | Pending / unsupported / inconclusive / stop     |

## 17. Stop criteria

Stop on ambiguous topology, missing metadata, unsupported query, permission denial, unexplained zero/out-of-envelope value, device removal, failed close, stalled call, crash, degraded responsiveness, unexpected prompt or any requested privilege/driver/security/configuration change. Record inconclusive rather than trying another hardware API. No installation, driver switching, repeated process spawning or stress testing to recover a result.

## 18. Production decision gates

A separate approved milestone is required. Require documented/credible physical source attribution (and honest UI label), adequate sample-age/update evidence for the exact installed driver, standard-user support, latency and failure/cleanup evidence, bounded admission and shutdown policy, device-change/sleep/resume behavior and review of status/provenance needs. A plausible value, nonzero field, exact API success, changing values or third-party agreement alone do not satisfy these gates. No such evidence has been collected. Current recommendation: retain production GPU unavailable, CPU/fan deferred.

## 19. Open attribution and freshness questions

Microsoft describes interval data and a main adapter sensor. It does not establish edge versus hotspot/junction/shared APU source on the Valve driver. No sample timestamp, update period, validity flag or universal unsupported-temperature representation is established. A frozen value is not proof of staleness; a changing value is not a calibrated/attributed reading. Desktop observations cannot prove worst-case driver latency or crash recovery. The sole-AMD policy does not replace manual target identification. Broader support and production integration remain blocked on these uncertainties.

## 20. Validation and final experiment status

Portable probe tests cover conversion boundaries, zero/range rejection, selection, topology, NTSTATUS/HRESULT handling, safe output and mocked acquisition/query/cleanup sequencing, failures before/after acquisition, unwind cleanup, no retry and fresh ownership per invocation. Windows adds native SDK/binding ABI checks. Tests never instantiate NativeApi or call display hardware functions. Compilation and SDK static assertions are not hardware execution.

Standard repository commands remain required: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm bindings:check`, `pnpm rust:check`, `pnpm rust:test`, `pnpm rust:lint`, `pnpm build:web`, both license inventories and `git diff --check`. The standalone package requires separate `cargo fmt`, `check`, `test`, `clippy` and Windows build; root Cargo commands deliberately exclude it. Windows CI compiles/tests/SDK-checks/stages an explicitly experimental artifact without running its executable. Normal Windows/macOS packaging and production diagnostic exclusion remain intact. Existing manual Slow Refresh workflow is unchanged.

Delivery evidence, totals and exact CI/artifact links are recorded in the completion report and [handoff](../HANDOFF.md). **No physical probe executed; physical acceptance pending.** Target driver compatibility, physical sensor meaning and freshness remain unknown. The next decision is whether the user chooses one reviewed ordinary-user observation, not whether to enable production GPU telemetry.
