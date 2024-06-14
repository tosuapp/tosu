use std::ffi::{c_uint, c_void};
use std::mem;
use windows::Win32::{
  Foundation::{
    CloseHandle,
  },
  System::{
    Diagnostics::{
      Debug::ReadProcessMemory,
      ToolHelp::{
        CreateToolhelp32Snapshot,
        Process32First,
        Process32Next,
        PROCESSENTRY32,
        TH32CS_SNAPPROCESS,
      }
    },
    Memory::{
      VirtualQueryEx,
      MEMORY_BASIC_INFORMATION,
      MEM_FREE,
    }
  },
};
use windows::Win32::Foundation::GetLastError;

use crate::memory::{
  memory_reader::{ MemoryReader },
};
use crate::memory::memory_reader::{Address, MemoryRegion, OsuMemoryReader};
use crate::memory::error::MemoryReaderError;
use crate::platform_utils::utils::PlatformUtils;

impl OsuMemoryReader {
  pub fn new(process_id: u32) -> Result<Self, MemoryReaderError> {
    let handle = PlatformUtils::get_process_handle(process_id).unwrap();
    let regions = Self::read_regions(process_id)?;

    let reader = OsuMemoryReader {
      process_id,
      handle,
      regions,
    };

    Ok(reader)
  }
}

impl MemoryReader for OsuMemoryReader {
  fn is_process_exists(process_id: u32) -> Result<bool, MemoryReaderError> {
    let handle = match PlatformUtils::get_process_handle(process_id) {
      Ok(handle) => handle,
      Err(_) => return Ok(false),
    };

    let result = PlatformUtils::is_handle_exists(handle).unwrap();

    unsafe { CloseHandle(handle).unwrap() };

    Ok(result)
  }

  fn find_processes(name: String) -> Result<Vec<u32>, MemoryReaderError> {
    let snapshot = unsafe {
      CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    }.expect("Failed to create snapshot helper");

    let mut process_entry = PROCESSENTRY32::default();
    process_entry.dwSize = mem::size_of::<PROCESSENTRY32>() as u32;

    let mut processes: Vec<u32> = Vec::new();

    unsafe {
      if Process32First(snapshot, &mut process_entry).is_ok() {
        loop {
          let process_name_raw = process_entry
              .szExeFile.iter()
              .map(|&c| c as u8)
              .collect::<Vec<u8>>();

          let process_name = String::from_utf8(process_name_raw)
              .expect("Failed to parse platform_utils name from raw parts");

          if process_name.starts_with(&name) {
            processes.push(process_entry.th32ProcessID);
          }

          // clean exe name on each iteration
          process_entry.szExeFile = [0_i8; 260];

          if !Process32Next(snapshot, &mut process_entry).is_ok() {
            break;
          }
        }
      }

      CloseHandle(snapshot).unwrap();
    }

    Ok(processes)
  }

  fn read_regions(process_id: u32) -> Result<Vec<MemoryRegion>, MemoryReaderError> {
    let handle = PlatformUtils::get_process_handle(process_id).unwrap();

    let mut memory_info = MEMORY_BASIC_INFORMATION::default();
    let size_of_memory_info = mem::size_of::<MEMORY_BASIC_INFORMATION>();

    let mut regions: Vec<MemoryRegion> = Vec::new();
    let mut address = 0_usize;

    while unsafe { VirtualQueryEx(
      handle,
      Some(address as _),
      &mut memory_info,
      size_of_memory_info
    )} != 0 {
      address = (memory_info.BaseAddress as usize) + memory_info.RegionSize;

      if memory_info.State != MEM_FREE {
        let region = MemoryRegion {
          address: memory_info.BaseAddress as usize,
          size: memory_info.RegionSize,
        };

        regions.push(region);
      }
    }

    unsafe { CloseHandle(handle).unwrap() };

    Ok(regions)
  }

  fn find_signature(&self, signature: String) -> Result<Address, MemoryReaderError> {
    let mut buf = Vec::new();
    let mut bytes_read= 0_usize;

    for region in self.regions.iter() {
      buf.resize(region.size, 0);

      let result = unsafe {
        ReadProcessMemory(
          self.handle,
          region.address as c_uint as *mut c_void,
          buf.as_mut_ptr() as *mut c_void,
          region.size,
          Some(&mut bytes_read)
        )
      };

      if let Err(error) = result {
        if error.code().0 == -2147024597 {
          continue
        }

        return Err(MemoryReaderError::SignatureNotFound(signature));
      }

      if let Some(offset) = Self::scan(&buf[..bytes_read], signature.clone()) {
        return Ok((region.address + offset) as Address)
      }
    }

    Err(MemoryReaderError::SignatureNotFound(signature))
  }

  fn read(&self, address: Address, len: usize) -> Result<Vec<u8>, MemoryReaderError> {
    let mut binding = vec![0u8; len];
    let data = binding.as_mut_slice();

    match unsafe {
      ReadProcessMemory(
        self.handle,
        address as c_uint as *mut c_void,
        data.as_mut_ptr() as *mut c_void,
        len,
        None,
      )
    } {
      Ok(_) => return Ok(Vec::from(data)),
      Err(_) => {
        // let err = unsafe { GetLastError() };
        // println!("Failed to read memory {:?} at address {address}", err);
        return Err(MemoryReaderError::ReadFailed(address));
      }
    };
  }

  fn read_pointer(&self, address: Address) -> Result<Address, MemoryReaderError> {
    let ptr = match self.read_i32(address) {
      Ok(address) => address,
      Err(_) => return Err(MemoryReaderError::PointerReadFailed(address))
    };

    let ptr = match self.read_i32(ptr) {
      Ok(address) => address,
      Err(_) => return Err(MemoryReaderError::PointerReadFailed(address))
    };

    Ok(ptr)
  }
}