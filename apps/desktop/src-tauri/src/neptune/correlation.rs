//! Bounded, memory-only candidate-bit evidence. No raw word/mask is serializable.
use super::*;
use std::time::Instant;
const DEADLINE_MS: u32 = 30_000;
const COMPLETE_MS: u32 = 29_000;
const MAX_GAP_MS: u32 = 1_500;

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum KnownState {
    Yes,
    No,
    #[default]
    Unknown,
}
#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ToolsMode {
    Desktop,
    X360,
    Other,
    #[default]
    Unknown,
}
#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SteamInputState {
    Enabled,
    Disabled,
    #[default]
    Unknown,
}
#[derive(Debug, Clone, Default, Deserialize, Serialize, TS, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProbeEnvironment {
    pub steam_deck_tools_running: KnownState,
    pub steam_deck_tools_mode: ToolsMode,
    pub steam_running: KnownState,
    pub steam_input: SteamInputState,
}
#[derive(Debug, Clone, Copy, Default, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProbeOutcome {
    #[default]
    NotStarted,
    Preparing,
    Running,
    Observed,
    Inconclusive,
    Aborted,
    Error,
}
impl ProbeOutcome {
    pub fn active(self) -> bool {
        matches!(self, Self::Preparing | Self::Running)
    }
}
#[derive(Debug, Clone, Copy, Default, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProbePhase {
    #[default]
    Preparation,
    Idle,
    Press,
    Hold,
    Release,
    Finalizing,
    Done,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProbeEndReason {
    Completed,
    BaselineMissing,
    Deadline,
    IncompleteEvidence,
    FramingChanged,
    UserAborted,
    MonitoringStopped,
    MonitorError,
    SessionExpired,
    Rescan,
    Shutdown,
}
#[derive(Debug, Clone, Default, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ProbeCounts {
    pub compatible_reports: u32,
    pub incompatible_reports: u32,
    pub malformed_reports: u32,
    pub baseline_established: bool,
    pub observed_press_edges: u32,
    pub observed_release_edges: u32,
    pub expected_press_edges: u32,
    pub expected_release_edges: u32,
    pub repeated_held_reports: u32,
    pub missing_presses: u32,
    pub missing_releases: u32,
    pub idle_transitions: u32,
    pub outside_phase_edges: u32,
    pub early_edges: u32,
    pub late_edges: u32,
    pub repeated_edges: u32,
    pub unrelated_known_changes: u32,
    pub unknown_bit_changes: u32,
    pub report_gaps: u32,
    pub completed_cycles: u32,
    pub final_released: Option<bool>,
    pub framing_changed: bool,
}
/// Only numeric, non-identifying interface metadata. No path, candidate ID or free text.
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ProbeInterface {
    pub vendor_id: u16,
    pub product_id: u16,
    pub usage_page: Option<u16>,
    pub usage: Option<u16>,
    pub interface_number: Option<u8>,
    pub input_report_length: Option<u16>,
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ProbeSummary {
    pub version: String,
    pub interface: ProbeInterface,
    pub format: ReportFormat,
    pub control: ControllerControl,
    pub candidate_bit: u8,
    pub environment: ProbeEnvironment,
    pub outcome: ProbeOutcome,
    pub reason: Option<ProbeEndReason>,
    pub elapsed_ms: u32,
    pub counts: ProbeCounts,
}
#[derive(Debug, Clone, Default, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ProbeStatus {
    /// Ephemeral coordination values, deliberately excluded from Copy Safe Summary.
    pub token: u32,
    pub revision: u32,
    pub monitor_generation: u32,
    pub outcome: ProbeOutcome,
    pub phase: ProbePhase,
    pub cycle: u8,
    pub remaining_ms: u32,
    pub summary: Option<ProbeSummary>,
}
#[derive(Debug, Clone, Deserialize, Serialize, TS)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProbeStartRequest {
    pub expected_token: u32,
    pub monitor_generation: u32,
    pub candidate_id: String,
    pub control: ControllerControl,
    pub environment: ProbeEnvironment,
    pub consent: bool,
}
/// Pure state machine: callers supply monotonic session-relative milliseconds.
/// No Debug/Serialize: last_word is private, transient input, not diagnostic output.
struct Probe {
    status: ProbeStatus,
    last_word: Option<u64>,
    last_report_ms: Option<u32>,
    gap_active: bool,
    stable_since: u32,
    stable_reports: u32,
    pressed: [bool; 5],
    released: [bool; 5],
    held: [bool; 5],
    idle_reports: u32,
    final_reports: u32,
}
fn phase_at(ms: u32) -> (ProbePhase, u8) {
    if ms < 4_000 {
        (ProbePhase::Preparation, 0)
    } else if ms < 7_000 {
        (ProbePhase::Idle, 0)
    } else if ms < 27_000 {
        let offset = ms - 7_000;
        (
            if offset % 4_000 < 1_500 {
                ProbePhase::Press
            } else if offset % 4_000 < 2_500 {
                ProbePhase::Hold
            } else {
                ProbePhase::Release
            },
            (offset / 4_000 + 1) as u8,
        )
    } else {
        (ProbePhase::Finalizing, 5)
    }
}
fn gate(candidate: &Candidate) -> Result<(), String> {
    if !candidate.attributes_verified
        || !candidate.capabilities.passive_read_eligible
        || !candidate_ids(candidate.vendor_id, candidate.product_id)
        || !candidate.usage_page.is_some_and(|v| v >= 0xff00)
        || candidate.usage != Some(1)
        || candidate.input_report_length != Some(65)
    {
        return Err("Probe requires a selected, confirmed vendor-defined usage-1 candidate with descriptor input length 65.".into());
    }
    Ok(())
}
impl Probe {
    fn new(
        candidate: &Candidate,
        control: ControllerControl,
        environment: ProbeEnvironment,
    ) -> Result<Self, String> {
        gate(candidate)?;
        let bit = reports::candidate_bit(control)
            .ok_or("This control has no supported candidate mapping.")?;
        Ok(Self {
            status: ProbeStatus {
                outcome: ProbeOutcome::Preparing,
                remaining_ms: DEADLINE_MS,
                summary: Some(ProbeSummary {
                    version: env!("CARGO_PKG_VERSION").into(),
                    interface: ProbeInterface {
                        vendor_id: candidate.vendor_id,
                        product_id: candidate.product_id,
                        usage_page: candidate.usage_page,
                        usage: candidate.usage,
                        interface_number: candidate.interface_number,
                        input_report_length: candidate.input_report_length,
                    },
                    format: ReportFormat::DeckV1ZeroPrefixed65,
                    control,
                    candidate_bit: bit,
                    environment,
                    outcome: ProbeOutcome::Preparing,
                    reason: None,
                    elapsed_ms: 0,
                    counts: ProbeCounts {
                        missing_presses: 5,
                        missing_releases: 5,
                        ..Default::default()
                    },
                }),
                ..Default::default()
            },
            last_word: None,
            last_report_ms: None,
            gap_active: false,
            stable_since: 0,
            stable_reports: 0,
            pressed: [false; 5],
            released: [false; 5],
            held: [false; 5],
            idle_reports: 0,
            final_reports: 0,
        })
    }
    fn summary(&mut self) -> &mut ProbeSummary {
        self.status
            .summary
            .as_mut()
            .expect("probe always has aggregate summary")
    }
    fn finish(&mut self, outcome: ProbeOutcome, reason: ProbeEndReason) {
        self.status.outcome = outcome;
        self.status.phase = ProbePhase::Done;
        self.status.remaining_ms = 0;
        let s = self.summary();
        s.outcome = outcome;
        s.reason = Some(reason);
        // Retain only aggregates after a terminal result.
        self.last_word = None;
        self.last_report_ms = None;
    }
    fn tick(&mut self, ms: u32) {
        if !self.status.outcome.active() {
            return;
        }
        self.summary().elapsed_ms = ms.min(DEADLINE_MS);
        self.status.remaining_ms = DEADLINE_MS.saturating_sub(ms);
        if let Some(last) = self.last_report_ms {
            if ms.saturating_sub(last) > MAX_GAP_MS && !self.gap_active {
                self.summary().counts.report_gaps =
                    self.summary().counts.report_gaps.saturating_add(1);
                self.gap_active = true;
            }
        }
        if ms >= DEADLINE_MS {
            self.finish(ProbeOutcome::Inconclusive, ProbeEndReason::Deadline);
            return;
        }
        if ms >= 4_000
            && self.status.phase == ProbePhase::Preparation
            && (!self.summary().counts.baseline_established || self.gap_active)
        {
            self.finish(ProbeOutcome::Inconclusive, ProbeEndReason::BaselineMissing);
            return;
        }
        if ms >= COMPLETE_MS {
            let s = self.summary();
            let c = &s.counts;
            let good = c.completed_cycles == 5
                && c.idle_transitions == 0
                && c.outside_phase_edges == 0
                && c.report_gaps == 0
                && c.final_released == Some(true)
                && self.idle_reports >= 2
                && self.final_reports > 0;
            self.finish(
                if good {
                    ProbeOutcome::Observed
                } else {
                    ProbeOutcome::Inconclusive
                },
                if good {
                    ProbeEndReason::Completed
                } else {
                    ProbeEndReason::IncompleteEvidence
                },
            );
            return;
        }
        let (phase, cycle) = phase_at(ms);
        self.status.phase = phase;
        self.status.cycle = cycle;
        self.status.outcome = if phase == ProbePhase::Preparation {
            ProbeOutcome::Preparing
        } else {
            ProbeOutcome::Running
        };
        self.summary().outcome = self.status.outcome;
    }
    fn observe(&mut self, ms: u32, word: Result<u64, bool>) {
        self.tick(ms);
        if !self.status.outcome.active() {
            return;
        }
        let word = match word {
            Ok(word) => word,
            Err(malformed) => {
                let c = &mut self.summary().counts;
                if malformed {
                    c.malformed_reports = c.malformed_reports.saturating_add(1);
                } else {
                    c.incompatible_reports = c.incompatible_reports.saturating_add(1);
                }
                c.framing_changed = true;
                self.finish(ProbeOutcome::Error, ProbeEndReason::FramingChanged);
                return;
            }
        };
        let bit = self.summary().candidate_bit;
        let mask = 1u64 << bit;
        let down = word & mask != 0;
        let last = self.last_word;
        let phase = self.status.phase;
        let cycle = usize::from(self.status.cycle.saturating_sub(1));
        let counts = &mut self.summary().counts;
        counts.compatible_reports = counts.compatible_reports.saturating_add(1);
        counts.final_released = Some(!down);
        if let Some(previous) = last {
            let changed = previous ^ word;
            counts.unrelated_known_changes = counts
                .unrelated_known_changes
                .saturating_add((changed & reports::known_mask() & !mask).count_ones());
            counts.unknown_bit_changes = counts
                .unknown_bit_changes
                .saturating_add((changed & !reports::known_mask()).count_ones());
            if previous & mask != 0 && down {
                counts.repeated_held_reports = counts.repeated_held_reports.saturating_add(1);
            }
            if changed & mask != 0 {
                if down {
                    counts.observed_press_edges = counts.observed_press_edges.saturating_add(1);
                } else {
                    counts.observed_release_edges = counts.observed_release_edges.saturating_add(1);
                }
                if phase == ProbePhase::Idle {
                    counts.idle_transitions = counts.idle_transitions.saturating_add(1);
                }
                let expected = (phase == ProbePhase::Press && down)
                    || (phase == ProbePhase::Release && !down && self.pressed[cycle]);
                if expected {
                    let already = if down {
                        self.pressed[cycle]
                    } else {
                        self.released[cycle]
                    };
                    if already {
                        self.summary().counts.repeated_edges =
                            self.summary().counts.repeated_edges.saturating_add(1);
                    } else if down {
                        self.pressed[cycle] = true;
                        self.summary().counts.expected_press_edges += 1;
                    } else {
                        self.released[cycle] = true;
                        self.summary().counts.expected_release_edges += 1;
                    }
                } else {
                    let c = &mut self.summary().counts;
                    c.outside_phase_edges = c.outside_phase_edges.saturating_add(1);
                    if (down && matches!(phase, ProbePhase::Preparation | ProbePhase::Idle))
                        || (!down && matches!(phase, ProbePhase::Press | ProbePhase::Hold))
                    {
                        c.early_edges = c.early_edges.saturating_add(1);
                    } else {
                        c.late_edges = c.late_edges.saturating_add(1);
                    }
                }
            }
        }
        if phase == ProbePhase::Preparation {
            if word & reports::known_mask() == 0 {
                if last == Some(word) {
                    self.stable_reports += 1;
                } else {
                    self.stable_since = ms;
                    self.stable_reports = 1;
                }
                self.summary().counts.baseline_established =
                    self.stable_reports >= 3 && ms.saturating_sub(self.stable_since) >= 500;
            } else {
                self.stable_reports = 0;
                self.summary().counts.baseline_established = false;
            }
        }
        if phase == ProbePhase::Idle {
            self.idle_reports += 1;
        }
        if phase == ProbePhase::Hold && down {
            self.held[cycle] = true;
        }
        if phase == ProbePhase::Finalizing {
            self.final_reports += 1;
        }
        let completed = (0..5)
            .filter(|i| self.pressed[*i] && self.released[*i] && self.held[*i])
            .count() as u32;
        let c = &mut self.summary().counts;
        c.completed_cycles = completed;
        c.missing_presses = 5 - c.expected_press_edges;
        c.missing_releases = 5 - c.expected_release_edges;
        self.last_word = Some(word);
        self.last_report_ms = Some(ms);
        self.gap_active = false;
    }
}
/// The native adapter supplies Instant; pure tests exercise Probe with fake monotonic milliseconds.
#[derive(Default)]
pub(super) struct Runtime {
    probe: Option<Probe>,
    clock: Option<Instant>,
    token: u32,
    revision: u32,
    owner_generation: Option<u32>,
}
impl Runtime {
    fn elapsed(&self) -> u32 {
        self.clock.map_or(0, |t| {
            t.elapsed().as_millis().min(u128::from(u32::MAX)) as u32
        })
    }
    pub(super) fn bind_owner(&mut self, generation: u32) {
        self.end(ProbeEndReason::MonitoringStopped);
        self.owner_generation = Some(generation);
    }
    pub(super) fn end_owner(&mut self, reason: ProbeEndReason) {
        self.owner_generation = None;
        self.end(reason);
    }
    pub(super) fn start(
        &mut self,
        expected: u32,
        generation: u32,
        candidate: &Candidate,
        control: ControllerControl,
        environment: ProbeEnvironment,
    ) -> Result<ProbeStatus, String> {
        if self.owner_generation != Some(generation) {
            return Err("Owning monitor session stopped or changed.".into());
        }
        if expected != self.token {
            return Err("Probe changed. Refresh before starting.".into());
        }
        if self
            .probe
            .as_ref()
            .is_some_and(|p| p.status.outcome.active())
        {
            return Err("A probe is already active.".into());
        }
        let mut probe = Probe::new(candidate, control, environment)?;
        self.token = self
            .token
            .checked_add(1)
            .ok_or("Restart Nepteer before another probe.")?;
        probe.status.token = self.token;
        probe.status.monitor_generation = generation;
        self.probe = Some(probe);
        self.clock = Some(Instant::now());
        Ok(self.snapshot())
    }
    pub(super) fn snapshot(&mut self) -> ProbeStatus {
        let ms = self.elapsed();
        if let Some(p) = &mut self.probe {
            p.tick(ms);
        }
        self.revision = self.revision.saturating_add(1);
        let mut value = self
            .probe
            .as_ref()
            .map_or_else(ProbeStatus::default, |p| p.status.clone());
        value.token = self.token;
        value.revision = self.revision;
        value
    }
    pub(super) fn observe(&mut self, packet: &[u8]) {
        let ms = self.elapsed();
        if let Some(p) = &mut self.probe {
            if p.status.outcome.active() {
                p.observe(ms, reports::correlation_word(packet));
            }
        }
    }
    pub(super) fn invalid_transport(&mut self) {
        let ms = self.elapsed();
        if let Some(p) = &mut self.probe {
            p.observe(ms, Err(true));
        }
    }
    pub(super) fn end(&mut self, reason: ProbeEndReason) {
        let ms = self.elapsed();
        if let Some(p) = &mut self.probe {
            if p.status.outcome.active() {
                p.summary().elapsed_ms = ms.min(DEADLINE_MS);
                p.finish(
                    if reason == ProbeEndReason::MonitorError {
                        ProbeOutcome::Error
                    } else {
                        ProbeOutcome::Aborted
                    },
                    reason,
                );
            }
        }
    }
    pub(super) fn abort(&mut self, token: u32) -> Result<ProbeStatus, String> {
        if token != self.token {
            return Err("Stale probe token; current probe was not changed.".into());
        }
        self.end(ProbeEndReason::UserAborted);
        Ok(self.snapshot())
    }
}
#[cfg(test)]
pub(crate) fn declarations() -> Vec<String> {
    vec![
        KnownState::decl(),
        ToolsMode::decl(),
        SteamInputState::decl(),
        ProbeEnvironment::decl(),
        ProbeOutcome::decl(),
        ProbePhase::decl(),
        ProbeEndReason::decl(),
        ProbeCounts::decl(),
        ProbeInterface::decl(),
        ProbeSummary::decl(),
        ProbeStatus::decl(),
        ProbeStartRequest::decl(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    fn candidate() -> Candidate {
        let mut c = simulated_candidate().public;
        c.input_report_length = Some(65);
        c.usage_page = Some(0xffff);
        c
    }
    fn probe() -> Probe {
        Probe::new(
            &candidate(),
            ControllerControl::A,
            ProbeEnvironment::default(),
        )
        .unwrap()
    }
    fn packet(word: u64) -> Vec<u8> {
        [&[0u8][..], &reports::synthetic_report(word)].concat()
    }
    fn planned(ms: u32) -> u64 {
        if (7_000..27_000).contains(&ms) && (200..2_700).contains(&((ms - 7_000) % 4_000)) {
            1 << 7
        } else {
            0
        }
    }
    fn drive(p: &mut Probe, change: impl Fn(u32, u64) -> u64) {
        for ms in (0..=29_000).step_by(100) {
            p.observe(
                ms,
                reports::correlation_word(&packet(change(ms, planned(ms)))),
            );
        }
    }
    #[test]
    fn exact_format_and_interface_gate_reuse_checked_parser() {
        assert_eq!(reports::correlation_word(&packet(0)), Ok(0));
        assert_eq!(
            reports::correlation_word(&reports::synthetic_report(0)),
            Err(false)
        );
        let mut wrong = packet(0);
        wrong[0] = 1;
        assert!(reports::correlation_word(&wrong).is_err());
        wrong = packet(0);
        wrong[3] = 8;
        assert!(reports::correlation_word(&wrong).is_err());
        wrong = packet(0);
        wrong[4] = 63;
        assert_eq!(reports::correlation_word(&wrong), Err(true));
        assert!(reports::correlation_word(&packet(0)[..10]).is_err());
        assert!(reports::correlation_word(&[packet(0), vec![0]].concat()).is_err());
        for variant in 0..5 {
            let mut c = candidate();
            match variant {
                0 => c.input_report_length = Some(64),
                1 => c.usage_page = Some(1),
                2 => c.usage = Some(6),
                3 => c.attributes_verified = false,
                _ => c.vendor_id = 0x45e,
            }
            assert!(Probe::new(&c, ControllerControl::A, ProbeEnvironment::default()).is_err());
        }
        assert!(Probe::new(
            &candidate(),
            ControllerControl::L4,
            ProbeEnvironment::default()
        )
        .is_err());
    }
    #[test]
    fn five_cycles_are_observations_not_verification() {
        let mut p = probe();
        drive(&mut p, |_, word| word);
        assert_eq!(p.status.outcome, ProbeOutcome::Observed);
        let c = &p.summary().counts;
        assert!(c.baseline_established && c.final_released == Some(true));
        assert_eq!(
            (
                c.expected_press_edges,
                c.expected_release_edges,
                c.completed_cycles
            ),
            (5, 5, 5)
        );
        assert_eq!(
            (c.missing_presses, c.missing_releases, c.idle_transitions),
            (0, 0, 0)
        );
        assert!(c.repeated_held_reports > 5);
        assert!(p.last_word.is_none());
        let text = serde_json::to_string(p.status.summary.as_ref().unwrap()).unwrap();
        for private in [
            "lastWord",
            "raw",
            "path",
            "serial",
            "token",
            "candidateId",
            "button_verified",
            "physicalButtonsVerified",
        ] {
            assert!(!text.contains(private));
        }
        let mut normal = MonitorStatus::default();
        reports::Processor::new(DiagnosticsMode::Native).process(&packet(1 << 7), 100, &mut normal);
        assert!(
            normal.controls.iter().all(|v| v.pressed.is_none()) && normal.transitions.is_empty()
        );
        assert!(!normal.report.framing_verified && !normal.report.physical_buttons_verified);
    }
    #[test]
    fn baseline_requires_multiple_stable_released_reports_and_no_rate_is_inconclusive() {
        let mut p = probe();
        p.tick(4_000);
        assert_eq!(p.status.outcome, ProbeOutcome::Inconclusive);
        assert_eq!(p.summary().counts.compatible_reports, 0);
        let mut p = probe();
        for ms in [0, 300, 600] {
            p.observe(ms, Ok(0));
        }
        assert!(p.summary().counts.baseline_established);
        p.tick(4_000);
        assert_eq!(p.status.outcome, ProbeOutcome::Inconclusive); // stale baseline
        let mut p = probe();
        for ms in (0..=4_000).step_by(100) {
            p.observe(ms, Ok(1 << 7));
        }
        assert!(!p.summary().counts.baseline_established);
        assert_eq!(p.status.outcome, ProbeOutcome::Inconclusive);
    }
    #[test]
    fn idle_reports_counters_and_held_reports_do_not_create_edges() {
        let mut p = probe();
        for ms in (0u32..=28_900).step_by(100) {
            let mut bytes = packet(0);
            // Change only packet counter bytes, not the candidate word.
            bytes[5..9].copy_from_slice(&ms.to_le_bytes());
            p.observe(ms, reports::correlation_word(&bytes));
        }
        p.tick(29_000);
        let c = &p.summary().counts;
        assert_eq!(
            (
                c.observed_press_edges,
                c.observed_release_edges,
                c.idle_transitions,
                c.unrelated_known_changes,
                c.unknown_bit_changes
            ),
            (0, 0, 0, 0, 0)
        );
        assert_eq!(p.status.outcome, ProbeOutcome::Inconclusive);
    }
    #[test]
    fn early_late_missing_release_and_idle_false_positives_are_inconclusive() {
        for variant in 0..4 {
            let mut p = probe();
            drive(&mut p, |ms, word| match variant {
                0 if (4_500..4_700).contains(&ms) => 1 << 7,
                1 if (7_200..7_400).contains(&ms) => 0, // shift first press late into hold
                1 if (7_400..8_600).contains(&ms) => 0,
                2 if (25_700..29_000).contains(&ms) => 1 << 7, // missing final release
                3 if (8_000..8_100).contains(&ms) => 0,        // early release and repeated press
                _ => word,
            });
            assert_eq!(p.status.outcome, ProbeOutcome::Inconclusive);
            if variant == 0 {
                assert_eq!(p.summary().counts.idle_transitions, 2);
            }
            if variant == 1 {
                assert!(p.summary().counts.late_edges > 0);
            }
            if variant == 2 {
                assert!(p.summary().counts.missing_releases > 0);
            }
            if variant == 3 {
                assert!(
                    p.summary().counts.early_edges > 0 && p.summary().counts.repeated_edges > 0
                );
            }
        }
    }
    #[test]
    fn other_known_unknown_and_simultaneous_changes_count_edges_not_held_reports() {
        let mut p = probe();
        drive(&mut p, |ms, word| {
            if (12_000..12_900).contains(&ms) {
                word | (1 << 5) | (1u64 << 63)
            } else {
                word
            }
        });
        assert_eq!(p.summary().counts.unrelated_known_changes, 2);
        assert_eq!(p.summary().counts.unknown_bit_changes, 2);
        // Noise is diagnostic context, not automatic mapping failure or verification.
        assert_eq!(p.status.outcome, ProbeOutcome::Observed);
    }
    #[test]
    fn framing_changes_malformed_packets_and_deadline_end_without_positive_result() {
        for malformed in [false, true] {
            let mut p = probe();
            p.observe(0, Ok(0));
            p.observe(100, Err(malformed));
            assert_eq!(p.status.outcome, ProbeOutcome::Error);
            assert!(p.summary().counts.framing_changed && p.last_word.is_none());
        }
        let mut p = probe();
        p.tick(30_000);
        assert_eq!(p.status.outcome, ProbeOutcome::Inconclusive);
        assert_eq!(p.summary().reason, Some(ProbeEndReason::Deadline));
        let reports = p.summary().counts.compatible_reports;
        p.observe(31_000, Ok(1 << 7));
        assert_eq!(p.summary().counts.compatible_reports, reports);
    }
    #[test]
    fn report_gaps_and_absent_hold_samples_prevent_positive_result() {
        let mut p = probe();
        for ms in (0..=29_000).step_by(100) {
            if !(11_500..14_000).contains(&ms) {
                p.observe(ms, Ok(planned(ms)));
            } else {
                p.tick(ms);
            }
        }
        assert!(p.summary().counts.report_gaps > 0);
        assert_eq!(p.status.outcome, ProbeOutcome::Inconclusive);
    }
    #[test]
    fn token_duplicate_abort_and_owner_stop_reasons_are_bounded() {
        let mut r = Runtime::default();
        r.bind_owner(3);
        let initial = r
            .start(
                0,
                3,
                &candidate(),
                ControllerControl::A,
                ProbeEnvironment::default(),
            )
            .unwrap();
        assert!(r
            .start(
                0,
                3,
                &candidate(),
                ControllerControl::A,
                ProbeEnvironment::default()
            )
            .is_err());
        assert!(r.abort(0).is_err());
        assert!(r.snapshot().outcome.active());
        assert_eq!(
            r.abort(initial.token).unwrap().outcome,
            ProbeOutcome::Aborted
        );
        assert!(r
            .start(
                0,
                3,
                &candidate(),
                ControllerControl::B,
                ProbeEnvironment::default()
            )
            .is_err());
        for reason in [
            ProbeEndReason::MonitoringStopped,
            ProbeEndReason::MonitorError,
            ProbeEndReason::Rescan,
            ProbeEndReason::Shutdown,
            ProbeEndReason::SessionExpired,
        ] {
            let token = r.snapshot().token;
            r.bind_owner(4);
            r.start(
                token,
                4,
                &candidate(),
                ControllerControl::A,
                ProbeEnvironment::default(),
            )
            .unwrap();
            r.end_owner(reason);
            let s = r.snapshot();
            assert!(!s.outcome.active());
            assert_eq!(s.summary.unwrap().reason, Some(reason));
            assert!(r.probe.as_ref().unwrap().last_word.is_none());
        }
        let token = r.snapshot().token;
        r.bind_owner(5);
        r.start(
            token,
            5,
            &candidate(),
            ControllerControl::A,
            ProbeEnvironment::default(),
        )
        .unwrap();
        r.clock = Some(Instant::now() - Duration::from_secs(31));
        assert_eq!(
            r.snapshot().summary.unwrap().reason,
            Some(ProbeEndReason::Deadline)
        );
    }
}
