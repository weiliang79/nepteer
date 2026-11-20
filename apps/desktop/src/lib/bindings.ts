// Generated from Rust by `pnpm bindings`. Do not edit.
export type DataSource = "mock" | "windows" | "unsupported";
export type ChargeState = "charging" | "discharging" | "full" | "unknown";
export type Percent = number;
export type Celsius = number;
export type Rpm = number;
export type Capabilities = { battery: boolean, cpuTemperature: boolean, gpuTemperature: boolean, fanRpm: boolean, hardwareControls: boolean, };
export type Device = { model: string, platform: string, hostPlatform: string, };
export type Snapshot = { source: DataSource,
/**
 * Retrieval time, not the time of a physical sensor measurement.
 */
capturedAtUnixMs: number, device: Device, capabilities: Capabilities, batteryPercent: Percent | null, chargeState: ChargeState, cpuTemperatureCelsius: Celsius | null, gpuTemperatureCelsius: Celsius | null, fanRpm: Rpm | null, };
