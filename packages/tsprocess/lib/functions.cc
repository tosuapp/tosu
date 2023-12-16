#include "process.h"
#include <format>
#include <napi.h>

Napi::Value readByte(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto address = args[1].As<Napi::Number>().Uint32Value();
  auto result = memory::read<int8_t>(handle, address);
  if (!std::get<1>(result)) {
    Napi::TypeError::New(env,
                         std::format("Couldn't read byte at {:x}", address))
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Number::New(env, std::get<0>(result));
}

Napi::Value readShort(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto address = args[1].As<Napi::Number>().Uint32Value();
  auto result = memory::read<int16_t>(handle, address);
  if (!std::get<1>(result)) {
    Napi::TypeError::New(env,
                         std::format("Couldn't read short at {:x}", address))
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Number::New(env, std::get<0>(result));
}

Napi::Value readInt(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto address = args[1].As<Napi::Number>().Uint32Value();
  auto result = memory::read<int32_t>(handle, address);
  if (!std::get<1>(result)) {
    Napi::TypeError::New(env, std::format("Couldn't read int at {:x}", address))
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Number::New(env, std::get<0>(result));
}

Napi::Value readFloat(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto address = args[1].As<Napi::Number>().Uint32Value();
  auto result = memory::read<float_t>(handle, address);
  if (!std::get<1>(result)) {
    Napi::TypeError::New(env,
                         std::format("Couldn't read float at {:x}", address))
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Number::New(env, std::get<0>(result));
}

Napi::Value readLong(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto address = args[1].As<Napi::Number>().Uint32Value();
  auto result = memory::read<int64_t>(handle, address);
  if (!std::get<1>(result)) {
    Napi::TypeError::New(env,
                         std::format("Couldn't read long at {:x}", address))
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Number::New(env, std::get<0>(result));
}

Napi::Value readDouble(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto address = args[1].As<Napi::Number>().Uint32Value();
  auto result = memory::read<double_t>(handle, address);
  if (!std::get<1>(result)) {
    Napi::TypeError::New(env,
                         std::format("Couldn't read double at {:x}", address))
        .ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Number::New(env, std::get<0>(result));
}

Napi::Value scanSync(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 4) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto baseAddress = args[1].As<Napi::Number>().Uint32Value();
  auto signature = args[2].As<Napi::Uint8Array>();
  auto refresh = args[3].As<Napi::Boolean>().Value();

  auto vec = std::vector<uint8_t>(signature.ByteLength());
  memcpy(vec.data(), signature.Data(), signature.ByteLength());

  auto result = memory::find_pattern(handle, vec, refresh, baseAddress);

  if (!result) {
    Napi::TypeError::New(env, "Couldn't find signature")
        .ThrowAsJavaScriptException();

    return env.Null();
  }

  return Napi::Number::New(
      env, memory::find_pattern(handle, vec, refresh, baseAddress));
}

Napi::Value readBuffer(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 3) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto address = args[1].As<Napi::Number>().Uint32Value();
  auto size = args[2].As<Napi::Number>().Uint32Value();
  auto buffer = new char[size];
  auto data = (char *)malloc(sizeof(char) * size);
  auto result = memory::read_buffer(handle, address, size, data);

  if (!result) {
    free(data);
    Napi::TypeError::New(env,
                         std::format("Couldn't read buffer at {:x}", address))
        .ThrowAsJavaScriptException();

    return env.Null();
  }

  auto out = Napi::Buffer<char>::Copy(env, data, size);
  free(data);

  return out;
}

static bool scanning = false;

Napi::Value scan(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 5) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Int32Value());
  auto baseAddress = args[1].As<Napi::Number>().Uint32Value();
  auto signature = args[2].As<Napi::Uint8Array>();
  auto refresh = args[3].As<Napi::Boolean>().Value();
  auto callback = Napi::ThreadSafeFunction::New(
      args.Env(), args[4].As<Napi::Function>(), "tsfn", 0, 1);
  auto data = signature.Data();
  auto byteLength = signature.ByteLength();

  if (!scanning) {
    scanning = true;

    std::thread(
        [handle, data, byteLength, refresh,
         baseAddress](Napi::ThreadSafeFunction tsfn) {
          auto vec = std::vector<uint8_t>(byteLength);
          memcpy(vec.data(), data, byteLength);

          auto res = memory::find_pattern(handle, vec, refresh, baseAddress);
          scanning = false;
          tsfn.BlockingCall([res](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({Napi::Number::From(env, res)});
          });
        },
        callback)
        .detach();
  }

  return env.Undefined();
}

Napi::Value findProcesses(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto processName = args[0].As<Napi::String>().Utf8Value();
  auto processes = memory::find_processes(processName);

  auto arr = Napi::Array::New(env, processes.size());
  for (auto i = 0; i < processes.size(); i++) {
    arr.Set(i, processes[i]);
  }

  return arr;
}

inline std::vector<PROCESSENTRY32> get_processes() {
  std::vector<PROCESSENTRY32> processes;
  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snapshot != INVALID_HANDLE_VALUE) {
    PROCESSENTRY32 processEntry;
    processEntry.dwSize = sizeof(PROCESSENTRY32);
    if (Process32First(snapshot, &processEntry)) {
      do {
        processes.push_back(processEntry);
      } while (Process32Next(snapshot, &processEntry));
    }
    CloseHandle(snapshot);
  }
  return processes;
}

Napi::Value getProcesses(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 0) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto processes = get_processes();

  auto arr = Napi::Array::New(env, processes.size());
  for (auto i = 0; i < processes.size(); i++) {
    auto obj = Napi::Object::New(env);
    obj.Set("id", processes[i].th32ProcessID);
    obj.Set("exeFile", processes[i].szExeFile);
    obj.Set("parentId", processes[i].th32ParentProcessID);
    obj.Set("pcPriClassBase", processes[i].pcPriClassBase);

    arr.Set(i, obj);
  }

  return arr;
}

Napi::Value openProcess(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto processId = args[0].As<Napi::Number>().Uint32Value();
  return Napi::Number::New(env, (int32_t)memory::open_process(processId));
}

Napi::Value isProcessExist(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Uint32Value());
  return Napi::Boolean::New(env, memory::is_process_exist(handle));
}

Napi::Value getProcessPath(const Napi::CallbackInfo &args) {
  Napi::Env env = args.Env();
  if (args.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto handle =
      reinterpret_cast<HANDLE>(args[0].As<Napi::Number>().Uint32Value());
  return Napi::String::From(env, memory::get_process_path(handle));
}

Napi::Object init(Napi::Env env, Napi::Object exports) {
  exports["readByte"] = Napi::Function::New(env, readByte);
  exports["readShort"] = Napi::Function::New(env, readShort);
  exports["readInt"] = Napi::Function::New(env, readInt);
  exports["readFloat"] = Napi::Function::New(env, readFloat);
  exports["readLong"] = Napi::Function::New(env, readLong);
  exports["readDouble"] = Napi::Function::New(env, readDouble);
  exports["readBuffer"] = Napi::Function::New(env, readBuffer);
  exports["scanSync"] = Napi::Function::New(env, scanSync);
  exports["scan"] = Napi::Function::New(env, scan);
  exports["openProcess"] = Napi::Function::New(env, openProcess);
  exports["findProcesses"] = Napi::Function::New(env, findProcesses);
  exports["getProcesses"] = Napi::Function::New(env, getProcesses);
  exports["isProcessExist"] = Napi::Function::New(env, isProcessExist);
  exports["getProcessPath"] = Napi::Function::New(env, getProcessPath);

  return exports;
}

NODE_API_MODULE(addon, init)