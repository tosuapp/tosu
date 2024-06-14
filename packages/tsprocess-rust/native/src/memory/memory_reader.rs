use neon::prelude::Finalize;
use paste::paste;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HANDLE;

use crate::read_primitive_impl;
use crate::memory::error::MemoryReaderError;

#[derive(Debug)]
pub struct MemoryRegion {
  pub address: usize,
  pub size: usize,
}

#[cfg(target_os = "windows")]
pub type ProcessId = u32;

#[cfg(target_os = "linux")]
pub type ProcessId = i32;

pub type Address = i32;

#[derive(Debug)]
pub struct OsuMemoryReader {
  #[cfg(target_os = "windows")]
  pub handle: HANDLE,
  pub process_id: ProcessId,
  pub regions: Vec<MemoryRegion>
}

impl Finalize for OsuMemoryReader {}

pub trait MemoryReader {
  fn is_process_exists(process_id: ProcessId) -> Result<bool, MemoryReaderError>;

  fn find_processes(process_name: String) -> Result<Vec<ProcessId>, MemoryReaderError>;

  fn read_regions(process_id: ProcessId) -> Result<Vec<MemoryRegion>, MemoryReaderError>;

  fn find_signature(&self, signature: String) -> Result<Address, MemoryReaderError>;

  fn read(&self, address: Address, len: usize) -> Result<Vec<u8>, MemoryReaderError>;

  fn read_pointer(&self, address: Address) -> Result<Address, MemoryReaderError>;

  fn read_string(
    &self,
    address: Address,
  ) -> Result<String, MemoryReaderError> {
    let mut address = address;
    let len = self.read_u32(address + 0x4)? as usize;
    address += 0x8;

    let data = match self.read(address, len * 2) {
      Ok(data) => data,
      Err(_) => return Err(MemoryReaderError::StringReadFailed(address)),
    };

    let data: Vec<u16> = data.chunks_exact(2)
        .into_iter()
        .map(|a| u16::from_ne_bytes([a[0], a[1]]))
        .collect();

    Ok(String::from_utf16_lossy(data.as_slice()))
  }

  fn scan(data: &[u8], signature: String) -> Option<usize> {
    let sig_items = signature.split(" ").collect::<Vec<&str>>();
    let offset = data
        .windows(sig_items.len())
        .enumerate()
        .find_map(|(i, window)| {
          for (j, sig_item) in sig_items.iter().enumerate() {
            if *sig_item == "??" {
              continue;
            }

            let sig_byte = u8::from_str_radix(sig_item, 16).ok()?;

            if sig_byte != window[j] && sig_byte != 0 {
              return None;
            }
          }

          Some(i)
        });

    offset
  }

  read_primitive_impl!(i8);
  read_primitive_impl!(i16);
  read_primitive_impl!(i32);
  read_primitive_impl!(i64);

  read_primitive_impl!(u8);
  read_primitive_impl!(u16);
  read_primitive_impl!(u32);
  read_primitive_impl!(u64);

  read_primitive_impl!(f32);
  read_primitive_impl!(f64);
}
