#pragma once

#include <chrono>
#include <cstdint>
#include <span>
#include <string>
#include <string_view>
#include <tuple>
#include <vector>

struct MemoryRegion {
  uintptr_t address;
  std::size_t size;
};

struct Pattern {
  int index;
  std::span<uint8_t> signature;
  std::span<uint8_t> mask;
  bool found;
};

struct PatternResult {
  int index;
  uintptr_t address;
};

namespace memory {

std::vector<MemoryRegion> query_regions(void *process);

std::vector<uint32_t> find_processes(const std::vector<std::string>& process_names);

void *open_process(uint32_t id);
bool is_process_64bit(uint32_t id);
bool is_process_exist(void *process);
std::string get_process_path(void *process);
std::string get_process_command_line(void *process);
std::string get_process_cwd(void *process);
void *get_foreground_window_process();

bool read_buffer(void *process, uintptr_t address, std::size_t size, uint8_t *buffer);

template <class T>
std::tuple<T, bool> read(void *process, uintptr_t address) {
  T data;
  const auto success = read_buffer(process, address, sizeof(T), reinterpret_cast<uint8_t *>(&data));
  return std::make_tuple(data, success);
}

inline bool scan(std::vector<uint8_t> buffer, std::span<uint8_t> signature, std::span<uint8_t> mask, size_t &offset) {
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

inline bool scan(std::vector<uint8_t> buffer, std::vector<uint8_t> signature, std::vector<uint8_t> mask, size_t &offset) {
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

inline std::vector<PatternResult> batch_find_pattern(void *process, std::vector<Pattern> patterns) {
  const auto regions = query_regions(process);

  auto results = std::vector<PatternResult>();

  for (auto &region : regions) {
    auto buffer = std::vector<uint8_t>(region.size);
    if (!read_buffer(process, region.address, region.size, buffer.data())) {
      continue;
    }

    for (auto &pattern : patterns) {
      if (pattern.found) {
        continue;
      }

      size_t offset;
      if (!scan(buffer, pattern.signature, pattern.mask, offset)) {
        continue;
      }

      PatternResult result;
      result.index = pattern.index;
      result.address = region.address + offset;

      results.push_back(result);

      pattern.found = true;

      if (patterns.size() == results.size()) {
        return results;
      }
    }
  }

  return results;
}

}  // namespace memory
