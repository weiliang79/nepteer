import { beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhysicalQuickAccess from "./PhysicalQuickAccess";
import type { Candidate, ShortcutStatus } from "@/lib/bindings";
import * as api from "@/lib/physical-shortcut";
import * as diagnostics from "@/lib/neptune";
vi.mock("@/lib/physical-shortcut", async (original) => ({
  ...(await original<typeof import("@/lib/physical-shortcut")>()),
  shortcutStatus: vi.fn(),
  onPhysicalShortcut: vi.fn(),
  armShortcut: vi.fn(),
  disarmShortcut: vi.fn(),
}));
vi.mock("@/lib/neptune", async (original) => ({
  ...(await original<typeof import("@/lib/neptune")>()),
  listCandidates: vi.fn(),
  rescanCandidates: vi.fn(),
}));
const disabled: ShortcutStatus = {
  generation: 0,
  revision: 1,
  phase: "disarmed",
  remainingMs: 0,
  opened: false,
  source: "windows",
  readerOwner: "none",
  interface: null,
  issue: null,
  manualRescanRequired: false,
  lastAttempt: null,
  terminationReason: null,
  workerRunning: false,
  monitorPhase: "stopped" as const,
};
const armed: ShortcutStatus = {
  ...disabled,
  generation: 1,
  revision: 4,
  phase: "armed",
  opened: true,
  remainingMs: 1800000,
  readerOwner: "shortcut",
};
const candidate: Candidate = {
  id: "scan1-candidate3",
  vendorId: 0x28de,
  productId: 0x1205,
  interfaceNumber: 2,
  usagePage: 0xffff,
  usage: 1,
  inputReportLength: 65,
  manufacturer: null,
  product: null,
  attributesVerified: true,
  capabilities: { passiveReadEligible: true, buttonDecoding: false },
  issue: null,
};
let emit: (s: ShortcutStatus) => void;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.shortcutStatus).mockReset().mockResolvedValue(disabled);
  vi.mocked(api.onPhysicalShortcut).mockImplementation(async (callback) => {
    emit = callback;
    return () => {};
  });
  vi.mocked(api.armShortcut).mockReset().mockResolvedValue(armed);
  vi.mocked(api.disarmShortcut)
    .mockReset()
    .mockResolvedValue({ ...disabled, generation: 1, revision: 5 });
  vi.mocked(diagnostics.rescanCandidates).mockResolvedValue({
    candidates: [candidate],
  } as Awaited<ReturnType<typeof diagnostics.rescanCandidates>>);
});
async function prepare() {
  const user = userEvent.setup();
  await screen.findByText("Disabled");
  await user.click(
    screen.getByRole("button", { name: "Rescan native shortcut interfaces" }),
  );
  await user.selectOptions(
    screen.getByLabelText("Shortcut interface"),
    candidate.id,
  );
  return user;
}
test("disabled startup opens no HID; explicit profile, consent and Arm are required", async () => {
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  const user = await prepare();
  expect(api.armShortcut).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("checkbox", { name: /reviewed test configuration/ }),
  );
  expect(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("checkbox", { name: /consent to passive/ }),
  );
  await user.click(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  );
  expect(api.armShortcut).toHaveBeenCalledWith({
    candidateId: candidate.id,
    expectedGeneration: 0,
    consent: true,
    reviewedConfiguration: true,
  });
  expect(
    await screen.findByText(/Armed · 30 min remaining/),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Disarm Shortcut" })).toBeEnabled();
});
test("wrong collection and diagnostic ownership cannot silently switch modes", async () => {
  vi.mocked(diagnostics.rescanCandidates).mockResolvedValue({
    candidates: [{ ...candidate, usagePage: 1, interfaceNumber: 0 }],
  } as Awaited<ReturnType<typeof diagnostics.rescanCandidates>>);
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  await prepare();
  expect(
    screen.getByRole("option", { name: /Outside reviewed profile/ }),
  ).toBeDisabled();
  expect(api.armShortcut).not.toHaveBeenCalled();
  act(() => emit({ ...disabled, revision: 2, readerOwner: "diagnostics" }));
  expect(
    screen.getByText(/Stop Monitoring \/ the correlation probe/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Rescan native shortcut interfaces" }),
  ).toBeDisabled();
});
test("native events show waiting baseline, remaining time and error without issuing window commands", async () => {
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  await screen.findByText("Disabled");
  act(() =>
    emit({
      ...armed,
      revision: 5,
      phase: "waiting_baseline",
      remainingMs: 120000,
    }),
  );
  expect(
    screen.getByText(/Waiting for released baseline · 2 min/),
  ).toBeInTheDocument();
  act(() =>
    emit({
      ...armed,
      revision: 6,
      phase: "unsupported_format",
      opened: false,
      remainingMs: 0,
      readerOwner: "none",
      issue: "incompatible_format",
    }),
  );
  expect(screen.getByText("Unsupported format")).toBeInTheDocument();
  expect(screen.getByText(/incompatible format/)).toBeInTheDocument();
  expect(api.armShortcut).not.toHaveBeenCalled();
});
test("disarm uses generation and stale event cannot revive the session", async () => {
  vi.mocked(api.shortcutStatus).mockResolvedValue(armed);
  const user = userEvent.setup();
  render(<PhysicalQuickAccess expanded={false} onManage={() => {}} />);
  await screen.findByText(/Armed · 30 min/);
  await user.click(screen.getByRole("button", { name: "Disarm Shortcut" }));
  expect(api.disarmShortcut).toHaveBeenCalledWith(1);
  expect(await screen.findByText("Disabled")).toBeInTheDocument();
  act(() => emit(armed));
  expect(screen.getByText("Disabled")).toBeInTheDocument();
});
test("native expiry updates via polling and requires manual rearm", async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(api.shortcutStatus)
      .mockResolvedValueOnce(armed)
      .mockResolvedValue({
        ...disabled,
        generation: 1,
        revision: 9,
        phase: "expired",
      });
    const view = render(<PhysicalQuickAccess expanded onManage={() => {}} />);
    await act(async () => {});
    expect(screen.getByText(/Armed · 30 min/)).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(api.armShortcut).not.toHaveBeenCalled();
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});
test("leaving controls or hiding the main window does not disarm an app-owned session", async () => {
  vi.mocked(api.shortcutStatus).mockResolvedValue(armed);
  const view = render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  await screen.findByText(/Armed · 30 min/);
  view.rerender(<PhysicalQuickAccess expanded={false} onManage={() => {}} />);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(screen.getByRole("button", { name: "Disarm Shortcut" })).toBeEnabled();
  expect(api.disarmShortcut).not.toHaveBeenCalled();
  view.unmount();
  expect(api.disarmShortcut).not.toHaveBeenCalled();
  vi.mocked(api.shortcutStatus).mockResolvedValue(disabled);
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  expect(await screen.findByText("Disabled")).toBeInTheDocument();
});
test("arming conflict/error remains visible and does not substitute simulation", async () => {
  vi.mocked(api.armShortcut).mockRejectedValueOnce(
    new Error("Stop diagnostics before arming"),
  );
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  const user = await prepare();
  await user.click(
    screen.getByRole("checkbox", { name: /reviewed test configuration/ }),
  );
  await user.click(
    screen.getByRole("checkbox", { name: /consent to passive/ }),
  );
  await user.click(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Arm request failed",
  );
  expect(screen.queryByText("SIMULATED INPUT")).not.toBeInTheDocument();
});

const attempt = (
  reason: NonNullable<ShortcutStatus["lastAttempt"]>["reason"] = null,
): NonNullable<ShortcutStatus["lastAttempt"]> => ({
  id: 1,
  stage: reason ? "terminated" : "armed",
  outcome: reason ? "terminated" : "active",
  reason,
  candidateSelected: true,
  candidateEligible: true,
  hidHandleOpened: true,
  compatibleReportsObserved: !reason,
});
async function ready() {
  const user = await prepare();
  await user.click(
    screen.getByRole("checkbox", { name: /reviewed test configuration/ }),
  );
  await user.click(
    screen.getByRole("checkbox", { name: /consent to passive/ }),
  );
  return user;
}
test("Arm immediately shows pending, blocks duplicate requests and rejects older response after worker failure", async () => {
  let resolve!: (v: ShortcutStatus) => void;
  vi.mocked(api.armShortcut).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  const user = await ready();
  const button = screen.getByRole("button", {
    name: "Arm Physical ⋯ Shortcut",
  });
  await user.click(button);
  expect(
    screen.getByText(/Arming — checking controller access/),
  ).toBeInTheDocument();
  expect(button).toBeDisabled();
  await user.click(button);
  expect(api.armShortcut).toHaveBeenCalledTimes(1);
  act(() =>
    emit({
      ...disabled,
      generation: 1,
      revision: 10,
      phase: "access_denied",
      lastAttempt: attempt("access_denied"),
      terminationReason: "access_denied",
    }),
  );
  await act(async () => resolve({ ...armed, revision: 4, phase: "arming" }));
  expect(screen.getByText("Access denied")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Windows denied passive HID access",
  );
  expect(screen.getByRole("alert")).toHaveTextContent("do not elevate");
  act(() => emit({ ...disabled, revision: 11 })); // Even a higher revision cannot revive an older generation.
  expect(screen.getByText("Access denied")).toBeInTheDocument();
});
test("polling while Arm is pending cannot clear pending or replace a newer failure", async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(api.armShortcut).mockImplementation(() => new Promise(() => {}));
    const view = render(<PhysicalQuickAccess expanded onManage={() => {}} />);
    await act(async () => {});
    fireEvent.click(
      screen.getByRole("button", { name: "Rescan native shortcut interfaces" }),
    );
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("Shortcut interface"), {
      target: { value: candidate.id },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /reviewed test configuration/ }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /consent to passive/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
    );
    vi.mocked(api.shortcutStatus).mockResolvedValue({
      ...disabled,
      revision: 2,
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Arm request sent/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
    ).toBeDisabled();
    act(() =>
      emit({
        ...disabled,
        generation: 1,
        revision: 10,
        phase: "error",
        lastAttempt: attempt("read_failed"),
      }),
    );
    vi.mocked(api.shortcutStatus).mockResolvedValue({ ...armed, revision: 5 });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "HID reader failed after opening",
    );
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});
test("rejection leaves Disarmed with concrete last attempt and remains after native refresh", async () => {
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  const user = await ready();
  const rejected: ShortcutStatus = {
    ...disabled,
    revision: 7,
    monitorPhase: "raw_input_only",
    readerOwner: "diagnostics",
    lastAttempt: {
      ...attempt("monitor_active"),
      stage: "ownership_check",
      outcome: "rejected",
      hidHandleOpened: false,
    },
  };
  vi.mocked(api.armShortcut).mockRejectedValueOnce(
    "private OS message that must not be rendered",
  );
  vi.mocked(api.shortcutStatus).mockResolvedValue(rejected);
  await user.click(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  );
  expect(
    await screen.findByText(/Last Arm Attempt #1: rejected/),
  ).toBeInTheDocument();
  expect(screen.getByText("Disabled")).toBeInTheDocument();
  expect(
    screen.getByText(/Native diagnostic monitoring currently owns/),
  ).toHaveTextContent("Stop Monitoring");
  expect(screen.queryByText(/private OS message/)).not.toBeInTheDocument();
  act(() =>
    emit({
      ...rejected,
      revision: 8,
      readerOwner: "none",
      monitorPhase: "stopped",
    }),
  );
  expect(
    screen.getByText(/Native diagnostic monitoring currently owns/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  ).toBeEnabled();
  vi.mocked(api.armShortcut).mockResolvedValueOnce({
    ...armed,
    revision: 9,
    lastAttempt: { ...attempt(), id: 2 },
  });
  await user.click(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  );
  expect(
    await screen.findByText(/Last Arm Attempt #2: active/),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/Native diagnostic monitoring currently owns/),
  ).not.toBeInTheDocument();
});
test("a worker can open then fail immediately after Arm response; termination remains visible in compact view", async () => {
  vi.mocked(api.armShortcut).mockResolvedValue({
    ...armed,
    phase: "waiting_reports",
    revision: 3,
    lastAttempt: {
      ...attempt(),
      outcome: "pending",
      stage: "waiting_reports",
      compatibleReportsObserved: false,
    },
  });
  const view = render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  const user = await ready();
  await user.click(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  );
  act(() =>
    emit({
      ...disabled,
      generation: 1,
      revision: 4,
      phase: "error",
      lastAttempt: attempt("read_failed"),
      terminationReason: "read_failed",
    }),
  );
  view.rerender(<PhysicalQuickAccess expanded={false} onManage={() => {}} />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "HID reader failed after opening",
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Rescan and rearm manually",
  );
  expect(
    screen.getByText(/HID handle: opened during attempt/),
  ).toBeInTheDocument();
  act(() => emit({ ...armed, revision: 3 }));
  expect(screen.getByText("Error")).toBeInTheDocument();
});
test.each([
  "candidate_not_found",
  "device_busy",
  "no_compatible_reports",
  "worker_spawn_failed",
] as const)(
  "safe reason %s includes recovery without claiming Armed",
  async (reason) => {
    vi.mocked(api.shortcutStatus).mockResolvedValue({
      ...disabled,
      lastAttempt: attempt(reason),
    });
    render(<PhysicalQuickAccess expanded onManage={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Action:");
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.queryByText(/Armed ·/)).not.toBeInTheDocument();
  },
);
test("Copy Shortcut Diagnostic Summary whitelists enums and safe metadata only", async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  vi.mocked(api.shortcutStatus).mockResolvedValue({
    ...disabled,
    lastAttempt: attempt("candidate_not_found"),
    manualRescanRequired: true,
    interface: {
      vendorId: 0x28de,
      productId: 0x1205,
      interfaceNumber: 2,
      usagePage: 0xffff,
      usage: 1,
      inputReportLength: 65,
      path: "PRIVATE",
      serial: "PRIVATE",
    },
    path: "PRIVATE",
    raw: [0, 1],
    username: "PRIVATE",
  } as ShortcutStatus);
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  await screen.findByText("Disabled");
  await user.click(
    screen.getByRole("button", { name: "Copy Shortcut Diagnostic Summary" }),
  );
  expect(
    await screen.findByText("Safe shortcut summary copied."),
  ).toBeInTheDocument();
  const text = write.mock.calls[0][0];
  const summary = JSON.parse(text);
  expect(summary.lastArmAttempt.reason).toBe("candidate_not_found");
  expect(summary.manualRescanRequired).toBe(true);
  expect(summary.monitorPhase).toBe("stopped");
  expect(text).not.toMatch(/PRIVATE|path|serial|username|raw|mask|candidateId/);
});

test("Disarm fences a late Arm rejection and permits an explicit new attempt", async () => {
  let reject!: (v: unknown) => void;
  vi.mocked(api.armShortcut).mockImplementationOnce(
    () =>
      new Promise((_, r) => {
        reject = r;
      }),
  );
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  const user = await ready();
  await user.click(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  );
  act(() => emit({ ...armed, revision: 10 }));
  vi.mocked(api.disarmShortcut).mockResolvedValue({
    ...disabled,
    generation: 1,
    revision: 11,
  });
  await user.click(screen.getByRole("button", { name: "Disarm Shortcut" }));
  vi.mocked(api.armShortcut).mockResolvedValueOnce({
    ...armed,
    generation: 2,
    revision: 12,
  });
  await user.click(
    screen.getByRole("button", { name: "Arm Physical ⋯ Shortcut" }),
  );
  await act(async () => reject(new Error("late old rejection")));
  expect(screen.getByText(/Armed · 30 min/)).toBeInTheDocument();
  expect(screen.queryByText(/Arm request failed/)).not.toBeInTheDocument();
});

test("event subscription failure is visible while status polling remains available", async () => {
  vi.mocked(api.onPhysicalShortcut).mockRejectedValueOnce(
    new Error("private transport text"),
  );
  render(<PhysicalQuickAccess expanded onManage={() => {}} />);
  expect(
    await screen.findByText(/Live status subscription unavailable/),
  ).toBeInTheDocument();
  expect(screen.getByText("Disabled")).toBeInTheDocument();
  expect(screen.queryByText(/private transport text/)).not.toBeInTheDocument();
});
