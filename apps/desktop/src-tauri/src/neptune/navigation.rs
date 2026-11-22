//! Private input state and bounded abstract delivery; never an input event stream.
use super::shortcut::Ticket;
use super::{reports, ControllerControl};
use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    sync::{Condvar, Mutex},
    time::{Duration, Instant},
};
use ts_rs::TS;
pub const EVENT: &str = "qam-navigation";
const DELIVERY: Duration = Duration::from_millis(500);
#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NavigationAction {
    Previous,
    Next,
    Left,
    Right,
    Activate,
    Back,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NavigationRequest {
    pub generation: u32,
    pub epoch: u32,
    pub sequence: u32,
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct NavigationEvent {
    pub request: NavigationRequest,
    pub action: NavigationAction,
}
#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct NavigationClaim {
    pub event: NavigationEvent,
    pub valid_for_ms: u32,
}
#[derive(Debug, Clone, Copy, Serialize, TS, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NavigationIssue {
    Overflow,
    DeliveryFailed,
    DeliveryTimeout,
}
#[derive(Debug, Clone, Default, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct NavigationDiagnostics {
    pub configured: bool,
    pub pending: u8,
    pub delivering: bool,
    pub issue: Option<NavigationIssue>,
}
const CONTROLS: [(ControllerControl, NavigationAction); 6] = [
    (ControllerControl::DpadUp, NavigationAction::Previous),
    (ControllerControl::DpadDown, NavigationAction::Next),
    (ControllerControl::DpadLeft, NavigationAction::Left),
    (ControllerControl::DpadRight, NavigationAction::Right),
    (ControllerControl::A, NavigationAction::Activate),
    (ControllerControl::B, NavigationAction::Back),
];
#[derive(Default)]
pub(super) struct Edges {
    context: Option<u32>,
    previous: Option<u64>,
    released: u64,
    last: Option<u32>,
}
impl Edges {
    pub(super) fn reset(&mut self) {
        *self = Self::default();
    }
    pub(super) fn report(
        &mut self,
        ms: u32,
        epoch: Option<u32>,
        word: u64,
    ) -> Option<NavigationAction> {
        if epoch.is_none() {
            self.reset();
            return None;
        }
        if self.context != epoch || self.last.is_some_and(|t| ms.saturating_sub(t) > 1500) {
            self.reset();
            self.context = epoch;
        }
        self.last = Some(ms);
        let mask = CONTROLS.iter().fold(0, |m, (c, _)| {
            m | (1u64 << reports::candidate_bit(*c).expect("reviewed mapping"))
        });
        let down = word & mask;
        let previous = self.previous.replace(down);
        let edges = down & !previous.unwrap_or(down) & self.released;
        self.released |= mask & !down;
        // Multiple held navigation controls, diagonals and additional face/Steam activity
        // suppress navigation until the implicated controls have been released.
        let other_mask = [
            ControllerControl::X,
            ControllerControl::Y,
            ControllerControl::Steam,
            ControllerControl::QuickAccess,
        ]
        .iter()
        .fold(0, |mask, control| {
            mask | (1u64 << reports::candidate_bit(*control).expect("published candidate"))
        });
        let other = word & other_mask;
        if down.count_ones() > 1 || other != 0 || edges.count_ones() > 1 {
            self.released &= !down;
            return None;
        }
        CONTROLS.iter().find_map(|(c, action)| {
            (edges & (1u64 << reports::candidate_bit(*c).expect("reviewed mapping")) != 0)
                .then_some(*action)
        })
    }
}
struct Item {
    instance: u32,
    ticket: Ticket,
    event: NavigationEvent,
    deadline: Instant,
    claimed: bool,
}
#[derive(Default)]
struct Inner {
    instance: u32,
    generation: u32,
    configured: bool,
    epoch: u32,
    visible: bool,
    sequence: u32,
    queue: VecDeque<(Ticket, Instant)>,
    flight: Option<Item>,
    draining: bool,
    issue: Option<NavigationIssue>,
}
#[derive(Default)]
pub(crate) struct State {
    inner: Mutex<Inner>,
    changed: Condvar,
}
impl State {
    pub(super) fn start(&self, generation: u32, configured: bool) {
        let mut s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        s.generation = generation;
        s.configured = configured;
        s.issue = None;
        s.sequence = 0;
        s.queue.clear();
    }
    pub(crate) fn context(&self) -> Option<u32> {
        let s = self.inner.lock().ok()?;
        (s.configured && s.visible && s.epoch != u32::MAX && s.issue.is_none()).then_some(s.epoch)
    }
    pub(crate) fn sync(&self, epoch: u32, visible: bool) {
        if let Ok(mut s) = self.inner.lock() {
            if s.epoch != epoch || !visible {
                s.queue.clear();
                if !s.flight.as_ref().is_some_and(|i| i.claimed) {
                    s.flight = None;
                }
            }
            s.epoch = epoch;
            s.visible = visible;
            self.changed.notify_all();
        }
    }
    pub(super) fn invalidate(&self) {
        if let Ok(mut s) = self.inner.lock() {
            s.configured = false;
            s.queue.clear();
            if !s.flight.as_ref().is_some_and(|i| i.claimed) {
                s.flight = None;
            }
            self.changed.notify_all();
        }
    }
    pub(crate) fn claimed(&self) -> bool {
        self.inner
            .lock()
            .is_ok_and(|s| s.flight.as_ref().is_some_and(|i| i.claimed))
    }
    pub(crate) fn barrier(&self) {
        let mut s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        while s.flight.as_ref().is_some_and(|i| i.claimed) {
            s = self.changed.wait(s).unwrap_or_else(|p| p.into_inner());
        }
    }
    pub(crate) fn new_window(&self) -> u32 {
        let mut s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        s.instance = s.instance.saturating_add(1);
        s.visible = false;
        s.queue.clear();
        s.instance
    }
    pub(crate) fn destroyed(&self, instance: u32) {
        if let Ok(mut s) = self.inner.lock() {
            if s.instance == instance {
                s.visible = false;
                s.queue.clear();
            }
            if s.flight
                .as_ref()
                .is_some_and(|item| item.instance == instance)
            {
                s.flight = None;
            }
            self.changed.notify_all();
        }
    }
    pub(crate) fn snapshot(&self) -> NavigationDiagnostics {
        let s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        NavigationDiagnostics {
            configured: s.configured,
            pending: s.queue.len() as u8,
            delivering: s.flight.is_some(),
            issue: s.issue,
        }
    }
    fn fail(s: &mut Inner, issue: NavigationIssue) {
        if s.issue.is_none() {
            s.issue = Some(issue);
        }
        s.queue.clear();
    }
    pub(crate) fn enqueue(&self, ticket: Ticket) -> bool {
        let mut s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        if ticket.generation != s.generation
            || !ticket.valid()
            || !s.configured
            || s.issue.is_some()
            || !s.visible
            || ticket.navigation.is_none_or(|(epoch, _)| epoch != s.epoch)
        {
            return false;
        }
        if s.queue.len() >= 4 {
            Self::fail(&mut s, NavigationIssue::Overflow);
            return false;
        }
        s.queue.push_back((ticket, Instant::now()));
        if s.draining {
            false
        } else {
            s.draining = true;
            true
        }
    }
    pub(crate) fn offer(&self) -> Option<NavigationEvent> {
        let mut s = self.inner.lock().ok()?;
        while let Some((ticket, queued)) = s.queue.pop_front() {
            if queued.elapsed() >= DELIVERY {
                Self::fail(&mut s, NavigationIssue::DeliveryTimeout);
                s.draining = false;
                return None;
            }
            let (epoch, action) = ticket.navigation?;
            if !ticket.valid()
                || epoch != s.epoch
                || !s.visible
                || !s.configured
                || s.issue.is_some()
            {
                continue;
            }
            let Some(sequence) = s.sequence.checked_add(1) else {
                Self::fail(&mut s, NavigationIssue::Overflow);
                s.draining = false;
                return None;
            };
            s.sequence = sequence;
            let event = NavigationEvent {
                request: NavigationRequest {
                    generation: ticket.generation,
                    epoch,
                    sequence: s.sequence,
                },
                action,
            };
            s.flight = Some(Item {
                instance: s.instance,
                ticket,
                event: event.clone(),
                deadline: queued + DELIVERY,
                claimed: false,
            });
            return Some(event);
        }
        s.draining = false;
        None
    }
    pub(crate) fn claim(&self, request: &NavigationRequest) -> Option<NavigationClaim> {
        let mut s = self.inner.lock().ok()?;
        let eligible = s.configured
            && s.visible
            && s.issue.is_none()
            && s.epoch == request.epoch
            && s.generation == request.generation;
        let item = s.flight.as_mut()?;
        if !eligible
            || item.event.request != *request
            || item.claimed
            || !item.ticket.valid()
            || Instant::now() >= item.deadline
        {
            return None;
        }
        item.claimed = true;
        Some(NavigationClaim {
            event: item.event.clone(),
            valid_for_ms: item.ticket.remaining_ms().min(
                item.deadline
                    .saturating_duration_since(Instant::now())
                    .as_millis() as u32,
            ),
        })
    }
    // Called with QAM coordinator held. Always releases a matching lease, even after disarm.
    pub(crate) fn complete(&self, request: &NavigationRequest) -> bool {
        let Ok(mut s) = self.inner.lock() else {
            return false;
        };
        let valid = s
            .flight
            .as_ref()
            .is_some_and(|i| i.claimed && i.event.request == *request);
        if !valid {
            return false;
        }
        let current = s
            .flight
            .as_ref()
            .is_some_and(|i| i.ticket.valid() && Instant::now() < i.deadline)
            && s.epoch == request.epoch
            && s.visible
            && s.configured;
        if s.flight
            .as_ref()
            .is_some_and(|i| Instant::now() >= i.deadline)
        {
            Self::fail(&mut s, NavigationIssue::DeliveryTimeout);
        }
        s.flight = None;
        self.changed.notify_all();
        current
    }
    pub(crate) fn wait_delivery(&self, request: &NavigationRequest, failed: bool) {
        let mut s = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        if !s
            .flight
            .as_ref()
            .is_some_and(|i| i.event.request == *request)
        {
            return;
        }
        if failed {
            Self::fail(&mut s, NavigationIssue::DeliveryFailed);
            // A partial transport failure may race an already granted claim. Never
            // release its execution barrier until the trusted view completes it.
            if !s.flight.as_ref().is_some_and(|item| item.claimed) {
                s.flight = None;
                return;
            }
        }
        loop {
            let Some(item) = &s.flight else {
                return;
            };
            if item.event.request != *request {
                return;
            }
            if item.claimed {
                s = self.changed.wait(s).unwrap_or_else(|p| p.into_inner());
            } else {
                let left = item.deadline.saturating_duration_since(Instant::now());
                if left.is_zero() {
                    s.flight = None;
                    Self::fail(&mut s, NavigationIssue::DeliveryTimeout);
                    return;
                }
                s = self
                    .changed
                    .wait_timeout(s, left)
                    .unwrap_or_else(|p| p.into_inner())
                    .0;
            }
        }
    }
}
#[cfg(test)]
pub(crate) fn declarations() -> Vec<String> {
    vec![
        NavigationAction::decl(),
        NavigationRequest::decl(),
        NavigationEvent::decl(),
        NavigationClaim::decl(),
        NavigationIssue::decl(),
        NavigationDiagnostics::decl(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::neptune::shortcut;
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };
    fn command(ticket: &Ticket, epoch: u32) -> Ticket {
        let mut t = ticket.clone();
        t.navigation = Some((epoch, NavigationAction::Next));
        t
    }
    #[test]
    fn reviewed_edges_are_independent_released_baselines_and_never_repeat() {
        for (control, bit, action) in [
            (ControllerControl::DpadUp, 8, NavigationAction::Previous),
            (ControllerControl::DpadDown, 11, NavigationAction::Next),
            (ControllerControl::DpadLeft, 10, NavigationAction::Left),
            (ControllerControl::DpadRight, 9, NavigationAction::Right),
            (ControllerControl::A, 7, NavigationAction::Activate),
            (ControllerControl::B, 5, NavigationAction::Back),
        ] {
            assert_eq!(reports::candidate_bit(control), Some(bit));
            let mut e = Edges::default();
            let word = 1u64 << bit;
            assert_eq!(e.report(0, Some(1), word), None); // Initially held is not a press.
            assert_eq!(e.report(10, Some(1), word), None);
            assert_eq!(e.report(20, Some(1), 0), None);
            assert_eq!(e.report(30, Some(1), word), Some(action));
            for ms in 31..1000 {
                assert_eq!(e.report(ms, Some(1), word), None);
            }
            assert_eq!(e.report(1000, Some(1), 0), None);
            assert_eq!(e.report(1001, Some(1), word), Some(action)); // No shared ⋯ cooldown.
        }
    }
    #[test]
    fn hidden_reopen_gaps_diagonals_and_steam_face_combinations_are_conservative() {
        let mut e = Edges::default();
        e.report(0, Some(1), 0);
        for other in [
            1 << 8,
            1 << 9,
            1 << 7,
            1 << 5,
            1 << 13,
            1 << 4,
            1 << 6,
            1u64 << 50,
        ] {
            e.reset();
            e.report(0, Some(1), 0);
            assert_eq!(e.report(1, Some(1), (1 << 11) | other), None);
            assert_eq!(e.report(2, Some(1), 1 << 11), None);
            e.report(3, Some(1), 0);
            assert_eq!(e.report(4, Some(1), 1 << 11), Some(NavigationAction::Next));
        }
        assert_eq!(e.report(2000, Some(1), 1 << 11), None); // Gap is not a release.
        assert_eq!(e.report(2001, None, 0), None);
        assert_eq!(e.report(2002, Some(2), 1 << 11), None); // Reopening while held.
        e.report(2003, Some(2), 0);
        assert_eq!(
            e.report(2004, Some(2), 1 << 11),
            Some(NavigationAction::Next)
        );
        e.report(2005, Some(2), 0);
        assert_eq!(
            e.report(2006, Some(2), (1 << 3) | (1 << 11)),
            Some(NavigationAction::Next)
        ); // Unmapped shoulder does not act.
    }
    #[test]
    fn visibility_epoch_generation_deadline_and_overflow_gate_delivery() {
        let (owner, t) = shortcut::test_navigation_ticket(false);
        let n = owner.navigation.clone();
        n.start(t.generation, true);
        assert!(!n.enqueue(command(&t, 1))); // Hidden.
        n.sync(1, true);
        assert!(n.enqueue(command(&t, 1)));
        let old = n.offer().unwrap();
        n.sync(2, false);
        n.sync(3, true);
        assert!(n.claim(&old.request).is_none());
        assert!(!n.enqueue(command(&t, 1)));
        assert!(!n.enqueue(command(&shortcut::test_navigation_ticket(true).1, 3)));
        // offer owns the one drainer until it observes empty.
        assert!(n.offer().is_none());
        for _ in 0..4 {
            n.enqueue(command(&t, 3));
        }
        let event = n.offer().unwrap();
        n.enqueue(command(&t, 3)); // Four pending plus one delivery.
        n.enqueue(command(&t, 3)); // Overflow disables only navigation.
        assert_eq!(n.snapshot().pending, 0);
        assert_eq!(n.snapshot().issue, Some(NavigationIssue::Overflow));
        assert!(t.valid()); // Existing toggle session remains intact.
        assert!(n.claim(&event.request).is_none());
        assert!(!n.enqueue(command(&t, 3)));
        owner.disarmed();
        assert!(n.claim(&old.request).is_none());
    }
    #[test]
    fn granted_delivery_is_a_disarm_barrier_and_completion_cannot_hide_a_new_epoch() {
        let (owner, t) = shortcut::test_navigation_ticket(false);
        let n = owner.navigation.clone();
        n.start(t.generation, true);
        n.sync(1, true);
        n.enqueue(command(&t, 1));
        let event = n.offer().unwrap();
        assert!(n.claim(&event.request).is_some());
        assert!(n.claim(&event.request).is_none()); // No duplicate grant.
        let done = Arc::new(AtomicBool::new(false));
        let join = {
            let owner = owner.clone();
            let done = done.clone();
            std::thread::spawn(move || {
                owner.disarmed();
                done.store(true, Ordering::SeqCst);
            })
        };
        while t.valid() {
            std::thread::yield_now();
        }
        assert!(!done.load(Ordering::SeqCst));
        assert!(!n.complete(&event.request)); // Invalidated session releases, never authorizes Hide.
        join.join().unwrap();
        assert!(done.load(Ordering::SeqCst));
        assert!(!n.enqueue(command(&t, 1)));
        assert!(!n.claimed());
    }
    #[test]
    fn late_delivery_failures_do_not_disable_new_sessions_and_destroy_releases_old_renderer() {
        let (owner, t) = shortcut::test_navigation_ticket(false);
        let n = owner.navigation.clone();
        n.start(t.generation, true);
        n.sync(1, true);
        n.enqueue(command(&t, 1));
        let old = n.offer().unwrap();
        n.claim(&old.request).unwrap();
        n.destroyed(0); // Renderer is gone, so its lease cannot execute later.
        n.start(2, true);
        n.sync(2, true);
        n.wait_delivery(&old.request, true);
        assert_eq!(n.snapshot().issue, None);
        assert!(!n.complete(&old.request));
        // Same-generation delivery failure is terminal for navigation, not retried.
        n.start(t.generation, true);
        n.enqueue(command(&t, 2));
        let event = n.offer().unwrap();
        n.wait_delivery(&event.request, true);
        assert_eq!(n.snapshot().issue, Some(NavigationIssue::DeliveryFailed));
        assert!(!n.enqueue(command(&t, 2)));
    }
    #[test]
    fn unclaimed_event_times_out_without_replay_or_raw_input_diagnostics() {
        let (owner, t) = shortcut::test_navigation_ticket(false);
        let n = owner.navigation.clone();
        n.start(t.generation, true);
        n.sync(1, true);
        n.enqueue(command(&t, 1));
        let e = n.offer().unwrap();
        n.inner.lock().unwrap().flight.as_mut().unwrap().deadline =
            Instant::now() - Duration::from_millis(1);
        assert!(n.claim(&e.request).is_none());
        n.wait_delivery(&e.request, false);
        assert_eq!(n.snapshot().issue, Some(NavigationIssue::DeliveryTimeout));
        assert!(n.offer().is_none());
        let json = serde_json::to_string(&e).unwrap();
        for forbidden in [
            "word", "mask", "report", "path", "serial", "held", "history",
        ] {
            assert!(!json.contains(forbidden));
        }
        assert!(t.valid());
    }
    #[test]
    fn destroyed_old_window_never_releases_a_replacement_windows_claim() {
        let (owner, t) = shortcut::test_navigation_ticket(false);
        let n = owner.navigation.clone();
        let old = n.new_window();
        n.start(t.generation, true);
        n.sync(1, true);
        n.enqueue(command(&t, 1));
        let first = n.offer().unwrap();
        n.claim(&first.request).unwrap();
        n.destroyed(old);
        assert!(!n.claimed());
        let current = n.new_window();
        n.sync(3, true);
        n.enqueue(command(&t, 3));
        let second = n.offer().unwrap();
        n.claim(&second.request).unwrap();
        n.destroyed(old);
        assert!(n.claimed());
        assert!(n.complete(&second.request));
        assert_ne!(old, current);
    }
    #[test]
    fn partial_emit_failure_does_not_release_an_already_granted_execution_lease() {
        let (owner, t) = shortcut::test_navigation_ticket(false);
        let n = owner.navigation.clone();
        n.start(t.generation, true);
        n.sync(1, true);
        n.enqueue(command(&t, 1));
        let event = n.offer().unwrap();
        n.claim(&event.request).unwrap();
        let done = Arc::new(AtomicBool::new(false));
        let join = {
            let n = n.clone();
            let event = event.clone();
            let done = done.clone();
            std::thread::spawn(move || {
                n.wait_delivery(&event.request, true);
                done.store(true, Ordering::SeqCst);
            })
        };
        while n.snapshot().issue.is_none() {
            std::thread::yield_now();
        }
        assert!(n.claimed());
        assert!(!done.load(Ordering::SeqCst));
        n.complete(&event.request);
        join.join().unwrap();
        assert!(done.load(Ordering::SeqCst));
        assert!(t.valid());
    }
    #[test]
    fn queued_deadline_includes_time_behind_a_delivery_without_replaying_old_presses() {
        let (owner, t) = shortcut::test_navigation_ticket(false);
        let n = owner.navigation.clone();
        n.start(t.generation, true);
        n.sync(1, true);
        n.enqueue(command(&t, 1));
        n.inner.lock().unwrap().queue.front_mut().unwrap().1 = Instant::now() - DELIVERY;
        assert!(n.offer().is_none());
        assert_eq!(n.snapshot().issue, Some(NavigationIssue::DeliveryTimeout));
        assert_eq!(n.snapshot().pending, 0);
        assert!(t.valid());
    }
}
