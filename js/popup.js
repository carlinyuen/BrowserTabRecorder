/* Required: jquery.js */

(function()
{
    // Variables & Constants
    var TR_PLUGINS = TR_PLUGINS || {}
        , backgroundConnection      // Port handle for connection to background.js
        , currentTabURL             // Reference to current tab URL
        , plugins = {}              // Map to hold plugins
        , actions = {}              // Map to hold actions
        , actionCallbacks = {}      // Mapping of ids to callbacks
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

    // Initialize popoup
    init();


    //////////////////////////////////////////////////////////
    // FUNCTIONS
    
    // Initialize the popup
    function init()
    {
        // Check current active tab's url to determine available actions
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) 
        {
            currentTabURL = tabs[0].url;
            console.log("Active tab:", currentTabURL);

            // Button handlers
            $('#optionsButton').click(openOptionsPage);
            $('#screenshotButton').click(requestButtonClickHandler); 
            $('#gifButton').click(requestButtonClickHandler);     
            $('#videoButton').click(requestButtonClickHandler);

            // Load plugins
            loadPlugins(TR_PLUGINS);
        });   // END - chrome.tabs.query({active: true, currentWindow: true}, function(tabs) 
    }

    // Process and add a plugin
    function addPlugin(plugin) 
    { 
        console.log("addPlugin:", plugin);

        if (plugin && plugin.id)    // ID to use for plugin context and messages
        {
            // Check for popup action
            if (plugin.action 
                && plugin.action.callback      // Callback when popup button is clicked
                && plugin.action.domains       // URL regex for what sites action should work on
                && plugin.action.icon          // Button icon to use
                && plugin.action.label         // Button label to use
                && plugin.action.description) { // Button hover description
                actions[plugin.id] = plugin.action;
            } else {
                console.log("Invalid popup action object.");
            }

            // Check popup plugin
            if (plugin.popup     
                && plugin.popup.init    // Popup setup, gets passed popup UI context (jquery Object) and path to plugin
                && plugin.popup.update  // Update function
                && plugin.popup.title) { // Plugin header title
                plugins[plugin.id] = plugin.popup; 
            } else {
                console.log("Invalid popup plugin object.");
            }

            return true;
        }
        else {
            console.log("Invalid plugin object.");
            return false;
        }
    }

    // Load plugins
    function loadPlugins(unprocessedPlugins)
    {
        // Go through and add the unprocessed plugins
        $.each(unprocessedPlugins, function(index, value) {
            addPlugin(value);
        });

        // Go through actions and initalize them
        if (!$.isEmptyObject(actions))
        {
            // Create header for actions
            var $section = $('#actionsSection');
            $section.append($(document.createElement('h2'))
                .addClass('divider').text('actions'));

            // For each action, add a button
            $.each(actions, function(id, act)
            {
                // Add callback to callback map
                actionCallbacks[id] = act.callback;

                // Create button UI
                var button = $(document.createElement('button'))
                    .attr('id', id)
                    .attr('title', act.description)
                    .attr('type', 'button')
                    .addClass('icon')
                    .text(act.label)
                    .prepend($(document.createElement('img'))
                        .attr('alt', '')
                        .attr('src', PATH_PLUGINS_PREFIX + act.id + '/' + act.icon)
                    )
                    .click(function (e)     // Fire off callback
                    {
                        var id = $(this).attr('id');
                        var data = actionCallbacks[id]();
                        if (data) {     // If data is passed back to send
                            sendBackgroundMessage(id, data);
                        }
                    });

                // Check if button should be disabled
                if (!(act.domains.test(currentTabURL))) {
                    button.prop('disabled', true);
                }
                
                // Add button, and space
                $section.append(button).append(' ');
            });
        }

        // Go through plugins and initalize them
        if (!$.isEmptyObject(plugins))
        {
            var $section = $('#pluginsSection');

            // For each action, add a button
            $.each(plugins, function(id, plug)
            {
                // Create context for the plugin and initialize with it
                var context = $(document.createElement('section')).attr('id', id);
                plug.init(context, PATH_PLUGINS_PREFIX + id + '/');

                // Add to plugins section
                $section.append($(document.createElement('h2'))
                    .addClass('divider').text(plug.title.toLowerCase())
                ).append(context);
            });
        }
    }

    // Open options page
    function openOptionsPage() {
        chrome.tabs.create({url: "options.html"});
    }

    // Send a message to background page
    function sendBackgroundMessage(requestID, data) 
    {
        console.log('sendBackgroundMessage:', requestID, data);
        backgroundConnection.postMessage({request: requestID, data: data});
    }
  
    // Button click handler for buttons that have a data-request property.
    function requestButtonClickHandler() {
        sendBackgroundMessage($(this).attr('data-request'));
    }
   
    // Expose functions and properties
    return {
        addPlugin: addPlugin,
        init: init,         // Expose init function
    };
})();
