const common = require('./common');
const external = require('sandboxed-module-loader-test');

function getCommon() {
    return require('./common');
}

function getAbsoluteCommon() {
    return require(__dirname + '/common');
}

module.exports = {
    common, external, getCommon, getAbsoluteCommon
};
