
/////////////////////////////////////////////////////////////////////////////
// Records audio from a LocalMediaStream into a .wav file
//  Source: http://typedarray.org/from-microphone-to-wav-with-getusermedia-and-web-audio/
window.AudioRecorder = (function()
{
    // Variables
    var leftchannel = []
        , rightchannel = []
        , recorder = null
        , recording = false
        , recordingLength = 0
        , volume = null
        , audioInput = null
        , sampleRate = null
        , audioContext = null
        , context = null
        , recordedAudioURL = null
    ;

    // Setup the audio recorder, LocalMediaStream parameter from a getUserMedia()
    //  call is required
    function init(localMediaStream)
    {
        if (!localMediaStream) {
            console.log('ERROR: localMediaStream not defined!');
            return;
        }

        // creates the audio context
        context = new window.AudioContext();

        // we query the context sample rate (varies depending on platforms)
        sampleRate = context.sampleRate;

        console.log('succcess');

        // creates a gain node
        volume = context.createGain();

        // creates an audio node from the microphone incoming stream
        audioInput = context.createMediaStreamSource(localMediaStream);

        // connect the stream to the gain node
        audioInput.connect(volume);

        /* From the spec: This value controls how frequently the audioprocess event is 
           dispatched and how many sample-frames need to be processed each call. 
           Lower values for buffer size will result in a lower (better) latency. 
           Higher values will be necessary to avoid audio breakup and glitches */
        var bufferSize = 2048;
        recorder = context.createScriptProcessor(bufferSize, 2, 2);

        recorder.onaudioprocess = function(e) 
        {
            if (!recording) {
                return;
            }

            var left = e.inputBuffer.getChannelData (0);
            var right = e.inputBuffer.getChannelData (1);

            // we clone the samples
            leftchannel.push (new Float32Array (left));
            rightchannel.push (new Float32Array (right));
            recordingLength += bufferSize;
            console.log('recording audio');
        }

        // we connect the recorder
        volume.connect(recorder);
        recorder.connect(context.destination); 
    }

    // Start recording
    function start()
    {
        recording = true;

        // reset the buffers for the new recording
        leftchannel.length = rightchannel.length = 0;
        recordingLength = 0;
    }

    // Stop recording
    function stop()
    {
        // we stop recording
        recording = false;

        // we flat the left and right channels down
        var leftBuffer = mergeBuffers ( leftchannel, recordingLength );
        var rightBuffer = mergeBuffers ( rightchannel, recordingLength );
        // we interleave both channels together
        var interleaved = interleave ( leftBuffer, rightBuffer );

        // we create our wav file
        var buffer = new ArrayBuffer(44 + interleaved.length * 2);
        var view = new DataView(buffer);

        // RIFF chunk descriptor
        writeUTFBytes(view, 0, 'RIFF');
        view.setUint32(4, 44 + interleaved.length * 2, true);
        writeUTFBytes(view, 8, 'WAVE');
        // FMT sub-chunk
        writeUTFBytes(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        // stereo (2 channels)
        view.setUint16(22, 2, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 4, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        // data sub-chunk
        writeUTFBytes(view, 36, 'data');
        view.setUint32(40, interleaved.length * 2, true);

        // write the PCM samples
        var lng = interleaved.length;
        var index = 44;
        var volume = 1;
        for (var i = 0; i < lng; i++){
            view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
            index += 2;
        }

        // our final binary blob
        var blob = new Blob ( [ view ], { type : 'audio/wav' } );
        recordedAudioURL = window.URL.createObjectURL(blob);
    }

    function interleave(leftChannel, rightChannel)
    {
        var length = leftChannel.length + rightChannel.length;
        var result = new Float32Array(length);

        var inputIndex = 0;

        for (var index = 0; index < length; ){
            result[index++] = leftChannel[inputIndex];
            result[index++] = rightChannel[inputIndex];
            inputIndex++;
        }
        return result;
    }

    function mergeBuffers(channelBuffer, recordingLength)
    {
        var result = new Float32Array(recordingLength);
        var offset = 0;
        var lng = channelBuffer.length;
        for (var i = 0; i < lng; i++){
            var buffer = channelBuffer[i];
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }

    function writeUTFBytes(view, offset, string)
    { 
        var lng = string.length;
        for (var i = 0; i < lng; i++){
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // Download last recorded audio
    function download()
    {
        console.log("AudioRecorder : download()");

        // Create download link
        var link = window.document.createElement('a');
        link.href = recordedAudioURL;
        link.download = 'audio.wav';

        // Fire off fake click to trigger download
        var click = document.createEvent("Event");
        click.initEvent("click", true, true);
        link.dispatchEvent(click);
    }

    // Exposing functions
    return {
        init: init,
        start: start,
        stop: stop
    };
})();
