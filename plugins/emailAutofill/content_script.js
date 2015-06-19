/* Plugin for Tab Recorder
 * Easily autofill bug fields
 */

var TR_PLUGINS = TR_PLUGINS || {};
TR_PLUGINS.emailAutofill = (function()
{
    var DOMAIN_REGEX = /(mail|inbox).google.com/;

    return {
        id: "emailAutofill",
    };

    // Autofill bug fields in popup from email
    //  param fields is a object with fields to store data into
    function autofillFromEmail(fields)
    {
        var domain = window.location.host
            , error = false;

        // Check that we are on some email client
        if (DOMAIN_REGEX.test(domain)) 
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

})();
