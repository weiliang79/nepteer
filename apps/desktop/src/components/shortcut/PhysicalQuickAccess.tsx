import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { listCandidates, rescanCandidates } from "@/lib/neptune";
import {
  armShortcut,
  disarmShortcut,
  shortcutStatus,
  onPhysicalShortcut,
  shortcutOwnsReader,
} from "@/lib/physical-shortcut";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState(false);
  const alive = useRef(false);
  const latest = useRef<ShortcutStatus | null>(null);
  const accept = useCallback((value: ShortcutStatus) => {
    if (
      !alive.current ||
      (latest.current && value.revision < latest.current.revision)
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
      .catch(() => {});
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
    setError(null);
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
    } catch (reason) {
      if (alive.current) setError(String(reason));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function arm() {
    if (!status || !selected || !consent || !configuration) return;
    setBusy(true);
    setError(null);
    try {
      accept(
        await armShortcut({
          candidateId: selected,
          expectedGeneration: status.generation,
          consent,
          reviewedConfiguration: configuration,
        }),
      );
    } catch (reason) {
      if (alive.current) setError(String(reason));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function disarm() {
    if (!status) return;
    setError(null);
    try {
      accept(await disarmShortcut(status.generation));
    } catch (reason) {
      if (alive.current) setError(String(reason));
    }
  }
  const profile = candidates.find((c) => c.id === selected);
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
            disabled={!owned}
            onClick={() => void disarm()}
          >
            Disarm Shortcut
          </Button>
        </div>
      </div>
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
          {status?.readerOwner === "diagnostics" && (
            <p className="muted">
              Stop Monitoring / the correlation probe before arming. Switching
              modes never takes over another reader.
            </p>
          )}
          <fieldset disabled={owned || busy}>
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
            <label className="probe-consent">
              <input
                type="checkbox"
                checked={configuration}
                onChange={(e) => setConfiguration(e.target.checked)}
              />
              I confirm the reviewed test configuration: Steam Deck LCD, Windows
              11, Steam Deck Tools controller in Desktop mode, Steam running.
              Steam Input status may be unknown. Nepteer has not detected these
              tool settings.
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
