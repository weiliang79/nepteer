import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Status } from "./bindings";
export type QuickAccessStatus = Status;
function native<T>(command: string): Promise<T> {
  if (!isTauri())
    return Promise.reject(
      new Error(
        "Quick Access needs the native Nepteer app. Start it with pnpm dev.",
      ),
    );
  return invoke<T>(command);
}
export const showQuickAccess = () => native<Status>("show_quick_access");
export const hideQuickAccess = () => native<Status>("hide_quick_access");
export const toggleQuickAccess = () => native<Status>("toggle_quick_access");
export const quickAccessStatus = () => native<Status>("quick_access_status");
export const onQuickAccessChange = (
  callback: (status: Status) => void,
): Promise<UnlistenFn> =>
  listen<Status>("quick-access-changed", (event) => callback(event.payload));
export const onProviderChange = (callback: () => void): Promise<UnlistenFn> =>
  listen("provider-changed", callback);

export const onQamNavigation = (
  callback: (event: import("./bindings").NavigationEvent) => void,
) =>
  listen<import("./bindings").NavigationEvent>("qam-navigation", (event) =>
    callback(event.payload),
  );
export const claimQamNavigation = (
  request: import("./bindings").NavigationRequest,
) =>
  invoke<import("./bindings").NavigationClaim | null>("qam_navigation_claim", {
    request,
  });
export const completeQamNavigation = (
  request: import("./bindings").NavigationRequest,
  hide: boolean,
) => invoke<void>("qam_navigation_complete", { request, hide });
