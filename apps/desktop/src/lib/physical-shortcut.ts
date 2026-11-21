import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ShortcutArmRequest, ShortcutStatus } from "./bindings";
function native(command: string, args: Record<string, unknown> = {}) {
  if (!isTauri())
    return Promise.reject(
      new Error("Physical shortcut requires the native Windows app."),
    );
  return invoke<ShortcutStatus>(command, args);
}
export const shortcutStatus = () => native("neptune_shortcut_status");
export const armShortcut = (request: ShortcutArmRequest) =>
  native("neptune_shortcut_arm", { request });
export const disarmShortcut = (generation: number) =>
  native("neptune_shortcut_disarm", { generation });
export const onPhysicalShortcut = (callback: (value: ShortcutStatus) => void) =>
  listen<ShortcutStatus>("neptune-shortcut-changed", (event) =>
    callback(event.payload),
  );
export const shortcutOwnsReader = (value: ShortcutStatus) =>
  value.opened ||
  [
    "arming",
    "waiting_reports",
    "waiting_baseline",
    "armed",
    "disarming",
  ].includes(value.phase);
