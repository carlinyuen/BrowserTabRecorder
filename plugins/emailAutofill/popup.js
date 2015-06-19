/* Plugin for Tab Recorder
 * Easily autofill bug fields
 */

var TR_PLUGINS = TR_PLUGINS || {};
TR_PLUGINS.emailAutofill = (function()
{
    return {
        id: "emailAutofill",
        action: {
            description: "Populate fields with email content on active tab",
            domains: /(mail|inbox).google.com/,
            icon: "./envelope-closed-2x.png",
            label: "Email Autofill",
            callback: emailAutofill,
        },
    };

    // Function to initiate email autofill
    function emailAutofill()
    {
        // Send current field data
        var data = {
            'bugTitle': null,
            'bugDescription': null
        };

        // Send request
        return {
            target: "content_script",
            fields: data,
        };
    }
})();
