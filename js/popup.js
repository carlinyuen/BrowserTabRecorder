
$(function()
{
	// Button handlers
	$('#screenshotButton').click(takeScreenshot);
	$('#videoButton').click(toggleCaptureVideo);
	$('#createButton').click(createBug);

	// Prevent form submit
	$('form').submit(function(event) {
		event.preventDefault();
	});

    // Check to see if already recording
    chrome.browserAction.getBadgeText({}, function(text) {
        displayRecordVideoButtonPressed(text && text.length);
    });

    // Setup consistent connection with background.js
    var port = chrome.extension.connect({name: "Popup"});
    port.onMessage.addListener(function(message)
    {
        console.log("message:", message);

        switch (message.request)
        {
            case "audio":
                playAudio(message.data);
                break;
            
            case "video":
                break;

            case "captureVideoStarted":
                displayRecordVideoButtonPressed(true);
                break;
            
            case "captureVideoStopped":
                displayRecordVideoButtonPressed(false);
                break;
            
            case "screenshot":
                break;
            
            default:
                console.log("Unknown request received:", message.request);
                break;
        }
    });


    //////////////////////////////////////////////////////////
    // FUNCTIONS
   
    // Play audio
    function playAudio(stream) 
    {
        var audio = new Audio(window.URL.createObjectURL(stream)); 
        audio.play();
    }


    // Take screenshot of active tab
    function takeScreenshot()
    {
        port.postMessage({request: "captureTabScreenshot"});
    }
    
    // Initiate video capture
    function toggleCaptureVideo()
    {        
        var buttonTitle = $('#videoButton').text();
        var request = "captureVideoStart";
        if (buttonTitle == "Stop Recording") {
            request = "captureVideoStop";
        }

        port.postMessage({request: request});
    }

    // Change video recording button text / css based on state
    function displayRecordVideoButtonPressed(show)
    {
        if (show) {
            $('#videoButton').text('Stop Recording');
        } else {
            $('#videoButton').text('Record Video');
        }
    }

    // Create a new bug by using url parameters
    function createBug()
    {
        // TODO
    }
    
    // Save details that have been added so far
    function saveDetails()
    {
        // Collect data
        var data = {
            title: $('#bugTitle').val(),
            description: $('#bugDescription').val(),
            screenshot: null,   // TODO: add screenshot
            video: null,        // TODO: add video
            audio: null,        // TODO: add audio
        };

        // Save
        chrome.storage.local.set(data, function () {
        });
    }

});
