
// Constants
var MANIFEST = chrome.runtime.getManifest();     // Manifest reference
console.log('Initializing Bug-Filer v' + MANIFEST.version, 
        chrome.i18n.getMessage('@@ui_locale'));

// Variables
var popupConnection = null;


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
            case "captureTabVideo":
                captureTabVideo();
                break;

            case "captureTabScreenshot":
                captureTabScreenshot();
                break;

            case "emailAutofill":
                // TODO
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
                data: dataSourceURL,
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
                sendMessageToActiveTab({
                    request: 'video',
                    data: localMediaStream,
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


