use windows_gpu_temp_probe::LABEL;

fn main() {
    println!("{LABEL}");
    println!(
        "Probe version: {} / commit: {}",
        env!("CARGO_PKG_VERSION"),
        option_env!("NEPTEER_PROBE_COMMIT").unwrap_or("unrecorded local build")
    );
    println!("Query: D3DKMTQueryAdapterInfo / KMTQAITYPE_ADAPTERPERFDATA");
    if std::env::args().skip(1).collect::<Vec<_>>() != ["--run-once"] {
        println!("No hardware access. Review docs/experiments/step-6b2-d3dkmt-gpu-temperature.md first.\nWindows x86_64 only. Explicit --run-once admits one attempt after manual review.\nNo timeout/cancellation guarantee; if stalled, stop further experiments.");
        return;
    }
    #[cfg(all(windows, target_arch = "x86_64"))]
    windows_gpu_temp_probe::native::execute();
    #[cfg(not(all(windows, target_arch = "x86_64")))]
    {
        println!("Unsupported platform; no hardware access. Requires Windows x86_64.");
        std::process::exit(2);
    }
}
