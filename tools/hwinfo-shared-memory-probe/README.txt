EXPERIMENTAL-HWINFO-SHARED-MEMORY-PROBE-MANUAL-RUN-ONLY
STATUS: INTERFACE BLOCKED. This artifact cannot test HWiNFO access or extract readings.

Review PROCEDURE.md and COMMIT.txt. --help accesses no mapping.
--check-access and --read-once intentionally return interface-blocked, exit 3,
on Windows x86_64. Other platforms return unsupported-platform, exit 4.
No arguments/extra arguments return exit 2. No automatic operation or retries.
There is no implemented shared-memory consumer or binary parser in this artifact.

Do not run elevated. asInvoker does not lower an already elevated parent token;
use ordinary PowerShell. No HWiNFO executable, SDK, driver or installer included.
No network, logs, polling, service, process access or hardware acquisition.
Do not interpret this artifact's blocked result as absent mapping or access denial.
All CPU/GPU/fan attribution, numbers and freshness remain unresolved.
Future physical access requires a reviewed verified interface implementation.
Future --read-once additionally requires explicit user approval.
Do not change HWiNFO settings or permissions, relaunch it, or bypass sharing expiry.
