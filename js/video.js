// Required: js/config.js

$(function()
{
    // Variables & Constants
    var videoStream = null;

    // Listener for messages from background
    chrome.runtime.onMessage.addListener(function (message, sender, response) 
    {
        console.log('sender:', sender);
        console.log('message:', message);

        // Handle message
        switch (message.request)
        {
            case "videoURL":
                showVideo(message.stream, message.sourceURL);
                break;

            default: break;
        }
    });

    // When ready, let background page know
    chrome.runtime.sendMessage({
        request: "videoURL"
    });
    
    //////////////////////////////////////////////////////////
    // FUNCTIONS

    // Show video
    function showVideo(stream, sourceURL)
    {
        console.log('showVideo:');

        try
        {
            // Sanity check
            if (!stream) 
            {
                console.log('ERROR: invalid video stream!');
                alert('Unable to capture tab video feed.');
            }

            // Only allow one instance
            if (videoStream) 
            {
                console.log('ERROR: cannot have two simultaneously active video streams!');
                alert('Video capture already initiated on this tab!');
            }
            else {
                videoStream = stream;
            }

            // Generate video source url
            //  -- DOES NOT WORK, gives error about no instance of function found
            var sourceURL = window.webkitURL.createObjectURL(stream);
            console.log("sourceURL:", sourceURL);

            // Create video thumbnail and add to document
            $('#video').attr('src', sourceURL);
        }
        catch (exception)   // If there's errors, stop recording
        {
            console.log(exception);
            videoStream = null;
        }
    }


});
