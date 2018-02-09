const common = require('./common');
const package = require('sandboxed-module-loader-test');
const external = require('is-positive');

function getCommon() {
    return require('./common');
}

module.exports = {
    common, package, external, getCommon
};
