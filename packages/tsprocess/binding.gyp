{
  'targets': [
    {
      'target_name': 'tsprocess',
      'sources': [ 'lib/functions.cc', 'lib/memory/memory_linux.cc', 'lib/memory/memory_windows.cc' ],
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")"],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags": ["-std=c++23", "-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
    },
    {
        "target_name": "copy_binary",
        "type":"none",
        "dependencies" : [ "tsprocess" ],
        "copies":
        [
          {
              'destination': '<(module_root_dir)/dist/lib',
              'files': ['<(module_root_dir)/build/Release/tsprocess.node']
          }
        ]
    }
  ]
}