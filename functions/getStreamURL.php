<?php
    function getStreamURL($accessToken, $deviceInfo) {
        global $SECRETS;

        if ($deviceInfo['STREAM_TYPE'] === 'RTSP') {
            $data = '{
                "command" : "sdm.devices.commands.CameraLiveStream.GenerateRtspStream",
                "params" : {}
            }';
        } else if ($deviceInfo['STREAM_TYPE'] === 'WEBRTC') {
            $offerSDP = file_get_contents('../data/offerSdp.txt');

            $data = '{
                "command" : "sdm.devices.commands.CameraLiveStream.GenerateWebRtcStream",
                "params" : {
                    "offerSdp" : "'.$offerSDP.'"}
                }';
        }

        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => 'https://smartdevicemanagement.googleapis.com/v1/enterprises/'.$SECRETS['PROJECT_ID'].'/devices/'.$deviceInfo['ID'].':executeCommand',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_HTTPHEADER => array(
                'Authorization: Bearer '.$accessToken,
                'Content-Type: application/json'
            )
        ));

        $response = curl_exec($curl);

        $parsedResponse = json_decode($response);

        if ($deviceInfo['STREAM_TYPE'] === 'RTSP') {
            $streamURL = $parsedResponse->results->streamUrls->rtspUrl;
        } else if ($deviceInfo['STREAM_TYPE'] === 'WEBRTC') {
            $streamURL = null; // TODO: Figure out how to get a stream URL from WebRTC answer sdp
        }

        return $streamURL;
    }
?>