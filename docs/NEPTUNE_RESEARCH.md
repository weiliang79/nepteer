# Neptune protocol evidence · Step 5A

Reviewed 2026-11-21. Step 4 passed user-reported hardware checks after merge `fdafc925451d2ae2753e54ad6b188d9b728c2bbd`. **No actual Windows report ID, observed length, report fixture or physical button correlation was supplied for Step 5A.** Published candidates are implemented offline; no physical input mapping or framing is verified. CI and synthetic tests cannot change this status.

## Primary references and licensing

The immutable SDL reference revision is [`28736f296913b3f54d31cf404a82683ab2ad3a78`](https://github.com/libsdl-org/SDL/commit/28736f296913b3f54d31cf404a82683ab2ad3a78):

- [Valve-authored protocol structures](https://github.com/libsdl-org/SDL/blob/28736f296913b3f54d31cf404a82683ab2ad3a78/src/joystick/hidapi/steam/controller_structs.h#L233): version/message definitions, packed header, packet counter and button word layout. The Deck packet follows a four-byte header and four-byte counter.
- [Independent SDL Steam Deck driver](https://github.com/libsdl-org/SDL/blob/28736f296913b3f54d31cf404a82683ab2ad3a78/src/joystick/hidapi/SDL_hidapi_steamdeck.c#L42): named button masks; its input validation accepts 64 bytes, version 1, Deck message type 9 and declared length 64. The QAM mask is in the high 32-bit half. Its nominal cadence comment is approximately 4 ms, not a Windows passive-reader guarantee.
- [Valve vendor/product definitions](https://github.com/libsdl-org/SDL/blob/28736f296913b3f54d31cf404a82683ab2ad3a78/src/joystick/hidapi/steam/controller_constants.h#L28): candidate vendor 0x28DE and Jupiter product 0x1205. Shared IDs do not identify a collection or protocol by themselves.
- [Microsoft: obtaining HID reports](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/obtaining-hid-reports): continuous input through ReadFile, with cautions against continuously stimulating HidD_GetInputReport.
- [Microsoft: HIDP_CAPS](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/hidpi/ns-hidpi-_hidp_caps): descriptor input length includes a report-ID byte, zero for unnumbered reports. This motivates a **proposed** zero-prefixed candidate; it does not prove Nepteer's bytes use that framing.
- [Microsoft: interpreting HID reports](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/interpreting-hid-reports): descriptor-based usage interpretation. A vendor-defined byte array does not independently establish physical button semantics.

SDL publishes the referenced files under the Zlib license, with Valve Corporation (2020/2021) and Max Maisel (2023) notices. Nepteer's parser is an original safe slice-based implementation of factual offsets/masks and a new transition model, not a mechanical translation of SDL driver logic. Attribution and the upstream notice are retained in THIRD_PARTY_NOTICES.md. SDL is not a linked dependency and its feature/configuration, Lizard Mode, sensor, watchdog, rumble and event-injection logic is not incorporated. No Steam Deck Tools source was consulted, copied or translated. No new package or runtime DLL is introduced.

## Candidate identities and implementation

Offsets below are zero-based from the candidate **message**, excluding any proposed Windows report-ID prefix:

| Field                                                    | Evidence source                                            | Implementation status                                                                 | Hardware verified? |
| -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| HID report ID                                            | Microsoft length convention; actual Windows ID unknown     | Proposed zero byte only for 65-byte candidate; bare message ID stays unknown          | No                 |
| Message identity                                         | SDL header/message definitions and driver input validation | Candidate version LE u16 = 1, type = 0x09 at byte 2, declared length = 0x40 at byte 3 | No                 |
| Framing                                                  | SDL reads 64 bytes; Windows convention above               | Candidate bare 64-byte message, or exactly 65 bytes with leading zero + message       | No                 |
| Button word                                              | SDL packed header + counter + Deck button word             | Candidate LE u64 at message bytes 8–15 (9–16 with prefix)                             | No                 |
| A/B/X/Y                                                  | SDL low-word named masks                                   | Candidate bit indices 7/5/6/4; simulated states only                                  | No                 |
| D-pad U/D/L/R                                            | SDL low-word named masks                                   | Candidate bit indices 8/11/10/9; simulated states only                                | No                 |
| L1/R1                                                    | SDL low-word shoulder masks                                | Candidate bit indices 3/2; simulated states only                                      | No                 |
| Steam                                                    | SDL low-word Steam mask                                    | Candidate bit 13; simulated state only                                                | No                 |
| ⋯                                                        | SDL high-word QAM mask                                     | Candidate full-word bit 50 (high-word bit 18); simulated state only                   | No                 |
| Digital triggers, rear, stick clicks and trackpad events | Further SDL masks exist                                    | Deferred; no Phase 2 parser support or states                                         | No                 |

The supported **candidate** identifiers are `deck_v1_bare64` and `deck_v1_zero_prefixed65`. Type 0x09 is not a HID report ID; version byte 0x01 is not reported as one. Unknown prefixes/versions/types do not become a compatible variant. Recognizable truncated/oversized/incorrect-declared-length packets are malformed, not complete states. The parser never scans arbitrary offsets for an apparent header. It reads no analog coordinates, trigger values or motion data and assumes no unverified reserved-byte constants.

No partial layout, alternate report ID, BLE, Triton, other controller or arbitrary HID format is supported. Exact input size/header and little-endian interpretation are candidate rules, not evidence of compatibility. Valid zero means released for a supported simulated control; unsupported fields remain null. Repeated held states create no duplicate transitions. Initial valid state creates a baseline without historical presses.

## Evidence levels and runtime policy

1. **Candidate (Level 1):** published format facts plus synthetic tests. A native packet matching these rules increments candidate counts and shows safe identity fields, but never promotes evidence.
2. **framing_verified (Level 2):** independently observed Windows framing from the selected collection matches identity, descriptor length, actual length and invariants over repeated tests. No such evidence is available here. This would still not validate a physical control bit.
3. **button_verified (Level 3):** each specific physical control is independently correlated with repeatable press/release observations, with no unrelated transitions and simultaneous-button checks. No controls meet this level here.

This build has no physical allowlist, promotion command, environment toggle or automatic verification path. Both hardware verification flags remain false; native button states remain unavailable and native transitions empty. Explicit simulation can decode Phase 1 candidates through the same parser with SIMULATED INPUT and per-control simulated labels. Its observations never count as physical verification. All history is memory-only, capped at 32, and cleared on stop/error/disconnect/expiry or a format/session reset. Malformed input cannot generate releases; unknown formats reset the baseline. Four-Hz summary IPC does not export raw bytes.

## Interface/report-generation uncertainties

The physical composite device can expose mouse, keyboard and vendor-defined collections. Matching VID/PID, an eligible descriptor, successful shared open and actual received input are distinct milestones. The existing native path considers confirmed vendor-defined candidate collections only; it never silently switches to a mouse/keyboard/virtual Xbox interface. Windows metadata/read access can fail or stay silent while Steam Input or another tool is running.

SDL's full driver changes reporting/device settings; Nepteer performs none of those operations. Its published rate/counter comments do not establish whether a passive Windows collection reports continuously, only on changes, or not at all. Neither counter advancement nor button interpretation is used as an invariant. Hardware tests must compare idle and one-control activity with Steam Input left enabled and report safe counts/lengths. A timeout is not a release or permission for takeover. No special reporting mode or watchdog is enabled.

## Phase B: missing evidence and proposed local correlation method

WINDOWS_TESTING.md describes what the current build can safely observe: selected collection metadata, candidate ID/length/type, counters, recognition/error state, idle/activity cadence and normal controller coexistence. Users must not share raw streams, serials or full paths. Current native button states are intentionally unavailable, so this build alone cannot establish Level 3.

After Level 2 review, a separately reviewed **explicit, local verification probe** is proposed (not implemented in Step 5A). The user would choose one claimed physical control, consent to a <=30-second bounded memory-only run, release all controls, then press/hold/release it five times. The worker would evaluate only the nominated published mask plus aggregate unrelated-bit changes, discard bytes immediately, and show counts of baseline/press/release/repeat/unrelated changes, without displaying/exporting raw values or storing reports. Abort/stop/disconnect clears the probe. Observations would be labeled unverified test results, never live physical states or OS input.

Repeat independently per Phase 1 control, include idle/no-input trials, then simultaneous pairs and hold/release ordering, checking zero unrelated false transitions. Record safe interface usage/length/framing, build revision, Steam state and aggregate outcomes; have the user/developer review the evidence. Only then may a follow-up allowlist enable that exact verified control for the validated format/interface, with fresh-session baselines and no QAM action. Missing/nonmatching framing, noisy or incomplete correlations remain unsupported. This proposal is not an unrestricted byte inspector, raw export, logging mode or permission to reconfigure Steam Input. Step 5B still needs physical framing and individual button evidence before any controller-driven QAM work can be considered.

## Native implementation retained from Step 4

Use existing windows-sys 0.61.2 (MIT OR Apache-2.0) for SetupAPI/HID metadata and overlapped ReadFile. Metadata opens request access zero; input opens request GENERIC_READ with FILE_SHARE_READ|FILE_SHARE_WRITE. Paths stay private in memory behind scan-local IDs; no serial/instance property API is queried. Keyboard/mouse/unknown metadata stays discovery-only. CancelIoEx completes before pending storage/handles are freed; a misbehaving kernel driver can delay cancellation. No exclusive or write fallback exists.

The maintained hidapi library was considered in Step 4, but general enumeration collects serial/instance metadata and normal Windows open requests read/write access; neither is needed here. No hidapi/libusb/SDL DLL or driver is packaged. Windows supplies hid.dll, setupapi.dll and kernel32.dll. Existing WebView2 is still required. Shared access does not guarantee nondisruption; retain manual Steam Input coexistence and lifecycle tests without changing drivers, disabling devices, elevation or internal hardware modifications.
