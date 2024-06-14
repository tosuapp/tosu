use crate::memory::memory_reader::ProcessId;

#[cfg(target_os = "windows")]
use crate::platform_utils::windows_error::PlatformUtilsError;

pub struct PlatformUtils {}

pub trait PlatformUtilsMethods {
    fn get_process_path(process_id: ProcessId) -> Result<String, PlatformUtilsError>;

    fn get_process_command_line(process_id: ProcessId) -> Result<String, PlatformUtilsError>;
}