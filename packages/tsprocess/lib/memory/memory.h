#pragma once

#include <cstdint>
#include <string>
#include <string_view>
#include <tuple>
#include <vector>

struct MemoryRegion {
  uintptr_t address;
  std::size_t size;
};

namespace memory {

std::vector<MemoryRegion> query_regions(void *process);

std::vector<uint32_t> find_processes(const std::string_view process_name);

void *open_process(uint32_t id);
bool is_process_exist(void *process);
std::string get_process_path(void *process);
std::string get_process_command_line(void *process);

bool read_buffer(void *process, uintptr_t address, std::size_t size, uint8_t *buffer);

template <class T>
std::tuple<T, bool> read(void *process, uintptr_t address) {
  T data;
  const auto success = read_buffer(process, address, sizeof(T), reinterpret_cast<uint8_t *>(&data));
  return std::make_tuple(data, success);
}

inline bool
scan(std::vector<uint8_t> buffer, const std::vector<uint8_t> signature, const std::vector<uint8_t> mask, size_t &offset) {
  offset = 0;

  for (size_t i = 0; i + signature.size() <= buffer.size(); ++i) {
    bool found = true;
    for (size_t j = 0; j < signature.size(); ++j) {
      if (buffer[i + j] == signature[j] || mask[j] == 0)
        continue;

      found = false;
      break;
    }

    if (!found) {
      continue;
    }

    offset = static_cast<size_t>(i);
    return true;
  }

  return false;
}

inline uintptr_t find_pattern(void *process, const std::vector<uint8_t> signature, const std::vector<uint8_t> mask) {
  const auto regions = query_regions(process);

  for (auto &region : regions) {
    auto buffer = std::vector<uint8_t>(region.size);
    if (!read_buffer(process, region.address, region.size, buffer.data())) {
      continue;
    }

    size_t offset;
    if (!scan(buffer, signature, mask, offset)) {
      continue;
    }

    return region.address + offset;
  }

  return 0;
}

}  // namespace memory
