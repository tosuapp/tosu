#include <memory>
#include <string>

namespace logger {

template <typename... Args>
std::string format(const std::string_view format, Args... args) {
  const auto size = std::snprintf(nullptr, 0, format.data(), args...) + 1;
  if (size <= 0) {
    return {};
  }
  auto buffer = std::make_unique<char[]>(size);
  std::snprintf(buffer.get(), size, format.data(), args...);
  return std::string(buffer.get(), size - 1);
}

template <typename... Args>
void println(const std::string_view format, Args... args) {
  std::printf(logger::format(format, args...).c_str());
  std::printf("\n");
}

}  // namespace logger
