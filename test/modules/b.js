const common = require('./common');
const external = require('sandboxed-module-loader-test');

function getCommon() {
    return require('./common');
}

module.exports = {
    common, external, getCommon
};
