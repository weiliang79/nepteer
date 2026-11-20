# Hardware safety boundary

Step 1 has exactly one read-only command, `get_telemetry`. It returns a timestamped mock snapshot. No physical sensors are queried. There are no hardware writes, drivers, privileged helpers, administrator requirements, game hooks, input injection, HID feature reports, shell plugins or dependencies on Steam Deck Tools.

Model/platform labels are simulated. A capability means a mock value is supplied, never a hardware guarantee. Missing values remain null/unavailable, distinct from legitimate zero. Refresh only retrieves the fixed sample again. Settings only affect local rendering and webview preference storage.

No Steam Deck Tools code was copied, translated or bundled. Similar goals are not permission to reuse its CC BY-NC-SA code. Future native telemetry needs independent interface research, platform gating and hardware verification. Future controls require explicit authorization, safe restoration and recovery design before implementation.

The Windows installer is per-user, unsigned, and skips WebView2 installation. An existing supported Microsoft WebView2 runtime is a prerequisite; do not bypass UAC, signing checks, SmartScreen or antivirus. Stop a smoke test if it requests administrator access unexpectedly. Neither hosted CI nor macOS testing establishes hardware correctness.
