import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as physical from "./lib/physical-shortcut";
vi.mock("./lib/physical-shortcut", async (original) => ({
  ...(await original<typeof import("./lib/physical-shortcut")>()),
  shortcutStatus: vi.fn(),
  onPhysicalShortcut: vi.fn(),
  armShortcut: vi.fn(),
  disarmShortcut: vi.fn(),
}));
const disabledPhysical = {
  generation: 0,
  revision: 1,
  phase: "disarmed" as const,
  remainingMs: 0,
  opened: false,
  source: "windows" as const,
  readerOwner: "none" as const,
  interface: null,
  issue: null,
  navigation: { configured: false, pending: 0, delivering: false, issue: null },
  manualRescanRequired: false,
  lastAttempt: null,
  terminationReason: null,
  workerRunning: false,
  monitorPhase: "stopped" as const,
};
import * as diagnostics from "./lib/neptune";
vi.mock("./lib/neptune", async (original) => ({
  ...(await original<typeof import("./lib/neptune")>()),
  listCandidates: vi.fn(),
  stopMonitoring: vi.fn(),
  onDiagnostics: vi.fn(),
}));
import { showQuickAccess, quickAccessStatus } from "./lib/quick-access";
vi.mock("./lib/quick-access", () => ({
  showQuickAccess: vi.fn(),
  quickAccessStatus: vi.fn(),
}));
import { getTelemetry, temperature } from "./lib/telemetry";
import type { Snapshot } from "./lib/bindings";
vi.mock("./lib/telemetry", async (original) => ({
  ...(await original<typeof import("./lib/telemetry")>()),
  getTelemetry: vi.fn(),
}));
const fixture: Snapshot = {
  source: "mock",
  capturedAtUnixMs: 1700000000000,
  device: {
    manufacturer: "Valve (simulated)",
    model: "Steam Deck LCD (simulated)",
    platform: "Windows 11 (simulated)",
    hostPlatform: "macos",
  },
  capabilities: {
    battery: true,
    cpuTemperature: true,
    gpuTemperature: false,
    fanRpm: true,
    hardwareControls: false,
  },
  batteryPercent: 78,
  chargeState: "discharging",
  batteryStatus: "available",
  issues: [],
  cpuTemperatureCelsius: 54,
  gpuTemperatureCelsius: null,
  fanRpm: 2800,
};
beforeEach(() => {
  vi.mocked(physical.shortcutStatus)
    .mockReset()
    .mockResolvedValue(disabledPhysical);
  vi.mocked(physical.onPhysicalShortcut)
    .mockReset()
    .mockResolvedValue(() => {});
  vi.mocked(physical.disarmShortcut)
    .mockReset()
    .mockResolvedValue({ ...disabledPhysical, revision: 5 });
  vi.mocked(quickAccessStatus).mockResolvedValue({
    visible: false,
    epoch: 1,
    shortcutAvailable: true,
    shortcutHint: "Ctrl + Alt + Q",
    notice: null,
  });
  vi.mocked(showQuickAccess).mockReset();
  vi.mocked(showQuickAccess).mockResolvedValue({
    visible: true,
    epoch: 1,
    shortcutAvailable: true,
    shortcutHint: "Ctrl + Alt + Q",
    notice: null,
  });
  localStorage.clear();
  vi.mocked(getTelemetry).mockReset();
  vi.mocked(getTelemetry).mockResolvedValue(structuredClone(fixture));
});
test("renders mock readings, unavailable values and refreshes through the IPC wrapper", async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  expect(screen.getByText("54 °C")).toBeInTheDocument();
  expect(screen.getByText("2,800 RPM")).toBeInTheDocument();
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  expect(
    screen.getByText(/All telemetry readings are fixed samples/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Refresh snapshot" }));
  await waitFor(() => expect(getTelemetry).toHaveBeenCalledTimes(2));
});
test("settings persist units and theme; planned pages are explicit", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("78 %");
  await user.click(screen.getByRole("button", { name: /Settings/ }));
  await user.selectOptions(
    screen.getByLabelText("Temperature units"),
    "fahrenheit",
  );
  await user.selectOptions(screen.getByLabelText("Theme"), "light");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(JSON.parse(localStorage.getItem("nepteer.preferences")!)).toEqual({
    unit: "fahrenheit",
    theme: "light",
  });
  await user.click(screen.getByRole("button", { name: /Dashboard/ }));
  expect(screen.getByText("129 °F")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Quick Access" }));
  expect(
    screen.getByRole("heading", { name: "A panel within reach." }),
  ).toBeInTheDocument();
});
test("loading and IPC rejection are recoverable", async () => {
  vi.mocked(getTelemetry).mockRejectedValueOnce(new Error("IPC failed"));
  const user = userEvent.setup();
  render(<App />);
  expect(
    screen.getByText("Reading the selected Rust provider…"),
  ).toHaveAttribute("role", "status");
  expect(await screen.findByRole("alert")).toHaveTextContent("IPC failed");
  expect(screen.queryByText("78 %")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("78 %")).toBeInTheDocument();
});
test("real zero readings remain zero, null and disabled capabilities remain unavailable", async () => {
  vi.mocked(getTelemetry).mockResolvedValue({
    ...fixture,
    batteryPercent: 0,
    fanRpm: 0,
    cpuTemperatureCelsius: 0,
    gpuTemperatureCelsius: 66,
  });
  render(<App />);
  expect(await screen.findByText("0 %")).toBeInTheDocument();
  expect(screen.getByText("0 RPM")).toBeInTheDocument();
  expect(screen.getByText("0 °C")).toBeInTheDocument();
  expect(screen.queryByText("66 °C")).not.toBeInTheDocument();
  expect(temperature(null, "fahrenheit")).toBe("Unavailable");
});
test("corrupt preferences fall back to defaults", async () => {
  localStorage.setItem("nepteer.preferences", "not json");
  render(<App />);
  expect(await screen.findByText("54 °C")).toBeInTheDocument();
});

const liveFixture: Snapshot = {
  ...fixture,
  source: "windows",
  device: {
    manufacturer: "Valve",
    model: "Jupiter",
    platform: "Windows",
    hostPlatform: "windows",
  },
  cpuTemperatureCelsius: null,
  gpuTemperatureCelsius: null,
  fanRpm: null,
  capabilities: {
    ...fixture.capabilities,
    cpuTemperature: false,
    fanRpm: false,
  },
};
test("live Windows source, identity and battery render with unsupported sensors", async () => {
  vi.mocked(getTelemetry).mockResolvedValue(liveFixture);
  render(<App />);
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  expect(screen.getAllByText("LIVE WINDOWS")).toHaveLength(2);
  expect(screen.queryByText("MOCK DATA")).not.toBeInTheDocument();
  expect(screen.getByText("Manufacturer: Valve")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Jupiter" })).toBeInTheDocument();
  expect(screen.getByText(/identification: Unverified/)).toBeInTheDocument();
  for (const label of ["CPU temperature", "GPU temperature", "Fan speed"]) {
    const card = screen.getAllByText(label)[0].closest("article")!;
    expect(within(card).getByText("Unavailable")).toBeInTheDocument();
  }
  expect(
    screen.getByText(/discharging · Windows power status/),
  ).toBeInTheDocument();
});
test("Windows errors and unknown identity stay unavailable without mock fallback; refresh retries", async () => {
  const user = userEvent.setup();
  vi.mocked(getTelemetry)
    .mockResolvedValueOnce({
      ...liveFixture,
      batteryPercent: null,
      batteryStatus: "error",
      chargeState: "unknown",
      device: { ...liveFixture.device, model: null, manufacturer: null },
      issues: ["Battery: GetSystemPowerStatus failed (Windows error 5)."],
    })
    .mockResolvedValue(liveFixture);
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Unknown model" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Manufacturer: Unknown")).toBeInTheDocument();
  expect(screen.getByText(/GetSystemPowerStatus failed/)).toBeInTheDocument();
  expect(screen.queryByText("78 %")).not.toBeInTheDocument();
  expect(screen.queryByText("MOCK DATA")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Refresh snapshot" }));
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  expect(getTelemetry).toHaveBeenLastCalledWith("auto");
});
test("a failed refresh clears previous live readings and retry stays in automatic mode", async () => {
  const user = userEvent.setup();
  vi.mocked(getTelemetry)
    .mockResolvedValueOnce(liveFixture)
    .mockRejectedValueOnce(new Error("Request failed"))
    .mockResolvedValue(liveFixture);
  render(<App />);
  await screen.findByText("78 %");
  await user.click(screen.getByRole("button", { name: "Refresh snapshot" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Request failed");
  expect(screen.queryByText("78 %")).not.toBeInTheDocument();
  expect(screen.queryByText("MOCK DATA")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("78 %")).toBeInTheDocument();
  expect(getTelemetry).toHaveBeenLastCalledWith("auto");
});
test("mock selection is deliberate and resets on restart without affecting preferences", async () => {
  const user = userEvent.setup();
  vi.mocked(getTelemetry).mockImplementation(async (mode) =>
    mode === "mock" ? fixture : liveFixture,
  );
  const view = render(<App />);
  await screen.findByText("78 %");
  await user.click(screen.getByRole("button", { name: /Settings/ }));
  await user.selectOptions(screen.getByLabelText("Telemetry provider"), "mock");
  await waitFor(() =>
    expect(screen.getByText("Data source: MOCK DATA")).toBeInTheDocument(),
  );
  expect(getTelemetry).toHaveBeenLastCalledWith("mock");
  expect(localStorage.getItem("nepteer.preferences") ?? "").not.toContain(
    "mock",
  );
  view.unmount();
  render(<App />);
  await screen.findByText("78 %");
  expect(getTelemetry).toHaveBeenLastCalledWith("auto");
  expect(screen.getAllByText("LIVE WINDOWS")).toHaveLength(2);
});
test("no battery and unknown percentage are distinct from zero", async () => {
  const user = userEvent.setup();
  vi.mocked(getTelemetry)
    .mockResolvedValueOnce({
      ...liveFixture,
      batteryPercent: null,
      batteryStatus: "no_battery",
      chargeState: "unknown",
    })
    .mockResolvedValueOnce({
      ...liveFixture,
      batteryPercent: null,
      batteryStatus: "unknown",
      chargeState: "unknown",
    });
  render(<App />);
  expect(await screen.findByText("No system battery")).toBeInTheDocument();
  expect(screen.queryByText("0 %")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Refresh snapshot" }));
  expect(await screen.findByText(/Percentage unknown/)).toBeInTheDocument();
  expect(screen.queryByText("0 %")).not.toBeInTheDocument();
});

test("dashboard opens QAM through Rust and reports an activation failure", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("78 %");
  await user.click(screen.getByRole("button", { name: "Open Quick Access" }));
  expect(showQuickAccess).toHaveBeenCalledTimes(1);
  vi.mocked(showQuickAccess).mockRejectedValueOnce(
    new Error("Window activation failed"),
  );
  await user.click(screen.getByRole("button", { name: "Open Quick Access" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Window activation failed",
  );
});

test("Controller is a practical diagnostics page; leaving stops observation and preserves dashboard", async () => {
  vi.mocked(diagnostics.onDiagnostics).mockResolvedValue(() => {});
  vi.mocked(diagnostics.listCandidates).mockResolvedValue({
    source: "unsupported",
    probe: {
      token: 0,
      revision: 0,
      monitorGeneration: 0,
      outcome: "not_started",
      phase: "preparation",
      cycle: 0,
      remainingMs: 0,
      summary: null,
    },
    discovery: "not_scanned",
    candidates: [],
    discoveryIssue: null,
    monitor: {
      phase: "stopped",
      sessionGeneration: 0,
      candidateId: null,
      opened: false,
      reportCount: 0,
      lastReportLength: null,
      lastReportAtUnixMs: null,
      issue: null,
      buttonDecodingSupported: false,
      report: {
        recognition: "not_observed",
        format: null,
        reportId: null,
        messageType: null,
        framingVerified: false,
        physicalButtonsVerified: false,
        candidateReportCount: 0,
        unsupportedReportCount: 0,
        malformedReportCount: 0,
        lastIssue: null,
      },
      controls: [],
      transitions: [],
    },
  });
  vi.mocked(diagnostics.stopMonitoring).mockResolvedValue(
    await diagnostics.listCandidates(),
  );
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("78 %");
  await user.click(screen.getByRole("button", { name: /Controller/ }));
  expect(
    await screen.findByRole("region", { name: "Controller diagnostics" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Start Monitoring" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: /Dashboard/ }));
  expect(diagnostics.stopMonitoring).toHaveBeenCalled();
  expect(screen.getByText("78 %")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Open Quick Access" }),
  ).toBeInTheDocument();
});

test("physical shortcut remains app-owned across navigation and minimization; disarm stays available", async () => {
  vi.mocked(physical.shortcutStatus).mockResolvedValue({
    ...disabledPhysical,
    generation: 1,
    revision: 3,
    phase: "armed",
    opened: true,
    remainingMs: 60000,
    readerOwner: "shortcut",
  });
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("78 %");
  await screen.findByText(/Armed · 1 min remaining/);
  await user.click(screen.getByRole("button", { name: "Quick Access" }));
  expect(screen.getByRole("button", { name: "Disarm Shortcut" })).toBeEnabled();
  document.dispatchEvent(new Event("visibilitychange"));
  expect(physical.disarmShortcut).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Disarm Shortcut" }));
  expect(physical.disarmShortcut).toHaveBeenCalledWith(1);
  expect(showQuickAccess).not.toHaveBeenCalled(); // physical status is not a frontend window-visibility cache
});
