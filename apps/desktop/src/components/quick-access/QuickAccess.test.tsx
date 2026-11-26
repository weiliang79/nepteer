import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuickAccess from "./QuickAccess";
import { createDiagnosticDelay } from "@/lib/qam-focus-diagnostics";
import * as focusDiagnostic from "@/lib/qam-focus-diagnostics";
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
  vi.stubEnv("VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS", undefined);
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(quickAccessStatus).mockReset().mockResolvedValue(status);
  vi.mocked(hideQuickAccess).mockResolvedValue({ ...status, visible: false });
  vi.mocked(getTelemetry).mockReset().mockResolvedValue(fixture);
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
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
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
  const completed = () =>
    expect(completeQamNavigation).toHaveBeenCalledWith(
      event.request,
      expect.any(Boolean),
    );
  if (vi.isFakeTimers()) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    completed();
  } else await waitFor(completed);
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
test("busy Refresh keeps focus, is skipped as a D-pad destination and completion preserves voluntary focus", async () => {
  let finish!: (s: Snapshot) => void;
  const user = userEvent.setup();
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
  expect(refresh).not.toBeDisabled();
  expect(refresh).toHaveAttribute("aria-disabled", "true");
  expect(refresh).toHaveFocus();
  const performance = screen.getByRole("button", { name: /Performance/ });
  await send("previous");
  const close = screen.getByRole("button", { name: "Close Quick Access" });
  expect(close).toHaveFocus();
  await send("next");
  expect(performance).toHaveFocus();
  await send("previous");
  expect(close).toHaveFocus();
  refresh.focus();
  await send("next");
  expect(performance).toHaveFocus();
  refresh.focus();
  await user.click(performance);
  await act(async () => finish(fixture));
  expect(performance).toHaveFocus();
  expect(refresh).toHaveAttribute("aria-disabled", "false");
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

test("static help adds no focus targets; platform hint, Tab, Space and touch/click behaviors stay local", async () => {
  vi.mocked(quickAccessStatus).mockResolvedValue({
    ...status,
    shortcutHint: "Control + Option + Q",
  });
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const guidance = screen.getByRole("complementary", {
    name: "Quick Access input guidance",
  });
  expect(guidance).toHaveTextContent("Controller navigation: desktop only");
  expect(guidance).toHaveTextContent(
    "Games and other tools may still receive the same buttons",
  );
  expect(guidance).toHaveTextContent("When enabled:");
  expect(guidance.querySelector("button, input, a, [tabindex]")).toBeNull();
  expect(
    screen.getByText("Keyboard: Control + Option + Q"),
  ).toBeInTheDocument();
  const buttons = screen.getAllByRole("button");
  expect(buttons.map((b) => b.textContent?.trim())).toEqual([
    "✕",
    "Refresh battery",
    "PerformancePlanned+",
    "ControllerPlanned+",
    "DisplayPlanned+",
    "SettingsDashboard+",
  ]);
  for (let i = 1; i <= buttons.length; i++) {
    await user.tab();
    expect(buttons[i % buttons.length]).toHaveFocus();
  }
  await user.click(screen.getByRole("button", { name: /Controller/ }));
  expect(screen.getByRole("button", { name: /Controller/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await user.keyboard(" ");
  expect(screen.getByRole("button", { name: /Controller/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: /Controller/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(claimQamNavigation).not.toHaveBeenCalled();
});

test("reduced motion suppresses opening animation while genuine openings retain initial focus", async () => {
  const media = vi
    .spyOn(window, "matchMedia")
    .mockReturnValue({ matches: true } as MediaQueryList);
  const animate = vi.fn();
  const previous = HTMLElement.prototype.animate;
  HTMLElement.prototype.animate = animate;
  try {
    render(<QuickAccess />);
    await screen.findByText("78 %");
    expect(animate).not.toHaveBeenCalled();
    const display = screen.getByRole("button", { name: /Display/ });
    display.focus();
    await act(async () => changed(status));
    expect(display).toHaveFocus();
    await act(async () => changed({ ...status, visible: false, epoch: 2 }));
    await act(async () => changed({ ...status, epoch: 3 }));
    expect(animate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Close Quick Access" }),
    ).toHaveFocus();
  } finally {
    media.mockRestore();
    if (previous) HTMLElement.prototype.animate = previous;
    else delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  }
});

test.each(["success", "failure"] as const)(
  "Refresh retains focus through pending request and %s",
  async (outcome) => {
    let finish!: (s: Snapshot) => void;
    let fail!: (e: Error) => void;
    const user = userEvent.setup();
    render(<QuickAccess />);
    await screen.findByText("78 %");
    vi.mocked(getTelemetry).mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          finish = resolve;
          fail = reject;
        }),
    );
    const refresh = screen.getByRole("button", { name: "Refresh battery" });
    await user.click(refresh);
    expect(refresh).toHaveFocus();
    expect(refresh).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reading battery information",
    );
    await act(async () =>
      outcome === "success"
        ? finish(fixture)
        : fail(new Error("Refresh read failed")),
    );
    expect(refresh).toHaveFocus();
    expect(refresh).toHaveAttribute("aria-disabled", "false");
    expect(refresh).toHaveAttribute("aria-busy", "false");
    if (outcome === "success")
      expect(screen.getByText("78 %")).toBeInTheDocument();
    else {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Refresh read failed",
      );
      expect(screen.queryByText("78 %")).not.toBeInTheDocument();
      await user.keyboard("{Enter}");
      expect(await screen.findByText("78 %")).toBeInTheDocument();
      expect(refresh).toHaveFocus();
    }
  },
);

test("rapid clicks, Enter, Space and controller A share one busy guard without moving focus", async () => {
  let finish!: (s: Snapshot) => void;
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  vi.mocked(getTelemetry)
    .mockClear()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  const refresh = screen.getByRole("button", { name: "Refresh battery" });
  refresh.focus();
  // Both clicks occur before React commits aria-disabled: the ref must deduplicate them.
  act(() => {
    refresh.click();
    refresh.click();
  });
  await user.click(refresh);
  await user.keyboard("{Enter} ");
  await send("activate");
  await send("activate");
  expect(getTelemetry).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveFocus();
  await act(async () => finish(fixture));
  await user.keyboard(" ");
  expect(getTelemetry).toHaveBeenCalledTimes(2);
  expect(refresh).toHaveFocus();
});

test.each(["success", "failure"] as const)(
  "Tab, Shift+Tab and voluntary focus stay functional through refresh %s",
  async (outcome) => {
    let finish!: (s: Snapshot) => void;
    let fail!: (e: Error) => void;
    const user = userEvent.setup();
    render(<QuickAccess />);
    await screen.findByText("78 %");
    vi.mocked(getTelemetry).mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          finish = resolve;
          fail = reject;
        }),
    );
    const refresh = screen.getByRole("button", { name: "Refresh battery" });
    await user.click(refresh);
    const performance = screen.getByRole("button", { name: /Performance/ });
    await user.tab();
    expect(performance).toHaveFocus();
    await user.tab({ shift: true });
    expect(refresh).toHaveFocus();
    await user.tab();
    expect(performance).toHaveFocus();
    await act(async () =>
      outcome === "success"
        ? finish(fixture)
        : fail(new Error("Refresh read failed")),
    );
    expect(performance).toHaveFocus();
  },
);

test("Close, Escape and controller Back still hide during a pending refresh", async () => {
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  vi.mocked(getTelemetry).mockImplementationOnce(() => new Promise(() => {}));
  await user.click(screen.getByRole("button", { name: "Refresh battery" }));
  const performance = screen.getByRole("button", { name: /Performance/ });
  await user.click(performance);
  await send("back");
  expect(performance).toHaveAttribute("aria-expanded", "false");
  expect(performance).toHaveFocus();
  const back = await send("back");
  expect(completeQamNavigation).toHaveBeenCalledWith(back.request, true);
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Close Quick Access" }));
  expect(hideQuickAccess).toHaveBeenCalledTimes(2);
});

test("automatic provider reads supersede pending reads without losing the manual busy guard", async () => {
  let old!: (s: Snapshot) => void;
  let current!: (s: Snapshot) => void;
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  vi.mocked(getTelemetry)
    .mockClear()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          old = r;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          current = r;
        }),
    );
  const refresh = screen.getByRole("button", { name: "Refresh battery" });
  await user.click(refresh);
  await act(async () => providerChanged());
  await act(async () => old({ ...fixture, batteryPercent: 12 }));
  expect(refresh).toHaveAttribute("aria-disabled", "true");
  expect(refresh).toHaveFocus();
  fireEvent.click(refresh);
  expect(getTelemetry).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("12 %")).not.toBeInTheDocument();
  await act(async () => current({ ...fixture, batteryPercent: 80 }));
  expect(refresh).toHaveAttribute("aria-disabled", "false");
  expect(refresh).toHaveFocus();
  expect(screen.getByText("80 %")).toBeInTheDocument();
});

test("genuine reopen supersedes a pending refresh without an old completion unlocking the new request", async () => {
  let old!: (s: Snapshot) => void;
  let current!: (s: Snapshot) => void;
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  vi.mocked(getTelemetry)
    .mockClear()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          old = r;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          current = r;
        }),
    );
  const refresh = screen.getByRole("button", { name: "Refresh battery" });
  await user.click(refresh);
  await act(async () => changed({ ...status, visible: false, epoch: 2 }));
  await act(async () => changed({ ...status, epoch: 3 }));
  expect(getTelemetry).toHaveBeenCalledTimes(2);
  await act(async () => old({ ...fixture, batteryPercent: 12 }));
  expect(refresh).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(refresh);
  expect(getTelemetry).toHaveBeenCalledTimes(2);
  await act(async () => current({ ...fixture, batteryPercent: 80 }));
  expect(screen.getByText("80 %")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
  expect(refresh).toHaveAttribute("aria-disabled", "false");
});

test.each([undefined, "false", "TRUE", "1", "true "])(
  "diagnostic button is absent for flag %s even in development or runtime overrides",
  async (flag) => {
    vi.stubEnv("VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS", flag);
    vi.stubEnv("DEV", true);
    localStorage.setItem("VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS", "true");
    window.history.replaceState(
      {},
      "",
      "?qam&VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS=true",
    );
    try {
      render(<QuickAccess />);
      await screen.findByText("78 %");
      expect(
        screen.queryByRole("button", { name: "Test Slow Refresh (5s)" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("TEST BUILD ONLY")).not.toBeInTheDocument();
      expect(screen.getAllByRole("button")).toHaveLength(6);
    } finally {
      window.history.replaceState({}, "", "/");
    }
  },
);

async function diagnosticPanel(fakeClock = true) {
  vi.stubEnv("VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS", "true");
  const view = render(<QuickAccess />);
  await screen.findByText("78 %");
  const button = screen.getByRole("button", { name: "Test Slow Refresh (5s)" });
  expect(screen.getByText("TEST BUILD ONLY")).toBeVisible();
  expect(
    screen.getAllByRole("button").map((b) => b.textContent?.trim()),
  ).toEqual([
    "✕",
    "Refresh battery",
    "Test Slow Refresh (5s)",
    "PerformancePlanned+",
    "ControllerPlanned+",
    "DisplayPlanned+",
    "SettingsDashboard+",
  ]);
  vi.mocked(getTelemetry).mockClear();
  if (fakeClock) vi.useFakeTimers();
  return { view, button, user: userEvent.setup() };
}
async function beginSlow(button: HTMLElement) {
  button.focus();
  await act(async () => {
    fireEvent.click(button);
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Reading battery information",
  );
  expect(button).toHaveFocus();
  if (vi.isFakeTimers()) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(vi.getTimerCount()).toBe(1);
  }
}
function controlledDiagnosticDelay() {
  let finish!: () => void;
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const cancel = vi.fn(() => finish());
  vi.spyOn(focusDiagnostic, "createDiagnosticDelay").mockReturnValue({
    promise,
    cancel,
  });
  return finish;
}

test.each(["success", "error"] as const)(
  "explicit diagnostic build delays %s for five seconds without moving focus",
  async (outcome) => {
    const { button } = await diagnosticPanel();
    if (outcome === "success")
      vi.mocked(getTelemetry).mockResolvedValueOnce({
        ...fixture,
        batteryPercent: 80,
      });
    else
      vi.mocked(getTelemetry).mockRejectedValueOnce(
        new Error("Diagnostic read failed"),
      );
    await beginSlow(button);
    expect(getTelemetry).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Refresh battery" }),
    ).not.toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(4999);
    });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("80 %")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(button).toHaveFocus();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    if (outcome === "success")
      expect(screen.getByText("80 %")).toBeInTheDocument();
    else
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Diagnostic read failed",
      );
    expect(vi.getTimerCount()).toBe(0);
  },
);

test("diagnostic controller activation completes its native lease immediately; busy refresh controls deduplicate and D-pad remains responsive", async () => {
  const { button, user } = await diagnosticPanel(false);
  const finish = controlledDiagnosticDelay();
  button.focus();
  const activation = await send("activate");
  expect(completeQamNavigation).toHaveBeenCalledWith(activation.request, false);
  expect(button).toHaveAttribute("aria-busy", "true");
  await send("activate");
  await user.click(button);
  await user.keyboard("{Enter} ");
  fireEvent.click(screen.getByRole("button", { name: "Refresh battery" }));
  expect(getTelemetry).toHaveBeenCalledTimes(1);
  expect(button).toHaveFocus();
  await send("previous");
  const close = screen.getByRole("button", { name: "Close Quick Access" });
  expect(close).toHaveFocus();
  await send("next");
  const performance = screen.getByRole("button", { name: /Performance/ });
  expect(performance).toHaveFocus();
  await send("previous");
  expect(close).toHaveFocus();
  button.focus();
  await send("next");
  expect(performance).toHaveFocus();
  await act(async () => finish());
  expect(performance).toHaveFocus();
});

test("diagnostic pending read permits Tab, Shift+Tab, touch/mouse sections, Back, Escape and Close", async () => {
  const { button, user } = await diagnosticPanel(false);
  controlledDiagnosticDelay();
  await beginSlow(button);
  const performance = screen.getByRole("button", { name: /Performance/ });
  await user.tab();
  expect(performance).toHaveFocus();
  await user.tab({ shift: true });
  expect(button).toHaveFocus();
  await user.pointer([
    { keys: "[TouchA>]", target: performance },
    { keys: "[/TouchA]" },
  ]);
  expect(performance).toHaveAttribute("aria-expanded", "true");
  await send("back");
  expect(performance).toHaveAttribute("aria-expanded", "false");
  const back = await send("back");
  expect(completeQamNavigation).toHaveBeenCalledWith(back.request, true);
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Close Quick Access" }));
  expect(hideQuickAccess).toHaveBeenCalledTimes(2);
  expect(getTelemetry).toHaveBeenCalledTimes(1);
});

test.each(["provider change", "hide/reopen"] as const)(
  "%s cancels old diagnostic timer and protects newer telemetry and focus",
  async (change) => {
    const { button } = await diagnosticPanel();
    let old!: (s: Snapshot) => void;
    let current!: (s: Snapshot) => void;
    vi.mocked(getTelemetry)
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            old = r;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            current = r;
          }),
      );
    await beginSlow(button);
    const performance = screen.getByRole("button", { name: /Performance/ });
    performance.focus();
    fireEvent.click(performance);
    if (change === "provider change") await act(async () => providerChanged());
    else
      await act(async () => {
        changed({ ...status, visible: false, epoch: 2 });
        changed({ ...status, epoch: 3 });
      });
    expect(getTelemetry).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      vi.advanceTimersByTime(5000);
      old({ ...fixture, batteryPercent: 12 });
    });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("12 %")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(getTelemetry).toHaveBeenCalledTimes(2);
    await act(async () => current({ ...fixture, batteryPercent: 80 }));
    expect(screen.getByText("80 %")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(
      change === "provider change"
        ? performance
        : screen.getByRole("button", { name: "Close Quick Access" }),
    ).toHaveFocus();
  },
);

test("diagnostic timers are released on hide and unmount without delaying native cleanup", async () => {
  const { view, button } = await diagnosticPanel();
  await beginSlow(button);
  await act(async () => changed({ ...status, visible: false, epoch: 2 }));
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => changed({ ...status, visible: true, epoch: 3 }));
  await beginSlow(button);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test("cancelable diagnostic delay is asynchronous and cleanup resolves it without waiting", async () => {
  vi.useFakeTimers();
  const delay = createDiagnosticDelay();
  let settled = false;
  void delay.promise.then(() => {
    settled = true;
  });
  await vi.advanceTimersByTimeAsync(4999);
  expect(settled).toBe(false);
  delay.cancel();
  await delay.promise;
  expect(settled).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

test("diagnostic request waits for telemetry too when the read takes longer than five seconds", async () => {
  const { button } = await diagnosticPanel();
  let finish!: (value: Snapshot) => void;
  vi.mocked(getTelemetry).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await beginSlow(button);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(getTelemetry).toHaveBeenCalledTimes(1);
  await act(async () => finish(fixture));
  expect(button).toHaveAttribute("aria-busy", "false");
  expect(button).toHaveFocus();
});

test("normal Refresh in a diagnostic build remains immediate and never schedules a diagnostic delay", async () => {
  await diagnosticPanel();
  const refresh = screen.getByRole("button", { name: "Refresh battery" });
  refresh.focus();
  await act(async () => fireEvent.click(refresh));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(refresh).toHaveAttribute("aria-busy", "false");
  expect(refresh).toHaveFocus();
  expect(screen.getByText("78 %")).toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
  expect(getTelemetry).toHaveBeenCalledTimes(1);
});

test.each(["previous", "next", "activate"] as const)(
  "explicit %s recovers missing DOM focus to Close without activation",
  async (action) => {
    render(<QuickAccess />);
    await screen.findByText("78 %");
    const close = screen.getByRole("button", { name: "Close Quick Access" });
    close.blur();
    // DOM focus can be missing while the native QAM still owns OS focus.
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    await send(action);
    expect(close).toHaveFocus();
    expect(hideQuickAccess).not.toHaveBeenCalled();
    expect(completeQamNavigation).toHaveBeenLastCalledWith(
      expect.anything(),
      false,
    );
  },
);

test("controller targets exclude unrelated buttons and hidden existing controls", async () => {
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const settings = screen.getByRole("button", { name: /Settings/ });
  const unrelated = document.createElement("button");
  unrelated.textContent = "Informational extra";
  const activate = vi.fn();
  unrelated.addEventListener("click", activate);
  screen.getByRole("dialog").append(unrelated);
  settings.focus();
  await send("next");
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
  unrelated.focus();
  await send("activate");
  expect(activate).not.toHaveBeenCalled();
  const refresh = screen.getByRole("button", { name: "Refresh battery" });
  refresh.hidden = true;
  screen.getByRole("button", { name: "Close Quick Access" }).focus();
  await send("next");
  expect(screen.getByRole("button", { name: /Performance/ })).toHaveFocus();
});

test.each([false, true])(
  "explicit control markers preserve the complete order and wrapping (diagnostic=%s)",
  async (diagnostic) => {
    vi.stubEnv(
      "VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS",
      diagnostic ? "true" : undefined,
    );
    render(<QuickAccess />);
    await screen.findByText("78 %");
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button[data-qam-control]"),
    );
    expect(buttons.map((b) => b.dataset.qamControl)).toEqual([
      "close",
      "refresh",
      ...(diagnostic ? ["slow-refresh"] : []),
      "performance",
      "controller",
      "display",
      "settings",
    ]);
    expect(buttons[0]).toHaveFocus();
    for (let i = 1; i <= buttons.length; i++) {
      await send("next");
      expect(buttons[i % buttons.length]).toHaveFocus();
    }
    await send("previous");
    expect(buttons.at(-1)).toHaveFocus();
    expect(getTelemetry).toHaveBeenCalledTimes(1);
  },
);

test("expanded section is distinct from focus and Back restores its owner after focus moved", async () => {
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const performance = screen.getByRole("button", { name: /Performance/ });
  performance.focus();
  await send("activate");
  const region = document.getElementById(
    performance.getAttribute("aria-controls")!,
  );
  expect(region).toHaveTextContent("No TDP, clocks or fan settings");
  expect(region).not.toHaveAttribute("tabindex");
  expect(performance).toHaveFocus();
  expect(performance.querySelector(".qam-section-indicator")).toHaveTextContent(
    "−",
  );
  await send("next");
  expect(screen.getByRole("button", { name: /Controller/ })).toHaveFocus();
  expect(performance).toHaveAttribute("aria-expanded", "true");
  expect(region).toBeVisible();
  await send("left");
  await send("right");
  expect(performance).toHaveAttribute("aria-expanded", "true");
  await send("back");
  expect(performance).toHaveFocus();
  expect(performance).toHaveAttribute("aria-expanded", "false");
  expect(performance).not.toHaveAttribute("aria-controls");
  expect(region).not.toBeInTheDocument();
  expect(performance.querySelector(".qam-section-indicator")).toHaveTextContent(
    "+",
  );
});

test("keyboard, pointer and controller navigation share actual DOM focus without remembering an old selection", async () => {
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const display = screen.getByRole("button", { name: /Display/ });
  const settings = screen.getByRole("button", { name: /Settings/ });
  await user.click(display);
  expect(display).toHaveFocus();
  await user.tab();
  expect(settings).toHaveFocus();
  await send("next");
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
  await user.tab({ shift: true });
  expect(settings).toHaveFocus();
  await send("previous");
  expect(display).toHaveFocus();
  const controller = screen.getByRole("button", { name: /Controller/ });
  await user.pointer([
    { keys: "[TouchA>]", target: controller },
    { keys: "[/TouchA]" },
  ]);
  const before = document.activeElement;
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button[data-qam-control]"),
  );
  const index = buttons.findIndex((b) => b === before);
  await send("next");
  expect(
    index < 0 ? buttons[0] : buttons[(index + 1) % buttons.length],
  ).toHaveFocus();
  const focused = document.activeElement;
  await act(async () => providerChanged());
  await act(async () => changed(status));
  expect(focused).toHaveFocus();
});

test.each([
  "hidden",
  "aria-hidden",
  "inert",
  "display",
  "visibility",
  "disabled",
] as const)(
  "controller skips %s controls and cannot activate them",
  async (kind) => {
    render(<QuickAccess />);
    await screen.findByText("78 %");
    const refresh = screen.getByRole("button", { name: "Refresh battery" });
    const close = screen.getByRole("button", { name: "Close Quick Access" });
    if (kind === "hidden") refresh.hidden = true;
    else if (kind === "aria-hidden")
      refresh.setAttribute("aria-hidden", "true");
    else if (kind === "inert") refresh.setAttribute("inert", "");
    else if (kind === "display") refresh.style.display = "none";
    else if (kind === "visibility") refresh.style.visibility = "hidden";
    else refresh.setAttribute("disabled", "");
    close.focus();
    await send("next");
    const performance = screen.getByRole("button", { name: /Performance/ });
    expect(performance).toHaveFocus();
    await send("previous");
    expect(close).toHaveFocus();
    // Synthetic unavailable-but-focused state must not cause a read, even if a UA retains focus.
    refresh.focus();
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    await send("activate");
    expect(getTelemetry).toHaveBeenCalledTimes(1);
  },
);

test("hidden section owner is never focused by Back; explicit recovery uses Close", async () => {
  const user = userEvent.setup();
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const performance = screen.getByRole("button", { name: /Performance/ });
  await user.click(performance);
  performance.parentElement!.style.display = "none";
  screen.getByRole("button", { name: /Controller/ }).focus();
  await send("back");
  expect(performance).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.getByRole("button", { name: "Close Quick Access" }),
  ).toHaveFocus();
});

test("OS focus loss rejects actions without window activation or focus restoration", async () => {
  render(<QuickAccess />);
  await screen.findByText("78 %");
  const performance = screen.getByRole("button", { name: /Performance/ });
  performance.focus();
  const focused = vi.spyOn(document, "hasFocus").mockReturnValue(false);
  await send("activate");
  await send("next");
  await send("back");
  expect(performance).toHaveFocus();
  expect(performance).toHaveAttribute("aria-expanded", "false");
  expect(hideQuickAccess).not.toHaveBeenCalled();
  await act(async () => changed(status));
  expect(performance).toHaveFocus();
  focused.mockReturnValue(true);
  await send("next");
  expect(screen.getByRole("button", { name: /Controller/ })).toHaveFocus();
});
