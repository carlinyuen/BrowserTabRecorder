
$(function()
{
    // Variables
    var KEY_STORAGE_SETTINGS = "settings"
    ;

    init();

    // Initialize options
    function init()
    {
        console.log('init()');

        attachListeners();
        reloadSettings();
    }

    // Attach listeners to UI elements
    function attachListeners()
    {
        console.log('attachListeners()');

        // Track changes to checkboxes
        $('input[type="checkbox"]').on('change', function() {
            saveSettings();
        });

        // Track range input changes
        $('input[type="range"]').on('mouseup', function() 
        {
            this.blur();
            saveSettings();
        })
        .on('mousedown input', function() {
            updateRangeOutput(this);
        });
    }

    // Reload settings
    function reloadSettings()
    {
        console.log('reloadSettings()');

        chrome.storage.sync.get(KEY_STORAGE_SETTINGS, function(data)
        {
            if (chrome.runtime.lastError) 
            {
                console.log(chrome.runtime.lastError);
                alert('Could not collect load settings!');
            } 
            else    // Success, update settings
            {	
                console.log('Load success!', data);

                // Update input fields
                var settings = data[KEY_STORAGE_SETTINGS];
                $.each(settings, function(key, value) 
                {
                    var el = $('#' + key);
                    if (el.attr('type') == 'checkbox') {
                        el[0].checked = value;
                    } else {
                        el.val(value);
                    }
                });
                
                // Update range outputs
                updateRangeOutput($('#gifFrameSkipSetting')[0]);
            }
        });
    }

    // Save settings
    function saveSettings()
    {
        console.log('saveSettings()');

        // Collect settings from inputs
        var settings = {};
        $('input').each(function(index, element) 
        {
            if ($(element).attr('type') == 'checkbox') {
                settings[element.id] = element.checked;
            } else {
                settings[element.id] = element.value;
            }
        });

        // Save with key
        var data = {};
        data[KEY_STORAGE_SETTINGS] = settings;
        chrome.storage.sync.set(data, function()
        {
            if (chrome.runtime.lastError) 
            {
                console.log(chrome.runtime.lastError);
                alert('Could not save settings!');
            } 
            else    // Success
            {
                console.log('Save success!', data);
            }
        });
    }

    // Update range input outputs
    function updateRangeOutput(range) {
        $('output[name=' + range.id + ']').text('[' + range.value + '%]');
    }
});

