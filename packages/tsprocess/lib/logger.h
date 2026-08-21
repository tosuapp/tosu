#include <cstdio>
#include <format>
#include <string>

namespace logger {

template <typename... Args>
void println(std::format_string<Args...> format, Args &&...args) {
  std::printf("%s\n", std::format(format, std::forward<Args>(args)...).c_str());
}

}  // namespace logger
