/* Required: jquery.js */

popup = $(function()
{
    // Variables & Constants
    var PATH_ACTIONS_PREFIX = './actions/'
        , PATH_PLUGINS_PREFIX = './plugins/'
        , TIME_SAVE_DELAY = 250     // 250ms is average human reaction time

        , saveTimerHandle           // Timer handle for saving delay
        , backgroundConnection      // Port handle for connection to background.js
        , currentTabURL             // Reference to current tab URL

        , actions = []              // Array to hold extra actions
        , actionCallbacks = {}      // Mapping of ids to callbacks
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

    // Check current active tab's url to determine available actions
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) 
    {
        currentTabURL = tabs[0].url;
        console.log("Active tab:", currentTabURL);
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
            for (var i = 0, l = actions.length, a = actions[i], button; i < l; a = actions[++i])
            {
                // Add callback to callback map
                actionCallbacks[a.id] = a.callback;

                // Create button UI
                button = $(document.createElement('button'))
                    .attr('id', a.id)
                    .attr('title', a.description)
                    .attr('type', 'button')
                    .addClass('icon')
                    .text(a.label)
                    .prepend($(document.createElement('img'))
                        .attr('alt', '')
                        .attr('src', PATH_ACTIONS_PREFIX + a.id + '/' + a.icon)
                    )
                    .click(function (e)     // Fire off callback
                    {
                        var id = $(this).attr('id');
                        var message = actionCallbacks[id]();
                        if (message) 
                        {
                            message.request = id;
                            backgroundConnection.postMessage(message);
                        }
                    });

                // Check if button should be disabled
                if (!(a.domains.test(currentTabURL))) {
                    button.prop('disabled', true);
                }
                
                // Add button
                $section.append(button);
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

        // Button handlers
        $('#optionsButton').click(openOptionsPage);
        $('#screenshotButton').click(takeScreenshot);
        $('#gifButton').click(captureGif);
        $('#videoButton').click(captureVideo);
        $('#audioButton').click(captureAudio);
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

    // Expose functions and properties
    return {
        addAction: function(action) 
        { 
            if (action && action.callback   // Callback when popup button is clicked
                    && action.id            // ID to use for message passing and button
                    && action.domains       // URL regex for what sites action should work on
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
                    && plugin.update    // Update function
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
