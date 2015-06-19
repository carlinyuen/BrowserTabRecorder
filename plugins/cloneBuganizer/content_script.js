/* Plugin for Tab Recorder
 * Easily clone a bug from Buganizer
 */

var TR_PLUGINS = TR_PLUGINS || {};
TR_PLUGINS.cloneBuganizer = (function()
{
    var DOMAIN_REGEX = /(buganizer|b).corp.google.com\/issues\/\d+/;

    return {
        id: "cloneBuganizer",
    };

    // Clone a bug from a Buganizer page issue
    function cloneFromBuganizer()
    {
        // Check that we are on Buganizer
        if (DOMAIN_REGEX.test(window.location.host)) 
        {
            // TODO get data from the various fields
            var params = {};
            
            // Fire off bug creation using URL parameters
            var url = [URL_BUG_API_CREATE, '?', $.param(params)].join('');
            console.log(url);
            chrome.tabs.create({ url: url });
        } 
        else    // Error
        {
            console.log('ERROR: Not currently on Buganizer page!');
            alert('Not currently on a Buganizer issue page!');
        }
    }

})();


