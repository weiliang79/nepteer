# Dependencies and licenses

The complete resolved dependency metadata is recorded in [LICENSE_INVENTORY.md](LICENSE_INVENTORY.md). This is a first metadata review, not a claim that the complete application is MIT-compatible or ready for public distribution. No project-wide license has been selected. Review platform-specific bundled code, full license texts and notices before distribution; in particular review Windows optional packages from the CI inventory. No Steam Deck Tools source or assets are included.

## Direct dependencies and purpose

| Dependency                                                                | Reason                                                   | Declared license   |
| ------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------ |
| React, react-dom                                                          | Dashboard, local navigation and settings                 | MIT                |
| @tauri-apps/api                                                           | Typed read-only invoke transport                         | MIT OR Apache-2.0  |
| class-variance-authority                                                  | shadcn Button variants                                   | Apache-2.0         |
| clsx, tailwind-merge                                                      | shadcn class composition                                 | MIT                |
| tauri                                                                     | Native window, webview and command transport             | MIT OR Apache-2.0  |
| tauri-build                                                               | Tauri config, command permissions, platform resources    | MIT OR Apache-2.0  |
| serde                                                                     | Rust JSON serialization                                  | MIT OR Apache-2.0  |
| ts-rs                                                                     | Generate TypeScript types from Rust DTOs                 | MIT                |
| serde_json                                                                | Rust serialization and IPC assertions in tests           | MIT OR Apache-2.0  |
| @tauri-apps/cli                                                           | Development, icons and native bundles                    | MIT OR Apache-2.0  |
| Vite, @vitejs/plugin-react                                                | Local frontend server and production compilation         | MIT                |
| Tailwind CSS, @tailwindcss/vite                                           | Styles and design tokens                                 | MIT                |
| TypeScript                                                                | Frontend type checking                                   | Apache-2.0         |
| @types/node, @types/react, @types/react-dom                               | Type declarations                                        | MIT                |
| ESLint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals | Static checks                                            | MIT                |
| Prettier                                                                  | Consistent formatting                                    | MIT                |
| Vitest                                                                    | Frontend test runner                                     | MIT                |
| jsdom                                                                     | Test-only DOM implementation                             | MIT                |
| @testing-library/react, jest-dom, user-event                              | Accessible UI behavior assertions                        | MIT                |
| pnpm                                                                      | Pinned workspace dependency manager                      | MIT                |
| shadcn/ui Button source                                                   | Small local accessible button; no Slot dependency needed | MIT (notice below) |

Rust's `tauri/test` feature is enabled only for development tests to verify actual command dispatch and permission boundaries using a mock runtime. The production feature set does not include it. Generated icons derive from the project-owned geometric SVG.

## Step 2 Windows dependencies

`windows-sys` 0.61.2 (MIT OR Apache-2.0) supplies official read-only `GetSystemPowerStatus` / `GetLastError` bindings. `wmi` 0.18.4 (MIT OR Apache-2.0) provides typed local COM/WMI query handling so the app avoids hand-written unsafe COM/VARIANT lifetime code. Its default chrono feature is disabled. The only additional locked transitive package is `futures` 0.3.34 (MIT OR Apache-2.0); its component crates and the `windows` bindings already existed in the Tauri graph. All are Windows-only dependencies and none adds a runtime service or subprocess. Version and declared-license metadata were reviewed from downloaded Cargo manifests and recorded in the inventory. No Steam Deck Tools source is used.

## Step 3 shortcut dependency

`tauri-plugin-global-shortcut` 2.4.1 and its `global-hotkey` 0.8.0 backend are Apache-2.0 OR MIT. The official plugin supplies platform registration/lifecycle without a frontend dependency or custom keyboard hook. Windows uses RegisterHotKey/UnregisterHotKey (including no-repeat); macOS uses Carbon hotkey registration. Added transitive declared licenses are recorded in LICENSE_INVENTORY.md, including MIT/Apache keyboard-types and Windows bindings, Apache-2.0 gethostname, and MIT/Apache/LLVM-exception/Zlib alternatives in Linux-only support. No copied source or SteamOS assets were introduced. Full distribution notices/platform review remain required; metadata review is not legal clearance.

## Transitive review and remaining obligations

The inventory contains MIT/Apache/BSD/ISC/Unlicense/0BSD/MIT-0/Zlib packages, Unicode-3.0 data, BlueOak-1.0.0 packages, CC-BY-4.0 `caniuse-lite` data, MPL-2.0 CSS tooling and Rust components, and Apache LLVM exceptions. Some Rust packages offer LGPL as an alternative to MIT/Apache; select and document permitted alternatives for the actual distribution rather than assuming all alternatives apply. Preserve conjunctive license requirements such as BSD AND MIT and Apache AND MIT. Slash-separated older metadata needs confirmation against upstream license texts.

In particular, confirm MPL file-level source/notice obligations for any shipped portions, CC-BY attribution for included data, Unicode notices, native WebView2/Windows SDK runtime terms and NSIS installer tooling notices. Many entries are build/test-only; determine what actually ships. The external system WebView2 runtime is required, not redistributed by this installer. The license commands generate inventories, not a compliance certification. CI records Windows and macOS package metadata for further review.

## shadcn/ui notice

The local Button is a simplified adaptation of [shadcn/ui](https://github.com/shadcn-ui/ui), using a native button without the optional polymorphic Slot API. Its utility class composition follows the same source-available component pattern. The upstream MIT notice is preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Step 4 native HID review

No new crate, frontend dependency, copied protocol implementation or native redistributable is added. Existing windows-sys 0.61.2 remains MIT OR Apache-2.0; newly enabled binding features cover SetupAPI, HID, file I/O, threading and security types. Windows supplies the linked OS DLLs. No hidapi/libusb DLL or replacement driver is packaged. Dependency license metadata is unchanged apart from the local Nepteer version. See NEPTUNE_RESEARCH.md for the investigated hidapi/SDL references; neither source is bundled or translated. No Neptune report parser is implemented. Existing distribution-notice review remains required; this is not a project-wide license compatibility certification.

## Step 5A protocol references

No dependency/package/license inventory changes are needed. The candidate parser and
transition model are original Nepteer code informed by factual published SDL/Valve
protocol information, with no copied driver or mechanically translated source.
The reviewed revision, exact facts, verification limits and Zlib provenance are in
NEPTUNE_RESEARCH.md; upstream notices are retained in THIRD_PARTY_NOTICES.md.
No SDL library or feature/configuration implementation is shipped. Steam Deck Tools
was not consulted or reused. This does not complete the broader distribution audit.
