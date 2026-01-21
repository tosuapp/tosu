#ifdef __APPLE__

#include <arpa/inet.h>
#include <libproc.h>
#include <mach/mach.h>
#include <mach/mach_vm.h>
#include <mach/vm_region.h>
#include <mach/error.h>
#include <mach-o/fat.h>
#include <mach-o/loader.h>
#include <signal.h>
#include <sys/sysctl.h>
#include <unistd.h>

#include <algorithm>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <string>
#include <string_view>
#include <vector>

#include "../logger.h"
#include "memory.h"

namespace {

pid_t pid_from_handle(void *process) {
  return static_cast<pid_t>(reinterpret_cast<uintptr_t>(process));
}

task_t get_task_for_pid(pid_t pid, const char *context) {
  task_t task = MACH_PORT_NULL;
  const auto result = task_for_pid(mach_task_self(), pid, &task);
  if (result != KERN_SUCCESS) {
    logger::println(
      "task_for_pid failed (%s) for pid %d: %s (%d)",
      context,
      pid,
      mach_error_string(result),
      result
    );
    logger::println("Try running with sudo or allow Developer Tools access in System Settings.");
    return MACH_PORT_NULL;
  }

  return task;
}

bool read_mach_header(const std::string &path, uint32_t &magic, cpu_type_t &cpu_type) {
  std::ifstream file(path, std::ios::binary);
  if (!file.is_open()) {
    return false;
  }

  file.read(reinterpret_cast<char *>(&magic), sizeof(magic));
  if (!file.good()) {
    return false;
  }

  if (magic == FAT_MAGIC || magic == FAT_CIGAM) {
    fat_header fat_header{};
    fat_header.magic = magic;
    file.read(reinterpret_cast<char *>(&fat_header.nfat_arch), sizeof(fat_header.nfat_arch));
    if (!file.good()) {
      return false;
    }

    const auto arch_count = ntohl(fat_header.nfat_arch);
    for (uint32_t i = 0; i < arch_count; ++i) {
      fat_arch arch{};
      file.read(reinterpret_cast<char *>(&arch), sizeof(arch));
      if (!file.good()) {
        return false;
      }

      cpu_type = static_cast<cpu_type_t>(ntohl(arch.cputype));
      return true;
    }

    return false;
  }

  mach_header header{};
  header.magic = magic;
  file.read(reinterpret_cast<char *>(&header.cputype), sizeof(header.cputype));
  if (!file.good()) {
    return false;
  }

  cpu_type = header.cputype;
  return true;
}

}  // namespace

std::vector<uint32_t> memory::find_processes(const std::vector<std::string> &process_names) {
  std::vector<uint32_t> process_ids;

  const auto size = proc_listpids(PROC_ALL_PIDS, 0, nullptr, 0);
  if (size <= 0) {
    return process_ids;
  }

  std::vector<pid_t> pids(static_cast<size_t>(size) / sizeof(pid_t));
  const auto bytes = proc_listpids(PROC_ALL_PIDS, 0, pids.data(), static_cast<int>(pids.size() * sizeof(pid_t)));
  if (bytes <= 0) {
    return process_ids;
  }

  const auto count = static_cast<size_t>(bytes) / sizeof(pid_t);
  for (size_t i = 0; i < count; ++i) {
    const auto pid = pids[i];
    if (pid <= 0) {
      continue;
    }

    char name_buf[PROC_PIDPATHINFO_MAXSIZE] = {0};
    if (proc_name(pid, name_buf, sizeof(name_buf)) <= 0) {
      continue;
    }

    const std::string process_name(name_buf);
    for (const auto &wanted : process_names) {
      if (process_name.find(wanted) != std::string::npos) {
        process_ids.push_back(static_cast<uint32_t>(pid));
        break;
      }
    }
  }

  return process_ids;
}

void *memory::open_process(uint32_t id) {
  return reinterpret_cast<void *>(static_cast<uintptr_t>(id));
}

void memory::close_handle(void *handle) {
  // nothing to close on macOS
}

bool memory::is_process_exist(void *process) {
  const auto pid = pid_from_handle(process);
  if (pid <= 0) {
    return false;
  }

  return kill(pid, 0) == 0 || errno != ESRCH;
}

bool memory::is_process_64bit(uint32_t id) {
  char path_buf[PROC_PIDPATHINFO_MAXSIZE] = {0};
  if (proc_pidpath(static_cast<pid_t>(id), path_buf, sizeof(path_buf)) <= 0) {
    return false;
  }

  uint32_t magic = 0;
  cpu_type_t cpu_type = 0;
  if (!read_mach_header(path_buf, magic, cpu_type)) {
    return false;
  }

  if (magic == MH_MAGIC_64 || magic == MH_CIGAM_64 || magic == FAT_MAGIC || magic == FAT_CIGAM) {
    return cpu_type == CPU_TYPE_X86_64 || cpu_type == CPU_TYPE_ARM64;
  }

  return false;
}

std::string memory::get_process_path(void *process) {
  const auto pid = pid_from_handle(process);
  if (pid <= 0) {
    return "";
  }

  char path_buf[PROC_PIDPATHINFO_MAXSIZE] = {0};
  if (proc_pidpath(pid, path_buf, sizeof(path_buf)) <= 0) {
    return "";
  }

  return std::string(path_buf);
}

std::string memory::get_process_command_line(void *process) {
  const auto pid = pid_from_handle(process);
  if (pid <= 0) {
    return "";
  }

  int mib[3] = {CTL_KERN, KERN_PROCARGS2, pid};
  size_t size = 0;
  if (sysctl(mib, 3, nullptr, &size, nullptr, 0) != 0 || size == 0) {
    return "";
  }

  std::vector<char> buffer(size);
  if (sysctl(mib, 3, buffer.data(), &size, nullptr, 0) != 0) {
    return "";
  }

  int argc = 0;
  std::memcpy(&argc, buffer.data(), sizeof(argc));
  if (argc <= 0) {
    return "";
  }

  size_t index = sizeof(argc);
  while (index < buffer.size() && buffer[index] != '\0') {
    ++index;
  }

  while (index < buffer.size() && buffer[index] == '\0') {
    ++index;
  }

  std::string result;
  for (int i = 0; i < argc && index < buffer.size(); ++i) {
    const char *arg = &buffer[index];
    const auto arg_len = std::strlen(arg);
    if (arg_len == 0) {
      break;
    }

    if (!result.empty()) {
      result.push_back(' ');
    }
    result.append(arg, arg_len);

    index += arg_len + 1;
  }

  return result;
}

std::string memory::get_process_cwd(void *process) {
  return "";
}

bool memory::read_buffer(void *process, uintptr_t address, std::size_t size, uint8_t *buffer) {
  const auto pid = pid_from_handle(process);
  if (pid <= 0) {
    return false;
  }

  task_t task = get_task_for_pid(pid, "read_buffer");
  if (task == MACH_PORT_NULL) {
    return false;
  }

  mach_vm_size_t out_size = 0;
  const auto read_result = mach_vm_read_overwrite(
    task, static_cast<mach_vm_address_t>(address), static_cast<mach_vm_size_t>(size),
    reinterpret_cast<mach_vm_address_t>(buffer), &out_size
  );

  return read_result == KERN_SUCCESS && out_size == size;
}

std::vector<MemoryRegion> memory::query_regions(void *process) {
  std::vector<MemoryRegion> regions;

  const auto pid = pid_from_handle(process);
  if (pid <= 0) {
    return regions;
  }

  task_t task = get_task_for_pid(pid, "query_regions");
  if (task == MACH_PORT_NULL) {
    return regions;
  }

  mach_vm_address_t address = 0;
  while (true) {
    mach_vm_size_t region_size = 0;
    vm_region_submap_info_data_64_t info{};
    mach_msg_type_number_t count = VM_REGION_SUBMAP_INFO_COUNT_64;
    natural_t depth = 0;

    const auto result = mach_vm_region_recurse(
      task, &address, &region_size, &depth, reinterpret_cast<vm_region_info_t>(&info), &count
    );

    if (result != KERN_SUCCESS) {
      break;
    }

    if ((info.protection & VM_PROT_READ) && (info.protection & VM_PROT_WRITE)) {
      regions.push_back(MemoryRegion{static_cast<uintptr_t>(address), static_cast<std::size_t>(region_size)});
    }

    address += region_size;
  }

  return regions;
}

void *memory::get_foreground_window_process() {
  return 0;
}

#endif
