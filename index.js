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

    function callLoad(_this, fn, args, sandbox, external) {
        loadStack.unshift({
            sandbox, external
        });
        const module = fn.apply(_this, args);
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
            if (sandbox[fullPath]) {
                verbose('Returning from sandbox[' + sandbox.__id + ']', request);
                return sandbox[fullPath].exports;
            } else if (!external || options.sandboxExternal) {
                verbose('Caching in sandbox[' + sandbox.__id + ']', external ? 'external' : 'local', request);

                const exports = callLoad(this, originalLoad, arguments, sandbox, external);
                const module = require.cache[fullPath] || { exports };

                sandbox[fullPath] = module;
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
                return callLoad(this, originalLoad, arguments, undefined, external);
            }
        } else if (parent.filename.match(sandboxModule)) {
            const id = ++sandboxId;

            info('Create sandbox[' + id + '] for', request);
            
            const sandbox = {};
            Object.defineProperty(sandbox, '__id', {
                value: id
            });

            return callLoad(this, Module._load, arguments, sandbox, external);
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
