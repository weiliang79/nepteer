import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTelemetry, temperature } from "@/lib/telemetry";
import { loadPreferences, type Preferences } from "@/lib/preferences";
import { version } from "@/lib/app-info";
import { showQuickAccess, quickAccessStatus } from "@/lib/quick-access";
import type { ProviderMode, Snapshot } from "@/lib/bindings";

const sections = [
  "Dashboard",
  "Quick Access",
  "Performance",
  "Controller",
  "Settings",
] as const;
type Section = (typeof sections)[number];
export default function App() {
  const [qamMessage, setQamMessage] = useState<string | null>(null);
  const [shortcutHint, setShortcutHint] = useState(
    "Ctrl + Alt + Q (Control + Option + Q on macOS)",
  );
  const [section, setSection] = useState<Section>("Dashboard");
  const [preferences, setPreferences] = useState(loadPreferences);
  const [mode, setMode] = useState<ProviderMode>("auto");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(0);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let active = true;
    void quickAccessStatus()
      .then((status) => {
        if (active) {
          setShortcutHint(status.shortcutHint);
          setQamMessage(status.notice);
        }
      })
      .catch(() => {});
    const changed = () => setPreferences(loadPreferences());
    window.addEventListener("storage", changed);
    return () => {
      active = false;
      window.removeEventListener("storage", changed);
    };
  }, []);
  async function openQuickAccess() {
    setQamMessage(null);
    try {
      const status = await showQuickAccess();
      setShortcutHint(status.shortcutHint);
      setQamMessage(status.notice);
    } catch (reason) {
      setQamMessage(`Quick Access could not open: ${String(reason)}`);
    }
  }
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  function updatePreferences(next: Preferences) {
    setPreferences(next);
    try {
      localStorage.setItem("nepteer.preferences", JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  useEffect(() => {
    let active = true;
    getTelemetry(mode)
      .then((value) => {
        if (active) setSnapshot(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, mode]);
  function refresh() {
    setLoading(true);
    setError(null);
    setSnapshot(null);
    setRequest((n) => n + 1);
  }
  const isMock = snapshot?.source === "mock";
  const isWindows = snapshot?.source === "windows";
  const sourceLabel = isMock
    ? "MOCK DATA"
    : isWindows
      ? "LIVE WINDOWS"
      : loading
        ? "READING PROVIDER"
        : "SOURCE UNAVAILABLE";
  function selectMode(next: ProviderMode) {
    setMode(next);
    refresh();
  }
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            N
          </span>
          <div>
            Nepteer<small>HANDHELD COMPANION</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {sections.map((item, index) => (
            <Button
              key={item}
              variant="ghost"
              className={`nav-item ${section === item ? "selected" : ""}`}
              aria-current={section === item ? "page" : undefined}
              onClick={() => setSection(item)}
            >
              <span className="nav-number" aria-hidden="true">
                0{index + 1}
              </span>
              {item}
              {!["Dashboard", "Settings", "Quick Access"].includes(item) && (
                <span className="planned-tag">Planned</span>
              )}
            </Button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" /> {sourceLabel}
          <small>v{version} · Read only</small>
        </div>
      </aside>
      <main id="main" tabIndex={-1}>
        <header className="topbar">
          <span>NEPTEER / {section.toUpperCase()}</span>
          <span className="source-pill">
            <span className="status-dot" /> {sourceLabel}
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR HANDHELD, AT A GLANCE</p>
              <h1>{section}</h1>
              <p className="muted">
                {section === "Dashboard"
                  ? "A calm place to check in on your device."
                  : section === "Settings"
                    ? "Make this workspace feel like yours."
                    : "A little further down the road."}
              </p>
            </div>
            {section === "Dashboard" && (
              <Button variant="outline" onClick={refresh} disabled={loading}>
                {loading ? "Reading…" : "Refresh snapshot"}
              </Button>
            )}
          </div>
          <div className="qam-entry">
            <Button onClick={() => void openQuickAccess()}>
              Open Quick Access
            </Button>
            <p className="muted">
              {shortcutHint} · Available while Nepteer is running
            </p>
            {qamMessage && <p role="alert">{qamMessage}</p>}
          </div>
          <div className="notice">
            <span className="notice-symbol" aria-hidden="true">
              i
            </span>
            <div>
              <strong>
                {isMock
                  ? "Development preview · Mock telemetry"
                  : isWindows
                    ? "Windows telemetry · Read only"
                    : "Read-only telemetry"}
              </strong>
              <p>
                {isMock
                  ? "All readings are fixed sample values. No hardware is monitored or controlled."
                  : isWindows
                    ? "Battery and device information come from Windows. Unsupported sensors remain unavailable. No hardware settings are changed."
                    : "Reading the selected provider. Automatic mode uses Windows telemetry on Windows and mock samples on other hosts."}
              </p>
            </div>
          </div>
          {section === "Dashboard" && (
            <>
              {loading && (
                <p role="status" className="state-message">
                  Reading the selected Rust provider…
                </p>
              )}
              {error && (
                <div role="alert" className="error">
                  <strong>Telemetry connection unavailable</strong>
                  <p>{error}</p>
                  <Button variant="outline" onClick={refresh}>
                    Try again
                  </Button>
                </div>
              )}
              {snapshot && !loading && !error && (
                <>
                  <section
                    className="device-strip"
                    aria-label={isMock ? "Simulated device" : "Detected device"}
                  >
                    <div>
                      <p className="eyebrow">
                        {isMock
                          ? "SIMULATED DEVICE"
                          : "WINDOWS DEVICE INFORMATION"}
                      </p>
                      <h2>{snapshot.device.model ?? "Unknown model"}</h2>
                      <p className="muted">
                        Manufacturer:{" "}
                        {snapshot.device.manufacturer ?? "Unknown"}
                      </p>
                      {!isMock && (
                        <p className="muted">
                          Steam Deck LCD/OLED identification: Unverified
                        </p>
                      )}
                      <p className="muted">
                        {snapshot.device.platform} · App host:{" "}
                        {snapshot.device.hostPlatform}
                      </p>
                    </div>
                    <span className="source-pill">
                      SOURCE: {snapshot.source.toUpperCase()}
                    </span>
                  </section>
                  {snapshot.issues.length > 0 && (
                    <div role="status" className="notice">
                      <div>
                        <strong>Some Windows information is unavailable</strong>
                        <ul>
                          {snapshot.issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                        <p>
                          Use Refresh snapshot to retry. The provider has not
                          changed.
                        </p>
                      </div>
                    </div>
                  )}
                  <section
                    className="metrics"
                    aria-label={isMock ? "Mock telemetry" : "Windows telemetry"}
                  >
                    <Metric
                      label="Battery"
                      source={isMock ? "MOCK" : "WINDOWS"}
                      value={
                        snapshot.capabilities.battery &&
                        snapshot.batteryPercent !== null
                          ? `${snapshot.batteryPercent} %`
                          : "Unavailable"
                      }
                      detail={
                        snapshot.batteryStatus === "no_battery"
                          ? "No system battery"
                          : `${snapshot.chargeState} · ${snapshot.batteryStatus === "error" ? "Read failed" : snapshot.batteryStatus === "unknown" ? "Percentage unknown" : isMock ? "Mock sample" : "Windows power status"}`
                      }
                    />
                    <Metric
                      label="CPU temperature"
                      source={
                        snapshot.capabilities.cpuTemperature
                          ? isMock
                            ? "MOCK"
                            : "WINDOWS"
                          : "UNSUPPORTED"
                      }
                      value={temperature(
                        snapshot.capabilities.cpuTemperature
                          ? snapshot.cpuTemperatureCelsius
                          : null,
                        preferences.unit,
                      )}
                      detail={
                        isMock
                          ? "Mock sample · CPU package"
                          : "Unavailable · Not implemented"
                      }
                    />
                    <Metric
                      label="GPU temperature"
                      source="UNSUPPORTED"
                      value={temperature(
                        snapshot.capabilities.gpuTemperature
                          ? snapshot.gpuTemperatureCelsius
                          : null,
                        preferences.unit,
                      )}
                      detail="Unsupported in this provider"
                    />
                    <Metric
                      label="Fan speed"
                      source={
                        snapshot.capabilities.fanRpm
                          ? isMock
                            ? "MOCK"
                            : "WINDOWS"
                          : "UNSUPPORTED"
                      }
                      value={
                        snapshot.capabilities.fanRpm && snapshot.fanRpm !== null
                          ? `${snapshot.fanRpm.toLocaleString()} RPM`
                          : "Unavailable"
                      }
                      detail={
                        isMock
                          ? "Mock sample · Read only"
                          : "Unavailable · Not implemented"
                      }
                    />
                  </section>
                  <div className="lower-grid">
                    <section className="panel">
                      <p className="eyebrow">PROVIDER CAPABILITIES</p>
                      <h2>Know what’s available</h2>
                      <p className="muted">
                        Capabilities describe implemented reads in this
                        provider. Availability is reported separately for each
                        snapshot.
                      </p>
                      <dl className="capabilities">
                        {Object.entries(snapshot.capabilities).map(
                          ([key, enabled]) => (
                            <div key={key}>
                              <dt>
                                {
                                  (
                                    {
                                      battery: "Battery reading",
                                      cpuTemperature: "CPU temperature",
                                      gpuTemperature: "GPU temperature",
                                      fanRpm: "Fan RPM",
                                      hardwareControls: "Hardware controls",
                                    } as Record<string, string>
                                  )[key]
                                }
                              </dt>
                              <dd className={enabled ? "available" : "muted"}>
                                {enabled
                                  ? isMock
                                    ? "Mock available"
                                    : "Read supported"
                                  : "Unavailable"}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                    </section>
                    <section className="panel future-panel">
                      <span className="planned-tag">QUICK ACCESS</span>
                      <h2>A quicker way in.</h2>
                      <p className="muted">
                        Open a separate, read-only panel with battery
                        information and keyboard/touch navigation.
                      </p>
                      <p className="muted">
                        Power profiles, fan controls and input mapping are not
                        available in this foundation.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setSection("Quick Access")}
                      >
                        About Quick Access <span aria-hidden="true">↗</span>
                      </Button>
                    </section>
                  </div>
                  <p className="snapshot-time">
                    {isMock ? "Mock snapshot" : "Windows snapshot"} retrieved{" "}
                    {new Date(snapshot.capturedAtUnixMs).toLocaleString()} ·{" "}
                    {isMock
                      ? "Refresh repeats the same samples."
                      : "Manual refresh only; no background polling."}
                  </p>
                </>
              )}
            </>
          )}
          {section === "Quick Access" && (
            <section className="panel">
              <h2>A panel within reach.</h2>
              <p className="muted">
                Open Quick Access above ordinary desktop windows with the button
                above or {shortcutHint}. Escape, Close, or clicking outside
                after activation hides the panel. Exclusive-fullscreen
                compatibility is not guaranteed.
              </p>
              <p className="muted">
                Performance, controller and display controls remain planned.
                This panel changes no hardware settings.
              </p>
            </section>
          )}
          {section === "Settings" && (
            <section className="panel settings">
              <h2>Appearance & units</h2>
              <p className="muted">
                Preferences are stored locally in this app’s webview.
              </p>
              <label>
                Theme
                <select
                  value={preferences.theme}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      theme: event.target.value as Preferences["theme"],
                    })
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label>
                Temperature units
                <select
                  value={preferences.unit}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      unit: event.target.value as Preferences["unit"],
                    })
                  }
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </label>
              {storageError && (
                <p role="status">
                  Local storage is unavailable. Preferences apply for this
                  session.
                </p>
              )}
              <div className="settings-note">
                <strong>Data source: {sourceLabel}</strong>
                <label>
                  Telemetry provider
                  <select
                    value={mode}
                    disabled={loading}
                    onChange={(event) =>
                      selectMode(event.target.value as ProviderMode)
                    }
                  >
                    <option value="auto">
                      Automatic (Windows live / other hosts mock)
                    </option>
                    <option value="mock">Mock samples (development)</option>
                  </select>
                </label>
                <p className="muted">
                  Provider selection applies to this session only and resets to
                  Automatic on restart. Windows read failures never select mock
                  mode. Switching providers reads a new snapshot; nothing
                  changes hardware settings.
                </p>
              </div>
            </section>
          )}
          {!["Dashboard", "Settings", "Quick Access"].includes(section) && (
            <section className="panel planned-page">
              <span className="planned-tag">PLANNED · FUTURE MILESTONE</span>
              <h2>
                {section === "Quick Access"
                  ? "Your shortcuts, within reach."
                  : section === "Performance"
                    ? "A clearer view of performance."
                    : "Built around your hands."}
              </h2>
              <p className="muted">
                {section === "Quick Access"
                  ? "A controller-friendly menu needs Windows focus and fullscreen testing before implementation."
                  : section === "Performance"
                    ? "Live sensors, power profiles and safe restoration need hardware research and validation."
                    : "Steam buttons, trackpads and input mapping need dedicated Windows hardware research."}
              </p>
              <Button variant="outline" onClick={() => setSection("Dashboard")}>
                Back to dashboard
              </Button>
            </section>
          )}
          <footer>
            INDEPENDENTLY BUILT · READ-ONLY FOUNDATION
            <span>Designed for Steam Deck LCD / Windows 11</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  source,
}: {
  label: string;
  value: string;
  detail: string;
  source: string;
}) {
  return (
    <article className="metric">
      <p className="metric-label">
        {label}
        <span>{source}</span>
      </p>
      <p
        className={`metric-value ${value === "Unavailable" ? "unavailable" : ""}`}
      >
        {value}
      </p>
      <p className="muted metric-detail">{detail}</p>
    </article>
  );
}
