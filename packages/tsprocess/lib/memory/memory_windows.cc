#if defined(WIN32) || defined(_WIN32)

// clang-format off
#include <Windows.h>
#include <Psapi.h>
// clang-format on

#include <tlhelp32.h>
#include <winnt.h>
#include <winternl.h>
#include <iostream>
#include <string>
#include <vector>
#include "memory.h"

#pragma comment(lib, "Psapi.lib")
#pragma comment(lib, "ntdll.lib")

bool memory::read_buffer(void *process, uintptr_t address, std::size_t size, uint8_t *buffer) {
  return ReadProcessMemory(process, reinterpret_cast<void *>(address), buffer, size, 0) == 1;
}

std::vector<MemoryRegion> memory::query_regions(void *process) {
  std::vector<MemoryRegion> regions;

  MEMORY_BASIC_INFORMATION info;
  for (uint8_t *address = 0; VirtualQueryEx(process, address, &info, sizeof(info)) != 0; address += info.RegionSize) {
    if ((info.State & MEM_COMMIT) == 0 || (info.Protect & (PAGE_READWRITE | PAGE_EXECUTE_READWRITE)) == 0) {
      continue;
    }

    regions.push_back(MemoryRegion{reinterpret_cast<uintptr_t>(info.BaseAddress), info.RegionSize});
  }

  return regions;
}

std::vector<uint32_t> memory::find_processes(const std::vector<std::string> &process_names) {
  PROCESSENTRY32 processEntry;
  processEntry.dwSize = sizeof(PROCESSENTRY32);

  std::vector<uint32_t> processes;

  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, NULL);
  if (Process32First(snapshot, &processEntry)) {
    do {
      for (const auto &process_name : process_names) {
        if (process_name == processEntry.szExeFile) {
          processes.push_back(processEntry.th32ProcessID);
        }
      }
    } while (Process32Next(snapshot, &processEntry));
  }

  CloseHandle(snapshot);

  return processes;
}

void *memory::open_process(uint32_t id) {
  return OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, FALSE, id);
}

void memory::close_handle(void *handle) {
  CloseHandle(handle);
}

bool memory::is_process_exist(void *handle) {
  DWORD returnCode{};
  if (GetExitCodeProcess(handle, &returnCode)) {
    return returnCode == STILL_ACTIVE;
  }
  return false;
}

bool memory::is_process_64bit(uint32_t id) {
  HANDLE process_handle = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, FALSE, id);
  BOOL is_wow64 = FALSE;

  if (!IsWow64Process(process_handle, &is_wow64)) {
    DWORD error = GetLastError();
    std::cerr << "Failed to determine process bitness, error: " << error << std::endl;
    return false;
  }

  return !is_wow64;
}

std::string memory::get_process_path(void *handle) {
  char filePath[MAX_PATH];
  GetModuleFileNameExA(handle, NULL, filePath, MAX_PATH);

  return filePath;
}

std::string memory::get_process_cwd(void *process) {
  return "";
}

std::string memory::get_process_command_line(void *process) {
  std::string commandLine;

  PROCESS_BASIC_INFORMATION pbi = {};
  NTSTATUS status = NtQueryInformationProcess(process, ProcessBasicInformation, &pbi, sizeof(pbi), NULL);
  if (status != 0) {
    std::cerr << "failed to query the process, error: " << status << std::endl;
  } else {
    PEB peb = {};
    if (!ReadProcessMemory(process, pbi.PebBaseAddress, &peb, sizeof(peb), NULL)) {
      DWORD err = GetLastError();
      std::cerr << "failed to read the process PEB, error: " << err << std::endl;
    } else {
      RTL_USER_PROCESS_PARAMETERS params = {};
      if (!ReadProcessMemory(process, peb.ProcessParameters, &params, sizeof(params), NULL)) {
        DWORD err = GetLastError();
        std::cerr << "failed to read the process params, error: " << err << std::endl;
      } else {
        UNICODE_STRING &commandLineArgs = params.CommandLine;
        std::vector<WCHAR> buffer(commandLineArgs.Length / sizeof(WCHAR));
        if (!ReadProcessMemory(process, commandLineArgs.Buffer, buffer.data(), commandLineArgs.Length, NULL)) {
          DWORD err = GetLastError();
          std::cerr << "failed to read the process command line, error: " << err << std::endl;
        } else {
          commandLine = std::string(buffer.begin(), buffer.end());
        }
      }
    }
  }

  return commandLine;
}

void *memory::get_foreground_window_process() {
  DWORD process_id;

  GetWindowThreadProcessId(GetForegroundWindow(), &process_id);

  return reinterpret_cast<void *>(process_id);
}

#endif
