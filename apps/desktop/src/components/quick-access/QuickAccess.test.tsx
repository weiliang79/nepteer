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
  type QuickAccessStatus,
} from "@/lib/quick-access";
import type { Snapshot } from "@/lib/bindings";
vi.mock("@/lib/telemetry", () => ({ getTelemetry: vi.fn() }));
vi.mock("@/lib/quick-access", () => ({
  hideQuickAccess: vi.fn(),
  quickAccessStatus: vi.fn(),
  onQuickAccessChange: vi.fn(),
  onProviderChange: vi.fn(),
}));
const status: QuickAccessStatus = {
  visible: true,
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
  await act(async () => changed(status));
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  expect(document.documentElement.dataset.theme).toBe("light");
  vi.mocked(quickAccessStatus).mockResolvedValue(status);
  await act(async () => providerChanged());
  await waitFor(() => expect(getTelemetry).toHaveBeenCalledTimes(2));
});
