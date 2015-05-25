/* Action for EasyBugFiler
 * Easily clone a bug from Buganizer
 */

popup.addAction((function($)
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
        description: "Clone existing Buganizer bug from active tab",
        domains: /(buganizer|b).corp.google.com\/issues\/\d+/,
        icon: "./tags-2x.png",
        label: "Clone Bug",
        callback: cloneBug,
    }
})($));

