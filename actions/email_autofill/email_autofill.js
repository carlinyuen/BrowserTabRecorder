/* Action for EasyBugFiler
 * Easily autofill bug fields
 */

popup.addAction($(function()
{
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
        });
    }

    return {
        id: "emailAutofill",
        description: "Populate fields with email content on active tab",
        domains: /mail.google.com/, // TODO inbox
        icon: "./envelope-closed-2x.png",
        label: "Email Autofill",
        callback: emailAutofill,
    }
})());
