<?php
    date_default_timezone_set('America/New_York');

    $PATHS = [
        'FFMPEG_PREFIX' => '',
        'IMAGES' => '../images/',
        'NODE_SCRIPT' => __DIR__ . '/../node/captureSnapshot.js',
        'NODE_BIN' => '/Users/leo/.nvm/versions/node/v20.19.3/bin/node'
    ];

    require 'secrets.php';
    require '../functions/getDeviceInfo.php';
    require '../functions/getAccessToken.php';
    require '../functions/getStreamURL.php';
    require '../functions/captureWebRTC.php';
?>