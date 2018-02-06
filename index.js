const path = require('path');
const Module = require('module');

const originalLoad = Module._load;

function loader(sandboxModule, options) {
    options = Object.assign({
        verbose: 0,
        sandboxExternal: false
    }, options);

    var loadedModules = undefined;

    function info() {
        if (options.verbose > 0) {
            console.log.apply(console, [ 'sandboxed-module-loader' ].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function verbose() {
        if (options.verbose > 1) {
            console.log.apply(console, [ 'sandboxed-module-loader' ].concat(Array.prototype.slice.call(arguments)));
        }
    }

    Module._load = function modifiedLoad(request, parent) {
        verbose('_load()', request, 'from', parent.filename);

        if (loadedModules) {
            if (/^\.{1,2}/.test(request)) {
                verbose('recording local', request);
                const fullPath = Module._resolveFilename(path.join(path.dirname(parent.filename), request));
                loadedModules[fullPath] = true;
            } else if (options.sandboxExternal) {
                verbose('recording external', request);
                const fullPath = require.resolve(request);
                loadedModules[fullPath] = true;
            }
        }

        if (parent.filename.match(sandboxModule) && !loadedModules) {
            info('Start sandbox for', request);

            loadedModules = {};
            let r = originalLoad.apply(this, arguments);

            info('End sandbox for', request);
            for (let m in loadedModules) {
                verbose('Clear request cache for', m);
                delete require.cache[m];
            }
            loadedModules = undefined;

            return r;
        } else {
            return originalLoad.apply(this, arguments);
        }
    };
};

function reset() {
    Module._load = originalLoad;
}

module.exports = loader;
module.exports.reset = reset;
