//! One synchronous, manually admitted experiment. No production dependency or hardware tests.
use std::time::{Duration, Instant};

#[cfg(all(windows, target_arch = "x86_64"))]
pub mod native;

pub const MAX_ADAPTERS: usize = 16;
pub const LABEL: &str = "EXPERIMENTAL — GPU TEMPERATURE PROBE — MANUAL RUN ONLY";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Category {
    Success,
    Unsupported,
    AdapterUnavailable,
    Ambiguous,
    AccessDenied,
    DeviceRemoved,
    InvalidParameter,
    InitializationFailure,
    OsDriverFailure,
    IndeterminateValue,
    AlreadyRunningOrAbandoned,
}

impl Category {
    pub fn label(self) -> &'static str {
        match self {
            Self::Success => "API success; measurement inconclusive",
            Self::Unsupported => "API/query unsupported",
            Self::AdapterUnavailable => "adapter unavailable",
            Self::Ambiguous => "adapter selection ambiguous",
            Self::AccessDenied => "access denied; do not elevate",
            Self::DeviceRemoved => "device removed",
            Self::InvalidParameter => "invalid parameter; support indeterminate",
            Self::InitializationFailure => "resource initialization failure",
            Self::OsDriverFailure => "OS/driver failure",
            Self::IndeterminateValue => "invalid or indeterminate value",
            Self::AlreadyRunningOrAbandoned => {
                "another invocation exists or prior ownership was abandoned; stop"
            }
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Failure {
    pub category: Category,
    pub code: Option<u32>,
}
impl From<Category> for Failure {
    fn from(category: Category) -> Self {
        Self {
            category,
            code: None,
        }
    }
}

/// NTSTATUS and HRESULT are separate contracts; never reinterpret arbitrary error strings.
pub fn ntstatus(code: i32) -> Result<(), Failure> {
    // Require exact STATUS_SUCCESS for this experiment, including no informational/partial output.
    if code == 0 {
        return Ok(());
    }
    let category = match code as u32 {
        0xC000_0002 | 0xC000_00BB => Category::Unsupported,
        0xC000_0022 => Category::AccessDenied,
        0xC000_02B6 => Category::DeviceRemoved,
        0xC000_000D => Category::InvalidParameter,
        0xC000_000E => Category::AdapterUnavailable,
        0xC000_0017 | 0xC000_009A => Category::InitializationFailure,
        _ => Category::OsDriverFailure,
    };
    Err(Failure {
        category,
        code: Some(code as u32),
    })
}

pub fn hresult(code: i32) -> Failure {
    let category = match code as u32 {
        0x8007_0005 => Category::AccessDenied,
        0x887A_0005 | 0x887A_0007 => Category::DeviceRemoved,
        0x887A_0004 | 0x8000_4001 => Category::Unsupported,
        0x8007_0057 | 0x887A_0001 => Category::InvalidParameter,
        0x887A_0002 => Category::AdapterUnavailable,
        0x8007_000E => Category::InitializationFailure,
        _ => Category::OsDriverFailure,
    };
    Failure {
        category,
        code: Some(code as u32),
    }
}

/// Private ephemeral enumeration token; contains no printable device identity.
#[derive(Clone, Copy)]
pub struct Adapter {
    pub token: usize,
    pub amd: bool,
    pub software: bool,
}

pub fn select(adapters: &[Adapter]) -> Result<usize, Failure> {
    if adapters.len() > MAX_ADAPTERS {
        return Err(Category::Ambiguous.into());
    }
    let mut hardware = adapters.iter().filter(|a| !a.software);
    let first = hardware.next().ok_or(Category::AdapterUnavailable)?;
    if hardware.next().is_some() {
        return Err(Category::Ambiguous.into());
    }
    if !first.amd {
        return Err(Category::AdapterUnavailable.into());
    }
    Ok(first.token)
}

/// Only render/display hardware; reject discrete, software, indirect, virtual, detachable,
/// compute-only, prototype and test devices. HybridIntegrated is optional, not proof of UMA.
pub fn validate_adapter(kind: u32, physical_count: u32) -> Result<(), Failure> {
    const REJECT: u32 =
        (1 << 2) | (1 << 4) | (1 << 6) | (1 << 7) | (1 << 10) | (1 << 11) | (1 << 12) | (1 << 14);
    if kind & 3 != 3 || kind & REJECT != 0 || physical_count != 1 {
        Err(Category::Ambiguous.into())
    } else {
        Ok(())
    }
}

#[derive(Clone, Copy)]
pub struct RawDeciCelsius(pub u32);
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CandidateCelsius(pub f64);

pub fn candidate(raw: RawDeciCelsius) -> Result<CandidateCelsius, Failure> {
    // An experiment display envelope, NOT a documented sensor operating range/sentinel rule.
    // Unknown zero semantics (including untouched zero-initialized output) remain inconclusive.
    if !(1..=1200).contains(&raw.0) {
        return Err(Category::IndeterminateValue.into());
    }
    Ok(CandidateCelsius(f64::from(raw.0) / 10.0))
}

pub trait Api {
    fn enumerate(&mut self) -> Result<Vec<Adapter>, Failure>;
    fn open(&mut self, token: usize) -> Result<u32, Failure>;
    fn validate(&mut self, handle: u32) -> Result<(), Failure>;
    fn temperature(&mut self, handle: u32) -> Result<RawDeciCelsius, Failure>;
    fn close(&mut self, handle: u32) -> Result<(), Failure>;
}

struct OwnedAdapter<'a, A: Api> {
    api: &'a mut A,
    handle: Option<u32>,
}
impl<A: Api> OwnedAdapter<'_, A> {
    fn finish(mut self) -> Result<(), Failure> {
        // Take before calling: failed close is reported, never retried/double closed.
        self.api.close(self.handle.take().expect("owned handle"))
    }
}
impl<A: Api> Drop for OwnedAdapter<'_, A> {
    fn drop(&mut self) {
        if let Some(handle) = self.handle.take() {
            let _ = self.api.close(handle);
        }
    }
}

#[derive(Debug)]
pub struct Report {
    pub stage: &'static str,
    pub selected: bool,
    pub result: Result<CandidateCelsius, Failure>,
    pub query_elapsed: Option<Duration>,
    pub cleanup: Option<Result<(), Failure>>,
}

/// Consumes the API: one enumeration, one open, <=1 performance attempt, exactly one close
/// attempt after acquisition. No task/thread/retry/queue; all native work returns before close.
pub fn run_once<A: Api>(mut api: A) -> Report {
    let mut report = Report {
        stage: "enumeration",
        selected: false,
        result: Err(Category::AdapterUnavailable.into()),
        query_elapsed: None,
        cleanup: None,
    };
    let outcome = (|| {
        let token = select(&api.enumerate()?)?;
        report.stage = "open";
        let handle = api.open(token)?;
        if handle == 0 {
            return Err(Category::InitializationFailure.into());
        }
        let owner = OwnedAdapter {
            api: &mut api,
            handle: Some(handle),
        };
        report.stage = "adapter metadata";
        let result = owner.api.validate(handle).and_then(|()| {
            report.selected = true;
            report.stage = "KMTQAITYPE_ADAPTERPERFDATA";
            let start = Instant::now();
            let raw = owner.api.temperature(handle);
            report.query_elapsed = Some(start.elapsed());
            raw.and_then(candidate)
        });
        report.cleanup = Some(owner.finish());
        result
    })();
    report.result = outcome;
    report
}

pub fn render(report: &Report) -> String {
    let mut text = format!(
        "Stage: {}\nAdapter selection: {}\n",
        report.stage,
        if report.selected {
            "sole AMD hardware render/display adapter; one physical adapter (target context requires manual confirmation)"
        } else {
            "not established"
        }
    );
    match report.result {
        Ok(value) => {
            text.push_str("Windows API result: API success; measurement inconclusive\n");
            text.push_str(&format!(
                "Candidate adapter temperature: {:.1}°C\n",
                value.0
            ));
        }
        Err(failure) => {
            if failure.category == Category::IndeterminateValue {
                text.push_str("Windows API result: API success; numeric candidate rejected\n");
            }
            append_failure(&mut text, "Windows API/value result", failure);
        }
    }
    text.push_str("Attribution: unresolved (no edge/hotspot/junction/CPU claim)\nFreshness: unresolved (no sample timestamp)\n");
    match report.query_elapsed {
        Some(elapsed) => text.push_str(&format!(
            "Completed performance query elapsed: {:.3} ms\n",
            elapsed.as_secs_f64() * 1000.0
        )),
        None => text.push_str("Performance query elapsed: not attempted\n"),
    }
    match report.cleanup {
        Some(Ok(())) => text.push_str("Adapter cleanup: close succeeded\n"),
        Some(Err(failure)) => append_failure(
            &mut text,
            "Adapter cleanup failed; stop experiments",
            failure,
        ),
        None => text.push_str("Adapter cleanup: no owned handle\n"),
    }
    text.push_str("Inconclusive experimental evidence; production telemetry remains unavailable. No automatic retry.\n");
    text
}
fn append_failure(text: &mut String, prefix: &str, failure: Failure) {
    text.push_str(&format!("{prefix}: {}", failure.category.label()));
    if let Some(code) = failure.code {
        text.push_str(&format!(" (code 0x{code:08X})"));
    }
    text.push('\n');
}

#[cfg(test)]
mod tests;
