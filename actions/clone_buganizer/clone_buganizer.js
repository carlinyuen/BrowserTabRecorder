/* Action for EasyBugFiler
 * Easily clone a bug from Buganizer
 */

popup.addAction($(function()
{
    // Function to initiate bug cloning
    function cloneBug()
    {
        // TODO
    }

    return {
        id: "cloneBuganizer",
        description: "Clone existing Buganizer bug from active tab",
        icon: "./tags-2x.png",
        label: "Clone Bug",
        callback: cloneBug,
    }
})());

