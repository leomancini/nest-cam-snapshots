const https = require('https');
const { SECRETS } = require('./config');

async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            client_id: SECRETS.CLIENT_ID,
            client_secret: SECRETS.CLIENT_SECRET,
            refresh_token: SECRETS.REFRESH_TOKEN,
            grant_type: 'refresh_token'
        });

        const options = {
            hostname: 'www.googleapis.com',
            port: 443,
            path: `/oauth2/v4/token?${params.toString()}`,
            method: 'POST',
            headers: {
                'Content-Length': 0
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error(`Failed to get access token: ${body}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse token response: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

module.exports = { getAccessToken };
