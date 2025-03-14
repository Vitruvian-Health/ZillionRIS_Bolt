(function ($) {
    $.widget('rogan.tooltip', {
        options: {
            content: null,
            contentHandler: null,
            position: {
                my: "left top+2",
                at: "left bottom",
                collision: "fit flip"
            }
        },
        _create: function () {
            var self = this,
                element = self.element,
                options = self.options;

            if (options.content == null) {
                options.content = element.attr('title');
            }

            element.addClass('ris-tooltip-control');
            element.data('tooltip', options);
            element.removeAttr('title');

            element
                .on("mouseover.tooltip", function () { self._handleMouseOver(); })
                .on("mouseout.tooltip", function () { self._handleMouseOut(); })
                .on("click.tooltip", function () { self._handleMouseClick(); })
                .on("mousemove.tooltip", function (e) { self._handleMouseMove(e); })
                .on("mousedrag.tooltip", function () { self._handleDraggingStart(); });
        },
        destroy: function () {
            var self = this;

            if (self.$tooltip) {
                self.$tooltip.remove();
                self.$tooltip = null;
            }
        },
        _ensureTooltip: function () {
            if (this.$tooltip == null) {
                var $panel = $("<div></div>")
                    .addClass('ris-tooltip')
                    .addClass('ui-helper-reset ui-widget ui-corner-all')
                    .css({ 'z-index': '9999', position: 'fixed' })
                    .hide();
                var $content = $('<div></div>').addClass('ris-tooltip-content').html(this.options.content || '').appendTo($panel);
                this.$tooltip = $panel.appendTo('body');
            }
        },
        fadeAway: function () {
            var self = this;
            self._ensureTooltip();
            self.$tooltip.stop(true, true).hide('fade', 200);
        },
        _handleMouseOver: function () {
            this._ensureTooltip();

            var pos = $.extend(true, { of: this.element }, this.options.position);

            this.$tooltip.css({ left: 0, top: 0 }).position(pos);
            this.$tooltip.delay(300).show('fade', 100);
        },
        _handleMouseOut: function () {
            this.fadeAway();
        },
        _handleDraggingStart: function () {
            this.fadeAway();
        },
        _handleMouseClick: function () {
            this.fadeAway();
        },
        _handleMouseMove: function (e) {
            if (e.which != 1) { // if not dragging
                var self = this;
                self._ensureTooltip();
                this.$tooltip.css('left', e.pageX - $(document).scrollLeft() + 10).css('top', e.pageY - $(document).scrollTop() + 10);
            }
        },
        _setOptions: function () {
            $.Widget.prototype._setOptions.apply(this, arguments);

            if (this.$tooltip != null) {
                this.$tooltip.remove();
                this.$tooltip = null;
            }
        },
        _setOption: function (key, value) {
            if (/title|content/.test(key) == false) {
                return;
            }

            $.Widget.prototype._setOption.call(this, key, value);
        }
    });
})(jQuery);