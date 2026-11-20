import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTelemetry, temperature } from "@/lib/telemetry";
import type { Snapshot } from "@/lib/bindings";

const sections = [
  "Dashboard",
  "Quick Access",
  "Performance",
  "Controller",
  "Settings",
] as const;
type Section = (typeof sections)[number];
type Preferences = { theme: "dark" | "light"; unit: "celsius" | "fahrenheit" };
function loadPreferences(): Preferences {
  try {
    const value = JSON.parse(
      localStorage.getItem("nepteer.preferences") ?? "{}",
    );
    return {
      theme: value?.theme === "light" ? "light" : "dark",
      unit: value?.unit === "fahrenheit" ? "fahrenheit" : "celsius",
    };
  } catch {
    return { theme: "dark", unit: "celsius" };
  }
}

export default function App() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [preferences, setPreferences] = useState(loadPreferences);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(0);
  const [storageError, setStorageError] = useState(false);
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
    getTelemetry()
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
  }, [request]);
  function refresh() {
    setLoading(true);
    setError(null);
    setSnapshot(null);
    setRequest((n) => n + 1);
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
              {!["Dashboard", "Settings"].includes(item) && (
                <span className="planned-tag">Planned</span>
              )}
            </Button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" /> Mock provider only
          <small>v0.1.0-alpha · Foundation</small>
        </div>
      </aside>
      <main id="main" tabIndex={-1}>
        <header className="topbar">
          <span>NEPTEER / {section.toUpperCase()}</span>
          <span className="source-pill">
            <span className="status-dot" /> MOCK DATA
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
                {loading ? "Reading…" : "Refresh mock snapshot"}
              </Button>
            )}
          </div>
          <div className="notice">
            <span className="notice-symbol" aria-hidden="true">
              i
            </span>
            <div>
              <strong>Foundation preview · Mock telemetry</strong>
              <p>
                All readings are fixed sample values. No hardware is monitored
                or controlled.
              </p>
            </div>
          </div>
          {section === "Dashboard" && (
            <>
              {loading && (
                <p role="status" className="state-message">
                  Reading the Rust mock provider…
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
                    aria-label="Simulated device"
                  >
                    <div>
                      <p className="eyebrow">SIMULATED DEVICE</p>
                      <h2>{snapshot.device.model}</h2>
                      <p className="muted">
                        {snapshot.device.platform} · App host:{" "}
                        {snapshot.device.hostPlatform}
                      </p>
                    </div>
                    <span className="source-pill">
                      SOURCE: {snapshot.source.toUpperCase()}
                    </span>
                  </section>
                  <section className="metrics" aria-label="Mock telemetry">
                    <Metric
                      label="Battery"
                      value={
                        snapshot.capabilities.battery &&
                        snapshot.batteryPercent !== null
                          ? `${snapshot.batteryPercent} %`
                          : "Unavailable"
                      }
                      detail={
                        snapshot.capabilities.battery
                          ? `Mock · ${snapshot.chargeState}`
                          : "Unsupported in this provider"
                      }
                    />
                    <Metric
                      label="CPU temperature"
                      value={temperature(
                        snapshot.capabilities.cpuTemperature
                          ? snapshot.cpuTemperatureCelsius
                          : null,
                        preferences.unit,
                      )}
                      detail="Mock sample · CPU package"
                    />
                    <Metric
                      label="GPU temperature"
                      value={temperature(
                        snapshot.capabilities.gpuTemperature
                          ? snapshot.gpuTemperatureCelsius
                          : null,
                        preferences.unit,
                      )}
                      detail="Unsupported in this mock provider"
                    />
                    <Metric
                      label="Fan speed"
                      value={
                        snapshot.capabilities.fanRpm && snapshot.fanRpm !== null
                          ? `${snapshot.fanRpm.toLocaleString()} RPM`
                          : "Unavailable"
                      }
                      detail="Mock sample · Read only"
                    />
                  </section>
                  <div className="lower-grid">
                    <section className="panel">
                      <p className="eyebrow">PROVIDER CAPABILITIES</p>
                      <h2>Know what’s available</h2>
                      <p className="muted">
                        Capabilities describe this mock provider, not detected
                        hardware.
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
                                {enabled ? "Mock available" : "Unavailable"}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                    </section>
                    <section className="panel future-panel">
                      <span className="planned-tag">ON THE HORIZON</span>
                      <h2>A quicker way in.</h2>
                      <p className="muted">
                        A controller-friendly Quick Access Menu is planned for a
                        future milestone.
                      </p>
                      <p className="muted">
                        Power profiles, fan controls and input mapping are not
                        available in this foundation.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setSection("Quick Access")}
                      >
                        Explore what’s planned <span aria-hidden="true">↗</span>
                      </Button>
                    </section>
                  </div>
                  <p className="snapshot-time">
                    Mock snapshot retrieved{" "}
                    {new Date(snapshot.capturedAtUnixMs).toLocaleString()} ·
                    Refresh repeats the same samples.
                  </p>
                </>
              )}
            </>
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
                <strong>Data source: Mock</strong>
                <p className="muted">
                  The provider is fixed for Step 1. Live telemetry and hardware
                  controls are future work.
                </p>
              </div>
            </section>
          )}
          {!["Dashboard", "Settings"].includes(section) && (
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
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric">
      <p className="metric-label">
        {label}
        <span>MOCK</span>
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
