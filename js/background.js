/* Required: 
 *  js/third_party/whammy.js
 *  js/third_party/gifshot.min.js
 *  js/videoRecorder.js
 *  js/audioRecorder.js
 */

var MANIFEST = chrome.runtime.getManifest();     // Manifest reference
console.log('Initializing Bug-Filer v' + MANIFEST.version, 
        chrome.i18n.getMessage('@@ui_locale'));

// Variables
var popupConnection = null              // Handle for port connection to popup
    , videoConnection = null            // Handle for video capture stream
    , videoRecorder = VideoRecorder()   // Reference to video recording object
;


//////////////////////////////////////////////////////////
// ACTIONS

// Listen for events from popup
chrome.extension.onConnect.addListener(function(port) 
{
    console.log("Connected to port:", port);
    popupConnection = port;

    port.onMessage.addListener(function(message) 
    {
	    console.log("message:", message);

        switch (message.request)
        {
            case "captureTabVideo":
                sendMessageToActiveTab(message);
                break;

            case "captureTabScreenshot":
                captureTabScreenshot(message);
                break;

            case "emailAutofill":
                sendMessageToActiveTab(message);
                break;

            case "cloneBug":
                sendMessageToActiveTab(message);
                break;

            default:
                console.log("Unknown request received!");
                break;
        }
    });
});

// Listen for events from content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) 
{
    console.log('sender:', sender);
    console.log('message:', message.request);

    // Handle message
    switch (message.request)
    {  
        case "downloadContent":
            initiateDownload(message.filename, message.contentURL);
            break;

        case "startVideoRecording":
            captureTabVideo(sendResponse);
            break;

        case "stopVideoRecording":
            stopVideoCapture(sendResponse);
            break;

        case "videoRecordingStatus":
            sendResponse(videoConnection);
            break;

        case "updatePopup":     // Tell popup to update its fields
            if (popupConnection) {
                popupConnection.postMessage({request: "update"});
            }
            break;

        default:
            console.log("Unknown request received!");
            break;
    }
});

// On first install or upgrade
chrome.runtime.onInstalled.addListener(function(details)
{
	console.log("onInstalled: " + details.reason);

    // On first install
	if (details.reason == "install") {
        //chrome.tabs.create({url: "options.html"});  // Open up options page
	}

	// If upgrading to new version number
    else if (details.reason == "update" && details.previousVersion != MANIFEST.version) {
        // Do nothing?
	}

    // All other - probably reloaded extension
    else {
        //runTests();
    }
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
}


//////////////////////////////////////////////////////////
// FUNCTIONS

// Send message to active tab
function sendMessageToActiveTab(message)
{
    console.log('sendMessageToActiveTab:', message);

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
            console.log('response:', response);
        });
    });
}

// Capture screenshot from the current active tab
function captureTabScreenshot(data)
{
    console.log('captureTabScreenshot');

    chrome.tabs.captureVisibleTab(null, {
        format: "png"
    }, 
    function (dataSourceURL) 
    {
        console.log("source:", dataSourceURL);

        // Send to active tab if capture was successful
        if (dataSourceURL) 
        {
            data.sourceURL = dataSourceURL;
            sendMessageToActiveTab(data);
        } 
        else    // Failed
        {
            console.log("ERROR: could not capture screenshot")
            console.log(chrome.runtime.lastError);
        }
    });
}

// Capture video stream of tab, will pass stream back to sendResponse()
function captureTabVideo(sendResponse)
{
    console.log("captureTabVideo");

    // Sanity check, can only record one at a time
    if (videoConnection) 
    {
        sendResponse(null);     // Send back nothing
        return;
    }

    // Capture only video from the tab
    chrome.tabCapture.capture({
            audio: false,
            video: true,
            videoConstraints: {
                mandatory: {
                    chromeMediaSource: 'tab'
                }
            }
        }, 
        function (localMediaStream) 
        {
            // Send to active tab if capture was successful
            if (localMediaStream)
            {
                // Store stream for reference
                videoConnection = localMediaStream;

                // Start recording
                if (!videoRecorder.start(videoConnection))
                {
                    console.log('ERROR: could not start video recorder');
                    videoConnection = null;
                }
            }
            else    // Failed
            {
                console.log("ERROR: could not capture video stream")
                console.log(chrome.runtime.lastError);
                videoConnection = null;
            }

            // Send to response
            sendResponse(videoConnection);
        });
}

// Stop video capture and build compiled .webm video file
//  If callback DNE, send video to sendResponse(), otherwise pass along video
function stopVideoCapture(callback, sendResponse)
{
    // Sanity check
    if (!videoConnection) 
    {
        videoConnection = null;
        sendResponse(null);     // Send back nothing
        return;
    }

    // Stop video capture and save file
    var videoSourceURL = videoRecorder.stop();

    // If output was bad, don't continue
    if (!videoSourceURL) 
    {
        sendResponse(null);
        return;
    }

    // If callback exists, pass parameters, otherwise send response back
    if (callback) {
        callback(videoSourceURL, sendResponse);
    } else {
        sendResponse(videoSourceURL);
    }
}

// Capture gif from the current active tab
function captureTabGif(videoSourceURL, sendResponse)
{
    // Using gifshot library to generate gif from video
    gifshot.createGIF({
            'video': [videoSourceURL]
        }, 
        function (obj) 
        {
            if (!obj.error) {   // Pass along image src
                sendResponse(obj.image);
            } else {            // Error, send back null
                console.log(obj.error);
                sendResponse(null);
            }
        });
}

// Initiate download of something
function initiateDownload(filename, contentURL)
{
    console.log('initiateDownload:', filename);

    // Create download link
    var link = document.createElement('a');
    link.href = contentURL;
    link.download = filename;

    // Create fake click
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
}


