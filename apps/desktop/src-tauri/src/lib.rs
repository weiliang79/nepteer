pub mod neptune;
pub mod quick_access;
pub mod telemetry;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
struct SessionMode(Mutex<ProviderMode>);
use telemetry::{provider_for, ProviderMode, Snapshot};

#[tauri::command]
async fn get_telemetry<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    mode: Option<ProviderMode>,
) -> Result<Snapshot, String> {
    if mode.is_some() && window.label() != "main" {
        return Err("Only the dashboard may select the telemetry provider.".into());
    }
    let selected = {
        let state = app.state::<SessionMode>();
        let mut selected = state
            .0
            .lock()
            .map_err(|_| "Provider session is unavailable.")?;
        if let Some(mode) = mode {
            if *selected != mode {
                *selected = mode;
                let _ = app.emit_to(quick_access::LABEL, "provider-changed", ());
            }
        }
        *selected
    };
    tauri::async_runtime::spawn_blocking(move || provider_for(selected).snapshot())
        .await
        .map_err(|_| "Telemetry worker failed; try refreshing.".to_string())?
}

async fn qam_operation<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    action: quick_access::Action,
) -> Result<quick_access::Status, String> {
    tauri::async_runtime::spawn_blocking(move || quick_access::perform(&app, action))
        .await
        .map_err(|_| "Quick Access worker failed.".to_string())?
}
#[tauri::command]
async fn show_quick_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<quick_access::Status, String> {
    qam_operation(app, quick_access::Action::Show).await
}
#[tauri::command]
async fn hide_quick_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<quick_access::Status, String> {
    qam_operation(app, quick_access::Action::Hide).await
}
#[tauri::command]
async fn toggle_quick_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<quick_access::Status, String> {
    qam_operation(app, quick_access::Action::Toggle).await
}
#[tauri::command]
async fn quick_access_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<quick_access::Status, String> {
    qam_operation(app, quick_access::Action::Query).await
}

#[tauri::command]
async fn qam_navigation_claim<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    request: neptune::navigation::NavigationRequest,
) -> Result<Option<neptune::navigation::NavigationClaim>, String> {
    if window.label() != quick_access::LABEL {
        return Err("Only local Quick Access may claim navigation.".into());
    }
    tauri::async_runtime::spawn_blocking(move || quick_access::claim_navigation(&app, &request))
        .await
        .map_err(|_| "Navigation unavailable".to_string())?
}
#[tauri::command]
async fn qam_navigation_complete<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    request: neptune::navigation::NavigationRequest,
    hide: bool,
) -> Result<(), String> {
    if window.label() != quick_access::LABEL {
        return Err("Only local Quick Access may complete navigation.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        quick_access::complete_navigation(&app, &request, hide)
    })
    .await
    .map_err(|_| "Navigation completion unavailable".to_string())?
}

fn ensure_diagnostics_window<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> Result<(), String> {
    if window.label() == "main" {
        Ok(())
    } else {
        Err("Controller diagnostics are available only in the main dashboard.".into())
    }
}
#[tauri::command]
async fn neptune_list<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
) -> Result<neptune::DiagnosticsSnapshot, String> {
    ensure_diagnostics_window(&window)?;
    app.state::<neptune::Diagnostics>().snapshot()
}
#[tauri::command]
async fn neptune_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
) -> Result<neptune::DiagnosticsSnapshot, String> {
    ensure_diagnostics_window(&window)?;
    app.state::<neptune::Diagnostics>().snapshot()
}
#[tauri::command]
async fn neptune_rescan<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    mode: neptune::DiagnosticsMode,
) -> Result<neptune::DiagnosticsSnapshot, String> {
    ensure_diagnostics_window(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        let result = app.state::<neptune::Diagnostics>().rescan(mode);
        if let Ok(data) = &result {
            let _ = app.emit_to("main", neptune::EVENT, data);
        }
        result
    })
    .await
    .map_err(|_| "Discovery worker failed.".to_string())?
}
#[tauri::command]
async fn neptune_start<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    candidate_id: String,
) -> Result<neptune::DiagnosticsSnapshot, String> {
    ensure_diagnostics_window(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        let events = app.clone();
        app.state::<neptune::Diagnostics>().start(
            &candidate_id,
            std::sync::Arc::new(move |data| {
                let _ = events.emit_to("main", neptune::EVENT, data);
            }),
        )
    })
    .await
    .map_err(|_| "Monitor startup worker failed.".to_string())?
}
#[tauri::command]
async fn neptune_stop<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
) -> Result<neptune::DiagnosticsSnapshot, String> {
    ensure_diagnostics_window(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        let result = app.state::<neptune::Diagnostics>().stop();
        if let Ok(data) = &result {
            let _ = app.emit_to("main", neptune::EVENT, data);
        }
        result
    })
    .await
    .map_err(|_| "Monitor stop worker failed.".to_string())?
}
#[tauri::command]
async fn neptune_probe_start<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    request: neptune::correlation::ProbeStartRequest,
) -> Result<neptune::correlation::ProbeStatus, String> {
    ensure_diagnostics_window(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        let result = app.state::<neptune::Diagnostics>().probe_start(request);
        if result.is_ok() {
            if let Ok(data) = app.state::<neptune::Diagnostics>().snapshot() {
                let _ = app.emit_to("main", neptune::EVENT, data);
            }
        }
        result
    })
    .await
    .map_err(|_| "Probe startup failed.".to_string())?
}
#[tauri::command]
async fn neptune_probe_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
) -> Result<neptune::correlation::ProbeStatus, String> {
    ensure_diagnostics_window(&window)?;
    app.state::<neptune::Diagnostics>().probe_status()
}
#[tauri::command]
async fn neptune_probe_abort<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    token: u32,
) -> Result<neptune::correlation::ProbeStatus, String> {
    ensure_diagnostics_window(&window)?;
    let result = app.state::<neptune::Diagnostics>().probe_abort(token);
    if result.is_ok() {
        if let Ok(data) = app.state::<neptune::Diagnostics>().snapshot() {
            let _ = app.emit_to("main", neptune::EVENT, data);
        }
    }
    result
}
#[tauri::command]
async fn neptune_shortcut_arm<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    request: neptune::shortcut::ShortcutArmRequest,
) -> Result<neptune::shortcut::ShortcutStatus, String> {
    ensure_diagnostics_window(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<neptune::Diagnostics>()
            .shortcut_arm(app.clone(), request)
    })
    .await
    .map_err(|_| "Shortcut arming failed.".to_string())?
}
#[tauri::command]
async fn neptune_shortcut_disarm<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    generation: u32,
) -> Result<neptune::shortcut::ShortcutStatus, String> {
    ensure_diagnostics_window(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        let result = app
            .state::<neptune::Diagnostics>()
            .shortcut_disarm(generation);
        if let Ok(status) = &result {
            let _ = app.emit_to("main", neptune::shortcut::EVENT, status);
        }
        result
    })
    .await
    .map_err(|_| "Shortcut disarming failed.".to_string())?
}
#[tauri::command]
async fn neptune_shortcut_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
) -> Result<neptune::shortcut::ShortcutStatus, String> {
    ensure_diagnostics_window(&window)?;
    app.state::<neptune::Diagnostics>().shortcut_status()
}
pub fn request_exit<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let state = app.state::<neptune::Diagnostics>();
    if state.shutdown_complete() {
        app.exit(0);
    } else if state.claim_shutdown() {
        let app = app.clone();
        tauri::async_runtime::spawn_blocking(move || {
            app.state::<neptune::Diagnostics>().shutdown();
            app.exit(0);
        });
    }
}

fn configure<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .manage(SessionMode(Mutex::new(ProviderMode::Auto)))
        .manage(quick_access::State::default())
        .manage(neptune::Diagnostics::default())
        .invoke_handler(tauri::generate_handler![
            get_telemetry,
            show_quick_access,
            hide_quick_access,
            toggle_quick_access,
            quick_access_status,
            neptune_list,
            neptune_rescan,
            neptune_start,
            neptune_stop,
            neptune_status,
            neptune_probe_start,
            neptune_probe_status,
            neptune_probe_abort,
            neptune_shortcut_arm,
            neptune_shortcut_disarm,
            neptune_shortcut_status,
            qam_navigation_claim,
            qam_navigation_complete
        ])
}

fn context<R: tauri::Runtime>() -> tauri::Context<R> {
    tauri::generate_context!()
}

pub fn run() {
    use tauri_plugin_global_shortcut::{
        Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
    };
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyQ);
    let app = configure(tauri::Builder::default())
        .setup(move |app| {
            // Failure to create the initial hidden panel is recoverable through the dashboard.
            if quick_access::initialize(app.handle()).is_err() {
                quick_access::initialization_failed(app.handle());
            }
            let result = app
                .handle()
                .plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, pressed, event| {
                            if pressed == &shortcut && event.state() == ShortcutState::Pressed {
                                quick_access::queue(app, quick_access::Action::Toggle);
                            }
                        })
                        .build(),
                )
                .map_err(|e| e.to_string())
                .and_then(|_| {
                    app.global_shortcut()
                        .register(shortcut)
                        .map_err(|e| e.to_string())
                });
            quick_access::shortcut_result(app.handle(), result);
            Ok(())
        })
        .on_window_event(quick_access::events)
        .build(context())
        .expect("Nepteer could not start");
    app.run(|app, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = &event {
            if !app.state::<neptune::Diagnostics>().shutdown_complete() {
                api.prevent_exit();
                request_exit(app);
            }
        }
        if matches!(event, tauri::RunEvent::Exit) {
            if let Some(shortcuts) =
                app.try_state::<tauri_plugin_global_shortcut::GlobalShortcut<tauri::Wry>>()
            {
                let _ = shortcuts.unregister_all();
            }
        }
    });
}

#[cfg(test)]
mod tests {
    #[test]
    fn ipc_returns_mock_and_restricts_other_windows() {
        let app = super::configure(tauri::test::mock_builder())
            .build(super::context())
            .unwrap();
        let main = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();
        let other = tauri::WebviewWindowBuilder::new(&app, "other", Default::default())
            .build()
            .unwrap();
        let request = || tauri::webview::InvokeRequest {
            cmd: "get_telemetry".into(),
            callback: tauri::ipc::CallbackFn(0),
            error: tauri::ipc::CallbackFn(1),
            url: app.config().build.dev_url.clone().unwrap(),
            body: tauri::ipc::InvokeBody::Json(serde_json::json!({ "mode": "mock" })),
            headers: Default::default(),
            invoke_key: tauri::test::INVOKE_KEY.to_string(),
        };
        let response = tauri::test::get_ipc_response(&main, request())
            .unwrap()
            .deserialize::<serde_json::Value>()
            .unwrap();
        assert_eq!(response["source"], "mock");
        assert_eq!(response["batteryPercent"], 78);
        assert!(response["gpuTemperatureCelsius"].is_null());
        assert!(tauri::test::get_ipc_response(&other, request()).is_err());
        let qam = tauri::WebviewWindowBuilder::new(&app, "quick-access", Default::default())
            .visible(false)
            .build()
            .unwrap();
        let mut read = request();
        read.body = tauri::ipc::InvokeBody::Json(serde_json::json!({}));
        let response = tauri::test::get_ipc_response(&qam, read)
            .unwrap()
            .deserialize::<serde_json::Value>()
            .unwrap();
        assert_eq!(response["source"], "mock"); // same explicit main session selection
        assert!(tauri::test::get_ipc_response(&qam, request()).is_err()); // cannot select a provider
        let mut show = request();
        show.cmd = "show_quick_access".into();
        assert!(tauri::test::get_ipc_response(&qam, show).is_err());
        let mut query = request();
        query.cmd = "quick_access_status".into();
        assert!(tauri::test::get_ipc_response(&qam, query).is_ok());
        for command in [
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
        ] {
            let body = if command == "neptune_shortcut_arm" {
                serde_json::json!({"request":{"candidateId":"scan1-candidate1","expectedGeneration":0,"consent":true,"reviewedConfiguration":true}})
            } else {
                serde_json::json!({"mode":"simulated","candidateId":"scan1-candidate1","token":0,"generation":0,"request":{"expectedToken":0,"monitorGeneration":0,"candidateId":"scan1-candidate1","control":"a","consent":false,"environment":{"steamDeckToolsRunning":"unknown","steamDeckToolsMode":"unknown","steamRunning":"unknown","steamInput":"unknown"}}})
            };
            let mut diagnostic = request();
            diagnostic.cmd = command.into();
            diagnostic.body = tauri::ipc::InvokeBody::Json(body.clone());
            assert!(tauri::test::get_ipc_response(&qam, diagnostic).is_err());
            let mut forbidden = request();
            forbidden.cmd = command.into();
            forbidden.body = tauri::ipc::InvokeBody::Json(body.clone());
            assert!(tauri::test::get_ipc_response(&other, forbidden).is_err());
            let mut remote = request();
            remote.cmd = command.into();
            remote.url = "https://example.com".parse().unwrap();
            remote.body = tauri::ipc::InvokeBody::Json(body.clone());
            assert!(tauri::test::get_ipc_response(&main, remote).is_err());
        }
        let mut shortcut_query = request();
        shortcut_query.cmd = "neptune_shortcut_status".into();
        let status = tauri::test::get_ipc_response(&main, shortcut_query)
            .unwrap()
            .deserialize::<serde_json::Value>()
            .unwrap();
        assert_eq!(status["phase"], "disarmed");
        assert_eq!(status["opened"], false);
        assert_eq!(status["readerOwner"], "none");
        let mut probe_query = request();
        probe_query.cmd = "neptune_probe_status".into();
        let result = tauri::test::get_ipc_response(&main, probe_query)
            .unwrap()
            .deserialize::<serde_json::Value>()
            .unwrap();
        assert_eq!(result["outcome"], "not_started");
        let mut cached = request();
        cached.cmd = "neptune_list".into();
        let result = tauri::test::get_ipc_response(&main, cached)
            .unwrap()
            .deserialize::<serde_json::Value>()
            .unwrap();
        assert_eq!(result["discovery"], "not_scanned");
        assert_eq!(result["monitor"]["phase"], "stopped");
        let mut remote_request = request();
        remote_request.url = "https://example.com".parse().unwrap();
        assert!(tauri::test::get_ipc_response(&main, remote_request).is_err());
    }
    #[test]
    fn only_local_qam_may_claim_or_complete_abstract_navigation() {
        let app = super::configure(tauri::test::mock_builder())
            .build(super::context())
            .unwrap();
        let main = tauri::WebviewWindowBuilder::new(
            &app,
            "main",
            tauri::WebviewUrl::App("index.html".into()),
        )
        .build()
        .unwrap();
        let qam = tauri::WebviewWindowBuilder::new(
            &app,
            "quick-access",
            tauri::WebviewUrl::App("index.html?qam".into()),
        )
        .build()
        .unwrap();
        let other = tauri::WebviewWindowBuilder::new(&app, "other", Default::default())
            .build()
            .unwrap();
        for cmd in ["qam_navigation_claim", "qam_navigation_complete"] {
            let request = || tauri::webview::InvokeRequest {
                cmd: cmd.into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: app.config().build.dev_url.clone().unwrap(),
                body: tauri::ipc::InvokeBody::Json(
                    serde_json::json!({"request":{"generation":0,"epoch":0,"sequence":0},"hide":false}),
                ),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            };
            assert!(tauri::test::get_ipc_response(&main, request()).is_err());
            assert!(tauri::test::get_ipc_response(&other, request()).is_err());
            assert!(tauri::test::get_ipc_response(&qam, request()).is_ok());
            let mut remote = request();
            remote.url = "https://example.com".parse().unwrap();
            assert!(tauri::test::get_ipc_response(&qam, remote).is_err());
        }
    }
}
