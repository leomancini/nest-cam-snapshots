<?php
    chdir(dirname(__FILE__)); // To make relative paths work by setting base directory when running on command line

    require '../config/config.php';

    function saveImage($deviceName) {
        global $PATHS;

        $accessToken = getAccessToken();

        $deviceInfo = getDeviceInfo($deviceName);

        $streamURL = getStreamURL($accessToken, $deviceInfo);

        if ($deviceInfo['STREAM_TYPE'] === 'RTSP') {
            exec($PATHS['FFMPEG_PREFIX'].'ffmpeg -y -i "'.$streamURL.'" -vframes 1 '.$PATHS['IMAGES'].$deviceName.'/'.date('Y-m-d-H-i').'.jpg');
        } else if ($deviceInfo['STREAM_TYPE'] === 'WEBRTC') {
            // TODO: Figure out how to use ffmpeg to pull a snapshot from a WebRTC stream as well
        }
    }

    saveImage('SKYLINE');
    
    // TODO: Finish using GenerateWebRtcStream for Next Cam Indoor
    // https://developers.google.com/nest/device-access/traits/device/camera-live-stream?authuser=1#generatewebrtcstream
    // var_dump(saveImage('LIVING_ROOM_WINDOW'));
?>