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
        , TIME_AUTOHIDE_CONTAINER = 2000    // 2s
        , ID_THUMBNAIL_CONTAINER = 'carlin-bug-filer'
        , CLASS_THUMBNAIL = 'carlin-bug-filer-thumbnail'
        , CLASS_CURSOR_TRACKER = 'carlin-bug-filer-cursor'
        , CLASS_SHOW_CONTAINER = 'show'
        
        // Cursor tracking
        , cursorTracker = null
        , mousePressed = false

        // Thumbnail handling
        , thumbnailContainer = null
        , thumbnailHideTimer = null

        // Recording state
        , recording = false
        , recordingFrameHandle = null
        , currentVideoThumbnail = null  // Track current live video thumbnail
    ;


    /////////////////////////////////////////
    // ACTIONS

    // Listener for mouse movement to show cursor for recording
    $(document).mousemove(function (event) 
    {
        if (cursorTracker) 
        {
            if (recording) 
            {
                cursorTracker.show().css({
                    'top': event.pageY - WIDTH_CURSOR_IMAGE / 2,
                    'left': event.pageX - HEIGHT_CURSOR_IMAGE / 2,
                });
            } 
            else {
                cursorTracker.hide();
            }
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
                createVideoThumbnail();
                break;

            case "screenshot":
                createThumbnailContainer();
                createScreenshotThumbnail(message.sourceURL);
                break;

            case "videoRecordingStarted":
                videoRecordingStarted(message.stream);
                break;

            case "videoRecordingStopped":
                videoRecordingStopped(message.sourceURL);
                break;

            case "emailAutofill":
                // TODO
                break;

            case "cloneBug":
                // TODO
                break;

            default: break;
        }
    });


    /////////////////////////////////////////
    // FUNCTIONS
    
    // Create thumbnail container if it doesn't exist
    function createThumbnailContainer()
    {
        // If DNE, create it
        if (!thumbnailContainer) 
        {
            thumbnailContainer = $(document.createElement('div'))
                .attr('id', ID_THUMBNAIL_CONTAINER)
                .mouseenter(function (event) 
                {
                    if (thumbnailHideTimer) // Clear autohide
                    {
                        clearTimeout(thumbnailHideTimer);
                        thumbnailHideTimer = null;
                    }
                })
                .append($(document.createElement('div')).addClass('tab')
                    .mouseenter(function (event) 
                    {
                        var container = $('#' + ID_THUMBNAIL_CONTAINER);
                        if (!container.hasClass(CLASS_SHOW_CONTAINER)) {
                            container.addClass(CLASS_SHOW_CONTAINER);
                        }
                    })
                    .click(function (event) {
                        $('#' + ID_THUMBNAIL_CONTAINER).toggleClass(CLASS_SHOW_CONTAINER);
                    })
                )
                .append($(document.createElement('div')).addClass('background'));
        }


        // Add to body
        if (!thumbnailContainer.parent().length) {
            thumbnailContainer.appendTo('body');
        }

        // Animate
        if (!thumbnailContainer.hasClass(CLASS_SHOW_CONTAINER)) 
        {
            thumbnailContainer.css({ 'bottom':'-24px' })
                .animate({ 'bottom':'-10px' }, 'fast');
        }
    }

    // Create cursor tracker if it doesn't exist
    function createCursorTracker()
    {
        // Create it if it doesn't exist
        if (!cursorTracker) 
        {
            cursorTracker = $(document.createElement('div'))
                .addClass(CLASS_CURSOR_TRACKER);
        }

        // Add to body and hide
        cursorTracker.hide().appendTo('body');
    }

    // Create a container for the video
    function createVideoThumbnail()
    {
        console.log('createVideoThumbnail()');

        try
        {
            // Create video thumbnail and add to document
            createThumbnail('video')
                .hide()
                .appendTo(thumbnailContainer)
                .slideDown('fast');

            // If container is not showing yet, show it permanently
            thumbnailContainer.addClass(CLASS_SHOW_CONTAINER);
        }
        catch (exception) {   // If there's errors, stop recording
            console.log(exception);
        }
    }

    // Start video recording
    function startVideoRecording($target)
    {
        // Track which video thumbnail is being recorded
        if ($target) {
            currentVideoThumbnail = $target.parents('.' + CLASS_THUMBNAIL);
        }

        // Tell background page to start recording
        chrome.runtime.sendMessage({
            request: 'startVideoRecording',
        });
    }

    // Video recording started
    function videoRecordingStarted(stream)
    {
        // Sanity check
        if (stream) 
        {
            // If currentVideoThumbnail exists, change record button
            if (currentVideoThumbnail) 
            {
                currentVideoThumbnail.find('.recordButton img')
                    .attr('src', IMAGE_STOP_RECORD);
            }

            // Hide container
            thumbnailContainer.removeClass('show');
            
            // Set recording to true
            recording = true;
        }
        else    // Error
        {
            console.log('ERROR: invalid video stream!');
            alert('Unable to capture tab video feed.');
        }
    }

    // Stop video recording
    function stopVideoRecording()
    {
        // Tell background page to stop recording
        chrome.runtime.sendMessage({
            request: 'stopVideoRecording',
        });
    }

    // Video recording stopped
    function videoRecordingStopped(sourceURL)
    {
        // Remove / hide recording button on thumbnail if exists
        if (currentVideoThumbnail)
        {
            currentVideoThumbnail.find('.recordButton')
                .fadeOut('fast', function() {
                    $(this).remove();
                });
            currentVideoThumbnail = null;
        }

        // Set recording state to false
        recording = false;

        // Sanity check
        if (sourceURL)
        {
            // Set video element source to webm file
            currentVideoThumbnail.find('video')
                .attr('src', sourceURL);
        }
        else    // Error
        {
            console.log('Error creating video file from video feed!');
            alert('Error creating video file from video feed!');
        }
    }

    // Create screenshot container element
    function createScreenshotThumbnail(srcURL)
    {
        console.log('createScreenshotThumbnail:', srcURL);

        // Create image thumbnail container
        createThumbnail('image', srcURL)
            .hide()
            .appendTo(thumbnailContainer)
            .slideDown('fast');

        // If container is not showing yet, show it temporarily
        if (!thumbnailContainer.hasClass(CLASS_SHOW_CONTAINER)) 
        {
            thumbnailContainer.addClass(CLASS_SHOW_CONTAINER);
            thumbnailHideTimer = setTimeout(function() {
                thumbnailContainer.removeClass(CLASS_SHOW_CONTAINER);
            }, TIME_AUTOHIDE_CONTAINER);
        }
    }

    // Creates a thumbnail div from recording source (image / video), and returns it
    function createThumbnail(type, sourceURL)
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
                    .addClass('downloadButton')
                    .append($(document.createElement('img')).attr('src', IMAGE_DOWNLOAD))
                    .click(function (event) 
                    {
                        chrome.runtime.sendMessage({
                            request: 'downloadContent',
                            filename: 'screenshot.png',
                            contentURL: sourceURL,
                        });
                    })
                );
                break;

            case "video":
                container.append($(document.createElement('video'))
                    .attr('autoplay', true);
                result.append($(document.createElement('button'))
                    .addClass('recordButton')
                    .append($(document.createElement('img')).attr('src', IMAGE_RECORD))
                    .click(function (event) 
                    {
                        if (!recording) {    // Not yet recording, start recording
                            startVideoRecording($(this));
                        } else {   // Already recording, stop recording
                            stopVideoRecording($(this));
                        }
                    })
                ).append($(document.createElement('button'))
                    .addClass('downloadButton')
                    .append($(document.createElement('img')).attr('src', IMAGE_DOWNLOAD))
                    .click(function (event) 
                    {
                        chrome.runtime.sendMessage({
                            request: 'downloadContent',
                            filename: 'video.webm',
                            contentURL: sourceURL,
                        });
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
                var $this = $(this);

                // Stop video recording if needed
                if (recording) 
                {
                    if ($this.sibling('.recordButton').find('img').attr('src') == IMAGE_STOP_RECORD) 
                    {
                        console.log('closing currently recording video!');
                        stopVideoRecording();
                    }
                }
                
                // Remove element
                $this.parent().slideUp('fast', function() 
                {
                    // Delete entire thumbnail
                    $(this).remove();

                    // If there are no more thumbnails, hide container
                    if (!$('div.' + CLASS_THUMBNAIL).length) {
                        thumbnailContainer.removeClass(CLASS_SHOW_CONTAINER).detach();
                    }
                });
            })
        );

        // Return the result
        return result;
    }

});
