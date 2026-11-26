# Step 5F: D-pad held-repeat feasibility

Status: proposed only; no held-repeat code, flag, setting or timing change is implemented. Step 5F.1 requires separate explicit approval. Step 5D's desktop-only/pass-through decision remains unchanged.

## Current implementation and evidence

Reviewed at main `c246bd268d12bb393f362200e63d44b6cf69c8ba`:

- `neptune/navigation.rs::Edges` privately stores the previous six-control down mask, observed-release eligibility, last compatible delivery time and visibility context. A released-to-pressed edge can emit one abstract action; identical held reports emit nothing. Initial holds, context changes and >1500ms gaps require released baselines. Simultaneous navigation controls or X/Y/Steam/⋯ activity conservatively suppress navigation until release.
- `shortcut.rs::run` owns the one existing reader. Reads are bounded at 100ms, and its monotonic tick invalidates the shortcut baseline after >1500ms without reports. Navigation currently emits only from a compatible report while Armed. No timeout generates a navigation action. The thirty-minute session, manual rearm and independent ⋯ 350ms cooldown remain.
- Native delivery permits four pending offers plus one in flight, with 500ms age including queue time. A claimed delivery remains a cleanup barrier until trusted completion or destruction of that renderer instance; a frozen live renderer can delay cleanup. Repeat cannot safely assume every UI action completes in one interval.
- React resolves each approved action against current DOM focus and currently available targets. Busy Refresh remains keyboard-focusable but is skipped as a controller destination. It does not know native held state, and no raw word crosses IPC.

These are repository facts and existing synthetic-test guarantees. Step 5E user evidence covers ordinary navigation and slow-refresh responsiveness, not sustained-repeat cadence, latency, overshoot or transport continuity under a held direction. No new physical repeat experiment was performed.

## Questions and future constraints

| Question                 | Finding / requirement before implementing                                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Held representation      | Existing private previous/released masks provide a candidate starting point; add only bounded session/epoch-scoped direction/deadline state in a separately reviewed native change. Never start repeating from an initial held baseline.                                                              |
| Report frequency         | Use monotonic elapsed time in the existing worker, not frame counts. The bounded read loop can service a deadline, but that is not authorization to act on stale input. No additional reader or OS keyboard repeat.                                                                                   |
| Report silence           | Stop repeat eligibility when compatible delivery is no longer fresh; never infer a physical release from silence. Existing 1500ms baseline reset is too permissive to assume a safe repeat freshness window. Fresh delivery alone also cannot prove a stalled driver has supplied new physical state. |
| Hide/reopen              | Repeat is eligible only for the current native visible epoch and armed generation. Hide, blur hide, recreation and reopening clear repeat state; require a fresh observed release before repeating in the new opening. Never resume an old hold.                                                      |
| Queue bounds             | Preserve four pending plus one in-flight capacity. A future repeat producer should submit only with an atomic available delivery credit, otherwise skip that repeat. A snapshot-then-enqueue check can race and is insufficient. Do not change the current queue/API in Step 5F.                      |
| Unacknowledged delivery  | No new repeat while an offer is pending/claimed. Do not revoke an execution lease or replay it after expiry. Do not accumulate missed repeats or issue a catch-up burst when UI recovers.                                                                                                             |
| Disarm/expiry/error      | Existing token invalidation must stop repeat immediately and fence already queued work. Clear repeat state on disconnect, invalid framing, read failure, expiry and explicit cleanup; no reconnect/renewal. Preserve the existing cleanup barrier honestly.                                           |
| Multiple/opposing inputs | Reject diagonals, opposing directions, another navigation button or existing suppressing face/Steam/⋯ activity. Invalidate repeat eligibility and require released baselines; no priority guessing.                                                                                                   |
| Busy controls            | Emit only Previous/Next; React continues resolving actual available controls at delivery. Busy Refresh and test-only Slow Refresh are skipped. Native code must not learn menu indices or cache an obsolete focus target.                                                                             |
| ⋯ and other buttons      | Keep ⋯ on its independent existing path/cooldown. Repeat only Up/Down; A, B, Left, Right and ⋯ remain edge-only. No input injection/output or game-side suppression.                                                                                                                                  |

## Candidate policy for a separately approved experiment

The immediate initial press edge would stay unchanged. An **unvalidated candidate** is a 600ms initial delay and 180ms minimum interval (roughly 5.6 repeat actions/second maximum). These numbers are a design starting point, not selected safe production constants. The six-item menu can wrap quickly; user overshoot and touch/controller interleaving may outweigh any benefit.

A candidate freshness cutoff of 250ms could fail closed earlier than the existing gap threshold, but might reject legitimate change-only or irregular delivery. Measure compatible report continuity while holding/releasing on the reviewed device before selecting it. If continuity cannot be established, do not repeat during gaps; retain press-edge-only behavior. Do not reinterpret missing input as a release or alter the currently approved 1500ms behavior in this milestone.

At each eligible deadline, revalidate source/framing, token/deadline, generation, native visibility epoch, released baseline and delivery credit. Send at most one action; schedule the next opportunity relative to current monotonic time, never historical missed intervals. A rejected/expired/unfocused delivery must not trigger a retry storm. Any optional future enablement should be explicit and default off, reviewed separately; no current DTO, setting or command is added.

## Required Step 5F.1 tests and acceptance gates

1. Deterministic fake timestamps for immediate edge, initial delay boundaries, intervals independent of report rate, long hold, actual release and repress. Prove no repeat for other controls or initial holds.
2. Freshness, silent reads, malformed/incompatible frames, irregular cadence and late resumed reports. No fabricated release, replay or reconnect.
3. Simultaneous/opposing/suppressing controls and transitions across native visibility epochs, generation replacement, disarm, expiry, error and window recreation.
4. Busy controls, pointer/Tab interleaving and actual DOM focus. No native menu-index model.
5. Slow/unacknowledged/failed claims, queue pressure and frozen-renderer barriers. No backlog growth, capacity change, stale actions or abandoned granted leases. Existing ⋯/reader/permissions tests remain unchanged.
6. Explicit desktop-only LCD/Windows 11 testing in the reviewed X360 profile: measure hold cadence, release latency, overshoot, bounded input gaps, hide/reopen and normal/Slow Refresh interactions. No active game, driver/tool changes or isolation claims.

Recommendation: **retain press-edge-only production behavior**. Held-repeat is plausible with new native scheduling/credit/freshness work, but its benefit for six controls is limited and it is not justified for automatic enablement. Consider an optional Step 5F.1 prototype only after explicit approval, timing evidence and acceptance criteria above; safety takes precedence over faster traversal.
