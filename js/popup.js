/* Required: jquery.js */

popup = $(function()
{
    // Variables & Constants
    var PATH_ACTIONS_PREFIX = './actions/'
        , PATH_PLUGINS_PREFIX = './plugins/'
        , TIME_SAVE_DELAY = 250     // 250ms is average human reaction time
        , saveTimerHandle           // Timer handle for saving delay
        , backgroundConnection      // Port handle for connection to background.js

        , $fields                   // Reference to input fields in the popup
        , actions = []              // Array to hold extra actions
        , plugins = []              // Array to hold extra plugins
    ;

    // Listener for messages from background
    backgroundConnection = chrome.extension.connect({name: "Popup"});
    backgroundConnection.onMessage.addListener(function(message) 
    {
        console.log('message:', message);

        // Handle message
        switch (message.request)
        {
            case "update":  // Update fields
                loadDetails();
                break;

            default: 
                console.log("Unknown request received!");
                break;
        }
    });


    //////////////////////////////////////////////////////////
    // FUNCTIONS
    
    // Initialize the popup
    function init()
    {
        // Go through actions and initalize them
        if (actions && actions.length)
        {
            // Create header for actions
            var $section = $('#actionsSection');
            $section.append($(document.createElement('h2'))
                .addClass('divider').text('actions'));

            // For each action, add a button
            for (var i = 0, l = actions.length, a = actions[i]; i < l; a = actions[++i])
            {
                $section.append($(document.createElement('button'))
                    .attr('id', a.id)
                    .attr('title', a.description)
                    .attr('type', 'button')
                    .addClass('icon')
                    .text(a.label)
                    .prepend($(document.createElement('img'))
                        .attr('alt', '')
                        .attr('src', PATH_ACTIONS_PREFIX + a.id + '/' + a.icon)
                    )
                );
            }
        }

        // Go through plugins and initalize them
        if (plugins && plugins.length)
        {
            var $section = $('#pluginsSection');

            // For each action, add a button
            for (var i = 0, l = plugins.length, p = plugins[i], context; i < l; p = plugins[++i])
            {
                // Create context for the plugin and initialize with it
                context = $(document.createElement('section')).attr('id', p.id);
                p.init(context, PATH_PLUGINS_PREFIX + p.id + '/');

                // Add to plugins section
                $section.append($(document.createElement('h2'))
                    .addClass('divider').text(p.title.toLowerCase())
                ).append(context);
            }
        }

        // Setting variables
        $fields = $('input,textarea');

        // Button handlers
        $('#optionsButton').click(openOptionsPage);
        $('#screenshotButton').click(takeScreenshot);
        $('#gifButton').click(captureGif);
        $('#videoButton').click(captureVideo);
        $('#audioButton').click(captureAudio);
        $('#emailButton').click(autofillFromEmail);
        $('#cloneButton').click(cloneFromBuganizer);
        $('#createButton').click(createBug);
        $('#resetButton').click(clearDetails);

        // Key listeners to fields to save details
        $fields.on("keyup paste cut", saveDetails);

        // Prevent form submit
        $('form').submit(function(event) {
            event.preventDefault();
        });

        // Load latest details
        loadDetails();

        // Check current active tab's url to determine available actions
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) 
        {
            var url = tabs[0].url;
            console.log("Active tab:", url);

            // Test domains
            if (DOMAIN_BUGANIZER_REGEX.test(url)) {
                $('#cloneButton').prop('disabled', true);
            }
            else if (DOMAIN_GMAIL_REGEX.test(url) || DOMAIN_GMAIL_REGEX.test(url)) {
                $('#emailButton').prop('disabled', true);
            }
        });
    }

    // Open options page
    function openOptionsPage() {
        chrome.tabs.create({url: "options.html"});
    }
  
    // Take screenshot of the active tab
    function takeScreenshot() {
        backgroundConnection.postMessage({request: "captureTabScreenshot"});
    }
    
    // Initiate gif capture of the active tab
    function captureGif() {        
        backgroundConnection.postMessage({request: "captureTabGif"});
    }

    // Initiate video capture of the active tab
    function captureVideo() {        
        backgroundConnection.postMessage({request: "captureTabVideo"});
    }

    // Initiate audio capture of the active tab
    function captureGif() {        
        backgroundConnection.postMessage({request: "captureTabAudio"});
    }

    // Fill title / description from email
    function autofillFromEmail() 
    {
        // Send current field data
        var data = {};
        $fields.each(function (i, el) 
        {
            var $el = $(el);
            data[$el.attr('id')] = $el.val();
        });

        // Pass along in message
        backgroundConnection.postMessage({
            request: "emailAutofill",
            fields: data,
        });
    }

    // Clone bug from buganizer
    function cloneFromBuganizer() {
        backgroundConnection.postMessage({request: "cloneFromBuganizer"});
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

    // Expose functions and properties
    return {
        addAction: function(action) 
        { 
            if (action && action.callback   // Callback when popup button is clicked
                    && action.id            // ID to use for message passing and button
                    && action.icon          // Button icon to use
                    && action.label         // Button label to use
                    && action.description)  // Button hover description
            {
                this.actions.push(action); 
                return true;
            } 
            else 
            {
                throw "Invalid action object."
                return false;
            }
        },
        addPlugin: function(plugin) 
        { 
            if (plugin && plugin.init   // Init function, gets passed UI context (jquery Object), and path for the plugin
                    && plugin.id        // ID to use for plugin context and messages
                    && plugin.title)    // Plugin header title
            {
                this.plugins.push(plugin); 
                return true;
            } 
            else 
            {
                throw "Invalid plugin object."
                return false;
            }
        },
        init: init,         // Expose init function
    };
});
