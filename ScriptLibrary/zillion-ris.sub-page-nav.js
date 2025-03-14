(function ($) {

    $(function () {

        $.widget('zillionRis.pageSubNav', {
            options: {
                beforeClose: function () { return $.Deferred().resolve().promise(); },
                beforeOpen: function () { return $.Deferred().resolve().promise(); },
                open: function () { },
                close: function () { },
                zIndex: 500,
                closeText: locfmt('{ris,ClickToReturn}')
            },
            _create: function () {
                var self = this,
                element = self.element.attr({ tabIndex: 0 });

                var container = $('<div class="sub-page-nav" style="position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: ' + self.options.zIndex + '"></div>')
                .attr({
                    role: 'dialog',
                    tabIndex: -1
                })
                .appendTo('body');
                var background = $('<div class="sub-page-nav-background" style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 0"></div>')
                .appendTo(container)
                .disableSelection();
                var contentPanel = $('<div class="sub-page-nav-content" style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 2" zp-fluids="fixed"></div>')
                .appendTo(container);
                element.css({ position: 'relative' });
                var aa = $('<a class="ui-icon ui-icon-closethick"></a>');
                var bb = $('<span class="ui-link" style="position: absolute; top: 0; right: 0; padding: 4px"></span>')
                .click(function () {
                    self.hide();
                }).hover(function () {
                    $(aa).removeClass('ui-icon-close').addClass('ui-icon-circle-close');
                }, function () {
                    $(aa).removeClass('ui-icon-circle-close').addClass('ui-icon-close');
                }).append(aa);

                var closeText = $('<div class="overlay-close" style="z-index: 1"><span class="overlay-close-text">' + self.options.closeText + '</span></div>');
                background.hover(function () {
                    closeText.addClass('hover');
                }, function () {
                    closeText.removeClass('hover');
                });

                container.hide();
                closeText.appendTo(background);
                element.css({ zIndex: 0 }).appendTo(contentPanel);
                bb.css({ zIndex: 1 }).appendTo(contentPanel);

                background.on('click', function () {
                    self.hide();
                })
                .hover(function () {
                    self.background.addClass('sub-page-nav-background-hover');
                }, function () {
                    self.background.removeClass('sub-page-nav-background-hover');
                });
                container.bind("keydown.subPageNav", function (event) {
                    if (!event.isDefaultPrevented() && event.keyCode && event.keyCode === $.ui.keyCode.ESCAPE) {
                        self.hide();
                        event.preventDefault();
                    }
                });

                this.container = container;
                this.background = background;
                this.contentPanel = contentPanel;
            },
            destroy: function () {
                this.element.appendTo('body');
                this.container.remove();

                $.Widget.prototype.destroy.apply(this, arguments);
            },
            show: function () {
                var self = this,
                options = self.options;

                if (self.container.is(':visible')) {
                    return;
                }

                options.beforeOpen.apply(self.element).then(function () {
                    self.container.css({ zIndex: ZillionParts.zIndex() });
                    self.container.show();

                    //self.element.show('fade');

                    options.open.apply(self.element);

                    self.container.bind('keydown.subPageNav', function (event) {
                        if (event.keyCode !== $.ui.keyCode.TAB) {
                            return;
                        }

                        var tabbables = $(':tabbable', this),
                            first = tabbables.filter(':first'),
                            last = tabbables.filter(':last');

                        if (event.target === last[0] && !event.shiftKey) {
                            first.focus();
                            return false;
                        } else if (event.target === first[0] && event.shiftKey) {
                            last.focus();
                            return false;
                        }
                    });

                    var tabbables = $(':tabbable', self.container), first = tabbables.filter(':first');
                    first.focus();

                    ZillionParts.Fluids.Update();
                });
            },
            hide: function () {
                var self = this,
                options = self.options;

                if (!self.container.is(':visible')) {
                    return;
                }

                options.beforeClose.apply(self.element).then(function () {
                    self.container.hide();
                    options.close.apply(self.element);
                });
            }
        });
    });
})(jQuery);
