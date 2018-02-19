const Module = require('module');
const { mock, instance } = require('ts-mockito');

class MockModule {
    _compile(code, filename) {}
    _load(request, parent) {}
}

const moduleMock = mock(MockModule);

setCompile(instance(moduleMock)._compile);
setLoad(instance(moduleMock)._load);

const common = require('./common');
const package = require('sandboxed-module-loader-test');
const external = require('is-positive');

function getMock() {
    return moduleMock;
}

function getOther() {
    console.log('b.getOther()');
    return require('./other');
}

function getCommon() {
    return require('./common');
}

function setCompile(cb) {
    var original = Module.prototype._compile;
    Module.prototype._compile = function (code, filename) {
        console.log('b._compile', filename);
        cb(code, filename);
        return original.apply(this, arguments);
    };
}

function setLoad(cb) {
    var original = Module._load;
    Module._load = function (request, parent) {
        console.log('b._load', request);
        cb(request, parent);
        return original.apply(this, arguments);
    };
}

module.exports = {
    common, package, external, getCommon, getOther, getMock
};
