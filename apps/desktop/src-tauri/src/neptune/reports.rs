use super::*;
/// Length validation is not format verification. No byte offsets are interpreted.
pub(super) fn inspect(length: usize, descriptor_length: usize) -> Result<(), InputFailure> {
    if length == 0 || length > descriptor_length || length > MAX_REPORT {
        Err(InputFailure::new(
            InputErrorKind::UnsupportedReportFormat,
            "Invalid input report length; monitoring stopped without interpreting bytes.",
        ))
    } else {
        Ok(())
    }
}
pub(super) fn unavailable_controls() -> Vec<ControlObservation> {
    use ControllerControl::*;
    [
        Steam,
        QuickAccess,
        A,
        B,
        X,
        Y,
        DpadUp,
        DpadDown,
        DpadLeft,
        DpadRight,
        L1,
        R1,
        L2,
        R2,
        L4,
        L5,
        R4,
        R5,
        LeftStickClick,
        RightStickClick,
        LeftTrackpadTouch,
        RightTrackpadTouch,
        LeftTrackpadClick,
        RightTrackpadClick,
    ]
    .into_iter()
    .map(|control| ControlObservation {
        control,
        pressed: None,
    })
    .collect()
}
