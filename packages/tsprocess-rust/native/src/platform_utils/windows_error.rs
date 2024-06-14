use std::fmt::{Display, Formatter};
use windows::Win32::Foundation::WIN32_ERROR;

use crate::memory::memory_reader::ProcessId;

#[derive(Debug)]
pub enum PlatformUtilsError {
    CannotGetProcessHandle(ProcessId),

    CannotGetProcessPath(ProcessId),

    FailedToQueryProcess(ProcessId),
    FailedToReadPEB(WIN32_ERROR),
    FailedToReadProcessParams(WIN32_ERROR),
    FailedToReadCommandLine(WIN32_ERROR),
}

impl Display for PlatformUtilsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            PlatformUtilsError::CannotGetProcessHandle(process_id) =>
                write!(f, "Cannot get process by process id ({})", process_id),
            PlatformUtilsError::CannotGetProcessPath(process_id) =>
                write!(f, "Cannot get process path by process id ({})", process_id),
            PlatformUtilsError::FailedToQueryProcess(process_id) =>
                write!(f, "Failed to query process ({})", process_id),
            PlatformUtilsError::FailedToReadPEB(error) =>
                write!(f, "Failed to read PEB ({})", error.0),
            PlatformUtilsError::FailedToReadProcessParams(error) =>
                write!(f, "Failed to read process params ({})", error.0),
            PlatformUtilsError::FailedToReadCommandLine(error) =>
                write!(f, "Failed to read process command line ({})", error.0),
        }
    }
}
