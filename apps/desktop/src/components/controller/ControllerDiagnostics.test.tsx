import { beforeEach, expect, test, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ControllerDiagnostics from "./ControllerDiagnostics";
import type { DiagnosticsSnapshot, InputErrorKind } from "@/lib/bindings";
import * as api from "@/lib/neptune";
vi.mock("@/lib/neptune", async (original) => ({
  ...(await original<typeof import("@/lib/neptune")>()),
  listCandidates: vi.fn(),
  rescanCandidates: vi.fn(),
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  monitoringStatus: vi.fn(),
  onDiagnostics: vi.fn(),
}));
const base: DiagnosticsSnapshot = {
  source: "windows",
  discovery: "not_scanned",
  candidates: [],
  discoveryIssue: null,
  monitor: {
    phase: "stopped",
    candidateId: null,
    opened: false,
    reportCount: 0,
    lastReportLength: null,
    lastReportAtUnixMs: null,
    issue: null,
    buttonDecodingSupported: false,
    controls: [
      { control: "steam", pressed: null },
      { control: "quick_access", pressed: null },
    ],
    transitions: [],
  },
};
const found: DiagnosticsSnapshot = {
  ...base,
  discovery: "candidates",
  candidates: [
    {
      id: "scan1-candidate1",
      vendorId: 0x28de,
      productId: 0x1205,
      usagePage: 0xff00,
      usage: 1,
      interfaceNumber: 2,
      manufacturer: null,
      product: null,
      attributesVerified: true,
      inputReportLength: 65,
      capabilities: { passiveReadEligible: true, buttonDecoding: false },
      issue: null,
    },
  ],
};
const running: DiagnosticsSnapshot = {
  ...found,
  monitor: {
    ...base.monitor,
    phase: "raw_input_only",
    candidateId: "scan1-candidate1",
    opened: true,
    reportCount: 42,
    lastReportLength: 65,
    lastReportAtUnixMs: 1700000000000,
  },
};
let emit: (data: DiagnosticsSnapshot) => void;
const unlisten = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.onDiagnostics).mockImplementation(async (listener) => {
    emit = listener;
    return unlisten;
  });
  vi.mocked(api.listCandidates).mockResolvedValue(structuredClone(base));
  vi.mocked(api.rescanCandidates).mockResolvedValue(structuredClone(found));
  vi.mocked(api.startMonitoring).mockResolvedValue(structuredClone(running));
  vi.mocked(api.stopMonitoring).mockResolvedValue(structuredClone(base));
  vi.mocked(api.monitoringStatus).mockResolvedValue(structuredClone(base));
});
test("opening reads cached state without scanning or opening hardware; not found is explicit", async () => {
  const user = userEvent.setup();
  render(<ControllerDiagnostics />);
  expect(
    await screen.findByText("Not scanned · No devices opened"),
  ).toBeInTheDocument();
  expect(api.rescanCandidates).not.toHaveBeenCalled();
  expect(api.startMonitoring).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Start Monitoring" }),
  ).toBeDisabled();
  vi.mocked(api.rescanCandidates).mockResolvedValue({
    ...base,
    discovery: "not_found",
  });
  await user.click(screen.getByRole("button", { name: "Rescan interfaces" }));
  expect(
    await screen.findByText("No Neptune candidate detected"),
  ).toBeInTheDocument();
  expect(api.rescanCandidates).toHaveBeenCalledWith("native");
});
test("candidate discovery, explicit selection, start, raw-only state and stop", async () => {
  const user = userEvent.setup();
  render(<ControllerDiagnostics />);
  await screen.findByText("Not scanned · No devices opened");
  await user.click(screen.getByRole("button", { name: "Rescan interfaces" }));
  expect(await screen.findByText(/1 candidate interface/)).toBeInTheDocument();
  expect(screen.getByText(/0x28DE.*0x1205/)).toBeInTheDocument();
  expect(screen.getByText("Unknown product description")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Start Monitoring" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: /Select interface/ }));
  await user.click(screen.getByRole("button", { name: "Start Monitoring" }));
  expect(api.startMonitoring).toHaveBeenCalledWith("scan1-candidate1");
  expect(await screen.findByText("raw input only")).toBeInTheDocument();
  expect(screen.getByText("42")).toBeInTheDocument();
  expect(screen.getAllByText("Unavailable")).toHaveLength(2);
  expect(
    screen.getByRole("button", { name: "Start Monitoring" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Stop Monitoring" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Stop Monitoring" }));
  expect(await screen.findByText("stopped")).toBeInTheDocument();
  expect(api.stopMonitoring).toHaveBeenCalledTimes(1);
});
test.each(["access_denied", "device_busy", "disconnected"] as const)(
  "native %s event clears active state without simulated fallback",
  async (kind: InputErrorKind) => {
    vi.mocked(api.listCandidates).mockResolvedValue(running);
    render(<ControllerDiagnostics />);
    await screen.findByText("raw input only");
    act(() =>
      emit({
        ...found,
        monitor: {
          ...base.monitor,
          phase: kind as "access_denied" | "device_busy" | "disconnected",
          issue: { kind, message: "Safe read access unavailable." },
        },
      }),
    );
    expect(
      screen.getByText(/Safe read access unavailable/),
    ).toBeInTheDocument();
    expect(screen.getByText("WINDOWS HID")).toBeInTheDocument();
    expect(screen.queryByText("SIMULATED INPUT")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stop Monitoring" }),
    ).toBeDisabled();
  },
);
test("failures can be retried, and simulation requires deliberate source selection and rescan", async () => {
  const user = userEvent.setup();
  render(<ControllerDiagnostics />);
  await screen.findByText("Not scanned · No devices opened");
  vi.mocked(api.rescanCandidates).mockRejectedValueOnce(
    new Error("Discovery worker failed"),
  );
  await user.click(screen.getByRole("button", { name: "Rescan interfaces" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Discovery worker failed",
  );
  await user.selectOptions(
    screen.getByLabelText("Diagnostic source"),
    "simulated",
  );
  expect(screen.queryByText("SIMULATED INPUT")).not.toBeInTheDocument();
  vi.mocked(api.rescanCandidates).mockResolvedValue({
    ...found,
    source: "simulated",
  });
  await user.click(screen.getByRole("button", { name: "Rescan interfaces" }));
  expect(await screen.findByText("SIMULATED INPUT")).toBeInTheDocument();
  expect(api.rescanCandidates).toHaveBeenLastCalledWith("simulated");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("newer terminal events win over earlier command responses; leaving stops and unsubscribes", async () => {
  vi.mocked(api.listCandidates).mockResolvedValue(found);
  const user = userEvent.setup();
  const view = render(<ControllerDiagnostics />);
  await screen.findByText(/1 candidate interface/);
  await user.click(screen.getByRole("button", { name: /Select interface/ }));
  let complete!: (value: DiagnosticsSnapshot) => void;
  vi.mocked(api.startMonitoring).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await user.click(screen.getByRole("button", { name: "Start Monitoring" }));
  act(() =>
    emit({
      ...found,
      monitor: {
        ...base.monitor,
        phase: "read_error",
        issue: { kind: "read_error", message: "Read failed" },
      },
    }),
  );
  await act(async () => {
    complete({
      ...running,
      monitor: { ...running.monitor, phase: "starting" },
    });
  });
  expect(screen.getByText("read error")).toBeInTheDocument();
  expect(screen.queryByText("starting")).not.toBeInTheDocument();
  view.unmount();
  expect(unlisten).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(api.stopMonitoring).toHaveBeenCalledTimes(1));
});
test("native unsupported and unavailable controls are honest; keyboard can reach rescan", async () => {
  vi.mocked(api.listCandidates).mockResolvedValue({
    ...base,
    source: "unsupported",
    discovery: "unsupported",
  });
  const user = userEvent.setup();
  render(<ControllerDiagnostics />);
  expect(
    await screen.findByText("Native HID discovery is unavailable on this host"),
  ).toBeInTheDocument();
  expect(screen.getByText("NATIVE INPUT UNAVAILABLE")).toBeInTheDocument();
  await user.tab();
  expect(screen.getByLabelText("Diagnostic source")).toHaveFocus();
  await user.tab();
  expect(
    screen.getByRole("button", { name: "Rescan interfaces" }),
  ).toHaveFocus();
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(1);
});
