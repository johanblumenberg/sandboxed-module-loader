const path = require('path');
const Module = require('module');

var originalLoad;

function loader(sandboxModule, options) {
    options = Object.assign({
        verbose: 0,
        sandboxExternal: false
    }, options);

    var loadedModules = undefined;
    var external = false;

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

    originalLoad = Module._load;
    Module._load = function modifiedLoad(request, parent) {
        const startExternal = !external && !/^\.{1,2}/.test(request);
        const startSandbox = !loadedModules && parent.filename.match(sandboxModule);
        const fullPath = loadedModules && getFullPath(request, parent);

        verbose('_load()', request, 'from', parent.filename);

        if (startExternal) {
            external = true;
        }

        if (startSandbox) {
            info('Start sandbox for', request);
            loadedModules = {};
        }

        if (fullPath) {
            if (external && options.sandboxExternal) {
                verbose('Recording external', request);                
                loadedModules[fullPath] = true;
            } else if (!external) {
                verbose('Recording local', request);                
                loadedModules[fullPath] = true;
            }
        }

        let r = originalLoad.apply(this, arguments);

        if (startSandbox) {
            info('End sandbox for', request);
            for (let m in loadedModules) {
                verbose('Clear', m);
                delete require.cache[m];
            }
            loadedModules = undefined;
        }

        if (startExternal) {
            external = false;
        }

        return r;
    };
};

function reset() {
    Module._load = originalLoad;
}

module.exports = loader;
module.exports.reset = reset;
