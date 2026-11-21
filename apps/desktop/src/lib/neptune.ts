import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  DiagnosticsMode,
  DiagnosticsSnapshot,
  MonitorPhase,
  ProbeStatus,
  ProbeStartRequest,
} from "./bindings";
function native<T = DiagnosticsSnapshot>(
  command: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!isTauri())
    return Promise.reject(
      new Error("Controller diagnostics need the native Nepteer app."),
    );
  return invoke<T>(command, args);
}
export const listCandidates = () => native("neptune_list");
export const rescanCandidates = (mode: DiagnosticsMode) =>
  native("neptune_rescan", { mode });
export const startMonitoring = (candidateId: string) =>
  native("neptune_start", { candidateId });
export const stopMonitoring = () => native("neptune_stop");
export const monitoringStatus = () => native("neptune_status");
export const diagnosticsActive = (phase: MonitorPhase) =>
  [
    "starting",
    "awaiting_reports",
    "raw_input_only",
    "simulated_input",
  ].includes(phase);
export const onDiagnostics = (
  callback: (snapshot: DiagnosticsSnapshot) => void,
): Promise<UnlistenFn> =>
  listen<DiagnosticsSnapshot>("neptune-diagnostics", (event) =>
    callback(event.payload),
  );

export const startProbe = (request: ProbeStartRequest) =>
  native<ProbeStatus>("neptune_probe_start", { request });
export const probeStatus = () => native<ProbeStatus>("neptune_probe_status");
export const abortProbe = (token: number) =>
  native<ProbeStatus>("neptune_probe_abort", { token });
export const probeActive = (outcome: ProbeStatus["outcome"]) =>
  outcome === "preparing" || outcome === "running";
