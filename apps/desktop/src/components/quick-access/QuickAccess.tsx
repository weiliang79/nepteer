import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTelemetry } from "@/lib/telemetry";
import type { Snapshot, Status, NavigationAction } from "@/lib/bindings";
import {
  hideQuickAccess,
  quickAccessStatus,
  onQuickAccessChange,
  onProviderChange,
  onQamNavigation,
  claimQamNavigation,
  completeQamNavigation,
} from "@/lib/quick-access";
import { loadPreferences } from "@/lib/preferences";
import { version } from "@/lib/app-info";
const items = {
  Performance:
    "Power profiles and sensor controls are planned. No TDP, clocks or fan settings can be changed here.",
  Controller:
    "Desktop-only controller navigation can be enabled when arming in the main dashboard for the reviewed X360 configuration. This panel cannot manage HID readers or remap controllers.",
  Display:
    "Display controls are planned. This preview does not change resolution, refresh rate or fullscreen modes.",
  Settings:
    "Theme, units and telemetry provider are configured in the main dashboard. This panel follows that session’s provider and saved theme.",
};
export default function QuickAccess() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("Open from dashboard");
  const [notice, setNotice] = useState<string | null>(null);
  const [section, setSection] = useState<keyof typeof items | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const sequence = useRef(0);
  const nativeStatus = useRef<Status | null>(null);
  const navBusy = useRef(false);
  const pendingNavigation = useRef<
    import("@/lib/bindings").NavigationEvent | null
  >(null);
  const lastNavigation = useRef<
    import("@/lib/bindings").NavigationRequest | null
  >(null);
  const activeNavigation = useRef<{ hide: boolean } | null>(null);
  const sectionRef = useRef<keyof typeof items | null>(null);
  const refreshInFlight = useRef(false);
  function changeSection(value: keyof typeof items | null) {
    sectionRef.current = value;
    setSection(value);
  }
  function navigate(action: NavigationAction) {
    const buttons = Array.from(
      panel.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ) ?? [],
    );
    if (!buttons.length) return;
    const focused = buttons.findIndex(
      (button) => button === document.activeElement,
    );
    const index = focused < 0 ? 0 : focused;
    if (action === "previous" || action === "next") {
      const step = action === "next" ? 1 : -1;
      // Keep the focused busy control as the origin, but skip it as a destination.
      for (let offset = 1; offset <= buttons.length; offset++) {
        const target =
          buttons[(index + offset * step + buttons.length) % buttons.length];
        if (target.getAttribute("aria-disabled") !== "true") {
          target.focus();
          break;
        }
      }
    } else if (action === "activate") {
      if (focused < 0) buttons[0].focus();
      else if (buttons[index].getAttribute("aria-disabled") !== "true")
        buttons[index].click();
    } else if (action === "back") {
      const current = sectionRef.current;
      if (current) {
        changeSection(null);
        panel.current
          ?.querySelector<HTMLButtonElement>(
            `button[data-section="${current}"]`,
          )
          ?.focus();
      } else void hide();
    }
    // Left/Right have no adjustable control in this interface.
  }
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });
  const alive = useRef(true);
  async function refresh() {
    refreshInFlight.current = true;
    const request = ++sequence.current;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    try {
      const value = await getTelemetry();
      if (alive.current && request === sequence.current) setSnapshot(value);
    } catch (reason) {
      if (alive.current && request === sequence.current)
        setError(String(reason));
    } finally {
      if (alive.current && request === sequence.current) {
        refreshInFlight.current = false;
        setLoading(false);
      }
    }
  }
  async function hide() {
    if (activeNavigation.current) {
      activeNavigation.current.hide = true;
      return;
    }
    try {
      await hideQuickAccess();
    } catch (reason) {
      setError(`Could not hide Quick Access: ${String(reason)}`);
    }
  }
  useEffect(() => {
    alive.current = true;
    sequence.current += 1;
    let disposed = false;
    const stops: Array<() => void> = [];
    const preferences = () => {
      document.documentElement.dataset.theme = loadPreferences().theme;
    };
    const opened = () => {
      preferences();
      if (!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
        panel.current?.animate?.(
          [
            { opacity: 0.6, transform: "translateX(6px)" },
            { opacity: 1, transform: "translateX(0)" },
          ],
          { duration: 140, easing: "ease-out" },
        );
      }
      close.current?.focus();
      void refresh();
    };
    const acceptStatus = (status: Status) => {
      const before = nativeStatus.current;
      if (before && status.epoch < before.epoch) return;
      nativeStatus.current = status;
      setHint(status.shortcutHint);
      setNotice(status.notice);
      if (status.visible && (!before?.visible || before.epoch !== status.epoch))
        opened();
      if (!status.visible) sequence.current += 1;
    };
    // All navigation is revalidated by native claim, not by a React visibility flag.
    const navigation = async (
      event: import("@/lib/bindings").NavigationEvent,
    ): Promise<void> => {
      if (disposed) return;
      const last = lastNavigation.current;
      if (
        last &&
        (event.request.generation < last.generation ||
          (event.request.generation === last.generation &&
            event.request.sequence <= last.sequence))
      )
        return;
      if (navBusy.current) {
        const pending = pendingNavigation.current?.request;
        if (
          !pending ||
          event.request.generation > pending.generation ||
          (event.request.generation === pending.generation &&
            event.request.sequence > pending.sequence)
        )
          pendingNavigation.current = event;
        return;
      }
      lastNavigation.current = event.request;
      navBusy.current = true;
      let lease: { hide: boolean } | null = null;
      const started = performance.now();
      try {
        // Resynchronize native status if an open notification was delayed or the webview just mounted.
        acceptStatus(await quickAccessStatus());
        if (
          disposed ||
          !nativeStatus.current?.visible ||
          nativeStatus.current.epoch !== event.request.epoch
        )
          return;
        const claim = await claimQamNavigation(event.request);
        if (
          !claim ||
          disposed ||
          claim.event.request.generation !== event.request.generation ||
          claim.event.request.sequence !== event.request.sequence ||
          claim.event.request.epoch !== nativeStatus.current?.epoch ||
          !nativeStatus.current.visible ||
          document.visibilityState === "hidden" ||
          !document.hasFocus() ||
          performance.now() - started >= claim.validForMs
        )
          return;
        lease = { hide: false };
        activeNavigation.current = lease;
        navigateRef.current(claim.event.action);
      } catch {
        if (!disposed)
          setError(
            "Controller navigation unavailable. Use keyboard/touch, then Disarm and rearm manually.",
          );
      } finally {
        activeNavigation.current = null;
        // Native still permits only one claimed delivery. Do not hold the client guard
        // across the completion response: the next native offer may arrive before it.
        navBusy.current = false;
        const pending = pendingNavigation.current;
        pendingNavigation.current = null;
        const completion = completeQamNavigation(
          event.request,
          lease?.hide ?? false,
        );
        if (pending) void navigation(pending);
        // Complete even after a lost claim response/unmount: release any granted native lease.
        try {
          await completion;
        } catch {
          if (!disposed)
            setError(
              "Navigation completion unavailable; reader cleanup may remain pending. Do not assume Disarm completed.",
            );
        }
      }
    };
    void (async () => {
      for (const subscribe of [
        () =>
          onQuickAccessChange((status) => {
            if (!disposed) acceptStatus(status);
          }),
        () =>
          onProviderChange(() => {
            void quickAccessStatus()
              .then((status) => {
                if (!disposed) {
                  acceptStatus(status);
                  if (status.visible) {
                    preferences();
                    void refresh();
                  }
                }
              })
              .catch((reason) => {
                if (!disposed) setError(String(reason));
              });
          }),
        () =>
          onQamNavigation((event) => {
            void navigation(event);
          }),
      ]) {
        const stop = await subscribe();
        if (disposed) {
          stop();
          return;
        }
        stops.push(stop);
      }
      const status = await quickAccessStatus();
      if (!disposed) acceptStatus(status);
    })().catch((reason) => {
      if (!disposed) setError(String(reason));
    });
    preferences();
    window.addEventListener("storage", preferences);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void hide();
      }
      if (event.key === "Tab") {
        const buttons = panel.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        );
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      disposed = true;
      alive.current = false;
      stops.forEach((stop) => stop());
      window.removeEventListener("storage", preferences);
      document.removeEventListener("keydown", keyboard);
    };
    // Native open events own refresh; there is no polling or frontend visibility flag.
  }, []);
  const source =
    snapshot?.source === "windows"
      ? "LIVE WINDOWS"
      : snapshot?.source === "mock"
        ? "MOCK DATA"
        : loading
          ? "READING PROVIDER"
          : "SOURCE UNAVAILABLE";
  return (
    <main
      className="qam-panel"
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="qam-title"
    >
      <header className="qam-header">
        <div className="brand-mark" aria-hidden="true">
          N
        </div>
        <div>
          <p className="eyebrow">NEPTEER</p>
          <h1 id="qam-title">Quick Access</h1>
        </div>
        <Button
          ref={close}
          variant="ghost"
          onClick={() => void hide()}
          aria-label="Close Quick Access"
        >
          ✕
        </Button>
      </header>
      <aside
        className="qam-input-help"
        aria-label="Quick Access input guidance"
      >
        <strong>Controller navigation: desktop only</strong>
        <p>Games and other tools may still receive the same buttons.</p>
        <p>
          When enabled: ↑/↓ move · A select · B back/close. Left/Right: no
          action. Tap or click any control.
        </p>
      </aside>
      <section className="qam-battery" aria-label="Battery status">
        <span className="source-pill">{source}</span>
        <p className="eyebrow">BATTERY</p>
        <p className="qam-reading">
          {snapshot?.batteryPercent != null && snapshot.capabilities.battery
            ? `${snapshot.batteryPercent} %`
            : "Unavailable"}
        </p>
        <p className="muted">
          {snapshot?.batteryStatus === "no_battery"
            ? "No system battery"
            : snapshot
              ? `${snapshot.chargeState} · ${snapshot.batteryStatus === "error" ? "Read failed" : snapshot.batteryStatus === "unknown" ? "Percentage unknown" : "Read only"}`
              : "Open the panel or refresh to read telemetry."}
        </p>
        {snapshot?.source === "mock" && (
          <p className="muted">
            Fixed development samples · No live hardware readings
          </p>
        )}
      </section>
      {loading && <p role="status">Reading battery information…</p>}
      {error && (
        <div className="qam-error" role="alert">
          {error}
        </div>
      )}
      {snapshot?.issues.map((issue, index) => (
        <p className="qam-error" key={index}>
          {issue}
        </p>
      ))}
      <Button
        variant="outline"
        onClick={() => {
          // DOM clicks, keyboard activation and controller A share this synchronous gate.
          if (!refreshInFlight.current) void refresh();
        }}
        aria-disabled={loading}
        aria-busy={loading}
      >
        Refresh battery
      </Button>
      <nav className="qam-navigation" aria-label="Quick Access sections">
        {Object.entries(items).map(([name, text]) => (
          <div key={name}>
            <Button
              variant="ghost"
              data-section={name}
              aria-expanded={section === name}
              onClick={() =>
                changeSection(
                  sectionRef.current === name
                    ? null
                    : (name as keyof typeof items),
                )
              }
            >
              {name}
              <span className="planned-tag">
                {name === "Settings" ? "Dashboard" : "Planned"}
              </span>
              <span aria-hidden="true">↗</span>
            </Button>
            {section === name && <p className="muted">{text}</p>}
          </div>
        ))}
      </nav>
      <footer className="qam-footer">
        <p>Keyboard: {hint}</p>
        <p>Tab / Shift+Tab move · Enter / Space select · Escape close</p>
        {notice && <p role="status">{notice}</p>}
        <span>v{version} · READ-ONLY PREVIEW</span>
      </footer>
    </main>
  );
}
