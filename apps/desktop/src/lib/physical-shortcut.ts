import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ShortcutArmRequest, ShortcutStatus } from "./bindings";
function native(command: string, args: Record<string, unknown> = {}) {
  if (!isTauri())
    return Promise.reject(
      new Error("Physical shortcut requires the native Windows app."),
    );
  return invoke<ShortcutStatus>(command, args);
}
export const shortcutStatus = () => native("neptune_shortcut_status");
export const armShortcut = (request: ShortcutArmRequest) =>
  native("neptune_shortcut_arm", { request });
export const disarmShortcut = (generation: number) =>
  native("neptune_shortcut_disarm", { generation });
export const onPhysicalShortcut = (callback: (value: ShortcutStatus) => void) =>
  listen<ShortcutStatus>("neptune-shortcut-changed", (event) =>
    callback(event.payload),
  );
export const shortcutOwnsReader = (value: ShortcutStatus) =>
  value.opened ||
  [
    "arming",
    "waiting_reports",
    "waiting_baseline",
    "armed",
    "disarming",
  ].includes(value.phase);

export const shortcutReasons: Record<
  import("./bindings").ArmReason,
  [string, string]
> = {
  monitor_active: [
    "Native diagnostic monitoring currently owns the Neptune reader.",
    "Stop Monitoring on Controller before arming the shortcut.",
  ],
  probe_active: [
    "A correlation probe currently owns the reader.",
    "Abort the probe and Stop Monitoring before arming.",
  ],
  shortcut_already_active: [
    "A physical shortcut session already owns the reader.",
    "Use the active session, or Disarm Shortcut before rearming.",
  ],
  stale_generation: [
    "The shortcut session changed before this request was accepted.",
    "Refresh status, then retry Arm.",
  ],
  candidate_not_found: [
    "The previously selected HID candidate is no longer available.",
    "Rescan native interfaces and select the vendor-defined collection again.",
  ],
  candidate_ineligible: [
    "The selected interface is outside the reviewed profile or its metadata changed.",
    "Rescan and select interface 2, FFFF/0001, descriptor length 65.",
  ],
  unsupported_source: [
    "Native Windows discovery is required; simulated input cannot arm this shortcut.",
    "Use the Windows app and rescan native interfaces.",
  ],
  consent_required: [
    "Explicit consent and reviewed-configuration acknowledgment are required.",
    "Review both acknowledgments before retrying Arm.",
  ],
  access_denied: [
    "Windows denied passive HID access.",
    "Leave controller configuration unchanged. Retry manually when access is available; do not elevate.",
  ],
  device_busy: [
    "Windows reported that the HID device is busy.",
    "Retry manually later. Nepteer will not take exclusive access or stop other tools.",
  ],
  disconnected: [
    "Windows reported a disconnected or unavailable device.",
    "Rescan and select the native vendor collection, then rearm manually.",
  ],
  hid_open_failed: [
    "The native worker could not open or validate the selected HID interface.",
    "Rescan and reselect the vendor collection before retrying.",
  ],
  worker_spawn_failed: [
    "Nepteer could not start the shortcut worker.",
    "Retry Arm, or restart Nepteer if the failure repeats.",
  ],
  read_failed: [
    "The HID reader failed after opening.",
    "Observation stopped. Rescan and rearm manually; no automatic reconnect is attempted.",
  ],
  unsupported_format: [
    "The observed report framing is incompatible with the reviewed format.",
    "Rescan and confirm the reviewed interface. Do not change controller configuration.",
  ],
  no_compatible_reports: [
    "No compatible reports arrived within the initial five-second window.",
    "Check the selected interface, then retry manually; no simulated fallback is used.",
  ],
  session_expired: [
    "The thirty-minute shortcut session expired.",
    "Arm explicitly to begin a new bounded session.",
  ],
  user_disarmed: [
    "The shortcut was disarmed successfully.",
    "Arm explicitly when needed.",
  ],
  shutdown: [
    "Nepteer is shutting down; observation is ending.",
    "After restarting, rescan and arm explicitly.",
  ],
  unexpected_termination: [
    "The shortcut worker terminated unexpectedly.",
    "Rescan and retry manually. Copy this diagnostic summary if it repeats.",
  ],
  queue_full: [
    "The bounded QAM action queue filled; the shortcut stopped safely.",
    "Disarm if cleanup is pending, then retry manually.",
  ],
  dispatch_failed: [
    "The existing QAM coordinator could not perform a shortcut action.",
    "Try Open Quick Access, then explicitly rearm the physical shortcut.",
  ],
  internal_error: [
    "The shortcut coordinator encountered an internal error.",
    "Restart Nepteer if retry fails, and copy the safe summary.",
  ],
};
export function shortcutDiagnosticSummary(
  value: ShortcutStatus,
  version: string,
  requestState: "pending" | "ipc_failed" | "idle",
) {
  const i = value.interface;
  const a = value.lastAttempt;
  return {
    version,
    shortcutPhase: value.phase,
    readerOwner: value.readerOwner,
    monitorPhase: value.monitorPhase,
    requestState,
    lastArmAttempt: a
      ? {
          id: a.id,
          stage: a.stage,
          outcome: a.outcome,
          reason: a.reason,
          candidateSelected: a.candidateSelected,
          candidateEligible: a.candidateEligible,
          hidHandleOpened: a.hidHandleOpened,
          compatibleReportsObserved: a.compatibleReportsObserved,
        }
      : null,
    terminationReason: value.terminationReason,
    workerRunning: value.workerRunning,
    navigation: {
      configured: value.navigation.configured,
      pending: value.navigation.pending,
      delivering: value.navigation.delivering,
      issue: value.navigation.issue,
    },
    hidHandleCurrentlyOpened: value.opened,
    interface: i
      ? {
          vendorId: i.vendorId,
          productId: i.productId,
          interfaceNumber: i.interfaceNumber,
          usagePage: i.usagePage,
          usage: i.usage,
          inputReportLength: i.inputReportLength,
        }
      : null,
    manualRescanRequired: value.manualRescanRequired,
  };
}
