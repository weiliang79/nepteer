//! Microsoft-generated bindings, SDK checked in Windows CI; no hand-written ABI.
use crate::*;
use std::{io::Write, mem::size_of};
use windows::{
    core::w,
    Wdk::Graphics::Direct3D::*,
    Win32::{
        Foundation::{CloseHandle, HANDLE, LUID, WAIT_ABANDONED, WAIT_OBJECT_0},
        Graphics::Dxgi::{
            CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE, DXGI_ERROR_NOT_FOUND,
        },
        System::Threading::{CreateMutexW, ReleaseMutex, WaitForSingleObject},
    },
};

struct Invocation(HANDLE);
impl Invocation {
    fn acquire() -> Result<Self, Failure> {
        // SAFETY: fixed local-session name; default security, no inherited handle. Never wait.
        let handle =
            unsafe { CreateMutexW(None, false, w!("Local\\NepteerStep6B2GpuTemperatureProbe")) }
                .map_err(|e| hresult(e.code().0))?;
        // SAFETY: newly acquired valid kernel handle, zero timeout.
        let wait = unsafe { WaitForSingleObject(handle, 0) };
        if wait == WAIT_OBJECT_0 {
            return Ok(Self(handle));
        }
        // An abandoned mutex is acquired by the waiter, but authorizes no new experiment.
        // SAFETY: only release if the documented wait result granted ownership; close once.
        unsafe {
            if wait == WAIT_ABANDONED {
                let _ = ReleaseMutex(handle);
            }
            let _ = CloseHandle(handle);
        }
        Err(Category::AlreadyRunningOrAbandoned.into())
    }
}
impl Drop for Invocation {
    fn drop(&mut self) {
        // SAFETY: this thread owns the mutex; all synchronous calls returned before this drop.
        unsafe {
            let _ = ReleaseMutex(self.0);
            let _ = CloseHandle(self.0);
        }
    }
}

#[derive(Default)]
struct NativeApi {
    luids: Vec<LUID>,
}
impl Api for NativeApi {
    fn enumerate(&mut self) -> Result<Vec<Adapter>, Failure> {
        // SAFETY: documented DXGI factory interface. Generated COM wrappers Release on drop.
        let factory: IDXGIFactory1 =
            unsafe { CreateDXGIFactory1() }.map_err(|e| hresult(e.code().0))?;
        let mut adapters = Vec::new();
        // One extra bounded enumeration determines truncation; never select an incomplete set.
        for index in 0..=MAX_ADAPTERS {
            // SAFETY: valid factory; generated wrapper owns the returned COM reference.
            let adapter = match unsafe { factory.EnumAdapters1(index as u32) } {
                Ok(adapter) => adapter,
                Err(e) if e.code() == DXGI_ERROR_NOT_FOUND => return Ok(adapters),
                Err(e) => return Err(hresult(e.code().0)),
            };
            if index == MAX_ADAPTERS {
                return Err(Category::Ambiguous.into());
            }
            // SAFETY: valid adapter; binding initializes the fixed-size description output.
            let desc = unsafe { adapter.GetDesc1() }.map_err(|e| hresult(e.code().0))?;
            // Never print/store descriptions, IDs or LUIDs. Reject duplicate logical identities.
            if self.luids.iter().any(|luid| {
                luid.LowPart == desc.AdapterLuid.LowPart
                    && luid.HighPart == desc.AdapterLuid.HighPart
            }) {
                return Err(Category::Ambiguous.into());
            }
            self.luids.push(desc.AdapterLuid);
            adapters.push(Adapter {
                token: index,
                amd: desc.VendorId == 0x1002,
                software: desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 != 0,
            });
        }
        Err(Category::Ambiguous.into())
    }
    fn open(&mut self, token: usize) -> Result<u32, Failure> {
        let luid = *self.luids.get(token).ok_or(Category::AdapterUnavailable)?;
        let mut args = D3DKMT_OPENADAPTERFROMLUID {
            AdapterLuid: luid,
            hAdapter: 0,
        };
        // SAFETY: aligned initialized SDK binding, LUID from this invocation's DXGI enumeration.
        ntstatus(unsafe { D3DKMTOpenAdapterFromLuid(&mut args) }.0)?;
        Ok(args.hAdapter)
    }
    fn validate(&mut self, handle: u32) -> Result<(), Failure> {
        let mut kind = D3DKMT_ADAPTERTYPE::default();
        query(handle, KMTQAITYPE_ADAPTERTYPE, &mut kind)?;
        let mut count = D3DKMT_PHYSICAL_ADAPTER_COUNT::default();
        query(handle, KMTQAITYPE_PHYSICALADAPTERCOUNT, &mut count)?;
        // SAFETY: Value is the documented UINT view of the initialized union after query success.
        validate_adapter(unsafe { kind.Anonymous.Value }, count.Count)
    }
    fn temperature(&mut self, handle: u32) -> Result<RawDeciCelsius, Failure> {
        // Metadata proved exactly one physical adapter: index 0 is now unambiguous, not guessed.
        let mut data = D3DKMT_ADAPTER_PERFDATA {
            PhysicalAdapterIndex: 0,
            ..Default::default()
        };
        query(handle, KMTQAITYPE_ADAPTERPERFDATA, &mut data)?;
        // All other performance fields remain private and unread; never export the struct.
        Ok(temperature_field(&data))
    }
    fn close(&mut self, handle: u32) -> Result<(), Failure> {
        // SAFETY: exclusively owned D3DKMT handle; called once, after synchronous queries return.
        ntstatus(unsafe { D3DKMTCloseAdapter(&D3DKMT_CLOSEADAPTER { hAdapter: handle }) }.0)
    }
}

fn temperature_field(data: &D3DKMT_ADAPTER_PERFDATA) -> RawDeciCelsius {
    RawDeciCelsius(data.Temperature)
}

// Private helper: only called with the three SDK structures/types above.
fn query<T>(handle: u32, kind: KMTQUERYADAPTERINFOTYPE, data: &mut T) -> Result<(), Failure> {
    let mut args = D3DKMT_QUERYADAPTERINFO {
        hAdapter: handle,
        Type: kind,
        pPrivateDriverData: (data as *mut T).cast(),
        PrivateDriverDataSize: size_of::<T>() as u32,
    };
    // SAFETY: matching SDK query type/initialized output structure, valid owned handle; synchronous
    // lifetime covers the call. This call has NO documented caller-controlled timeout.
    ntstatus(unsafe { D3DKMTQueryAdapterInfo(&mut args) }.0)
}

pub fn execute() {
    let _invocation = match Invocation::acquire() {
        Ok(guard) => guard,
        Err(failure) => {
            let report = Report {
                stage: "admission",
                selected: false,
                result: Err(failure),
                query_elapsed: None,
                cleanup: None,
            };
            println!(
                "{}No query attempted. Stop further experiments.",
                render(&report)
            );
            std::process::exit(2);
        }
    };
    println!("One synchronous attempt starting. No hard timeout or safe cancellation.\nIf any call stalls, do not start another invocation; stop further experiments.\nAttribution and freshness remain unresolved even after API success.");
    // Ensure warning is visible before any potentially blocking display-stack work.
    if std::io::stdout().flush().is_err() {
        return;
    }
    let start = Instant::now();
    let report = run_once(NativeApi::default());
    println!(
        "{}Total completed attempt elapsed: {:.3} ms",
        render(&report),
        start.elapsed().as_secs_f64() * 1000.0
    );
    // Fixed exit convention: 0 candidate/inconclusive; 2 no candidate or cleanup failure.
    if report.result.is_err() || matches!(report.cleanup, Some(Err(_))) {
        // Drop admission guard normally before exit; adapter cleanup has already returned.
        drop(_invocation);
        std::process::exit(2);
    }
}

#[cfg(test)]
mod abi {
    use super::*;
    use std::mem::{align_of, offset_of};
    #[test]
    fn only_temperature_field_is_consumed() {
        let data = D3DKMT_ADAPTER_PERFDATA {
            Temperature: 543,
            FanRPM: u32::MAX,
            Power: u32::MAX,
            MemoryFrequency: u64::MAX,
            ..Default::default()
        };
        assert_eq!(
            candidate(temperature_field(&data)),
            Ok(CandidateCelsius(54.3))
        );
        let data = D3DKMT_ADAPTER_PERFDATA {
            Temperature: 0,
            FanRPM: 543,
            ..data
        };
        assert!(candidate(temperature_field(&data)).is_err());
    }
    #[test]
    fn local_session_admission_rejects_overlap_without_any_display_calls() {
        let first = Invocation::acquire().unwrap();
        assert!(std::thread::spawn(|| Invocation::acquire().is_err())
            .join()
            .unwrap());
        drop(first);
        assert!(std::thread::spawn(|| Invocation::acquire().is_ok())
            .join()
            .unwrap());
    }
    #[test]
    fn sdk_x64_layouts_and_query_constants() {
        // Same assertions compile against installed d3dkmthk.h in abi-check.cpp (no API calls).
        assert_eq!(
            (
                size_of::<D3DKMT_ADAPTER_PERFDATA>(),
                align_of::<D3DKMT_ADAPTER_PERFDATA>()
            ),
            (64, 8)
        );
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, PhysicalAdapterIndex), 0);
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, MemoryFrequency), 8);
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, MaxMemoryFrequency), 16);
        assert_eq!(
            offset_of!(D3DKMT_ADAPTER_PERFDATA, MaxMemoryFrequencyOC),
            24
        );
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, MemoryBandwidth), 32);
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, PCIEBandwidth), 40);
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, FanRPM), 48);
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, Power), 52);
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, Temperature), 56);
        assert_eq!(offset_of!(D3DKMT_ADAPTER_PERFDATA, PowerStateOverride), 60);
        assert_eq!(
            (
                size_of::<D3DKMT_QUERYADAPTERINFO>(),
                align_of::<D3DKMT_QUERYADAPTERINFO>()
            ),
            (24, 8)
        );
        assert_eq!(offset_of!(D3DKMT_QUERYADAPTERINFO, hAdapter), 0);
        assert_eq!(offset_of!(D3DKMT_QUERYADAPTERINFO, Type), 4);
        assert_eq!(offset_of!(D3DKMT_QUERYADAPTERINFO, pPrivateDriverData), 8);
        assert_eq!(
            offset_of!(D3DKMT_QUERYADAPTERINFO, PrivateDriverDataSize),
            16
        );
        assert_eq!(
            (
                size_of::<D3DKMT_OPENADAPTERFROMLUID>(),
                align_of::<D3DKMT_OPENADAPTERFROMLUID>()
            ),
            (12, 4)
        );
        assert_eq!(offset_of!(D3DKMT_OPENADAPTERFROMLUID, AdapterLuid), 0);
        assert_eq!(offset_of!(D3DKMT_OPENADAPTERFROMLUID, hAdapter), 8);
        assert_eq!(
            (
                size_of::<D3DKMT_CLOSEADAPTER>(),
                align_of::<D3DKMT_CLOSEADAPTER>()
            ),
            (4, 4)
        );
        assert_eq!(offset_of!(D3DKMT_CLOSEADAPTER, hAdapter), 0);
        assert_eq!(
            (
                size_of::<D3DKMT_ADAPTERTYPE>(),
                align_of::<D3DKMT_ADAPTERTYPE>()
            ),
            (4, 4)
        );
        assert_eq!(
            (
                size_of::<D3DKMT_PHYSICAL_ADAPTER_COUNT>(),
                align_of::<D3DKMT_PHYSICAL_ADAPTER_COUNT>()
            ),
            (4, 4)
        );
        assert_eq!(offset_of!(D3DKMT_PHYSICAL_ADAPTER_COUNT, Count), 0);
        assert_eq!(KMTQAITYPE_ADAPTERPERFDATA.0, 62);
        assert_eq!(KMTQAITYPE_ADAPTERTYPE.0, 15);
        assert_eq!(KMTQAITYPE_PHYSICALADAPTERCOUNT.0, 30);
        // Compile-time binding signatures, without calling them.
        let _: unsafe fn(*mut D3DKMT_QUERYADAPTERINFO) -> windows::Win32::Foundation::NTSTATUS =
            D3DKMTQueryAdapterInfo;
        let _: unsafe fn(*mut D3DKMT_OPENADAPTERFROMLUID) -> windows::Win32::Foundation::NTSTATUS =
            D3DKMTOpenAdapterFromLuid;
        let _: unsafe fn(*const D3DKMT_CLOSEADAPTER) -> windows::Win32::Foundation::NTSTATUS =
            D3DKMTCloseAdapter;
    }
}
