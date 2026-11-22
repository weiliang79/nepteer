fn main() {
    let mut attributes =
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "get_telemetry",
            "show_quick_access",
            "hide_quick_access",
            "toggle_quick_access",
            "quick_access_status",
            "qam_navigation_claim",
            "qam_navigation_complete",
            "neptune_list",
            "neptune_rescan",
            "neptune_start",
            "neptune_stop",
            "neptune_status",
            "neptune_probe_start",
            "neptune_probe_status",
            "neptune_probe_abort",
            "neptune_shortcut_arm",
            "neptune_shortcut_disarm",
            "neptune_shortcut_status",
        ]));

    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc")
    {
        // Tauri's default resource embeds Common Controls v6 only in app binaries.
        // Tests also need it to load: https://github.com/tauri-apps/tauri/issues/13419
        // Use one linker manifest for app, library and test targets, avoiding duplicates.
        attributes = attributes
            .windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest());
        let manifest =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("windows-app-manifest.xml");
        println!("cargo:rerun-if-changed={}", manifest.display());
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTINPUT:{}", manifest.display());
    }

    tauri_build::try_build(attributes).expect("failed to build Tauri application");
}
