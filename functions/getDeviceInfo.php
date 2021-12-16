<?php
    function getDeviceInfo($deviceName) {
        global $SECRETS;

        foreach ($SECRETS['DEVICES'] as &$DEVICE) {
            if ($DEVICE['NAME'] === $deviceName) {
                return $DEVICE;
            }
        }
    }
?>