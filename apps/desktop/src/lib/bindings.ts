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
export type MonitorPhase = "stopped" | "starting" | "awaiting_reports" | "raw_input_only" | "simulated_input" | "access_denied" | "device_busy" | "disconnected" | "unsupported_report_format" | "read_error";
export type InputErrorKind = "enumeration" | "metadata_unavailable" | "access_denied" | "device_busy" | "disconnected" | "unsupported_interface" | "unsupported_platform" | "unsupported_report_format" | "read_error" | "session_limit" | "internal";
export type InputFailure = { kind: InputErrorKind, message: string, };
export type InputCapabilities = { passiveReadEligible: boolean, buttonDecoding: boolean, };
export type Candidate = { id: string, vendorId: number, productId: number, usagePage: number | null, usage: number | null, interfaceNumber: number | null, manufacturer: string | null, product: string | null, attributesVerified: boolean, inputReportLength: number | null, capabilities: InputCapabilities, issue: InputFailure | null, };
export type ControllerControl = "steam" | "quick_access" | "a" | "b" | "x" | "y" | "dpad_up" | "dpad_down" | "dpad_left" | "dpad_right" | "l1" | "r1" | "l2" | "r2" | "l4" | "l5" | "r4" | "r5" | "left_stick_click" | "right_stick_click" | "left_trackpad_touch" | "right_trackpad_touch" | "left_trackpad_click" | "right_trackpad_click";
export type ReportFormat = "deck_v1_bare64" | "deck_v1_zero_prefixed65";
export type ReportRecognition = "not_observed" | "candidate" | "unsupported" | "malformed";
export type ParseIssue = "unsupported_prefix" | "unsupported_version" | "unsupported_message" | "truncated" | "oversized" | "invalid_declared_length";
export type MappingVerification = "unavailable" | "candidate" | "simulated" | "button_verified";
export type ReportDiagnostics = { recognition: ReportRecognition, format: ReportFormat | null,
/**
 * Zero only for the matching zero-prefixed candidate; bare message has no identified HID ID.
 */
reportId: number | null, messageType: number | null, framingVerified: boolean, physicalButtonsVerified: boolean, candidateReportCount: number, unsupportedReportCount: number, malformedReportCount: number, lastIssue: ParseIssue | null, };
export type ControlObservation = { control: ControllerControl, pressed: boolean | null, verification: MappingVerification, };
export type ButtonTransition = { sequence: number, atSessionMs: number, source: InputSource, control: ControllerControl, pressed: boolean, };
export type MonitorStatus = { phase: MonitorPhase, sessionGeneration: number, candidateId: string | null, opened: boolean, reportCount: number, lastReportLength: number | null, lastReportAtUnixMs: number | null, issue: InputFailure | null, buttonDecodingSupported: boolean, report: ReportDiagnostics, controls: Array<ControlObservation>, transitions: Array<ButtonTransition>, };
export type DiagnosticsSnapshot = { probe: ProbeStatus, source: InputSource, discovery: DiscoveryPhase, candidates: Array<Candidate>, discoveryIssue: InputFailure | null, monitor: MonitorStatus, };
export type KnownState = "yes" | "no" | "unknown";
export type ToolsMode = "desktop" | "x360" | "other" | "unknown";
export type SteamInputState = "enabled" | "disabled" | "unknown";
export type ProbeEnvironment = { steamDeckToolsRunning: KnownState, steamDeckToolsMode: ToolsMode, steamRunning: KnownState, steamInput: SteamInputState, };
export type ProbeOutcome = "not_started" | "preparing" | "running" | "observed" | "inconclusive" | "aborted" | "error";
export type ProbePhase = "preparation" | "idle" | "press" | "hold" | "release" | "finalizing" | "done";
export type ProbeEndReason = "completed" | "baseline_missing" | "deadline" | "incomplete_evidence" | "framing_changed" | "user_aborted" | "monitoring_stopped" | "monitor_error" | "session_expired" | "rescan" | "shutdown";
export type ProbeCounts = { compatibleReports: number, incompatibleReports: number, malformedReports: number, baselineEstablished: boolean, observedPressEdges: number, observedReleaseEdges: number, expectedPressEdges: number, expectedReleaseEdges: number, repeatedHeldReports: number, missingPresses: number, missingReleases: number, idleTransitions: number, outsidePhaseEdges: number, earlyEdges: number, lateEdges: number, repeatedEdges: number, unrelatedKnownChanges: number, unknownBitChanges: number, reportGaps: number, completedCycles: number, finalReleased: boolean | null, framingChanged: boolean, };
export type ProbeInterface = { vendorId: number, productId: number, usagePage: number | null, usage: number | null, interfaceNumber: number | null, inputReportLength: number | null, };
export type ProbeSummary = { version: string, interface: ProbeInterface, format: ReportFormat, control: ControllerControl, candidateBit: number, environment: ProbeEnvironment, outcome: ProbeOutcome, reason: ProbeEndReason | null, elapsedMs: number, counts: ProbeCounts, };
export type ProbeStatus = {
/**
 * Ephemeral coordination values, deliberately excluded from Copy Safe Summary.
 */
token: number, revision: number, monitorGeneration: number, outcome: ProbeOutcome, phase: ProbePhase, cycle: number, remainingMs: number, summary: ProbeSummary | null, };
export type ProbeStartRequest = { expectedToken: number, monitorGeneration: number, candidateId: string, control: ControllerControl, environment: ProbeEnvironment, consent: boolean, };
