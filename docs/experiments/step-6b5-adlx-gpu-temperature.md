# Step 6B.5 — ADLX GPU edge-temperature feasibility: distribution blocked

Research date: 2026-11-28. Branch: `experiment/windows-adlx-gpu-temperature`.
**Outcome B: documented licensing blocker. No ADLX probe is implemented or distributed.**

## 1. Purpose and scope

Investigate a future ordinary-user, Windows x86_64, manual one-shot GPU edge-temperature consumer of the existing AMD driver runtime. Follow [6B.4 section 21](../decisions/step-6b4-standalone-sensor-architecture.md#21-one-recommended-next-experiment--conditional-adlx-gpu-read). Standalone Nepteer must not require another running monitor. CPU temperature and measured Jupiter system-fan RPM remain deferred. Production sensors remain null with false capabilities.

The user authorized implementation only after Gates A (licensing) and B (official contract). Gate A is unresolved; stop before publishing SDK-derived implementation or an executable. This report is the permitted fallback. It does not assert that AMD forbids every independently written consumer, or that a temperature API is absent. No speculative binding, C++ shim, Cargo workspace, ABI fixture, executable or ADLX CI artifact is added.

## 2. Verified repository provenance

Fetched latest `origin/main`, exactly `caf71d01d9a1a3af1bf641e170660b20a77a0be4`. [PR #15](https://github.com/weiliang79/nepteer/pull/15) is merged at that SHA. Its push-triggered [post-merge Desktop CI 46112493280](https://github.com/weiliang79/nepteer/actions/runs/46112493280) completed successfully. Main contains the [6B.4 architecture decision](../decisions/step-6b4-standalone-sensor-architecture.md); this branch starts there.

Reviewed current AGENTS/README/architecture/safety/development/handoff/Windows testing, [6B.1](../decisions/step-6b1-windows-sensor-feasibility.md), [6B.3](step-6b3-hwinfo-shared-memory.md), and native [DTO/provider selection](../../apps/desktop/src-tauri/src/telemetry.rs), [Windows provider](../../apps/desktop/src-tauri/src/telemetry/windows.rs), CI, manifest and licensing conventions. Windows reads battery plus two non-unique WMI identity fields. Its CPU/GPU/fan values are absent and capability flags false. This milestone changes none of that implementation.

Read only the [6B.2 procedure at immutable commit f8d4581](https://github.com/weiliang79/nepteer/blob/f8d4581aa8b5c8896a2adf28e2c029cdcaf3d810/docs/experiments/step-6b2-d3dkmt-gpu-temperature.md). That commit is not an ancestor of verified main; the experiment remains independent. No merge, cherry-pick or implementation import. Historical 6B.1/6B.3/6B.4 records remain unchanged.

## 3. Known target environment

All target facts below are user reports, not hardware interrogation by this research.

| Property             | Reported value                    |
| -------------------- | --------------------------------- |
| Device / platform    | Steam Deck LCD / Valve Jupiter    |
| Processor            | AMD Custom APU 0405               |
| OS                   | Windows 11 26H2, build 26300.9974 |
| Installed AMD driver | 31.0.21020.1014                   |
| Driver date          | June 9, 2023                      |
| WDDM                 | 3.1                               |

The installed driver date is not a downloadable package date. No source reviewed certifies this exact custom APU/Valve driver for ADLX. New SDK availability does not install a newer runtime on the Deck.

## 4. Historical evidence and its limits

D3DKMT adapter-performance acquisition succeeded, but experimental admission rejected the temperature. Its raw value was not disclosed: do not infer zero or any sentinel. Windows/Nepteer remained responsive; Task Manager displayed temperature N/A. This rules out neither ADLX nor another documented native API.

HWiNFO64 v8.60 reportedly displayed a GPU Temperature candidate of 48.6°C and required elevation. Its acquisition mechanism, sensor correctness and ordinary-user consumer access were not established. Preserve the [6B.3 screenshot evidence and contract blocker](step-6b3-hwinfo-shared-memory.md), including the questionable historical minimum and fan observation. Neither GUI agreement nor a plausible number would independently validate ADLX attribution/freshness. HWiNFO remains a research reference, never a production fallback.

## 5. Pinned official materials

Pin `GPUOpen-LibrariesAndSDKs/ADLX` revision **`32b5a740d42295c5dfe9026b9f52683da0f3af91`**. [ADLXVersion.h](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Include/ADLXVersion.h) identifies **2.0.0.125**. Read-only official materials were retrieved through GitHub API into temporary local review files, never installed, built or executed. No SDK material is vendored.

The eight-page [SDK agreement](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/ADLX%20SDK%20License%20Agreement.pdf) was independently extracted with PDFKit. SHA-256: `c62178b9d30f75450088c5238193644b45ab5a23442f70f5a3f6b09b951180a6`. This fingerprint identifies reviewed bytes, not legal acceptance. [Repository README](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/README.md) points to that agreement. Current [product page](https://gpuopen.com/adlx/) and [manual](https://gpuopen.com/manuals/adlx/) are mutable supporting references; pinned files control this review's source facts.

## 6. Gate A — licensing assessment

This is an engineering publication gate, not a legal opinion or acceptance on the user's behalf. The following summarizes the [agreement](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/ADLX%20SDK%20License%20Agreement.pdf); no SDK license/source text is copied into Nepteer.

Sections 1.5/1.8/1.10 encompass documentation, headers, samples and software developed using them. Section 2 permits internal development and conditional sample/derivative distribution “solely in Object Code form”; section 3 requires restrictive downstream EULA terms. Sections 4(b)/(f) restrict publication and required free-software licensing. Sections 5/7 separate third-party/component rights; section 12 imposes confidentiality obligations. Schedule A names ADLX; Schedule B supplies downstream terms. Public hosting does not resolve these conditions.

| Permission question                     | Assessment under the root agreement                                   |
| --------------------------------------- | --------------------------------------------------------------------- |
| Review documentation                    | Included in agreement scope; not an unrestricted documentation grant  |
| Develop an independent consumer         | Internal licensed-purpose development contemplated, subject to terms  |
| Publish SDK-derived structures/bindings | No general source-publication grant established                       |
| Distribute experimental executable      | Conditional object-code grant; applicable EULA obligations unresolved |
| Link installed AMD runtime              | No blanket exemption from SDK terms established                       |
| Redistribute AMD DLLs                   | No general runtime redistribution clearance established               |
| Ship future Nepteer ADLX release        | Combined source/binary/license obligations unresolved                 |

Engineering conclusion: **Gate A fails clearance for this intended public delivery**. Obtain clarification of component exceptions, independently written bindings, downstream EULA applicability and installed-runtime versus bundled-runtime rights before implementation. No blanket incompatibility ruling is made.

### Component-specific MIT evidence and unresolved scope

The same pinned tree contains an official Rust component, [`Samples/rust/amd-adlx/LICENSE`](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/Samples/rust/amd-adlx/LICENSE), with an MIT grant. Its [Cargo.toml](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/Samples/rust/amd-adlx/Cargo.toml) declares MIT. Its [README](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/Samples/rust/amd-adlx/README.md) describes raw bindings and a runtime loader and claims that MIT matches the public SDK. That broader claim conflicts with the root README's PDF reference and restrictive agreement; it cannot silently relicense all SDK headers/helpers/runtime.

Section 7 makes a component exception plausible; the MIT notice must not be ignored. However, permission for this combined workflow—using official headers for ABI verification, publishing a derived consumer and distributing its binary against an installed AMD runtime—has not been established. The C++ [helper](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/ADLXHelper/Windows/Cpp/ADLXHelper.cpp), [headers](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Include/ADLX.h) and [metrics sample](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/Samples/CPP/PerformanceMonitoring/PerfGPUMetrics/mainPerfGPUMetrics.cpp) carry AMD reserved-rights notices, without a separate permissive grant in those files.

The complete recursive pinned file listing contains no DLL/import-library payload and no blanket third-party notice granting runtime distribution. The installed Valve runtime's own applicable terms were not obtained; linking and redistribution are separate unresolved questions. Generated documentation includes third-party script notices; those are not an SDK/runtime license. No third-party component or DLL ships here, so no new notice bundle is needed. Nepteer itself has [no selected project-wide license](../LICENSES.md); that does not erase the public source/distribution questions.

Recommended clarification, for user-authorized counsel or AMD contact: identify the controlling terms for the Rust component versus core headers, whether independent consumer/binding source may be public under Nepteer's eventual license, whether ABI-only header use triggers downstream restrictions, which EULA applies to an experimental executable using an existing runtime, and whether runtime bundling has separate terms. No contact or message is sent by Codex.

## 7. Gate B — inspected contract and remaining verification

**Not passed for implementation.** Primary declarations exist; no guessed vtable is needed or permitted. The table records inspected facts, not a complete ABI certification. No declaration/layout is reproduced as implementation code.

| Area                   | Pinned official contract / observed fact                                                                                                                                                                                                                                                                                                       | Remaining gate                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Runtime / exports      | [ADLX.h](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Include/ADLX.h): x64 `amdadlx64.dll`; full-version query, default initialization and termination exports                                                                                                                           | Authentic installed location and exact runtime compatibility untested                                   |
| Default initialization | Same header: version input, system-interface output, ADLX result; failed initialization specifies null output                                                                                                                                                                                                                                  | Choose one fixed default entry point/version; audit partial-failure cleanup                             |
| ABI                    | [ADLXDefines.h](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Include/ADLXDefines.h): exported functions use cdecl, interface methods stdcall; C explicit-this vtables; interface IDs are wide strings, not COM GUIDs                                                                     | Windows x64 header/compiler comparison not performed                                                    |
| Scalars                | Same header: C boolean is uint8; C++ boolean is bool; double temperature; signed 64-bit timestamp; Windows long differs from macOS long                                                                                                                                                                                                        | Assert actual sizes/enums/layouts/calling conventions in a licensed future build                        |
| GPU enumeration        | [ISystem.h](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Include/ISystem.h), [ICollections.h](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Include/ICollections.h): GPU list, count/index access, reference-counted GPU interfaces | Check bounded enumeration, count/index/error behavior and topology stability                            |
| Identity               | ISystem GPU: VendorId/DeviceId return four-hex-digit strings borrowed for GPU lifetime; Type, IsExternal, HasDesktops have status/output contracts                                                                                                                                                                                             | Confirm internal integrated target; properties alone do not prove Deck identity                         |
| Performance service    | ISystem: GetPerformanceMonitoringServices returns a reference-counted service                                                                                                                                                                                                                                                                  | Null/error handling and runtime availability untested                                                   |
| Support                | [IPerformanceMonitoring.h](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Include/IPerformanceMonitoring.h): GetSupportedGPUMetrics takes GPU and returns support interface; IsSupportedGPUTemperature separates result from boolean                                                       | Explicit false must differ from failed check                                                            |
| Current metrics        | Same header: GetCurrentGPUMetrics takes GPU and returns owned reference-counted metrics; failed output null; suitable for single acquisition                                                                                                                                                                                                   | At-most-once policy, blocking and driver behavior untested                                              |
| Temperature / time     | Same header: GPUTemperature double °C edge average; TimeStamp signed 64-bit acquisition milliseconds from system epoch                                                                                                                                                                                                                         | No adopted sentinel; epoch correspondence/field freshness unresolved                                    |
| Lifetime               | ADLXDefines reference counting; ISystem/service/list/metrics ownership documentation; [termination contract](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDKDoc/html/page__a_d_l_x_terminate__fn.html)                                                                                      | Full ownership map, thread affinity/concurrency and failed-init/termination behavior require completion |
| Platform               | Pinned README: Windows 10+, Visual Studio 2019 C/C++ samples; Rust component documents Windows MSVC                                                                                                                                                                                                                                            | No native build/ABI check or Custom APU 0405 support evidence                                           |

Pinned [compatibility guidance](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDKDoc/html/page_guide__compatibility.html) permits reduced interfaces with older drivers and warns about legacy GPU/driver support. General compatibility is not permission to call incompatible-driver initialization here. Core metrics methods are documented since 1.0; SDK 2.0.0.125 does not prove the 2023 Valve runtime supports them.

## 8. Trusted runtime loading policy — unresolved

Future loading must use only an authentic already-installed AMD runtime through a verified documented trusted location/mechanism. Never accept a path from arguments, search the working directory, download/copy DLLs or update the driver. Absence or inability to load safely means unavailable. No installed runtime was inspected here.

Pinned [C++ platform loader](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/SDK/Platform/Windows/WinAPIs.cpp) uses LoadLibraryEx with application/user/default/system search flags, not a system-directory-only policy. The [Rust loader](https://github.com/GPUOpen-LibrariesAndSDKs/ADLX/blob/32b5a740d42295c5dfe9026b9f52683da0f3af91/Samples/rust/amd-adlx/src/helper.rs) uses a bare-name LoadLibraryW. Neither can be adopted unchanged as proof of the stricter installed-runtime authenticity boundary. Search flags alone do not establish publisher authenticity or safe dependency loading. Exact trusted location, publisher validation and dependency search need official evidence and review; do not assume System32 is the documented installation location.

## 9. Default initialization — planned only

Future allowlist: required version/export validation followed by one default initialization. The C++ helper prefers initialization version 2 when available and resolves additional incompatible-driver/caller-ADL exports; no such general helper is adopted. Select and compile-check a fixed documented default path after clearance. No automatic second initialization or alternate entry point after failure. No caller-owned ADL context, incompatible-driver initialization, SDK installer or external GUI.

Success must have the expected non-null system interface and compatible version. A non-success result or malformed output stops acquisition. No default initialization occurred, so ordinary-user success, availability and permission remain unknown.

## 10. GPU identity and selection — planned only

Require manually confirmed LCD target context. Validate count and enumerate at most 16 GPUs; reject overflow, truncation, errors, zero GPUs, duplicate/ambiguous identity and additional ambiguous topology. Never take index zero blindly. Require AMD vendor, integrated type, non-external status, desktop participation and consistent DeviceId using only verified properties. Missing/unsupported identity properties stop before acquisition. Borrowed strings must remain bounded, private and within owning GPU lifetime; no marketing-name matching or identifier output.

HasDesktops describes desktop participation, not universal proof of physical LCD identity. Integrated AMD alone cannot identify a Deck. No expected DeviceId is invented from the APU marketing name. No GPU selection is implemented or hardware identity read.

## 11. Fixed temperature capability/acquisition path — planned only

After admission/trusted load/default initialization: system GetGPUs → bounded validated sole GPU → GetPerformanceMonitoringServices → GetSupportedGPUMetrics → IsSupportedGPUTemperature. Only explicit successful true permits **at most one** GetCurrentGPUMetrics, then only GPUTemperature and TimeStamp. Explicit false stops without current metrics; a failed support call remains a failure, not false support. Release required references, terminate and unload only when permitted by the verified lifecycle.

No generic dispatcher, caller-selected method, history/tracking/recording/sampling setter, tuning/fan/clock/voltage/power/display setter, driver-update API, bus/I²C, CPU/fan/utilization/power/clock metric. No direct firmware/EC/MSR/SMU/SMBus/PCI/register/private IOCTL path. This is a future fixed call allowlist, not a claim about unobserved runtime internals.

## 12. Temperature semantics and numeric admission

Pinned IPerformanceMonitoring defines GPUTemperature as average GPU die-edge temperature in Celsius, delivered through double output with a separate status. Hotspot and intake are distinct getters; CPU package/APU GFX cannot substitute. API success is not physical measurement validation.

Future admission must require success, finite output, verified attribution and capability, and a reviewed experimental plausibility envelope. No universal invalid sentinel or zero rule was established. Do not call zero intrinsically valid/invalid or import D3DKMT's integer policy. No envelope is implemented here; selecting one requires explicit documented policy, never an AMD limit claim. Reject/qualify uncertain numbers, never clamp, smooth or synthesize them. No candidate was acquired.

## 13. Timestamp and freshness

Pinned TimeStamp describes sample acquisition duration in milliseconds from system epoch. It does not identify a verified correspondence to Unix milliseconds, Windows FILETIME or another caller clock. No trustworthy field-level sample-age calculation is established for this driver. Freshness therefore remains unresolved, not stale or fresh by assertion. Measure completed native-stage elapsed time separately using a monotonic clock; query duration is not sample age.

Future tests must distinguish getter failure/absent/zero time, future values, wrong clock basis, wall-clock changes, stale data and arithmetic overflow/underflow. Only after clock correspondence is verified may an experimental maximum age be applied, clearly separated from AMD guarantees. No polling or second acquisition to compensate. Unresolved freshness blocks production live telemetry.

## 14. Error categories and bounded output — design only

No executable/exit codes exist. A future fixed schema must include experimental banner, version/compiled commit, contract/runtime status, stage, selection, explicit support result, optional qualified edge °C candidate, timestamp/clock confidence, completed stage durations, separate cleanup/termination and sanitized failure category, plus production-unchanged statement.

Keep runtime absent/unsupported/invalid export/version, initialization failure, null interface/invalid status, enumeration failure, no compatible GPU, ambiguous selection, explicit unsupported temperature, support-check failure, current-metrics failure, getter failure, invalid numeric result, absent/unresolved timestamp and cleanup failure distinct. A future zero exit may mean completed candidate only; nonzero admission/unavailable/unsupported/API/invalid/cleanup categories must be fixed before implementation. Never label a blocked deliverable as a successful probe.

No IDs, device paths, LUIDs, serials, usernames, full driver/registry/model inventories, arbitrary SDK errors, structures, unrelated metrics or persistent logs. Sanitized runtime metadata only; no installation path output.

## 15. Native blocking and admission risks

Future CLI accepts exact --help or --run-once only; no arguments/unknown/extra/non-Windows invocation cannot initialize ADLX. One foreground synchronous owner, no background thread/service, polling, history, retries, relaunch or stress. A reviewed local-session guard may reject occupied/abandoned admission; a vanished guard cannot authorize recovery after a crash or stall. No privileged object/ACL changes.

Vendor calls may block. No documented native cancellation/hard timeout was established. Record elapsed time only after each stage returns; an optional reviewed cumulative budget can skip the next stage, not cancel an outstanding call. Never abandon work, force-close resources, spawn replacement workers or claim process killing as safe cleanup. A stall stops physical testing and leaves normal system recovery to the user outside this tool.

## 16. Resource ownership and termination

No resources are acquired here; cleanup is **not applicable**, not verified successful. Future owner must retain library/initialization/system/list/GPU/service/support/metrics lifetimes through every using call. Returned owned reference-counted interfaces need exactly one release attempt per owned reference on every returning path. VendorId/DeviceId buffers are borrowed, not separately freed. Do not assume the initialization-owned system interface has ordinary reference-count release semantics; complete that distinction from official lifecycle documentation before coding.

Release metrics/support/service/GPUs/list before termination according to the verified ownership map; initialized runtime termination precedes unloading. Release returns a reference count, not an ADLX result—do not invent a boolean cleanup-success check. Model inconsistent reference outcomes and termination/unload errors separately, without blind cleanup retries. Failed/partial initialization needs its own verified cleanup contract. Single-thread ownership avoids cross-thread close races but cannot guarantee returning driver calls. Crash/forced exit/stall cannot be represented as successful cleanup.

## 17. Synthetic tests — not implemented

**New ADLX tests: 0.** No mock probe policy is built ahead of the licensing/API gates. Required future suite covers exact CLI/platform admission, concurrent/abandoned guards, trusted DLL/export/version failure, default-init/null/status failure, and no incompatible-driver fallback. Adapter fixtures must cover zero/one/multiple GPUs, external/discrete/wrong vendor, missing/unsupported properties, invalid count and duplicate/ambiguous identities.

Temperature tests must distinguish true/false/error support, metric/getter failures, finite/NaN/infinity/range/zero/sentinel/unit and hotspot-versus-edge semantics. Timestamp cases are in section 13. Lifecycle injection must cover successful and partial acquisition, enumeration/support/read failures, observable cleanup failure, exactly-once termination on applicable returning paths, no premature unload, no duplicate current metrics and no retry. No fixture substitutes for target behavior.

The existing six HWiNFO CLI tests remain independent. Their blocked-access behavior cannot verify ADLX ABI, selection, permissions, numeric semantics or cleanup.

## 18. Native ABI verification — not performed

No SDK code is compiled and no ABI fixture is fabricated. After license clearance, compare the actual implementation's declarations with exact official headers using Windows x64 MSVC compile-only checks: scalar/result/enum sizes, interface dispatch/layout and method signatures, cdecl exports/stdcall methods, bool output representation, string/ownership and initialization/termination contracts. Complete thread-affinity/concurrency/unload review first. Successful compilation would still not prove Valve-driver compatibility.

## 19. CI and validation scope

Only the exact Step 6B.5 branch is added to ordinary [Desktop CI](../../.github/workflows/ci.yml) push filters. No new ADLX job/artifact, no AMD DLL, no hardware invocation, no manual diagnostic trigger/ref change. Existing HWiNFO build-only job and production native Windows/macOS builds/manifests remain unchanged. There is no ADLX artifact to download or run; production installer artifacts are not ADLX diagnostics.

Required local validation: root format/typecheck/lint/frontend tests/bindings/Rust check/test/Clippy/build; JS/Rust inventories; existing standalone HWiNFO format/check/test/Clippy; documentation links/anchors, Markdown, diff/scope; both QAM output verifiers with normal output restored. Final native Windows/macOS CI and extracted installer-app/probe manifest checks must be inspected on the final SHA. Local results are recorded below; build/test evidence is never hardware evidence.

## 20. Manual physical acceptance — blocked and pending

**Do not execute now: no ADLX executable exists and licensing is unresolved.** This preparation requires cleared license/API/ABI/loading gates, reviewed source commit and matching artifact plus separate explicit user authorization. No substitute diagnostic, driver update, SDK install or elevated retry.

Future prerequisites: known LCD/Windows target above, unchanged installed Valve driver, ordinary non-administrator PowerShell, no external GPU, no remote/virtual session, no active game/stress, no changes to Steam Input/Steam Deck Tools, no sensor utility installation/configuration. No full inventories/identifiers or new discovery scan.

Only after those conditions and explicit approval, at most one foreground invocation:

```powershell
.\EXPERIMENTAL-ADLX-GPU-TEMPERATURE-PROBE-MANUAL-RUN-ONLY.exe --run-once
```

Record sanitized commit/artifact/version; ordinary-user context; runtime compatibility and reached stage; GPU selection; explicit support status; optional candidate °C; timestamp/freshness confidence; completed stage/acquisition timings; release/termination/unload outcome; unexpected prompts and Windows/Nepteer responsiveness. All are **not tested** now. Unsupported is useful evidence, not a reason to update drivers, change security settings, install components or retry elevated.

A stalled call or cleanup failure stops experiments. No second acquisition without separate review and deliberate user authorization; no repeated attempts after a stall. Do not claim a native cancellation/recovery mechanism. No CI or agent execution substitutes for this physical gate.

## 21. Production integration blockers

Unresolved applicable source/binary license, exact trusted runtime mechanism, complete ABI/lifetime/concurrency contracts, ordinary-user target compatibility and permissions, unambiguous device identity, valid numeric/sentinel policy, trustworthy clock/field freshness, latency/stall/cleanup behavior and physical acceptance. A plausible candidate would resolve none of these automatically.

Production would additionally require separately approved per-field provenance/freshness/admission architecture, partial-failure protection for battery, DTO/UI review and integration acceptance. Do not implement those concepts here. WindowsProvider/get_telemetry, capabilities, snapshot DTOs/bindings/mocks/dashboard/QAM/preferences, controller/HID/navigation/arming/reader, permissions/CSP, installer identity/privileges, packaging, production dependencies and manual Slow Refresh authorization remain unchanged. No new driver/service/helper or external monitor requirement. CPU/fan stay deferred.

## 22. Recommended next decision

Accept the **Outcome B research deliverable**, with technical/physical ADLX feasibility still unknown. Resolve the root-agreement versus official Rust MIT scope, including header-only ABI use and intended public source/executable distribution, through scoped authoritative clarification. The user may supply authorized clarification or separately authorize contact; Codex sends no messages. Then complete trusted-loading/lifecycle/ABI contracts and review a narrowly scoped implementation milestone. Physical execution remains a later separate decision. Do not bypass the blocker with copied third-party bindings, private interfaces or privileged access.

### Validation result record

Local checks passed: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (157 passed), `pnpm bindings:check`, `pnpm rust:check`, `pnpm rust:test` (74 passed, one intentionally ignored binding generator), `pnpm rust:lint`, `pnpm build:web`, both QAM output verifiers and `git diff --check`. Exact-true diagnostic output was verified, then false/normal output rebuilt and exclusion verified again.

JavaScript inventory parsed 10 license groups; Rust inventory parsed 459 packages. Existing HWiNFO standalone format/check/Clippy and six synthetic CLI tests passed. New ADLX tests: zero; ADLX ABI/build/manifest verification: not applicable, no implementation or artifact. No hardware path is exercised by these tests.

All 65 local documentation links/anchors in changed Markdown resolved. Prettier checked Markdown; workflow YAML parsed with existing jobs preserved. Scope audit confirmed exactly nine authorized files and only one exact CI branch-filter addition; historical decisions/evidence, manual workflow, all production/runtime/dependency/permission/manifest files remain unchanged. No SDK-derived material is committed. No ADLX hardware query, SDK execution or Step 6B.2 import occurred.

Final-commit native Windows/macOS CI, installer output and extracted app/HWiNFO manifest verification are awaited after push, not claimed passed locally. Final commit/run links belong in the delivery report to avoid self-referential commit metadata.
