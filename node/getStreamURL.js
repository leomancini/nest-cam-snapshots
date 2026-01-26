const https = require('https');
const { SECRETS } = require('./config');

async function getStreamURL(accessToken, deviceInfo) {
    if (deviceInfo.STREAM_TYPE !== 'RTSP') {
        return null;
    }

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            command: 'sdm.devices.commands.CameraLiveStream.GenerateRtspStream',
            params: {}
        });

        const options = {
            hostname: 'smartdevicemanagement.googleapis.com',
            port: 443,
            path: `/v1/enterprises/${SECRETS.PROJECT_ID}/devices/${deviceInfo.ID}:executeCommand`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.results && response.results.streamUrls && response.results.streamUrls.rtspUrl) {
                        resolve(response.results.streamUrls.rtspUrl);
                    } else if (response.error) {
                        reject(new Error(`API error: ${response.error.message || JSON.stringify(response.error)}`));
                    } else {
                        reject(new Error(`Unexpected API response: ${body}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse API response: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

module.exports = { getStreamURL };
