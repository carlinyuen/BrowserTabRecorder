console.log('Initializing Bug-Filer');

$(function()
{
    // Variables
    var IMAGE_CURSOR = 'images/cursor.png'
        , IMAGE_CURSOR_PRESSED = 'images/cursor_pressed.png'
        
        , thumbnail = $(document.createElement('div'))
            .addClass('bug-filer-thumbnail')
            .css({
                'position': 'fixed',
                'right': '16px',
                'bottom': '16px',
                'width': '256px',
                'border': '4px solid #000'
            })
        , cursor = $(document.createElement('div'))
            .addClass('bug-filer-cursor')
            .css({
                'width': '48px',
                'height': '48px',
                'position': 'absolute',
                'z-index': '999',
                'background': '#000',
                //'background': 'url(images/cursor.png) center center no-repeat'
            }).appendTo('body')
        , recording = false
    ;


    /////////////////////////////////////////
    // ACTIONS

    // Listener
    $(document).mousemove(function (event) {
        console.log('mousemove');
        if (recording) {
            console.log('cursor');
            cursor.show().css({
                'top': event.pageY - 24,
                'left': event.pageX - 24
            });
        } else {
            cursor.hide();
        }
    });

    chrome.runtime.onMessage.addListener(function (request, sender, response) 
    {
        switch (request.request)
        {
            case "recordingStarted":
                recording = true;
                break;

            case "recordingStopped":
                recording = false;
                break;

            default:
                break;
        }
    });


    /////////////////////////////////////////
    // FUNCTIONS

    // Create thumbnail from recording source (image / video)
    function createThumbnail(sourceURL)
    {
        // TODO
    }

});
