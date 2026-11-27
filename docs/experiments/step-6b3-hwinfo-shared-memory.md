# Step 6B.3 — HWiNFO shared-memory feasibility

Research date: 2026-11-27. **Interface blocked; no shared-memory access attempted.** Hardware acceptance remains pending. This is an isolated experiment, never production telemetry.

## 1. Authorization and repository provenance

Branch `experiment/hwinfo-shared-memory-feasibility` starts at verified latest main `82d16da561de11757b30f4f8d03b68e77b04f755`. Step 6B.1 merged as [PR #13](https://github.com/weiliang79/nepteer/pull/13); [post-merge Desktop CI](https://github.com/weiliang79/nepteer/actions/runs/45937693567) succeeded on that exact SHA. Fetch confirmed Step 6B.2 commit `f8d4581aa8b5c8896a2adf28e2c029cdcaf3d810` remains outside main. No cherry-pick or merge of that experiment occurred. Its [procedure at its own commit](https://github.com/weiliang79/nepteer/blob/f8d4581aa8b5c8896a2adf28e2c029cdcaf3d810/docs/experiments/step-6b2-d3dkmt-gpu-temperature.md) was reviewed as historical context only.

The [6B.1 decision](../decisions/step-6b1-windows-sensor-feasibility.md), production null CPU/GPU/fan, false sensor/control capabilities, mock, DTOs, bindings, permissions, controller/HID, QAM, preferences, installer identity and runtime versions remain unchanged. This user request supersedes the older research-only restriction solely for this isolated experiment. Commit/push is authorized; merging and physical execution are not.

## 2. User-reported physical observations

These observations were supplied by the user; Codex has not independently verified them or read HWiNFO shared memory.

Target: Steam Deck LCD / Valve Jupiter / AMD Custom APU 0405; Windows 11 26H2, build 26300.9974. Display driver: Advanced Micro Devices, Inc., 31.0.21020.1014, June 9, 2023, WDDM 3.1. HWiNFO64 v8.60 required administrator privileges to start.

| HWiNFO sensor group                | Label           | Observed candidate |
| ---------------------------------- | --------------- | ------------------ |
| AMD Custom APU 0405: Enhanced      | CPU (Tctl/Tdie) | 48.0°C             |
| AMD Custom APU 0405: Enhanced      | CPU Core        | 47.8°C             |
| AMD Custom APU 0405: Enhanced      | CPU SoC         | 46.9°C             |
| AMD Custom APU 0405: Enhanced      | APU GFX         | 46.8°C             |
| AMD Radeon Vega                    | GPU Temperature | 48.6°C             |
| Valve Steam Deck EC: Valve Jupiter | Fan             | 4,607 RPM          |

Screenshots came from different moments: these are neither simultaneous samples nor calibrated measurements. Task Manager showed GPU temperature N/A. The earlier D3DKMT query reportedly succeeded with an indeterminate temperature. HWiNFO's historical GPU minimum of 1.0°C is suspicious; the fan's perceived acoustic behavior raised a question about approximately 4,600 RPM. Neither concern is resolved. Shared Memory Support was initially disabled; the user enabled it and restarted HWiNFO, after which the option remained enabled and numbers remained visible. This does not prove ordinary-user mapping access or Nepteer compatibility. HWiNFO's elevated acquisition mechanisms are not available to this consumer.

## 3. Official interface research and compatibility gate

Publisher references reviewed through the research browser:

| Source                                                                                                                                  | Finding and limitation                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Author's public-interface announcement](https://www.hwinfo.com/forum/threads/important-changes-to-hwinfo64-coming-soon.7092/page-5)    | Publisher permits consumers, including commercial applications, of shared memory with client HWiNFO 7.0 or later. This is separate from embedding the paid SDK.                                                         |
| [Author recommends the interface for smaller projects](https://www.hwinfo.com/forum/threads/interface-to-embedded-lcd-device.8966/)     | Refers readers to the official interface forum; sensors must be active.                                                                                                                                                 |
| [Official shared-memory interface forum](https://www.hwinfo.com/forum/forums/shared-memory-interface.13/)                               | HTTP 403 through the research browser and an approved direct HTTPS request. Full specification/header not obtained. This is an access limitation in this investigation, not a claim the publisher has no specification. |
| [Official V2 UTF-8 extension](https://www.hwinfo.com/forum/threads/shared-memory-interface-v2-extension-to-support-utf-8-strings.8462/) | HTTP 403; extension layout unavailable.                                                                                                                                                                                 |
| [Author's v7.33-4905 announcement](https://www.hwinfo.com/forum/threads/hwinfo-v7-33-4905-beta-released.8475/)                          | Confirms layout extension and UTF-8 additions. Does not provide enough fields to implement it.                                                                                                                          |
| [Author's signature discussion](https://www.hwinfo.com/forum/threads/typo-in-shared-memory-interface-data-daed-instead-of-dead.7618/)   | Discusses live versus terminated signature notation/endianness. Partial discussion is not a complete ABI or shutdown contract.                                                                                          |
| [Publisher version history](https://www.hwinfo.com/version-history/)                                                                    | Lists v8.60 released November 10, 2026 and the older UTF-8 extension. Product version alone does not establish shared-memory version or compatibility.                                                                  |

No community implementation, third-party header, viewer executable, reverse engineering or speculative offsets substitute for the unavailable authoritative contract. No publisher SDK/header/sample was downloaded or redistributed. The candidate `Global\HWiNFO_SENS_SM2` comes from the task's ecosystem lead; **it is not independently verified and is absent from executable code**.

| Required contract detail                                               | Result                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Mapping name and namespace                                             | Candidate only; unverified                                   |
| Live/terminated signature and exact binary representation              | Partial publisher discussion; no adopted constant            |
| Interface version, revision, header size, total mapping size           | Unverified                                                   |
| Sensor/reading offsets, strides, counts and alignment                  | Unverified                                                   |
| Sensor IDs, reading IDs, cross-references and type enumeration         | Unverified                                                   |
| String encoding, capacity, termination, original/custom labels         | UTF-8 extension documented to exist; exact layout unverified |
| Unit encodings and measurement semantics                               | Unverified                                                   |
| Global/per-reading timestamps, counter, polling period, validity       | Unverified                                                   |
| Synchronization/mutex name, rights, ownership and snapshot consistency | Unverified                                                   |
| Shutdown/expiry publication and retained-view behavior                 | Unverified for v8.60                                         |
| Supported interface version implemented here                           | **None**                                                     |

**Gate decision:** stop native access and parser implementation. Even a name-only access check would violate the requirement to use a final verified name/contract. No format fixture or guessed header is created. Binary parsing, snapshot consistency, cleanup and freshness tests cannot honestly pass before implementation exists.

## 4. Licensing and deployment assessment

The [actual publisher EULA](https://www.hwinfo.com/files/license.pdf), section 1, restricts modification/reverse engineering, requires explicit approval for third-party embedding/bundling, and prohibits tampering with feature limits or automating their circumvention. Its terms govern HWiNFO, not a grant to redistribute SDK code. No HWiNFO component is included here. The [license comparison](https://www.hwinfo.com/licenses/) permits personal/noncommercial use, requires appropriate Pro licensing for commercial environments, and states non-Pro sharing automatically deactivates after 12 hours and needs manual enabling again.

The author's public-interface announcement supports an independently written standalone consumer; a paid engine SDK is a different product ([SDK product page](https://www.hwinfo.com/sdk/), [author's licensing explanation](https://www.hwinfo.com/forum/threads/sdk.10694/)). No paid SDK is needed or authorized here. No license purchase, installation, automatic launch/restart, configuration change or expiry bypass occurs. Missing/expired publication must simply remain unavailable.

Conclusion: publisher statements support the intended independent reader, but no permission to redistribute an unseen header/SDK is assumed. Before future code publication, review exact acquired interface materials and their notices/redistribution terms. If those terms conflict with an open-source implementation, stop that part and seek publisher clarification. The current executable contains only original Nepteer code (no project-wide license has been selected), uses the Rust standard library, and adds no third-party dependencies. No claim of unrestricted HWiNFO redistribution or sensor accuracy is made.

## 5. Standalone diagnostic delivered

`tools/hwinfo-shared-memory-probe` has its own Cargo workspace/lockfile, no dependencies, no unsafe code and no Windows API bindings. It is outside the production workspace, normal installers and QAM diagnostic packaging. Native Windows x86_64 CI embeds and extracts an `asInvoker`, `uiAccess=false` manifest, runs only synthetic CLI tests, compiles and packages the standalone executable. Synthetic CLI tests invoke the blocked modes only to assert refusal; there is no native mapping implementation or hardware access in CI.

| Exact invocation                      | Current behavior                                                |
| ------------------------------------- | --------------------------------------------------------------- |
| `--help`                              | Describes blocked functionality; exit 0; no access              |
| `--check-access`                      | Windows x86_64: interface-blocked, access not-attempted; exit 3 |
| `--read-once`                         | Same blocker, no parser or candidate extraction; exit 3         |
| Either access mode on other hosts     | Unsupported platform; exit 4; no access                         |
| No arguments, unknown/extra arguments | Invalid arguments; exit 2; no access                            |

Arguments are not echoed; non-Unicode/private arguments fail without exposing their content. Only two arguments are retained to detect extras. Output is fixed and bounded. There is no network, disk log, clipboard, process inspection, retry, polling, thread, queue, service, driver, privileged helper or HWiNFO manipulation. Help does not access hardware or shared memory. A blocked exit does not establish mapping absence, ACL denial, publisher shutdown or expiry.

## 6. Future ordinary-user access design — not implemented

After acquiring the verified name and contract, use [OpenFileMappingW](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-openfilemappingw) with `FILE_MAP_READ` and inheritance false, then [MapViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile) with `FILE_MAP_READ`, offset zero and a bounded validated length. Never create a mapping. The [Windows access model](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping-security-and-access-rights) checks the publisher's object security descriptor; elevated publication does not establish ordinary-user access. `asInvoker` inherits the caller's token and cannot make an elevated parent ordinary: manual testing must start in non-administrator PowerShell.

No ACL/security-descriptor/ownership edits, debug privileges, process opens, duplicate-handle injection, elevation fallback, all-access/write/execute mapping rights or Tauri permission expansion. Check actual token elevation in a future access implementation if necessary to refuse elevated execution. A denied open is evidence, never a reason to retry with more privilege.

Future sanitized categories must distinguish not-found, access-denied, unsupported-version/incompatible, invalid/truncated/inconsistent, producer-unavailable, freshness-unresolved/stale, successful-read and other OS failure. An absent mapping alone cannot distinguish not-running, disabled sharing and expiry; report those as possible causes, not a diagnosis. No native access outcome has been observed here.

## 7. Parser and concurrency requirements — blocked

Adopt exact version/revision support only after review. Decode bounded owned byte snapshots with checked little-endian field reads; no borrowed typed reinterpretation of mutable shared pages. Proposed consumer caps are 256 groups, 4,096 readings, 4 MiB total inspected bytes, 256 bytes per string, three output categories and six allowlisted names. These are resource policy proposals, not ABI dimensions; reconcile them with the verified contract and fail closed if exceeded.

Validate positive supported counts/strides, checked multiplication/addition, mapping length, header and section bounds, alignment, non-overlap, entry sizes, relationships/IDs, original versus user labels, string terminators/encoding, type/unit consistency and finite values before output. Reject overflow, truncated entries, malformed strings, unsupported revisions and inconsistent relationships. Do not print arbitrary names while diagnosing failure.

No synchronization contract was established. Do not invent a mutex, timeout, sequence lock or claim that two identical copies prove atomicity/freshness. If documented synchronization requires a mutex, verify its exact name, minimal wait/release rights, bounded wait and abandoned-owner behavior, copy only while held, release before classification/formatting, and test every returning path. If a read-only consistent snapshot cannot be established, stop with unreliable data. A timeout alone does not resolve publication races. No native hard-timeout guarantee is claimed.

Required future binary fixtures: valid supported header; bad/live/dead signatures; unsupported versions/revisions; zero/overflow counts; bad strides; offsets/overlap/alignment; truncation; malformed encodings/termination; invalid cross-references; unsupported units; NaN/infinities; publication changes/shutdown during copy. These tests are **not implemented or counted** in the current blocked deliverable.

## 8. Sensor attribution and numeric rules — planned only

| Category | Exact proposed original group / reading         | Required semantics            | Shared-memory result |
| -------- | ----------------------------------------------- | ----------------------------- | -------------------- |
| CPU      | AMD Custom APU 0405: Enhanced / CPU (Tctl/Tdie) | Temperature in Celsius        | Unresolved, not read |
| GPU      | AMD Radeon Vega / GPU Temperature               | GPU temperature in Celsius    | Unresolved, not read |
| Fan      | Valve Steam Deck EC: Valve Jupiter / Fan        | Measured rotation rate in RPM | Unresolved, not read |

Use original published identity and verified type/unit semantics, not arbitrary substring matching or user-renamed labels. Actual strings/localization and IDs must be investigated on v8.60. Require exactly one matching source per category; duplicate groups/readings remain ambiguous, even if values agree. Do not persist IDs/indexes or select first/hottest readings. CPU Core/CPU SoC/APU GFX, voltage/power/utilization, GPU hotspot/memory temperature, PWM/percent/requested speed remain distinct and cannot substitute. A plausible label and RPM unit alone do not independently establish measured fan-speed semantics; source documentation remains a gate.

Proposed experimental plausibility policy: finite 5–110°C for CPU/GPU and finite 0–10,000 RPM for fan, with independently confirmed measured-speed semantics. These deliberately conservative consumer admission ranges are not calibration or hardware limits; the RPM ceiling is an experimental sanity cap pending rated-fan documentation. Preserve zero RPM. Reject negatives/non-finite/out-of-range values as invalid/inconclusive, never smooth or correct them. A 1°C current GPU sample would fail this policy; the screenshot's historical minimum does not prove the current sample invalid. Do not use load or controls to validate it.

Future statuses: candidate, unavailable, unsupported, invalid, ambiguous, stale/freshness-unresolved. No invalid value becomes telemetry. Classification/unit/ambiguity/range fixture tests remain pending with the parser, including similar wrong labels, duplicate sources, wrong groups/units, zero RPM, negatives and non-finite numbers.

## 9. Freshness, shutdown and expiry

No trustworthy timestamp semantics, per-reading validity, producer polling period or snapshot counter were obtained. All acquisition ages remain **unresolved**. Consumer wall time is not acquisition time; reading twice or matching HWiNFO's screen is not freshness proof. Global publication recency would not necessarily establish each sensor's age. Do not add polling to compensate.

Existing views may outlive producer handles; a mapping is not proof of a live publisher. Exact terminated signature, consistency and expiry behavior must come from the contract. Future consumers must reject documented dead/stale/inconsistent states, drop resources and report unavailable on absent publication on a later deliberate request. Do not reopen automatically, re-enable sharing, relaunch HWiNFO or bypass expiry. Prefer synthetic publisher-off/expiry tests; any real shutdown comparison needs separate deliberate user approval.

## 10. Cleanup and privacy

Current cleanup status is **not applicable**: no mapping handle/view/synchronization object is acquired. There is no implemented native RAII guarantee to claim. A future implementation must use ownership guards immediately after each successful acquisition, unmap views with [UnmapViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-unmapviewoffile), close handles, release acquired synchronization on all returning paths, and report cleanup failures honestly. Tests must inject open/map/wait/parse/copy/unmap/close/release failures and prove exactly-once cleanup without retries. OS process termination cleanup is not a successful explicit cleanup result.

Future output allowlist: interface/version/access status; the three approved candidate names/categories/units/values; freshness; sanitized error and cleanup categories. Never dump structures/inventories/unrelated names, serials, UUIDs, paths, user/computer/network/disk identity, raw errors or internal IDs. Inspect in memory only for one request; free source copies before returning. No persistent sensor log or raw export. Current executable prints fixed status text only.

## 11. Build, artifact and validation

```sh
cargo fmt --manifest-path tools/hwinfo-shared-memory-probe/Cargo.toml -- --check
cargo clippy --manifest-path tools/hwinfo-shared-memory-probe/Cargo.toml --all-targets --locked -- -D warnings
cargo test --manifest-path tools/hwinfo-shared-memory-probe/Cargo.toml --locked
```

On native Windows, also build with `--release --locked --target x86_64-pc-windows-msvc`. Ordinary Desktop CI includes a separate build/test/package job, never an access invocation. Artifact name starts `EXPERIMENTAL-HWINFO-SHARED-MEMORY-PROBE-MANUAL-RUN-ONLY`; it contains the executable, COMMIT.txt, this PROCEDURE.md, README.txt, LICENSE-STATUS.md, notices and dependency metadata. The artifact explicitly discloses that it cannot currently test mapping access. No SDK ABI comparison is possible without the header; no Windows API ABI assertions are needed for this implementation with no FFI.

Six synthetic CLI tests cover help, default refusal, blocked/unsupported results, exact-argument admission, private arguments and non-Unicode arguments. They do not simulate binary parsing, Windows mapping ACLs, producer lifecycle, sensors, freshness or RAII cleanup. Existing application checks/inventories and both QAM output verifiers remain required; normal output is restored afterward. Local checks passed: 157 frontend tests, 74 Rust tests (one explicitly ignored binding generator), binding drift, typecheck, lint, Rust check/Clippy, six standalone CLI tests/Clippy/format, both QAM output verifiers and normal web build. Both license inventories parsed (10 JavaScript license groups; 459 Rust packages); probe metadata lists only itself and no dependencies. Local Windows cross-check could not compile because the Windows standard library target is absent and rustup is unavailable; native compilation and extracted-manifest verification are delegated to Windows CI, not claimed locally. Final-commit native results/artifact links belong in the delivery report. Hardware is never accessed by CI.

## 12. Manual acceptance — all pending, physical modes blocked

Do not run this artifact expecting access evidence. Optional `--help` is informational only. The following is a future procedure, contingent on a reviewed verified implementation replacing the blocker; **it is not authorization to execute that future code**.

Prerequisites: LCD/Windows 11, HWiNFO64 v8.60 already user-managed/running, sharing deliberately enabled, readings visible, desktop with no active game; no driver, permission or configuration changes. Record source commit and ordinary-user context only, without identifiers.

- [ ] A: After contract/code review, deliberately choose one `EXPERIMENTAL-HWINFO-SHARED-MEMORY-PROBE-MANUAL-RUN-ONLY.exe --check-access` in ordinary non-administrator PowerShell. Record no UAC/elevation, minimum read-only access, supported header status and cleanup. Access denied is acceptable; no ACL edit/elevated retry. Current artifact returns blocked and cannot satisfy this item.
- [ ] B: Only after code review and **explicit user approval**, run that executable with exact `--read-once` once. Record CPU/GPU/fan candidate or unresolved status, exact allowed label/group/unit, attribution confidence, freshness and cleanup. No retry/polling. Current artifact cannot satisfy this item.
- [ ] C: Confirm Nepteer/Windows/HWiNFO responsive, no unexpected prompts/processes, driver/service installation, persistent sensor log, surviving background probe or sensor/control changes. Stop further experiments after a stall or unexpected behavior.
- [ ] D: Use synthetic failure/expiry tests first. Do not disable, restart or close HWiNFO automatically. Any manual publisher-off test needs separate user approval.
- [ ] E: Compare candidates to already visible HWiNFO values without generating load. Different acquisition times can cause differences. Large disagreement is inconclusive; agreement does not establish independent accuracy.

Sanitized record template: commit; manually known product/OS versions; ordinary-user yes/no; access outcome; interface/revision status; three category outcomes with allowed labels/units; freshness/age basis; cleanup; responsiveness; pass/fail/not-tested for A–E. No full screenshot/report or arbitrary sensor inventory is requested.

## 13. Blocker resolution and next milestone

Obtain the official shared-memory specification and current V2/UTF-8 extensions through an ordinary accessible publisher page or publisher-authorized materials. Request clarification of the v8.60 contract: mapping name, signature/version/revision, header and total size rules, offsets/strides/counts, all string/unit/type encodings, IDs/relationships, timestamps/validity, synchronization and shutdown/expiry. Review exact notices and permission for an original open-source reader before writing code. Do not contact the publisher or submit messages automatically; the user can choose to supply materials or authorize contact separately.

Then implement/review a bounded read-only standard-user access check, synthetic parser/lifecycle tests and native manifest verification before deliberate physical Test A. Test B stays separately approved. The 6B.3 research/blocker deliverable is reviewable; technical and physical feasibility remain unresolved.

Recommend a follow-up **interface-contract and ordinary-user access validation** milestone. An eventual optional HWiNFO provider is plausible but not justified for integration yet: it needs demonstrated ordinary-user Deck access, supported consistent parsing, unambiguous per-category attribution, freshness/staleness policy, expiry/shutdown handling, privacy, licensing and physical acceptance. HWiNFO remains a separate user-managed dependency with its own elevated acquisition and license constraints. No auto-launch, bundling, forced configuration, fallback acquisition or production capability change is authorized.
