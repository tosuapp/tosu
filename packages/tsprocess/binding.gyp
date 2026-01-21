{
  'targets': [
    {
      'target_name': 'tsprocess',
      'sources': [ 'lib/functions.cc' ],
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")"],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'conditions': [
        ['OS=="linux"', {
          'sources': [ 'lib/memory/memory_linux.cc' ],
        }],
        ['OS=="win"', {
          'sources': [ 'lib/memory/memory_windows.cc' ],
        }],
        ['OS=="mac"', {
          'sources': [ 'lib/memory/memory_macos.cc' ],
          'ldflags': [
            '-sectcreate',
            '__TEXT',
            '__info_plist',
            '<(module_root_dir)/lib/memory/Info.plist'
          ],
          'xcode_settings': {
            'CLANG_CXX_LANGUAGE_STANDARD': 'c++20',
            'CLANG_CXX_LIBRARY': 'libc++',
            'MACOSX_DEPLOYMENT_TARGET': '10.15'
          }
        }]
      ],
      "cflags_cc": ["-std=c++20", "-fno-exceptions"],
      'msvs_settings': {
        'VCCLCompilerTool': { 'AdditionalOptions': [ '-std:c++20' ] }
      },
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
