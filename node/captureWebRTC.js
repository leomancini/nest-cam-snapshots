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

// Full HD target. Nest's WebRTC stream ramps up from 640x360 over ~20s,
// but sometimes stalls below HD — so we retry the whole handshake.
const TARGET_WIDTH = 1920;
const MAX_ATTEMPTS = 3;

// One full WebRTC handshake + frame grab. Returns { buffer, width, height }.
async function attemptCapture(browser, accessToken, deviceInfo) {
    const page = await browser.newPage();
    page.on('console', msg => {
        const text = msg.text();
        if (text.startsWith('[res]')) console.log(text);
    });

    try {
        // Set large viewport for high resolution
        await page.setViewport({ width: 1920, height: 1080 });

        const htmlPath = path.join(__dirname, 'webrtc-client.html');
        await page.goto(`file://${htmlPath}`);

        const offerSdp = await page.evaluate(() => window.initWebRTC());
        const answerSdp = await callNestApi(accessToken, deviceInfo.ID, offerSdp);
        await page.evaluate((answer) => window.setAnswer(answer), answerSdp);

        const result = await page.evaluate(() => window.captureFrame());
        await page.evaluate(() => window.cleanup());

        const base64Data = result.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        return {
            buffer: Buffer.from(base64Data, 'base64'),
            width: result.width,
            height: result.height
        };
    } finally {
        await page.close();
    }
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

        let best = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`Capture attempt ${attempt}/${MAX_ATTEMPTS}...`);
            try {
                const result = await attemptCapture(browser, accessToken, deviceInfo);
                console.log(`Attempt ${attempt}: ${result.width}x${result.height}`);
                if (!best || result.width > best.width) {
                    best = result;
                }
                if (result.width >= TARGET_WIDTH) {
                    break;
                }
            } catch (error) {
                console.error(`Attempt ${attempt} failed: ${error.message}`);
            }
        }

        if (!best) {
            console.error('All capture attempts failed');
            return false;
        }
        if (best.width < TARGET_WIDTH) {
            console.log(`Warning: best capture was ${best.width}x${best.height}, below ${TARGET_WIDTH}px`);
        }

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, best.buffer);
        console.log(`Snapshot saved to: ${outputPath} (${best.width}x${best.height})`);

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
