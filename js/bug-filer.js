/* Required: js/config.js */

$(function()
{
    // Variables & Constants
    var IMAGE_CURSOR = chrome.extension.getURL("images/cursor.png")
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

        // Thumbnail handling
        , thumbnailContainer = null
        , thumbnailHideTimer = null

        // Recording state
        , recording = false
        , currentVideoThumbnail = null  // Track current live video thumbnail
    ;


    /////////////////////////////////////////
    // ACTIONS

    // Listener for mouse movement to show cursor for recording
    $(document).mousemove(function (event) 
    {
        if (cursorTracker && recording) 
        {
            cursorTracker.css({
                'top': event.pageY - WIDTH_CURSOR_IMAGE / 2,
                'left': event.pageX - HEIGHT_CURSOR_IMAGE / 2,
            });
        }
    });

    // Listener for messages from background
    chrome.runtime.onMessage.addListener(function (message, sender, response) 
    {
        console.log('sender:', sender);
        console.log('message:', message);

        // Handle message
        switch (message.request)
        {
            case "captureTabVideo":
                createThumbnailContainer();
                createCursorTracker();
                createVideoThumbnail();
                break;

            case "captureTabScreenshot":
                createThumbnailContainer();
                createScreenshotThumbnail(message.sourceURL);
                break;

            case "emailAutofill":
                autofillFromEmail(message.fields);
                break;

            case "cloneBug":
                cloneFromBuganizer();
                break;

            default: 
                console.log("Unknown request received!");
                break;
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
        }, videoRecordingStarted);
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

            // Show cursor tracker
            cursorTracker.fadeIn('fast');
            
            // Set recording to true
            recording = true;
        }
        else    // Error
        {
            console.log('ERROR: invalid video stream or already recording another tab!');
            alert('Unable to capture tab video feed or already recording another tab!');
        }
    }

    // Stop video recording
    function stopVideoRecording()
    {
        // Tell background page to stop recording
        chrome.runtime.sendMessage({
            request: 'stopVideoRecording',
        }, videoRecordingStopped);
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

        // Hide cursor tracker
        cursorTracker.fadeOut('fast');

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
            console.log('Error recording video file from video feed!');
            alert('Error recording video file from video feed!');
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

    // Convert date to a format that is good for downloading
    function formatDate(date)
    {
        return date.getFullYear() + '.' + (date.getMonth() + 1) + '.' + date.getDate()
            + '-' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds();
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
                    .append($(document.createElement('img'))
                        .addClass('screenshot')
                        .attr('src', sourceURL));
                result.append($(document.createElement('button'))
                    .addClass('downloadButton')
                    .attr('date', formatDate(new Date()))
                    .append($(document.createElement('img')).attr('src', IMAGE_DOWNLOAD))
                    .click(function (event) 
                    {
                        chrome.runtime.sendMessage({
                            request: 'downloadContent',
                            filename: 'screenshot - ' + $(this).attr('date') + '.png',
                            contentURL: $(this).parent().find('img.screenshot').attr('src'),
                        });
                    })
                );
                break;

            case "video":
                container.append($(document.createElement('video'))
                    .attr('autoplay', true));
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
                    .attr('date', formatDate(new Date()))
                    .append($(document.createElement('img')).attr('src', IMAGE_DOWNLOAD))
                    .click(function (event) 
                    {
                        chrome.runtime.sendMessage({
                            request: 'downloadContent',
                            filename: 'screencapture - ' + $(this).attr('date') + '.webm',
                            contentURL: $(this).parent().find('video').attr('src'),
                        });
                    })
                );
                break;

            case "gif":
                container.append($(document.createElement('img'))
                    .addClass('gif'));
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
                    .attr('date', formatDate(new Date()))
                    .append($(document.createElement('img')).attr('src', IMAGE_DOWNLOAD))
                    .click(function (event) 
                    {
                        chrome.runtime.sendMessage({
                            request: 'downloadContent',
                            filename: 'screencapture - ' + $(this).attr('date') + '.gif',
                            contentURL: $(this).parent().find('img.gif').attr('src'),
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

    // Autofill bug fields in popup from email
    //  param fields is a object with fields to store data into
    function autofillFromEmail(fields)
    {
        var domain = window.location.host
            , error = false;

        // Check that we are on some email client
        if (DOMAIN_GMAIL_REGEX.test(domain)) 
        {
            // TODO collect data from email and append to fields

        } 
        else if (DOMAIN_INBOX_REGEX.test(domain)) 
        {
            // TODO collect data from email and append to fields
        }
        else    // Error
        {
            error = true;
            console.log('ERROR: Not currently on email page!');
            alert('Not currently on an email page!');
        }

        // Save data to local storage
        chrome.storage.local.set(fields, function() 
        {
            if (chrome.runtime.lastError) 
            {
                console.log(chrome.runtime.lastError);
                alert('Could not collect autofill data from email.');
            } 
            else {	// Success, update popup
                chrome.runtime.sendMessage({request: "updatePopup"});
            }
        });
    }

    // Clone a bug from Google's Buganizer
    function cloneFromBuganizer()
    {
        // Check that we are on Buganizer
        if (DOMAIN_BUGANIZER_REGEX.test(window.location.host)) 
        {
            // TODO get data from the various fields
            var params = {};
            
            // Fire off bug creation using URL parameters
            var url = [URL_BUG_API_CREATE, '?', $.param(params)].join('');
            console.log(url);
            chrome.tabs.create({ url: url });
        } 
        else    // Error
        {
            console.log('ERROR: Not currently on Buganizer page!');
            alert('Not currently on a Buganizer issue page!');
        }
    }

});
