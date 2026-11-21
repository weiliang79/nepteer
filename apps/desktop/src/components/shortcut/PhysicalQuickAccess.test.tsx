import { beforeEach, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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
    "Stop diagnostics before arming",
  );
  expect(screen.queryByText("SIMULATED INPUT")).not.toBeInTheDocument();
});
