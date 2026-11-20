import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Snapshot } from "./bindings";
export async function getTelemetry(): Promise<Snapshot> {
  if (!isTauri())
    throw new Error(
      "Open Nepteer with pnpm dev to connect to the Rust mock provider. Browser preview has no telemetry provider.",
    );
  return invoke<Snapshot>("get_telemetry");
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
