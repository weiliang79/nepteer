# Read-only safety boundary

Step 2 adds standard-user Windows reads to the completed foundation. `get_telemetry` remains the only IPC command. It reads `GetSystemPowerStatus` and the two non-unique manufacturer/model fields of local `Win32_ComputerSystem`. There are no hardware writes, drivers, privileged helpers, game hooks, input injection, HID feature reports, overlays, shell execution or Steam Deck Tools dependencies. Nepteer does not install a service; WMI uses Windows' existing infrastructure.

Windows selects live reads by default. Mock mode requires deliberate Settings selection and is labeled MOCK DATA, with simulated device labels and sample values. It resets to Automatic at restart. API or WMI failure never selects mock. Null/unknown/error/no-battery are distinct from valid zero. Native CPU/GPU temperatures and fan RPM remain unsupported. Provider capabilities describe implemented read paths, not hardware detection or a successful current reading.

The only WMI query is `SELECT Manufacturer, Model FROM Win32_ComputerSystem`. No unique hardware identifiers, serials, UUIDs, hostnames or user identities are requested. Device/battery readings are not persisted or logged by application code. Arbitrary WMI error text is discarded; diagnostics use fixed text and numeric Windows power API errors. LCD/OLED identification remains unverified. No privileged namespace, remote connection or WMI write/method API is used. WMI connections stay on their request worker.

There is no timer, subscription or subprocess polling. A startup request, deliberate refresh or provider change reads a snapshot. The UI disables refresh/provider changes while a request is pending. A stalled OS/WMI query can delay a snapshot; the synchronous WMI library has no cancellation/deadline and runs off the UI thread. No claim of real-time sensing or OS accuracy is made. Battery charge state is interpreted conservatively as documented in ARCHITECTURE.md.

The Windows installer remains per-user, unsigned, and skips WebView2 installation. The application/test manifest explicitly requests `asInvoker` and `uiAccess=false`; CI extracts/checks the built executable. An existing supported Microsoft WebView2 runtime is required. Do not bypass UAC, signing, SmartScreen or antivirus. Stop manual testing if unexpected elevation occurs.

No Steam Deck Tools source was copied, translated or bundled. Future sensors and any write-oriented controls require independent research, explicit scope approval, and hardware validation. No such controls are part of v0.2.0-alpha.

The user reported all eight Step 1 Windows Deck smoke tests passed. This is historical foundation evidence; it does not validate Step 2 battery/device reads. Native Windows CI verifies builds, contracts and synthetic conversions, while new hardware verification remains pending until the Step 2 checklist is completed on Windows 11 Steam Deck LCD.
