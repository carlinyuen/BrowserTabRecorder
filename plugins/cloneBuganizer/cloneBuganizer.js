/* Action for Tab Recorder
 * Easily clone a bug from Buganizer
 */

BACKGROUND_PLUGINS.cloneBuganizer = ((function($)
{
    // Function to initiate bug cloning
    function cloneBug()
    {
        // Send request
        return {
            target: "content_script",
        };
    }

    return {
        id: "cloneBuganizer",
        action: {
            description: "Clone existing Buganizer bug from active tab",
            domains: /(buganizer|b).corp.google.com\/issues\/\d+/,
            icon: "./tags-2x.png",
            label: "Clone Bug",
            callback: cloneBug,
        },
    };
})($));

