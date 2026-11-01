// Runtime for internal tooling/tests; application code is typechecked separately.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...rest) {
  return resolve.call(this,name.startsWith('@/') ? path.resolve(__dirname,'../src',name.slice(2)) : name,parent,...rest);
};
require.extensions['.ts'] = function(module,filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,filename);
};
