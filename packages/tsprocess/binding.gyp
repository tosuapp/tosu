{
  'targets': [
    {
      'target_name': 'tsprocess',
      'sources': [ 'lib/functions.cc' ],
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")"],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags_cc": ["-std=c++23", "-fno-exceptions"],
      'msvs_settings': {
        'VCCLCompilerTool': { 'ExceptionHandling': 1 },
      },
      "msbuild_settings": {
        "ClCompile": {
            "LanguageStandard": "stdcpplatest"
        }
      }
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