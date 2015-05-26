
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

        attachListners();
        reloadSettings();
    }

    // Attach listeners to UI elements
    function attachListeners()
    {
        // Track range input changes
        $('input[type="range"]').on('mouseup', function() {
            this.blur();
        }).on('mousedown input', function() {
            updateRangeOutput(this);
        });
    }

    // Reload settings
    function reloadSettings()
    {
        chrome.storage.sync.get(KEY_STORAGE_SETTINGS, function(data)
        {
            if (chrome.runtime.lastError) 
            {
                console.log(chrome.runtime.lastError);
                alert('Could not collect load settings!');
            } 
            else    // Success, update settings
            {	
                // Update input fields
                $.each(data, function(key, value) {
                    $('#' + key).val(value);
                });
                
                // Update range outputs
                updateRangeOutput($('#gifFrameSkipSetting')[0]);
            }
        });
    }

    // Update range input outputs
    function updateRangeOutput(range) {
        $('output[name=' + range.id + ']').text('[' + range.value + '%]');
    }
});

