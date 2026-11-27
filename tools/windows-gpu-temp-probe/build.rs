fn main() {
    println!("cargo:rerun-if-changed=probe.manifest");
    println!("cargo:rerun-if-env-changed=NEPTEER_PROBE_COMMIT");
    if std::env::var("TARGET").as_deref() == Ok("x86_64-pc-windows-msvc") {
        let manifest = std::path::PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap())
            .join("probe.manifest");
        println!("cargo:rustc-link-arg-bin=windows-gpu-temp-probe=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg-bin=windows-gpu-temp-probe=/MANIFESTINPUT:{}",
            manifest.display()
        );
    }
}
