/* Plugin for Tab Recorder
 * Create bugs for Buganizer easily
 */

var TR_PLUGINS = TR_PLUGINS || {};
TR_PLUGINS.buganizerPlugin = (function()
{
    var URL_BUG_API_CREATE = 'https://b2.corp.google.com/issues/new'   // Bug creation api
        , KEY_STORAGE_BUGANIZER = "buganizerPlugin"
        , TIME_SAVE_DELAY = 250     // 250ms is average human reaction time
        , saveTimerHandle           // Timer handle for saving delay
        , $fields                   // Reference to input fields
    ;

    return {
        id: KEY_STORAGE_BUGANIZER,
        popup: {
            title: "Buganizer",
            init: setupPopup,
            update: update,
        },
    };

    // Sets up plugin on popup, gets passed UI context for popup (jQuery object) and the plugin path
    function setupPopup($popupContext, pluginPath)
    {
        // Create UI
        $popupContext.append($(document.createElement('form'))
            .append($(document.createElement('fieldset'))
                .append($(document.createElement('label'))
                    .attr('for', 'bugTitle')
                    .text('Title')
                ).append(document.createElement('br'))
                .append($(document.createElement('input'))
                    .attr('id', 'bugTitle')
                    .attr('type', 'text')
                    .addClass('field')
                ).append(document.createElement('br'))
                .append(document.createElement('br'))

                .append($(document.createElement('label'))
                    .attr('for', 'bugDescription')
                    .text('Description')
                ).append(document.createElement('br'))
                .append($(document.createElement('textarea'))
                    .attr('id', 'bugDescription')
                    .addClass('field')
                )
            ).append($(document.createElement('div'))
                .addClass('tR')
                .append($(document.createElement('button'))
                    .attr('id', 'createButton')
                    .attr('title', 'Create bug in new tab')
                    .attr('type', 'submit')
                    .addClass('icon')
                    .text('Create Bug')
                    .prepend($(document.createElement('img'))
                        .attr('alt', '')
                        .attr('src', pluginPath + './bug-2x.png')
                    )
                )
                .append(' : ')
                .append($(document.createElement('button'))
                    .attr('id', 'resetButton')
                    .attr('title', 'Clear form details and reset')
                    .attr('type', 'reset')
                    .addClass('icon')
                    .text('Reset')
                    .prepend($(document.createElement('img'))
                        .attr('alt', '')
                        .attr('src', pluginPath + './trash-2x.png')
                    )
                )
            )
        );

        // Attach handlers
        $popupContext.find('#createButton').click(createBug);
        $popupContext.find('#resetButton').click(clearDetails);
        
        // Setting variables
        $fields = $popupContext.find('input,textarea');

        // Key listeners to fields to save details
        $fields.on("keyup paste cut", saveDetails);

        // Prevent form submit
        $popupContext.find('form').submit(function(event) {
            event.preventDefault();
        });

        // Load latest details
        loadDetails();
    }

    // Update plugin
    function update()
    {
        loadDetails();
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

        // Fire off bug creation using URL parameters
        var url = [URL_BUG_API_CREATE, '?', $.param(params)].join('');
        console.log(url);
        chrome.tabs.create({ url: url });
    }

    // Load details from last session
    function loadDetails()
    {
        console.log('loadDetails()');

        // Get data from local storage
        chrome.storage.local.get(KEY_STORAGE_BUGANIZER, function (data) 
        {
            if (chrome.runtime.lastError) {	// Check for errors
                console.log(chrome.runtime.lastError);
            } 
            else    // Success
            {
                var details = data[KEY_STORAGE_BUGANIZER];
                if (details)
                {
                    $.each(details, function (key, value) {
                        $('#' + key).val(value);
                    });
                }
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
            var details = {};
            $fields.each(function (i, el) 
            {
                var $el = $(el);
                details[$el.attr('id')] = $el.val();
            });
            console.log('saveDetails:', details);

            // Save to local storage
            var data = {};
            data[KEY_STORAGE_BUGANIZER] = details;
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
        console.log('clearDetails()');

        $fields.each(function (i, el) {
            $(el).val('');
        });
        
        // Delete from storage
        chrome.storage.local.remove(KEY_STORAGE_BUGANIZER, function() 
        {
            if (chrome.runtime.lastError) { // Check for errors
                console.log(chrome.runtime.lastError);
            } else {	// Success
                // Do nothing
            }
        });
    }

})();

