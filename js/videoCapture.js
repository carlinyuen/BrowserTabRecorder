// Required: js/third_party/whammy.js

/////////////////////////////////////////////////////////////////////////////
// Records video / frames from a LocalMediaStream, and then uses Whammy.js
//  to collate frames into a .webm video (no audio) for user consumption
//  Source: https://html5-demos.appspot.com/static/getusermedia/record-user-webm.html
window.VideoRecorder = (function()
{
    // Variables
    var video = null;
    var canvas = document.createElement('canvas'); // offscreen canvas.
    var rafId = null;
    var startTime = null;
    var endTime = null;
    var frames = [];
    var videoLoaded = false;
    var stream = null;

    // Setup the video recorder, LocalMediaStream parameter from a getUserMedia()
    //  call is required
    function init(localMediaStream, optionalVideo) 
    {
        if (!localMediaStream) {
            console.log('ERROR: localMediaStream not defined!');
            return;
        }
        stream = localMediaStream;

        if (!optionalVideo) {
            video = document.createElement('video'); // offscreen video.
        }

        document.querySelector('body').appendChild(video);
        video.autoplay = true;
        video.src = window.URL.createObjectURL(localMediaStream);
        video.onloadedmetadata = function() 
        {
            video.width = video.clientWidth;
            video.height = video.clientHeight;
            canvas.width = video.width;
            canvas.height = video.height;
            videoLoaded = true;
            console.log('video loaded');

            start();
        };
    };

    // Start recording
    function start() 
    {
        console.log('start recording');
        var ctx = canvas.getContext('2d');
        var CANVAS_HEIGHT = canvas.height;
        var CANVAS_WIDTH = canvas.width;

        frames = []; // clear existing frames;
        startTime = Date.now();

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

    // Stop video recording
    function stop() 
    {
        cancelAnimationFrame(rafId);
        clearInterval(rafId);
        endTime = Date.now();
        stream.stop();

        console.log('frames captured: ' + frames.length + ' => ' +
                ((endTime - startTime) / 1000) + 's video');

        // Sanity check
        if (!frames.length) {
            console.log('ERROR: 0 frames captured!');
            return;
        }

        // our final binary blob
        var blob = Whammy.fromImageArray(frames, 1000 / 60);

        // let's save it locally
        var url = window.URL.createObjectURL(blob);

        /*
        var link = window.document.createElement('a');
        link.href = url;
        link.download = 'output.webm';
        var click = document.createEvent("Event");
        click.initEvent("click", true, true);
        link.dispatchEvent(click);
        */

        return url;
    };

    // Embed video into preview element
    function embedVideoPreview() 
    {
        var url = null;
        var video = $('#video-preview video') || null;
        var downloadLink = $('#video-preview a[download]') || null;

        if (!video) 
        {
            video = document.createElement('video');
            video.autoplay = true;
            video.controls = true;
            video.loop = true;
            video.style.width = canvas.width + 'px';
            video.style.height = canvas.height + 'px';
            $('#video-preview').appendChild(video);

            downloadLink = document.createElement('a');
            downloadLink.download = 'capture.webm';
            downloadLink.textContent = '[ download video ]';
            downloadLink.title = 'Download your .webm video';
            var p = document.createElement('p');
            p.appendChild(downloadLink);

            $('#video-preview').appendChild(p);

        } else {
            window.URL.revokeObjectURL(video.src);
        }

        video.src = url;
        downloadLink.href = url;
    }

    // Exposing functions
    return {
        init: init,
        start: start,
        stop: stop
    };
})();

