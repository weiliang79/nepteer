use super::*;
use std::time::Instant;

pub(super) fn run(
    backend: Arc<dyn DiscoveryBackend>,
    candidate: PrivateCandidate,
    cancel: Arc<AtomicBool>,
    data: Arc<Mutex<DiagnosticsSnapshot>>,
    notify: Notify,
    limit: Duration,
    probe: Arc<Mutex<correlation::Runtime>>,
) {
    let result = observe(backend, candidate, &cancel, &data, &notify, limit, &probe);
    if let Ok(mut p) = probe.lock() {
        if matches!(&result, Err(issue) if issue.kind == InputErrorKind::UnsupportedReportFormat) {
            p.invalid_transport();
        }
        p.end_owner(match &result {
            Ok(()) => correlation::ProbeEndReason::MonitoringStopped,
            Err(issue) if issue.kind == InputErrorKind::SessionLimit => {
                correlation::ProbeEndReason::SessionExpired
            }
            _ => correlation::ProbeEndReason::MonitorError,
        });
    }
    // observe has returned and its reader/buffers/OS handles have already been dropped.
    if let Ok(mut state) = data.lock() {
        state.monitor.opened = false;
        state.monitor.button_decoding_supported = false;
        state.monitor.controls = reports::unavailable_controls();
        state.monitor.transitions.clear();
        match result {
            Ok(()) => state.monitor.phase = MonitorPhase::Stopped,
            Err(issue) => {
                state.monitor.phase = if issue.kind == InputErrorKind::SessionLimit {
                    MonitorPhase::Stopped
                } else {
                    issue.phase()
                };
                state.monitor.issue = Some(issue);
            }
        }
        let snapshot = state.clone();
        drop(state);
        let mut snapshot = snapshot;
        if let Ok(mut p) = probe.lock() {
            snapshot.probe = p.snapshot();
        }
        notify(&snapshot);
    }
}
fn observe(
    backend: Arc<dyn DiscoveryBackend>,
    candidate: PrivateCandidate,
    cancel: &AtomicBool,
    data: &Mutex<DiagnosticsSnapshot>,
    notify: &Notify,
    limit: Duration,
    probe: &Mutex<correlation::Runtime>,
) -> Result<(), InputFailure> {
    if cancel.load(Ordering::SeqCst) {
        return Ok(());
    }
    let mut reader = backend.open(&candidate)?;
    let mut processor = reports::Processor::new(candidate.mode);
    if let Ok(mut state) = data.lock() {
        state.monitor.opened = true;
        state.monitor.phase = MonitorPhase::AwaitingReports;
        let snapshot = state.clone();
        drop(state);
        notify(&snapshot);
    }
    let mut buffer = vec![0u8; MAX_REPORT];
    let start = Instant::now();
    let mut last_emit = Instant::now();
    let mut last_probe_outcome = correlation::ProbeOutcome::NotStarted;
    let mut reports_changed = false;
    let descriptor_length = usize::from(candidate.public.input_report_length.unwrap_or(0));
    let result = (|| {
        while !cancel.load(Ordering::SeqCst) {
            if start.elapsed() >= limit {
                return Err(InputFailure::new(InputErrorKind::SessionLimit,"The five-minute diagnostic session ended. Start Monitoring explicitly to begin another session."));
            }
            if let Some(length) = reader.read(&mut buffer, 100)? {
                reports::inspect(length, descriptor_length)?;
                reports_changed = true;
                if let Ok(mut p) = probe.lock() {
                    p.observe(&buffer[..length]);
                }
                // Parse/update outside the shared mutex; callbacks also run after releasing it.
                let mut status = data
                    .lock()
                    .map_err(|_| {
                        InputFailure::new(InputErrorKind::Internal, "Controller state unavailable.")
                    })?
                    .monitor
                    .clone();
                processor.process(
                    &buffer[..length],
                    start.elapsed().as_millis().min(u128::from(u32::MAX)) as u32,
                    &mut status,
                );
                buffer[..length].fill(0); // Drop raw packet contents immediately after analysis.
                if let Ok(mut state) = data.lock() {
                    state.monitor = status;
                    state.monitor.report_count = state.monitor.report_count.saturating_add(1);
                    state.monitor.last_report_length = Some(length as u16);
                    state.monitor.last_report_at_unix_ms = now_ms();
                }
                // Bound CPU even if a driver returns buffered reports immediately.
                std::thread::sleep(Duration::from_millis(1));
            }
            let progress = probe
                .lock()
                .map_err(|_| InputFailure::new(InputErrorKind::Internal, "Probe unavailable."))?
                .snapshot();
            let terminal = progress.outcome != last_probe_outcome && !progress.outcome.active();
            if (last_emit.elapsed() >= Duration::from_millis(250)
                && (reports_changed || progress.outcome.active()))
                || terminal
            {
                let mut snapshot = data
                    .lock()
                    .map_err(|_| {
                        InputFailure::new(InputErrorKind::Internal, "Controller state unavailable.")
                    })?
                    .clone();
                snapshot.probe = progress.clone();
                notify(&snapshot);
                last_emit = Instant::now();
                reports_changed = false;
            }
            last_probe_outcome = progress.outcome;
        }
        Ok(())
    })();
    buffer.fill(0);
    drop(reader);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    struct ScriptedBackend {
        disconnected: Arc<AtomicBool>,
        dropped: Arc<AtomicBool>,
    }
    struct ScriptedReader {
        reads: u32,
        disconnected: Arc<AtomicBool>,
        dropped: Arc<AtomicBool>,
    }
    impl Drop for ScriptedReader {
        fn drop(&mut self) {
            self.dropped.store(true, Ordering::SeqCst);
        }
    }
    impl DiscoveryBackend for ScriptedBackend {
        fn discover(&self, _: DiagnosticsMode) -> Result<Vec<PrivateCandidate>, InputFailure> {
            Ok(Vec::new())
        }
        fn open(&self, _: &PrivateCandidate) -> Result<Box<dyn InputReader>, InputFailure> {
            Ok(Box::new(ScriptedReader {
                reads: 0,
                disconnected: self.disconnected.clone(),
                dropped: self.dropped.clone(),
            }))
        }
    }
    impl InputReader for ScriptedReader {
        fn read(&mut self, buffer: &mut [u8], _: u32) -> Result<Option<usize>, InputFailure> {
            std::thread::sleep(Duration::from_millis(2));
            if self.disconnected.load(Ordering::SeqCst) {
                return Err(InputFailure::new(
                    InputErrorKind::Disconnected,
                    "Synthetic disconnect",
                ));
            }
            if self.reads >= 2 {
                return Ok(None);
            }
            buffer[..64].copy_from_slice(&reports::synthetic_report(if self.reads == 0 {
                0
            } else {
                1 << 7
            }));
            self.reads += 1;
            Ok(Some(64))
        }
    }
    #[test]
    fn timeouts_do_not_release_and_cancel_or_disconnect_invalidates_decoded_state() {
        for disconnect in [false, true] {
            let disconnected = Arc::new(AtomicBool::new(false));
            let dropped = Arc::new(AtomicBool::new(false));
            let cancel = Arc::new(AtomicBool::new(false));
            let data = Arc::new(Mutex::new(DiagnosticsSnapshot {
                source: InputSource::Simulated,
                ..Default::default()
            }));
            let worker = {
                let backend = Arc::new(ScriptedBackend {
                    disconnected: disconnected.clone(),
                    dropped: dropped.clone(),
                });
                let data = data.clone();
                let cancel = cancel.clone();
                std::thread::spawn(move || {
                    run(
                        backend,
                        simulated_candidate(),
                        cancel,
                        data,
                        Arc::new(|_| {}),
                        Duration::from_secs(2),
                        Arc::new(Mutex::new(correlation::Runtime::default())),
                    )
                })
            };
            let deadline = Instant::now() + Duration::from_secs(1);
            while data.lock().unwrap().monitor.report_count < 2 {
                assert!(Instant::now() < deadline);
                std::thread::sleep(Duration::from_millis(2));
            }
            std::thread::sleep(Duration::from_millis(10)); // synthetic read timeouts, not release packets
            let held = data.lock().unwrap().clone();
            assert_eq!(held.monitor.report_count, 2);
            assert_eq!(held.monitor.transitions.len(), 1);
            assert!(held
                .monitor
                .controls
                .iter()
                .any(|c| c.pressed == Some(true)));
            if disconnect {
                disconnected.store(true, Ordering::SeqCst);
            } else {
                cancel.store(true, Ordering::SeqCst);
            }
            worker.join().unwrap();
            let final_state = data.lock().unwrap();
            assert_eq!(
                final_state.monitor.phase,
                if disconnect {
                    MonitorPhase::Disconnected
                } else {
                    MonitorPhase::Stopped
                }
            );
            assert!(final_state
                .monitor
                .controls
                .iter()
                .all(|c| c.pressed.is_none()));
            assert!(
                final_state.monitor.transitions.is_empty()
                    && !final_state.monitor.button_decoding_supported
            );
            assert_eq!(final_state.source, InputSource::Simulated);
            assert!(dropped.load(Ordering::SeqCst));
        }
    }
}
