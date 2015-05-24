/* Action for EasyBugFiler
 * Easily autofill bug fields
 */

popup.addAction($(function()
{
    // Function to initiate email autofill
    function emailAutofill()
    {
        // TODO
    }

    return {
        id: "emailAutofill",
        description: "Populate fields with email content on active tab",
        icon: "./envelope-closed-2x.png",
        label: "Email Autofill",
        callback: emailAutofill,
    }
})());
