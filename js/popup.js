
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


    // Listen for events
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
    {
        console.log(request);
        console.log(sender);

        switch (request.request)
        {
            case "audio":
                break;
            
            case "video":
                break;
            
            case "screenshot":
                break;
            
            default:
                console.log("Unknown request received:", request);
                break;
        }
    });


    //////////////////////////////////////////////////////////
    // FUNCTIONS
    
    // Take screenshot of active tab
    function takeScreenshot()
    {
        chrome.runtime.sendMessage({request: "captureTabScreenshot"}, 
            function(response) {
                console.log(response);
            });
    }
    
    // Initiate video capture
    function toggleCaptureVideo()
    {        
        var buttonTitle = $('#videoButton').text();
        var request = "captureVideoStart";
        if (buttonTitle == "Stop Recording") {
            request = "captureVideoStop";
        }

        chrome.runtime.sendMessage({request: request}, 
            function(response) 
            {
                console.log(response);

                if (response["captureVideoStart"]) {
                    $('#videoButton').text('Stop Recording');
                } else {
                    $('#videoButton').text('Record Video');
                }
            });
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
