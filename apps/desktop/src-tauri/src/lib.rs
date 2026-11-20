pub mod telemetry;
use telemetry::{provider_for, ProviderMode, Snapshot};

#[tauri::command]
async fn get_telemetry(mode: Option<ProviderMode>) -> Result<Snapshot, String> {
    tauri::async_runtime::spawn_blocking(move || provider_for(mode.unwrap_or_default()).snapshot())
        .await
        .map_err(|_| "Telemetry worker failed; try refreshing.".to_string())?
}

fn configure<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![get_telemetry])
}

fn context<R: tauri::Runtime>() -> tauri::Context<R> {
    tauri::generate_context!()
}

pub fn run() {
    configure(tauri::Builder::default())
        .run(context())
        .expect("Nepteer could not start");
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
        let mut remote_request = request();
        remote_request.url = "https://example.com".parse().unwrap();
        assert!(tauri::test::get_ipc_response(&main, remote_request).is_err());
    }
}
