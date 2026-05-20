const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { SECRETS } = require('./config');

// Find system browser (Chrome/Chromium) - works on macOS and Ubuntu
function findBrowser() {
    const possiblePaths = [
        // macOS Chrome
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        // macOS Chromium
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        // Linux Chrome
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        // Linux Chromium
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        // Common alternative locations
        '/usr/local/bin/chromium',
        '/usr/local/bin/chrome',
    ];

    for (const browserPath of possiblePaths) {
        if (fs.existsSync(browserPath)) {
            return browserPath;
        }
    }

    // Try using 'which' command as fallback
    try {
        const chromium = execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf8' }).trim();
        if (chromium && fs.existsSync(chromium)) {
            return chromium;
        }
    } catch (e) {
        // Ignore
    }

    throw new Error('No Chrome/Chromium browser found. Please install chromium-browser (Ubuntu) or Google Chrome (macOS).');
}

async function callNestApi(accessToken, deviceId, offerSdp) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            command: 'sdm.devices.commands.CameraLiveStream.GenerateWebRtcStream',
            params: { offerSdp: offerSdp }
        });

        const options = {
            hostname: 'smartdevicemanagement.googleapis.com',
            port: 443,
            path: `/v1/enterprises/${SECRETS.PROJECT_ID}/devices/${deviceId}:executeCommand`,
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
                    if (response.results && response.results.answerSdp) {
                        resolve(response.results.answerSdp);
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

async function captureWebRTC(accessToken, deviceInfo, outputPath) {
    let browser;
    try {
        const browserPath = findBrowser();
        console.log(`Using browser: ${browserPath}`);

        browser = await puppeteer.launch({
            executablePath: browserPath,
            headless: 'new',
            args: [
                '--use-fake-ui-for-media-stream',
                '--autoplay-policy=no-user-gesture-required',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        page.on('console', msg => {
            const text = msg.text();
            if (text.startsWith('[res]')) console.log(text);
        });

        // Set large viewport for high resolution
        await page.setViewport({ width: 1920, height: 1080 });

        // Load the WebRTC client HTML
        const htmlPath = path.join(__dirname, 'webrtc-client.html');
        console.log('Loading WebRTC client...');
        await page.goto(`file://${htmlPath}`);

        // Initialize WebRTC and get offer SDP
        console.log('Generating SDP offer...');
        const offerSdp = await page.evaluate(() => window.initWebRTC());

        // Call Nest API with offer, get answer
        console.log('Calling Nest API...');
        const answerSdp = await callNestApi(accessToken, deviceInfo.ID, offerSdp);

        const videoSection = answerSdp.split(/^m=/m).find(s => s.startsWith('video'));
        if (videoSection) {
            const interesting = ('m=' + videoSection).split(/\r?\n/)
                .filter(l => /^(m=|b=|a=fmtp:|a=rtpmap:|a=imageattr:)/.test(l));
            console.log('[sdp] answer video lines:\n' + interesting.map(l => '  ' + l).join('\n'));
        }

        // Set the answer SDP to establish connection
        console.log('Setting SDP answer...');
        await page.evaluate((answer) => window.setAnswer(answer), answerSdp);

        // Wait for video and capture frame (with bandwidth adaptation for high resolution)
        console.log('Waiting for video stream...');
        const dataUrl = await page.evaluate(() => window.captureFrame());

        const diagnostics = await page.evaluate(() => window.getDiagnostics());
        console.log(diagnostics);

        // Cleanup WebRTC connection
        await page.evaluate(() => window.cleanup());

        // Convert data URL to buffer and save
        const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Ensure output directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);
        console.log(`Snapshot saved to: ${outputPath}`);

        return true;
    } catch (error) {
        console.error('Error:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { captureWebRTC };
