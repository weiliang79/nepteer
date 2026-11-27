//! Subprocess tests exercise the actual CLI without HWiNFO, Windows APIs or fixtures
//! pretending to implement an unverified ABI.
use std::ffi::OsStr;
use std::process::{Command, Output};

fn run(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_hwinfo-shared-memory-probe"))
        .args(args)
        .output()
        .expect("run diagnostic")
}

#[test]
fn help_discloses_blocked_modes() {
    let output = run(&["--help"]);
    assert!(output.status.success());
    let text = String::from_utf8(output.stdout).unwrap();
    assert!(text.contains("perform NO shared-memory access"));
    assert!(text.contains("--check-access"));
    assert!(text.contains("--read-once"));
}

#[test]
fn no_default_execution() {
    assert_eq!(run(&[]).status.code(), Some(2));
}

#[test]
fn access_is_not_misreported_as_missing_or_denied() {
    for mode in ["--check-access", "--read-once"] {
        let output = run(&[mode]);
        let expected = if cfg!(all(windows, target_arch = "x86_64")) {
            3
        } else {
            4
        };
        assert_eq!(output.status.code(), Some(expected));
        let text = String::from_utf8(output.stdout).unwrap();
        assert!(text.contains("not-attempted"));
        assert!(!text.contains("successful read"));
        assert!(!text.contains("access-denied"));
        if expected == 3 {
            assert!(text.contains("interface-blocked"));
            assert!(text.contains("freshness: unresolved"));
            assert!(text.contains("no mapping, view or synchronization resource acquired"));
        }
    }
}

#[test]
fn ambiguous_or_extra_arguments_never_execute() {
    for args in [
        vec!["--read-once", "--check-access"],
        vec!["--help", "extra"],
        vec!["--run-once"],
        vec!["--read-once", "--elevated"],
    ] {
        assert_eq!(run(&args).status.code(), Some(2));
    }
}

#[test]
fn private_arguments_are_not_echoed() {
    let output = run(&["private-computer-serial-example"]);
    assert_eq!(output.status.code(), Some(2));
    assert!(
        !String::from_utf8(output.stderr)
            .unwrap()
            .contains("private-computer")
    );
}

#[test]
fn non_unicode_arguments_fail_without_panicking_or_echoing() {
    // OS-native non-Unicode argument construction on both supported test hosts.
    #[cfg(unix)]
    let private_arg = {
        use std::os::unix::ffi::OsStrExt;
        OsStr::from_bytes(b"private-\xff").to_os_string()
    };
    #[cfg(windows)]
    let private_arg = {
        use std::os::windows::ffi::OsStringExt;
        std::ffi::OsString::from_wide(&[0xd800])
    };
    let output = Command::new(env!("CARGO_BIN_EXE_hwinfo-shared-memory-probe"))
        .arg(OsStr::new(&private_arg))
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty());
}
