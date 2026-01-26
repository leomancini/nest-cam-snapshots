const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { PATHS, SECRETS } = require('./config');
const { getAccessToken } = require('./getAccessToken');
const { getDeviceInfo } = require('./getDeviceInfo');
const { getStreamURL } = require('./getStreamURL');
const { captureWebRTC } = require('./captureWebRTC');

function formatDate(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

async function saveImage(deviceName) {
    const accessToken = await getAccessToken();
    const deviceInfo = getDeviceInfo(deviceName);

    if (!deviceInfo) {
        console.error(`Device not found: ${deviceName}`);
        return null;
    }

    const outputPath = path.join(PATHS.IMAGES, deviceName, `${formatDate(new Date())}.jpg`);

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (deviceInfo.STREAM_TYPE === 'RTSP') {
        const streamURL = await getStreamURL(accessToken, deviceInfo);
        try {
            execSync(`ffmpeg -y -i "${streamURL}" -vframes 1 ${outputPath}`);
        } catch (error) {
            console.error(`RTSP capture failed for ${deviceName}:`, error.message);
            return null;
        }
    } else if (deviceInfo.STREAM_TYPE === 'WEBRTC') {
        const success = await captureWebRTC(accessToken, deviceInfo, outputPath);
        if (!success) {
            console.error(`WebRTC capture failed for ${deviceName}`);
            return null;
        }
    }

    return fs.existsSync(outputPath) ? outputPath : null;
}

// Main execution
const deviceName = process.argv[2] || 'TATAMI';

saveImage(deviceName)
    .then(result => {
        if (result) {
            console.log(`Snapshot saved: ${result}`);
        } else {
            console.log('Failed to save snapshot');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
