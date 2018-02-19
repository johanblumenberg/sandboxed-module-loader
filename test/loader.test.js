const expect = require('expect');
const path = require('path');
const loader = require('..');
const Module = require('module');
const { mock, instance, verify, anything } = require('ts-mockito');

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
            expect(start.a.package).not.toBe(start.b.external);
        });

        it('should clear local modules within external modules', () => {
            const start = require('./modules/starting-point');
            const child = require('sandboxed-module-loader-test/child');
            expect(start.a.package.child).not.toBe(child);
        });

        it('should keep cache for later calls to require', () => {
            const start = require('./modules/starting-point');
            expect(start.a.common).toBe(start.a.getCommon());
        });

        it('should load nested modules', () => {
            const start = require('./modules/starting-point');
            expect(start.a.package.external).not.toBe(start.a.external)
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
            expect(start.a.package).toBe(start.b.package);
        });

        it('should not clear local modules within external modules', () => {
            const start = require('./modules/starting-point');
            const child = require('sandboxed-module-loader-test/child');
            expect(start.a.package.child).toBe(child);
        });

        it('should keep absolute path files in local sandbox', () => {
            const start = require('./modules/starting-point');
            expect(start.a.common).toBe(start.a.getAbsoluteCommon());
            expect(start.b.common).not.toBe(start.a.getAbsoluteCommon());
        });

        it('should load nested modules', () => {
            const start = require('./modules/starting-point');
            expect(start.a.package.external).not.toBe(start.a.external)
        });
    });

    describe('Module functions', () => {
        beforeEach(() => {
            loader(/\/modules\/starting-point.js$/, {
                verbose: 2,
                sandboxExternal: true
            });
        });

        afterEach(() => {
            loader.reset();
        });

        it('should have different _compile functions in each sandbox', () => {
            const start = require('./modules/starting-point');
            const a = start.a.getMock();
            const b = start.b.getMock();

            verify(a._compile(anything(), __dirname + '/modules/common.js')).times(1);
            verify(b._compile(anything(), __dirname + '/modules/common.js')).times(1);
        });

        it('should have different _load functions in each sandbox', () => {
            const start = require('./modules/starting-point');
            const a = start.a.getMock();
            const b = start.b.getMock();

            verify(a._load('./common', anything())).times(1);
            verify(b._load('./common', anything())).times(1);
        });

        it('should have different _compile functions in each sandbox for async loading', () => {
            const start = require('./modules/starting-point');
            const a = start.a.getMock();
            const b = start.b.getMock();

            start.a.getOther();
            verify(a._compile(anything(), __dirname + '/modules/other.js')).times(1);
            verify(b._compile(anything(), __dirname + '/modules/other.js')).times(0);

            start.b.getOther();
            verify(a._compile(anything(), __dirname + '/modules/other.js')).times(1);
            verify(b._compile(anything(), __dirname + '/modules/other.js')).times(1);
        });

        it('should have different _load functions in each sandbox for async loading', () => {
            const start = require('./modules/starting-point');
            const a = start.a.getMock();
            const b = start.b.getMock();

            start.a.getOther();
            verify(a._load('./other', anything())).times(1);
            verify(b._load('./other', anything())).times(0);

            start.b.getOther();
            verify(a._load('./other', anything())).times(1);
            verify(b._load('./other', anything())).times(1);
        });
    });
});
