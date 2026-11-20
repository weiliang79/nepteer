mod focus;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Emitter, Manager, Runtime};
use ts_rs::TS;

pub const LABEL: &str = "quick-access";
pub const EVENT: &str = "quick-access-changed";
#[cfg(target_os = "macos")]
pub const SHORTCUT_HINT: &str = "Control + Option + Q";
#[cfg(not(target_os = "macos"))]
pub const SHORTCUT_HINT: &str = "Ctrl + Alt + Q";

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub visible: bool,
    pub shortcut_available: bool,
    pub shortcut_hint: String,
    pub notice: Option<String>,
}

#[derive(Clone, Copy)]
pub enum Action {
    Show,
    Hide,
    Toggle,
    Query,
    Blur,
    Focus,
    Layout,
}

/// Native visibility is always queried. Only focus context and startup diagnostics are retained.
#[derive(Default)]
pub struct Coordinator {
    previous: Option<isize>,
    focus_established: bool,
    shortcut_available: bool,
    notice: Option<String>,
}
pub type State = Mutex<Coordinator>;

trait Backend {
    fn exists(&self) -> bool;
    fn visible(&self) -> Result<bool, String>;
    fn focused(&self) -> Result<bool, String>;
    fn create(&mut self) -> Result<(), String>;
    fn place(&self) -> Result<(), String>;
    fn show(&self) -> Result<(), String>;
    fn hide(&self) -> Result<(), String>;
    fn focus(&self) -> Result<(), String>;
    fn capture(&self) -> Option<isize>;
    fn restore(&self, previous: Option<isize>);
}

impl Coordinator {
    fn registration_result(&mut self, success: bool) {
        self.shortcut_available = success;
        if !success {
            self.notice = Some(format!(
                "{SHORTCUT_HINT} could not be registered. Use Open Quick Access."
            ));
        }
    }
    fn status(&mut self, backend: &impl Backend) -> Result<Status, String> {
        let visible = backend.visible()?;
        if !visible {
            self.previous = None;
            self.focus_established = false;
        }
        Ok(Status {
            visible,
            shortcut_available: self.shortcut_available,
            shortcut_hint: SHORTCUT_HINT.into(),
            notice: self.notice.clone(),
        })
    }
    fn apply(&mut self, action: Action, backend: &mut impl Backend) -> Result<Status, String> {
        let visible = backend.visible()?;
        match action {
            Action::Show if !visible => self.show(backend)?,
            Action::Toggle if !visible => self.show(backend)?,
            Action::Hide | Action::Toggle => self.hide(backend, true)?,
            Action::Blur if visible && self.focus_established && !backend.focused()? => {
                self.hide(backend, false)?
            }
            Action::Focus if visible && backend.focused()? => self.focus_established = true,
            Action::Layout if visible => backend.place()?,
            _ => (),
        }
        self.status(backend)
    }
    fn show(&mut self, backend: &mut impl Backend) -> Result<(), String> {
        self.previous = backend.capture();
        self.focus_established = false;
        if !backend.exists() {
            backend.create()?;
        }
        backend.place()?;
        backend.show()?;
        if backend.focus().is_err() {
            self.notice = Some("Panel opened, but the OS did not grant keyboard focus. Tap the panel or use Close.".into());
        }
        self.focus_established = backend.focused()?;
        if !self.focus_established {
            self.notice = Some(
                "Panel opened, but keyboard focus was not granted. Tap the panel or use Close."
                    .into(),
            );
        } else if self.shortcut_available {
            self.notice = None;
        }
        Ok(())
    }
    fn hide(&mut self, backend: &impl Backend, restore: bool) -> Result<(), String> {
        if backend.visible()? {
            let return_focus = restore && backend.focused()?;
            backend.hide()?;
            if return_focus {
                backend.restore(self.previous.take());
            }
        }
        self.previous = None;
        self.focus_established = false;
        Ok(())
    }
}

#[derive(Debug, PartialEq)]
struct Bounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}
fn bounds(x: i32, y: i32, width: u32, height: u32, scale: f64) -> Result<Bounds, String> {
    if width == 0 || height == 0 || !scale.is_finite() || scale <= 0.0 {
        return Err("Display geometry is unavailable.".into());
    }
    let margin = ((12.0 * scale).round() as u32)
        .min(width / 4)
        .min(height / 4);
    let panel_width = ((400.0 * scale).round() as u32)
        .min(width - 2 * margin)
        .max(1);
    let panel_height = ((760.0 * scale).round() as u32)
        .min(height - 2 * margin)
        .max(1);
    Ok(Bounds {
        x: (i64::from(x) + i64::from(width - margin - panel_width))
            .clamp(i32::MIN.into(), i32::MAX.into()) as i32,
        y: (i64::from(y) + i64::from(margin)).clamp(i32::MIN.into(), i32::MAX.into()) as i32,
        width: panel_width,
        height: panel_height,
    })
}

fn local_navigation(url: &tauri::Url, development: Option<&tauri::Url>) -> bool {
    let bundled = (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (url.scheme() == "http"
            && url.host_str() == Some("tauri.localhost")
            && url.port().is_none());
    let vite = development.is_some_and(|dev| url.origin() == dev.origin());
    (bundled || vite) && matches!(url.path(), "/" | "/index.html")
}

struct Native<'a, R: Runtime> {
    app: &'a tauri::AppHandle<R>,
}
impl<R: Runtime> Native<'_, R> {
    fn window(&self) -> Result<tauri::WebviewWindow<R>, String> {
        self.app
            .get_webview_window(LABEL)
            .ok_or_else(|| "Quick Access window is unavailable.".into())
    }
}
impl<R: Runtime> Backend for Native<'_, R> {
    fn exists(&self) -> bool {
        self.app.get_webview_window(LABEL).is_some()
    }
    fn visible(&self) -> Result<bool, String> {
        self.app
            .get_webview_window(LABEL)
            .map(|w| w.is_visible().map_err(|e| e.to_string()))
            .unwrap_or(Ok(false))
    }
    fn focused(&self) -> Result<bool, String> {
        self.window()?.is_focused().map_err(|e| e.to_string())
    }
    fn create(&mut self) -> Result<(), String> {
        let development = if tauri::is_dev() {
            self.app.config().build.dev_url.clone()
        } else {
            None
        };
        tauri::WebviewWindowBuilder::new(
            self.app,
            LABEL,
            tauri::WebviewUrl::App("index.html?qam".into()),
        )
        .on_navigation(move |url| local_navigation(url, development.as_ref()))
        .title("Nepteer · Quick Access")
        .inner_size(400.0, 720.0)
        .visible(false)
        .focused(false)
        .decorations(false)
        .resizable(false)
        .minimizable(false)
        .maximizable(false)
        .skip_taskbar(true)
        .background_color(tauri::webview::Color(25, 33, 31, 255))
        .build()
        .map_err(|e| e.to_string())?;
        Ok(())
    }
    fn place(&self) -> Result<(), String> {
        let window = self.window()?;
        let current = if window.is_visible().map_err(|e| e.to_string())? {
            window.current_monitor().map_err(|e| e.to_string())?
        } else {
            #[cfg(windows)]
            let foreground = focus::center();
            #[cfg(not(windows))]
            let foreground: Option<(f64, f64)> = None;
            let point = foreground.or_else(|| self.app.cursor_position().ok().map(|p| (p.x, p.y)));
            point.and_then(|(x, y)| self.app.monitor_from_point(x, y).ok().flatten())
        };
        let monitor = current
            .or_else(|| self.app.primary_monitor().ok().flatten())
            .ok_or("No display is available for Quick Access.")?;
        let area = monitor.work_area();
        let target = bounds(
            area.position.x,
            area.position.y,
            area.size.width,
            area.size.height,
            monitor.scale_factor(),
        )?;
        let size = tauri::PhysicalSize::new(target.width, target.height);
        let position = tauri::PhysicalPosition::new(target.x, target.y);
        // Comparing avoids resize/move event feedback loops during display reflow.
        if window.inner_size().map_err(|e| e.to_string())? != size {
            window.set_size(size).map_err(|e| e.to_string())?;
        }
        if window.outer_position().map_err(|e| e.to_string())? != position {
            window.set_position(position).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    fn show(&self) -> Result<(), String> {
        let window = self.window()?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())
    }
    fn hide(&self) -> Result<(), String> {
        let window = self.window()?;
        window.hide().map_err(|e| e.to_string())?;
        let _ = window.set_always_on_top(false);
        Ok(())
    }
    fn focus(&self) -> Result<(), String> {
        self.window()?.set_focus().map_err(|e| e.to_string())
    }
    fn capture(&self) -> Option<isize> {
        #[cfg(windows)]
        {
            focus::capture(
                self.app
                    .get_webview_window(LABEL)
                    .and_then(|w| w.hwnd().ok())
                    .map(|h| h.0 as isize),
            )
        }
        #[cfg(not(windows))]
        {
            None
        }
    }
    fn restore(&self, previous: Option<isize>) {
        #[cfg(windows)]
        if let Some(previous) = previous {
            focus::restore(previous);
        }
        #[cfg(not(windows))]
        {
            let _ = previous;
            if let Some(main) = self.app.get_webview_window("main") {
                let _ = main.set_focus();
            }
        }
    }
}

pub fn initialize<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    Native { app }.create()
}

pub fn perform<R: Runtime>(app: &tauri::AppHandle<R>, action: Action) -> Result<Status, String> {
    let state = app.state::<State>();
    let mut coordinator = state
        .lock()
        .map_err(|_| "Quick Access coordinator is unavailable.")?;
    let before = Native { app }.visible()?;
    let result = coordinator.apply(action, &mut Native { app });
    if let Ok(status) = &result {
        if status.visible != before {
            let _ = app.emit_to(LABEL, EVENT, status);
        }
    } else if let Err(error) = &result {
        coordinator.notice = Some(error.clone());
    }
    result
}

pub fn queue<R: Runtime>(app: &tauri::AppHandle<R>, action: Action) {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _ = perform(&app, action);
    });
}

pub fn close_behavior(label: &str) -> &'static str {
    if label == LABEL {
        "hide"
    } else if label == "main" {
        "exit"
    } else {
        "default"
    }
}

pub fn events<R: Runtime>(window: &tauri::Window<R>, event: &tauri::WindowEvent) {
    match event {
        tauri::WindowEvent::CloseRequested { api, .. }
            if close_behavior(window.label()) == "hide" =>
        {
            api.prevent_close();
            queue(window.app_handle(), Action::Hide);
        }
        tauri::WindowEvent::CloseRequested { .. } if close_behavior(window.label()) == "exit" => {
            window.app_handle().exit(0)
        }
        tauri::WindowEvent::Focused(false) if window.label() == LABEL => {
            queue(window.app_handle(), Action::Blur)
        }
        tauri::WindowEvent::Focused(true) if window.label() == LABEL => {
            queue(window.app_handle(), Action::Focus)
        }
        tauri::WindowEvent::Resized(_)
        | tauri::WindowEvent::Moved(_)
        | tauri::WindowEvent::ScaleFactorChanged { .. }
            if window.label() == LABEL =>
        {
            queue(window.app_handle(), Action::Layout)
        }
        _ => (),
    }
}

pub fn initialization_failed<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Ok(mut state) = app.state::<State>().lock() {
        state.notice =
            Some("Quick Access could not initialize. Use Open Quick Access to retry.".into());
    }
}

pub fn shortcut_result<R: Runtime>(app: &tauri::AppHandle<R>, result: Result<(), String>) {
    if let Ok(mut state) = app.state::<State>().lock() {
        state.registration_result(result.is_ok());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;
    #[derive(Default)]
    struct Fake {
        exists: bool,
        visible: Cell<bool>,
        focused: Cell<bool>,
        creates: usize,
        restores: Cell<usize>,
        fail_focus: bool,
        fail_create: bool,
        previous_alive: bool,
    }
    impl Backend for Fake {
        fn exists(&self) -> bool {
            self.exists
        }
        fn visible(&self) -> Result<bool, String> {
            Ok(self.exists && self.visible.get())
        }
        fn focused(&self) -> Result<bool, String> {
            Ok(self.focused.get())
        }
        fn create(&mut self) -> Result<(), String> {
            if self.fail_create {
                return Err("creation failed".into());
            }
            self.exists = true;
            self.creates += 1;
            Ok(())
        }
        fn place(&self) -> Result<(), String> {
            Ok(())
        }
        fn show(&self) -> Result<(), String> {
            self.visible.set(true);
            Ok(())
        }
        fn hide(&self) -> Result<(), String> {
            self.visible.set(false);
            Ok(())
        }
        fn focus(&self) -> Result<(), String> {
            if self.fail_focus {
                Err("denied".into())
            } else {
                self.focused.set(true);
                Ok(())
            }
        }
        fn capture(&self) -> Option<isize> {
            Some(12)
        }
        fn restore(&self, _: Option<isize>) {
            if self.previous_alive {
                self.restores.set(self.restores.get() + 1);
            }
        }
    }
    #[test]
    fn hidden_initial_idempotent_and_repeated_toggles() {
        let mut state = Coordinator::default();
        let mut window = Fake::default();
        assert!(!state.apply(Action::Query, &mut window).unwrap().visible);
        state.apply(Action::Hide, &mut window).unwrap();
        assert_eq!(window.creates, 0);
        state.apply(Action::Show, &mut window).unwrap();
        state.apply(Action::Show, &mut window).unwrap();
        assert_eq!(window.creates, 1);
        for _ in 0..20 {
            state.apply(Action::Toggle, &mut window).unwrap();
        }
        assert!(window.visible.get());
        assert_eq!(window.creates, 1);
        state.apply(Action::Hide, &mut window).unwrap();
        state.apply(Action::Hide, &mut window).unwrap();
        assert!(!window.visible.get());
    }
    #[test]
    fn destruction_external_hiding_and_recreation_use_actual_visibility() {
        let mut state = Coordinator::default();
        let mut window = Fake::default();
        state.apply(Action::Show, &mut window).unwrap();
        window.exists = false;
        assert!(!state.apply(Action::Query, &mut window).unwrap().visible);
        state.apply(Action::Show, &mut window).unwrap();
        assert_eq!(window.creates, 2);
        window.visible.set(false);
        assert!(!state.apply(Action::Query, &mut window).unwrap().visible);
        state.apply(Action::Toggle, &mut window).unwrap();
        assert!(window.visible.get());
    }
    #[test]
    fn activation_blur_denial_and_explicit_focus_return() {
        let mut state = Coordinator::default();
        let mut window = Fake {
            previous_alive: true,
            ..Default::default()
        };
        state.apply(Action::Show, &mut window).unwrap();
        state.apply(Action::Blur, &mut window).unwrap();
        assert!(window.visible.get()); // stale blur
        state.apply(Action::Hide, &mut window).unwrap();
        assert_eq!(window.restores.get(), 1);
        state.apply(Action::Show, &mut window).unwrap();
        window.focused.set(false);
        state.apply(Action::Blur, &mut window).unwrap();
        assert!(!window.visible.get());
        assert_eq!(window.restores.get(), 1); // outside click does not steal focus
        window.fail_focus = true;
        state.apply(Action::Show, &mut window).unwrap();
        state.apply(Action::Blur, &mut window).unwrap();
        assert!(window.visible.get());
        assert!(state.notice.is_some());
        window.previous_alive = false;
        state.apply(Action::Hide, &mut window).unwrap();
        assert_eq!(window.restores.get(), 1);
    }
    #[test]
    fn shortcut_failure_and_creation_failure_keep_fallback_recoverable() {
        let mut state = Coordinator::default();
        let mut window = Fake {
            fail_create: true,
            ..Default::default()
        };
        state.registration_result(false);
        assert!(!state.status(&window).unwrap().shortcut_available);
        assert!(state
            .notice
            .as_deref()
            .unwrap()
            .contains("Use Open Quick Access"));
        assert!(state.apply(Action::Show, &mut window).is_err());
        assert!(!state.apply(Action::Query, &mut window).unwrap().visible);
        window.fail_create = false;
        assert!(state.apply(Action::Show, &mut window).unwrap().visible);
        state.registration_result(true);
        assert!(state.status(&window).unwrap().shortcut_available);
    }
    #[test]
    fn qam_navigation_stays_on_the_local_entry_page() {
        let dev = tauri::Url::parse("http://127.0.0.1:1420").unwrap();
        for url in [
            "tauri://localhost/index.html?qam",
            "http://tauri.localhost/?qam",
            "http://127.0.0.1:1420/index.html?qam",
        ] {
            assert!(local_navigation(
                &tauri::Url::parse(url).unwrap(),
                Some(&dev)
            ));
        }
        for url in [
            "https://example.com/",
            "http://tauri.localhost.evil/",
            "http://127.0.0.1:9999/",
            "data:text/html,remote",
            "http://tauri.localhost/other.html",
        ] {
            assert!(!local_navigation(
                &tauri::Url::parse(url).unwrap(),
                Some(&dev)
            ));
        }
        assert!(!local_navigation(&dev, None));
    }
    #[test]
    fn close_policy_and_geometry_are_bounded() {
        assert_eq!(close_behavior(LABEL), "hide");
        assert_eq!(close_behavior("main"), "exit");
        assert_eq!(
            bounds(0, 0, 1280, 800, 1.0).unwrap(),
            Bounds {
                x: 868,
                y: 12,
                width: 400,
                height: 760
            }
        );
        let panel = bounds(-1920, 0, 1920, 1200, 1.5).unwrap();
        assert_eq!(panel.width, 600);
        assert!(panel.x < 0);
        let small = bounds(0, 0, 320, 240, 2.0).unwrap();
        assert!(small.width <= 320 && small.height <= 240);
        assert!(bounds(0, 0, 0, 800, 1.0).is_err());
        assert!(bounds(0, 0, 1280, 800, f64::NAN).is_err());
    }
}
