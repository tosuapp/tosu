pub mod memory_reader;
pub mod macros;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "windows")]
pub mod error;
