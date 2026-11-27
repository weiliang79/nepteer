EXPERIMENTAL — GPU TEMPERATURE PROBE — MANUAL RUN ONLY

Not production telemetry. May return unsupported or inconclusive.
API success is not validated GPU telemetry. CPU temperature/fan RPM remain deferred.

Do not execute until you have reviewed the matching commit's procedure:
docs/experiments/step-6b2-d3dkmt-gpu-temperature.md
https://github.com/weiliang79/nepteer/tree/experiment/windows-gpu-temperature-d3dkmt/docs/experiments/step-6b2-d3dkmt-gpu-temperature.md
The artifact's COMMIT.txt identifies the exact source commit; review that revision.

Ordinary user, Steam Deck LCD / Windows 11, existing Valve display driver only.
First record Windows build, installed driver provider/version/date, WDDM if visible,
and whether Task Manager has an explicitly labeled GPU temperature.
No active game, no stress workload, no installation/elevation or configuration changes.

No arguments prints help without enumerating adapters or querying hardware.
After review and an explicit choice to run ONE attempt, in ordinary PowerShell:
.\EXPERIMENTAL-GPU-TEMPERATURE-PROBE-MANUAL-RUN-ONLY.exe --run-once

No caller-controlled timeout. If a display API stalls, stop further experiments;
do not launch replacement instances. No watchdog, cancellation or recovery promise.
No automatic retries. Do not schedule execution or redirect output into hardware logs.
Record only the sanitized outcome in the documentation's evidence template.

One same-session invocation is admitted by a named mutex; no multi-session experiment.
A failed close is reported: stop; no close retry or successful-cleanup claim.
Production Nepteer, its installer, QAM and controllers do not use this executable.
