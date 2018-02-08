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

    function getFullPath(request, parent) {
        if (/^\.{1,2}/.test(request)) {
            return Module._resolveFilename(path.join(path.dirname(parent.filename), request));
        } else if (options.sandboxExternal) {
            return require.resolve(request);
        }
    }

    let loadStack = [ { cache: undefined, external: false } ];

    function callLoad(_this, fn, args, cache, external) {
        loadStack.unshift({
            cache, external
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
        const sandboxCache = parent.__sandbox_cache || extraArgs().cache;
        const external = parent.__sandbox_external || extraArgs().external || !/^\.{1,2}/.test(request);
        
        if (sandboxCache) {
            if (sandboxCache[fullPath]) {
                return sandboxCache[fullPath];
            } else if (!external || options.sandboxExternal) {
                verbose('Recording', external ? 'external' : 'local', request);

                const module = callLoad(this, originalLoad, arguments, sandboxCache, external);

                sandboxCache[fullPath] = module;
                Object.defineProperty(require.cache[fullPath], '__sandbox_cache', {
                    configurable: true,
                    value: sandboxCache
                });
                Object.defineProperty(require.cache[fullPath], '__sandbox_external', {
                    configurable: true,
                    value: external
                });
                
                return module;
            } else {
                return callLoad(this, originalLoad, arguments, undefined, external);
            }
        } else if (parent.filename.match(sandboxModule)) {
            info('Start sandbox for', request);
            
            const sandboxCache = {};
            const module = callLoad(this, Module._load, arguments, sandboxCache, external);
            
            info('End sandbox for', request);
            for (let fullPath in sandboxCache) {
                verbose('Clear', fullPath);
                delete require.cache[fullPath];
            }

            return module;
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
