//! Memory-only foreground identity. No titles, process inspection, logging or input synthesis.
#[cfg(windows)]
pub fn capture(overlay: Option<isize>) -> Option<isize> {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    // SAFETY: no arguments or borrowed pointers; the result is used as an opaque handle.
    let handle = unsafe { GetForegroundWindow() } as isize;
    (handle != 0 && Some(handle) != overlay).then_some(handle)
}

#[cfg(windows)]
pub fn center() -> Option<(f64, f64)> {
    use windows_sys::Win32::{Foundation::RECT, UI::WindowsAndMessaging::GetWindowRect};
    let handle = capture(None)?;
    let mut rect = RECT::default();
    // SAFETY: Windows validates the opaque handle; rect is valid writable storage.
    if unsafe { GetWindowRect(handle as _, &mut rect) } == 0 {
        return None;
    }
    Some((
        (f64::from(rect.left) + f64::from(rect.right)) / 2.0,
        (f64::from(rect.top) + f64::from(rect.bottom)) / 2.0,
    ))
}

#[cfg(windows)]
pub fn restore(previous: isize) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        IsWindow, IsWindowVisible, SetForegroundWindow,
    };
    let handle = previous as _;
    // SAFETY: handles are opaque, never dereferenced. Windows validates them. A disappeared
    // window is ignored. One activation request only; denial is respected, never bypassed.
    unsafe {
        if IsWindow(handle) != 0 && IsWindowVisible(handle) != 0 {
            let _ = SetForegroundWindow(handle);
        }
    }
}
