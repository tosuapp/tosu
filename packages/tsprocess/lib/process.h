#pragma once

#include <Windows.h>
#include <string>
#include <Psapi.h>
#include <tlhelp32.h>
#include <vector>

#pragma comment(lib, "Psapi.lib")

namespace memory { 
    template <class T>
    inline std::tuple<T, bool> read(HANDLE hProcess, uintptr_t address) {
        T value;
        auto result = ReadProcessMemory(hProcess, reinterpret_cast<void*>(address), &value, sizeof(T), 0);
        return {value, result};
    }

    inline bool read_buffer(HANDLE hProcess, uintptr_t address, size_t size, char* dstBuffer) {
        return ReadProcessMemory(hProcess, reinterpret_cast<void*>(address), dstBuffer, size, 0) == 1;
    }

    inline uintptr_t get_base_address(HANDLE process)
    {
        MODULEINFO mi;
        if (GetModuleInformation(process, nullptr, &mi, sizeof(mi)))
            return (uintptr_t)mi.EntryPoint;
        return 0;
    }

    inline uint32_t scan(const std::vector<uint8_t> buffer, const std::vector<uint8_t> signature) {
		for (int i = 0; i + signature.size() <= buffer.size(); i++) {
			bool found = true;
            for (int j = 0; j < signature.size(); j++) {
                if (buffer[i + j] != signature[j] && signature[j] != 0x00) {
					found = false;
					break;
                }
			}   

			if (found) {
				return i;
			}
		}

        return -1;
    }

    static std::vector<MEMORY_BASIC_INFORMATION> regions;
    static bool regionFlag;

    inline void cache_regions(HANDLE process) {
		regions.clear();
        uintptr_t address = 0;
        MEMORY_BASIC_INFORMATION mbi;   
        while (VirtualQueryEx(process, reinterpret_cast<void*>(address), &mbi, sizeof(mbi))) {
            if (mbi.State != MEM_FREE && (mbi.Protect & PAGE_GUARD) == 0) {
                regions.push_back(mbi);
            }

            address = reinterpret_cast<uintptr_t>(mbi.BaseAddress) + mbi.RegionSize;
        }
    }
        
    inline DWORD find_pattern(HANDLE process, const std::vector<uint8_t> signature, bool refresh = false, int baseAddress = 0) {
        if (refresh)
			regionFlag = false;
		
        if (!regionFlag) {
            cache_regions(process);
            regionFlag = true;
        }

        MEMORY_BASIC_INFORMATION mbi;
        auto size = sizeof(mbi);

		for (auto& region : regions) {
			auto regionSize = region.RegionSize;
			auto regionAddress = (uintptr_t)region.BaseAddress;

			if (regionAddress < baseAddress)
				continue;

            if (regionSize > 10000000)
				continue;

			auto buffer = std::vector<uint8_t>(regionSize);
			ReadProcessMemory(process, (void*)regionAddress, buffer.data(), regionSize, 0);

			auto offset = scan(buffer, signature);
			if (offset != -1) {
				return regionAddress + offset;
			}
		}

        return 0;
    }

	inline std::vector<uint32_t> find_processes(const std::string& process_name) {
		PROCESSENTRY32 processEntry;
		processEntry.dwSize = sizeof(PROCESSENTRY32);

        std::vector<uint32_t> processes;

		HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, NULL);
		if (Process32First(snapshot, &processEntry)) {
			do {
				if (process_name == processEntry.szExeFile) {
					processes.push_back(processEntry.th32ProcessID);
				}
			} while (Process32Next(snapshot, &processEntry));
		}

        CloseHandle(snapshot);

        return processes;
	}

	inline HANDLE open_process(uint32_t id) {
		return OpenProcess(PROCESS_ALL_ACCESS, FALSE, id);
	}

	inline bool is_process_exist(HANDLE handle) {
        DWORD returnCode{};
        if (GetExitCodeProcess(handle, &returnCode)) {
			return returnCode == STILL_ACTIVE;
        }
        return false;
	}

    inline std::string get_process_path(HANDLE handle) {
        char filePath[MAX_PATH];
        GetModuleFileNameExA(handle, NULL, filePath, MAX_PATH);

        return filePath;
    }
}