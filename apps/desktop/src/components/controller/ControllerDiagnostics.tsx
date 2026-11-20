import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DiagnosticsMode, DiagnosticsSnapshot } from "@/lib/bindings";
import {
  listCandidates,
  rescanCandidates,
  startMonitoring,
  stopMonitoring,
  monitoringStatus,
  onDiagnostics,
  diagnosticsActive,
} from "@/lib/neptune";
const hex = (value: number | null, length = 4) =>
  value === null
    ? "Unknown"
    : `0x${value.toString(16).toUpperCase().padStart(length, "0")}`;
export default function ControllerDiagnostics() {
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
  const [mode, setMode] = useState<DiagnosticsMode>("native");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let stop: (() => void) | undefined;
    // Subscribe before reading actual native state. Opening this page never scans or opens HID.
    void (async () => {
      const unlisten = await onDiagnostics((data) => {
        if (!disposed) {
          revision.current += 1;
          setSnapshot(data);
        }
      });
      if (disposed) {
        unlisten();
        return;
      }
      stop = unlisten;
      const before = revision.current;
      const data = await listCandidates();
      if (!disposed && before === revision.current) {
        setSnapshot(data);
        setMode(data.source === "simulated" ? "simulated" : "native");
        setSelected(data.monitor.candidateId ?? "");
      }
    })().catch((reason) => {
      if (!disposed) setError(String(reason));
    });
    return () => {
      disposed = true;
      mounted.current = false;
      stop?.();
      void stopMonitoring().catch(() => {});
    };
  }, []);
  const active = snapshot ? diagnosticsActive(snapshot.monitor.phase) : false;
  async function action(work: () => Promise<DiagnosticsSnapshot>) {
    setBusy(true);
    setError(null);
    const before = revision.current;
    try {
      const value = await work();
      if (!mounted.current) {
        await stopMonitoring();
        return;
      }
      // A newer native event wins over an earlier command response.
      if (revision.current === before) setSnapshot(value);
    } catch (reason) {
      if (mounted.current) setError(String(reason));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const source =
    snapshot?.source === "windows"
      ? "WINDOWS HID"
      : snapshot?.source === "simulated"
        ? "SIMULATED INPUT"
        : "NATIVE INPUT UNAVAILABLE";
  const candidate = snapshot?.candidates.find((value) => value.id === selected);
  return (
    <section
      className="controller-diagnostics"
      aria-label="Controller diagnostics"
    >
      <div className="device-strip">
        <div>
          <p className="eyebrow">NEPTUNE DISCOVERY · READ ONLY</p>
          <h2>Observe, without taking ownership.</h2>
        </div>
        <span className="source-pill">{source}</span>
      </div>
      <div className="notice">
        <div>
          <strong>
            Opt-in diagnostics · No remapping or Steam Input replacement
          </strong>
          <p>
            Discovery is manual. Monitoring never sends output/feature reports,
            changes hardware, or takes exclusive access. Sessions stop after
            five minutes or when you leave this page. No button decoding is
            verified; no controller button opens QAM.
          </p>
        </div>
      </div>
      <div className="panel">
        <h2>Device discovery</h2>
        <label className="controller-source">
          Diagnostic source
          <select
            value={mode}
            disabled={busy || active}
            onChange={(event) => {
              setMode(event.target.value as DiagnosticsMode);
              setSelected("");
            }}
          >
            <option value="native">Windows native HID</option>
            <option value="simulated">
              Simulated diagnostics (development)
            </option>
          </select>
        </label>
        <p className="muted">
          Selecting a source does not scan or start observation. Simulated
          diagnostics never access hardware.
        </p>
        <div className="controller-actions">
          <Button
            disabled={busy}
            onClick={() =>
              void action(async () => {
                const data = await rescanCandidates(mode);
                setSelected("");
                return data;
              })
            }
          >
            Rescan interfaces
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void action(monitoringStatus)}
          >
            Refresh status
          </Button>
        </div>
        {error && (
          <p role="alert" className="qam-error">
            {error}
          </p>
        )}
        {snapshot && (
          <>
            <p role="status" className="muted">
              {snapshot.discovery === "not_scanned"
                ? "Not scanned · No devices opened"
                : snapshot.discovery === "not_found"
                  ? "No Neptune candidate detected"
                  : snapshot.discovery === "candidates"
                    ? `${snapshot.candidates.length} candidate interface(s) detected · Not confirmed readable`
                    : snapshot.discovery === "unsupported"
                      ? "Native HID discovery is unavailable on this host"
                      : snapshot.discovery === "error"
                        ? "Device discovery failed"
                        : "Scanning interfaces…"}
            </p>
            {snapshot.discoveryIssue && (
              <p className="qam-error">{snapshot.discoveryIssue.message}</p>
            )}
            <div className="controller-candidates">
              {snapshot.candidates.map((value) => (
                <article key={value.id} className="controller-candidate">
                  <h3>{value.product ?? "Unknown product description"}</h3>
                  <p className="muted">
                    {value.manufacturer ?? "Unknown manufacturer"} · VID{" "}
                    {hex(value.vendorId)} / PID {hex(value.productId)}
                  </p>
                  <dl className="capabilities">
                    <div>
                      <dt>Usage page / usage</dt>
                      <dd>
                        {hex(value.usagePage)} / {hex(value.usage)}
                      </dd>
                    </div>
                    <div>
                      <dt>Interface number</dt>
                      <dd>{value.interfaceNumber ?? "Unknown"}</dd>
                    </div>
                    <div>
                      <dt>Descriptor input length</dt>
                      <dd>{value.inputReportLength ?? "Unknown"}</dd>
                    </div>
                    <div>
                      <dt>Attributes</dt>
                      <dd>
                        {value.attributesVerified
                          ? "VID/PID confirmed · Candidate only"
                          : "Unverified path candidate"}
                      </dd>
                    </div>
                    <div>
                      <dt>Shared-read eligibility</dt>
                      <dd>
                        {value.capabilities.passiveReadEligible
                          ? "May attempt · Access not yet proven"
                          : "Discovery only"}
                      </dd>
                    </div>
                  </dl>
                  {value.issue && (
                    <p className="muted">{value.issue.message}</p>
                  )}
                  <Button
                    variant="outline"
                    disabled={
                      busy || active || !value.capabilities.passiveReadEligible
                    }
                    aria-pressed={selected === value.id}
                    onClick={() => setSelected(value.id)}
                  >
                    Select interface {value.id}
                  </Button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      <section className="panel">
        <h2>Passive monitoring</h2>
        <p className="muted">
          Select an eligible vendor-defined candidate, then explicitly start.
          Mouse, keyboard, unknown collections and virtual Xbox-compatible
          devices are not input targets. Rescan stops an existing session first.
        </p>
        <div className="controller-actions">
          <Button
            disabled={
              busy || active || !candidate?.capabilities.passiveReadEligible
            }
            onClick={() => void action(() => startMonitoring(selected))}
          >
            Start Monitoring
          </Button>
          <Button
            variant="outline"
            disabled={busy || !active}
            onClick={() => void action(stopMonitoring)}
          >
            Stop Monitoring
          </Button>
        </div>
        {snapshot && (
          <>
            <dl className="capabilities">
              <div>
                <dt>Monitor state</dt>
                <dd>{snapshot.monitor.phase.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Read handle open</dt>
                <dd>
                  {snapshot.monitor.opened ? "Yes · Shared read only" : "No"}
                </dd>
              </div>
              <div>
                <dt>Readable report count</dt>
                <dd>{snapshot.monitor.reportCount}</dd>
              </div>
              <div>
                <dt>Last report length</dt>
                <dd>{snapshot.monitor.lastReportLength ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>Last report received</dt>
                <dd>
                  {snapshot.monitor.lastReportAtUnixMs === null
                    ? "Unavailable"
                    : new Date(
                        snapshot.monitor.lastReportAtUnixMs,
                      ).toLocaleTimeString()}
                </dd>
              </div>
            </dl>
            {!active && (
              <p className="muted">
                Observation stopped. Counts/times, if present, describe the last
                session; no held state is retained.
              </p>
            )}
            {snapshot.monitor.phase === "raw_input_only" && (
              <p className="muted">
                Raw input is observable. Report format and button interpretation
                are unsupported.
              </p>
            )}
            {snapshot.monitor.issue && (
              <p role="status" className="qam-error">
                {snapshot.monitor.issue.kind.replaceAll("_", " ")}:{" "}
                {snapshot.monitor.issue.message}
              </p>
            )}
          </>
        )}
      </section>
      <section className="panel">
        <h2>Input interpretation · Unverified</h2>
        <p className="muted">
          Report length alone does not identify a protocol. No Steam/⋯, face
          button, D-pad, shoulder, trigger, rear button, stick or trackpad
          interpretation is implemented. All controls remain unavailable; no
          synthetic press/release is generated.
        </p>
        <div className="controller-inputs">
          {snapshot?.monitor.controls.map((control) => (
            <div key={control.control}>
              <span>{control.control.replaceAll("_", " ")}</span>
              <span>Unavailable</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
