// Prevent conflicts
jQuery.noConflict();

// Encapsulated anonymous function
(function($) {

	// Variables & Constants
	var clipboard;				// Keep track of what's in the clipboard

	// Custom log function
	function debugLog() {
		if (DEBUG && console) {
			console.log.apply(console, arguments);
		}
	}

	// Document ready function
	$(function() 
    {
	});

})(jQuery);

