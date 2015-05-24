/* Plugin for EasyBugFiler
 * Create bugs for Buganizer easily
 */

popup.addPlugin($(function()
{
    // Initialize plugin, gets passed UI context (jQuery object) and the plugin path
    function init($context, pluginPath)
    {
        // Create UI
        $context.append($(document.createElement('form'))
            .append($(document.createElement('fieldset'))
                .append($(document.createElement('label'))
                    .attr('for', 'bugTitle')
                    .text('Title')
                ).append(document.createElement('br'))
                .append($(document.createElement('input'))
                    .attr('id', 'bugTitle')
                    .attr('type', 'text')
                    .addClass('field')
                ).append(document.createElement('br'))
                .append(document.createElement('br'))

                .append($(document.createElement('label'))
                    .attr('for', 'bugDescription')
                    .text('Description')
                ).append(document.createElement('br'))
                .append($(document.createElement('textarea'))
                    .attr('id', 'bugDescription')
                    .addClass('field')
                )
            ).append($(document.createElement('div'))
                .addClass('tR')
                .text(':')
                .prepend($(document.createElement('button'))
                    .attr('id', 'createButton')
                    .attr('title', 'Create bug in new tab')
                    .attr('type', 'submit')
                    .addClass('icon')
                    .text('Create Bug')
                    .prepend($(document.createElement('img'))
                        .attr('alt', '')
                        .attr('src', pluginPath + './bug-2x.png')
                    )
                )
                .append($(document.createElement('button'))
                    .attr('id', 'resetButton')
                    .attr('title', 'Clear form details and reset')
                    .attr('type', 'reset')
                    .addClass('icon')
                    .text('Reset')
                    .prepend($(document.createElement('img'))
                        .attr('alt', '')
                        .attr('src', pluginPath + './trash-2x.png')
                    )
                )
            )
        );

        // Attach handlers
    }

    return {
        id: "buganizerPlugin",
        title: "Buganizer",
        init: init,
    }
})());

                
