console.log('Initializing Bug-Filer');

$(function()
{
    // Variables & Constants
    var IMAGE_CURSOR = chrome.extension.getURL("images/cursor.png")
        , IMAGE_CURSOR_PRESSED = chrome.extension.getURL('images/cursor_pressed.png')
        , IMAGE_DOWNLOAD = chrome.extension.getURL('images/data-transfer-download-2x.png')
        , IMAGE_RECORD = chrome.extension.getURL('images/media-record-2x.png')
        , IMAGE_STOP_RECORD = chrome.extension.getURL('images/media-stop-2x.png')
        , IMAGE_DELETE = chrome.extension.getURL('images/x-2x.png')
        , WIDTH_CURSOR_IMAGE = 48
        , HEIGHT_CURSOR_IMAGE = 48
        , ID_THUMBNAIL_CONTAINER = 'carlin-bug-filer'
        , CLASS_THUMBNAIL = 'carlin-bug-filer-thumbnail'
        , CLASS_CURSOR_TRACKER = 'carlin-bug-filer-cursor'
        
        // Cursor tracking
        , cursorTracker
        , mousePressed = false

        // Thumbnail handling
        , thumbnailContainer

        // Recording state
        , recording = false
        , videoStream = null    // We only want to have one live one at a time
        , videoThumbnail = null // Track current live video thumbnail
    ;


    /////////////////////////////////////////
    // ACTIONS

    // Listener for mouse movement to show cursor for recording
    $(document).mousemove(function (event) 
    {
        if (recording) 
        {
            cursorTracker.show().css({
                'top': event.pageY - WIDTH_CURSOR_IMAGE / 2,
                'left': event.pageX - HEIGHT_CURSOR_IMAGE / 2,
                'background-image': 'url(' 
                    + (mousePressed ? IMAGE_CURSOR_PRESSED : IMAGE_CURSOR) + ')',
            });
        } 
        else {
            cursorTracker.hide();
        }
    });

    // Listener to track mouse press state
    $(document).mousedown(function (event) {
        mousePressed = true;
    }).mouseup(function (event) {
        mousePressed = false;
    }).mouseout(function (event) {
        mousePressed = false;
    });

    // Listener for messages from background
    chrome.runtime.onMessage.addListener(function (message, sender, response) 
    {
        console.log('sender:', sender);
        console.log('message:', message);

        // Handle message
        switch (message.request)
        {
            case "video":
                createThumbnailContainer();
                createCursorTracker();
                showVideo(message.data);
                break;

            case "screenshot":
                createThumbnailContainer();
                showScreenshot(message.data);
                break;

            default:
                break;
        }
    });


    /////////////////////////////////////////
    // FUNCTIONS
    
    // Create thumbnail container if it doesn't exist
    function createThumbnailContainer()
    {
        if (!thumbnailContainer) {
            thumbnailContainer = $(document.createElement('div'))
                .attr('id', ID_THUMBNAIL_CONTAINER)
                .append($(document.createElement('div')).addClass('background'))
                .appendTo('body')
                .css({ 'height':'0px' });
        }
    }

    // Create cursor tracker if it doesn't exist
    function createCursorTracker()
    {
        if (!cursorTracker) {
            cursorTracker = $(document.createElement('div'))
                .addClass(CLASS_CURSOR_TRACKER)
                .hide()
                .appendTo('body');
        }
    }

    // Show video
    function showVideo(stream)
    {
        console.log('showVideo:');

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

        // Create object url for the video stream
        var url = window.URL.createObjectURL(stream);
        console.log(url);

        // Create video thumbnail and add to document
        videoThumbnail = createThumbnail(url, 'video');
        videoThumbnail.hide().appendTo('#' + ID_THUMBNAIL_CONTAINER).fadeIn('fast');
    }

    // Start video recording
    function startVideoRecording(video)
    {
        // Start recording
        recording = true;
    }

    // Stop video recording
    function stopVideoRecording()
    {
        // Collate into webm video using Whammy.js
        // TODO

        // Set previous video element source to webm file
        // TODO

        // Clear video stream
        videoStream.stop();
        videoStream = null;
        recording = false;
    }

    // Show screenshot
    function showScreenshot(srcURL)
    {
        console.log('showScreenshot:', srcURL);

        var imageThumbnail = createThumbnail(srcURL, 'image');
        imageThumbnail.hide().appendTo(thumbnailContainer);
        thumbnailContainer.animate({ 'height':'auto' }, 'fast', function() {
            imageThumbnail.fadeIn('fast');
        });
    }

    // Creates a thumbnail div from recording source (image / video), and returns it
    function createThumbnail(sourceURL, type)
    {
        // Create base thumbnail div
        var result = $(document.createElement('div')).addClass(CLASS_THUMBNAIL)
            .append($(document.createElement('div')).addClass('border'));
        var container = $(document.createElement('div')).addClass('container')
            .appendTo(result);

        // Add special elements based on content type
        switch (type)
        {
            case "image":
                container.css({ 'background-image': 'url(' + sourceURL + ')' })
                    .append($(document.createElement('img')).attr('src', sourceURL));
                result.append($(document.createElement('button'))
                    .addClass('actionButton')
                    .append($(document.createElement('img')).attr('src', IMAGE_DOWNLOAD))
                    .click(function (event) 
                    {
                        var link = $(document.createElement('a'))
                            .attr('href', sourceURL)
                            .attr('download', 'screenshot.png');
                        var click = document.createEvent("Event");
                        click.initEvent("click", true, true);
                        link.dispatchEvent(click);
                    })
                );
                break;

            case "video":
                container.append($(document.createElement('video')).attr('src', sourceURL));
                result.append($(document.createElement('button'))
                    .addClass('actionButton')
                    .append($(document.createElement('img')).attr('src', IMAGE_RECORD))
                    .click(function (event) 
                    {
                        if (!recording)     // Not yet recording, start recording
                        {
                            startVideoRecording();
                            $(this).find('img').attr('src', IMAGE_STOP_RECORD);
                        }
                        else    // Already recording, stop recording and delete button
                        {
                            stopVideoRecording();
                            $(this).fadeOut('fast', function() {
                                $(this).remove();
                            });
                        }
                    })
                ).append($(document.createElement('button'))
                    .addClass('actionButton')
                    .append($(document.createElement('img')).attr('src', IMAGE_DOWNLOAD))
                    .click(function (event) 
                    {
                        var link = $(document.createElement('a'))
                            .attr('href', sourceURL)
                            .attr('download', 'video.webm');
                        var click = document.createEvent("Event");
                        click.initEvent("click", true, true);
                        link.dispatchEvent(click);
                    })
                );
                break;

            default: break;
        }

        // Add a close button
        result.append($(document.createElement('button'))
            .addClass('closeButton')
            .append($(document.createElement('img')).attr('src', IMAGE_DELETE))
            .click(function (event) 
            {
                var $this = $(this)
                    , $video = $this.siblings('video');

                // Stop video recording if needed
                if ($video.length && recording) {
                    if ($video.attr('src') == videoThumbnail.find('video').attr('src')) {
                        stopVideoRecording();
                    }
                }
                
                // Remove element
                $this.parent().fadeOut('fast', function() {
                    $(this).remove();
                });
            })
        );

        // Return the result
        return result;
    }

});
