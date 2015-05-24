/* Plugin for EasyBugFiler
 * Create bugs for Buganizer easily
 */

popup.addPlugin($(function()
{
    var $fields;    // Reference to input fields

    // Initialize plugin, gets passed UI context (jQuery object) and the plugin path
    function init($context, pluginPath)
    {
        // Create UI
        $context.append($(document.createElement('form'))
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
                .text(':')
                .prepend($(document.createElement('button'))
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
        $context.find('#createButton').click(createBug);
        $context.find('#resetButton').click(clearDetails);
        
        // Setting variables
        $fields = $context.find('input,textarea');

        // Key listeners to fields to save details
        $fields.on("keyup paste cut", saveDetails);

        // Prevent form submit
        $context.find('form').submit(function(event) {
            event.preventDefault();
        });

        // Load latest details
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

    return {
        id: "buganizerPlugin",
        title: "Buganizer",
        init: init,
    }
})());

                
