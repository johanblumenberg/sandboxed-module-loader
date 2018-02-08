const expect = require('expect');
const path = require('path');
const loader = require('..');
const Module = require('module');

describe('Loading modules', () => {

    let original_load = Module._load;
    let loadedModules = {};

    beforeEach(() => {
        Module._load = function(request, parent) {
            if (/^\.{1,2}/.test(request)) {
                const fullPath = Module._resolveFilename(path.join(path.dirname(parent.filename), request));
                loadedModules[fullPath] = true;
            } else {
                const fullPath = require.resolve(request);
                loadedModules[fullPath] = true;
            }
            return original_load.apply(this, arguments);
        };
    });

    afterEach(() => {
        for (let file in loadedModules) {
            console.log('test: clear cache for', file);
            delete require.cache[file];
        }
        Module._load = original_load;
    });

    describe('Sandbox all modules', () => {

        beforeEach(() => {
            loader(/\/modules\/starting-point.js$/, {
                verbose: 2,
                sandboxExternal: true
            });
        });

        afterEach(() => {
            loader.reset();
        });

        it('should load each module individually from a starting point', () => {
            const start = require('./modules/starting-point');
            expect(start.a.common).not.toBe(start.b.common);
        });

        it('should clear external modules', () => {
            const start = require('./modules/starting-point');
            expect(start.a.external).not.toBe(start.b.external);
        });

        it('should clear local modules within external modules', () => {
            const start = require('./modules/starting-point');
            const child = require('sandboxed-module-loader-test/child');
            expect(start.a.external.child).not.toBe(child);
        });
    });

    describe('Sandbox local modules', () => {

        beforeEach(() => {
            loader(/\/modules\/starting-point.js$/, {
                verbose: 2,
                sandboxExternal: false
            });
        });

        afterEach(() => {
            loader.reset();
        });

        it('should load each module individually from a starting point', () => {
            const start = require('./modules/starting-point');
            expect(start.a.common).not.toBe(start.b.common);
        });

        it('should not clear external modules', () => {
            const start = require('./modules/starting-point');
            expect(start.a.external).toBe(start.b.external);
        });

        it('should not clear local modules within external modules', () => {
            const start = require('./modules/starting-point');
            const child = require('sandboxed-module-loader-test/child');
            expect(start.a.external.child).toBe(child);
        });
    });
});
