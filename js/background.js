/* Required: 
 *  js/third_party/whammy.js
 *  js/third_party/gifshot.min.js
 *  js/videoRecorder.js
 *  js/audioRecorder.js
 */

// Constants
var MANIFEST = chrome.runtime.getManifest();     // Manifest reference
console.log('Initializing Bug-Filer v' + MANIFEST.version, 
        chrome.i18n.getMessage('@@ui_locale'));

// Variables
var popupConnection = null              // Handle for port connection to popup
    , videoConnection = null            // Handle for video capture stream
    , videoRecorder = VideoRecorder     // Reference to video recording object
;


//////////////////////////////////////////////////////////
// ACTIONS

// Load plugins if we have any
backgroundPlugins = Object.keys(BACKGROUND_PLUGINS);
if (backgroundPlugins.length) 
{
    console.log('Background Plugins Loaded:', backgroundPlugins.length);
    for (var i = 0, l = backgroundPlugins.length; i < l; ++i) {
        backgroundPlugins[i] = BACKGROUND_PLUGINS[backgroundPlugins[i]];
    }
    console.log('Loading complete:', backgroundPlugins);
}

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
            case "captureTabScreenshot":
                captureTabScreenshot(message);
                break;

            case "captureTabGif":
                sendMessageToActiveTab(message);
                break;

            case "captureTabVideo":
                sendMessageToActiveTab(message);
                break;

            case "captureTabAudio":
                sendMessageToActiveTab(message);
                break;

            case "getPlugins":
                popupConnection.postMessage({
                    request: "plugins",
                    plugins: JSON.stringify(backgroundPlugins),
                });
                break;

            default:  // For actions & plugins, push to active tab
                sendMessageToActiveTab(message);
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

        case "startGifRecording":
        case "startVideoRecording":
            captureTabVideo(sender.tab);
            break;

        case "stopVideoRecording":
            stopVideoCapture(sender.tab);
            break;

        case "stopGifRecording":
            stopVideoCapture(sender.tab, convertVideoToGif);
            break;

        case "videoRecordingStatus":
            sendResponse({
                request: "recordingStatus",
                stream: videoConnection,
            });
            break;

        case "convertVideoToGif":
            convertVideoToGif(message, sender.tab);
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
function captureTabVideo(senderTab)
{
    console.log("captureTabVideo");

    // Sanity check, can only record one at a time
    if (videoConnection) 
    {
        console.log('ERROR: video stream already exists, cannot capture two at a time!');
        chrome.tabs.sendMessage(senderTab.id, {
            request: 'videoRecordingStarted',
            stream: null
        });
        return;
    }

    // Get video options
    chrome.storage.sync.get(KEY_STORAGE_SETTINGS, function (data) 
    {
        var settings, width, height;

        // Sanity check
        if (chrome.runtime.lastError) 
        {
            console.log(chrome.runtime.lastError);
            settings = {};
        } 
        else {   // Success, update settings
            settings = data[KEY_STORAGE_SETTINGS];
        }

        // Get video dimensions
        console.log('Tab dimensions:', senderTab.width, senderTab.height);
        width = settings[KEY_STORAGE_VIDEO_WIDTH] || DEFAULT_VIDEO_WIDTH;
        height = settings[KEY_STORAGE_VIDEO_HEIGHT] || DEFAULT_VIDEO_HEIGHT;
        console.log('Video dimensions:', width, height);

        // Check if we need to match aspect ratio
        if (settings[KEY_STORAGE_ASPECT_RATIO]) 
        {
            console.log('Adjusting aspect ratio...');
            var fitSize = calculateAspectRatioFit(senderTab.width, senderTab.height, width, height);
            width = Math.ceil(fitSize.width);
            height = Math.ceil(fitSize.height);
            console.log('New size:', width, height);
        }

        // Get video settings
        var videoSettings = {
            mandatory: {
                minWidth: width,
                minHeight: height,
                maxWidth: width,
                maxHeight: height,
                minFrameRate: DEFAULT_VIDEO_FRAME_RATE,
                maxFrameRate: DEFAULT_VIDEO_FRAME_RATE,
                chromeMediaSource: 'tab'
            },
        };

        // Capture only video from the tab
        chrome.tabCapture.capture({
                audio: false,
                video: true,
                videoConstraints: videoSettings
            }, 
            function (localMediaStream) 
            {
                console.log('tabCapture:', localMediaStream);

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
                chrome.tabs.sendMessage(senderTab.id, {
                    request: 'videoRecordingStarted',
                    stream: videoConnection
                });
            }
        );
    });
}

// Stop video capture and build compiled .webm video file
//  If callback DNE, send video to active page, otherwise pass along video to callback
function stopVideoCapture(senderTab, callback)
{
    console.log("stopVideoCapture");

    // Sanity check
    if (!videoConnection) 
    {
        videoConnection = null;
        chrome.tabs.sendMessage(senderTab.id, {
            request: 'videoRecordingStopped',
            sourceURL: null,
        });
        return;
    }

    // Stop video capture and save file
    var videoData = videoRecorder.stop();
    try {
        videoConnection.stop();
    } catch (exception) {
        console.log(exception);
    } finally {
        videoConnection = null;
    }

    // If output was bad, don't continue
    if (!videoData || !videoData.sourceURL) 
    {
        chrome.tabs.sendMessage(senderTab.id, {
            request: 'videoRecordingStopped',
            sourceURL: null,
        });
        return;
    }

    // If callback exists, pass parameters
    if (callback) {
        callback(videoData, senderTab);
    } 
    else    // Pass video to active tab
    {
        chrome.tabs.sendMessage(senderTab.id, {
            request: 'videoRecordingStopped',
            sourceURL: videoData.sourceURL,
        });
    }
}

// Convert video file to gif
function convertVideoToGif(videoData, senderTab)
{
    console.log("convertVideoToGif:", videoData);

    // Santity check
    if (!videoData || !videoData.sourceURL) 
    {
        chrome.tabs.sendMessage(senderTab.id, {
            request: 'convertedGif',
            sourceURL: null,
        });
        return;
    }

    // Get GIF options
    chrome.storage.sync.get(KEY_STORAGE_SETTINGS, function (data) 
    {
        var settings;

        // Sanity check
        if (chrome.runtime.lastError) 
        {
            console.log(chrome.runtime.lastError);
            settings = {};
        } 
        else {   // Success, update settings
            settings = data[KEY_STORAGE_SETTINGS];
        }

        // Collect options
        var frameRate = settings[KEY_STORAGE_GIF_FRAME_RATE] || DEFAULT_GIF_FRAME_RATE;
        console.log('frame rate:', frameRate);

        var quality = settings[KEY_STORAGE_GIF_QUALITY] || DEFAULT_GIF_QUALITY;
        console.log('quality:', quality);

        var options = {
            gifWidth: settings[KEY_STORAGE_VIDEO_WIDTH] || DEFAULT_VIDEO_WIDTH,
            gifHeight: settings[KEY_STORAGE_VIDEO_HEIGHT] || DEFAULT_VIDEO_HEIGHT,
            video: [videoData.sourceURL],
            interval: 1 / frameRate,     
            numFrames: Math.ceil((frameRate / DEFAULT_VIDEO_FRAME_RATE) * videoData.length * frameRate),
            sampleInterval: Math.ceil((GIF_QUALITY_RANGE + 1) - (GIF_QUALITY_RANGE * (quality / 100))),
            numWorkers: 3,
            progressCallback: function (progress) { 
                console.log('GIF progress:', progress); 
            },
            completeCallback: function() {
                console.log('GIF completed!');
            },
        };
        console.log('options:', options);

        // Using gifshot library to generate gif from video
        gifshot.createGIF(options, 
            function (obj) 
            {
                var src = null;
                if (!obj.error) {
                    src = obj.image;    // Set src
                } else {
                    console.log(obj.error);
                }

                // Send message to active tab
                if (senderTab) {
                    chrome.tabs.sendMessage(senderTab.id, {
                        request: 'convertedGif',
                        sourceURL: src
                    });
                }
            });
    });
}

/** Source: http://stackoverflow.com/questions/3971841/how-to-resize-images-proportionally-keeping-the-aspect-ratio
  * Conserve aspect ratio of the orignal region. Useful when shrinking/enlarging
  * images to fit into a certain area.
  *
  * @param {Number} srcWidth Source area width
  * @param {Number} srcHeight Source area height
  * @param {Number} maxWidth Fittable area maximum available width
  * @param {Number} maxHeight Fittable area maximum available height
  * @return {Object} { width, heigth }
  */
function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) 
{
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    console.log('Aspect ratio:', ratio);
    return { width: srcWidth * ratio, height: srcHeight * ratio };
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


