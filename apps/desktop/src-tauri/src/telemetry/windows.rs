//! Documented Windows power data and non-identifying manufacturer/model only.
//! Conversion helpers also compile in macOS tests; native calls are Windows-only.
use super::*;

#[cfg(windows)]
pub struct WindowsProvider;

#[derive(Debug, Clone, Copy)]
struct PowerReading {
    ac: u8,
    flags: u8,
    percent: u8,
}

#[derive(Debug, Default)]
struct DeviceReading {
    manufacturer: Option<String>,
    model: Option<String>,
}

struct BatteryReading {
    percent: Option<Percent>,
    charge: ChargeState,
    status: BatteryStatus,
    issue: Option<String>,
}

fn convert_power(result: Result<PowerReading, u32>) -> BatteryReading {
    let raw = match result {
        Ok(raw) => raw,
        Err(code) => {
            return BatteryReading {
                percent: None,
                charge: ChargeState::Unknown,
                status: BatteryStatus::Error,
                issue: Some(format!(
                    "Battery: GetSystemPowerStatus failed (Windows error {code})."
                )),
            }
        }
    };
    // 255 is the unknown sentinel, NOT a bitmask (it includes the no-battery bit).
    if raw.flags != 255 && raw.flags & 128 != 0 {
        return BatteryReading {
            percent: None,
            charge: ChargeState::Unknown,
            status: BatteryStatus::NoBattery,
            issue: None,
        };
    }
    let percent = Percent::new(raw.percent).ok();
    let valid_flags = raw.flags != 255 && raw.flags & !(1 | 2 | 4 | 8) == 0;
    let charge = if !valid_flags {
        ChargeState::Unknown
    } else if raw.flags & 8 != 0 {
        ChargeState::Charging
    } else if raw.ac == 0 {
        ChargeState::Discharging
    } else if raw.ac == 1 && raw.percent == 100 {
        // GetSystemPowerStatus has no independent "full" flag.
        ChargeState::Full
    } else {
        // AC connected below 100% does not prove charging or discharging.
        ChargeState::Unknown
    };
    BatteryReading {
        percent,
        charge,
        status: if percent.is_some() {
            BatteryStatus::Available
        } else {
            BatteryStatus::Unknown
        },
        issue: if raw.percent > 100 && raw.percent != 255 {
            Some("Battery: Windows returned an invalid percentage.".into())
        } else if !valid_flags {
            Some("Battery: charging status is unknown.".into())
        } else {
            None
        },
    }
}

fn clean_identity(value: Option<String>) -> Option<String> {
    let value = value?.trim().to_owned();
    if value.is_empty()
        || matches!(
            value.to_ascii_lowercase().as_str(),
            "unknown"
                | "none"
                | "not specified"
                | "default string"
                | "to be filled by o.e.m."
                | "system manufacturer"
                | "system product name"
        )
    {
        None
    } else {
        Some(value)
    }
}

fn windows_snapshot(
    power: Result<PowerReading, u32>,
    identity: Result<DeviceReading, ()>,
) -> Result<Snapshot, String> {
    let battery = convert_power(power);
    let mut issues: Vec<String> = battery.issue.into_iter().collect();
    let device = match identity {
        Ok(value) => Device {
            manufacturer: clean_identity(value.manufacturer),
            model: clean_identity(value.model),
            platform: "Windows".into(),
            host_platform: "windows".into(),
        },
        Err(()) => {
            // Never expose arbitrary WMI errors which could contain machine/user identifiers.
            issues.push("Device: manufacturer/model query failed or returned no result.".into());
            Device {
                manufacturer: None,
                model: None,
                platform: "Windows".into(),
                host_platform: "windows".into(),
            }
        }
    };
    Ok(Snapshot {
        source: DataSource::Windows,
        captured_at_unix_ms: timestamp()?,
        device,
        capabilities: Capabilities {
            battery: true,
            cpu_temperature: false,
            gpu_temperature: false,
            fan_rpm: false,
            hardware_controls: false,
        },
        battery_percent: battery.percent,
        charge_state: battery.charge,
        battery_status: battery.status,
        issues,
        cpu_temperature_celsius: None,
        gpu_temperature_celsius: None,
        fan_rpm: None,
    })
}

#[cfg(windows)]
fn read_power() -> Result<PowerReading, u32> {
    use windows_sys::Win32::{
        Foundation::GetLastError,
        System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS},
    };
    let mut status = std::mem::MaybeUninit::<SYSTEM_POWER_STATUS>::uninit();
    // SAFETY: valid, aligned output pointer to the documented structure; read only after success.
    if unsafe { GetSystemPowerStatus(status.as_mut_ptr()) } == 0 {
        // SAFETY: called immediately after the failing Windows API on the same thread.
        return Err(unsafe { GetLastError() });
    }
    // SAFETY: GetSystemPowerStatus succeeded and initialized the structure.
    let status = unsafe { status.assume_init() };
    Ok(PowerReading {
        ac: status.ACLineStatus,
        flags: status.BatteryFlag,
        percent: status.BatteryLifePercent,
    })
}

#[cfg(windows)]
fn read_device() -> Result<DeviceReading, ()> {
    #[derive(Deserialize)]
    #[serde(rename_all = "PascalCase")]
    struct ComputerSystem {
        manufacturer: Option<String>,
        model: Option<String>,
    }
    // Local ROOT\CIMV2 only. SELECT exactly two non-unique fields, never SELECT *.
    // The connection is created, used and dropped on this request's blocking worker.
    let connection = wmi::WMIConnection::new().map_err(|_| ())?;
    let results: Vec<ComputerSystem> = connection
        .raw_query("SELECT Manufacturer, Model FROM Win32_ComputerSystem")
        .map_err(|_| ())?;
    let value = results.into_iter().next().ok_or(())?;
    Ok(DeviceReading {
        manufacturer: value.manufacturer,
        model: value.model,
    })
}

#[cfg(windows)]
impl TelemetryProvider for WindowsProvider {
    fn snapshot(&self) -> Result<Snapshot, String> {
        windows_snapshot(read_power(), read_device())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn power(ac: u8, flags: u8, percent: u8) -> BatteryReading {
        convert_power(Ok(PowerReading { ac, flags, percent }))
    }
    #[test]
    fn percentages_preserve_zero_and_reject_unknown_and_invalid() {
        for value in [0, 1, 50, 99, 100] {
            assert_eq!(power(0, 0, value).percent, Some(Percent(value)));
        }
        for value in [101, 254, 255] {
            let reading = power(0, 0, value);
            assert_eq!(reading.percent, None);
            assert_eq!(reading.status, BatteryStatus::Unknown);
        }
        assert!(power(0, 0, 101).issue.is_some());
    }
    #[test]
    fn no_battery_overrides_percentage_and_unknown_flags_are_not_no_battery() {
        for flags in [128, 128 | 8] {
            let reading = power(1, flags, 100);
            assert_eq!(reading.status, BatteryStatus::NoBattery);
            assert_eq!(reading.percent, None);
            assert_eq!(reading.charge, ChargeState::Unknown);
        }
        assert_eq!(power(255, 255, 255).status, BatteryStatus::Unknown);
        assert_eq!(power(255, 255, 50).percent, Some(Percent(50)));
    }
    #[test]
    fn charging_discharging_full_and_unknown_are_conservative() {
        assert_eq!(power(1, 8 | 1, 70).charge, ChargeState::Charging);
        assert_eq!(power(0, 0, 0).charge, ChargeState::Discharging);
        assert_eq!(power(1, 1, 100).charge, ChargeState::Full);
        assert_eq!(power(1, 8, 100).charge, ChargeState::Charging);
        assert_eq!(power(1, 0, 70).charge, ChargeState::Unknown);
        assert_eq!(power(255, 0, 100).charge, ChargeState::Unknown);
        assert_eq!(power(1, 255, 100).charge, ChargeState::Unknown);
        assert_eq!(power(0, 16, 50).charge, ChargeState::Unknown);
    }
    #[test]
    fn failures_remain_windows_and_sensors_are_never_fabricated() {
        let value = windows_snapshot(Err(5), Err(())).unwrap();
        assert_eq!(value.source, DataSource::Windows);
        assert_eq!(value.battery_status, BatteryStatus::Error);
        assert_eq!(value.battery_percent, None);
        assert_eq!(value.charge_state, ChargeState::Unknown);
        assert_eq!(value.device.manufacturer, None);
        assert_eq!(value.device.model, None);
        assert_eq!(value.issues.len(), 2);
        assert!(value.issues[0].contains("Windows error 5"));
        assert_eq!(value.cpu_temperature_celsius, None);
        assert_eq!(value.gpu_temperature_celsius, None);
        assert_eq!(value.fan_rpm, None);
        assert!(
            !value.capabilities.cpu_temperature
                && !value.capabilities.fan_rpm
                && !value.capabilities.hardware_controls
        );
        assert!(serde_json::to_value(value).unwrap()["batteryPercent"].is_null());
    }
    #[test]
    fn identity_is_optional_trimmed_and_never_classifies_deck_variants() {
        let value = windows_snapshot(
            Ok(PowerReading {
                ac: 1,
                flags: 8,
                percent: 55,
            }),
            Ok(DeviceReading {
                manufacturer: Some(" Valve ".into()),
                model: Some(" Jupiter ".into()),
            }),
        )
        .unwrap();
        assert_eq!(value.device.manufacturer.as_deref(), Some("Valve"));
        assert_eq!(value.device.model.as_deref(), Some("Jupiter"));
        for placeholder in [" ", "Unknown", "To Be Filled By O.E.M.", "Default string"] {
            assert_eq!(clean_identity(Some(placeholder.into())), None);
        }
        assert_eq!(clean_identity(None), None);
        let value = windows_snapshot(
            Ok(PowerReading {
                ac: 0,
                flags: 0,
                percent: 50,
            }),
            Err(()),
        )
        .unwrap();
        assert_eq!(value.battery_percent, Some(Percent(50)));
        assert_eq!(value.device.model, None);
    }
}
