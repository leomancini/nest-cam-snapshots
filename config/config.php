<?php
    date_default_timezone_set('America/New_York');

    $PATHS = [
        'FFMPEG_PREFIX' => '',
        'IMAGES' => '../images/'
    ];

    require 'secrets.php';
    require '../functions/getDeviceInfo.php';
    require '../functions/getAccessToken.php';
    require '../functions/getStreamURL.php';
?>