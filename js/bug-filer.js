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
        , videoRecorder = null
        , videoStream = null    // We only want to have one live one at a time
        , videoThumbnail = null // Track current live video thumbnail
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
                showVideo(message.stream);
                break;

            case "screenshot":
                createThumbnailContainer();
                showScreenshot(message.sourceURL);
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
                    // Clear autohide
                    if (thumbnailHideTimer) 
                    {
                        clearTimeout(thumbnailHideTimer);
                        thumbnailHideTimer = null;
                    }
                })
                .append($(document.createElement('div')).addClass('tab')
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
        if (!thumbnailContainer.hasClass(CLASS_SHOW_CONTAINER)) {
            thumbnailContainer.css({ 'bottom':'-24px' })
                .animate({ 'bottom':'-10px' }, 'fast');
        }
    }

    // Create cursor tracker if it doesn't exist
    function createCursorTracker()
    {
        // Create it if it doesn't exist
        if (!cursorTracker) {
            cursorTracker = $(document.createElement('div'))
                .addClass(CLASS_CURSOR_TRACKER);
        }

        // Add to body and hide
        cursorTracker.hide().appendTo('body');
    }

    // Show video
    function showVideo(stream)
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

            // Create video source url
            var sourceURL = window.webkitURL.createObjectURL(stream);
            console.log("sourceURL:", sourceURL);

            // Create video thumbnail and add to document
            videoThumbnail = createThumbnail(sourceURL, 'video');
            videoThumbnail.hide().appendTo(thumbnailContainer).slideDown('fast');

            // If container is not showing yet, show it permanently
            thumbnailContainer.addClass(CLASS_SHOW_CONTAINER);
        }
        catch (exception)   // If there's errors, stop recording
        {
            console.log(exception);
            videoStream = stream = null;
        }
    }

    // Start video recording
    function startVideoRecording(video)
    {
        // Hide container
        thumbnailContainer.removeClass('show');
        
        // Start recording
        recording = true;
        videoRecorder = window.VideoRecorder;
        videoRecorder.init(videoStream);
    }

    // Stop video recording
    function stopVideoRecording()
    {
        // Get video source url
        var url = videoRecorder.stop();

        // Set video element source to webm file
        var oldURL = videoThumbnail.find('video').attr('src');
        window.URL.revokeObjectURL(oldURL);
        videoThumbnail.find('video').attr('src', url);

        // Clear video stream and recorder
        videoRecorder = null;
        videoStream = null;
        recording = false;
    }

    // Show screenshot
    function showScreenshot(srcURL)
    {
        console.log('showScreenshot:', srcURL);

        var imageThumbnail = createThumbnail(srcURL, 'image');
        imageThumbnail.hide().appendTo(thumbnailContainer).slideDown('fast');

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
                container.append($(document.createElement('video')).attr('src', sourceURL));
                result.append($(document.createElement('button'))
                    .addClass('recordButton')
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
                var $this = $(this)
                    , $video = $this.siblings('video');

                // Stop video recording if needed
                if ($video.length && recording) {
                    if ($video.attr('src') == videoThumbnail.find('video').attr('src')) {
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
