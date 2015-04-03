
// Constants
var MANIFEST = chrome.runtime.getManifest();     // Manifest reference
console.log('Initializing Bug-Filer v' + MANIFEST.version, 
        chrome.i18n.getMessage('@@ui_locale'));


//////////////////////////////////////////////////////////
// ACTIONS

// Listen for events
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	console.log(request);
	console.log(sender);

	switch (request.request)
	{
		case "getClipboardData":
			sendResponse({ paste: pasteFromClipboard() });
			break;

        case "captureVideoStart":
            sendResponse({ captureVideoStart: true });
            captureVideo(sender.id);
            break;

        case "captureVideoStop":
            sendResponse({ captureVideoStop: true });
            // TODO
            break;

        case "captureTabScreenshot":
            sendResponse({ captureTabScreenshot: true });
            captureTabScreenshot(sender.id);
            break;

		default:
			console.log("Unknown request received:", request);
			break;
	}
});

// On first install or upgrade, make sure to inject into all tabs
chrome.runtime.onInstalled.addListener(function(details)
{
	console.log("onInstalled: " + details.reason);

    // On first install
	if (details.reason == "install") 
    {
        // Open up options page
        chrome.tabs.create({url: "options.html"});

	    // Inject script into all open tabs
		chrome.tabs.query({}, function(tabs)
		{
			console.log("Executing on tabs: ", tabs);
			for (var i = 0, l = tabs.length; i < l; ++i) {
				injectScript(tabs[i]);
			}
		});
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

// Execute our content script into the given tab
function injectScript(tab)
{
	// Insanity check
	if (!tab || !tab.id) {
		console.log("Injecting into invalid tab:", tab);
		return;
	}

	// Loop through content scripts and execute in order
    var contentScripts = MANIFEST.content_scripts[0].js;
    for (var i = 0, l = contentScripts.length; i < l; ++i) {
        chrome.tabs.executeScript(tab.id, {
            file: contentScripts[i]
        });
    }
}

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
function captureTabScreenshot(tabId)
{
    chrome.tabs.captureVisibleTab(null, {
        format: "png"
    }, 
    function (dataSourceURL) 
    {
        // Get source
        var src = dataSourceURL;
        console.log("source:", src);
    });
}

// Capture video
function captureVideo(tabId)
{
    chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab"], 
        function (streamId) 
        {
            // Set browser action to show we are recording
            displayRecordingState(true);

            navigator.getUserMedia({
                    audio: true,
                    video: {
                        optional: [ 
                            { sourceId: streamId }
                        ]
                    }
                }, 
                function (localMediaStream) 
                {
                    // Get source
                    var src = window.URL.createObjectURL(localMediaStream);
                    console.log("source:", src);

                    
                },
                function (error) {
                    console.log('error:', error);
                });
        });
}

// Capture gif from the current active tab
function captureTabGif(tabId)
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
            console.log('recording');
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
        var url = (window.URL || window.webkitURL).createObjectURL(blob);
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

