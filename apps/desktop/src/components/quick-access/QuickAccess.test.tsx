import { beforeEach, expect, test, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuickAccess from "./QuickAccess";
import { getTelemetry } from "@/lib/telemetry";
import {
  hideQuickAccess,
  quickAccessStatus,
  onQuickAccessChange,
  onProviderChange,
  onQamNavigation,
  claimQamNavigation,
  completeQamNavigation,
  type QuickAccessStatus,
} from "@/lib/quick-access";
import type { Snapshot } from "@/lib/bindings";
vi.mock("@/lib/telemetry", () => ({ getTelemetry: vi.fn() }));
vi.mock("@/lib/quick-access", () => ({
  hideQuickAccess: vi.fn(),
  quickAccessStatus: vi.fn(),
  onQuickAccessChange: vi.fn(),
  onProviderChange: vi.fn(),
  onQamNavigation: vi.fn(),
  claimQamNavigation: vi.fn(),
  completeQamNavigation: vi.fn(),
}));
const status: QuickAccessStatus = {
  visible: true,
  epoch: 1,
  shortcutAvailable: true,
  shortcutHint: "Ctrl + Alt + Q",
  notice: null,
};
const fixture: Snapshot = {
  source: "windows",
  capturedAtUnixMs: 1700000000000,
  device: {
    manufacturer: "Valve",
    model: "Jupiter",
    platform: "Windows",
    hostPlatform: "windows",
  },
  capabilities: {
    battery: true,
    cpuTemperature: false,
    gpuTemperature: false,
    fanRpm: false,
    hardwareControls: false,
  },
  batteryPercent: 78,
  chargeState: "discharging",
  batteryStatus: "available",
  issues: [],
  cpuTemperatureCelsius: null,
  gpuTemperatureCelsius: null,
  fanRpm: null,
};
let changed: (status: QuickAccessStatus) => void;
let providerChanged: () => void;
let navigation: (event: import("@/lib/bindings").NavigationEvent) => void;
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(quickAccessStatus).mockResolvedValue(status);
  vi.mocked(hideQuickAccess).mockResolvedValue({ ...status, visible: false });
  vi.mocked(getTelemetry).mockResolvedValue(fixture);
  vi.mocked(onQuickAccessChange).mockImplementation(async (callback) => {
    changed = callback;
    return vi.fn();
  });
  vi.mocked(onQamNavigation).mockImplementation(async (callback) => {
    navigation = callback;
    return vi.fn();
  });
  vi.mocked(claimQamNavigation).mockReset();
  vi.mocked(completeQamNavigation).mockReset().mockResolvedValue();
  vi.mocked(onProviderChange).mockImplementation(async (callback) => {
    providerChanged = callback;
    return vi.fn();
  });
});
test("live panel is accessible, focuses Close and reads the shared command without selecting a provider", async () => {
  const user = userEvent.setup();
  render(<QuickAccess />);
  expect(
    screen.getByRole("dialog", { name: "Quick Access" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  expect(screen.getByText("LIVE WINDOWS")).toBeInTheDocument();
  expect(screen.getByText("discharging · Read only")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
  expect(getTelemetry).toHaveBeenCalledWith();
  await user.click(screen.getByRole("button", { name: /Performance/ }));
  expect(
    screen.getByText(/No TDP, clocks or fan settings/),
  ).toBeInTheDocument();
  const last = screen.getByRole("button", { name: /Settings/ });
  last.focus();
  await user.tab();
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
  await user.tab({ shift: true });
  expect(last).toHaveFocus();
});
test("Escape and Close request native hiding without a frontend visibility flag", async () => {
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  await user.keyboard("{Escape}");
  expect(hideQuickAccess).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Close Quick Access" }));
  expect(hideQuickAccess).toHaveBeenCalledTimes(2);
});
test("mock samples and unknown/no battery preserve explicit availability", async () => {
  const user = userEvent.setup();
  vi.mocked(getTelemetry)
    .mockResolvedValueOnce({ ...fixture, source: "mock", batteryPercent: 0 })
    .mockResolvedValueOnce({
      ...fixture,
      batteryPercent: null,
      batteryStatus: "no_battery",
      chargeState: "unknown",
    });
  render(<QuickAccess />);
  expect(await screen.findByText("0 %")).toBeInTheDocument();
  expect(screen.getByText("MOCK DATA")).toBeInTheDocument();
  expect(screen.getByText(/Fixed development samples/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Refresh battery" }));
  expect(await screen.findByText("No system battery")).toBeInTheDocument();
  expect(screen.getByText("Unavailable")).toBeInTheDocument();
  expect(screen.queryByText("0 %")).not.toBeInTheDocument();
});
test("failed reads clear old data and manual refresh retries; hide failures are visible", async () => {
  const user = userEvent.setup();
  vi.mocked(getTelemetry)
    .mockRejectedValueOnce(new Error("IPC unavailable"))
    .mockResolvedValue(fixture);
  render(<QuickAccess />);
  expect(await screen.findByRole("alert")).toHaveTextContent("IPC unavailable");
  expect(screen.queryByText("78 %")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Refresh battery" }));
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  vi.mocked(hideQuickAccess).mockRejectedValueOnce(
    new Error("Native hide failed"),
  );
  await user.click(screen.getByRole("button", { name: "Close Quick Access" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Native hide failed",
  );
});
test("hidden startup performs no telemetry read; open/provider events refresh and theme follows storage", async () => {
  vi.mocked(quickAccessStatus).mockResolvedValue({ ...status, visible: false });
  render(<QuickAccess />);
  await waitFor(() => expect(quickAccessStatus).toHaveBeenCalled());
  expect(getTelemetry).not.toHaveBeenCalled();
  localStorage.setItem(
    "nepteer.preferences",
    JSON.stringify({ theme: "light", unit: "fahrenheit" }),
  );
  await act(async () => changed({ ...status, epoch: 2 }));
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  expect(document.documentElement.dataset.theme).toBe("light");
  vi.mocked(quickAccessStatus).mockResolvedValue({ ...status, epoch: 2 });
  await act(async () => providerChanged());
  await waitFor(() => expect(getTelemetry).toHaveBeenCalledTimes(2));
});

let navSequence = 0;
async function send(
  action: import("@/lib/bindings").NavigationAction,
  epoch = 1,
) {
  const event = {
    request: { generation: 1, epoch, sequence: ++navSequence },
    action,
  };
  vi.mocked(claimQamNavigation).mockResolvedValueOnce({
    event,
    validForMs: 500,
  });
  await act(async () => navigation(event));
  await waitFor(() =>
    expect(completeQamNavigation).toHaveBeenCalledWith(
      event.request,
      expect.any(Boolean),
    ),
  );
  return event;
}
test("native Next/Previous wrap actual enabled focus; Activate and Back reuse section/close behavior", async () => {
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const close = screen.getByRole("button", { name: "Close Quick Access" });
  const refresh = screen.getByRole("button", { name: "Refresh battery" });
  expect(close).toHaveFocus();
  await send("next");
  expect(refresh).toHaveFocus();
  await send("previous");
  expect(close).toHaveFocus();
  await send("previous");
  const settings = screen.getByRole("button", { name: /Settings/ });
  expect(settings).toHaveFocus();
  await send("next");
  expect(close).toHaveFocus();
  const performance = screen.getByRole("button", { name: /Performance/ });
  performance.focus();
  await send("activate");
  expect(performance).toHaveAttribute("aria-expanded", "true");
  await send("left");
  await send("right");
  expect(performance).toHaveFocus();
  expect(performance).toHaveAttribute("aria-expanded", "true");
  await send("back");
  expect(performance).toHaveAttribute("aria-expanded", "false");
  expect(performance).toHaveFocus();
  const event = await send("back");
  expect(completeQamNavigation).toHaveBeenCalledWith(event.request, true);
  expect(hideQuickAccess).not.toHaveBeenCalled(); // Native completion performs context-fenced Hide.
});
test("disabled Refresh is skipped and its disappearing focus has deterministic fallback", async () => {
  let finish!: (s: Snapshot) => void;
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const refresh = screen.getByRole("button", { name: "Refresh battery" });
  refresh.focus();
  vi.mocked(getTelemetry).mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  await send("activate");
  expect(refresh).toBeDisabled();
  const performance = screen.getByRole("button", { name: /Performance/ });
  expect(performance).toHaveFocus();
  await send("previous");
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
  await send("next");
  expect(performance).toHaveFocus();
  await act(async () => finish(fixture));
  expect(performance).toHaveFocus();
});
test("redundant visible and provider events refresh data without resetting user focus", async () => {
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const display = screen.getByRole("button", { name: /Display/ });
  await user.click(display);
  await act(async () => changed(status));
  expect(display).toHaveFocus();
  expect(getTelemetry).toHaveBeenCalledTimes(1);
  await act(async () => providerChanged());
  expect(display).toHaveFocus();
  expect(getTelemetry).toHaveBeenCalledTimes(2);
  vi.mocked(quickAccessStatus).mockResolvedValue({ ...status, epoch: 3 });
  await act(async () => changed({ ...status, visible: false, epoch: 2 }));
  await act(async () => changed({ ...status, epoch: 3 }));
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
  display.focus();
  await act(async () => changed({ ...status, epoch: 1 }));
  expect(display).toHaveFocus();
});
test("hidden and old epoch navigation cannot activate after reopen; stale generation denied natively", async () => {
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const performance = screen.getByRole("button", { name: /Performance/ });
  performance.focus();
  vi.mocked(quickAccessStatus).mockResolvedValue({
    ...status,
    visible: false,
    epoch: 2,
  });
  const hidden = {
    request: { generation: 1, epoch: 1, sequence: 100 },
    action: "activate" as const,
  };
  await act(async () => navigation(hidden));
  expect(claimQamNavigation).not.toHaveBeenCalled();
  expect(performance).toHaveAttribute("aria-expanded", "false");
  vi.mocked(quickAccessStatus).mockResolvedValue({ ...status, epoch: 3 });
  await act(async () => changed({ ...status, epoch: 3 }));
  performance.focus();
  await act(async () => navigation(hidden));
  expect(claimQamNavigation).not.toHaveBeenCalled();
  vi.mocked(claimQamNavigation).mockResolvedValueOnce(null);
  await act(async () =>
    navigation({ ...hidden, request: { ...hidden.request, epoch: 3 } }),
  );
  expect(performance).toHaveAttribute("aria-expanded", "false");
});
test("late granted response after hide/reopen is acknowledged without applying old action", async () => {
  let complete!: (v: import("@/lib/bindings").NavigationClaim | null) => void;
  vi.mocked(claimQamNavigation).mockImplementationOnce(
    () =>
      new Promise((r) => {
        complete = r;
      }),
  );
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const performance = screen.getByRole("button", { name: /Performance/ });
  performance.focus();
  const event = {
    request: { generation: 1, epoch: 1, sequence: 500 },
    action: "activate" as const,
  };
  await act(async () => navigation(event));
  await waitFor(() => expect(claimQamNavigation).toHaveBeenCalled());
  await act(async () => {
    changed({ ...status, visible: false, epoch: 2 });
    changed({ ...status, epoch: 3 });
  });
  await act(async () => complete({ event, validForMs: 500 }));
  expect(performance).toHaveAttribute("aria-expanded", "false");
  expect(completeQamNavigation).toHaveBeenCalledWith(event.request, false);
});
test("Close activation uses native lease completion once; subscription cleanup releases in-flight claim", async () => {
  const stop = vi.fn();
  vi.mocked(onQamNavigation).mockImplementationOnce(async (callback) => {
    navigation = callback;
    return stop;
  });
  const view = render(<QuickAccess />);
  await screen.findByText("78 %");
  const event = await send("activate");
  expect(completeQamNavigation).toHaveBeenCalledWith(event.request, true);
  expect(hideQuickAccess).not.toHaveBeenCalled();
  let resolve!: (
    value: import("@/lib/bindings").NavigationClaim | null,
  ) => void;
  vi.mocked(claimQamNavigation).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const late = { ...event, request: { ...event.request, sequence: 901 } };
  await act(async () => navigation(late));
  view.unmount();
  expect(stop).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ event: late, validForMs: 500 }));
  expect(completeQamNavigation).toHaveBeenCalledWith(late.request, false);
});

test("duplicate offers never double activate; next offer can arrive before previous completion resolves", async () => {
  let finish!: () => void;
  vi.mocked(completeQamNavigation).mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const performance = screen.getByRole("button", { name: /Performance/ });
  performance.focus();
  const first = await send("activate");
  expect(performance).toHaveAttribute("aria-expanded", "true");
  await act(async () => navigation(first));
  expect(claimQamNavigation).toHaveBeenCalledTimes(1);
  await send("next");
  expect(screen.getByRole("button", { name: /Controller/ })).toHaveFocus();
  await act(async () => finish());
});
test("a paused claim response is discarded and completed, without late activation", async () => {
  let resolve!: (v: import("@/lib/bindings").NavigationClaim) => void;
  vi.mocked(claimQamNavigation).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const performance = screen.getByRole("button", { name: /Performance/ });
  performance.focus();
  const now = vi
    .spyOn(performance.ownerDocument.defaultView!.performance, "now")
    .mockReturnValue(0);
  const event = {
    request: { generation: 1, epoch: 1, sequence: 1200 },
    action: "activate" as const,
  };
  await act(async () => navigation(event));
  await waitFor(() => expect(claimQamNavigation).toHaveBeenCalled());
  now.mockReturnValue(600);
  await act(async () => resolve({ event, validForMs: 500 }));
  expect(performance).toHaveAttribute("aria-expanded", "false");
  expect(completeQamNavigation).toHaveBeenCalledWith(event.request, false);
  now.mockRestore();
});
