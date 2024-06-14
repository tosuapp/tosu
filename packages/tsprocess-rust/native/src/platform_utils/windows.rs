use std::ffi::{c_uint, c_void, OsString};
use std::os::windows::ffi::{OsStringExt};
use std::mem;
use windows::Win32::{
    Foundation::{
        CloseHandle,
        GetLastError,
        HANDLE,
        HMODULE,
        FALSE,
        MAX_PATH
    },
    System::{
        Diagnostics::{
            Debug::ReadProcessMemory,
        },
        Threading::{
            OpenProcess,
            GetExitCodeProcess,
            PROCESS_QUERY_INFORMATION,
            PROCESS_VM_READ,
            PROCESS_BASIC_INFORMATION,
            PEB,
            RTL_USER_PROCESS_PARAMETERS
        },
        ProcessStatus::{
            GetModuleFileNameExA,
        }
    },
};

use windows::Wdk::System::Threading::{NtQueryInformationProcess, ProcessBasicInformation};

use crate::memory::memory_reader::ProcessId;
use crate::platform_utils::windows_error::PlatformUtilsError;
use crate::platform_utils::utils::{PlatformUtilsMethods, PlatformUtils};

impl PlatformUtils {
    pub fn get_process_handle(process_id: u32) -> Result<HANDLE, PlatformUtilsError> {
        match unsafe {
            OpenProcess(
                PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                FALSE,
                process_id
            )
        } {
            Ok(handle) => Ok(handle),
            Err(_) => Err(PlatformUtilsError::CannotGetProcessHandle(process_id)),
        }
    }

    pub fn is_handle_exists(handle: HANDLE) -> Result<bool, ()> {
        let mut exit_code: u32 = 0;

        let exists = match unsafe {
            GetExitCodeProcess(handle, &mut exit_code)
        } {
            // 259 - STILL_ALIVE
            Ok(_) => Ok(exit_code == 259),
            Err(_) => Ok(false),
        }?;

        Ok(exists)
    }
}

impl PlatformUtilsMethods for PlatformUtils {
    fn get_process_path(process_id: ProcessId) -> Result<String, PlatformUtilsError> {
        let handle = Self::get_process_handle(process_id)?;
        let mut path: Vec<u8> = vec![0; MAX_PATH as usize];
        let path = path.as_mut_slice();

        unsafe { GetModuleFileNameExA(
            handle,
            HMODULE::default(),
            path
        ) };

        unsafe { CloseHandle(handle).unwrap(); }

        let name = String::from_utf8(path.to_vec())
            .unwrap()
            .trim()
            .to_string();

        return Ok(name);
    }

    fn get_process_command_line(process_id: ProcessId) -> Result<String, PlatformUtilsError> {
        let handle = Self::get_process_handle(process_id)?;

        let mut process_info = PROCESS_BASIC_INFORMATION::default();
        let process_info = &mut process_info as *mut PROCESS_BASIC_INFORMATION;

        let process_length = &mut 0_u32;
        let process_length = process_length as *mut u32;

        let status = unsafe { NtQueryInformationProcess(
            handle,
            ProcessBasicInformation,
            process_info as *mut c_void,
            mem::size_of::<PROCESS_BASIC_INFORMATION>() as u32,
            process_length
        ) };

        if status.0 != 0 {
            // failed to query the process
            return Err(PlatformUtilsError::FailedToQueryProcess(process_id));
        }

        let process_info = unsafe { *process_info };

        let mut peb = PEB::default();
        let peb = &mut peb as *mut PEB;

        match unsafe {
            ReadProcessMemory(
                handle,
                process_info.PebBaseAddress as c_uint as *mut c_void,
                peb as *mut c_void,
                mem::size_of::<PEB>(),
                None,
            )
        } {
            Ok(_) => (),
            Err(_) => {
                let err = unsafe { GetLastError() };

                return Err(
                    PlatformUtilsError::FailedToReadPEB(err)
                );
            }
        };

        let peb = unsafe { *peb };

        let mut params = RTL_USER_PROCESS_PARAMETERS::default();
        let params = &mut params as *mut RTL_USER_PROCESS_PARAMETERS;

        match unsafe {
            ReadProcessMemory(
                handle,
                peb.ProcessParameters as c_uint as *mut c_void,
                params as *mut c_void,
                mem::size_of::<PEB>(),
                None,
            )
        } {
            Ok(_) => (),
            Err(_) => {
                // Failed to read the process params
                let err = unsafe { GetLastError() };

                return Err(
                    PlatformUtilsError::FailedToReadProcessParams(err)
                );
            }
        };

        let params = unsafe { *params };

        let command_line_args = params.CommandLine;
        let size = (command_line_args.Length / mem::size_of::<u16>() as u16) as usize;

        // windows uses UTF-16 string;
        let mut buffer: Vec<u16> = vec![0; size];
        let buffer = buffer.as_mut_slice();

        match unsafe {
            ReadProcessMemory(
                handle,
                command_line_args.Buffer.as_ptr() as c_uint as *mut c_void,
                buffer.as_mut_ptr() as *mut c_void,
                command_line_args.Length as usize,
                None,
            )
        } {
            Ok(_) => (),
            Err(_) => {
                let err = unsafe { GetLastError() };

                return Err(
                    PlatformUtilsError::FailedToReadCommandLine(err)
                );
            }
        };

        unsafe { CloseHandle(handle).unwrap(); };

        let command_line_string = OsString::from_wide(buffer)
            .into_string()
            .unwrap();

        Ok(command_line_string)
    }
}
