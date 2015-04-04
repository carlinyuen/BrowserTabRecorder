
$(function()
{
	// Button handlers
	$('#screenshotButton').click(takeScreenshot);
	$('#videoButton').click(toggleCaptureVideo);
	$('#emailButton').click(autofillFromEmail);
	$('#createButton').click(createBug);

	// Prevent form submit
	$('form').submit(function(event) {
		event.preventDefault();
	});

    // Focus on title field
    $('#bugTitle').focus();

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

    // Fill title / description from email
    function autofillFromEmail()
    {
        // TODO
    }

    // Create a new bug by using url parameters
    function createBug()
    {
        // Collect all data
        var params = {
            title: $('#bugTitle').val(), 
            description: $('#bugDescription').val(),
        };

        // Get defaults set from options
        chrome.storage.local.get("defaults", function (data)
        {
            if (false) {   
                // TODO: check errors
            }
            else if (data) 
            {
                params.priority = data.priority;
                params.severity = data.severity;
                params.type = data.type;
            }
            else {
                console.log('no defaults set!')
            }
        
            // TODO: fire off bug creation using URL parameters
        });
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
