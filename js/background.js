
// Constants
var MANIFEST = chrome.runtime.getManifest();     // Manifest reference
console.log('Initializing Bug-Filer v' + MANIFEST.version, 
        chrome.i18n.getMessage('@@ui_locale'));

// Variables
var popupConnection = null;


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
                captureTabVideo();
                break;

            case "captureTabScreenshot":
                captureTabScreenshot();
                break;

            case "emailAutofill":
                sendMessageToActiveTab({ request: 'emailAutofill' });
                break;

            case "cloneBug":
                sendMessageToActiveTab({ request: 'cloneBug' });
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
        chrome.tabs.create({url: "options.html"});  // Open up options page
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
function captureTabScreenshot()
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
            sendMessageToActiveTab({
                request: 'screenshot',
                sourceURL: dataSourceURL,
            });
        } 
        else    // Failed
        {
            console.log("ERROR: could not capture screenshot")
            console.log(chrome.runtime.lastError);
        }
    });
}

// Capture video
function captureTabVideo()
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
            // Send to active tab if capture was successful
            if (localMediaStream)
            {
                // Inject libraries for video / audio capture
                chrome.tabs.executeScript(null, {
                        file: 'js/videoCapture.js'
                    }, 
                    function (result) 
                    {
                        console.log('inject videoCapture.js result:', result);
                        var sourceURL = window.webkitURL.createObjectURL(localMediaStream);

                        // Send to active tab
                        sendMessageToActiveTab({
                            request: 'video',
                            stream: localMediaStream,
                            sourceURL: sourceURL,
                        });
                    });
            }
            else    // Failed
            {
                console.log("ERROR: could not capture video")
                console.log(chrome.runtime.lastError);
            }
        });
}

// Capture gif from the current active tab
function captureTabGif()
{
    // TODO
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


