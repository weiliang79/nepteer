use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DataSource {
    Mock,
    Windows,
    Unsupported,
}

#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ChargeState {
    Charging,
    Discharging,
    Full,
    Unknown,
}

// Private fields prevent construction without validation. Units serialize as numbers.
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(transparent)]
pub struct Percent(u8);
impl Percent {
    fn new(value: u8) -> Result<Self, String> {
        (value <= 100)
            .then_some(Self(value))
            .ok_or_else(|| "percentage exceeds 100".into())
    }
}

#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(transparent)]
pub struct Celsius(f32);
impl Celsius {
    fn new(value: f32) -> Result<Self, String> {
        (value.is_finite() && (-273.15..=200.0).contains(&value))
            .then_some(Self(value))
            .ok_or_else(|| "invalid temperature".into())
    }
}

#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(transparent)]
pub struct Rpm(u32);

#[derive(Debug, Clone, Serialize, TS, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    pub battery: bool,
    pub cpu_temperature: bool,
    pub gpu_temperature: bool,
    pub fan_rpm: bool,
    pub hardware_controls: bool,
}

#[derive(Debug, Clone, Serialize, TS, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub model: String,
    pub platform: String,
    pub host_platform: String,
}

#[derive(Debug, Clone, Serialize, TS, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub source: DataSource,
    /// Retrieval time, not the time of a physical sensor measurement.
    #[ts(type = "number")]
    pub captured_at_unix_ms: u64,
    pub device: Device,
    pub capabilities: Capabilities,
    pub battery_percent: Option<Percent>,
    pub charge_state: ChargeState,
    pub cpu_temperature_celsius: Option<Celsius>,
    pub gpu_temperature_celsius: Option<Celsius>,
    pub fan_rpm: Option<Rpm>,
}

pub trait TelemetryProvider: Send + Sync {
    fn snapshot(&self) -> Result<Snapshot, String>;
}

pub struct MockProvider;
impl TelemetryProvider for MockProvider {
    fn snapshot(&self) -> Result<Snapshot, String> {
        let elapsed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| "system clock precedes Unix epoch".to_string())?;
        Ok(Snapshot {
            source: DataSource::Mock,
            captured_at_unix_ms: u64::try_from(elapsed.as_millis())
                .map_err(|_| "timestamp exceeds supported range".to_string())?,
            device: Device {
                model: "Steam Deck LCD (simulated)".into(),
                platform: "Windows 11 (simulated)".into(),
                host_platform: std::env::consts::OS.into(),
            },
            capabilities: Capabilities {
                battery: true,
                cpu_temperature: true,
                gpu_temperature: false,
                fan_rpm: true,
                hardware_controls: false,
            },
            battery_percent: Some(Percent::new(78)?),
            charge_state: ChargeState::Discharging,
            cpu_temperature_celsius: Some(Celsius::new(54.0)?),
            gpu_temperature_celsius: None,
            fan_rpm: Some(Rpm(2800)),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn mock_is_stable_explicit_and_capability_aware() {
        let first = MockProvider.snapshot().unwrap();
        let mut second = MockProvider.snapshot().unwrap();
        second.captured_at_unix_ms = first.captured_at_unix_ms;
        assert_eq!(first, second);
        assert_eq!(first.source, DataSource::Mock);
        assert!(first.captured_at_unix_ms > 0);
        assert_eq!(first.battery_percent, Some(Percent(78)));
        assert_eq!(first.gpu_temperature_celsius, None);
        assert!(!first.capabilities.gpu_temperature);
        assert!(!first.capabilities.hardware_controls);
        let json = serde_json::to_value(first).unwrap();
        assert!(json["gpuTemperatureCelsius"].is_null());
        assert_eq!(json["fanRpm"], 2800);
        assert_eq!(json["source"], "mock");
    }
    #[test]
    fn units_validate_and_preserve_real_zero() {
        assert!(Percent::new(101).is_err());
        assert!(Celsius::new(f32::NAN).is_err());
        assert!(Celsius::new(f32::INFINITY).is_err());
        assert!(Celsius::new(-274.0).is_err());
        assert_eq!(Percent::new(0).unwrap(), Percent(0));
        assert_eq!(serde_json::to_value(Some(Rpm(0))).unwrap(), 0);
    }
    fn bindings_text() -> String {
        let declarations = [
            DataSource::decl(),
            ChargeState::decl(),
            Percent::decl(),
            Celsius::decl(),
            Rpm::decl(),
            Capabilities::decl(),
            Device::decl(),
            Snapshot::decl(),
        ];
        format!(
            "// Generated from Rust by `pnpm bindings`. Do not edit.\n{}\n",
            declarations
                .iter()
                .map(|s| format!(
                    "export {}",
                    s.lines().map(str::trim_end).collect::<Vec<_>>().join("\n")
                ))
                .collect::<Vec<_>>()
                .join("\n")
        )
    }

    fn bindings_path() -> std::path::PathBuf {
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../src/lib/bindings.ts")
    }

    #[test]
    fn bindings_are_current() {
        assert_eq!(
            std::fs::read_to_string(bindings_path()).expect("bindings must be committed"),
            bindings_text(),
            "Rust DTOs changed; run pnpm bindings locally"
        );
    }

    #[test]
    #[ignore = "explicit generator; run pnpm bindings"]
    fn export_bindings() {
        std::fs::write(bindings_path(), bindings_text()).unwrap();
    }
}
