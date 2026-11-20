import { afterEach, expect, test, vi } from "vitest";
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { getTelemetry } from "./telemetry";
afterEach(() => {
  clearMocks();
  vi.unstubAllGlobals();
});
test("browser preview reports missing native provider", async () => {
  vi.stubGlobal("isTauri", false);
  await expect(getTelemetry()).rejects.toThrow(
    "Browser preview has no telemetry provider",
  );
});
test("native wrapper invokes exactly the read-only command", async () => {
  vi.stubGlobal("isTauri", true);
  const handler = vi.fn((command: string) => {
    expect(command).toBe("get_telemetry");
    return {
      source: "mock",
      gpuTemperatureCelsius: null,
    };
  });
  mockIPC(handler);
  await expect(getTelemetry()).resolves.toEqual({
    source: "mock",
    gpuTemperatureCelsius: null,
  });
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith("get_telemetry", { mode: "auto" });
  await getTelemetry("mock");
  expect(handler).toHaveBeenLastCalledWith("get_telemetry", { mode: "mock" });
});
