use std::fmt::{Display, Formatter};
use crate::memory::memory_reader::{Address, ProcessId};

#[derive(Debug)]
pub enum MemoryReaderError {
    FailedToCreate,
    FailedToCheckProcessExistence(ProcessId),
    ProcessNotFound(String),
    ReadRegionsFailed,
    SignatureNotFound(String),

    ReadFailed(Address),
    PointerReadFailed(Address),
    StringReadFailed(Address),
}

impl Display for MemoryReaderError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MemoryReaderError::FailedToCreate =>
                write!(f, "Failed to create memory reader"),
            MemoryReaderError::FailedToCheckProcessExistence(process_id) =>
                write!(f, "Failed to check process ({}) existence", process_id),
            MemoryReaderError::ProcessNotFound(name) =>
                write!(f, "Cannot find process with name ({})", name),
            MemoryReaderError::ReadRegionsFailed =>
                write!(f, "An error was occurred during regions reading"),
            MemoryReaderError::SignatureNotFound(signature) =>
                write!(f, "Cannot find signature ({})", signature),
            MemoryReaderError::ReadFailed(address) =>
                write!(f, "Failed read memory at address ({})", address),
            MemoryReaderError::PointerReadFailed(address) =>
                write!(f, "Failed read pointer at address ({})", address),
            MemoryReaderError::StringReadFailed(address) =>
                write!(f, "Failed read string at address ({})", address),
        }
    }
}