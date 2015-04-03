
$(function()
{
    // Constants
    var ANIMATION_FAST = 200
        , ANIMATION_NORMAL = 400
        , ANIMATION_SLOW = 1000
        , TIME_SHOW_CROUTON = 1000 * 3	              // Show croutons for 3s
    ;

	// Button handlers
	$('#createButton').click(createBug);

	// Prevent form submit
	$('form').submit(function(event) {
		event.preventDefault();
	});


    //////////////////////////////////////////////////////////
    // FUNCTIONS
    
    // Create a new bug by using url parameters
    function createBug()
    {
        // TODO
    }
    
    // Create and show and eventually hide a message crouton
    function showCrouton(message, color)
    {
        $('body').append($(document.createElement('div'))
            .addClass('crouton').addClass(color || 'green').text(message)
            .fadeIn(ANIMATION_FAST, function() {
                $(this).delay(TIME_SHOW_CROUTON).fadeOut(ANIMATION_FAST, function() {
                    $(this).remove();
                })
            })
        );
    }

    // Create and show modal popup with action button
    function showModalPopup(message, completionBlock, isConfirm)
    {
        $(document.createElement('div'))
            .addClass('modal')
            .hide()
            .appendTo('body')
            .fadeIn(ANIMATION_FAST)
            .click(function() {
                $('.popup').fadeOut(ANIMATION_FAST, function() 
                {
                    $('.popup, .modal').remove();
                    if (completionBlock) {
                        completionBlock(false);
                    }
                });
            });
        $(document.createElement('div'))
            .addClass('popup')
            .append($(document.createElement('h2'))
                .text(chrome.i18n.getMessage("TITLE_WARNING_POPUP"))
            )
            .append($(document.createElement('p'))
                .html(message.replace(/\n/g, '<br />'))
            )
            .append($(document.createElement('span'))
                .css('float', 'right')
                .css('text-align', 'right')
                .append($(document.createElement('button'))
                    .attr('type', 'button')
                    .css('display', (isConfirm ? 'inline-block' : 'none'))
                    .text('Cancel')
                    .click(function() 
                    {
                        $('.popup').fadeOut(ANIMATION_FAST, function() {
                            $('.popup, .modal').remove();
                            if (completionBlock) {
                                completionBlock(false);
                            }
                        });
                    })
                )
                .append($(document.createElement('button'))
                    .attr('type', 'button')
                    .css('margin-left', '4px')
                    .text('Ok')
                    .click(function() 
                    {
                        $('.popup').fadeOut(ANIMATION_FAST, function() {
                            $('.popup, .modal').remove();
                            if (completionBlock) {
                                completionBlock(true);
                            }
                        });
                    })
                )
            )
            .hide()
            .appendTo('body')
            .fadeIn(ANIMATION_FAST);
    }
});
