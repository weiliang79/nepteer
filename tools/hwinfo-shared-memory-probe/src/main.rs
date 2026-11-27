#![forbid(unsafe_code)]

use std::process::ExitCode;

const HELP: &str = "EXPERIMENTAL-HWINFO-SHARED-MEMORY-PROBE-MANUAL-RUN-ONLY
Usage: hwinfo-shared-memory-probe.exe --help | --check-access | --read-once
Windows x86_64 target; no installer integration.
BLOCKED: authoritative interface contract has not been obtained.
--check-access and --read-once report the blocker and perform NO shared-memory access.
No parser, sensor values, retries, background work, elevation or HWiNFO launch.
See PROCEDURE.md before any future physical execution.
Exit codes: 0 help; 2 invalid arguments; 3 interface blocked; 4 unsupported platform.";

fn main() -> ExitCode {
    // Do not echo arbitrary arguments: they may contain private identifiers.
    let args: Vec<_> = std::env::args_os().skip(1).take(2).collect();
    let code = match args.as_slice() {
        [arg] if arg == "--help" => {
            println!("{HELP}");
            0
        }
        [arg] if arg == "--check-access" || arg == "--read-once" => {
            if cfg!(all(windows, target_arch = "x86_64")) {
                println!(
                    "Status: interface-blocked; access: not-attempted; interface/version: unverified."
                );
                println!(
                    "CPU: unresolved; GPU: unresolved; fan: unresolved; freshness: unresolved."
                );
                println!(
                    "Cleanup: not-applicable (no mapping, view or synchronization resource acquired)."
                );
                println!(
                    "Obtain and review the publisher's interface contract before implementing access or parsing."
                );
                3
            } else {
                println!(
                    "Status: unsupported-platform; Windows x86_64 required; access: not-attempted."
                );
                4
            }
        }
        _ => {
            eprintln!(
                "Invalid arguments. Use exactly --help, --check-access or --read-once. No access attempted."
            );
            2
        }
    };
    ExitCode::from(code)
}
