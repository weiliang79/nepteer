//! Original, safe candidate decoder. Protocol facts/attribution: docs/NEPTUNE_RESEARCH.md.
//! Matching published bytes is NOT physical framing/button verification.
use super::*;
use std::collections::VecDeque;

pub(super) const HISTORY_LIMIT: usize = 32;
// Phase 1 only. Bit indices in a little-endian 64-bit word at message offset 8.
// SDL publishes low/high masks; our implementation uses a single explicit bit index.
const BUTTONS: [(ControllerControl, u8); 12] = [
    (ControllerControl::A, 7),
    (ControllerControl::B, 5),
    (ControllerControl::X, 6),
    (ControllerControl::Y, 4),
    (ControllerControl::DpadUp, 8),
    (ControllerControl::DpadDown, 11),
    (ControllerControl::DpadLeft, 10),
    (ControllerControl::DpadRight, 9),
    (ControllerControl::L1, 3),
    (ControllerControl::R1, 2),
    (ControllerControl::Steam, 13),
    (ControllerControl::QuickAccess, 50),
];
#[derive(Debug, PartialEq)]
pub(super) struct CandidateReport {
    format: ReportFormat,
    buttons: u64,
}
#[derive(Debug, PartialEq)]
pub(super) enum Classification {
    Candidate(CandidateReport),
    Unsupported(ParseIssue),
    Malformed(ParseIssue),
}
/// No searching for a header within arbitrary packets, no packed structs or unsafe casts.
pub(super) fn classify(bytes: &[u8]) -> Classification {
    use Classification::*;
    use ParseIssue::*;
    if bytes.len() == 65 && !bytes.starts_with(&[0]) && !bytes.starts_with(&[1, 0, 9]) {
        return Unsupported(UnsupportedPrefix);
    }
    let (format, body) = if bytes.starts_with(&[0]) {
        (
            ReportFormat::DeckV1ZeroPrefixed65,
            bytes.get(1..).unwrap_or_default(),
        )
    } else {
        (ReportFormat::DeckV1Bare64, bytes)
    };
    if body.len() < 4 {
        return Malformed(Truncated);
    }
    let Some(version) = body.get(..2).and_then(|b| <[u8; 2]>::try_from(b).ok()) else {
        return Malformed(Truncated);
    };
    if u16::from_le_bytes(version) != 1 {
        return Unsupported(UnsupportedVersion);
    }
    if body.get(2) != Some(&9) {
        return Unsupported(UnsupportedMessage);
    }
    if body.len() < 64 {
        return Malformed(Truncated);
    }
    if body.len() > 64 {
        return Malformed(Oversized);
    }
    if body.get(3) != Some(&64) {
        return Malformed(InvalidDeclaredLength);
    }
    let Some(word) = body.get(8..16).and_then(|b| <[u8; 8]>::try_from(b).ok()) else {
        return Malformed(Truncated);
    };
    Candidate(CandidateReport {
        format,
        buttons: u64::from_le_bytes(word),
    })
}
/// Internal-only correlation input. Reuses the checked parser, never crosses IPC.
pub(super) fn correlation_word(bytes: &[u8]) -> Result<u64, bool> {
    match classify(bytes) {
        Classification::Candidate(frame) if frame.format == ReportFormat::DeckV1ZeroPrefixed65 => {
            Ok(frame.buttons)
        }
        Classification::Malformed(_) => Err(true),
        _ => Err(false),
    }
}
pub(super) fn candidate_bit(control: ControllerControl) -> Option<u8> {
    BUTTONS
        .iter()
        .find(|(value, _)| *value == control)
        .map(|(_, bit)| *bit)
}
pub(super) fn known_mask() -> u64 {
    BUTTONS
        .iter()
        .fold(0, |mask, (_, bit)| mask | (1u64 << bit))
}
/// Preserve Step 4 terminal transport-length policy before classifying packet content.
pub(super) fn inspect(length: usize, descriptor_length: usize) -> Result<(), InputFailure> {
    if length == 0 || length > descriptor_length || length > MAX_REPORT {
        Err(InputFailure::new(
            InputErrorKind::UnsupportedReportFormat,
            "Invalid input report length; monitoring stopped without interpreting bytes.",
        ))
    } else {
        Ok(())
    }
}
pub(super) fn unavailable_controls() -> Vec<ControlObservation> {
    use ControllerControl::*;
    [
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
    ]
    .into_iter()
    .map(|control| ControlObservation {
        control,
        pressed: None,
        verification: MappingVerification::Unavailable,
    })
    .collect()
}
fn controls(frame: &CandidateReport, simulated: bool) -> Vec<ControlObservation> {
    let mut result = unavailable_controls();
    for observation in &mut result {
        if let Some((_, bit)) = BUTTONS.iter().find(|(c, _)| *c == observation.control) {
            observation.verification = if simulated {
                MappingVerification::Simulated
            } else {
                MappingVerification::Candidate
            };
            // No physical allowlist exists in Step 5A. Candidate bits never become live states.
            if simulated {
                observation.pressed = Some(frame.buttons & (1u64 << bit) != 0);
            }
        }
    }
    result
}
/// Pure transition detector. Worker-local and session-local, with deterministic control order.
#[derive(Default)]
struct Transitions {
    baseline: Option<CandidateReport>,
    history: VecDeque<ButtonTransition>,
    sequence: u32,
}
impl Transitions {
    fn reset(&mut self) {
        *self = Self::default();
    }
    fn update(&mut self, frame: CandidateReport, at_session_ms: u32) {
        if self
            .baseline
            .as_ref()
            .is_some_and(|last| last.format != frame.format)
        {
            self.reset();
        }
        if let Some(last) = &self.baseline {
            for (control, bit) in BUTTONS {
                let mask = 1u64 << bit;
                if (last.buttons ^ frame.buttons) & mask != 0 {
                    self.sequence = self.sequence.saturating_add(1);
                    if self.history.len() == HISTORY_LIMIT {
                        self.history.pop_front();
                    }
                    self.history.push_back(ButtonTransition {
                        sequence: self.sequence,
                        at_session_ms,
                        source: InputSource::Simulated,
                        control,
                        pressed: frame.buttons & mask != 0,
                    });
                }
            }
        }
        self.baseline = Some(frame); // First report is baseline, never a historical press.
    }
}
/// Worker-local decoding policy cannot be selected or promoted through IPC.
pub(super) struct Processor {
    simulated: bool,
    transitions: Transitions,
}
impl Processor {
    pub(super) fn new(mode: DiagnosticsMode) -> Self {
        Self {
            simulated: mode == DiagnosticsMode::Simulated,
            transitions: Transitions::default(),
        }
    }
    pub(super) fn process(&mut self, bytes: &[u8], elapsed_ms: u32, monitor: &mut MonitorStatus) {
        // Preserve aggregate counters, replace only the last packet's format observations.
        let report = &mut monitor.report;
        report.format = None;
        report.report_id = None;
        report.message_type = None;
        report.last_issue = None;
        report.framing_verified = false;
        report.physical_buttons_verified = false;
        monitor.button_decoding_supported = false;
        monitor.controls = unavailable_controls();
        monitor.phase = MonitorPhase::RawInputOnly;
        match classify(bytes) {
            Classification::Candidate(frame) => {
                report.recognition = ReportRecognition::Candidate;
                report.format = Some(frame.format);
                report.report_id =
                    (frame.format == ReportFormat::DeckV1ZeroPrefixed65).then_some(0);
                report.message_type = Some(9);
                report.candidate_report_count = report.candidate_report_count.saturating_add(1);
                monitor.controls = controls(&frame, self.simulated);
                if self.simulated {
                    monitor.button_decoding_supported = true;
                    monitor.phase = MonitorPhase::SimulatedInput;
                    self.transitions.update(frame, elapsed_ms);
                } else {
                    self.transitions.reset();
                }
            }
            Classification::Unsupported(issue) => {
                report.recognition = ReportRecognition::Unsupported;
                report.last_issue = Some(issue);
                report.unsupported_report_count = report.unsupported_report_count.saturating_add(1);
                self.transitions.reset(); // Different/unknown format requires a new baseline.
            }
            Classification::Malformed(issue) => {
                report.recognition = ReportRecognition::Malformed;
                report.last_issue = Some(issue);
                report.malformed_report_count = report.malformed_report_count.saturating_add(1);
                // Invalidate displayed held state, but never turn invalid bytes into releases.
                // Preserve baseline/history so a subsequent identical valid state adds no press.
            }
        }
        monitor.transitions = self.transitions.history.iter().cloned().collect();
    }
}
/// Deterministic synthetic fixture/source, not a captured controller report.
pub(super) fn synthetic_report(buttons: u64) -> [u8; 64] {
    let mut bytes = [0; 64];
    bytes[..4].copy_from_slice(&[1, 0, 9, 64]);
    bytes[8..16].copy_from_slice(&buttons.to_le_bytes());
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;
    fn frame(bytes: &[u8]) -> CandidateReport {
        match classify(bytes) {
            Classification::Candidate(report) => report,
            value => panic!("expected candidate, got {value:?}"),
        }
    }
    #[test]
    fn candidate_framing_is_explicit_and_never_physical_verification() {
        let bare = synthetic_report(0);
        assert_eq!(&bare[..4], &[1, 0, 9, 64]);
        assert_eq!(frame(&bare).format, ReportFormat::DeckV1Bare64);
        let prefixed = [&[0u8][..], &bare].concat();
        assert_eq!(frame(&prefixed).format, ReportFormat::DeckV1ZeroPrefixed65);
        let mut status = MonitorStatus::default();
        let mut native = Processor::new(DiagnosticsMode::Native);
        for index in 0..100 {
            native.process(
                &synthetic_report(if index % 2 == 0 { u64::MAX } else { 0 }),
                index,
                &mut status,
            );
            assert_eq!(status.report.recognition, ReportRecognition::Candidate);
            assert!(!status.report.framing_verified && !status.report.physical_buttons_verified);
            assert!(!status.button_decoding_supported);
            assert!(status.controls.iter().all(|c| c.pressed.is_none()));
            assert!(status.transitions.is_empty());
        }
        native.process(&prefixed, 101, &mut status);
        assert_eq!(status.report.report_id, Some(0));
        assert_eq!(status.report.message_type, Some(9));
        assert_eq!(status.phase, MonitorPhase::RawInputOnly);
    }
    #[test]
    fn unknown_and_malformed_packets_are_distinct() {
        use Classification::*;
        use ParseIssue::*;
        let valid = synthetic_report(0);
        for len in 0..64 {
            assert_eq!(classify(&valid[..len]), Malformed(Truncated));
        }
        let mut long = valid.to_vec();
        long.push(0);
        assert_eq!(classify(&long), Malformed(Oversized));
        let mut bytes = valid;
        bytes[0] = 2;
        assert_eq!(classify(&bytes), Unsupported(UnsupportedVersion));
        bytes = valid;
        bytes[2] = 1;
        assert_eq!(classify(&bytes), Unsupported(UnsupportedMessage));
        bytes = valid;
        bytes[3] = 60;
        assert_eq!(classify(&bytes), Malformed(InvalidDeclaredLength));
        let unknown_id = [&[3u8][..], &valid].concat();
        assert_eq!(classify(&unknown_id), Unsupported(UnsupportedPrefix));
        // No header hunting in larger or unrelated payloads.
        let shifted = [&[0u8, 0][..], &valid].concat();
        assert!(matches!(classify(&shifted), Unsupported(_)));
        assert!(inspect(66, 65).is_err());
        assert!(inspect(0, 65).is_err());
    }
    #[test]
    fn arbitrary_slices_never_panic() {
        for size in 0..=MAX_REPORT + 1 {
            let mut bytes = vec![0xA5; size];
            for prefix in [0, 1, 9, 255] {
                if let Some(first) = bytes.first_mut() {
                    *first = prefix;
                }
                let _ = classify(&bytes);
            }
        }
    }
    #[test]
    fn phase_one_masks_are_independent_and_other_bits_stay_unavailable() {
        use ControllerControl::*;
        // Explicit byte/mask facts, independent of BUTTONS and the u64 fixture writer.
        for (control, byte, mask) in [
            (A, 8, 0x80),
            (B, 8, 0x20),
            (X, 8, 0x40),
            (Y, 8, 0x10),
            (DpadUp, 9, 1),
            (DpadDown, 9, 8),
            (DpadLeft, 9, 4),
            (DpadRight, 9, 2),
            (L1, 8, 8),
            (R1, 8, 4),
            (Steam, 9, 0x20),
            (QuickAccess, 14, 4),
        ] {
            let mut bytes = synthetic_report(0);
            bytes[byte] = mask;
            let values = controls(&frame(&bytes), true);
            assert_eq!(values.iter().filter(|v| v.pressed == Some(true)).count(), 1);
            assert_eq!(
                values
                    .iter()
                    .find(|v| v.control == control)
                    .unwrap()
                    .pressed,
                Some(true)
            );
        }
        let values = controls(&frame(&synthetic_report(u64::MAX)), true);
        assert_eq!(
            values.iter().filter(|v| v.pressed == Some(true)).count(),
            12
        );
        assert!(values
            .iter()
            .filter(|v| !BUTTONS.iter().any(|(c, _)| c == &v.control))
            .all(|v| v.pressed.is_none() && v.verification == MappingVerification::Unavailable));
        let released = controls(&frame(&synthetic_report(0)), true);
        assert_eq!(
            released.iter().filter(|v| v.pressed == Some(false)).count(),
            12
        );
    }
    #[test]
    fn baseline_held_release_simultaneous_and_history_bounds_are_deterministic() {
        let mut tracker = Transitions::default();
        let a = 1u64 << 7;
        tracker.update(frame(&synthetic_report(a)), 0);
        assert!(tracker.history.is_empty()); // Held on the first report: no invented press.
        for _ in 0..5 {
            tracker.update(frame(&synthetic_report(a)), 1);
        }
        assert!(tracker.history.is_empty());
        tracker.update(frame(&synthetic_report(0)), 20);
        assert_eq!(tracker.history.len(), 1);
        assert!(!tracker.history[0].pressed);
        tracker.update(frame(&synthetic_report(a | (1u64 << 50))), 30);
        assert_eq!(tracker.history.len(), 3);
        assert_eq!(tracker.history[1].control, ControllerControl::A);
        assert_eq!(tracker.history[2].control, ControllerControl::QuickAccess);
        assert_eq!(tracker.history[2].at_session_ms, 30);
        assert!(tracker
            .history
            .iter()
            .all(|t| t.source == InputSource::Simulated));
        for n in 0..100 {
            tracker.update(
                frame(&synthetic_report(if n % 2 == 0 { 0 } else { a })),
                40 + n,
            );
        }
        assert_eq!(tracker.history.len(), HISTORY_LIMIT);
        assert!(tracker.history.front().unwrap().sequence > 1);
        assert!(tracker
            .history
            .iter()
            .zip(tracker.history.iter().skip(1))
            .all(|(a, b)| a.sequence < b.sequence));
        let prefix = [&[0u8][..], &synthetic_report(a)].concat();
        tracker.update(frame(&prefix), 200); // Format switch: new baseline, no inferred edge.
        assert!(tracker.history.is_empty());
        tracker.reset();
        assert!(tracker.baseline.is_none() && tracker.history.is_empty());
    }
    #[test]
    fn malformed_or_unknown_packets_never_fabricate_releases_or_promote_evidence() {
        let mut processor = Processor::new(DiagnosticsMode::Simulated);
        let mut state = MonitorStatus::default();
        processor.process(&synthetic_report(0), 0, &mut state);
        processor.process(&synthetic_report(1 << 7), 1, &mut state);
        assert_eq!(state.transitions.len(), 1);
        processor.process(&synthetic_report(0)[..10], 2, &mut state);
        assert_eq!(state.report.recognition, ReportRecognition::Malformed);
        assert!(state.controls.iter().all(|v| v.pressed.is_none()));
        assert_eq!(state.transitions.len(), 1); // No false release on the malformed packet.
        processor.process(&synthetic_report(1 << 7), 3, &mut state);
        assert_eq!(state.transitions.len(), 1); // No duplicate press on recovery.
        processor.process(&synthetic_report(0), 4, &mut state);
        assert_eq!(state.transitions.len(), 2);
        assert!(!state.transitions[1].pressed);
        processor.process(&[0x42; 64], 5, &mut state);
        assert_eq!(state.report.recognition, ReportRecognition::Unsupported);
        assert!(state.transitions.is_empty());
        processor.process(&synthetic_report(1 << 7), 6, &mut state);
        assert!(state.transitions.is_empty()); // New baseline after unknown format.
        assert!(!state.report.framing_verified && !state.report.physical_buttons_verified);
    }
}
