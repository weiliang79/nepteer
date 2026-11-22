//! Only the reviewed physical Quick Access input, never a general input event API.
use super::*;
use std::collections::VecDeque;
use std::sync::{atomic::AtomicU32, MutexGuard};
use std::time::Instant;
pub const EVENT: &str = "neptune-shortcut-changed";
pub(super) const LIMIT: Duration = Duration::from_secs(30 * 60);
const GAP_MS: u32 = 1500;
const BASELINE_MS: u32 = 200;
const COOLDOWN_MS: u32 = 350;
const MAX_PENDING: usize = 4;
#[derive(Debug, Clone, Copy, Default, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ShortcutPhase {
    #[default]
    Disarmed,
    Arming,
    WaitingReports,
    WaitingBaseline,
    Armed,
    Disarming,
    Expired,
    Disconnected,
    AccessDenied,
    DeviceBusy,
    UnsupportedInterface,
    UnsupportedFormat,
    Error,
}
impl ShortcutPhase {
    pub fn owns_reader(self) -> bool {
        matches!(
            self,
            Self::Arming
                | Self::WaitingReports
                | Self::WaitingBaseline
                | Self::Armed
                | Self::Disarming
        )
    }
}
#[derive(Debug, Clone, Copy, Default, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ReaderOwner {
    #[default]
    None,
    Diagnostics,
    Shortcut,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ShortcutIssue {
    NoCompatibleReports,
    ReadFailed,
    IncompatibleFormat,
    QueueFull,
    DispatchFailed,
    Internal,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ArmStage {
    RequestReceived,
    OwnershipCheck,
    CandidateValidation,
    WorkerSpawn,
    HidOpen,
    WaitingReports,
    WaitingBaseline,
    Armed,
    Terminated,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ArmOutcome {
    Pending,
    Active,
    Rejected,
    Terminated,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ArmReason {
    MonitorActive,
    ProbeActive,
    ShortcutAlreadyActive,
    StaleGeneration,
    CandidateNotFound,
    CandidateIneligible,
    UnsupportedSource,
    ConsentRequired,
    AccessDenied,
    DeviceBusy,
    Disconnected,
    HidOpenFailed,
    WorkerSpawnFailed,
    ReadFailed,
    UnsupportedFormat,
    NoCompatibleReports,
    SessionExpired,
    UserDisarmed,
    Shutdown,
    UnexpectedTermination,
    QueueFull,
    DispatchFailed,
    InternalError,
}
impl ArmReason {
    fn from_issue(issue: ShortcutIssue) -> Self {
        match issue {
            ShortcutIssue::NoCompatibleReports => Self::NoCompatibleReports,
            ShortcutIssue::ReadFailed => Self::ReadFailed,
            ShortcutIssue::IncompatibleFormat => Self::UnsupportedFormat,
            ShortcutIssue::QueueFull => Self::QueueFull,
            ShortcutIssue::DispatchFailed => Self::DispatchFailed,
            ShortcutIssue::Internal => Self::InternalError,
        }
    }
    pub fn needs_rescan(self) -> bool {
        matches!(
            self,
            Self::CandidateNotFound
                | Self::CandidateIneligible
                | Self::Disconnected
                | Self::HidOpenFailed
                | Self::UnsupportedFormat
                | Self::ReadFailed
                | Self::UnexpectedTermination
        )
    }
}
/// One memory-only attempt, including rejections before a session generation exists.
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ArmAttempt {
    pub id: u32,
    pub stage: ArmStage,
    pub outcome: ArmOutcome,
    pub reason: Option<ArmReason>,
    pub candidate_selected: bool,
    pub candidate_eligible: Option<bool>,
    pub hid_handle_opened: bool,
    pub compatible_reports_observed: bool,
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutStatus {
    pub generation: u32,
    pub revision: u32,
    pub phase: ShortcutPhase,
    pub remaining_ms: u32,
    pub opened: bool,
    pub source: InputSource,
    pub reader_owner: ReaderOwner,
    pub interface: Option<correlation::ProbeInterface>,
    pub issue: Option<ShortcutIssue>,
    pub last_attempt: Option<ArmAttempt>,
    pub termination_reason: Option<ArmReason>,
    pub worker_running: bool,
    pub monitor_phase: MonitorPhase,
    pub manual_rescan_required: bool,
    pub navigation: navigation::NavigationDiagnostics,
}
impl Default for ShortcutStatus {
    fn default() -> Self {
        Self {
            generation: 0,
            revision: 0,
            phase: ShortcutPhase::Disarmed,
            remaining_ms: 0,
            opened: false,
            source: if cfg!(windows) {
                InputSource::Windows
            } else {
                InputSource::Unsupported
            },
            reader_owner: ReaderOwner::None,
            interface: None,
            issue: None,
            last_attempt: None,
            termination_reason: None,
            worker_running: false,
            monitor_phase: MonitorPhase::Stopped,
            manual_rescan_required: false,
            navigation: Default::default(),
        }
    }
}
#[derive(Debug, Clone, Deserialize, Serialize, TS)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShortcutArmRequest {
    pub candidate_id: String,
    pub expected_generation: u32,
    pub consent: bool,
    pub reviewed_configuration: bool,
    #[serde(default)]
    pub navigation: bool,
}
pub(super) fn gate(candidate: &PrivateCandidate) -> Result<(), String> {
    let c = &candidate.public;
    if candidate.mode != DiagnosticsMode::Native
        || !candidate_ids(c.vendor_id, c.product_id)
        || !c.attributes_verified
        || !c.capabilities.passive_read_eligible
        || c.usage_page != Some(0xffff)
        || c.usage != Some(1)
        || c.interface_number != Some(2)
        || c.input_report_length != Some(65)
    {
        return Err("Physical shortcut requires native 28DE:1205, interface 2, usage FFFF/0001, descriptor length 65. No alternative interface is selected.".into());
    }
    Ok(())
}
/// Pure time/input logic. No word, held state, press count or history is exposed to IPC.
struct Edges {
    phase: ShortcutPhase,
    last_report: Option<u32>,
    held: Option<bool>,
    stable_since: Option<u32>,
    released_samples: u8,
    last_toggle: Option<u32>,
}
impl Default for Edges {
    fn default() -> Self {
        Self {
            phase: ShortcutPhase::WaitingReports,
            last_report: None,
            held: None,
            stable_since: None,
            released_samples: 0,
            last_toggle: None,
        }
    }
}
impl Edges {
    fn reset_baseline(&mut self) {
        self.held = None;
        self.stable_since = None;
        self.released_samples = 0;
        self.phase = ShortcutPhase::WaitingBaseline;
    }
    fn tick(&mut self, ms: u32) -> Result<(), ShortcutIssue> {
        if ms >= LIMIT.as_millis() as u32 {
            self.reset_baseline();
            self.phase = ShortcutPhase::Expired;
            return Ok(());
        }
        if self.last_report.is_none() && ms >= 5000 {
            return Err(ShortcutIssue::NoCompatibleReports);
        }
        if self
            .last_report
            .is_some_and(|last| ms.saturating_sub(last) > GAP_MS)
        {
            self.reset_baseline();
        }
        Ok(())
    }
    fn report(&mut self, ms: u32, packet: &[u8]) -> Result<bool, ShortcutIssue> {
        self.tick(ms)?;
        if self.phase == ShortcutPhase::Expired {
            return Ok(false);
        }
        let word = reports::correlation_word(packet).map_err(|_| {
            self.reset_baseline();
            ShortcutIssue::IncompatibleFormat
        })?;
        let bit = reports::candidate_bit(ControllerControl::QuickAccess)
            .expect("reviewed Quick Access mapping exists");
        let down = word & (1u64 << bit) != 0;
        self.last_report = Some(ms);
        let mut toggle = false;
        if self.phase != ShortcutPhase::Armed {
            self.phase = ShortcutPhase::WaitingBaseline;
            if down {
                self.stable_since = None;
                self.released_samples = 0;
            } else {
                let since = *self.stable_since.get_or_insert(ms);
                self.released_samples = self.released_samples.saturating_add(1);
                if self.released_samples >= 3 && ms.saturating_sub(since) >= BASELINE_MS {
                    self.phase = ShortcutPhase::Armed;
                }
            }
        } else if self.held == Some(false)
            && down
            && self
                .last_toggle
                .is_none_or(|last| ms.saturating_sub(last) >= COOLDOWN_MS)
        {
            self.last_toggle = Some(ms);
            toggle = true;
        }
        self.held = Some(down);
        Ok(toggle)
    }
}
/// Fences queued work after waiting for the QAM coordinator, and waits out an in-flight action on disarm.
#[derive(Default)]
pub(crate) struct Fence {
    current: AtomicU32,
    execution: Mutex<()>,
}
impl Fence {
    fn invalidate(&self) {
        self.current.store(0, Ordering::SeqCst);
    }
    fn barrier(&self) {
        drop(self.execution.lock());
    }
}
#[derive(Clone)]
pub(crate) struct Ticket {
    fence: Arc<Fence>,
    pub(crate) generation: u32,
    pub(crate) navigation: Option<(u32, navigation::NavigationAction)>,
    started: Instant,
    deadline: Instant,
    attempt_id: u32,
}
impl Ticket {
    pub(crate) fn remaining_ms(&self) -> u32 {
        self.deadline
            .saturating_duration_since(Instant::now())
            .as_millis()
            .min(u128::from(u32::MAX)) as u32
    }

    pub(crate) fn valid(&self) -> bool {
        self.fence.current.load(Ordering::SeqCst) == self.generation
            && Instant::now() < self.deadline
    }
    pub(crate) fn enter(&self) -> Option<MutexGuard<'_, ()>> {
        let lock = self.fence.execution.lock().ok()?;
        if self.valid() {
            Some(lock)
        } else {
            None
        }
    }
    fn elapsed(&self) -> u32 {
        self.started.elapsed().as_millis().min(u128::from(u32::MAX)) as u32
    }
}
#[derive(Default)]
struct Inner {
    status: ShortcutStatus,
    deadline: Option<Instant>,
}
#[derive(Default)]
struct Pending {
    queue: VecDeque<Ticket>,
    draining: bool,
}
#[derive(Default)]
pub(crate) struct State {
    inner: Mutex<Inner>,
    fence: Arc<Fence>,
    pending: Mutex<Pending>,
    pub(crate) navigation: Arc<navigation::State>,
}
impl State {
    pub(super) fn request_attempt(&self, selected: bool) -> u32 {
        let mut s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        let id = s
            .status
            .last_attempt
            .as_ref()
            .map_or(1, |a| a.id.saturating_add(1));
        s.status.last_attempt = Some(ArmAttempt {
            id,
            stage: ArmStage::RequestReceived,
            outcome: ArmOutcome::Pending,
            reason: None,
            candidate_selected: selected,
            candidate_eligible: None,
            hid_handle_opened: false,
            compatible_reports_observed: false,
        });
        id
    }
    pub(super) fn attempt_stage(&self, stage: ArmStage) {
        if let Ok(mut s) = self.inner.lock() {
            if let Some(a) = &mut s.status.last_attempt {
                a.stage = stage;
            }
        }
    }
    pub(super) fn reject(&self, reason: ArmReason) -> String {
        if let Ok(mut s) = self.inner.lock() {
            if let Some(a) = &mut s.status.last_attempt {
                a.outcome = ArmOutcome::Rejected;
                a.reason = Some(reason);
                if reason == ArmReason::CandidateIneligible {
                    a.candidate_eligible = Some(false);
                }
            }
        }
        // Fixed enum-derived text only, never OS errors, paths or request strings.
        format!("Shortcut Arm rejected: {reason:?}. See Last Arm Attempt for recovery.")
    }
    fn terminate_attempt(status: &mut ShortcutStatus, reason: ArmReason) {
        status.termination_reason = Some(reason);
        if let Some(a) = &mut status.last_attempt {
            if matches!(a.outcome, ArmOutcome::Pending | ArmOutcome::Active) {
                a.stage = ArmStage::Terminated;
                a.outcome = ArmOutcome::Terminated;
                a.reason = Some(reason);
            }
        }
    }
    pub(super) fn end_reason(&self, reason: ArmReason) {
        if let Ok(mut s) = self.inner.lock() {
            Self::terminate_attempt(&mut s.status, reason);
        }
    }
    pub(super) fn spawn_failed(&self) {
        if let Ok(mut s) = self.inner.lock() {
            s.status.termination_reason = Some(ArmReason::WorkerSpawnFailed);
            if let Some(a) = &mut s.status.last_attempt {
                a.stage = ArmStage::WorkerSpawn;
                a.outcome = ArmOutcome::Terminated;
                a.reason = Some(ArmReason::WorkerSpawnFailed);
            }
        }
    }
    pub(super) fn snapshot(&self) -> ShortcutStatus {
        let mut s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        s.status.revision = s.status.revision.saturating_add(1);
        if s.status.phase.owns_reader() {
            s.status.remaining_ms = s.deadline.map_or(0, |d| {
                d.saturating_duration_since(Instant::now())
                    .as_millis()
                    .min(u128::from(u32::MAX)) as u32
            });
            if s.status.remaining_ms == 0 {
                s.status.phase = ShortcutPhase::Disarming;
            }
        }
        s.status.reader_owner = if s.status.phase.owns_reader() || s.status.opened {
            ReaderOwner::Shortcut
        } else {
            ReaderOwner::None
        };
        s.status.manual_rescan_required = s
            .status
            .last_attempt
            .as_ref()
            .and_then(|a| a.reason)
            .or(s.status.termination_reason)
            .is_some_and(ArmReason::needs_rescan);
        s.status.navigation = self.navigation.snapshot();
        s.status.clone()
    }
    pub(super) fn begin(
        &self,
        expected: u32,
        candidate: &PrivateCandidate,
    ) -> Result<Ticket, String> {
        gate(candidate)?;
        let mut s = self
            .inner
            .lock()
            .map_err(|_| "Physical shortcut state unavailable.")?;
        if expected != s.status.generation || s.status.phase.owns_reader() {
            return Err(
                "Shortcut session changed or is already active. Refresh before arming.".into(),
            );
        }
        let generation = s
            .status
            .generation
            .checked_add(1)
            .ok_or("Restart Nepteer before arming again.")?;
        let started = Instant::now();
        let deadline = started + LIMIT;
        let c = &candidate.public;
        s.status = ShortcutStatus {
            generation,
            revision: s.status.revision.saturating_add(1),
            phase: ShortcutPhase::Arming,
            remaining_ms: LIMIT.as_millis() as u32,
            last_attempt: s.status.last_attempt.clone(),
            interface: Some(correlation::ProbeInterface {
                vendor_id: c.vendor_id,
                product_id: c.product_id,
                usage_page: c.usage_page,
                usage: c.usage,
                interface_number: c.interface_number,
                input_report_length: c.input_report_length,
            }),
            ..Default::default()
        };
        s.status.source = InputSource::Windows;
        if let Some(a) = &mut s.status.last_attempt {
            a.candidate_eligible = Some(true);
            a.stage = ArmStage::WorkerSpawn;
        }
        s.deadline = Some(deadline);
        self.fence.current.store(generation, Ordering::SeqCst);
        Ok(Ticket {
            fence: self.fence.clone(),
            generation,
            navigation: None,
            started,
            deadline,
            attempt_id: s.status.last_attempt.as_ref().map_or(0, |a| a.id),
        })
    }
    pub(super) fn invalidate(&self) {
        self.fence.invalidate();
        self.navigation.invalidate();
        if let Ok(mut p) = self.pending.lock() {
            p.queue.clear();
        }
        if let Ok(mut s) = self.inner.lock() {
            if s.status.phase.owns_reader() {
                s.status.phase = ShortcutPhase::Disarming;
            }
        }
    }
    pub(super) fn barrier(&self) {
        self.fence.barrier();
        self.navigation.barrier();
    }
    fn phase(&self, token: &Ticket, phase: ShortcutPhase, opened: bool) {
        if let Ok(mut s) = self.inner.lock() {
            if s.status.generation == token.generation && token.valid() {
                s.status.phase = phase;
                s.status.opened = opened;
                if let Some(a) = &mut s.status.last_attempt {
                    if a.id == token.attempt_id {
                        a.hid_handle_opened |= opened;
                        a.compatible_reports_observed |=
                            matches!(phase, ShortcutPhase::WaitingBaseline | ShortcutPhase::Armed);
                        a.stage = match phase {
                            ShortcutPhase::WaitingReports => ArmStage::WaitingReports,
                            ShortcutPhase::WaitingBaseline => ArmStage::WaitingBaseline,
                            ShortcutPhase::Armed => ArmStage::Armed,
                            _ => ArmStage::HidOpen,
                        };
                        a.outcome = if phase == ShortcutPhase::Armed {
                            ArmOutcome::Active
                        } else {
                            ArmOutcome::Pending
                        };
                    }
                }
            }
        }
    }
    pub(crate) fn fail(&self, issue: ShortcutIssue) {
        self.invalidate();
        if let Ok(mut s) = self.inner.lock() {
            s.status.phase = if issue == ShortcutIssue::IncompatibleFormat {
                ShortcutPhase::UnsupportedFormat
            } else {
                ShortcutPhase::Error
            };
            s.status.issue = Some(issue);
            Self::terminate_attempt(&mut s.status, ArmReason::from_issue(issue));
        }
    }
    pub(crate) fn fail_dispatch(&self, ticket: &Ticket) {
        // An old dispatch task can finish after disarm/rearm. Check and mutate atomically
        // against the current generation; it must never invalidate a newer session.
        if let Ok(mut s) = self.inner.lock() {
            if s.status.generation != ticket.generation || !ticket.valid() {
                return;
            }
            self.fence.invalidate();
            self.navigation.invalidate();
            if let Ok(mut pending) = self.pending.lock() {
                pending.queue.clear();
            }
            s.status.phase = ShortcutPhase::Error;
            s.status.issue = Some(ShortcutIssue::DispatchFailed);
            Self::terminate_attempt(&mut s.status, ArmReason::DispatchFailed);
        }
    }
    fn finish(
        &self,
        token: &Ticket,
        phase: ShortcutPhase,
        issue: Option<ShortcutIssue>,
        reason: ArmReason,
    ) {
        self.fence.invalidate();
        self.navigation.invalidate();
        if let Ok(mut s) = self.inner.lock() {
            if s.status.generation == token.generation {
                s.status.opened = false; // observe already dropped/drained the reader.
                if s.status.phase.owns_reader() {
                    s.status.phase = ShortcutPhase::Disarming;
                }
                if s.status.termination_reason.is_none() {
                    Self::terminate_attempt(&mut s.status, reason);
                }
            }
        }
        self.barrier();
        if let Ok(mut p) = self.pending.lock() {
            p.queue.clear();
        }
        if let Ok(mut s) = self.inner.lock() {
            if s.status.generation == token.generation {
                if s.status.issue.is_none() || s.status.phase.owns_reader() {
                    s.status.phase = phase;
                    s.status.issue = issue;
                }
                s.status.opened = false;
                s.status.remaining_ms = 0;
                s.status.worker_running = false;
                if s.status.termination_reason.is_none() {
                    Self::terminate_attempt(&mut s.status, reason);
                }
            }
        }
    }
    pub(super) fn disarmed(&self) {
        self.invalidate();
        self.barrier();
        if let Ok(mut s) = self.inner.lock() {
            s.status.phase = ShortcutPhase::Disarmed;
            s.status.opened = false;
            s.status.remaining_ms = 0;
            s.status.issue = None;
        }
    }
    /// At most four pending actions and one drainer; no unbounded task per report/press.
    pub(crate) fn enqueue(&self, token: Ticket) -> Result<bool, ()> {
        if !token.valid() {
            return Ok(false);
        }
        let mut p = self.pending.lock().map_err(|_| ())?;
        if p.queue.len() >= MAX_PENDING {
            return Err(());
        }
        p.queue.push_back(token);
        if p.draining {
            Ok(false)
        } else {
            p.draining = true;
            Ok(true)
        }
    }
    pub(crate) fn next(&self) -> Option<Ticket> {
        let mut p = self.pending.lock().ok()?;
        let value = p.queue.pop_front();
        if value.is_none() {
            p.draining = false;
        }
        value
    }
}
pub(super) type NotifyShortcut = Arc<dyn Fn(ShortcutStatus) + Send + Sync>;
pub(super) type Dispatch = Arc<dyn Fn(Ticket) -> Result<(), ()> + Send + Sync>;
pub(super) fn run(
    backend: Arc<dyn DiscoveryBackend>,
    candidate: PrivateCandidate,
    cancel: Arc<AtomicBool>,
    state: Arc<State>,
    token: Ticket,
    notify: NotifyShortcut,
    dispatch: Dispatch,
) {
    if let Ok(mut s) = state.inner.lock() {
        s.status.worker_running = true;
    }
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        observe(
            backend, &candidate, &cancel, &state, &token, &notify, &dispatch,
        )
    }))
    .unwrap_or_else(|_| {
        state.end_reason(ArmReason::UnexpectedTermination);
        Err(InputFailure::new(
            InputErrorKind::Internal,
            "Shortcut worker terminated unexpectedly.",
        ))
    });
    let (phase, issue) = match result {
        Ok(phase) => (phase, None),
        Err(failure) => (
            match failure.kind {
                InputErrorKind::AccessDenied => ShortcutPhase::AccessDenied,
                InputErrorKind::DeviceBusy => ShortcutPhase::DeviceBusy,
                InputErrorKind::Disconnected => ShortcutPhase::Disconnected,
                InputErrorKind::UnsupportedInterface | InputErrorKind::MetadataUnavailable => {
                    ShortcutPhase::UnsupportedInterface
                }
                InputErrorKind::UnsupportedReportFormat => ShortcutPhase::UnsupportedFormat,
                _ => ShortcutPhase::Error,
            },
            Some(ShortcutIssue::ReadFailed),
        ),
    };
    // observe dropped the read handle and canceled/drained pending I/O before terminal status.
    let reason = if let Ok(s) = state.inner.lock() {
        s.status.termination_reason.unwrap_or_else(|| match phase {
            ShortcutPhase::Expired => ArmReason::SessionExpired,
            ShortcutPhase::Disarmed => ArmReason::UserDisarmed,
            ShortcutPhase::AccessDenied => ArmReason::AccessDenied,
            ShortcutPhase::DeviceBusy => ArmReason::DeviceBusy,
            ShortcutPhase::Disconnected => ArmReason::Disconnected,
            ShortcutPhase::UnsupportedInterface => ArmReason::CandidateIneligible,
            ShortcutPhase::UnsupportedFormat => ArmReason::UnsupportedFormat,
            _ if !s.status.opened => ArmReason::HidOpenFailed,
            _ => ArmReason::ReadFailed,
        })
    } else {
        ArmReason::InternalError
    };
    state.finish(&token, phase, issue, reason);
    notify(state.snapshot());
}
fn observe(
    backend: Arc<dyn DiscoveryBackend>,
    candidate: &PrivateCandidate,
    cancel: &AtomicBool,
    state: &State,
    token: &Ticket,
    notify: &NotifyShortcut,
    dispatch: &Dispatch,
) -> Result<ShortcutPhase, InputFailure> {
    if cancel.load(Ordering::SeqCst) || !token.valid() {
        return Ok(if token.elapsed() >= LIMIT.as_millis() as u32 {
            ShortcutPhase::Expired
        } else {
            ShortcutPhase::Disarmed
        });
    }
    state.phase(token, ShortcutPhase::Arming, false);
    notify(state.snapshot()); // The worker is running; HID open is pending, not yet successful.
    let mut reader = backend.open(candidate)?;
    state.phase(token, ShortcutPhase::WaitingReports, true);
    notify(state.snapshot());
    let mut edges = Edges::default();
    let mut nav_edges = navigation::Edges::default();
    let mut buffer = [0u8; 65];
    let mut emitted = Instant::now();
    let result = (|| {
        while !cancel.load(Ordering::SeqCst) && token.valid() {
            let toggle = match reader.read(&mut buffer, 100)? {
                Some(length) => {
                    if length != 65 {
                        state.fail(ShortcutIssue::IncompatibleFormat);
                        buffer.fill(0);
                        return Ok(ShortcutPhase::UnsupportedFormat);
                    }
                    if cancel.load(Ordering::SeqCst) || !token.valid() {
                        buffer.fill(0);
                        break;
                    }
                    let result = edges.report(token.elapsed(), &buffer);
                    if result.is_ok() {
                        let context = if edges.phase == ShortcutPhase::Armed {
                            state.navigation.context()
                        } else {
                            None
                        };
                        if let Ok(word) = reports::correlation_word(&buffer) {
                            if let Some(action) = nav_edges.report(token.elapsed(), context, word) {
                                let mut command = token.clone();
                                command.navigation = context.map(|epoch| (epoch, action));
                                let _ = dispatch(command);
                            }
                        }
                    }
                    buffer.fill(0);
                    match result {
                        Ok(toggle) => toggle,
                        Err(issue) => {
                            state.fail(issue);
                            return Ok(if issue == ShortcutIssue::IncompatibleFormat {
                                ShortcutPhase::UnsupportedFormat
                            } else {
                                ShortcutPhase::Error
                            });
                        }
                    }
                }
                None => {
                    if let Err(issue) = edges.tick(token.elapsed()) {
                        state.fail(issue);
                        return Ok(ShortcutPhase::Error);
                    }
                    false
                }
            };
            state.phase(token, edges.phase, true);
            if toggle && token.valid() && dispatch(token.clone()).is_err() {
                state.fail(ShortcutIssue::QueueFull);
                return Ok(ShortcutPhase::Error);
            }
            if emitted.elapsed() >= Duration::from_secs(1) {
                notify(state.snapshot());
                emitted = Instant::now();
            }
            std::thread::sleep(Duration::from_millis(1));
        }
        Ok(if token.elapsed() >= LIMIT.as_millis() as u32 {
            ShortcutPhase::Expired
        } else {
            ShortcutPhase::Disarmed
        })
    })();
    buffer.fill(0);
    drop(reader);
    result
}
#[cfg(test)]
pub(crate) fn declarations() -> Vec<String> {
    vec![
        ShortcutPhase::decl(),
        ReaderOwner::decl(),
        ShortcutIssue::decl(),
        ArmStage::decl(),
        ArmOutcome::decl(),
        ArmReason::decl(),
        ArmAttempt::decl(),
        ShortcutStatus::decl(),
        ShortcutArmRequest::decl(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    pub(super) fn candidate() -> PrivateCandidate {
        let mut c = simulated_candidate();
        c.mode = DiagnosticsMode::Native;
        c.public.usage_page = Some(0xffff);
        c.public.input_report_length = Some(65);
        c
    }
    fn packet(word: u64) -> Vec<u8> {
        [&[0u8][..], &reports::synthetic_report(word)].concat()
    }
    fn baseline(e: &mut Edges) {
        for ms in [0, 100, 200] {
            assert!(!e.report(ms, &packet(0)).unwrap());
        }
        assert_eq!(e.phase, ShortcutPhase::Armed);
    }
    #[test]
    fn exact_reviewed_profile_gate_and_no_simulation() {
        assert!(gate(&candidate()).is_ok());
        for v in 0..9 {
            let mut c = candidate();
            match v {
                0 => c.public.vendor_id = 0,
                1 => c.public.product_id = 1,
                2 => c.public.usage_page = Some(0xff00),
                3 => c.public.usage = Some(2),
                4 => c.public.interface_number = Some(1),
                5 => c.public.input_report_length = Some(64),
                6 => c.public.attributes_verified = false,
                7 => c.mode = DiagnosticsMode::Simulated,
                _ => c.public.capabilities.passive_read_eligible = false,
            };
            assert!(gate(&c).is_err());
        }
    }
    #[test]
    fn initial_held_release_stability_one_press_and_no_held_release_toggle() {
        let mut e = Edges::default();
        let down = 1u64 << 50;
        for ms in [0, 100, 200] {
            assert!(!e.report(ms, &packet(down)).unwrap());
        }
        assert_eq!(e.phase, ShortcutPhase::WaitingBaseline);
        for ms in [300, 400, 500] {
            assert!(!e.report(ms, &packet(0)).unwrap());
        }
        assert_eq!(e.phase, ShortcutPhase::Armed);
        assert!(e.report(600, &packet(down)).unwrap());
        for ms in (700..=5600).step_by(100) {
            assert!(!e.report(ms, &packet(down)).unwrap());
        }
        assert!(!e.report(5700, &packet(0)).unwrap());
        assert!(e.report(5800, &packet(down)).unwrap());
    }
    #[test]
    fn rapid_cycles_have_documented_cooldown_and_never_deferred_toggle() {
        let mut e = Edges::default();
        baseline(&mut e);
        let down = 1 << 50;
        assert!(e.report(300, &packet(down)).unwrap());
        assert!(!e.report(310, &packet(0)).unwrap());
        assert!(!e.report(500, &packet(down)).unwrap()); // <350ms press interval, intentionally suppressed
        assert!(!e.report(700, &packet(down)).unwrap()); // held through cooldown, no delayed toggle
        assert!(!e.report(710, &packet(0)).unwrap());
        assert!(e.report(720, &packet(down)).unwrap());
        assert!(!e.report(730, &packet(0)).unwrap());
        assert!(e.report(1100, &packet(down)).unwrap());
    }
    #[test]
    fn steam_and_face_buttons_never_toggle_but_steam_held_with_qam_does() {
        let mut e = Edges::default();
        baseline(&mut e);
        for (ms, word) in [
            (300, 1 << 13),
            (400, 1 << 7),
            (500, 1 << 5),
            (600, 1 << 6),
            (700, 1 << 4),
            (800, 1 << 13),
        ] {
            assert!(!e.report(ms, &packet(word)).unwrap());
        }
        assert!(e.report(900, &packet((1 << 13) | (1 << 50))).unwrap());
        assert!(!e.report(1000, &packet(1 << 13)).unwrap());
    }
    #[test]
    fn timeouts_expiry_and_bad_formats_never_synthesize_release_or_toggle() {
        let mut e = Edges::default();
        assert_eq!(e.tick(5000), Err(ShortcutIssue::NoCompatibleReports));
        let mut e = Edges::default();
        baseline(&mut e);
        assert!(e.report(300, &packet(1 << 50)).unwrap());
        e.tick(500).unwrap();
        assert_eq!(e.held, Some(true));
        e.tick(2000).unwrap();
        assert_eq!(e.phase, ShortcutPhase::WaitingBaseline);
        assert!(!e.report(2100, &packet(1 << 50)).unwrap());
        for ms in [2200, 2300, 2400] {
            assert!(!e.report(ms, &packet(0)).unwrap());
        }
        assert!(e.report(2500, &packet(1 << 50)).unwrap());
        for bytes in [
            reports::synthetic_report(0).to_vec(),
            vec![0; 65],
            vec![0; 64],
            vec![0; 66],
        ] {
            assert_eq!(
                e.report(2600, &bytes),
                Err(ShortcutIssue::IncompatibleFormat)
            );
            assert_eq!(e.held, None);
        }
        assert!(!e
            .report(LIMIT.as_millis() as u32, &packet(1 << 50))
            .unwrap());
        assert_eq!(e.phase, ShortcutPhase::Expired);
    }
    #[test]
    fn bounded_queue_generation_and_deadline_suppress_stale_actions() {
        let s = State::default();
        let t = s.begin(0, &candidate()).unwrap();
        assert!(s.enqueue(t.clone()).unwrap());
        for _ in 1..MAX_PENDING {
            assert!(!s.enqueue(t.clone()).unwrap());
        }
        assert!(s.enqueue(t.clone()).is_err());
        s.invalidate();
        assert!(t.enter().is_none());
        assert!(s.next().is_none());
        s.disarmed();
        let fresh = s.begin(1, &candidate()).unwrap();
        assert!(t.enter().is_none());
        assert!(fresh.enter().is_some());
        s.fail_dispatch(&t);
        assert!(fresh.valid());
        let expired = Ticket {
            deadline: Instant::now() - Duration::from_millis(1),
            ..fresh.clone()
        };
        assert!(expired.enter().is_none());
        let json = serde_json::to_string(&s.snapshot()).unwrap();
        for forbidden in [
            "pressed", "held", "history", "raw", "path", "serial", "word",
        ] {
            assert!(!json.contains(forbidden));
        }
    }
    #[test]
    fn disarm_fences_pending_and_waits_only_for_already_executing_action() {
        let state = Arc::new(State::default());
        let ticket = state.begin(0, &candidate()).unwrap();
        let permit = ticket.enter().unwrap();
        let done = Arc::new(AtomicBool::new(false));
        let worker = {
            let state = state.clone();
            let done = done.clone();
            std::thread::spawn(move || {
                state.disarmed();
                done.store(true, Ordering::SeqCst);
            })
        };
        let deadline = Instant::now() + Duration::from_secs(2);
        while ticket.valid() {
            assert!(Instant::now() < deadline);
            std::thread::yield_now();
        }
        assert!(!done.load(Ordering::SeqCst));
        drop(permit);
        worker.join().unwrap();
        assert!(done.load(Ordering::SeqCst));
        assert!(ticket.enter().is_none());
        assert_eq!(state.snapshot().phase, ShortcutPhase::Disarmed);
    }
}

#[cfg(test)]
mod worker_tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, AtomicUsize};
    struct Backend {
        word: Arc<AtomicU64>,
        error: Arc<AtomicU32>,
        opens: Arc<AtomicUsize>,
        drops: Arc<AtomicUsize>,
    }
    struct Reader {
        word: Arc<AtomicU64>,
        error: Arc<AtomicU32>,
        drops: Arc<AtomicUsize>,
    }
    impl Drop for Reader {
        fn drop(&mut self) {
            self.drops.fetch_add(1, Ordering::SeqCst);
        }
    }
    impl DiscoveryBackend for Backend {
        fn discover(&self, _: DiagnosticsMode) -> Result<Vec<PrivateCandidate>, InputFailure> {
            Ok(vec![tests::candidate()])
        }
        fn open(&self, _: &PrivateCandidate) -> Result<Box<dyn InputReader>, InputFailure> {
            self.opens.fetch_add(1, Ordering::SeqCst);
            if [1, 6, 8].contains(&self.error.load(Ordering::SeqCst)) {
                return Err(InputFailure::new(
                    match self.error.load(Ordering::SeqCst) {
                        6 => InputErrorKind::DeviceBusy,
                        8 => InputErrorKind::Internal,
                        _ => InputErrorKind::AccessDenied,
                    },
                    "Synthetic denial",
                ));
            }
            Ok(Box::new(Reader {
                word: self.word.clone(),
                error: self.error.clone(),
                drops: self.drops.clone(),
            }))
        }
    }
    impl InputReader for Reader {
        fn read(&mut self, b: &mut [u8], _: u32) -> Result<Option<usize>, InputFailure> {
            std::thread::sleep(Duration::from_millis(10));
            match self.error.load(Ordering::SeqCst) {
                2 => Err(InputFailure::new(
                    InputErrorKind::Disconnected,
                    "Synthetic disconnect",
                )),
                3 => {
                    b[..64].copy_from_slice(&reports::synthetic_report(0));
                    Ok(Some(64))
                }
                4 => Err(InputFailure::new(
                    InputErrorKind::ReadError,
                    "Synthetic read failure",
                )),
                5 => Ok(None),
                7 => panic!("synthetic unexpected worker exit"),
                _ => {
                    b[0] = 0;
                    b[1..65].copy_from_slice(&reports::synthetic_report(
                        self.word.load(Ordering::SeqCst),
                    ));
                    Ok(Some(65))
                }
            }
        }
    }
    fn until(f: impl Fn() -> bool) {
        let end = Instant::now() + Duration::from_secs(3);
        while !f() {
            assert!(Instant::now() < end);
            std::thread::sleep(Duration::from_millis(2));
        }
    }
    #[test]
    fn exclusive_modes_repeated_arming_shutdown_and_dispatch_without_reader_locks() {
        let opens = Arc::new(AtomicUsize::new(0));
        let drops = Arc::new(AtomicUsize::new(0));
        let word = Arc::new(AtomicU64::new(0));
        let error = Arc::new(AtomicU32::new(0));
        let d = Arc::new(Diagnostics::new(
            Arc::new(Backend {
                word: word.clone(),
                error: error.clone(),
                opens: opens.clone(),
                drops: drops.clone(),
            }),
            Duration::from_secs(5),
        ));
        let candidate = d.rescan(DiagnosticsMode::Native).unwrap().candidates[0]
            .id
            .clone();
        d.data.lock().unwrap().source = InputSource::Windows;
        let request = |generation| ShortcutArmRequest {
            candidate_id: candidate.clone(),
            expected_generation: generation,
            consent: true,
            reviewed_configuration: true,
            navigation: false,
        };
        let actions = Arc::new(AtomicUsize::new(0));
        let dispatch: Dispatch = {
            let state = d.shortcut.clone();
            let actions = actions.clone();
            Arc::new(move |ticket| {
                assert!(state.inner.try_lock().is_ok());
                assert!(state.pending.try_lock().is_ok());
                if ticket.enter().is_some() {
                    actions.fetch_add(1, Ordering::SeqCst);
                }
                Ok(())
            })
        };
        let notify: NotifyShortcut = Arc::new(|_| {});
        d.start(&candidate, Arc::new(|_| {})).unwrap();
        until(|| d.snapshot().unwrap().monitor.report_count > 0);
        assert!(d
            .arm_shortcut(request(0), notify.clone(), dispatch.clone())
            .is_err());
        assert_eq!(opens.load(Ordering::SeqCst), 1);
        d.stop().unwrap();
        for round in 0..2 {
            word.store(0, Ordering::SeqCst);
            d.arm_shortcut(request(round), notify.clone(), dispatch.clone())
                .unwrap();
            assert!(d
                .arm_shortcut(request(round), notify.clone(), dispatch.clone())
                .is_err());
            assert!(d.start(&candidate, Arc::new(|_| {})).is_err());
            assert!(d.stop().is_err());
            assert!(d.rescan(DiagnosticsMode::Native).is_err());
            until(|| d.shortcut_status().unwrap().phase == ShortcutPhase::Armed);
            word.store(1 << 50, Ordering::SeqCst);
            until(|| actions.load(Ordering::SeqCst) == round as usize + 1);
            std::thread::sleep(Duration::from_millis(50));
            assert_eq!(actions.load(Ordering::SeqCst), round as usize + 1);
            if round == 0 {
                d.shortcut_disarm(1).unwrap();
            } else {
                d.shutdown();
            }
            assert_eq!(d.shortcut_status().unwrap().phase, ShortcutPhase::Disarmed);
            assert!(!d.shortcut_status().unwrap().opened);
        }
        assert_eq!(opens.load(Ordering::SeqCst), 3);
        assert_eq!(drops.load(Ordering::SeqCst), 3);
        assert!(d.arm_shortcut(request(2), notify, dispatch).is_err());
    }
    #[test]
    fn reader_errors_end_without_reconnect_and_deadline_closes_without_opening() {
        for (code, phase) in [
            (1, ShortcutPhase::AccessDenied),
            (2, ShortcutPhase::Disconnected),
            (3, ShortcutPhase::UnsupportedFormat),
            (4, ShortcutPhase::Error),
        ] {
            let opens = Arc::new(AtomicUsize::new(0));
            let drops = Arc::new(AtomicUsize::new(0));
            let state = Arc::new(State::default());
            let token = state.begin(0, &tests::candidate()).unwrap();
            run(
                Arc::new(Backend {
                    word: Arc::new(AtomicU64::new(0)),
                    error: Arc::new(AtomicU32::new(code)),
                    opens: opens.clone(),
                    drops: drops.clone(),
                }),
                tests::candidate(),
                Arc::new(AtomicBool::new(false)),
                state.clone(),
                token,
                Arc::new(|_| {}),
                Arc::new(|_| panic!("no invalid action")),
            );
            assert_eq!(state.snapshot().phase, phase);
            assert!(!state.snapshot().opened);
            assert_eq!(opens.load(Ordering::SeqCst), 1);
            assert_eq!(drops.load(Ordering::SeqCst), if code == 1 { 0 } else { 1 });
        }
        let opens = Arc::new(AtomicUsize::new(0));
        let state = Arc::new(State::default());
        let t = state.begin(0, &tests::candidate()).unwrap();
        let expired = Ticket {
            started: Instant::now() - LIMIT,
            deadline: Instant::now() - Duration::from_millis(1),
            ..t
        };
        run(
            Arc::new(Backend {
                word: Arc::new(AtomicU64::new(0)),
                error: Arc::new(AtomicU32::new(0)),
                opens: opens.clone(),
                drops: Arc::new(AtomicUsize::new(0)),
            }),
            tests::candidate(),
            Arc::new(AtomicBool::new(false)),
            state.clone(),
            expired,
            Arc::new(|_| {}),
            Arc::new(|_| panic!("expired")),
        );
        assert_eq!(state.snapshot().phase, ShortcutPhase::Expired);
        assert_eq!(opens.load(Ordering::SeqCst), 0);
    }
    #[test]
    fn concurrent_arm_stop_cannot_create_duplicate_readers() {
        let opens = Arc::new(AtomicUsize::new(0));
        let drops = Arc::new(AtomicUsize::new(0));
        let d = Arc::new(Diagnostics::new(
            Arc::new(Backend {
                word: Arc::new(AtomicU64::new(0)),
                error: Arc::new(AtomicU32::new(0)),
                opens: opens.clone(),
                drops: drops.clone(),
            }),
            Duration::from_secs(5),
        ));
        let candidate = d.rescan(DiagnosticsMode::Native).unwrap().candidates[0]
            .id
            .clone();
        d.data.lock().unwrap().source = InputSource::Windows;
        let mut threads = Vec::new();
        for _ in 0..8 {
            let d = d.clone();
            let candidate = candidate.clone();
            threads.push(std::thread::spawn(move || {
                d.arm_shortcut(
                    ShortcutArmRequest {
                        candidate_id: candidate,
                        expected_generation: 0,
                        consent: true,
                        reviewed_configuration: true,
                        navigation: false,
                    },
                    Arc::new(|_| {}),
                    Arc::new(|_| Ok(())),
                )
                .is_ok()
            }));
        }
        assert_eq!(
            threads
                .into_iter()
                .map(|t| t.join().unwrap() as u32)
                .sum::<u32>(),
            1
        );
        until(|| opens.load(Ordering::SeqCst) == 1);
        let mut threads = Vec::new();
        for _ in 0..4 {
            let d = d.clone();
            threads.push(std::thread::spawn(move || d.shortcut_disarm(1).unwrap()));
        }
        for t in threads {
            t.join().unwrap();
        }
        assert_eq!(opens.load(Ordering::SeqCst), 1);
        assert_eq!(drops.load(Ordering::SeqCst), 1);
    }
    fn setup() -> (Diagnostics, String, Arc<AtomicU32>, Arc<AtomicUsize>) {
        let error = Arc::new(AtomicU32::new(0));
        let opens = Arc::new(AtomicUsize::new(0));
        let d = Diagnostics::new(
            Arc::new(Backend {
                word: Arc::new(AtomicU64::new(0)),
                error: error.clone(),
                opens: opens.clone(),
                drops: Arc::new(AtomicUsize::new(0)),
            }),
            Duration::from_secs(10),
        );
        let id = d.rescan(DiagnosticsMode::Native).unwrap().candidates[0]
            .id
            .clone();
        d.data.lock().unwrap().source = InputSource::Windows;
        (d, id, error, opens)
    }
    fn request(id: &str, generation: u32) -> ShortcutArmRequest {
        ShortcutArmRequest {
            candidate_id: id.into(),
            expected_generation: generation,
            consent: true,
            reviewed_configuration: true,
            navigation: false,
        }
    }
    fn arm(d: &Diagnostics, r: ShortcutArmRequest) -> Result<ShortcutStatus, String> {
        d.arm_shortcut(r, Arc::new(|_| {}), Arc::new(|_| Ok(())))
    }
    #[test]
    fn rejected_attempts_stay_disarmed_with_precise_reason_and_no_private_request_data() {
        let (d, id, _, opens) = setup();
        for (r, reason) in [
            (
                ShortcutArmRequest {
                    consent: false,
                    ..request(&id, 0)
                },
                ArmReason::ConsentRequired,
            ),
            (request(&id, 9), ArmReason::StaleGeneration),
            (
                request("private-path-never-export-this", 0),
                ArmReason::CandidateNotFound,
            ),
        ] {
            assert!(arm(&d, r).is_err());
            let s = d.shortcut_status().unwrap();
            assert_eq!(s.phase, ShortcutPhase::Disarmed); // Original silent symptom, now explicit.
            let a = s.last_attempt.as_ref().unwrap();
            assert_eq!(a.outcome, ArmOutcome::Rejected);
            assert_eq!(a.reason, Some(reason));
            assert!(!a.hid_handle_opened);
            assert!(!serde_json::to_string(&s)
                .unwrap()
                .contains("private-path-never-export-this"));
        }
        d.data.lock().unwrap().source = InputSource::Unsupported;
        assert!(arm(&d, request(&id, 0)).is_err());
        assert_eq!(
            d.shortcut_status().unwrap().last_attempt.unwrap().reason,
            Some(ArmReason::UnsupportedSource)
        );
        d.data.lock().unwrap().source = InputSource::Windows;
        d.operations.lock().unwrap().candidates[0]
            .public
            .interface_number = Some(0);
        assert!(arm(&d, request(&id, 0)).is_err());
        assert_eq!(
            d.shortcut_status()
                .unwrap()
                .last_attempt
                .unwrap()
                .candidate_eligible,
            Some(false)
        );
        assert_eq!(opens.load(Ordering::SeqCst), 0);
    }
    #[test]
    fn monitoring_and_probe_rejections_remain_visible_until_new_attempt_and_allow_recovery() {
        let (d, id, _, opens) = setup();
        d.start(&id, Arc::new(|_| {})).unwrap();
        until(|| d.snapshot().unwrap().monitor.report_count > 1);
        assert!(arm(&d, request(&id, 0)).is_err());
        let s = d.shortcut_status().unwrap();
        assert_eq!(s.reader_owner, ReaderOwner::Diagnostics);
        assert_eq!(
            s.last_attempt.unwrap().reason,
            Some(ArmReason::MonitorActive)
        );
        let data = d.snapshot().unwrap();
        d.probe_start(correlation::ProbeStartRequest {
            expected_token: data.probe.token,
            monitor_generation: data.monitor.session_generation,
            candidate_id: id.clone(),
            control: ControllerControl::A,
            environment: Default::default(),
            consent: true,
        })
        .unwrap();
        assert!(arm(&d, request(&id, 0)).is_err());
        assert_eq!(
            d.shortcut_status().unwrap().last_attempt.unwrap().reason,
            Some(ArmReason::ProbeActive)
        );
        d.stop().unwrap();
        assert_eq!(
            d.shortcut_status().unwrap().last_attempt.unwrap().reason,
            Some(ArmReason::ProbeActive)
        );
        arm(&d, request(&id, 0)).unwrap();
        until(|| d.shortcut_status().unwrap().phase == ShortcutPhase::Armed);
        let active = d.shortcut_status().unwrap();
        assert_eq!(
            active.last_attempt.as_ref().unwrap().outcome,
            ArmOutcome::Active
        );
        assert!(active.last_attempt.unwrap().compatible_reports_observed);
        assert!(d
            .start(&id, Arc::new(|_| {}))
            .unwrap_err()
            .contains("Disarm Shortcut"));
        assert_eq!(d.shortcut_status().unwrap().phase, ShortcutPhase::Armed);
        d.shortcut_disarm(1).unwrap();
        assert_eq!(
            d.shortcut_status().unwrap().termination_reason,
            Some(ArmReason::UserDisarmed)
        );
        arm(&d, request(&id, 1)).unwrap();
        d.shortcut_disarm(2).unwrap();
        assert!(opens.load(Ordering::SeqCst) <= 3);
    }
    #[test]
    fn rescan_stales_selection_and_spawn_failure_is_a_concrete_terminal_attempt() {
        let (d, old, _, opens) = setup();
        let id = d.rescan(DiagnosticsMode::Native).unwrap().candidates[0]
            .id
            .clone();
        d.data.lock().unwrap().source = InputSource::Windows;
        assert!(arm(&d, request(&old, 0)).is_err());
        assert_eq!(
            d.shortcut_status().unwrap().last_attempt.unwrap().reason,
            Some(ArmReason::CandidateNotFound)
        );
        d.arm_shortcut_with_spawn(
            request(&id, 0),
            Arc::new(|_| {}),
            Arc::new(|_| Ok(())),
            |_| Err(std::io::Error::other("synthetic spawn failure")),
        )
        .unwrap();
        let s = d.shortcut_status().unwrap();
        assert_eq!(s.phase, ShortcutPhase::Error);
        assert_eq!(
            s.last_attempt.unwrap().reason,
            Some(ArmReason::WorkerSpawnFailed)
        );
        assert!(!s.worker_running);
        assert!(!s.opened);
        assert_eq!(opens.load(Ordering::SeqCst), 0);
        arm(&d, request(&id, 1)).unwrap();
        d.shortcut_disarm(2).unwrap();
    }
    #[test]
    fn immediate_open_read_and_unexpected_failures_are_observable_and_terminal_worker_can_be_replaced(
    ) {
        for (code, reason, opened) in [
            (1, ArmReason::AccessDenied, false),
            (6, ArmReason::DeviceBusy, false),
            (8, ArmReason::HidOpenFailed, false),
            (4, ArmReason::ReadFailed, true),
            (2, ArmReason::Disconnected, true),
            (7, ArmReason::UnexpectedTermination, true),
        ] {
            let (d, id, error, opens) = setup();
            error.store(code, Ordering::SeqCst);
            arm(&d, request(&id, 0)).unwrap();
            until(|| !d.shortcut_status().unwrap().phase.owns_reader());
            let s = d.shortcut_status().unwrap();
            assert_eq!(s.termination_reason, Some(reason));
            let a = s.last_attempt.unwrap();
            assert_eq!(a.reason, Some(reason));
            assert_eq!(a.hid_handle_opened, opened);
            assert!(!a.compatible_reports_observed);
            assert!(!s.worker_running);
            assert!(!s.opened);
            assert_eq!(opens.load(Ordering::SeqCst), 1);
            // Joining a completed worker must not leave ownership stuck forever.
            until(|| {
                d.operations
                    .lock()
                    .unwrap()
                    .worker
                    .as_ref()
                    .unwrap()
                    .join
                    .is_finished()
            });
            error.store(0, Ordering::SeqCst);
            arm(&d, request(&id, 1)).unwrap();
            d.shortcut_disarm(2).unwrap();
        }
    }
    #[test]
    fn initial_silence_reports_no_compatible_frames_without_fabricating_open_success() {
        let state = Arc::new(State::default());
        state.request_attempt(true);
        let t = state.begin(0, &tests::candidate()).unwrap();
        let t = Ticket {
            started: Instant::now() - Duration::from_secs(5),
            ..t
        };
        run(
            Arc::new(Backend {
                word: Arc::new(AtomicU64::new(0)),
                error: Arc::new(AtomicU32::new(5)),
                opens: Arc::new(AtomicUsize::new(0)),
                drops: Arc::new(AtomicUsize::new(0)),
            }),
            tests::candidate(),
            Arc::new(AtomicBool::new(false)),
            state.clone(),
            t,
            Arc::new(|_| {}),
            Arc::new(|_| panic!("no input action")),
        );
        let s = state.snapshot();
        assert_eq!(s.termination_reason, Some(ArmReason::NoCompatibleReports));
        let a = s.last_attempt.unwrap();
        assert!(a.hid_handle_opened);
        assert!(!a.compatible_reports_observed);
    }
    #[test]
    fn opted_in_navigation_and_toggle_use_one_reader_and_errors_stop_both() {
        let word = Arc::new(AtomicU64::new(0));
        let error = Arc::new(AtomicU32::new(0));
        let opens = Arc::new(AtomicUsize::new(0));
        let drops = Arc::new(AtomicUsize::new(0));
        let d = Arc::new(Diagnostics::new(
            Arc::new(Backend {
                word: word.clone(),
                error: error.clone(),
                opens: opens.clone(),
                drops: drops.clone(),
            }),
            Duration::from_secs(5),
        ));
        let id = d.rescan(DiagnosticsMode::Native).unwrap().candidates[0]
            .id
            .clone();
        d.data.lock().unwrap().source = InputSource::Windows;
        let navigation = d.navigation();
        navigation.sync(1, true);
        let actions = Arc::new(Mutex::new(Vec::new()));
        let toggles = Arc::new(AtomicUsize::new(0));
        let dispatch: Dispatch = {
            let d = d.clone();
            let actions = actions.clone();
            let toggles = toggles.clone();
            Arc::new(move |ticket| {
                assert!(d.shortcut.inner.try_lock().is_ok());
                if ticket.valid() {
                    if let Some((_, action)) = ticket.navigation {
                        actions.lock().unwrap().push(action);
                    } else {
                        toggles.fetch_add(1, Ordering::SeqCst);
                    }
                }
                Ok(())
            })
        };
        let mut r = request(&id, 0);
        r.navigation = true;
        d.arm_shortcut(r, Arc::new(|_| {}), dispatch).unwrap();
        until(|| d.shortcut_status().unwrap().phase == ShortcutPhase::Armed);
        word.store(1 << 8, Ordering::SeqCst);
        until(|| actions.lock().unwrap().len() == 1);
        std::thread::sleep(Duration::from_millis(60));
        assert_eq!(actions.lock().unwrap().len(), 1);
        word.store(0, Ordering::SeqCst);
        std::thread::sleep(Duration::from_millis(25));
        word.store(1 << 7, Ordering::SeqCst);
        until(|| actions.lock().unwrap().len() == 2);
        navigation.sync(2, false);
        word.store(0, Ordering::SeqCst);
        std::thread::sleep(Duration::from_millis(25));
        word.store(1 << 8, Ordering::SeqCst);
        std::thread::sleep(Duration::from_millis(25));
        navigation.sync(3, true);
        std::thread::sleep(Duration::from_millis(25));
        assert_eq!(actions.lock().unwrap().len(), 2);
        word.store(0, Ordering::SeqCst);
        std::thread::sleep(Duration::from_millis(25));
        word.store(1 << 5, Ordering::SeqCst);
        until(|| actions.lock().unwrap().len() == 3);
        assert_eq!(
            *actions.lock().unwrap(),
            vec![
                navigation::NavigationAction::Previous,
                navigation::NavigationAction::Activate,
                navigation::NavigationAction::Back
            ]
        );
        word.store((1u64 << 50) | (1 << 13), Ordering::SeqCst);
        until(|| toggles.load(Ordering::SeqCst) == 1);
        assert!(d.start(&id, Arc::new(|_| {})).is_err());
        assert_eq!(opens.load(Ordering::SeqCst), 1);
        error.store(4, Ordering::SeqCst);
        until(|| {
            let s = d.shortcut_status().unwrap();
            s.phase == ShortcutPhase::Error && !s.worker_running
        });
        assert!(!navigation.snapshot().configured);
        assert_eq!(drops.load(Ordering::SeqCst), 1);
        d.shortcut_disarm(1).unwrap();
    }
}

#[cfg(test)]
pub(crate) fn test_navigation_ticket(expired: bool) -> (Arc<State>, Ticket) {
    let s = Arc::new(State::default());
    let mut t = s.begin(0, &tests::candidate()).unwrap();
    if expired {
        t.deadline = Instant::now() - Duration::from_millis(1);
    }
    (s, t)
}
