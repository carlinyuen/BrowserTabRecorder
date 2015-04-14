// Required: js/config.js

$(function()
{
    // Variables & Constants
    var TIME_SAVE_DELAY = 250    // 250ms is average human reaction time
        , saveTimerHandle
        , $fields
    ;

    init();

    //////////////////////////////////////////////////////////
    // FUNCTIONS
    
    // Initialize the popup
    function init()
    {
        // Setting variables
        $fields = $('input,textarea');

        // Button handlers
        $('#screenshotButton').click(takeScreenshot);
        $('#videoButton').click(captureVideo);
        $('#emailButton').click(autofillFromEmail);
        $('#cloneButton').click(cloneFromBuganizer);
        $('#resetButton').click(clearDetails);
        $('#createButton').click(createBug);

        // Key listeners to fields to save details
        $fields.on("keyup paste cut", saveDetails);

        // Prevent form submit
        $('form').submit(function(event) {
            event.preventDefault();
        });

        // Load latest details
        loadDetails();

        // Focus on title field
        $('#bugTitle').focus();
    }
  
    // Take screenshot of the active tab
    function takeScreenshot() {
        chrome.runtime.sendMessage({request: "captureTabScreenshot"});
    }
    
    // Initiate video capture of the active tab
    function captureVideo() {        
        chrome.runtime.sendMessage({request: "captureTabVideo"});
    }

    // Fill title / description from email
    function autofillFromEmail() {
        chrome.runtime.sendMessage({request: "emailAutofill"});
    }

    // Clone bug from buganizer
    function autofillFromEmail() {
        chrome.runtime.sendMessage({request: "emailAutofill"});
    }

    // Create a new bug by using url parameters
    function createBug()
    {
        // Collect all data
        var params = {
            title: $('#bugTitle').val(), 
            description: $('#bugDescription').val(),
        };
        console.log('createBug:', params);

        // Get defaults set from options
        chrome.storage.local.get("defaults", function (data)
        {
            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
            }
            else if (Object.keys(data).length)  // If there are defaults
            {
                $.each(data, function (key, value) { 
                    params[key] = value;        // Store into params too
                });
            }
        
            // Fire off bug creation using URL parameters
            var url = [URL_BUG_API_CREATE, '?', $.param(params)].join('');
            console.log(url);
            chrome.tabs.create({ url: url });
        });
    }

    // Load details from last session
    function loadDetails()
    {
        // Get form field ids to retrieve data for
        var keys = [];
        $fields.each(function (i, el) {
            keys.push($(el).attr('id'));
        });
        console.log('loadDetails:', keys);

        // Get data from local storage
        chrome.storage.local.get(keys, function (data) 
        {
            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
            } else if (keys) {	// Success
                $.each(data, function (key, value) {
                    $('#' + key).val(value);
                });
            }
        });
    }
    
    // Save details so user doesn't lose it
    function saveDetails()
    {
        // Do this on a timer so that we don't always save, just when user 
        //  has stopped typing / interacting with the form
        if (saveTimerHandle) {
            clearTimeout(saveTimerHandle);
        }
        saveTimerHandle = setTimeout(function()
        {
            // Collect data
            var data = {};
            $fields.each(function (i, el) 
            {
                var $el = $(el);
                data[$el.attr('id')] = $el.val();
            });
            console.log('saveDetails:', data);

            // Save to local storage
            chrome.storage.local.set(data, function() 
            {
                if (chrome.runtime.lastError) {	// Check for errors
                    console.log(chrome.runtime.lastError);
                } else {	// Success
                    saveTimerHandle = null;     // Clear saving timer handle
                }
            });
        }, TIME_SAVE_DELAY);
    }

    // Clear details and the form
    function clearDetails()
    {
        // Clear form
        var keys = [];
        $fields.each(function (i, el) 
        {
            var $el = $(el);
            $el.val('');
            keys.push($el.attr('id'));
        });
        console.log('clearDetails:', keys);
        
        // Delete from storage
        chrome.storage.local.remove(keys, function() 
        {
            if (chrome.runtime.lastError) { // Check for errors
                console.log(chrome.runtime.lastError);
            } else {	// Success
                // Do nothing
            }
        });
    }

});
