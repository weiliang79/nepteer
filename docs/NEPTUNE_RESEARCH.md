# Neptune read-only discovery research · Step 4

Reviewed 2026-11-20. This milestone has no observed Windows Steam Deck report fixture. VID 0x28DE / PID 0x1205 is a candidate filter supplied by the project scope and corroborated by public upstream Steam Deck support; it does not prove any particular HID collection is readable or report-compatible.

## Selected implementation

Use native Windows APIs through the **existing windows-sys 0.61.2 dependency (MIT OR Apache-2.0)**, behind cfg(windows): SetupDiGetClassDevsW/SetupDiEnumDeviceInterfaces/SetupDiGetDeviceInterfaceDetailW, HidD_GetAttributes, HidD_GetPreparsedData/HidP_GetCaps, manufacturer/product string queries, CreateFileW and overlapped ReadFile/CancelIoEx. The session-private path is necessary to open the selected interface but is never returned, logged or persisted. No instance-ID property or serial-number API is used. Only safe bounded metadata reaches Rust DTOs. Metadata opens request access zero; input opens request GENERIC_READ and FILE_SHARE_READ|FILE_SHARE_WRITE. Standard-user denial is terminal, with no exclusive/write fallback.

Primary references:

- [Microsoft: opening HID collections](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/opening-hid-collections) distinguishes discovery/query access from input/output access and notes system-owned keyboard/mouse restrictions.
- [Microsoft: obtaining HID reports](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/obtaining-hid-reports) describes ReadFile for continuous input and cautions against continuously using HidD_GetInputReport. Nepteer uses no feature/input-report control query to stimulate reports.
- [CreateFileW access and sharing](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew) documents access zero for metadata and shared read/write opens. Shared access permits coexistence but does not guarantee another program/driver permits reading or that input delivery will be nondisruptive.
- [HIDP_CAPS](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/hidpi/ns-hidpi-_hidp_caps) supplies usage and descriptor input length, not an application protocol guarantee.
- [CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex) requires retaining pending request storage until completion. The worker drains cancellation before dropping buffers/handles. Driver misbehavior can delay this; the application does not free in-flight storage or kill the worker.

The maintained [hidapi Rust crate](https://docs.rs/hidapi/2.6.7/hidapi/) and [upstream Windows backend](https://github.com/libusb/hidapi/blob/master/windows/hid.c) were investigated. Its general-purpose enumeration includes serial/instance metadata and its normal Windows device open requests read/write access (with fallbacks). A narrowly scoped native implementation avoids collecting those fields or introducing write-capable opening behavior. No hidapi code is incorporated, no new HID crate is added, and no libusb/hidapi runtime DLL or driver is required. Windows supplies hid.dll, setupapi.dll and kernel32.dll; WebView2 remains the existing application runtime requirement.

## Report-format evidence and deliberate limit

Public independent upstream references include SDL's [Steam Deck HID driver](https://github.com/libsdl-org/SDL/blob/main/src/joystick/hidapi/SDL_hidapi_steamdeck.c) and [controller protocol structures](https://github.com/libsdl-org/SDL/blob/main/src/joystick/hidapi/steam/controller_structs.h). These publish a Steam Deck report family, including button fields, under SDL's Zlib license with upstream notices. The full SDL driver also performs configuration/feature operations that are outside Nepteer's scope. No SDL implementation or structure definitions were copied or mechanically translated into Nepteer, and no SDL dependency is shipped.

A published report family is not evidence that a passively opened Windows collection provides the same framing/report ID, byte length or state semantics while Steam Input owns the device. Step 4 does not enable reporting or disable Lizard Mode, and it has no observed Windows report fixture to validate such assumptions. **No report format or individual control is confirmed for Nepteer yet.** Length is summarized and checked only for valid bounded input, not used to select a parser. Unknown contents remain raw_input_only. Zero-length/oversize transport results terminate as unsupported/disconnected as appropriate. All Steam/⋯, face, D-pad, shoulder, trigger, rear, stick and trackpad controls remain unavailable, with no held state or transitions generated.

Synthetic test reports (64/65 bytes) test length bounds and lifecycle only; they are not Neptune protocol fixtures. Raw input bytes never cross IPC or go to disk. Hardware testing should first record safe metadata, counts/lengths, readable versus silent state and coexistence outcomes. Any later parser work needs independently verified format/framing and synthetic fixtures that prove semantics without recording a private input stream. Steam Deck Tools source was not consulted, copied or translated.

## Expected outcomes requiring Windows tests

A candidate can be visible but discovery-only, eligible but access-denied/busy, open but silent, or actively returning uninterpreted input. Multiple same-VID/PID collections are normal and remain separately selectable; the first one is never chosen automatically. Native scans do not include virtual Xbox controllers as substitutes. A conservative USB path prefilter can miss alternate transports; an honest not-found result is preferable to opening unrelated devices.

Steam running, absent or another controller tool holding access may change behavior. No universal simultaneous-access guarantee is made. If input stops working elsewhere, stop monitoring and record the result without changing drivers or taking ownership. The next session requires explicit Start or Rescan; no reconnect loop exists. See the Step 4 checklist in WINDOWS_TESTING.md.
