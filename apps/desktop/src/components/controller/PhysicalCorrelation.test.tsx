import { beforeEach, expect, test, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhysicalCorrelation from "./PhysicalCorrelation";
import type {
  DiagnosticsSnapshot,
  ProbeCounts,
  ProbeStatus,
  ProbeSummary,
} from "@/lib/bindings";
import * as api from "@/lib/neptune";
vi.mock("@/lib/neptune", async (original) => ({
  ...(await original<typeof import("@/lib/neptune")>()),
  startProbe: vi.fn(),
  abortProbe: vi.fn(),
  probeStatus: vi.fn(),
}));
const empty: ProbeStatus = {
  token: 0,
  revision: 0,
  monitorGeneration: 0,
  outcome: "not_started",
  phase: "preparation",
  cycle: 0,
  remainingMs: 0,
  summary: null,
};
const counts: ProbeCounts = {
  compatibleReports: 0,
  incompatibleReports: 0,
  malformedReports: 0,
  baselineEstablished: false,
  observedPressEdges: 0,
  observedReleaseEdges: 0,
  expectedPressEdges: 0,
  expectedReleaseEdges: 0,
  repeatedHeldReports: 0,
  missingPresses: 5,
  missingReleases: 5,
  idleTransitions: 0,
  outsidePhaseEdges: 0,
  earlyEdges: 0,
  lateEdges: 0,
  repeatedEdges: 0,
  unrelatedKnownChanges: 0,
  unknownBitChanges: 0,
  reportGaps: 0,
  completedCycles: 0,
  finalReleased: null,
  framingChanged: false,
};
const summary: ProbeSummary = {
  version: "0.5.0-alpha.1",
  interface: {
    vendorId: 0x28de,
    productId: 0x1205,
    usagePage: 0xffff,
    usage: 1,
    interfaceNumber: 2,
    inputReportLength: 65,
  },
  format: "deck_v1_zero_prefixed65",
  control: "a",
  candidateBit: 7,
  environment: {
    steamDeckToolsRunning: "yes",
    steamDeckToolsMode: "desktop",
    steamRunning: "unknown",
    steamInput: "unknown",
  },
  outcome: "preparing",
  reason: null,
  elapsedMs: 0,
  counts,
};
const preparing: ProbeStatus = {
  ...empty,
  token: 1,
  revision: 1,
  monitorGeneration: 7,
  outcome: "preparing",
  remainingMs: 30000,
  summary,
};
const snapshot: DiagnosticsSnapshot = {
  probe: empty,
  source: "windows",
  discovery: "candidates",
  discoveryIssue: null,
  candidates: [
    {
      id: "scan1-candidate3",
      vendorId: 0x28de,
      productId: 0x1205,
      usagePage: 0xffff,
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
  monitor: {
    sessionGeneration: 7,
    candidateId: "scan1-candidate3",
    phase: "raw_input_only",
    opened: true,
    reportCount: 42,
    lastReportLength: 65,
    lastReportAtUnixMs: 0,
    issue: null,
    buttonDecodingSupported: false,
    report: {
      recognition: "candidate",
      format: "deck_v1_zero_prefixed65",
      reportId: 0,
      messageType: 9,
      framingVerified: false,
      physicalButtonsVerified: false,
      candidateReportCount: 42,
      unsupportedReportCount: 0,
      malformedReportCount: 0,
      lastIssue: null,
    },
    controls: [],
    transitions: [],
  },
};
const props = { snapshot, selectedCandidateId: "scan1-candidate3" };
const aborted: ProbeStatus = {
  ...preparing,
  revision: 10,
  outcome: "aborted",
  phase: "done",
  remainingMs: 0,
  summary: { ...summary, outcome: "aborted", reason: "user_aborted" },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.startProbe)
    .mockReset()
    .mockResolvedValue(structuredClone(preparing));
  vi.mocked(api.abortProbe)
    .mockReset()
    .mockResolvedValue(structuredClone(aborted));
  vi.mocked(api.probeStatus)
    .mockReset()
    .mockResolvedValue(structuredClone(preparing));
});
async function consentAndStart() {
  const user = userEvent.setup();
  await user.selectOptions(
    screen.getByLabelText("Physical control to test"),
    "a",
  );
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Start Probe" }));
  return user;
}
test("requires explicit interface, control, consent and Start; environment is manually labeled", async () => {
  const user = userEvent.setup();
  render(<PhysicalCorrelation {...props} />);
  expect(api.startProbe).not.toHaveBeenCalled();
  expect(api.probeStatus).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Start Probe" })).toBeDisabled();
  await user.selectOptions(
    screen.getByLabelText("Physical control to test"),
    "a",
  );
  expect(screen.getByRole("button", { name: "Start Probe" })).toBeDisabled();
  await user.selectOptions(
    screen.getByLabelText("Steam Deck Tools running"),
    "yes",
  );
  await user.selectOptions(
    screen.getByLabelText("Steam Deck Tools mode"),
    "desktop",
  );
  expect(screen.getByLabelText("Steam running")).toHaveValue("unknown");
  expect(screen.getByLabelText("Steam Input status")).toHaveValue("unknown");
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Start Probe" }));
  expect(api.startProbe).toHaveBeenCalledWith({
    expectedToken: 0,
    monitorGeneration: 7,
    candidateId: "scan1-candidate3",
    control: "a",
    consent: true,
    environment: summary.environment,
  });
  expect(await screen.findByText(/Release all buttons/)).toBeInTheDocument();
  expect(screen.getByText(/30s remaining/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Abort Probe" })).toBeEnabled();
});
test.each(["no_selection", "wrong_length", "simulation", "missing_reports"])(
  "%s cannot start a physical probe",
  async (reason) => {
    const data = structuredClone(snapshot);
    if (reason === "wrong_length") data.candidates[0].inputReportLength = 64;
    if (reason === "simulation") data.source = "simulated";
    if (reason === "missing_reports") data.monitor.report.format = null;
    render(
      <PhysicalCorrelation
        snapshot={data}
        selectedCandidateId={
          reason === "no_selection" ? "" : props.selectedCandidateId
        }
      />,
    );
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByLabelText("Physical control to test"),
      "a",
    );
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Start Probe" })).toBeDisabled();
    expect(api.startProbe).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("option", { name: "L4" }),
    ).not.toBeInTheDocument();
  },
);
test("Rust phase updates guide press, hold, release and countdown without Next actions", async () => {
  const view = render(<PhysicalCorrelation {...props} />);
  await consentAndStart();
  for (const [phase, instruction, revision] of [
    ["idle", "Idle control:", 2],
    ["press", "Press A now.", 3],
    ["hold", "Hold A.", 4],
    ["release", "Release A now.", 5],
  ] as const) {
    view.rerender(
      <PhysicalCorrelation
        {...props}
        snapshot={{
          ...snapshot,
          probe: {
            ...preparing,
            outcome: "running",
            phase,
            cycle: 1,
            revision,
            remainingMs: 20000,
          },
        }}
      />,
    );
    expect(screen.getByText(new RegExp(instruction))).toBeInTheDocument();
    expect(screen.getByText(/20s remaining/)).toBeInTheDocument();
  }
  expect(
    screen.queryByRole("button", { name: /Next|Continue/ }),
  ).not.toBeInTheDocument();
});
test("Abort and page departure use the exact current token", async () => {
  const view = render(<PhysicalCorrelation {...props} />);
  const user = await consentAndStart();
  await user.click(screen.getByRole("button", { name: "Abort Probe" }));
  expect(api.abortProbe).toHaveBeenCalledWith(1);
  expect(await screen.findByText("Probe: aborted")).toBeInTheDocument();
  view.unmount();
  expect(api.abortProbe).toHaveBeenCalledTimes(1);
  const second = render(
    <PhysicalCorrelation
      {...props}
      snapshot={{
        ...snapshot,
        probe: { ...preparing, token: 2, revision: 11 },
      }}
    />,
  );
  second.unmount();
  expect(api.abortProbe).toHaveBeenLastCalledWith(2);
});
test("native deadline/missing reports become inconclusive through status queries", async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(api.probeStatus).mockResolvedValue({
      ...aborted,
      outcome: "inconclusive",
      summary: { ...summary, outcome: "inconclusive", reason: "deadline" },
    });
    const view = render(
      <PhysicalCorrelation
        {...props}
        snapshot={{ ...snapshot, probe: preparing }}
      />,
    );
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("Probe: inconclusive")).toBeInTheDocument();
    expect(screen.getByText("Completion: deadline")).toBeInTheDocument();
    expect(screen.queryByText(/remaining$/)).not.toBeInTheDocument();
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});
test("observed summary copies only safe aggregates, never a verified mapping", async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const observed: ProbeStatus = {
    ...preparing,
    revision: 12,
    outcome: "observed",
    phase: "done",
    remainingMs: 0,
    summary: {
      ...summary,
      outcome: "observed",
      reason: "completed",
      elapsedMs: 29000,
      counts: {
        ...counts,
        baselineEstablished: true,
        completedCycles: 5,
        expectedPressEdges: 5,
        expectedReleaseEdges: 5,
        finalReleased: true,
      },
    },
  };
  render(
    <PhysicalCorrelation
      {...props}
      snapshot={{ ...snapshot, probe: observed }}
    />,
  );
  expect(
    screen.getByText(
      "Observed candidate-bit correlation — pending independent review",
    ),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Copy Safe Summary" }));
  const text = write.mock.calls[0][0];
  const value = JSON.parse(text);
  expect(value.environment.steamDeckToolsMode).toBe("desktop");
  expect(value.control).toBe("a");
  expect(value.counts.completedCycles).toBe(5);
  for (const privateField of [
    "token",
    "monitorGeneration",
    "scan1",
    "path",
    "serial",
    "last_word",
    "raw",
    "button_verified",
  ]) {
    expect(text).not.toContain(privateField);
  }
  expect(
    screen.queryByText("Physical button verified"),
  ).not.toBeInTheDocument();
});
test("older asynchronous start result cannot overwrite a newer probe; unmounted start is aborted safely", async () => {
  let complete!: (value: ProbeStatus) => void;
  vi.mocked(api.startProbe).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const view = render(<PhysicalCorrelation {...props} />);
  await consentAndStart();
  const newer = {
    ...preparing,
    token: 2,
    revision: 20,
    outcome: "running" as const,
    phase: "hold" as const,
    cycle: 2,
    remainingMs: 15000,
  };
  view.rerender(
    <PhysicalCorrelation {...props} snapshot={{ ...snapshot, probe: newer }} />,
  );
  await act(async () => complete(preparing));
  expect(screen.getByText("Hold A.")).toBeInTheDocument();
  view.unmount();
  expect(api.abortProbe).toHaveBeenLastCalledWith(2);
  vi.clearAllMocks();
  const second = render(<PhysicalCorrelation {...props} />);
  await consentAndStart();
  second.unmount();
  await act(async () => complete(preparing));
  await waitFor(() => expect(api.abortProbe).toHaveBeenCalledWith(1));
});
test("interface changes abort the probe and start errors are recoverable", async () => {
  const view = render(
    <PhysicalCorrelation
      {...props}
      snapshot={{ ...snapshot, probe: preparing }}
    />,
  );
  view.rerender(
    <PhysicalCorrelation
      {...props}
      snapshot={{ ...snapshot, probe: preparing }}
      selectedCandidateId="different-interface"
    />,
  );
  await waitFor(() => expect(api.abortProbe).toHaveBeenCalledWith(1));
  view.unmount();
  vi.mocked(api.startProbe).mockRejectedValueOnce(
    new Error("Owning monitor stopped"),
  );
  render(<PhysicalCorrelation {...props} />);
  await consentAndStart();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Owning monitor stopped",
  );
  expect(screen.getByRole("button", { name: "Start Probe" })).toBeEnabled();
});
