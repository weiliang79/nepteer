import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTelemetry } from "@/lib/telemetry";
import type { Snapshot } from "@/lib/bindings";
import {
  hideQuickAccess,
  quickAccessStatus,
  onQuickAccessChange,
  onProviderChange,
} from "@/lib/quick-access";
import { loadPreferences } from "@/lib/preferences";
import { version } from "@/lib/app-info";
const items = {
  Performance:
    "Power profiles and sensor controls are planned. No TDP, clocks or fan settings can be changed here.",
  Controller:
    "Controller navigation and remapping remain planned. The physical ⋯ shortcut can be armed only in the main dashboard; this panel cannot manage HID readers.",
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
  const alive = useRef(true);
  async function refresh() {
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
      if (alive.current && request === sequence.current) setLoading(false);
    }
  }
  async function hide() {
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
    // Subscribe before querying so an open before webview readiness cannot be lost.
    void (async () => {
      for (const subscription of [
        () =>
          onQuickAccessChange((status) => {
            if (disposed) return;
            setHint(status.shortcutHint);
            setNotice(status.notice);
            if (status.visible) opened();
          }),
        () =>
          onProviderChange(() => {
            void quickAccessStatus()
              .then((status) => {
                if (status.visible && !disposed) opened();
              })
              .catch((reason) => {
                if (!disposed) setError(String(reason));
              });
          }),
      ]) {
        const stop = await subscription();
        if (disposed) {
          stop();
          return;
        }
        stops.push(stop);
      }
      const status = await quickAccessStatus();
      if (disposed) return;
      setHint(status.shortcutHint);
      setNotice(status.notice);
      if (status.visible) opened();
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
        onClick={() => void refresh()}
        disabled={loading}
      >
        Refresh battery
      </Button>
      <nav className="qam-navigation" aria-label="Quick Access sections">
        {Object.entries(items).map(([name, text]) => (
          <div key={name}>
            <Button
              variant="ghost"
              aria-expanded={section === name}
              onClick={() =>
                setSection(
                  section === name ? null : (name as keyof typeof items),
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
        <p>{hint}</p>
        {notice && <p role="status">{notice}</p>}
        <span>v{version} · READ-ONLY PREVIEW</span>
      </footer>
    </main>
  );
}
