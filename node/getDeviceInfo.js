const { SECRETS } = require('./config');

function getDeviceInfo(deviceName) {
    for (const device of SECRETS.DEVICES) {
        if (device.NAME === deviceName) {
            return device;
        }
    }
    return null;
}

module.exports = { getDeviceInfo };
