//! Native Windows metadata and shared GENERIC_READ input. No report/configuration writes.
use super::*;
use std::{
    mem::size_of,
    ptr::{null, null_mut},
};
use windows_sys::{
    core::GUID,
    Win32::{
        Devices::{DeviceAndDriverInstallation::*, HumanInterfaceDevice::*},
        Foundation::*,
        Storage::FileSystem::*,
        System::{Threading::*, IO::*},
    },
};
struct Handle(HANDLE);
impl Drop for Handle {
    fn drop(&mut self) {
        if !self.0.is_null() && self.0 != INVALID_HANDLE_VALUE {
            // SAFETY: sole owner of this native handle, closed once after I/O is drained.
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
}
struct DeviceSet(HDEVINFO);
impl Drop for DeviceSet {
    fn drop(&mut self) {
        // SAFETY: valid SetupAPI enumeration set, owned by this scope.
        unsafe {
            SetupDiDestroyDeviceInfoList(self.0);
        }
    }
}
struct Preparsed(PHIDP_PREPARSED_DATA);
impl Drop for Preparsed {
    fn drop(&mut self) {
        // SAFETY: pointer returned by HidD_GetPreparsedData and freed exactly once.
        unsafe {
            HidD_FreePreparsedData(self.0);
        }
    }
}
fn failure(code: u32, enumeration: bool) -> InputFailure {
    let kind = match code {
        ERROR_ACCESS_DENIED => InputErrorKind::AccessDenied,
        ERROR_SHARING_VIOLATION | ERROR_BUSY | ERROR_LOCK_VIOLATION => InputErrorKind::DeviceBusy,
        ERROR_DEVICE_NOT_CONNECTED
        | ERROR_NO_SUCH_DEVICE
        | ERROR_FILE_NOT_FOUND
        | ERROR_INVALID_HANDLE
        | ERROR_GEN_FAILURE => InputErrorKind::Disconnected,
        _ if enumeration => InputErrorKind::Enumeration,
        _ => InputErrorKind::ReadError,
    };
    // Never format OS error objects or paths: only a numeric code and fixed explanation.
    InputFailure{kind,message:format!("Windows HID {} failed (error {code}). No exclusive access or write fallback was attempted.",if enumeration{"discovery"}else{"read access"})}
}
fn open_path(path: &[u16], access: u32) -> Result<Handle, InputFailure> {
    // SAFETY: session-private NUL-terminated path from SetupAPI, no inheritable handle.
    // OPEN_EXISTING, shared READ|WRITE access; access is either zero metadata or GENERIC_READ.
    let handle = unsafe {
        CreateFileW(
            path.as_ptr(),
            access,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            null(),
            OPEN_EXISTING,
            FILE_FLAG_OVERLAPPED,
            null_mut(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Err(failure(unsafe { GetLastError() }, false));
    }
    Ok(Handle(handle))
}
fn attributes(handle: &Handle) -> Option<HIDD_ATTRIBUTES> {
    let mut value = HIDD_ATTRIBUTES {
        Size: size_of::<HIDD_ATTRIBUTES>() as u32,
        ..Default::default()
    };
    // SAFETY: valid query handle and initialized output structure; no feature request.
    unsafe { HidD_GetAttributes(handle.0, &mut value) }.then_some(value)
}
fn caps(handle: &Handle) -> Option<HIDP_CAPS> {
    let mut ptr = 0;
    // SAFETY: valid handle and writable descriptor pointer. This queries cached HID metadata.
    if !unsafe { HidD_GetPreparsedData(handle.0, &mut ptr) } {
        return None;
    }
    let preparsed = Preparsed(ptr);
    let mut value = HIDP_CAPS::default();
    // SAFETY: owned preparsed data and valid writable caps structure.
    (unsafe { HidP_GetCaps(preparsed.0, &mut value) } == HIDP_STATUS_SUCCESS).then_some(value)
}
fn description(handle: &Handle, manufacturer: bool) -> Option<String> {
    let mut chars = [0u16; 128];
    // SAFETY: owned output buffer, byte size matches its capacity. Only non-unique strings.
    let success = unsafe {
        if manufacturer {
            HidD_GetManufacturerString(handle.0, chars.as_mut_ptr().cast(), 256)
        } else {
            HidD_GetProductString(handle.0, chars.as_mut_ptr().cast(), 256)
        }
    };
    if !success {
        return None;
    }
    let length = chars.iter().position(|c| *c == 0).unwrap_or(chars.len());
    let text = String::from_utf16_lossy(&chars[..length]);
    let safe: String = text.chars().filter(|c| !c.is_control()).take(80).collect();
    let safe = safe.trim();
    if safe.is_empty() || safe.contains('\\') || safe.contains('{') {
        None
    } else {
        Some(safe.into())
    }
}
fn interface_number(path: &[u16]) -> Option<u8> {
    let value = String::from_utf16_lossy(path).to_ascii_lowercase();
    let suffix = value.split("&mi_").nth(1)?;
    let digits = suffix.get(..2)?;
    u8::from_str_radix(digits, 16).ok()
}
fn path_candidate(path: &[u16]) -> bool {
    // Conservative USB path prefilter prevents even metadata opens on arbitrary keyboards.
    // HID attributes below must independently confirm the VID/PID before read eligibility.
    let value = String::from_utf16_lossy(path).to_ascii_lowercase();
    value.contains("vid_28de&pid_1205&") || value.contains("vid_28de&pid_1205#")
}
pub(super) fn discover() -> Result<Vec<PrivateCandidate>, InputFailure> {
    let mut guid = GUID::default();
    // SAFETY: valid writable GUID; Windows supplies the HID interface class.
    unsafe {
        HidD_GetHidGuid(&mut guid);
    }
    // SAFETY: enum present HID interfaces only, no device configuration mutation.
    let raw = unsafe {
        SetupDiGetClassDevsW(
            &guid,
            null(),
            null_mut(),
            DIGCF_PRESENT | DIGCF_DEVICEINTERFACE,
        )
    };
    if raw == -1 {
        return Err(failure(unsafe { GetLastError() }, true));
    }
    let set = DeviceSet(raw);
    let mut result = Vec::new();
    for index in 0..1024 {
        let mut interface = SP_DEVICE_INTERFACE_DATA {
            cbSize: size_of::<SP_DEVICE_INTERFACE_DATA>() as u32,
            ..Default::default()
        };
        // SAFETY: valid enum set/class and writable interface structure.
        if unsafe { SetupDiEnumDeviceInterfaces(set.0, null(), &guid, index, &mut interface) } == 0
        {
            let code = unsafe { GetLastError() };
            return if code == ERROR_NO_MORE_ITEMS {
                Ok(result)
            } else {
                Err(failure(code, true))
            };
        }
        let mut needed = 0;
        // SAFETY: documented size probe, no path or serial is returned in this call.
        unsafe {
            SetupDiGetDeviceInterfaceDetailW(
                set.0,
                &interface,
                null_mut(),
                0,
                &mut needed,
                null_mut(),
            );
        }
        if !(6..=65536).contains(&needed) {
            return Err(InputFailure::new(
                InputErrorKind::Enumeration,
                "Windows returned an unsupported HID detail size.",
            ));
        }
        // u64 storage gives the detail structure sufficient alignment on x86_64/arm64.
        let mut storage = vec![0u64; (needed as usize).div_ceil(8)];
        let detail = storage
            .as_mut_ptr()
            .cast::<SP_DEVICE_INTERFACE_DETAIL_DATA_W>();
        // SAFETY: aligned allocation is at least needed bytes; correct ABI cbSize and bounded path.
        let path = unsafe {
            (*detail).cbSize = size_of::<SP_DEVICE_INTERFACE_DETAIL_DATA_W>() as u32;
            if SetupDiGetDeviceInterfaceDetailW(
                set.0,
                &interface,
                detail,
                needed,
                null_mut(),
                null_mut(),
            ) == 0
            {
                return Err(failure(GetLastError(), true));
            }
            let length = (needed as usize
                - std::mem::offset_of!(SP_DEVICE_INTERFACE_DETAIL_DATA_W, DevicePath))
                / 2;
            let chars = std::slice::from_raw_parts((*detail).DevicePath.as_ptr(), length);
            let end = chars.iter().position(|c| *c == 0).ok_or_else(|| {
                InputFailure::new(
                    InputErrorKind::Enumeration,
                    "Windows returned an unterminated HID interface path.",
                )
            })?;
            chars[..=end].to_vec()
        };
        if !path_candidate(&path) {
            continue;
        }
        if result.len() >= 64 {
            return Err(InputFailure::new(
                InputErrorKind::Enumeration,
                "Candidate limit reached. No monitoring was started.",
            ));
        }
        let mut public = Candidate {
            id: String::new(),
            vendor_id: 0x28de,
            product_id: 0x1205,
            usage_page: None,
            usage: None,
            interface_number: interface_number(&path),
            manufacturer: None,
            product: None,
            attributes_verified: false,
            input_report_length: None,
            capabilities: InputCapabilities {
                passive_read_eligible: false,
                button_decoding: false,
            },
            issue: None,
        };
        match open_path(&path, 0) {
            Ok(handle) => {
                if let Some(ids) = attributes(&handle) {
                    if !candidate_ids(ids.VendorID, ids.ProductID) {
                        continue;
                    }
                    public.attributes_verified = true;
                    public.manufacturer = description(&handle, true);
                    public.product = description(&handle, false);
                    if let Some(value) = caps(&handle) {
                        public.usage_page = Some(value.UsagePage);
                        public.usage = Some(value.Usage);
                        public.input_report_length = Some(value.InputReportByteLength);
                    }
                    public.capabilities.passive_read_eligible = read_eligible(
                        true,
                        public.usage_page,
                        public.usage,
                        public.input_report_length,
                    );
                }
                if !public.capabilities.passive_read_eligible {
                    public.issue=Some(InputFailure::new(InputErrorKind::UnsupportedInterface,"Discovery-only: only confirmed vendor-defined input collections can be read. Mouse, keyboard and missing metadata are excluded."));
                }
            }
            Err(issue) => public.issue = Some(issue),
        }
        result.push(PrivateCandidate {
            public,
            path,
            mode: DiagnosticsMode::Native,
        });
    }
    Err(InputFailure::new(
        InputErrorKind::Enumeration,
        "HID enumeration limit reached. No monitoring was started.",
    ))
}

struct Reader {
    device: Handle,
    event: Handle,
    overlapped: Box<OVERLAPPED>,
    buffer: Vec<u8>,
    pending: bool,
}
impl Reader {
    fn drain(&mut self) {
        if self.pending {
            // SAFETY: device/OVERLAPPED/buffer stay alive until cancellation completion.
            // CancelIoEx is cancellation only, never a HID output/configuration operation.
            unsafe {
                CancelIoEx(self.device.0, &*self.overlapped);
                let mut count = 0;
                GetOverlappedResult(self.device.0, &*self.overlapped, &mut count, 1);
            }
            self.pending = false;
        }
    }
}
impl Drop for Reader {
    fn drop(&mut self) {
        self.drain();
        self.buffer.fill(0);
    }
}
impl InputReader for Reader {
    fn read(&mut self, output: &mut [u8], timeout_ms: u32) -> Result<Option<usize>, InputFailure> {
        if !self.pending {
            // SAFETY: event and stable boxed OVERLAPPED/storage belong to this reader. No
            // buffer moves/reallocation occur while Windows may access the pending request.
            unsafe {
                ResetEvent(self.event.0);
            }
            *self.overlapped = OVERLAPPED {
                hEvent: self.event.0,
                ..Default::default()
            };
            let ok = unsafe {
                ReadFile(
                    self.device.0,
                    self.buffer.as_mut_ptr(),
                    self.buffer.len() as u32,
                    null_mut(),
                    &mut *self.overlapped,
                )
            };
            if ok == 0 {
                let code = unsafe { GetLastError() };
                if code != ERROR_IO_PENDING {
                    return Err(failure(code, false));
                }
            }
            self.pending = true;
        }
        // SAFETY: event is alive and timeout is clamped. Only one outstanding read exists.
        let wait = unsafe { WaitForSingleObject(self.event.0, timeout_ms.min(100)) };
        if wait == WAIT_TIMEOUT {
            return Ok(None);
        }
        if wait != WAIT_OBJECT_0 {
            let issue = failure(unsafe { GetLastError() }, false);
            self.drain();
            return Err(issue);
        }
        let mut count = 0;
        // SAFETY: signaled event indicates completion; storage remains valid until result.
        let ok = unsafe { GetOverlappedResult(self.device.0, &*self.overlapped, &mut count, 0) };
        if ok == 0 {
            let issue = failure(unsafe { GetLastError() }, false);
            self.drain();
            return Err(issue);
        }
        self.pending = false;
        let count = count as usize;
        if count == 0 {
            return Err(InputFailure::new(InputErrorKind::Disconnected,"The input interface stopped returning reports. Rescan manually after checking the device."));
        }
        if count > self.buffer.len() || count > output.len() {
            return Err(InputFailure::new(
                InputErrorKind::UnsupportedReportFormat,
                "Windows returned an invalid input report length.",
            ));
        }
        output[..count].copy_from_slice(&self.buffer[..count]);
        self.buffer.fill(0); // I/O is complete; retain no packet after handing it to the observer.
        Ok(Some(count))
    }
}
pub(super) fn open(candidate: &PrivateCandidate) -> Result<Box<dyn InputReader>, InputFailure> {
    // No write access, exclusive fallback, configuration/feature report or buffer tuning.
    let device = open_path(&candidate.path, GENERIC_READ)?;
    let ids = attributes(&device).ok_or_else(|| {
        InputFailure::new(
            InputErrorKind::MetadataUnavailable,
            "Could not revalidate candidate attributes. Rescan before retrying.",
        )
    })?;
    let value = caps(&device).ok_or_else(|| {
        InputFailure::new(
            InputErrorKind::MetadataUnavailable,
            "Could not revalidate input metadata. Rescan before retrying.",
        )
    })?;
    if !candidate_ids(ids.VendorID, ids.ProductID)
        || !read_eligible(
            true,
            Some(value.UsagePage),
            Some(value.Usage),
            Some(value.InputReportByteLength),
        )
        || Some(value.UsagePage) != candidate.public.usage_page
        || Some(value.Usage) != candidate.public.usage
        || Some(value.InputReportByteLength) != candidate.public.input_report_length
    {
        return Err(InputFailure::new(
            InputErrorKind::UnsupportedInterface,
            "Candidate metadata changed or is unsupported. Rescan before retrying.",
        ));
    }
    // SAFETY: unnamed, non-inheritable event with manual reset for a single overlapped read.
    let event = unsafe { CreateEventW(null(), 1, 0, null()) };
    if event.is_null() {
        return Err(failure(unsafe { GetLastError() }, false));
    }
    Ok(Box::new(Reader {
        device,
        event: Handle(event),
        overlapped: Box::new(OVERLAPPED::default()),
        buffer: vec![0; usize::from(value.InputReportByteLength)],
        pending: false,
    }))
}
