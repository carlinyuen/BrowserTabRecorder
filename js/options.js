
$(function()
{
    $('input[type="range"]').on('mouseup', function() {
        this.blur();
    }).on('mousedown input', function() {
        $(this).attr('data-value', this.value);
    });

});

