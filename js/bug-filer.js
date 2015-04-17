/* Required: js/config.js */

$(function()
{
    // Variables & Constants
    var IMAGE_CURSOR = chrome.extension.getURL("images/cursor.png")
        , WIDTH_CURSOR_IMAGE = 48
        , HEIGHT_CURSOR_IMAGE = 48
        , TIME_AUTOHIDE_CONTAINER = 2000    // 2s
        , ID_THUMBNAIL_CONTAINER = 'carlin-bug-filer'
        , CLASS_THUMBNAIL = 'carlin-bug-filer-thumbnail'
        , CLASS_CURSOR_TRACKER = 'carlin-bug-filer-cursor'
        , CLASS_SHOW_CONTAINER = 'show'
        , CLASS_DOWNLOAD_TARGET = 'target'
        , CLASS_BUTTON_DOWNLOAD = 'downloadButton'
        , CLASS_BUTTON_RECORD = 'recordButton'
        , CLASS_BUTTON_CLOSE = 'closeButton'
        , CLASS_CURRENTLY_RECORDING = 'recording'
        , cursorTracker = null              // Reference to cursor tracker element
        , thumbnailContainer = null         // Reference to thumbnail container
        , thumbnailHideTimer = null         // Timer handle for autohiding container
        , recording = false                 // Recording state
        , selectedThumbnail = null          // Track current live video thumbnail
    ;


    /////////////////////////////////////////
    // ACTIONS

    // Listener for mouse movement to show cursor for recording
    $(document).on('mousemove scroll', function (event) 
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

            case "captureTabGif":
                createThumbnailContainer();
                createCursorTracker();
                createGifThumbnail();
                break;

            case "videoRecordingStarted":
                videoRecordingStarted(message.stream);
                break;

            case "videoRecordingStopped":
                videoRecordingStopped(message.sourceURL);
                break;

            case "convertedGif":
                convertedGif(message.sourceURL);
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

    // Initialize bug-filer
    init();


    /////////////////////////////////////////
    // FUNCTIONS
    
    // Initialize the extension script
    function init() 
    {
        checkRecordingState(function (status) 
        {
            if (status && status.stream) 
            {
                createThumbnailContainer();
                createCursorTracker();
                selectedThumbnail = createVideoThumbnail();
                videoRecordingStarted(status.stream);
            }
        });
    }

    // Check recording state of background page, callback param is video stream
    function checkRecordingState(callback)
    {
        chrome.runtime.sendMessage({
            request: "videoRecordingStatus"
        }, callback);
    }

    // Create thumbnail container if it doesn't exist
    function createThumbnailContainer()
    {
        // If DNE, create it
        if (!thumbnailContainer) 
        {
            thumbnailContainer = $(document.createElement('div'))
                .attr('id', ID_THUMBNAIL_CONTAINER)
                .mouseenter(function (event) {
                    clearAutohideTimer();
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
                .animate({ 'bottom':'-12px' }, 'fast');
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

        // Clear autohide timer, we want user to see they need to hit record
        if (thumbnailHideTimer) {
            clearTimeout(thumbnailHideTimer);
        }

        try
        {
            // Create video thumbnail and add to document
            var thumb = createThumbnail('video')
                .hide()
                .appendTo(thumbnailContainer)
                .slideDown('fast');

            // If container is not showing yet, show it permanently
            thumbnailContainer.addClass(CLASS_SHOW_CONTAINER);

            return thumb;
        }
        catch (exception) {   // If there's errors, stop recording
            console.log(exception);
        }

        return null;
    }

    // Create a container for the video
    function createGifThumbnail()
    {
        console.log('createGifThumbnail()');

        // Clear autohide timer, we want user to see they need to hit record
        if (thumbnailHideTimer) {
            clearTimeout(thumbnailHideTimer);
        }

        try
        {
            // Create video thumbnail and add to document
            var thumb = createThumbnail('gif')
                .hide()
                .appendTo(thumbnailContainer)
                .slideDown('fast');

            // If container is not showing yet, show it permanently
            thumbnailContainer.addClass(CLASS_SHOW_CONTAINER);

            return thumb;
        }
        catch (exception) {   // If there's errors, stop recording
            console.log(exception);
        }

        return null;
    }

    // Start video recording
    function startVideoRecording($target)
    {
        console.log('startVideoRecording:', $target);

        // Track which video thumbnail is being recorded
        if ($target) {
            selectedThumbnail = $target.parents('.' + CLASS_THUMBNAIL);
        }
        
        // Adjust request based on gif vs video
        var request = (selectedThumbnail.find('img.gif').length) 
            ? 'startGifRecording' : 'startVideoRecording'

        // Tell background page to start recording
        chrome.runtime.sendMessage({ request: request });
    }

    // Video recording started
    function videoRecordingStarted(stream)
    {
        console.log('videoRecordingStarted:', stream);

        // Sanity check
        if (stream) 
        {
            // If selectedThumbnail exists, change record button
            if (selectedThumbnail) 
            {
                selectedThumbnail.find('.' + CLASS_BUTTON_RECORD)
                    .addClass(CLASS_CURRENTLY_RECORDING);
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
        console.log('stopVideoRecording');

        // Adjust request based on gif vs video
        var request = (selectedThumbnail.find('img.gif').length) 
            ? 'stopGifRecording' : 'stopVideoRecording'

        // Tell background page to stop recording
        chrome.runtime.sendMessage({ request: request });
    }

    // UI changes to indicate recording is over
    function recordingStoppedInterfaceUpdate()
    {
        // Remove / hide recording button, show download button
        if (selectedThumbnail)
        {
            selectedThumbnail.find('.' + CLASS_BUTTON_RECORD)
                .fadeOut('fast', function() {
                    $(this).remove();
                });
            selectedThumbnail.find('.' + CLASS_BUTTON_DOWNLOAD)
                .fadeIn('fast');
        }

        // Hide cursor tracker
        cursorTracker.fadeOut('fast');

        // Set recording state to false
        recording = false;
    }

    // Video recording stopped
    function videoRecordingStopped(sourceURL)
    {
        console.log('videoRecordingStopped:', sourceURL);

        // UI changes for stopped recording
        recordingStoppedInterfaceUpdate();

        // Sanity check
        if (!sourceURL)
        {
            console.log('Error recording video file from video feed!');
            alert('Error recording video file from video feed!');

            // Clear reference to selected video thumbnail
            selectedThumbnail = null;
            return;
        }

        // Check that video thumbnail exists still
        if (!selectedThumbnail)
        {
            console.log('Could not find video element on page. Attempting to download!');
            alert('Could not find video element on page. Attempting to download!');

            // Try to download
            chrome.runtime.sendMessage({
                request: 'downloadContent',
                filename: 'screencapture - ' + formatDate(new Date()) + '.webm',
                contentURL: sourceURL,
            });

            return;
        }

        // Generate local url and set video element source to webm file
        var thumb = selectedThumbnail;
        createLocalObjectURL(sourceURL, function (url) 
        {
            thumb.find('video')
                .attr('src', url)                   
                .on('loadedmetadata', function() {
                    $(this).hover(function(event) {
                        $(this).attr('controls', true); // Show controls
                    }, function (event) {
                        $(this).attr('controls', false); // Hide controls
                    });
                })
                .on('error', function() 
                {
                    // Tell user preview not available, but can download
                    alert('Preview not available, but you can still download the video!');
                    console.log('WARNING: preview not available due to content security policy, but can still download.');

                    // TODO: put up an image in the thumbnail
                });
        });
    
        // Clear reference
        selectedThumbnail = null;
    }

    // Update thumbnail with converted gif from video
    function convertedGif(sourceURL)
    {
        console.log('convertedGif:', sourceURL);

        // UI changes for stopped recording
        recordingStoppedInterfaceUpdate();

        // Sanity check
        if (!sourceURL)
        {
            console.log('Error converting video to gif!');
            alert('Error converting video to gif!');

            // Clear reference to selected video thumbnail
            selectedThumbnail = null;
            return;
        }

        // Check that video thumbnail exists still
        if (!selectedThumbnail) 
        {
            console.log('Could not find video element on page. Attempting to download!');
            alert('Could not find video element on page. Attempting to download!');

            // Try to download
            chrome.runtime.sendMessage({
                request: 'downloadContent',
                filename: 'screencapture - ' + formatDate(new Date()) + '.gif',
                contentURL: sourceURL,
            });

            return;
        }

        // Switch out video with img pointed to gif
        selectedThumbnail.find('video')
            .replaceWith($(document.createElement('img'))
                .addClass('gif')
                .attr('src', sourceURL)
            );
        selectedThumbnail.find('.' + CLASS_BUTTON_DOWNLOAD)
            .off('click')
            .click(function (event) 
            {
                chrome.runtime.sendMessage({
                    request: 'downloadContent',
                    filename: 'screencapture - ' + $(this).attr('date') + '.gif',
                    contentURL: $(this).parent().find('img.gif').attr('src'),
                });
            });

        // Clear reference
        selectedThumbnail = null;
    }

    // Create screenshot container element
    function createScreenshotThumbnail(srcURL)
    {
        console.log('createScreenshotThumbnail:', srcURL);

        // Create image thumbnail container
        var thumb = createThumbnail('image', srcURL)
            .hide()
            .appendTo(thumbnailContainer)
            .slideDown('fast')
            .find('.' + CLASS_BUTTON_DOWNLOAD).show();

        // If container is not showing yet, show it temporarily
        if (!thumbnailContainer.hasClass(CLASS_SHOW_CONTAINER)) 
        {
            thumbnailContainer.addClass(CLASS_SHOW_CONTAINER);
            autohideThumbnailContainer();
        }

        return thumb;
    }

    // Clear autohide timer
    function clearAutohideTimer()
    {
        // Clear autohide timer
        if (thumbnailHideTimer) 
        {
            clearTimeout(thumbnailHideTimer);
            thumbnailHideTimer = null;
        }
    }

    // Set thumbnail container for autohide, will refresh the timer if exists
    function autohideThumbnailContainer()
    {
        // Clear timer
        clearAutohideTimer();

        // Set new autohide timer
        thumbnailHideTimer = setTimeout(function() {
            thumbnailContainer.removeClass(CLASS_SHOW_CONTAINER);
        }, TIME_AUTOHIDE_CONTAINER);
    }

    // Convert date to a format that is good for downloading
    function formatDate(date)
    {
        return date.getFullYear() 
            + '.' + ('0' + (date.getMonth() + 1)).slice(-2)  
            + '.' + ('0' + date.getDate()).slice(-2)  
            + '-' + ('0' + date.getHours()).slice(-2)  
            + "_" + ('0' + date.getMinutes()).slice(-2) 
            + '_' + ('0' + date.getSeconds()).slice(-2) 
        ;
    }

    // Download and generate url for a local extension resource blob
    //  Mostly for us to get the videos across
    function createLocalObjectURL(sourceURL, callback)
    {
        console.log('createLocalObjectURL:', sourceURL);

        // Generate xhr and get url for resource
        //  Source: https://developer.chrome.com/apps/app_external
        var x = new XMLHttpRequest();
        x.open('GET', sourceURL);
        x.responseType = 'blob';
        x.onload = function() 
        {
            var url = window.URL.createObjectURL(x.response);
            console.log('localObjectURL:', url);

            callback(url);  // Callback must exist
        };
        x.send();
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
                        .attr('title', 'screenshot - ' + formatDate(new Date()) + '.png')
                        .addClass(CLASS_DOWNLOAD_TARGET)
                        .addClass('screenshot')
                        .attr('src', sourceURL)
                    );
                break;

            case "video":
                container.append($(document.createElement('video'))
                    .attr('title', 'screencapture - ' + formatDate(new Date()) + '.webm')
                    .addClass(CLASS_DOWNLOAD_TARGET)
                    .attr('autoplay', true)
                ).append($(document.createElement('button'))    // Add record button
                    .addClass(CLASS_BUTTON_RECORD)
                    .click(function (event) 
                    {
                        if (!recording) {    // Not yet recording, start recording
                            startVideoRecording($(this));
                        } else {   // Already recording, stop recording
                            stopVideoRecording($(this));
                        }
                    })
                );
                break;

            case "gif":
                container.append($(document.createElement('img'))
                    .attr('title', 'screencapture - ' + formatDate(new Date()) + '.gif')
                    .addClass(CLASS_DOWNLOAD_TARGET)
                    .addClass('gif')
                ).append($(document.createElement('button'))    // Add record button
                    .addClass(CLASS_BUTTON_RECORD)
                    .click(function (event) 
                    {
                        if (!recording) {    // Not yet recording, start recording
                            startVideoRecording($(this));
                        } else {   // Already recording, stop recording
                            stopVideoRecording($(this));
                        }
                    })
                );
                break;

            default: break;
        }

        // Add a download button
        result.append($(document.createElement('button'))
            .addClass(CLASS_BUTTON_DOWNLOAD)
            .hide()     // Hide it first, show it after recording is done
            .click(function (event) 
            {
                var $target = $(this).parent().find('.' + CLASS_DOWNLOAD_TARGET);

                // Sanity Check
                if (!$target.length) 
                {
                    console.log('ERROR: no target download found!');
                    alert("Couldn't find target download!");
                    return;
                }

                // Send message with target src and title
                chrome.runtime.sendMessage({
                    request: 'downloadContent',
                    filename: $target.attr('title'),
                    contentURL: $target.attr('src'),
                });
            })
        );

        // Add a close button
        result.append($(document.createElement('button'))
            .addClass(CLASS_BUTTON_CLOSE)
            .click(function (event) 
            {
                var $this = $(this);

                // Stop video recording if needed
                if (recording) 
                {
                    if ($this.sibling('.recordButton').hasClass(CLASS_CURRENTLY_RECORDING))
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
