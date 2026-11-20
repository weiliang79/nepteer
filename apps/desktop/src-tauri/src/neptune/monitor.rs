use super::*;
use std::time::Instant;

pub(super) fn run(
    backend: Arc<dyn DiscoveryBackend>,
    candidate: PrivateCandidate,
    cancel: Arc<AtomicBool>,
    data: Arc<Mutex<DiagnosticsSnapshot>>,
    notify: Notify,
    limit: Duration,
) {
    let result = observe(backend, candidate, &cancel, &data, &notify, limit);
    // observe has returned and its reader/buffers/OS handles have already been dropped.
    if let Ok(mut state) = data.lock() {
        state.monitor.opened = false;
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
) -> Result<(), InputFailure> {
    if cancel.load(Ordering::SeqCst) {
        return Ok(());
    }
    let mut reader = backend.open(&candidate)?;
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
    let descriptor_length = usize::from(candidate.public.input_report_length.unwrap_or(0));
    let result = (|| {
        while !cancel.load(Ordering::SeqCst) {
            if start.elapsed() >= limit {
                return Err(InputFailure::new(InputErrorKind::SessionLimit,"The five-minute diagnostic session ended. Start Monitoring explicitly to begin another session."));
            }
            if let Some(length) = reader.read(&mut buffer, 100)? {
                reports::inspect(length, descriptor_length)?;
                if let Ok(mut state) = data.lock() {
                    state.monitor.phase = MonitorPhase::RawInputOnly;
                    state.monitor.report_count = state.monitor.report_count.saturating_add(1);
                    state.monitor.last_report_length = Some(length as u16);
                    state.monitor.last_report_at_unix_ms = now_ms();
                    if last_emit.elapsed() >= Duration::from_millis(250) {
                        let snapshot = state.clone();
                        drop(state);
                        notify(&snapshot);
                        last_emit = Instant::now();
                    }
                }
                // Bound CPU even if a driver returns buffered reports immediately.
                std::thread::sleep(Duration::from_millis(1));
            }
        }
        Ok(())
    })();
    buffer.fill(0);
    drop(reader);
    result
}
