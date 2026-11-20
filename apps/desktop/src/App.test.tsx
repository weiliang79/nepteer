import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
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
  cpuTemperatureCelsius: 54,
  gpuTemperatureCelsius: null,
  fanRpm: 2800,
};
beforeEach(() => {
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
  expect(screen.getByText(/No hardware is monitored/)).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Refresh mock snapshot" }),
  );
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
  await user.click(screen.getByRole("button", { name: /Quick Access/ }));
  expect(screen.getByText("PLANNED · FUTURE MILESTONE")).toBeInTheDocument();
});
test("loading and IPC rejection are recoverable", async () => {
  vi.mocked(getTelemetry).mockRejectedValueOnce(new Error("IPC failed"));
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Reading");
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
