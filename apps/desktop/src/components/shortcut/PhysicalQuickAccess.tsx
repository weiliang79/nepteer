import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { listCandidates, rescanCandidates } from "@/lib/neptune";
import {
  armShortcut,
  disarmShortcut,
  shortcutStatus,
  onPhysicalShortcut,
  shortcutOwnsReader,
  shortcutReasons,
  shortcutDiagnosticSummary,
} from "@/lib/physical-shortcut";
import { version } from "@/lib/app-info";
import type { Candidate, ShortcutStatus } from "@/lib/bindings";
const reviewed = (c: Candidate) =>
  c.attributesVerified &&
  c.capabilities.passiveReadEligible &&
  c.vendorId === 0x28de &&
  c.productId === 0x1205 &&
  c.interfaceNumber === 2 &&
  c.usagePage === 0xffff &&
  c.usage === 1 &&
  c.inputReportLength === 65;
const labels: Record<ShortcutStatus["phase"], string> = {
  disarmed: "Shortcut disarmed",
  arming: "Arming",
  waiting_reports: "Waiting for compatible reports",
  waiting_baseline: "Waiting for released baseline",
  armed: "Armed",
  disarming: "Disarming",
  expired: "Expired",
  disconnected: "Disconnected",
  access_denied: "Access denied",
  device_busy: "Device busy",
  unsupported_interface: "Unsupported interface",
  unsupported_format: "Unsupported format",
  error: "Error",
};
export default function PhysicalQuickAccess({
  expanded,
  onManage,
  shortcutHint = "Open Quick Access from the dashboard",
}: {
  expanded: boolean;
  onManage: () => void;
  shortcutHint?: string;
}) {
  const helpId = useId();
  const [status, setStatus] = useState<ShortcutStatus | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState("");
  const [consent, setConsent] = useState(false);
  const [configuration, setConfiguration] = useState(false);
  const [navigation, setNavigation] = useState(false);
  const [armPending, setArmPending] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const pending = useRef(false);
  const disarming = useRef(false);
  const [disarmPending, setDisarmPending] = useState(false);
  const requestId = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState(false);
  const [eventsUnavailable, setEventsUnavailable] = useState(false);
  const alive = useRef(false);
  const latest = useRef<ShortcutStatus | null>(null);
  const accept = useCallback((value: ShortcutStatus) => {
    if (
      alive.current &&
      latest.current?.generation === value.generation &&
      latest.current.revision === value.revision
    ) {
      setConnection(true);
      return;
    }
    if (
      !alive.current ||
      (latest.current &&
        (value.generation < latest.current.generation ||
          value.revision <= latest.current.revision))
    )
      return;
    latest.current = value;
    setStatus(value);
    setConnection(true);
  }, []);
  useEffect(() => {
    alive.current = true;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let querying = false;
    const query = async () => {
      if (querying) return;
      querying = true;
      try {
        const value = await shortcutStatus();
        if (!disposed) accept(value);
      } catch {
        if (!disposed) setConnection(false);
      } finally {
        querying = false;
      }
    };
    void onPhysicalShortcut((value) => {
      if (!disposed) accept(value);
    })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => {
        if (!disposed) setEventsUnavailable(true);
      });
    void query();
    const timer = window.setInterval(() => void query(), 1000);
    return () => {
      disposed = true;
      alive.current = false;
      unlisten?.();
      window.clearInterval(timer);
    };
    // App-owned mode deliberately survives page changes, minimization and webview remount.
  }, [accept]);
  const owned = status ? shortcutOwnsReader(status) : false;
  async function scan(rescan: boolean) {
    setBusy(true);
    try {
      const value = await (rescan
        ? rescanCandidates("native")
        : listCandidates());
      if (alive.current) {
        setCandidates(value.candidates);
        setSelected("");
        setConsent(false);
        setConfiguration(false);
        accept(await shortcutStatus());
      }
    } catch {
      if (alive.current)
        setError(
          "Interface discovery request failed. Stop/disarm the active reader, then retry native discovery.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function arm() {
    if (pending.current || disarming.current) return;
    if (!status || !selected || !consent || !configuration) {
      setError(
        "Arm unavailable: select an eligible interface and complete both acknowledgments.",
      );
      return;
    }
    const id = ++requestId.current;
    pending.current = true;
    setArmPending(true);
    setError(null);
    try {
      const value = await armShortcut({
        candidateId: selected,
        expectedGeneration: status.generation,
        consent,
        reviewedConfiguration: configuration,
        navigation,
      });
      if (id === requestId.current) accept(value);
    } catch {
      // IPC rejection is observable even if no event arrives. Never export arbitrary IPC/OS strings.
      if (alive.current && id === requestId.current) {
        setError(
          "Arm request failed. See Last Arm Attempt for the native reason. If unavailable, refresh status and retry; arming was not confirmed.",
        );
        try {
          accept(await shortcutStatus());
        } catch {
          /* Keep the visible request failure. */
        }
      }
    } finally {
      if (id === requestId.current) {
        pending.current = false;
        if (alive.current) setArmPending(false);
      }
    }
  }
  async function disarm() {
    if (!status || disarming.current) return;
    const id = ++requestId.current;
    disarming.current = true;
    setDisarmPending(true);
    try {
      const value = await disarmShortcut(status.generation);
      if (id === requestId.current) accept(value);
    } catch {
      if (alive.current && id === requestId.current)
        setError(
          "Disarm request failed. Refresh status and retry Disarm; cleanup has not been confirmed.",
        );
    } finally {
      if (id === requestId.current) {
        pending.current = false;
        disarming.current = false;
        if (alive.current) {
          setArmPending(false);
          setDisarmPending(false);
        }
      }
    }
  }
  const profile = candidates.find((c) => c.id === selected);
  const blocked =
    status?.readerOwner === "diagnostics"
      ? "Arm unavailable: Stop Monitoring / the correlation probe on Controller before arming."
      : !connection
        ? "Arm unavailable: native status connection is unavailable."
        : status?.source !== "windows"
          ? "Arm unavailable: native Windows discovery is required."
          : owned
            ? "Arm unavailable: the current shortcut session must be explicitly disarmed first."
            : !profile || !reviewed(profile)
              ? "Arm unavailable: rescan/load interfaces and select the reviewed vendor collection."
              : !consent || !configuration
                ? "Arm unavailable: complete both consent and configuration acknowledgments."
                : null;
  const attempt = status?.lastAttempt;
  const reason = attempt?.reason ?? status?.terminationReason;
  const active =
    status?.phase === "armed" &&
    status.source === "windows" &&
    status.readerOwner === "shortcut" &&
    status.opened &&
    status.workerRunning;
  const readiness = disarmPending
    ? "Disarming — reader cleanup in progress"
    : status?.phase === "armed"
      ? !active
        ? "Shortcut readiness not confirmed"
        : status.navigation.issue
          ? "Shortcut armed — navigation error"
          : status.navigation.configured
            ? "Shortcut armed — navigation enabled (desktop only)"
            : "Shortcut armed — navigation disabled"
      : status
        ? labels[status.phase]
        : "Status unavailable";
  return (
    <section
      className="physical-shortcut"
      aria-label="Physical Quick Access Shortcut"
    >
      <div className="physical-shortcut-bar">
        <div>
          <strong>Physical Quick Access Shortcut</strong>
          <p className="muted" role="status">
            {!connection && status ? "Last known: " : ""}
            {readiness}
            {owned && status
              ? ` · ${Math.ceil(status.remainingMs / 60000)} min remaining`
              : ""}
            {!connection && status
              ? " · Connection unavailable; last known state"
              : ""}
          </p>
        </div>
        <div className="controller-actions">
          {!expanded && (
            <Button variant="outline" onClick={onManage}>
              Manage physical shortcut
            </Button>
          )}
          <Button
            variant="outline"
            disabled={!owned || disarmPending}
            onClick={() => void disarm()}
          >
            Disarm Shortcut
          </Button>
        </div>
      </div>
      {armPending && (
        <p role="status">
          Arming — checking controller access… Arm request sent; awaiting native
          response.
        </p>
      )}
      {blocked && !armPending && (
        <p id={`${helpId}-blocked`} className="qam-error">
          {blocked}
        </p>
      )}
      {eventsUnavailable && (
        <p className="muted">
          Live status subscription unavailable; native status polling remains
          active.
        </p>
      )}
      {disarmPending && (
        <p role="status">Disarming — waiting for safe reader cleanup…</p>
      )}
      {reason && (
        <p role="alert" className="qam-error">
          {shortcutReasons[reason][0]} Action: {shortcutReasons[reason][1]}
        </p>
      )}
      {status?.terminationReason && status.terminationReason !== reason && (
        <p>
          Last worker termination:{" "}
          {shortcutReasons[status.terminationReason][0]}
        </p>
      )}
      {status?.navigation.issue && (
        <p role="alert">
          QAM navigation stopped: {status.navigation.issue.replaceAll("_", " ")}
          . Use keyboard, mouse/touch or Open Quick Access.
          {connection && active
            ? " Physical ⋯ remains available in this session. Disarm and rearm manually to retry navigation."
            : " Physical ⋯ availability is not confirmed. Wait for cleanup, then rescan and rearm manually."}
        </p>
      )}
      {status?.issue && (
        <p className="qam-error">
          Physical shortcut: {status.issue.replaceAll("_", " ")}. Use Disarm /
          manual rearm or the keyboard/dashboard fallback.
        </p>
      )}
      {error && (
        <p role="alert" className="qam-error">
          {error}
        </p>
      )}
      {expanded && (
        <>
          <p>
            Only the physical ⋯ press toggles Nepteer's QAM. No controller
            remapping or hardware configuration is performed.
          </p>
          <p className="muted">
            Disarmed on startup. Each explicitly armed session lasts at most 30
            minutes and never renews automatically. Disarm before changing modes
            or starting Controller monitoring.
          </p>
          <section
            aria-label="Other ways to use Quick Access"
            className="shortcut-help"
          >
            <h3>Other ways to use Quick Access</h3>
            <p>
              <strong>Keyboard:</strong> {shortcutHint}. Tab / Shift+Tab moves
              focus, Enter / Space activates a focused button, Escape closes
              QAM.
            </p>
            <p>
              <strong>Touch/mouse:</strong> Use Open Quick Access in the
              dashboard, then tap or click existing controls. These alternatives
              do not pause games or isolate their input.
            </p>
          </section>
          <fieldset disabled={owned || busy || armPending || disarmPending}>
            <legend>Explicit arming</legend>
            <div className="controller-actions">
              <Button
                variant="outline"
                disabled={status?.readerOwner !== "none"}
                onClick={() => void scan(true)}
              >
                Rescan native shortcut interfaces
              </Button>
              <Button variant="outline" onClick={() => void scan(false)}>
                Load discovered interfaces
              </Button>
            </div>
            <label className="controller-source">
              Shortcut interface
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setConsent(false);
                  setConfiguration(false);
                }}
              >
                <option value="">Select a discovered interface</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id} disabled={!reviewed(c)}>
                    {c.id} · interface {c.interfaceNumber ?? "unknown"} ·{" "}
                    {reviewed(c)
                      ? "FFFF/0001 · 65 bytes · reviewed profile"
                      : "Outside reviewed profile"}
                  </option>
                ))}
              </select>
            </label>
            <fieldset
              className="shortcut-modes"
              aria-describedby={`${helpId}-mode-note ${helpId}-mode-warning`}
            >
              <legend>Controller session mode</legend>
              <div className="shortcut-mode-options">
                {[false, true].map((enabled) => (
                  <label className="shortcut-mode" key={String(enabled)}>
                    <input
                      type="radio"
                      name={`${helpId}-mode`}
                      checked={navigation === enabled}
                      onChange={() => {
                        setNavigation(enabled);
                        setConsent(false);
                        setConfiguration(false);
                      }}
                      aria-labelledby={`${helpId}-${enabled}-title`}
                      aria-describedby={`${helpId}-${enabled}-description ${helpId}-mode-warning`}
                    />
                    <span>
                      <strong id={`${helpId}-${enabled}-title`}>
                        {enabled
                          ? "Controller navigation (desktop only)"
                          : "Physical shortcut only"}
                      </strong>
                      <span id={`${helpId}-${enabled}-description`}>
                        {enabled
                          ? "⋯ opens QAM, D-pad Up/Down moves, A selects and B goes back or closes. Reviewed Steam Deck Tools X360-mode configuration."
                          : "⋯ opens or closes QAM. D-pad and A/B navigation are not enabled. Reviewed Steam Deck Tools Desktop-mode configuration."}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p id={`${helpId}-mode-note`} className="muted">
                You confirm an existing configuration. Selecting a mode does not
                detect or change Steam Deck Tools or Steam Input, arm the
                reader, or save navigation opt-in across restarts. Cards choose
                the next Arm request; the status above shows current native
                availability. Disarm before reconfiguring.
              </p>
            </fieldset>
            {navigation ? (
              <aside id={`${helpId}-mode-warning`} className="shortcut-warning">
                <strong>
                  Controller navigation does not block game input.
                </strong>
                <p>
                  Nepteer reads your controller buttons but does not prevent
                  games or other controller utilities from receiving them. Use
                  controller navigation on the Windows desktop without an active
                  game.
                </p>
              </aside>
            ) : (
              <p id={`${helpId}-mode-warning`} className="muted">
                Other tools may also react to ⋯. Nepteer does not suppress their
                actions. Disarm if overlays conflict.
              </p>
            )}
            <section
              aria-label="Physical controller controls"
              className="shortcut-help"
            >
              <h3>
                {navigation
                  ? "Controller controls — when armed"
                  : "Shortcut — when armed"}
              </h3>
              <dl>
                <div>
                  <dt>⋯</dt>
                  <dd>Open/close Quick Access</dd>
                </div>
                {navigation && (
                  <>
                    <div>
                      <dt>D-pad Up</dt>
                      <dd>Previous item</dd>
                    </div>
                    <div>
                      <dt>D-pad Down</dt>
                      <dd>Next item</dd>
                    </div>
                    <div>
                      <dt>A</dt>
                      <dd>Activate focused item</dd>
                    </div>
                    <div>
                      <dt>B</dt>
                      <dd>Collapse section or close</dd>
                    </div>
                    <div>
                      <dt>D-pad Left/Right</dt>
                      <dd>No action in current QAM</dd>
                    </div>
                  </>
                )}
              </dl>
              {navigation && (
                <p className="muted">
                  Release before pressing again. Held buttons do not repeat; no
                  analog stick navigation.
                </p>
              )}
            </section>
            <label className="probe-consent">
              <input
                type="checkbox"
                checked={configuration}
                onChange={(e) => setConfiguration(e.target.checked)}
              />
              I confirm the reviewed test configuration: Steam Deck LCD, Windows
              11, Steam Deck Tools controller in{" "}
              {navigation ? "X360" : "Desktop"} mode, Steam running. Steam Input
              status may be unknown. Nepteer has not detected these tool
              settings.
            </label>
            <label className="probe-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I explicitly consent to passive read-only controller observation
              for this session. It ends on Disarm, error, expiry or app exit and
              never renews automatically.
            </label>
            <Button
              aria-describedby={blocked ? `${helpId}-blocked` : undefined}
              disabled={
                !connection ||
                status?.source !== "windows" ||
                status.readerOwner !== "none" ||
                !profile ||
                !reviewed(profile) ||
                !consent ||
                !configuration
              }
              onClick={() => void arm()}
            >
              Arm Physical ⋯ Shortcut
            </Button>
          </fieldset>
        </>
      )}
      <details className="shortcut-diagnostics">
        <summary>Technical session diagnostics</summary>
        <p className="muted">
          Read-only source:{" "}
          {status?.source === "windows"
            ? "WINDOWS HID"
            : status?.source === "unsupported"
              ? "UNSUPPORTED HOST"
              : "Unavailable"}{" "}
          · Reader owner: {status?.readerOwner ?? "Unknown"}
        </p>
        {attempt && (
          <div aria-label="Last Arm Attempt" className="panel">
            <strong>
              Last Arm Attempt #{attempt.id}: {attempt.outcome}
            </strong>
            <p>
              Stage: {attempt.stage.replaceAll("_", " ")} · Worker:{" "}
              {status?.workerRunning ? "running" : "not running"} · HID handle:{" "}
              {attempt.hidHandleOpened
                ? "opened during attempt"
                : "not opened during attempt"}{" "}
              · Compatible reports:{" "}
              {attempt.compatibleReportsObserved ? "observed" : "not observed"}
            </p>
          </div>
        )}
        {status && (
          <p className="muted">
            Monitor phase: {status.monitorPhase.replaceAll("_", " ")}
          </p>
        )}
        <Button
          variant="outline"
          disabled={!status}
          onClick={() => {
            if (!status) return;
            void (async () => {
              try {
                if (!navigator.clipboard?.writeText)
                  throw new Error("clipboard unavailable");
                await navigator.clipboard.writeText(
                  JSON.stringify(
                    shortcutDiagnosticSummary(
                      status,
                      version,
                      armPending ? "pending" : error ? "ipc_failed" : "idle",
                    ),
                    null,
                    2,
                  ),
                );
                setCopyNotice("Safe shortcut summary copied.");
              } catch {
                setCopyNotice(
                  "Clipboard unavailable. Retry copying from the native app.",
                );
              }
            })();
          }}
        >
          Copy Shortcut Diagnostic Summary
        </Button>
        {copyNotice && <p role="status">{copyNotice}</p>}
        {status?.interface && (
          <p className="muted">
            Session interface: {status.interface.interfaceNumber} · VID 0x28DE /
            PID 0x1205 · usage FFFF/0001 · descriptor{" "}
            {status.interface.inputReportLength}
          </p>
        )}
        <p className="muted">
          After arming, release ⋯ for at least three reports over 200ms. Holding
          at startup does nothing. Only released→pressed toggles; held/release
          reports do not. Presses less than 350ms after an accepted press are
          discarded, never delayed. A report gap over 1.5s requires a fresh
          released baseline. Incompatible framing or read failure closes the
          session; rearm manually.
        </p>
      </details>
    </section>
  );
}
