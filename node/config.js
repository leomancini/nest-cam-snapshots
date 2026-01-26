const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Set timezone for date formatting
process.env.TZ = 'America/New_York';

const PATHS = {
    IMAGES: path.join(__dirname, '..', 'images')
};

const SECRETS = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REFRESH_TOKEN: process.env.REFRESH_TOKEN,
    PROJECT_ID: process.env.PROJECT_ID,
    DEVICES: [
        {
            NAME: process.env.DEVICE_NAME,
            ID: process.env.DEVICE_ID,
            STREAM_TYPE: 'WEBRTC'
        }
    ]
};

module.exports = { PATHS, SECRETS };
