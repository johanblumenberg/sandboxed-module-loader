const path = require('path');
const Module = require('module');

var originalLoad;

function loader(sandboxModule, options) {
    options = Object.assign({
        verbose: 0,
        sandboxExternal: false
    }, options);

    function info() {
        if (options.verbose > 0) {
            console.log.apply(console, [ 'sandboxed-module-loader:' ].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function verbose() {
        if (options.verbose > 1) {
            console.log.apply(console, [ 'sandboxed-module-loader:' ].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function getPaths(module) {
        if (module) {
            return module.paths || getPaths(module.parent);
        }
    }

    function getFullPath(request, parent) {
        if (/^\.{1,2}/.test(request)) {
            return Module._resolveFilename(path.join(path.dirname(parent.filename), request));
        } else {
            return require.resolve(request, {
                paths: getPaths(parent)
            });
        }
    }

    let sandboxId = 0;
    let loadStack = [ { cache: undefined, external: false } ];

    function createSandbox() {
        function FakeModulePrototype () {}
        FakeModulePrototype.prototype = Module.prototype;
        function FakeModule () {}
        FakeModule.prototype = new FakeModulePrototype();
        Object.keys(Module).forEach(key => FakeModule[key] = Module[key]);
        FakeModule._load = originalLoad;

        return {
            id: ++sandboxId,
            cache: { 
                'module': { exports: FakeModule }
            },
            Module: FakeModule
        };    
    }
    
    function callLoad(_this, m, args, sandbox, external) {
        loadStack.unshift({
            sandbox, external
        });
        const originalCompile = Module.prototype._compile;
        Module.prototype._compile = m.prototype._compile;
        const module = m._load.apply(_this, args);
        Module.prototype._compile = originalCompile;

        loadStack.shift();
        return module;
    }

    function extraArgs() {
        return loadStack[0];
    }

    originalLoad = Module._load;
    Module._load = function modifiedLoad(request, parent) {
        verbose('_load()', request, 'from', parent.filename);
                
        const fullPath = getFullPath(request, parent);
        const sandbox = parent.__sandbox || extraArgs().sandbox;
        const external = parent.__sandbox_external || extraArgs().external || !/^\.{1,2}|^\//.test(request);
        
        if (sandbox) {
            if (sandbox.cache[fullPath]) {
                verbose('Returning from sandbox[' + sandbox.id + ']', request);
                return sandbox.cache[fullPath].exports;
            } else if (require.cache[fullPath]) {
                return require.cache[fullPath].exports;
            } else if (!external || options.sandboxExternal) {
                const exports = callLoad(this, sandbox.Module, arguments, sandbox, external);
                const module = require.cache[fullPath] || { exports };

                verbose('Caching in sandbox[' + sandbox.id + ']', external ? 'external' : 'local', request);

                sandbox.cache[fullPath] = module;
                delete require.cache[fullPath];

                Object.defineProperty(module, '__sandbox', {
                    configurable: true,
                    value: sandbox
                });
                Object.defineProperty(module, '__sandbox_external', {
                    configurable: true,
                    value: external
                });

                return exports;
            } else {
                return callLoad(this, sandbox.Module, arguments, undefined, external);
            }
        } else if (parent.filename.match(sandboxModule)) {
            const sandbox = createSandbox();
            info('Create sandbox[' + sandbox.id + '] for', request);

            return callLoad(this, Module, arguments, sandbox, external);
        } else {
            return originalLoad.apply(this, arguments);
        }
    };
}

function reset() {
    Module._load = originalLoad;
}

module.exports = loader;
module.exports.reset = reset;
