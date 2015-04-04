
// Constants
var MANIFEST = chrome.runtime.getManifest();     // Manifest reference
console.log('Initializing Bug-Filer v' + MANIFEST.version, 
        chrome.i18n.getMessage('@@ui_locale'));

// Variables
var videoRecorder = VideoRecorder()
    , audioRecorder = AudioRecorder()
    , videoURL = null
    , audioURL = null
    , screenshotURL = null
    , popupConnection = null          
;


//////////////////////////////////////////////////////////
// ACTIONS

// Listen for events
chrome.extension.onConnect.addListener(function(port) 
{
    console.log("Connected to port:", port);
    popupConnection = port;

    port.onMessage.addListener(function(message) 
    {
	    console.log("message:", message);

        switch (message.request)
        {
            case "getClipboardData":
                port.postMessage({ 
                    request: "pasteFromClipboard", 
                    data: pasteFromClipboard() 
                });
                break;

            case "captureVideoStart":
                port.postMessage({ request: "captureVideoStarted" });
                captureVideo();
                break;

            case "captureVideoStop":
                port.postMessage({ request: "captureVideoStopped" });
                stopVideoCapture();
                break;

            case "captureTabScreenshot":
                port.postMessage({ captureTabScreenshot: true });
                captureTabScreenshot();
                break;

            default:
                console.log("Unknown request received:", request);
                break;
        }
    });
});

// On first install or upgrade
chrome.runtime.onInstalled.addListener(function(details)
{
	console.log("onInstalled: " + details.reason);

    // On first install
	if (details.reason == "install") 
    {
        // Open up options page
        chrome.tabs.create({url: "options.html"});
	}

	// If upgrading to new version number
    else if (details.reason == "update" && details.previousVersion != MANIFEST.version) {
        // TODO
	}
    else    // All other - reloaded extension
    {
        // Run testing if need be
        //runTests();
    }
});

// Show options page when browser action is clicked
//  Source: http://adamfeuer.com/notes/2013/01/26/chrome-extension-making-browser-action-icon-open-options-page/
chrome.browserAction.onClicked.addListener(function(tab) {
   openOrFocusOptionsPage();
});


//////////////////////////////////////////////////////////
// TESTING

function runTests()
{
    /*
    testVersionMismatch(function() {
        // Do nothing
    });
    // */
    /*
    testV170Migration(function() {
        processVersionUpgrade(TEST_OLD_APP_VERSION);
    });
    // */
    /*
    testDataLoss(function() {
        // Do nothing
    });
    // */
}


//////////////////////////////////////////////////////////
// FUNCTIONS

// Get paste contents from clipboard
function pasteFromClipboard()
{
    // Create element to paste content into
	document.querySelector('body').innerHTML += '<textarea id="clipboard"></textarea>';
	var clipboard = document.getElementById('clipboard');
    clipboard.select();

    // Execute paste
	var result;
    if (document.execCommand('paste', true)) {
        result = clipboard.value;
    }

    // Cleanup and return value
	clipboard.parentNode.removeChild(clipboard);
    return result;
}

// Capture screenshot from the current active tab
function captureTabScreenshot()
{
    chrome.tabs.captureVisibleTab(null, {
        format: "png"
    }, 
    function (dataSourceURL) 
    {
        console.log("source:", dataSourceURL);

        // Store if exists
        if (dataSourceURL) {
            screenshotURL = dataSourceURL;
        }
    });
}

// Stop video capture
function stopVideoCapture()
{
    console.log("stopVideoCapture");
    
    displayRecordingState(false);
    //audioRecorder.stop();
    videoRecorder.stop();
}

// Capture video
function captureVideo()
{
    console.log("captureVideo");

    // Capture audio at the same time, can record both
    chrome.tabCapture.capture({
            audio: true,
            video: true,
            videoConstraints: {
                mandatory: {
                    chromeMediaSource: 'tab'
                }
            }
        }, 
        function (localMediaStream) 
        {
            // Set browser action to show we are recording
            displayRecordingState(true);

            // Create video recorder and start recording
            videoRecorder.init(localMediaStream);

            /*
            // Create audio recording and start recording
            audioRecorder.init(localMediaStream);
            audioRecorder.start();

            popupConnection.postMessage({
                request: "audio",
                data: localMediaStream
            });
            */
        });
}

// Capture gif from the current active tab
function captureTabGif()
{
    // TODO
}

// Turn on or off browser action badge to show recording state
function displayRecordingState(show)
{
    if (show) {
        chrome.browserAction.setBadgeText({ text: "REC" });
        chrome.browserAction.setBadgeBackgroundColor({ color: "#F00" });
    } else {
        chrome.browserAction.setBadgeText({ text: "" });
        chrome.browserAction.setBadgeBackgroundColor({ color: [0,0,0,0] });
    }
}

// Opens or focuses on the options page if open
function openOrFocusOptionsPage()
{
    // Get the url for the extension options page
    var optionsUrl = chrome.extension.getURL('options.html'); 
    chrome.tabs.query({ 'url': optionsUrl }, function(tabs) 
    {
        if (tabs.length)    // If options tab is already open, focus on it
        {
            console.log("options page found:", tabs[0].id);
            chrome.tabs.update(tabs[0].id, {"selected": true});
        } 
        else {  // Open the options page otherwise
            chrome.tabs.create({url: optionsUrl});
        }
    });
}


// Audio recording object that will record from a LocalMediaStream into a
//  .wav file that the user can download / save to hdd if desired.
//  Source: http://typedarray.org/from-microphone-to-wav-with-getusermedia-and-web-audio/
function AudioRecorder()
{
    // variables
    var leftchannel = [];
    var rightchannel = [];
    var recorder = null;
    var recording = false;
    var recordingLength = 0;
    var volume = null;
    var audioInput = null;
    var sampleRate = null;
    var audioContext = null;
    var context = null;
    var outputString;

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

        // let's save it locally
        var url = window.URL.createObjectURL(blob);
        var link = window.document.createElement('a');
        link.href = url;
        link.download = 'output.wav';
        var click = document.createEvent("Event");
        click.initEvent("click", true, true);
        link.dispatchEvent(click);
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

    // Exposing functions
    return {
        init: init,
        start: start,
        stop: stop
    };
}

// Video recording object that will record from a LocalMediaStream received 
//  from getUserMedia(), and then collate frames into a .webm video (no audio).
//  Source: https://html5-demos.appspot.com/static/getusermedia/record-user-webm.html
function VideoRecorder()
{
    // Variables
    var video = document.createElement('video'); // offscreen video.
    var canvas = document.createElement('canvas'); // offscreen canvas.
    var rafId = null;
    var startTime = null;
    var endTime = null;
    var frames = [];
    var videoLoaded = false;
    var stream = null;

    // Setup the video recorder, LocalMediaStream parameter from a getUserMedia()
    //  call is required
    function init(localMediaStream) 
    {
        if (!localMediaStream) {
            console.log('ERROR: localMediaStream not defined!');
            return;
        }
        stream = localMediaStream;

        document.querySelector('body').appendChild(video);
        video.autoplay = true;
        video.src = window.URL.createObjectURL(localMediaStream);
        video.onloadedmetadata = function() 
        {
            video.width = video.clientWidth;
            video.height = video.clientHeight;
            canvas.width = video.width;
            canvas.height = video.height;
            videoLoaded = true;
            console.log('video loaded');

            start();
        };
    };

    // Start recording
    function start() 
    {
        console.log('start recording');
        var ctx = canvas.getContext('2d');
        var CANVAS_HEIGHT = canvas.height;
        var CANVAS_WIDTH = canvas.width;

        frames = []; // clear existing frames;
        startTime = Date.now();

        rafId = setInterval(function() 
        {
            ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Read back canvas as webp.
            var url = canvas.toDataURL('image/webp', 1); // image/jpeg is way faster :(
            frames.push(url);

            console.log('recording video');
        }, 25); // 25 = 40hz

        /* requestAnimationFrame() doesn't work with background pages
        function drawVideoFrame_(time) 
        {
            //rafId = requestAnimationFrame(drawVideoFrame_);

            ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Read back canvas as webp.
            var url = canvas.toDataURL('image/webp', 1); // image/jpeg is way faster :(
            frames.push(url);

            console.log('recording video');
        };

        rafId = requestAnimationFrame(drawVideoFrame_);
        */
    };

    // Stop video recording
    function stop() 
    {
        //cancelAnimationFrame(rafId);
        clearInterval(rafId);
        endTime = Date.now();
        stream.stop();

        console.log('frames captured: ' + frames.length + ' => ' +
                ((endTime - startTime) / 1000) + 's video');

        // Sanity check
        if (!frames.length) {
            console.log('ERROR: 0 frames captured!');
            return;
        }

        // our final binary blob
        var blob = Whammy.fromImageArray(frames, 1000 / 60);

        // let's save it locally
        var url = window.URL.createObjectURL(blob);
        var link = window.document.createElement('a');
        link.href = url;
        link.download = 'output.webm';
        var click = document.createEvent("Event");
        click.initEvent("click", true, true);
        link.dispatchEvent(click);
    };

    // Embed video into preview element
    function embedVideoPreview() 
    {
        var url = null;
        var video = $('#video-preview video') || null;
        var downloadLink = $('#video-preview a[download]') || null;

        if (!video) 
        {
            video = document.createElement('video');
            video.autoplay = true;
            video.controls = true;
            video.loop = true;
            //video.style.position = 'absolute';
            //video.style.top = '70px';
            //video.style.left = '10px';
            video.style.width = canvas.width + 'px';
            video.style.height = canvas.height + 'px';
            $('#video-preview').appendChild(video);

            downloadLink = document.createElement('a');
            downloadLink.download = 'capture.webm';
            downloadLink.textContent = '[ download video ]';
            downloadLink.title = 'Download your .webm video';
            var p = document.createElement('p');
            p.appendChild(downloadLink);

            $('#video-preview').appendChild(p);

        } else {
            window.URL.revokeObjectURL(video.src);
        }

        video.src = url;
        downloadLink.href = url;
    }

    // Exposing functions
    return {
        init: init,
        start: start,
        stop: stop
    };
}

