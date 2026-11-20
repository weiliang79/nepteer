import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ProviderMode, Snapshot } from "./bindings";
export async function getTelemetry(mode?: ProviderMode): Promise<Snapshot> {
  if (!isTauri())
    throw new Error(
      "Open Nepteer with pnpm dev to connect to the Rust telemetry provider. Browser preview has no telemetry provider.",
    );
  return invoke<Snapshot>("get_telemetry", mode === undefined ? {} : { mode });
}
export function temperature(
  value: number | null,
  unit: "celsius" | "fahrenheit",
): string {
  if (value === null) return "Unavailable";
  return unit === "celsius"
    ? `${Math.round(value)} °C`
    : `${Math.round((value * 9) / 5 + 32)} °F`;
}
