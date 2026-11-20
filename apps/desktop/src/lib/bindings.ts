// Generated from Rust by `pnpm bindings`. Do not edit.
export type DataSource = "mock" | "windows" | "unsupported";
export type ChargeState = "charging" | "discharging" | "full" | "unknown";
export type ProviderMode = "auto" | "mock";
export type BatteryStatus = "available" | "unknown" | "no_battery" | "error";
export type Percent = number;
export type Celsius = number;
export type Rpm = number;
export type Capabilities = { battery: boolean, cpuTemperature: boolean, gpuTemperature: boolean, fanRpm: boolean, hardwareControls: boolean, };
export type Device = { manufacturer: string | null, model: string | null, platform: string, hostPlatform: string, };
export type Snapshot = { source: DataSource,
/**
 * Retrieval time, not the time of a physical sensor measurement.
 */
capturedAtUnixMs: number, device: Device, capabilities: Capabilities, batteryPercent: Percent | null, chargeState: ChargeState, batteryStatus: BatteryStatus,
/**
 * Sanitized, non-identifying diagnostics for partial read failures.
 */
issues: Array<string>, cpuTemperatureCelsius: Celsius | null, gpuTemperatureCelsius: Celsius | null, fanRpm: Rpm | null, };
export type Status = { visible: boolean, shortcutAvailable: boolean, shortcutHint: string, notice: string | null, };
export type DiagnosticsMode = "native" | "simulated";
export type InputSource = "windows" | "simulated" | "unsupported";
export type DiscoveryPhase = "not_scanned" | "scanning" | "candidates" | "not_found" | "unsupported" | "error";
export type MonitorPhase = "stopped" | "starting" | "awaiting_reports" | "raw_input_only" | "access_denied" | "device_busy" | "disconnected" | "unsupported_report_format" | "read_error";
export type InputErrorKind = "enumeration" | "metadata_unavailable" | "access_denied" | "device_busy" | "disconnected" | "unsupported_interface" | "unsupported_platform" | "unsupported_report_format" | "read_error" | "session_limit" | "internal";
export type InputFailure = { kind: InputErrorKind, message: string, };
export type InputCapabilities = { passiveReadEligible: boolean, buttonDecoding: boolean, };
export type Candidate = { id: string, vendorId: number, productId: number, usagePage: number | null, usage: number | null, interfaceNumber: number | null, manufacturer: string | null, product: string | null, attributesVerified: boolean, inputReportLength: number | null, capabilities: InputCapabilities, issue: InputFailure | null, };
export type ControllerControl = "steam" | "quick_access" | "a" | "b" | "x" | "y" | "dpad_up" | "dpad_down" | "dpad_left" | "dpad_right" | "l1" | "r1" | "l2" | "r2" | "l4" | "l5" | "r4" | "r5" | "left_stick_click" | "right_stick_click" | "left_trackpad_touch" | "right_trackpad_touch" | "left_trackpad_click" | "right_trackpad_click";
export type ControlObservation = { control: ControllerControl, pressed: boolean | null, };
export type ButtonTransition = { control: ControllerControl, pressed: boolean, };
export type MonitorStatus = { phase: MonitorPhase, candidateId: string | null, opened: boolean, reportCount: number, lastReportLength: number | null, lastReportAtUnixMs: number | null, issue: InputFailure | null, buttonDecodingSupported: boolean, controls: Array<ControlObservation>, transitions: Array<ButtonTransition>, };
export type DiagnosticsSnapshot = { source: InputSource, discovery: DiscoveryPhase, candidates: Array<Candidate>, discoveryIssue: InputFailure | null, monitor: MonitorStatus, };
