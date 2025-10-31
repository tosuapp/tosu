#ifdef __unix__
#include <dirent.h>
#include <sys/stat.h>
#include <sys/uio.h>
#include <unistd.h>
#include <algorithm>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <string_view>
#include <vector>
#include "../logger.h"
#include "memory.h"

namespace {

std::string read_file(const std::string &path) {
  std::ifstream file(path, std::ios::binary);
  if (file.good()) {
    std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    return content;
  }
  return "";
}

}  // namespace

std::vector<uint32_t> memory::find_processes(const std::vector<std::string> &process_names) {
  std::vector<uint32_t> process_ids;
  const auto dir = opendir("/proc");
  if (dir) {
    dirent *entry;
    while ((entry = readdir(dir)) != nullptr) {
      if (entry->d_type == DT_DIR) {
        std::string pid_str(entry->d_name);
        if (std::all_of(pid_str.begin(), pid_str.end(), isdigit)) {
          const auto pid = std::stoi(pid_str);
          const auto cmdline_path = "/proc/" + pid_str + "/comm";
          const auto cmdline = read_file(cmdline_path);
          if (cmdline.empty()) {
            continue;
          }
          // Check if the process name matches any in the provided list
          for (const auto &process_name : process_names) {
            if (cmdline.find(process_name) != std::string::npos) {
              process_ids.push_back(pid);
            }
          }
        }
      }
    }
    closedir(dir);
  }
  return process_ids;
}

void *memory::open_process(uint32_t id) {
  return reinterpret_cast<void *>(id);
}

void memory::close_handle(void *handle) {
  // do nothing
}

bool memory::is_process_exist(void *process) {
  const auto pid = reinterpret_cast<uintptr_t>(process);
  struct stat sts;
  const auto proc_path = "/proc/" + std::to_string(pid);
  if (stat(proc_path.c_str(), &sts) == -1 && errno == ENOENT) {
    return false;
  }
  return true;
}

bool memory::is_process_64bit(uint32_t id) {
  const auto exe_path = "/proc/" + std::to_string(id) + "/exe";

  std::ifstream file(exe_path, std::ios::binary);
  if (!file.is_open()) {
    return false;
  }

  unsigned char magic[4];
  file.read(reinterpret_cast<char *>(magic), sizeof(magic));

  if (magic[0] != 0x7F || magic[1] != 'E' || magic[2] != 'L' || magic[3] != 'F') {
    return false;
  }

  unsigned char elf_class;
  file.read(reinterpret_cast<char *>(&elf_class), sizeof(elf_class));

  return elf_class == 2;
}

std::string memory::get_process_path(void *process) {
  const auto pid = reinterpret_cast<uintptr_t>(process);
  const auto path = "/proc/" + std::to_string(pid) + "/exe";
  char buf[PATH_MAX];
  const auto len = readlink(path.c_str(), buf, sizeof(buf) - 1);
  if (len != -1) {
    buf[len] = '\0';
    return std::string(buf);
  }
  return "";
}

std::string memory::get_process_command_line(void *process) {
  const auto pid = reinterpret_cast<uintptr_t>(process);
  auto cmdline = read_file("/proc/" + std::to_string(pid) + "/cmdline");

  if (cmdline.empty()) {
    return "";
  }

  std::replace(cmdline.begin(), cmdline.end(), '\0', ' ');

  if (!cmdline.empty() && cmdline.back() == ' ') {
    cmdline.pop_back();
  }

  return cmdline;
}

std::string memory::get_process_cwd(void *process) {
  const auto pid = reinterpret_cast<uintptr_t>(process);
  const auto path = "/proc/" + std::to_string(pid) + "/cwd";
  char buf[PATH_MAX];
  const auto len = readlink(path.c_str(), buf, sizeof(buf) - 1);
  if (len != -1) {
    buf[len] = '\0';
    return std::string(buf);
  }
  return "";
}

bool memory::read_buffer(void *process, uintptr_t address, std::size_t size, uint8_t *buffer) {
  const auto pid = reinterpret_cast<uintptr_t>(process);

  iovec local_iov{buffer, size};
  iovec remote_iov{reinterpret_cast<void *>(address), size};

  const auto result_size = process_vm_readv(pid, &local_iov, 1, &remote_iov, 1, 0);

  const auto success = result_size == size;

  if (!success && errno == EPERM) {
    logger::println("failed to read address %x of size %x", address, size);
    logger::println("Consider running with sudo or using setcap:");
    logger::println("  sudo /path/to/tosu");
    logger::println("  sudo setcap cap_sys_ptrace=eip /path/to/tosu");
  }

  return success;
}

std::vector<MemoryRegion> memory::query_regions(void *process) {
  std::vector<MemoryRegion> regions;

  const auto pid = reinterpret_cast<uintptr_t>(process);
  const auto maps_path = "/proc/" + std::to_string(pid) + "/maps";
  std::ifstream maps_file(maps_path);
  if (!maps_file.is_open()) {
    return regions;
  }

  std::string line;
  while (std::getline(maps_file, line)) {
    MemoryRegion region;

    const auto first_space_pos = line.find(' ');
    const auto address_range = line.substr(0, first_space_pos);

    const auto dash_pos = address_range.find('-');
    region.address = std::stoull(address_range.substr(0, dash_pos), nullptr, 16);
    const auto end_address = std::stoull(address_range.substr(dash_pos + 1), nullptr, 16);
    region.size = end_address - region.address;
    const auto protections = line.substr(first_space_pos + 1, 5);

    if (protections[0] == 'r' && protections[1] == 'w') {
      regions.push_back(region);
    }
  }

  return regions;
}

void *memory::get_foreground_window_process() {
  return 0;
}

#endif
