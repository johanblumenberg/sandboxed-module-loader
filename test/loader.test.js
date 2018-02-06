const expect = require('expect');
const path = require('path');
const loader = require('..');

const testClearCachePaths = [ 'starting-point.js', 'a.js', 'b.js' ].map(file => path.join(__dirname, 'modules', file));

afterEach(() => {
    testClearCachePaths.forEach(file => delete require.cache[file]);
});

describe('Loading modules', () => {

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
});

describe('Loading local modules', () => {

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
});
