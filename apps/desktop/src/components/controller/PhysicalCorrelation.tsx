import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  ControllerControl,
  DiagnosticsSnapshot,
  ProbeEnvironment,
  ProbeStatus,
} from "@/lib/bindings";
import {
  startProbe,
  abortProbe,
  probeStatus,
  probeActive,
  diagnosticsActive,
} from "@/lib/neptune";
const controls: [ControllerControl, string][] = [
  ["a", "A"],
  ["b", "B"],
  ["x", "X"],
  ["y", "Y"],
  ["steam", "Steam"],
  ["quick_access", "Quick Access (⋯)"],
  ["dpad_up", "D-pad Up"],
  ["dpad_down", "D-pad Down"],
  ["dpad_left", "D-pad Left"],
  ["dpad_right", "D-pad Right"],
  ["l1", "L1"],
  ["r1", "R1"],
];
export default function PhysicalCorrelation({
  snapshot,
  selectedCandidateId,
}: {
  snapshot: DiagnosticsSnapshot;
  selectedCandidateId: string;
}) {
  const [local, setLocal] = useState(snapshot.probe);
  const probe =
    snapshot.probe.revision > local.revision ? snapshot.probe : local;
  const [control, setControl] = useState<ControllerControl | "">("");
  const [consent, setConsent] = useState(false);
  const [environment, setEnvironment] = useState<ProbeEnvironment>({
    steamDeckToolsRunning: "unknown",
    steamDeckToolsMode: "unknown",
    steamRunning: "unknown",
    steamInput: "unknown",
  });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mounted = useRef(false);
  const latest = useRef(probe);
  const abortAfterStart = useRef(false);
  const accept = useCallback((value: ProbeStatus) => {
    setLocal((previous) =>
      value.revision >= previous.revision ? value : previous,
    );
  }, []);
  useEffect(() => {
    latest.current = probe;
  }, [probe]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (probeActive(latest.current.outcome))
        void abortProbe(latest.current.token).catch(() => {});
    };
  }, []);
  const active = probeActive(probe.outcome);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let pending = false;
    const timer = window.setInterval(() => {
      if (pending) return;
      pending = true;
      void probeStatus()
        .then((value) => {
          if (!disposed) accept(value);
        })
        .catch(() => {
          if (!disposed)
            setError(
              "Probe status unavailable. Rust still enforces its deadline; Abort or Stop Monitoring remains available.",
            );
        })
        .finally(() => {
          pending = false;
        });
    }, 500);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [active, accept]);
  useEffect(() => {
    if (
      active &&
      (probe.monitorGeneration !== snapshot.monitor.sessionGeneration ||
        selectedCandidateId !== snapshot.monitor.candidateId ||
        !diagnosticsActive(snapshot.monitor.phase) ||
        snapshot.source !== "windows")
    ) {
      void abortProbe(probe.token)
        .then((value) => {
          if (mounted.current) accept(value);
        })
        .catch(() => {});
    }
  }, [
    active,
    probe.token,
    probe.monitorGeneration,
    snapshot.monitor.sessionGeneration,
    snapshot.monitor.candidateId,
    snapshot.monitor.phase,
    snapshot.source,
    selectedCandidateId,
    accept,
  ]);
  const candidate = snapshot.candidates.find(
    (value) => value.id === selectedCandidateId,
  );
  const eligible =
    snapshot.source === "windows" &&
    diagnosticsActive(snapshot.monitor.phase) &&
    snapshot.monitor.opened &&
    snapshot.monitor.candidateId === selectedCandidateId &&
    snapshot.monitor.report.format === "deck_v1_zero_prefixed65" &&
    snapshot.monitor.report.recognition === "candidate" &&
    candidate?.attributesVerified &&
    candidate.capabilities.passiveReadEligible &&
    candidate.usagePage !== null &&
    candidate.usagePage >= 0xff00 &&
    candidate.usage === 1 &&
    candidate.inputReportLength === 65;
  async function begin() {
    if (!control || !consent || !eligible) return;
    setStarting(true);
    setError(null);
    setCopied(false);
    abortAfterStart.current = false;
    try {
      const value = await startProbe({
        expectedToken: probe.token,
        monitorGeneration: snapshot.monitor.sessionGeneration,
        candidateId: selectedCandidateId,
        control,
        environment,
        consent,
      });
      if (!mounted.current || abortAfterStart.current) {
        const result = await abortProbe(value.token);
        if (mounted.current) accept(result);
      } else accept(value);
    } catch (reason) {
      if (mounted.current) setError(String(reason));
    } finally {
      if (mounted.current) setStarting(false);
    }
  }
  async function abort() {
    if (starting) abortAfterStart.current = true;
    if (!active) return;
    try {
      accept(await abortProbe(probe.token));
    } catch (reason) {
      if (mounted.current) setError(String(reason));
    }
  }
  const summary = probe.summary;
  const nominated =
    controls.find(([value]) => value === summary?.control)?.[1] ??
    "selected control";
  const instruction =
    probe.phase === "preparation"
      ? "Release all buttons. Rest the Deck; keep hands off sticks and trackpads."
      : probe.phase === "idle"
        ? "Idle control: do not press anything."
        : probe.phase === "press"
          ? `Press ${nominated} now.`
          : probe.phase === "hold"
            ? `Hold ${nominated}.`
            : probe.phase === "release"
              ? `Release ${nominated} now.`
              : probe.phase === "finalizing"
                ? "Release all controls. Keep hands off while the final state is observed."
                : "Procedure ended. Review the aggregate evidence.";
  const safeText = summary ? JSON.stringify(summary, null, 2) : "";
  return (
    <section
      className="panel correlation-panel"
      aria-label="Physical Button Correlation"
    >
      <h2>Physical Button Correlation</h2>
      <p className="muted">
        Local read-only candidate-bit evidence, pending independent review. No
        physical mapping is promoted or published as live events. Probe events
        never toggle QAM. Stop diagnostics before arming the separate physical
        shortcut. This probe does not change Steam Deck Tools or Steam Input.
      </p>
      <p>
        Selected interface: {selectedCandidateId || "None"} · Required format:
        deck_v1_zero_prefixed65
      </p>
      {!eligible && (
        <p className="muted">
          Select an eligible native vendor interface with descriptor length 65,
          start normal monitoring and observe the zero-prefixed 65-byte
          candidate format first. Missing reports or another format cannot
          produce a positive result. Simulation is not a physical probe.
        </p>
      )}
      <fieldset disabled={active || starting}>
        <legend>Test preparation</legend>
        <label className="controller-source">
          Physical control to test
          <select
            value={control}
            onChange={(event) => {
              setControl(event.target.value as ControllerControl | "");
              setConsent(false);
            }}
          >
            <option value="">Choose one control</option>
            {controls.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="correlation-environment">
          <label>
            Steam Deck Tools running
            <select
              value={environment.steamDeckToolsRunning}
              onChange={(e) =>
                setEnvironment({
                  ...environment,
                  steamDeckToolsRunning: e.target
                    .value as ProbeEnvironment["steamDeckToolsRunning"],
                })
              }
            >
              {["unknown", "yes", "no"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Steam Deck Tools mode
            <select
              value={environment.steamDeckToolsMode}
              onChange={(e) =>
                setEnvironment({
                  ...environment,
                  steamDeckToolsMode: e.target
                    .value as ProbeEnvironment["steamDeckToolsMode"],
                })
              }
            >
              {["unknown", "desktop", "x360", "other"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Steam running
            <select
              value={environment.steamRunning}
              onChange={(e) =>
                setEnvironment({
                  ...environment,
                  steamRunning: e.target
                    .value as ProbeEnvironment["steamRunning"],
                })
              }
            >
              {["unknown", "yes", "no"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Steam Input status
            <select
              value={environment.steamInput}
              onChange={(e) =>
                setEnvironment({
                  ...environment,
                  steamInput: e.target.value as ProbeEnvironment["steamInput"],
                })
              }
            >
              {["unknown", "enabled", "disabled"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          These are manually supplied labels only; unknown is valid. Keep a
          keyboard/touchscreen available. Schedule: 4s preparation, 3s idle,
          five 4s cycles (1.5s press, 1s hold, 1.5s release), then 2s final
          observation. No Next action is required. Rust enforces a 30s maximum.
        </p>
        <label className="probe-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I consent to this short, local, memory-only correlation test. I
          understand that observation is not physical verification.
        </label>
      </fieldset>
      <div className="controller-actions">
        <Button
          disabled={!eligible || !control || !consent || active || starting}
          onClick={() => void begin()}
        >
          Start Probe
        </Button>
        <Button
          variant="outline"
          disabled={!active && !starting}
          onClick={() => void abort()}
        >
          Abort Probe
        </Button>
      </div>
      {error && (
        <p role="alert" className="qam-error">
          {error}
        </p>
      )}
      <div className="probe-guidance" role="status" aria-live="polite">
        <strong>
          {probe.outcome === "observed"
            ? "Observed candidate-bit correlation — pending independent review"
            : `Probe: ${probe.outcome.replaceAll("_", " ")}`}
        </strong>
        {active && (
          <>
            <p>{instruction}</p>
            <p>
              Phase: {probe.phase} · Cycle {probe.cycle} of 5 ·{" "}
              {Math.ceil(probe.remainingMs / 1000)}s remaining
            </p>
          </>
        )}
        {summary?.reason && (
          <p>Completion: {summary.reason.replaceAll("_", " ")}</p>
        )}
      </div>
      {summary && (
        <>
          <table className="probe-results">
            <caption>Candidate correlation aggregate results</caption>
            <tbody>
              <tr>
                <th scope="row">Nominated control / candidate bit</th>
                <td>
                  {nominated} / {summary.candidateBit}
                </td>
              </tr>
              <tr>
                <th scope="row">Format</th>
                <td>{summary.format}</td>
              </tr>
              <tr>
                <th scope="row">
                  Compatible / incompatible / malformed reports
                </th>
                <td>
                  {summary.counts.compatibleReports} /{" "}
                  {summary.counts.incompatibleReports} /{" "}
                  {summary.counts.malformedReports}
                </td>
              </tr>
              <tr>
                <th scope="row">Stable released baseline</th>
                <td>
                  {summary.counts.baselineEstablished
                    ? "Established"
                    : "Not established"}
                </td>
              </tr>
              <tr>
                <th scope="row">Completed cycles</th>
                <td>{summary.counts.completedCycles} / 5</td>
              </tr>
              <tr>
                <th scope="row">Press / release edges in expected windows</th>
                <td>
                  {summary.counts.expectedPressEdges} /{" "}
                  {summary.counts.expectedReleaseEdges}
                </td>
              </tr>
              <tr>
                <th scope="row">All nominated press / release edges</th>
                <td>
                  {summary.counts.observedPressEdges} /{" "}
                  {summary.counts.observedReleaseEdges}
                </td>
              </tr>
              <tr>
                <th scope="row">Missing expected press / release</th>
                <td>
                  {summary.counts.missingPresses} /{" "}
                  {summary.counts.missingReleases}
                </td>
              </tr>
              <tr>
                <th scope="row">Repeated held reports</th>
                <td>{summary.counts.repeatedHeldReports}</td>
              </tr>
              <tr>
                <th scope="row">Idle false-positive transitions</th>
                <td>{summary.counts.idleTransitions}</td>
              </tr>
              <tr>
                <th scope="row">
                  Outside-phase / early / late / repeated edges
                </th>
                <td>
                  {summary.counts.outsidePhaseEdges} /{" "}
                  {summary.counts.earlyEdges} / {summary.counts.lateEdges} /{" "}
                  {summary.counts.repeatedEdges}
                </td>
              </tr>
              <tr>
                <th scope="row">Unrelated known / unknown bit changes</th>
                <td>
                  {summary.counts.unrelatedKnownChanges} /{" "}
                  {summary.counts.unknownBitChanges}
                </td>
              </tr>
              <tr>
                <th scope="row">Report gaps / framing changed</th>
                <td>
                  {summary.counts.reportGaps} /{" "}
                  {summary.counts.framingChanged ? "Yes" : "No"}
                </td>
              </tr>
              <tr>
                <th scope="row">Final nominated state</th>
                <td>
                  {summary.counts.finalReleased === null
                    ? "Unavailable"
                    : summary.counts.finalReleased
                      ? "Released"
                      : "Not released"}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted">
            Counts describe observed candidate-word edges and timing, not
            confirmed finger actions. Unrelated changes may be noise or
            contamination; review them independently. Missing reports, ambiguous
            timing and false positives remain inconclusive. No raw data or
            private paths are included.
          </p>
          {!active && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  void (async () => {
                    try {
                      if (!navigator.clipboard?.writeText)
                        throw new Error("Clipboard unavailable");
                      await navigator.clipboard.writeText(safeText);
                      setCopied(true);
                    } catch {
                      setError(
                        "Clipboard unavailable. Select the safe summary below and copy it manually.",
                      );
                    }
                  })();
                }}
              >
                Copy Safe Summary
              </Button>
              {copied && <p role="status">Safe summary copied.</p>}
              <details>
                <summary>Safe aggregate summary</summary>
                <textarea
                  aria-label="Safe aggregate summary"
                  readOnly
                  value={safeText}
                />
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}
