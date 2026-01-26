<?php
    chdir(dirname(__FILE__)); // To make relative paths work by setting base directory when running on command line

    require '../config/config.php';

    function saveImage($deviceName) {
        global $PATHS;

        $accessToken = getAccessToken();
        $deviceInfo = getDeviceInfo($deviceName);

        $outputPath = realpath($PATHS['IMAGES']) . '/' . $deviceName . '/' . date('Y-m-d-H-i') . '.jpg';

        // Ensure output directory exists
        $dir = dirname($outputPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if ($deviceInfo['STREAM_TYPE'] === 'RTSP') {
            $streamURL = getStreamURL($accessToken, $deviceInfo);
            exec($PATHS['FFMPEG_PREFIX'].'ffmpeg -y -i "'.$streamURL.'" -vframes 1 '.$outputPath);
        } else if ($deviceInfo['STREAM_TYPE'] === 'WEBRTC') {
            $success = captureWebRTC($accessToken, $deviceInfo, $outputPath);
            if (!$success) {
                echo "WebRTC capture failed for $deviceName\n";
                return null;
            }
        }

        return file_exists($outputPath) ? $outputPath : null;
    }

    saveImage('TATAMI');
?>