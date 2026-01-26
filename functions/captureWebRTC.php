<?php
    function captureWebRTC($accessToken, $deviceInfo, $outputPath) {
        global $SECRETS, $PATHS;

        $nodeScript = realpath($PATHS['NODE_SCRIPT']);
        $nodeBin = $PATHS['NODE_BIN'];

        $command = sprintf(
            '%s %s %s %s %s %s 2>&1',
            escapeshellarg($nodeBin),
            escapeshellarg($nodeScript),
            escapeshellarg($accessToken),
            escapeshellarg($deviceInfo['ID']),
            escapeshellarg($SECRETS['PROJECT_ID']),
            escapeshellarg($outputPath)
        );

        $output = [];
        $returnCode = 0;
        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            error_log("WebRTC capture failed: " . implode("\n", $output));
            return false;
        }

        return file_exists($outputPath);
    }
?>
