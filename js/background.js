/* Required: 
 *  js/third_party/whammy.js
 *  js/third_party/gifshot.min.js
 *  js/constants.js
 *  js/videoRecorder.js
 */

// Constants
var MANIFEST = chrome.runtime.getManifest();     // Manifest reference
console.log('Initializing Bug-Filer v' + MANIFEST.version, 
        chrome.i18n.getMessage('@@ui_locale'));
 
// Custom log function
function debugLog() {
    if (DEBUG && console) {
        console.log.apply(console, arguments);
    }
}

// Variables
var popupConnection = null              // Handle for port connection to popup
    , videoConnection = null            // Handle for video capture stream
    , recordedTabID = null              // Tracking recorded tab
    , videoRecorder = VideoRecorder     // Reference to video recording object
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
            case "captureTabScreenshot":
                captureTabScreenshot(message);
                break;

            case "captureTabGif":
                sendMessageToActiveTab(message);
                break;

            case "captureTabVideo":
                sendMessageToActiveTab(message);
                break;

            case "stopVideoRecording":
                stopVideoCapture(message.tabID);
                break;

            case "videoRecordingStatus":
                popupConnection.postMessage({
                    request: "recordingStatus",
                    stream: videoConnection,
                    tabID: recordedTabID,
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
                tabID: recordedTabID,
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
        chrome.tabs.sendMessage(tabs[0].id, message);
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
                
            // Check settings
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

                // If auto download
                if (settings[KEY_STORAGE_AUTO_DOWNLOAD]) {
                    initiateDownload('screenshot - ' + formatDate(new Date()) + '.png', dataSourceURL);
                }
            });
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
        debugLog('Tab dimensions:', senderTab.width, senderTab.height);
        width = settings[KEY_STORAGE_VIDEO_WIDTH] || DEFAULT_VIDEO_WIDTH;
        height = settings[KEY_STORAGE_VIDEO_HEIGHT] || DEFAULT_VIDEO_HEIGHT;
        debugLog('Video dimensions:', width, height);

        // Check if we need to match aspect ratio
        if (settings[KEY_STORAGE_ASPECT_RATIO]) 
        {
            debugLog('Adjusting aspect ratio...');
            var fitSize = calculateAspectRatioFit(senderTab.width, senderTab.height, width, height);
            width = Math.ceil(fitSize.width);
            height = Math.ceil(fitSize.height);
            debugLog('New size:', width, height);
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
                debugLog('tabCapture:', localMediaStream);

                // Send to active tab if capture was successful
                if (localMediaStream)
                {
                    // Store stream for reference
                    videoConnection = localMediaStream;

                    // Start recording
                    if (videoRecorder.start(videoConnection)) 
                    {
                        recordedTabID = senderTab.id;   // Track recorded tab id
                        chrome.browserAction.setBadgeText({
                            text: "REC",
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: "#F00",
                        });
                    }
                    else    // Error starting recording
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

    // Clear recording state
    recordedTabID = null;
    chrome.browserAction.setBadgeText({
        text: "",
    });
    chrome.browserAction.setBadgeBackgroundColor({
        color: "#F00",
    });

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
    if (callback) 
    {
        // Note that video should be removed
        videoData['onComplete'] = function() {
            window.URL.revokeObjectURL(videoData.sourceURL);
        };
        callback(videoData, senderTab);
    } 
    else    // Pass video to active tab
    {
        chrome.tabs.sendMessage(senderTab.id, {
            request: 'videoRecordingStopped',
            sourceURL: videoData.sourceURL,
        });
        
        // Check settings
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

            // If auto download
            if (settings[KEY_STORAGE_AUTO_DOWNLOAD]) {
                initiateDownload('screencapture - ' + formatDate(new Date()) + '.webm', videoData.sourceURL);
            }
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
        var onComplete = videoData['onComplete'];
        var quality = settings[KEY_STORAGE_GIF_QUALITY] || DEFAULT_GIF_QUALITY;
        debugLog('quality:', quality);

        // Don't allow greater frame rate than video, makes no sense anyway
        var frameRate = Math.min(DEFAULT_VIDEO_FRAME_RATE,
            (settings[KEY_STORAGE_GIF_FRAME_RATE] || DEFAULT_GIF_FRAME_RATE));
        debugLog('frame rate:', frameRate);

        // Need to calculate numFrames ahead of time: numFrames == how long we want the
        //  GIF to be, however, if we change the frame interval, this doesn't change
        //  how long the GIF is. GIF length in seconds == numFrames * 0.1 (gifshot default).
        //  So we want to take total length of original video in frames.
        var numFrames = Math.ceil(videoData.length / 0.1);

        var options = {
            gifWidth: settings[KEY_STORAGE_VIDEO_WIDTH] || DEFAULT_VIDEO_WIDTH,
            gifHeight: settings[KEY_STORAGE_VIDEO_HEIGHT] || DEFAULT_VIDEO_HEIGHT,
            video: [videoData.sourceURL],
            interval: 1 / frameRate,
            numFrames: numFrames,
            sampleInterval: Math.ceil((GIF_QUALITY_RANGE + 1) - (GIF_QUALITY_RANGE * (quality / 100))),
            numWorkers: 3,
            progressCallback: function (progress) 
            { 
                debugLog('GIF progress:', progress); 

                // Send progress report back to recorded tab
                chrome.tabs.sendMessage(senderTab.id, {
                    request: 'gifProgress',
                    progress: progress,
                });
            },
        };
        console.log('options:', options);

        // Using gifshot library to generate gif from video
        gifshot.createGIF(options, 
            function (obj) 
            {
                var src = null;
                if (!obj.error) 
                {
                    src = obj.image;    // Set src

                    if (onComplete) {   // Call onComplete function if exists
                        onComplete();
                    }
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
                
                // If auto download
                if (settings[KEY_STORAGE_AUTO_DOWNLOAD]) {
                    initiateDownload('screencapture - ' + formatDate(new Date()) + '.gif', src);
                }
            });
    });
}

// Convert date to a format that is good for downloading
function formatDate(date)
{
    return date.getFullYear() 
        + '.' + ('0' + (date.getMonth() + 1)).slice(-2)  
        + '.' + ('0' + date.getDate()).slice(-2)  
        + '-' + ('0' + date.getHours()).slice(-2)  
        + "_" + ('0' + date.getMinutes()).slice(-2) 
        + '_' + ('0' + date.getSeconds()).slice(-2) 
    ;
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
    debugLog('Aspect ratio:', ratio);
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


