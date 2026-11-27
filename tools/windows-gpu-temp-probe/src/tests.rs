use super::*;
use std::{cell::RefCell, rc::Rc};

fn amd(token: usize) -> Adapter {
    Adapter {
        token,
        amd: true,
        software: false,
    }
}
fn failure(category: Category) -> Failure {
    category.into()
}

#[test]
fn converts_only_deci_celsius() {
    for (raw, celsius) in [(1, 0.1), (543, 54.3), (1000, 100.0), (1200, 120.0)] {
        assert_eq!(
            candidate(RawDeciCelsius(raw)).unwrap(),
            CandidateCelsius(celsius)
        );
    }
}
#[test]
fn zero_and_outside_display_envelope_are_indeterminate_not_universal_sentinels() {
    for raw in [0, 1201, 2000, u32::MAX] {
        assert_eq!(
            candidate(RawDeciCelsius(raw)),
            Err(failure(Category::IndeterminateValue))
        );
    }
}
#[test]
fn selects_unique_hardware_amd_without_using_index_zero() {
    assert_eq!(
        select(&[
            Adapter {
                software: true,
                ..amd(0)
            },
            amd(7)
        ]),
        Ok(7)
    );
}
#[test]
fn rejects_absent_non_amd_and_multiple_hardware() {
    for adapters in [
        vec![],
        vec![Adapter {
            amd: false,
            ..amd(0)
        }],
        vec![Adapter {
            software: true,
            ..amd(0)
        }],
    ] {
        assert_eq!(
            select(&adapters),
            Err(failure(Category::AdapterUnavailable))
        );
    }
    for adapters in [
        vec![amd(2), amd(8)],
        vec![
            amd(2),
            Adapter {
                amd: false,
                ..amd(8)
            },
        ],
        vec![amd(0); MAX_ADAPTERS + 1],
    ] {
        assert_eq!(select(&adapters), Err(failure(Category::Ambiguous)));
    }
}
#[test]
fn requires_single_physical_render_display_without_virtual_or_discrete_flags() {
    assert_eq!(validate_adapter(3, 1), Ok(()));
    assert_eq!(validate_adapter(3 | (1 << 5), 1), Ok(()));
    for count in [0, 2, u32::MAX] {
        assert_eq!(
            validate_adapter(3, count),
            Err(failure(Category::Ambiguous))
        );
    }
    for bit in [2, 4, 6, 7, 10, 11, 12, 14] {
        assert_eq!(
            validate_adapter(3 | (1 << bit), 1),
            Err(failure(Category::Ambiguous))
        );
    }
    for kind in [0, 1, 2] {
        assert!(validate_adapter(kind, 1).is_err());
    }
}
#[test]
fn categorizes_ntstatus_without_hiding_invalid_parameter_as_unsupported() {
    assert_eq!(ntstatus(0), Ok(()));
    for (code, category) in [
        (0xC000_0002, Category::Unsupported),
        (0xC000_00BB, Category::Unsupported),
        (0xC000_0022, Category::AccessDenied),
        (0xC000_02B6, Category::DeviceRemoved),
        (0xC000_000D, Category::InvalidParameter),
        (0xC000_000E, Category::AdapterUnavailable),
        (0xC000_0017, Category::InitializationFailure),
        (0xC000_009A, Category::InitializationFailure),
        (1, Category::OsDriverFailure),
        (0xDEAD_BEEF, Category::OsDriverFailure),
    ] {
        assert_eq!(
            ntstatus(code as i32),
            Err(Failure {
                category,
                code: Some(code)
            })
        );
    }
}
#[test]
fn categorizes_hresult_separately() {
    for (code, category) in [
        (0x8007_0005, Category::AccessDenied),
        (0x887A_0005, Category::DeviceRemoved),
        (0x887A_0007, Category::DeviceRemoved),
        (0x887A_0004, Category::Unsupported),
        (0x8000_4001, Category::Unsupported),
        (0x8007_0057, Category::InvalidParameter),
        (0x887A_0001, Category::InvalidParameter),
        (0x887A_0002, Category::AdapterUnavailable),
        (0x8007_000E, Category::InitializationFailure),
        (0xDEAD_BEEF, Category::OsDriverFailure),
    ] {
        assert_eq!(
            hresult(code as i32),
            Failure {
                category,
                code: Some(code)
            }
        );
    }
}

#[derive(Default)]
struct Trace {
    calls: Vec<&'static str>,
    handle_owned: bool,
    queried: bool,
}
struct Mock {
    trace: Rc<RefCell<Trace>>,
    enumeration: Result<Vec<Adapter>, Failure>,
    opening: Result<u32, Failure>,
    validation: Result<(), Failure>,
    reading: Result<RawDeciCelsius, Failure>,
    closing: Result<(), Failure>,
    panic_query: bool,
}
impl Mock {
    fn new() -> Self {
        Self {
            trace: Rc::new(RefCell::new(Trace::default())),
            enumeration: Ok(vec![amd(7)]),
            opening: Ok(42),
            validation: Ok(()),
            reading: Ok(RawDeciCelsius(543)),
            closing: Ok(()),
            panic_query: false,
        }
    }
    fn check(self, expected: &[&str]) -> Report {
        let trace = self.trace.clone();
        let report = run_once(self);
        let trace = trace.borrow();
        assert_eq!(trace.calls, expected);
        assert!(!trace.handle_owned);
        report
    }
}
impl Api for Mock {
    fn enumerate(&mut self) -> Result<Vec<Adapter>, Failure> {
        self.trace.borrow_mut().calls.push("enumerate");
        self.enumeration.clone()
    }
    fn open(&mut self, token: usize) -> Result<u32, Failure> {
        assert_eq!(token, 7);
        let mut t = self.trace.borrow_mut();
        t.calls.push("open");
        assert!(!t.handle_owned);
        t.handle_owned = self.opening.is_ok_and(|h| h != 0);
        self.opening
    }
    fn validate(&mut self, handle: u32) -> Result<(), Failure> {
        assert_eq!(handle, 42);
        let mut t = self.trace.borrow_mut();
        assert!(t.handle_owned && !t.queried);
        t.calls.push("validate");
        self.validation
    }
    fn temperature(&mut self, handle: u32) -> Result<RawDeciCelsius, Failure> {
        assert_eq!(handle, 42);
        {
            let mut t = self.trace.borrow_mut();
            assert!(t.handle_owned && !t.queried);
            t.queried = true;
            t.calls.push("temperature");
        }
        assert!(!self.panic_query, "synthetic query panic");
        self.reading
    }
    fn close(&mut self, handle: u32) -> Result<(), Failure> {
        assert_eq!(handle, 42);
        let mut t = self.trace.borrow_mut();
        assert!(t.handle_owned);
        t.handle_owned = false;
        t.calls.push("close");
        self.closing
    }
}
const COMPLETE: &[&str] = &["enumerate", "open", "validate", "temperature", "close"];
#[test]
fn success_is_one_synchronous_query_then_one_close_no_retry_or_queue() {
    let r = Mock::new().check(COMPLETE);
    assert_eq!(r.result, Ok(CandidateCelsius(54.3)));
    assert_eq!(r.cleanup, Some(Ok(())));
    assert!(r.selected && r.query_elapsed.is_some());
}
#[test]
fn enumeration_failure_acquires_no_handle() {
    let mut mock = Mock::new();
    mock.enumeration = Err(failure(Category::InitializationFailure));
    let r = mock.check(&["enumerate"]);
    assert_eq!(r.cleanup, None);
}
#[test]
fn absent_and_ambiguous_selection_never_open() {
    for adapters in [vec![], vec![amd(7), amd(8)]] {
        let mut mock = Mock::new();
        mock.enumeration = Ok(adapters);
        let r = mock.check(&["enumerate"]);
        assert!(!r.selected && r.query_elapsed.is_none());
    }
}
#[test]
fn failed_open_never_closes_unowned_handle_or_retries() {
    let mut mock = Mock::new();
    mock.opening = Err(failure(Category::AccessDenied));
    let r = mock.check(&["enumerate", "open"]);
    assert_eq!(r.result, Err(failure(Category::AccessDenied)));
    assert_eq!(r.cleanup, None);
}
#[test]
fn null_success_handle_is_initialization_failure() {
    let mut mock = Mock::new();
    mock.opening = Ok(0);
    let r = mock.check(&["enumerate", "open"]);
    assert_eq!(r.result, Err(failure(Category::InitializationFailure)));
}
#[test]
fn metadata_failure_closes_without_performance_query() {
    let mut mock = Mock::new();
    mock.validation = Err(failure(Category::Ambiguous));
    let r = mock.check(&["enumerate", "open", "validate", "close"]);
    assert_eq!(r.result, Err(failure(Category::Ambiguous)));
    assert!(!r.selected && r.query_elapsed.is_none());
}
#[test]
fn unsupported_denied_removed_invalid_and_other_query_failures_close_once() {
    for category in [
        Category::Unsupported,
        Category::AccessDenied,
        Category::DeviceRemoved,
        Category::InvalidParameter,
        Category::OsDriverFailure,
    ] {
        let mut mock = Mock::new();
        mock.reading = Err(failure(category));
        let r = mock.check(COMPLETE);
        assert_eq!(r.result, Err(failure(category)));
        assert_eq!(r.cleanup, Some(Ok(())));
        assert!(r.query_elapsed.is_some());
    }
}
#[test]
fn rejected_candidate_closes_and_reports_api_success_separately() {
    for raw in [0, 1201, u32::MAX] {
        let mut mock = Mock::new();
        mock.reading = Ok(RawDeciCelsius(raw));
        let r = mock.check(COMPLETE);
        assert_eq!(r.result, Err(failure(Category::IndeterminateValue)));
        assert_eq!(r.cleanup, Some(Ok(())));
    }
}
#[test]
fn close_failure_is_reported_and_never_retried() {
    let mut mock = Mock::new();
    mock.closing = Err(failure(Category::DeviceRemoved));
    let r = mock.check(COMPLETE);
    assert_eq!(r.cleanup, Some(Err(failure(Category::DeviceRemoved))));
    assert!(render(&r).contains("cleanup failed; stop experiments"));
}
#[test]
fn raii_cleans_up_on_unwind_after_query_returns_by_panicking() {
    let mut mock = Mock::new();
    mock.panic_query = true;
    let trace = mock.trace.clone();
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| run_once(mock))).is_err());
    assert_eq!(trace.borrow().calls, COMPLETE);
    assert!(!trace.borrow().handle_owned);
}
#[test]
fn separate_invocations_enumerate_open_and_close_fresh_handles() {
    for _ in 0..2 {
        Mock::new().check(COMPLETE);
    }
}
#[test]
fn safe_output_keeps_candidate_attribution_and_freshness_inconclusive() {
    let r = Mock::new().check(COMPLETE);
    let text = render(&r);
    assert!(text.contains("Candidate adapter temperature: 54.3°C"));
    assert!(text.contains("Attribution: unresolved"));
    assert!(text.contains("Freshness: unresolved"));
    assert!(!text.contains("129.7"));
    assert!(!text.contains("LUID"));
    assert!(!text.contains("FanRPM"));
    assert!(!text.contains("42"));
}
#[test]
fn safe_error_output_keeps_numeric_code_and_omits_candidate() {
    let mut mock = Mock::new();
    mock.reading = ntstatus(0xC000_0022_u32 as i32).map(|_| RawDeciCelsius(543));
    let text = render(&mock.check(COMPLETE));
    assert!(text.contains("access denied; do not elevate (code 0xC0000022)"));
    assert!(!text.contains("Candidate adapter temperature:"));
}
