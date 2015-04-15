
// Global Configuration Constants
var URL_BUG_API_CREATE = 'https://b2.corp.google.com/issues/new'   // Bug creation api
    , DOMAIN_BUGANIZER_REGEX = /(buganizer|b).corp.google.com\/issues\/\d+/
    , DOMAIN_GMAIL_REGEX = /mail.google.com/
    , DOMAIN_INBOX_REGEX = /inbox.google.com/

    // Check content security policy (CSP) on page
    , CSP = (function() 
        {
            var video = document.createElement('video');
            video.src = location.protocol + '//example.com/';
            video.muted = true;
            video.setAttribute('onload', "this.src = ''; alert('hello');");
            document.body.appendChild(video);
            setTimeout(function() 
            {
                CSP = (video.src == '');                // Check if CSP stopped src change
                console.log('CSP enabled:', CSP);       // Print to console
                //video.parentNode.removeChild(video);    // Clean-up test video element
            }, 250);
        })()
;
