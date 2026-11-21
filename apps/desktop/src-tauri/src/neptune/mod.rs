//! Opt-in, read-only controller observation, independent of system telemetry.
pub mod correlation;
mod monitor;
mod reports;
pub mod shortcut;
#[cfg(windows)]
mod windows;
use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread::JoinHandle;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use ts_rs::TS;

pub const EVENT: &str = "neptune-diagnostics";
pub const MAX_REPORT: usize = 4096;
const SESSION_LIMIT: Duration = Duration::from_secs(300);

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosticsMode {
    #[default]
    Native,
    Simulated,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InputSource {
    Windows,
    Simulated,
    Unsupported,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryPhase {
    NotScanned,
    Scanning,
    Candidates,
    NotFound,
    Unsupported,
    Error,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MonitorPhase {
    Stopped,
    Starting,
    AwaitingReports,
    RawInputOnly,
    SimulatedInput,
    AccessDenied,
    DeviceBusy,
    Disconnected,
    UnsupportedReportFormat,
    ReadError,
}
impl MonitorPhase {
    pub fn active(self) -> bool {
        matches!(
            self,
            Self::Starting | Self::AwaitingReports | Self::RawInputOnly | Self::SimulatedInput
        )
    }
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InputErrorKind {
    Enumeration,
    MetadataUnavailable,
    AccessDenied,
    DeviceBusy,
    Disconnected,
    UnsupportedInterface,
    UnsupportedPlatform,
    UnsupportedReportFormat,
    ReadError,
    SessionLimit,
    Internal,
}
#[derive(Debug, Clone, Serialize, TS, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InputFailure {
    pub kind: InputErrorKind,
    pub message: String,
}
impl InputFailure {
    fn new(kind: InputErrorKind, message: &str) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }
    fn phase(&self) -> MonitorPhase {
        match self.kind {
            InputErrorKind::AccessDenied => MonitorPhase::AccessDenied,
            InputErrorKind::DeviceBusy => MonitorPhase::DeviceBusy,
            InputErrorKind::Disconnected => MonitorPhase::Disconnected,
            InputErrorKind::UnsupportedInterface
            | InputErrorKind::UnsupportedPlatform
            | InputErrorKind::UnsupportedReportFormat => MonitorPhase::UnsupportedReportFormat,
            _ => MonitorPhase::ReadError,
        }
    }
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct InputCapabilities {
    pub passive_read_eligible: bool,
    pub button_decoding: bool,
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct Candidate {
    pub id: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub usage_page: Option<u16>,
    pub usage: Option<u16>,
    pub interface_number: Option<u8>,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
    pub attributes_verified: bool,
    pub input_report_length: Option<u16>,
    pub capabilities: InputCapabilities,
    pub issue: Option<InputFailure>,
}
#[derive(Debug, Clone, Copy, Deserialize, Serialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ControllerControl {
    Steam,
    QuickAccess,
    A,
    B,
    X,
    Y,
    DpadUp,
    DpadDown,
    DpadLeft,
    DpadRight,
    L1,
    R1,
    L2,
    R2,
    L4,
    L5,
    R4,
    R5,
    LeftStickClick,
    RightStickClick,
    LeftTrackpadTouch,
    RightTrackpadTouch,
    LeftTrackpadClick,
    RightTrackpadClick,
}
/// Candidate layouts: published body / proposed Windows prefix; neither is physically verified.
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReportFormat {
    DeckV1Bare64,
    DeckV1ZeroPrefixed65,
}
#[derive(Debug, Clone, Copy, Default, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ReportRecognition {
    #[default]
    NotObserved,
    Candidate,
    Unsupported,
    Malformed,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ParseIssue {
    UnsupportedPrefix,
    UnsupportedVersion,
    UnsupportedMessage,
    Truncated,
    Oversized,
    InvalidDeclaredLength,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MappingVerification {
    Unavailable,
    Candidate,
    Simulated,
    ButtonVerified,
}
#[derive(Debug, Clone, Default, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ReportDiagnostics {
    pub recognition: ReportRecognition,
    pub format: Option<ReportFormat>,
    /// Zero only for the matching zero-prefixed candidate; bare message has no identified HID ID.
    pub report_id: Option<u8>,
    pub message_type: Option<u8>,
    pub framing_verified: bool,
    pub physical_buttons_verified: bool,
    pub candidate_report_count: u32,
    pub unsupported_report_count: u32,
    pub malformed_report_count: u32,
    pub last_issue: Option<ParseIssue>,
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ControlObservation {
    pub control: ControllerControl,
    pub pressed: Option<bool>,
    pub verification: MappingVerification,
}
/// Bounded session-local observations. This build emits simulated transitions only.
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ButtonTransition {
    pub sequence: u32,
    pub at_session_ms: u32,
    pub source: InputSource,
    pub control: ControllerControl,
    pub pressed: bool,
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct MonitorStatus {
    pub phase: MonitorPhase,
    pub session_generation: u32,
    pub candidate_id: Option<String>,
    pub opened: bool,
    pub report_count: u32,
    pub last_report_length: Option<u16>,
    #[ts(type = "number | null")]
    pub last_report_at_unix_ms: Option<u64>,
    pub issue: Option<InputFailure>,
    pub button_decoding_supported: bool,
    pub report: ReportDiagnostics,
    pub controls: Vec<ControlObservation>,
    pub transitions: Vec<ButtonTransition>,
}
impl Default for MonitorStatus {
    fn default() -> Self {
        Self {
            phase: MonitorPhase::Stopped,
            session_generation: 0,
            candidate_id: None,
            opened: false,
            report_count: 0,
            last_report_length: None,
            last_report_at_unix_ms: None,
            issue: None,
            button_decoding_supported: false,
            report: ReportDiagnostics::default(),
            controls: reports::unavailable_controls(),
            transitions: Vec::new(),
        }
    }
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticsSnapshot {
    pub probe: correlation::ProbeStatus,
    pub source: InputSource,
    pub discovery: DiscoveryPhase,
    pub candidates: Vec<Candidate>,
    pub discovery_issue: Option<InputFailure>,
    pub monitor: MonitorStatus,
}
impl Default for DiagnosticsSnapshot {
    fn default() -> Self {
        Self {
            probe: correlation::ProbeStatus::default(),
            source: if cfg!(windows) {
                InputSource::Windows
            } else {
                InputSource::Unsupported
            },
            discovery: DiscoveryPhase::NotScanned,
            candidates: Vec::new(),
            discovery_issue: None,
            monitor: MonitorStatus::default(),
        }
    }
}

// Private paths are never Debug/Serialize/TS. Opaque scan-local IDs cross IPC instead.
#[derive(Clone)]
struct PrivateCandidate {
    public: Candidate,
    #[cfg_attr(not(windows), allow(dead_code))]
    path: Vec<u16>,
    mode: DiagnosticsMode,
}
trait InputReader {
    fn read(&mut self, buffer: &mut [u8], timeout_ms: u32) -> Result<Option<usize>, InputFailure>;
}
trait DiscoveryBackend: Send + Sync {
    fn discover(&self, mode: DiagnosticsMode) -> Result<Vec<PrivateCandidate>, InputFailure>;
    fn open(&self, candidate: &PrivateCandidate) -> Result<Box<dyn InputReader>, InputFailure>;
}
type Notify = Arc<dyn Fn(&DiagnosticsSnapshot) + Send + Sync>;
#[derive(Clone, Copy, PartialEq)]
enum WorkerMode {
    Diagnostics,
    Shortcut,
}
struct Worker {
    mode: WorkerMode,
    cancel: Arc<AtomicBool>,
    join: JoinHandle<()>,
}
#[derive(Default)]
struct Session {
    monitor_generation: u32,
    generation: u64,
    candidates: Vec<PrivateCandidate>,
    worker: Option<Worker>,
}
pub struct Diagnostics {
    operations: Mutex<Session>,
    data: Arc<Mutex<DiagnosticsSnapshot>>,
    backend: Arc<dyn DiscoveryBackend>,
    closing: AtomicBool,
    shutdown_complete: AtomicBool,
    limit: Duration,
    probe: Arc<Mutex<correlation::Runtime>>,
    shortcut: Arc<shortcut::State>,
}
impl Default for Diagnostics {
    fn default() -> Self {
        Self::new(Arc::new(PlatformBackend), SESSION_LIMIT)
    }
}
impl Diagnostics {
    fn new(backend: Arc<dyn DiscoveryBackend>, limit: Duration) -> Self {
        Self {
            operations: Mutex::new(Session::default()),
            data: Arc::new(Mutex::new(DiagnosticsSnapshot::default())),
            backend,
            closing: AtomicBool::new(false),
            shutdown_complete: AtomicBool::new(false),
            limit,
            probe: Arc::new(Mutex::new(correlation::Runtime::default())),
            shortcut: Arc::new(shortcut::State::default()),
        }
    }
    pub fn snapshot(&self) -> Result<DiagnosticsSnapshot, String> {
        let mut value = self
            .data
            .lock()
            .map_err(|_| "Controller diagnostics state is unavailable.")?
            .clone();
        value.probe = self.probe_status()?;
        Ok(value)
    }
    pub fn shortcut_status(&self) -> Result<shortcut::ShortcutStatus, String> {
        let mut status = self.shortcut.snapshot();
        let data = self
            .data
            .lock()
            .map_err(|_| "Controller state unavailable.")?;
        status.reader_owner = if status.phase.owns_reader() || status.opened {
            shortcut::ReaderOwner::Shortcut
        } else if data.monitor.phase.active() || data.monitor.opened {
            shortcut::ReaderOwner::Diagnostics
        } else {
            shortcut::ReaderOwner::None
        };
        Ok(status)
    }
    pub fn shortcut_arm<R: tauri::Runtime>(
        &self,
        app: tauri::AppHandle<R>,
        request: shortcut::ShortcutArmRequest,
    ) -> Result<shortcut::ShortcutStatus, String> {
        let notify_app = app.clone();
        let notify: shortcut::NotifyShortcut = Arc::new(move |status| {
            use tauri::Emitter;
            let _ = notify_app.emit_to("main", shortcut::EVENT, status);
        });
        let dispatch_state = self.shortcut.clone();
        let dispatch: shortcut::Dispatch = Arc::new(move |ticket| {
            crate::quick_access::queue_physical(&app, &dispatch_state, ticket)
        });
        self.arm_shortcut(request, notify, dispatch)
    }
    fn arm_shortcut(
        &self,
        request: shortcut::ShortcutArmRequest,
        notify: shortcut::NotifyShortcut,
        dispatch: shortcut::Dispatch,
    ) -> Result<shortcut::ShortcutStatus, String> {
        if !request.consent || !request.reviewed_configuration {
            return Err("Confirm passive observation and the reviewed Deck LCD/Windows 11/Steam Deck Tools Desktop configuration before arming.".into());
        }
        let mut session = self
            .operations
            .lock()
            .map_err(|_| "Controller coordinator unavailable.")?;
        if self.closing.load(Ordering::SeqCst) {
            return Err("Nepteer is shutting down.".into());
        }
        if session
            .worker
            .as_ref()
            .is_some_and(|w| !w.join.is_finished())
            || self.probe_status()?.outcome.active()
        {
            return Err("A Neptune reader or probe is active. Stop diagnostics/probing or explicitly disarm before switching modes.".into());
        }
        Self::stop_worker(&mut session)?;
        self.shortcut.barrier();
        if self
            .data
            .lock()
            .map_err(|_| "Controller state unavailable.")?
            .source
            != InputSource::Windows
        {
            return Err("Physical shortcut requires manually discovered native Windows interfaces; simulation is not supported.".into());
        }
        let candidate = session
            .candidates
            .iter()
            .find(|c| c.public.id == request.candidate_id)
            .cloned()
            .ok_or("Select a discovered interface; rescan manually if it expired.")?;
        let ticket = self
            .shortcut
            .begin(request.expected_generation, &candidate)?;
        let worker_ticket = ticket.clone();
        let cancel = Arc::new(AtomicBool::new(false));
        let worker_cancel = cancel.clone();
        let backend = self.backend.clone();
        let state = self.shortcut.clone();
        match std::thread::Builder::new()
            .name("nepteer-qam-observer".into())
            .spawn(move || {
                shortcut::run(
                    backend,
                    candidate,
                    worker_cancel,
                    state,
                    worker_ticket,
                    notify,
                    dispatch,
                )
            }) {
            Ok(join) => {
                session.worker = Some(Worker {
                    mode: WorkerMode::Shortcut,
                    cancel,
                    join,
                })
            }
            Err(_) => {
                self.shortcut.fail(shortcut::ShortcutIssue::Internal);
                self.shortcut.invalidate();
            }
        }
        self.shortcut_status()
    }
    pub fn shortcut_disarm(&self, generation: u32) -> Result<shortcut::ShortcutStatus, String> {
        // Check/invalidate while serialized with Arm, before waiting for I/O or a window action.
        let mut session = self
            .operations
            .lock()
            .map_err(|_| "Controller coordinator unavailable.")?;
        if self.shortcut.snapshot().generation != generation {
            return Err("Shortcut session changed; refresh before disarming.".into());
        }
        self.shortcut.invalidate();
        if session
            .worker
            .as_ref()
            .is_some_and(|w| w.mode == WorkerMode::Shortcut)
        {
            Self::stop_worker(&mut session)?;
        }
        self.shortcut.disarmed();
        self.shortcut_status()
    }
    fn reject_shortcut_owner(session: &Session) -> Result<(), String> {
        if session
            .worker
            .as_ref()
            .is_some_and(|w| w.mode == WorkerMode::Shortcut && !w.join.is_finished())
        {
            return Err("Physical Quick Access shortcut owns the Neptune reader. Explicitly Disarm Shortcut before diagnostics or rescan.".into());
        }
        Ok(())
    }
    pub fn probe_status(&self) -> Result<correlation::ProbeStatus, String> {
        self.probe
            .lock()
            .map(|mut p| p.snapshot())
            .map_err(|_| "Probe is unavailable.".into())
    }
    pub fn probe_start(
        &self,
        request: correlation::ProbeStartRequest,
    ) -> Result<correlation::ProbeStatus, String> {
        let correlation::ProbeStartRequest {
            expected_token,
            monitor_generation,
            candidate_id,
            control,
            environment,
            consent,
        } = request;
        if !consent {
            return Err("Explicit consent is required before Start Probe.".into());
        }
        let session = self
            .operations
            .lock()
            .map_err(|_| "Controller coordinator is unavailable.")?;
        if self.closing.load(Ordering::SeqCst) {
            return Err("Nepteer is shutting down.".into());
        }
        let data = self
            .data
            .lock()
            .map_err(|_| "Controller state is unavailable.")?
            .clone();
        if data.source != InputSource::Windows
            || !data.monitor.phase.active()
            || !data.monitor.opened
            || data.monitor.session_generation != monitor_generation
            || data.monitor.candidate_id.as_deref() != Some(candidate_id.as_str())
            || data.monitor.report.format != Some(ReportFormat::DeckV1ZeroPrefixed65)
            || data.monitor.report.recognition != ReportRecognition::Candidate
            || !session
                .worker
                .as_ref()
                .is_some_and(|w| !w.join.is_finished())
        {
            return Err("Start the selected native monitor and observe the 65-byte candidate format before probing.".into());
        }
        let candidate = session
            .candidates
            .iter()
            .find(|c| c.public.id == candidate_id && c.mode == DiagnosticsMode::Native)
            .ok_or("Probe candidate expired. Rescan manually.")?;
        self.probe
            .lock()
            .map_err(|_| "Probe is unavailable.")?
            .start(
                expected_token,
                monitor_generation,
                &candidate.public,
                control,
                environment,
            )
    }
    pub fn probe_abort(&self, token: u32) -> Result<correlation::ProbeStatus, String> {
        self.probe
            .lock()
            .map_err(|_| "Probe is unavailable.")?
            .abort(token)
    }
    fn end_probe(&self, reason: correlation::ProbeEndReason) {
        if let Ok(mut probe) = self.probe.lock() {
            probe.end_owner(reason);
        }
    }
    fn stop_worker(session: &mut Session) -> Result<(), String> {
        if let Some(worker) = session.worker.take() {
            worker.cancel.store(true, Ordering::SeqCst);
            worker
                .join
                .join()
                .map_err(|_| "Controller worker could not be joined.")?;
        }
        Ok(())
    }
    pub fn rescan(&self, mode: DiagnosticsMode) -> Result<DiagnosticsSnapshot, String> {
        let mut session = self
            .operations
            .lock()
            .map_err(|_| "Controller coordinator is unavailable.")?;
        if self.closing.load(Ordering::SeqCst) {
            return Err("Nepteer is shutting down.".into());
        }
        Self::reject_shortcut_owner(&session)?;
        self.shortcut.barrier();
        self.end_probe(correlation::ProbeEndReason::Rescan);
        Self::stop_worker(&mut session)?;
        session.candidates.clear();
        session.generation = session.generation.saturating_add(1);
        {
            let mut data = self
                .data
                .lock()
                .map_err(|_| "Controller state is unavailable.")?;
            *data = DiagnosticsSnapshot {
                source: if mode == DiagnosticsMode::Simulated {
                    InputSource::Simulated
                } else if cfg!(windows) {
                    InputSource::Windows
                } else {
                    InputSource::Unsupported
                },
                discovery: DiscoveryPhase::Scanning,
                ..Default::default()
            };
        }
        let result = self.backend.discover(mode);
        let mut data = self
            .data
            .lock()
            .map_err(|_| "Controller state is unavailable.")?;
        match result {
            Ok(mut candidates) => {
                candidates.retain(|c| candidate_ids(c.public.vendor_id, c.public.product_id));
                candidates.truncate(64);
                for (index, candidate) in candidates.iter_mut().enumerate() {
                    candidate.public.id =
                        format!("scan{}-candidate{}", session.generation, index + 1);
                }
                data.discovery = if candidates.is_empty() {
                    DiscoveryPhase::NotFound
                } else {
                    DiscoveryPhase::Candidates
                };
                data.candidates = candidates.iter().map(|c| c.public.clone()).collect();
                session.candidates = candidates;
            }
            Err(issue) => {
                data.discovery = if issue.kind == InputErrorKind::UnsupportedPlatform {
                    DiscoveryPhase::Unsupported
                } else {
                    DiscoveryPhase::Error
                };
                data.discovery_issue = Some(issue);
            }
        }
        drop(data);
        self.snapshot()
    }
    pub fn start(&self, id: &str, notify: Notify) -> Result<DiagnosticsSnapshot, String> {
        let mut session = self
            .operations
            .lock()
            .map_err(|_| "Controller coordinator is unavailable.")?;
        if self.closing.load(Ordering::SeqCst) {
            return Err("Nepteer is shutting down.".into());
        }
        Self::reject_shortcut_owner(&session)?;
        self.shortcut.barrier();
        if let Some(worker) = &session.worker {
            let data = self.snapshot()?;
            if !worker.join.is_finished() && data.monitor.phase.active() {
                return if data.monitor.candidate_id.as_deref() == Some(id) {
                    Ok(data)
                } else {
                    Err("Stop the current monitor before selecting another interface.".into())
                };
            }
        }
        self.end_probe(correlation::ProbeEndReason::MonitoringStopped);
        Self::stop_worker(&mut session)?;
        let candidate = session
            .candidates
            .iter()
            .find(|c| c.public.id == id)
            .cloned()
            .ok_or("Candidate expired or not found. Rescan and select an interface.")?;
        if !candidate.public.capabilities.passive_read_eligible {
            return Err("This interface is discovery-only. Keyboard, mouse and unknown collections cannot be monitored.".into());
        }
        session.monitor_generation = session
            .monitor_generation
            .checked_add(1)
            .ok_or("Restart Nepteer before monitoring again.")?;
        {
            let mut data = self
                .data
                .lock()
                .map_err(|_| "Controller state is unavailable.")?;
            data.monitor = MonitorStatus {
                session_generation: session.monitor_generation,
                phase: MonitorPhase::Starting,
                candidate_id: Some(id.into()),
                ..Default::default()
            };
        }
        let cancel = Arc::new(AtomicBool::new(false));
        let worker_cancel = cancel.clone();
        let backend = self.backend.clone();
        let data = self.data.clone();
        let limit = self.limit;
        self.probe
            .lock()
            .map_err(|_| "Probe unavailable.")?
            .bind_owner(session.monitor_generation);
        let probe = self.probe.clone();
        let join = std::thread::Builder::new()
            .name("nepteer-input-observer".into())
            .spawn(move || {
                monitor::run(
                    backend,
                    candidate,
                    worker_cancel,
                    data,
                    notify,
                    limit,
                    probe,
                )
            });
        match join {
            Ok(join) => {
                session.worker = Some(Worker {
                    mode: WorkerMode::Diagnostics,
                    cancel,
                    join,
                })
            }
            Err(_) => {
                self.end_probe(correlation::ProbeEndReason::MonitorError);
                let mut data = self
                    .data
                    .lock()
                    .map_err(|_| "Controller state is unavailable.")?;
                data.monitor.phase = MonitorPhase::ReadError;
                data.monitor.issue = Some(InputFailure::new(
                    InputErrorKind::Internal,
                    "Could not start the controller worker.",
                ));
            }
        }
        self.snapshot()
    }
    pub fn stop(&self) -> Result<DiagnosticsSnapshot, String> {
        self.end_probe(correlation::ProbeEndReason::MonitoringStopped);
        let mut session = self
            .operations
            .lock()
            .map_err(|_| "Controller coordinator is unavailable.")?;
        Self::reject_shortcut_owner(&session)?;
        self.shortcut.barrier();
        Self::stop_worker(&mut session)?;
        let mut data = self
            .data
            .lock()
            .map_err(|_| "Controller state is unavailable.")?;
        data.monitor.phase = MonitorPhase::Stopped;
        data.monitor.opened = false;
        data.monitor.button_decoding_supported = false;
        data.monitor.transitions.clear();
        data.monitor.controls = reports::unavailable_controls();
        drop(data);
        self.snapshot()
    }
    pub fn shutdown_complete(&self) -> bool {
        self.shutdown_complete.load(Ordering::SeqCst)
    }
    pub fn claim_shutdown(&self) -> bool {
        let claimed = self
            .closing
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok();
        if claimed {
            self.shortcut.invalidate();
        }
        claimed
    }
    pub fn shutdown(&self) {
        self.closing.store(true, Ordering::SeqCst);
        self.shortcut.invalidate();
        self.end_probe(correlation::ProbeEndReason::Shutdown);
        if let Ok(mut session) = self.operations.lock() {
            let _ = Self::stop_worker(&mut session);
            self.shortcut.disarmed();
            session.candidates.clear();
        }
        self.shutdown_complete.store(true, Ordering::SeqCst);
    }
}
impl Drop for Diagnostics {
    fn drop(&mut self) {
        self.shutdown();
    }
}
fn candidate_ids(vid: u16, pid: u16) -> bool {
    vid == 0x28de && pid == 0x1205
}
fn read_eligible(
    verified: bool,
    page: Option<u16>,
    usage: Option<u16>,
    length: Option<u16>,
) -> bool {
    verified
        && page.is_some_and(|p| p >= 0xff00)
        && usage.is_some_and(|u| u != 0)
        && length.is_some_and(|n| n > 0 && usize::from(n) <= MAX_REPORT)
}
fn now_ms() -> Option<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|d| u64::try_from(d.as_millis()).ok())
}
struct PlatformBackend;
impl DiscoveryBackend for PlatformBackend {
    fn discover(&self, mode: DiagnosticsMode) -> Result<Vec<PrivateCandidate>, InputFailure> {
        if mode == DiagnosticsMode::Simulated {
            return Ok(vec![simulated_candidate()]);
        }
        #[cfg(windows)]
        {
            windows::discover()
        }
        #[cfg(not(windows))]
        {
            Err(InputFailure::new(InputErrorKind::UnsupportedPlatform,"Native HID discovery is available only on Windows. Select simulated diagnostics deliberately for development."))
        }
    }
    fn open(&self, candidate: &PrivateCandidate) -> Result<Box<dyn InputReader>, InputFailure> {
        if candidate.mode == DiagnosticsMode::Simulated {
            return Ok(Box::new(SimulatedReader::default()));
        }
        #[cfg(windows)]
        {
            windows::open(candidate)
        }
        #[cfg(not(windows))]
        {
            Err(InputFailure::new(
                InputErrorKind::UnsupportedPlatform,
                "Windows input access is unavailable on this host.",
            ))
        }
    }
}
fn simulated_candidate() -> PrivateCandidate {
    PrivateCandidate {
        public: Candidate {
            id: String::new(),
            vendor_id: 0x28de,
            product_id: 0x1205,
            usage_page: Some(0xff00),
            usage: Some(1),
            interface_number: Some(2),
            manufacturer: Some("Simulated Valve candidate".into()),
            product: Some("Synthetic read-only report source".into()),
            attributes_verified: true,
            input_report_length: Some(64),
            capabilities: InputCapabilities {
                passive_read_eligible: read_eligible(true, Some(0xff00), Some(1), Some(64)),
                button_decoding: false,
            },
            issue: None,
        },
        path: Vec::new(),
        mode: DiagnosticsMode::Simulated,
    }
}
#[derive(Default)]
struct SimulatedReader {
    step: u32,
}
impl InputReader for SimulatedReader {
    fn read(&mut self, buffer: &mut [u8], timeout_ms: u32) -> Result<Option<usize>, InputFailure> {
        std::thread::sleep(Duration::from_millis(u64::from(timeout_ms.min(50))));
        // Each state repeats for ten reports: baseline, press, hold, release, simultaneous.
        let buttons = match (self.step / 10) % 8 {
            1 | 2 => 1 << 7,                  // candidate A
            4 | 5 => (1 << 5) | (1u64 << 50), // candidate B + Quick Access
            _ => 0,
        };
        buffer[..64].copy_from_slice(&reports::synthetic_report(buttons));
        self.step = self.step.wrapping_add(1);
        Ok(Some(64))
    }
}
#[cfg(test)]
pub(crate) fn declarations() -> Vec<String> {
    let mut declarations = vec![
        DiagnosticsMode::decl(),
        InputSource::decl(),
        DiscoveryPhase::decl(),
        MonitorPhase::decl(),
        InputErrorKind::decl(),
        InputFailure::decl(),
        InputCapabilities::decl(),
        Candidate::decl(),
        ControllerControl::decl(),
        ReportFormat::decl(),
        ReportRecognition::decl(),
        ParseIssue::decl(),
        MappingVerification::decl(),
        ReportDiagnostics::decl(),
        ControlObservation::decl(),
        ButtonTransition::decl(),
        MonitorStatus::decl(),
        DiagnosticsSnapshot::decl(),
    ];
    declarations.extend(correlation::declarations());
    declarations.extend(shortcut::declarations());
    declarations
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;
    use std::time::Instant;
    struct FakeBackend {
        opens: Arc<AtomicUsize>,
        drops: Arc<AtomicUsize>,
        failure: Option<InputErrorKind>,
        missing: bool,
        enumeration_error: bool,
    }
    struct FakeReader {
        drops: Arc<AtomicUsize>,
        failure: Option<InputErrorKind>,
    }
    impl Drop for FakeReader {
        fn drop(&mut self) {
            self.drops.fetch_add(1, Ordering::SeqCst);
        }
    }
    impl InputReader for FakeReader {
        fn read(&mut self, buffer: &mut [u8], _: u32) -> Result<Option<usize>, InputFailure> {
            std::thread::sleep(Duration::from_millis(3));
            if let Some(kind) = self.failure {
                return Err(InputFailure::new(kind, "Synthetic read failure"));
            }
            buffer[..64].fill(0xff);
            Ok(Some(64))
        }
    }
    impl DiscoveryBackend for FakeBackend {
        fn discover(&self, _: DiagnosticsMode) -> Result<Vec<PrivateCandidate>, InputFailure> {
            if self.enumeration_error {
                return Err(InputFailure::new(
                    InputErrorKind::Enumeration,
                    "Synthetic enumeration failure",
                ));
            }
            if self.missing {
                return Ok(Vec::new());
            }
            let mut first = simulated_candidate();
            first.path = "private-path-with-unique-data".encode_utf16().collect();
            let mut second = first.clone();
            second.public.usage_page = Some(1);
            second.public.usage = Some(6);
            second.public.capabilities.passive_read_eligible = false;
            Ok(vec![first, second])
        }
        fn open(&self, _: &PrivateCandidate) -> Result<Box<dyn InputReader>, InputFailure> {
            self.opens.fetch_add(1, Ordering::SeqCst);
            if matches!(
                self.failure,
                Some(InputErrorKind::AccessDenied | InputErrorKind::DeviceBusy)
            ) {
                return Err(InputFailure::new(
                    self.failure.unwrap(),
                    "Synthetic open failure",
                ));
            }
            Ok(Box::new(FakeReader {
                drops: self.drops.clone(),
                failure: self.failure,
            }))
        }
    }
    fn setup(failure: Option<InputErrorKind>) -> (Diagnostics, Arc<AtomicUsize>, Arc<AtomicUsize>) {
        let opens = Arc::new(AtomicUsize::new(0));
        let drops = Arc::new(AtomicUsize::new(0));
        let backend = Arc::new(FakeBackend {
            opens: opens.clone(),
            drops: drops.clone(),
            failure,
            missing: false,
            enumeration_error: false,
        });
        (
            Diagnostics::new(backend, Duration::from_secs(2)),
            opens,
            drops,
        )
    }
    fn wait_until(test: impl Fn() -> bool) {
        let until = Instant::now() + Duration::from_secs(2);
        while !test() {
            assert!(
                Instant::now() < until,
                "worker did not reach expected state"
            );
            std::thread::sleep(Duration::from_millis(2));
        }
    }
    fn notify() -> Notify {
        Arc::new(|_| {})
    }
    #[test]
    fn candidate_matching_and_collection_policy_are_conservative() {
        assert!(candidate_ids(0x28de, 0x1205));
        assert!(!candidate_ids(0x045e, 0x1205));
        assert!(!candidate_ids(0x28de, 0x11ff));
        assert!(read_eligible(true, Some(0xff00), Some(1), Some(64)));
        for (page, usage, length, verified) in [
            (Some(1), Some(2), Some(64), true),
            (Some(1), Some(6), Some(64), true),
            (None, None, None, true),
            (Some(0xff00), Some(1), Some(0), true),
            (Some(0xff00), Some(1), Some(64), false),
        ] {
            assert!(!read_eligible(verified, page, usage, length));
        }
    }
    #[test]
    fn discovery_preserves_multiple_interfaces_and_serializes_no_private_paths() {
        let (diagnostics, opens, _) = setup(None);
        assert_eq!(
            diagnostics.snapshot().unwrap().discovery,
            DiscoveryPhase::NotScanned
        );
        assert_eq!(opens.load(Ordering::SeqCst), 0);
        let data = diagnostics.rescan(DiagnosticsMode::Simulated).unwrap();
        assert_eq!(data.candidates.len(), 2);
        assert_ne!(data.candidates[0].id, data.candidates[1].id);
        let json = serde_json::to_string(&data).unwrap();
        assert!(
            !json.contains("private-path")
                && !json.contains("serial")
                && !json.contains("instance")
        );
        assert!(diagnostics.start(&data.candidates[1].id, notify()).is_err());
        let old = data.candidates[0].id.clone();
        let next = diagnostics.rescan(DiagnosticsMode::Simulated).unwrap();
        assert_ne!(old, next.candidates[0].id);
        assert!(diagnostics.start(&old, notify()).is_err());
    }
    #[test]
    fn start_stop_are_idempotent_join_resources_and_emit_no_button_events() {
        let (diagnostics, opens, drops) = setup(None);
        let data = diagnostics.rescan(DiagnosticsMode::Simulated).unwrap();
        let id = &data.candidates[0].id;
        diagnostics.start(id, notify()).unwrap();
        diagnostics.start(id, notify()).unwrap();
        wait_until(|| diagnostics.snapshot().unwrap().monitor.report_count >= 3);
        assert_eq!(opens.load(Ordering::SeqCst), 1);
        let live = diagnostics.snapshot().unwrap();
        assert_eq!(live.monitor.phase, MonitorPhase::RawInputOnly);
        assert!(live.monitor.opened);
        assert!(
            live.monitor.transitions.is_empty()
                && live.monitor.controls.iter().all(|c| c.pressed.is_none())
        );
        let stopped = diagnostics.stop().unwrap();
        assert_eq!(stopped.monitor.phase, MonitorPhase::Stopped);
        assert!(!stopped.monitor.opened);
        assert_eq!(drops.load(Ordering::SeqCst), 1);
        diagnostics.stop().unwrap();
        std::thread::sleep(Duration::from_millis(15));
        assert_eq!(
            stopped.monitor.report_count,
            diagnostics.snapshot().unwrap().monitor.report_count
        );
        diagnostics.start(id, notify()).unwrap();
        wait_until(|| opens.load(Ordering::SeqCst) == 2);
        diagnostics.shutdown();
        assert_eq!(drops.load(Ordering::SeqCst), 2);
        assert!(diagnostics.shutdown_complete());
        assert!(diagnostics.start(id, notify()).is_err());
    }
    #[test]
    fn open_read_and_disconnect_errors_stop_without_reconnect() {
        for kind in [
            InputErrorKind::AccessDenied,
            InputErrorKind::DeviceBusy,
            InputErrorKind::Disconnected,
            InputErrorKind::ReadError,
        ] {
            let (diagnostics, opens, drops) = setup(Some(kind));
            let data = diagnostics.rescan(DiagnosticsMode::Simulated).unwrap();
            diagnostics.start(&data.candidates[0].id, notify()).unwrap();
            wait_until(|| !diagnostics.snapshot().unwrap().monitor.phase.active());
            let state = diagnostics.snapshot().unwrap();
            assert_eq!(state.monitor.phase, InputFailure::new(kind, "").phase());
            assert!(!state.monitor.opened);
            assert_eq!(opens.load(Ordering::SeqCst), 1);
            diagnostics.stop().unwrap();
            assert_eq!(
                drops.load(Ordering::SeqCst),
                if matches!(
                    kind,
                    InputErrorKind::AccessDenied | InputErrorKind::DeviceBusy
                ) {
                    0
                } else {
                    1
                }
            );
        }
    }
    #[test]
    fn enumeration_failure_missing_devices_and_session_expiry_are_explicit() {
        for (missing, error, phase) in [
            (true, false, DiscoveryPhase::NotFound),
            (false, true, DiscoveryPhase::Error),
        ] {
            let (diagnostics, opens, drops) = setup(None);
            let backend = Arc::new(FakeBackend {
                opens,
                drops,
                failure: None,
                missing,
                enumeration_error: error,
            });
            let diagnostics = Diagnostics::new(backend, diagnostics.limit);
            assert_eq!(
                diagnostics
                    .rescan(DiagnosticsMode::Simulated)
                    .unwrap()
                    .discovery,
                phase
            );
        }
        let (mut diagnostics, _, drops) = setup(None);
        diagnostics.limit = Duration::from_millis(25);
        let data = diagnostics.rescan(DiagnosticsMode::Simulated).unwrap();
        diagnostics.start(&data.candidates[0].id, notify()).unwrap();
        wait_until(|| diagnostics.snapshot().unwrap().monitor.phase == MonitorPhase::Stopped);
        assert_eq!(drops.load(Ordering::SeqCst), 1);
        assert_eq!(
            diagnostics.snapshot().unwrap().monitor.issue.unwrap().kind,
            InputErrorKind::SessionLimit
        );
    }
    #[test]
    fn reports_only_validate_lengths_and_shutdown_is_claimed_once() {
        assert!(reports::inspect(64, 65).is_ok());
        assert!(reports::inspect(65, 65).is_ok());
        for length in [0, 66, MAX_REPORT + 1] {
            assert!(reports::inspect(length, 65).is_err());
        }
        let (diagnostics, _, _) = setup(None);
        assert!(diagnostics.claim_shutdown());
        assert!(!diagnostics.claim_shutdown());
        diagnostics.shutdown();
        assert!(diagnostics.shutdown_complete());
    }
    #[test]
    fn transport_surface_has_no_hardware_write_operations() {
        // Compile-time read-only trait plus a source guard against accidental native write APIs.
        let native = include_str!("windows.rs");
        for forbidden in [
            "WriteFile(",
            "HidD_Set",
            "HidD_GetFeature(",
            "HidD_GetInputReport(",
            "HidD_GetSerialNumberString(",
            "GENERIC_WRITE",
            "DeviceIoControl(",
        ] {
            assert!(
                !native.contains(forbidden),
                "unexpected device API: {forbidden}"
            );
        }
    }
    #[test]
    fn simulated_worker_decodes_but_stop_restart_and_expiry_clear_all_input() {
        let diagnostics = Diagnostics::new(Arc::new(PlatformBackend), Duration::from_secs(3));
        let data = diagnostics.rescan(DiagnosticsMode::Simulated).unwrap();
        let id = &data.candidates[0].id;
        diagnostics.start(id, notify()).unwrap();
        wait_until(|| {
            !diagnostics
                .snapshot()
                .unwrap()
                .monitor
                .transitions
                .is_empty()
        });
        let live = diagnostics.snapshot().unwrap();
        assert_eq!(live.source, InputSource::Simulated);
        assert_eq!(live.monitor.phase, MonitorPhase::SimulatedInput);
        assert!(live
            .monitor
            .controls
            .iter()
            .any(|c| c.pressed == Some(true)));
        assert!(
            !live.monitor.report.framing_verified && !live.monitor.report.physical_buttons_verified
        );
        let stopped = diagnostics.stop().unwrap();
        assert!(stopped.monitor.transitions.is_empty());
        assert!(!stopped.monitor.button_decoding_supported);
        assert!(stopped.monitor.controls.iter().all(|c| c.pressed.is_none()));
        diagnostics.start(id, notify()).unwrap();
        wait_until(|| {
            diagnostics.snapshot().unwrap().monitor.phase == MonitorPhase::SimulatedInput
        });
        assert!(diagnostics
            .snapshot()
            .unwrap()
            .monitor
            .transitions
            .is_empty());
        diagnostics.shutdown();
        let short = Diagnostics::new(Arc::new(PlatformBackend), Duration::from_millis(600));
        let found = short.rescan(DiagnosticsMode::Simulated).unwrap();
        short.start(&found.candidates[0].id, notify()).unwrap();
        wait_until(|| short.snapshot().unwrap().monitor.phase == MonitorPhase::Stopped);
        let expired = short.snapshot().unwrap();
        assert!(
            expired.monitor.transitions.is_empty() && !expired.monitor.button_decoding_supported
        );
        assert!(expired.monitor.controls.iter().all(|c| c.pressed.is_none()));
        assert_eq!(expired.source, InputSource::Simulated);
    }
}

#[cfg(test)]
mod probe_integration_tests {
    use super::*;
    use std::sync::atomic::{AtomicU8, AtomicUsize};
    use std::time::Instant;
    struct Backend {
        opens: Arc<AtomicUsize>,
        drops: Arc<AtomicUsize>,
        mode: Arc<AtomicU8>,
    }
    struct Reader {
        drops: Arc<AtomicUsize>,
        mode: Arc<AtomicU8>,
    }
    impl Drop for Reader {
        fn drop(&mut self) {
            self.drops.fetch_add(1, Ordering::SeqCst);
        }
    }
    impl DiscoveryBackend for Backend {
        fn discover(&self, _: DiagnosticsMode) -> Result<Vec<PrivateCandidate>, InputFailure> {
            let mut c = simulated_candidate();
            c.mode = DiagnosticsMode::Native;
            c.public.input_report_length = Some(65);
            c.public.usage_page = Some(0xffff);
            Ok(vec![c])
        }
        fn open(&self, _: &PrivateCandidate) -> Result<Box<dyn InputReader>, InputFailure> {
            self.opens.fetch_add(1, Ordering::SeqCst);
            Ok(Box::new(Reader {
                drops: self.drops.clone(),
                mode: self.mode.clone(),
            }))
        }
    }
    impl InputReader for Reader {
        fn read(&mut self, buffer: &mut [u8], _: u32) -> Result<Option<usize>, InputFailure> {
            std::thread::sleep(Duration::from_millis(2));
            match self.mode.load(Ordering::SeqCst) {
                1 => Err(InputFailure::new(
                    InputErrorKind::Disconnected,
                    "Synthetic disconnect",
                )),
                3 => Ok(Some(66)),
                2 => {
                    buffer[..64].copy_from_slice(&reports::synthetic_report(0));
                    Ok(Some(64))
                }
                _ => {
                    buffer[0] = 0;
                    buffer[1..65].copy_from_slice(&reports::synthetic_report(0));
                    Ok(Some(65))
                }
            }
        }
    }
    fn wait_until(test: impl Fn() -> bool) {
        let end = Instant::now() + Duration::from_secs(2);
        while !test() {
            assert!(Instant::now() < end);
            std::thread::sleep(Duration::from_millis(2));
        }
    }
    fn setup(
        limit: Duration,
    ) -> (
        Diagnostics,
        Arc<AtomicUsize>,
        Arc<AtomicUsize>,
        Arc<AtomicU8>,
        String,
    ) {
        let opens = Arc::new(AtomicUsize::new(0));
        let drops = Arc::new(AtomicUsize::new(0));
        let mode = Arc::new(AtomicU8::new(0));
        let d = Diagnostics::new(
            Arc::new(Backend {
                opens: opens.clone(),
                drops: drops.clone(),
                mode: mode.clone(),
            }),
            limit,
        );
        let c = d.rescan(DiagnosticsMode::Native).unwrap().candidates[0]
            .id
            .clone();
        // Synthetic transport only: simulate Windows source on macOS without calling Windows APIs.
        d.data.lock().unwrap().source = InputSource::Windows;
        d.start(&c, Arc::new(|_| {})).unwrap();
        wait_until(|| d.snapshot().unwrap().monitor.report_count > 1);
        (d, opens, drops, mode, c)
    }
    fn request(d: &Diagnostics, id: &str) -> correlation::ProbeStartRequest {
        let data = d.snapshot().unwrap();
        correlation::ProbeStartRequest {
            expected_token: data.probe.token,
            monitor_generation: data.monitor.session_generation,
            candidate_id: id.into(),
            control: ControllerControl::A,
            environment: Default::default(),
            consent: true,
        }
    }
    #[test]
    fn probe_uses_one_reader_and_stale_session_or_token_cannot_rearm_it() {
        let (d, opens, drops, _, id) = setup(Duration::from_secs(5));
        let mut no_consent = request(&d, &id);
        no_consent.consent = false;
        assert!(d.probe_start(no_consent).is_err());
        let old = request(&d, &id);
        let started = d.probe_start(old.clone()).unwrap();
        assert!(d.probe_start(old.clone()).is_err());
        assert!(d.probe_abort(0).is_err());
        assert_eq!(opens.load(Ordering::SeqCst), 1);
        let stopped = d.stop().unwrap();
        assert_eq!(stopped.probe.outcome, correlation::ProbeOutcome::Aborted);
        assert_eq!(
            stopped.probe.summary.unwrap().reason,
            Some(correlation::ProbeEndReason::MonitoringStopped)
        );
        d.start(&id, Arc::new(|_| {})).unwrap();
        wait_until(|| d.snapshot().unwrap().monitor.report_count > 1);
        assert!(d.probe_start(old).is_err());
        let next = d.probe_start(request(&d, &id)).unwrap();
        assert!(next.token > started.token);
        assert!(d.probe_abort(started.token).is_err());
        let rescanned = d.rescan(DiagnosticsMode::Native).unwrap();
        assert_eq!(
            rescanned.probe.summary.unwrap().reason,
            Some(correlation::ProbeEndReason::Rescan)
        );
        assert_eq!(opens.load(Ordering::SeqCst), 2);
        assert_eq!(drops.load(Ordering::SeqCst), 2);
    }
    #[test]
    fn disconnect_framing_expiry_and_shutdown_end_probe_without_live_button_events() {
        for reason in 0..5 {
            let (d, opens, drops, mode, id) = setup(if reason == 2 {
                Duration::from_millis(300)
            } else {
                Duration::from_secs(5)
            });
            d.probe_start(request(&d, &id)).unwrap();
            match reason {
                0 => mode.store(1, Ordering::SeqCst),
                1 => mode.store(2, Ordering::SeqCst),
                2 => {}
                3 => d.shutdown(),
                _ => mode.store(3, Ordering::SeqCst),
            }
            wait_until(|| !d.probe_status().unwrap().outcome.active());
            let data = d.snapshot().unwrap();
            assert!(
                data.monitor.controls.iter().all(|v| v.pressed.is_none())
                    && data.monitor.transitions.is_empty()
            );
            assert!(
                !data.monitor.report.framing_verified
                    && !data.monitor.report.physical_buttons_verified
            );
            let expected = match reason {
                0 => correlation::ProbeEndReason::MonitorError,
                1 => correlation::ProbeEndReason::FramingChanged,
                2 => correlation::ProbeEndReason::SessionExpired,
                3 => correlation::ProbeEndReason::Shutdown,
                _ => correlation::ProbeEndReason::FramingChanged,
            };
            assert_eq!(data.probe.summary.unwrap().reason, Some(expected));
            if reason == 1 {
                assert!(data.monitor.phase.active());
            }
            d.stop().unwrap();
            assert_eq!(opens.load(Ordering::SeqCst), 1);
            assert_eq!(drops.load(Ordering::SeqCst), 1);
        }
    }
}
