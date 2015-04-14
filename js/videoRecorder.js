// Required: js/third_party/whammy.js

/////////////////////////////////////////////////////////////////////////////
// Records video / frames from a LocalMediaStream, and then uses Whammy.js
//  to collate frames into a .webm video (no audio) for user consumption
//  Source: https://html5-demos.appspot.com/static/getusermedia/record-user-webm.html
window.VideoRecorder = (function()
{
    // Variables
    var video = document.createElement('video')     // offscreen video
        , canvas = document.createElement('canvas') // offscreen canvas
        , rafId = null                  // Handle for animation request function
        , startTime = null              // Timer to track recording length
        , endTime = null                // Timer to track recording length
        , stream = null                 // Reference to video stream to record from
        , frames = []                   // Storage for video frames captured
        , recordedVideoURL = null       // Source url for last recorded video
    ;

    // Initialize recorder
    init();


    // Setup the video recorder
    function init() 
    {
        document.querySelector('body').appendChild(video);
        video.autoplay = true;
        video.onloadedmetadata = function() 
        {
            video.width = video.clientWidth;
            video.height = video.clientHeight;
            canvas.width = video.width;
            canvas.height = video.height;
            console.log('video loaded');

            // Begin recording
            record();
        };
    };

    // Start recording off the LocalMediaStream parameter from a getUserMedia()
    function start(localMediaStream) 
    {
        console.log('VideoRecorder : start()');

        if (!localMediaStream) 
        {
            console.log('ERROR: localMediaStream not defined!');
            return false;
        } 
        else if (stream)    // Can't record more than one
        {
            console.log('ERROR: already recording another video!');
            return false;
        }
        else {
            stream = localMediaStream;
        }

        // Set video source to begin loading video
        video.src = window.URL.createObjectURL(localMediaStream);

        return true;
    }

    // Begin actual recording of video frames
    function record()
    {
        console.log('VideoRecorder : record()');

        var ctx = canvas.getContext('2d');
        var CANVAS_HEIGHT = canvas.height;
        var CANVAS_WIDTH = canvas.width;

        frames = []; // clear existing frames;
        startTime = Date.now();

        // Frame redraw function
        function drawVideoFrame(time) 
        {
            rafId = requestAnimationFrame(drawVideoFrame);

            ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Read back canvas as webp.
            frames.push(canvas.toDataURL('image/webp', 1)); // image/jpeg is way faster :(
        };

        rafId = requestAnimationFrame(drawVideoFrame);

        /*
        rafId = setInterval(function() 
        {
            ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Read back canvas as webp.
            var url = canvas.toDataURL('image/webp', 1); // image/jpeg is way faster :(
            frames.push(url);

        }, 25); // 25 = 40hz
        */
    };

    // Stop video recording and return source URL for compiled webm video
    function stop() 
    {
        console.log('VideoRecorder : stop()');

        // Stop recording
        cancelAnimationFrame(rafId);
        //clearInterval(rafId);
        endTime = Date.now();

        // Clean up stream
        stream.stop();
        stream = null;

        console.log('frames captured: ' + frames.length + ' => ' +
                ((endTime - startTime) / 1000) + 's video');

        // Sanity check
        if (!frames.length) {
            console.log('ERROR: 0 frames captured!');
            return null;
        }

        // Compile our final binary video blob and create a source URL to it
        var videoBlob = Whammy.fromImageArray(frames, 1000 / 60);
        recordedVideoURL = window.URL.createObjectURL(videoBlob);
        console.log('sourceURL:', sourceURL);

        // Cleanup
        frames = [];

        return sourceURL;
    };

    // Download last recorded video
    function download()
    {
        console.log("VideoRecorder : download()");

        // Create download link
        var link = window.document.createElement('a');
        link.href = recordedVideoURL;
        link.download = 'video.webm';

        // Fire off fake click to trigger download
        var click = document.createEvent("Event");
        click.initEvent("click", true, true);
        link.dispatchEvent(click);
    }

    // Exposing functions
    return {
        start: start,
        stop: stop
    };
})();

