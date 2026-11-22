import { useCallback, useEffect, useRef, useState } from "react";
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
  disarmed: "Disabled",
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
}: {
  expanded: boolean;
  onManage: () => void;
}) {
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
  return (
    <section
      className="physical-shortcut"
      aria-label="Physical Quick Access Shortcut"
    >
      <div className="physical-shortcut-bar">
        <div>
          <strong>Physical Quick Access Shortcut</strong>
          <p className="muted" role="status">
            {status ? labels[status.phase] : "Status unavailable"}
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
      {blocked && !armPending && <p className="qam-error">{blocked}</p>}
      {eventsUnavailable && (
        <p className="muted">
          Live status subscription unavailable; native status polling remains
          active.
        </p>
      )}
      {disarmPending && (
        <p role="status">Disarming — waiting for safe reader cleanup…</p>
      )}
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
      {expanded && (
        <>
          <p>
            Only the physical ⋯ press toggles Nepteer's QAM. No controller
            remapping or hardware configuration is performed.
          </p>
          <p className="muted">
            Disabled by default, session-only, at most 30 minutes. Ctrl+Alt+Q
            and Open Quick Access remain available. Other tools may also react
            to ⋯; Nepteer never suppresses their actions. Disarm if overlays
            conflict.
          </p>
          <p className="muted">
            Read-only source:{" "}
            {status?.source === "windows"
              ? "WINDOWS HID"
              : status?.source === "unsupported"
                ? "UNSUPPORTED HOST"
                : "Unavailable"}{" "}
            · Reader owner: {status?.readerOwner ?? "Unknown"}
          </p>
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
            <label className="controller-source">
              Reviewed session mode (manually confirmed)
              <select
                value={navigation ? "x360" : "desktop"}
                onChange={(e) => {
                  setNavigation(e.target.value === "x360");
                  setConsent(false);
                  setConfiguration(false);
                }}
              >
                <option value="desktop">
                  Desktop — existing ⋯ toggle only
                </option>
                <option value="x360">
                  X360 — ⋯ toggle and desktop-only QAM navigation
                </option>
              </select>
            </label>
            <p className="muted">
              Controller navigation observes physical buttons without
              suppressing them. Games or other controller utilities may still
              receive the same input. Select X360 only if already running in
              that reviewed configuration; Nepteer does not detect or change
              tool modes. Initial navigation testing requires no active game.
            </p>
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
          {status?.interface && (
            <p className="muted">
              Session interface: {status.interface.interfaceNumber} · VID 0x28DE
              / PID 0x1205 · usage FFFF/0001 · descriptor{" "}
              {status.interface.inputReportLength}
            </p>
          )}
          <p className="muted">
            After arming, release ⋯ for at least three reports over 200ms.
            Holding at startup does nothing. Only released→pressed toggles;
            held/release reports do not. Presses less than 350ms after an
            accepted press are discarded, never delayed. A report gap over 1.5s
            requires a fresh released baseline. Incompatible framing or read
            failure closes the session; rearm manually.
          </p>
        </>
      )}
      {status?.navigation.issue && (
        <p role="alert">
          QAM navigation stopped: {status.navigation.issue.replaceAll("_", " ")}
          . Keyboard/touch and ⋯ remain available; Disarm and rearm manually.
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
    </section>
  );
}
