// Compile only (/c): uses the installed official SDK, never links or calls a hardware API.
#include <windows.h>
#include <d3dkmthk.h>
#include <cstddef>
#include <type_traits>
#define LAYOUT(T, S, A) static_assert(sizeof(T) == S && alignof(T) == A)
#define OFFSET(T, F, O) static_assert(offsetof(T, F) == O)
static_assert(sizeof(void*) == 8);
LAYOUT(D3DKMT_ADAPTER_PERFDATA, 64, 8);
OFFSET(D3DKMT_ADAPTER_PERFDATA, PhysicalAdapterIndex, 0);
OFFSET(D3DKMT_ADAPTER_PERFDATA, MemoryFrequency, 8);
OFFSET(D3DKMT_ADAPTER_PERFDATA, MaxMemoryFrequency, 16);
OFFSET(D3DKMT_ADAPTER_PERFDATA, MaxMemoryFrequencyOC, 24);
OFFSET(D3DKMT_ADAPTER_PERFDATA, MemoryBandwidth, 32);
OFFSET(D3DKMT_ADAPTER_PERFDATA, PCIEBandwidth, 40);
OFFSET(D3DKMT_ADAPTER_PERFDATA, FanRPM, 48);
OFFSET(D3DKMT_ADAPTER_PERFDATA, Power, 52);
OFFSET(D3DKMT_ADAPTER_PERFDATA, Temperature, 56);
OFFSET(D3DKMT_ADAPTER_PERFDATA, PowerStateOverride, 60);
LAYOUT(D3DKMT_QUERYADAPTERINFO, 24, 8);
OFFSET(D3DKMT_QUERYADAPTERINFO, hAdapter, 0);
OFFSET(D3DKMT_QUERYADAPTERINFO, Type, 4);
OFFSET(D3DKMT_QUERYADAPTERINFO, pPrivateDriverData, 8);
OFFSET(D3DKMT_QUERYADAPTERINFO, PrivateDriverDataSize, 16);
LAYOUT(D3DKMT_OPENADAPTERFROMLUID, 12, 4);
OFFSET(D3DKMT_OPENADAPTERFROMLUID, AdapterLuid, 0);
OFFSET(D3DKMT_OPENADAPTERFROMLUID, hAdapter, 8);
LAYOUT(D3DKMT_CLOSEADAPTER, 4, 4);
OFFSET(D3DKMT_CLOSEADAPTER, hAdapter, 0);
LAYOUT(D3DKMT_ADAPTERTYPE, 4, 4);
LAYOUT(D3DKMT_PHYSICAL_ADAPTER_COUNT, 4, 4);
OFFSET(D3DKMT_PHYSICAL_ADAPTER_COUNT, Count, 0);
static_assert(KMTQAITYPE_ADAPTERPERFDATA == 62);
static_assert(KMTQAITYPE_ADAPTERTYPE == 15);
static_assert(KMTQAITYPE_PHYSICALADAPTERCOUNT == 30);
// Top-level pointer const does not affect ABI; SDK pointee const accepts our mutable outputs.
static_assert(std::is_same_v<decltype(&D3DKMTQueryAdapterInfo), NTSTATUS (APIENTRY*)(const D3DKMT_QUERYADAPTERINFO*)>);
static_assert(std::is_same_v<decltype(&D3DKMTOpenAdapterFromLuid), NTSTATUS (APIENTRY*)(const D3DKMT_OPENADAPTERFROMLUID*)>);
static_assert(std::is_same_v<decltype(&D3DKMTCloseAdapter), NTSTATUS (APIENTRY*)(const D3DKMT_CLOSEADAPTER*)>);
