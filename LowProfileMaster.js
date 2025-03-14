(function ($, window, undefined) {

    $.extend(true, window, {
        ZillionRis: {
            showHelp: showHelp
        }
    });

    $(function() {
        var reloadAfterClose = window.sessionStorage['reloadAfterClose'];
        delete window.sessionStorage['reloadAfterClose'];

        if (reloadAfterClose) {
            setTimeout(function() {
                switch (reloadAfterClose) {
                case 'ConflictingAppointments':
                    ZillionRis.SubNavs.ShowConflictingAppointments();
                    break;

                case 'CancelledExaminations':
                    ZillionRis.SubNavs.ShowCancelledExaminations();
                    break;
                }
            });
        }
    });

    $(function () {
        var language = window.culture || 'nl-NL';
        moment.locale(language);
        var currentCulture = window.currentCulture;
        if (currentCulture) {
            var dayNames = [];
            dayNames = dayNames.concat(currentCulture.dateTime.daysShort);
            dayNames = dayNames.concat(currentCulture.dateTime.days);
            var monthNames = [];
            monthNames = monthNames.concat(currentCulture.dateTime.monthsShort);
            monthNames = monthNames.concat(currentCulture.dateTime.months);

            ZillionParts.DateFormat.i18n = {
                dayNames: dayNames,
                monthNames: monthNames
            };

            $.extend(true, $.datepicker._defaults, {
                dayNames: currentCulture.dateTime.days,
                dayNamesMin: currentCulture.dateTime.daysShort,
                dayNamesShort: currentCulture.dateTime.daysShort,
                monthNames: currentCulture.dateTime.months,
                monthNamesShort: currentCulture.dateTime.monthsShort,
                dateFormat: changeFormat(currentCulture.dateTime.dateShort),
                firstDay: currentCulture.dateTime.firstDayOfWeekInt,

                closeText: locfmt('{ris,DatePicker_CloseText}'),
                currentText: locfmt('{ris,DatePicker_Today}'),
                prevText: locfmt('{ris,DatePicker_Next}'),
                nextText: locfmt('{ris,DatePicker_Previous}')
            });
        }
    });

    function changeFormat(format) {
        switch (format) {
            case "d":
                format = currentCulture.dateTime.dateShort;
                break;
            case "D":
                format = currentCulture.dateTime.dateLong;
                break;
            case "F":
                format = currentCulture.dateTime.dateTimeFull;
                break;
            case "g":
                format = currentCulture.dateTime.dateShort + " " + currentCulture.dateTime.timeShort;
                break;
        }

        // Convert the date
        format = format.replace("dddd", "DD");
        format = format.replace("ddd", "D");

        // Convert month
        if (format.indexOf("MMMM") > -1) {
            format = format.replace("MMMM", "MM");
        }
        else if (format.indexOf("MMM") > -1) {
            format = format.replace("MMM", "M");
        }
        else if (format.indexOf("MM") > -1) {
            format = format.replace("MM", "mm");
        }
        else {
            format = format.replace("M", "m");
        }

        // Convert year
        format = format.indexOf("yyyy") > -1 ? format.replace("yyyy", "yy") : format.replace("yy", "y");

        return format;
    };

    $.extend($.ui.dialog.prototype.options, { modal: true });
    $.extend($.rogan.loadingOverlay.prototype.options, { message: "One moment please ..." });

    $(function () {
        setTimeout(function () {
            $(window).on("unload", function () {
                try {
                    MasterPage_ClearViewer();
                } catch (ex) {

                }
            });

            $(window).on("unload.clearRequestForm", function() {
                ZillionRis.CommandManager.execute('stored-documents.popup-close-or-clear');
            });
        }, 1000);
    });
    
    $(function () {
        if ($('body').find('.classic-nav-container').length) {
            new Scroller('.classic-nav-container', true, false).initialize(false);
        }
    });

    if (window.localStorage.debug == 'true') {
        $(document).ready(function () {
            setTimeout(function () {
                setTimeout(restoreAfterLoadTime, 3000);
            }, 1000);
        });

        function restoreAfterLoadTime() {
            document.title = window.licensedProductName;
            if (window.performance && window.performance.timing) {
                var timing = window.performance.timing;
                var requestTime = timing.responseEnd - timing.navigationStart;
                var completeTime = timing.loadEventEnd - timing.requestStart;
                var pageTime = timing.responseEnd - timing.requestStart;
                var interactiveTime = timing.domInteractive - timing.requestStart;
                var contentTime = timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart;
                var loadedTime = timing.loadEventEnd - timing.loadEventStart;
                var overalResponseTime = timing.loadEventEnd - timing.responseStart;
                var interactiveLoadTime = timing.loadEventEnd - timing.domInteractive;
                var navigationTime = timing.responseStart - timing.navigationStart;
                console.log('Request: ' + requestTime + 'ms, Page: ' + pageTime + 'ms, Content: ' + contentTime + 'ms, Loaded: ' + loadedTime + 'ms, Overal Response: ' + overalResponseTime + 'ms, Interactive till Loaded: ' + interactiveLoadTime + 'ms.');
                console.log('Time till first response: ' + navigationTime+'ms.');


                setTimeout(function () {
                    Modules.Task('module://workflow/task/pagetiming', 'submit', { Page: pageTime, Content: contentTime, Load: loadedTime, Overall: overalResponseTime, Url: window.location.pathname, InteractiveLoad: interactiveLoadTime, Interactive: interactiveTime, Complete: completeTime });
                }, 20000);
            }

        }
    } else {
        $(document).ready(function () {
            setTimeout(function () {
                document.title = window.licensedProductName;
            }, 200);
        });

        if (window.performance && window.performance.timing) {
            // Submit loading time after 20 seconds.
            setTimeout(function () {
                var timing = window.performance.timing;
                var pageTime = timing.responseEnd - timing.requestStart;
                var contentTime = timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart;
                var loadedTime = timing.loadEventEnd - timing.loadEventStart;
                var overalResponseTime = timing.loadEventEnd - timing.responseStart;
                var interactiveLoadTime = timing.loadEventEnd - timing.domInteractive;
                var x = (timing.domInteractive - timing.requestStart);
                var y = (timing.loadEventEnd - timing.domInteractive);

                Modules.Task('module://workflow/task/pagetiming', 'submit', { Page: pageTime, Content: contentTime, Load: loadedTime, Overall: overalResponseTime, Url: window.location.pathname, InteractiveLoad: interactiveLoadTime, Interactive: x, Complete: y });
            }, 20000);
        }
    }

    (function () {
        var manager = new ZillionParts.Notifications.Manager({ position: 'left bottom', width: 350 });
        window.notifications = manager;
        ZillionRis.Notifications = manager;

        $(function () {
            manager.create();
        });
    })();

    document.onhelp = function () { return (false); };
    window.onhelp = function () { return (false); };

    $(function () {
        bootstrapHeader();
    });

    function bootstrapHeader() {
        angular.bootstrap($('#DocumentHeader')[0], ['ris', 'ui.ris', 'ris.shell']);
    }

    function showLastAccessedExaminations() {
        if (window.permissions.hasLastAccessedExaminationsPermission) {
            ZillionRis.LastAccessedShowSubNav();
        }
    }

    function showHelp() {
        var windowName = 'RisUserManual';
        var windowOption = 'fullscreen=no,scrollbars=yes,resizable=yes';

        if (window.HelpDirectory) {
            var url = window.HelpDirectory + "/index.html";
            if (window.pageManualAccessKey) {
                url = window.HelpDirectory + "/" + window.pageManualAccessKey;
            }
            window.open(url, windowName, windowOption);
        } else {
            window.open('/Manual/index.html', windowName, windowOption);
        }
    }

    $(document).keydown(function (e) {
        if (e.keyCode === 8) {
            // Backspace
            var element = e.srcElement || e.target,
                isContentEditable = $(element).is('[contenteditable]') ? element.isContentEditable : null,
                textInputTypes = ['TEXT', 'PASSWORD', 'FILE', 'DATETIME', 'DATETIME-LOCAL', 'DATE', 'MONTH', 'TIME', 'WEEK', 'NUMBER', 'EMAIL', 'URL', 'SEARCH', 'TEL'];

            // Backspace should be disabled in the following cases:
            // - Element has it's "Content Editable" property explicitly set to false;
            // - Element is an input element and it is not a text based input type or it is set to be disabled or read only;
            // - Element is NOT an input element and it is not set to be "Content Editable".
            if (isContentEditable === false) {
                e.preventDefault();
                return false;
            } else if (element.tagName.toUpperCase() === 'INPUT' && textInputTypes.indexOf(element.type.toUpperCase()) === -1) {
                e.preventDefault();
                return false;
            } else if (element.tagName.toUpperCase() === 'INPUT' && (element.disabled || element.readOnly)) {
                e.preventDefault();
                return false;
            } else if (element.tagName.toUpperCase() !== 'INPUT' && element.tagName.toUpperCase() !== 'TEXTAREA' && isContentEditable !== true) {
                e.preventDefault();
                return false;
            }
        } else if (e.keyCode == 112) {
            // F1
            e.preventDefault();
            showHelp();
            return false;
        } else if (e.keyCode == 114) {
            // F3
            $('#SearchBox .search-input').select();
            return false;
        } else if (e.keyCode == 118) {
            // F7
            showLastAccessedExaminations();
            return false;
        } else if (e.keyCode == 119) {
            // F8
            showLastAccessedExaminations();
            return false;
        } else if (e.keyCode == 120) {
            // F9
            showLastAccessedExaminations();
            return false;
        } else if (e.keyCode == 121) {
            // F10
            showLastAccessedExaminations();
            return false;
        } 
    });

    window.crln = function crln(input) {
        return input ? input.replace(/\r?\n/g, '\n') : input;
    };
    window.crlnBr = function crlnBr(input) {
        return input ? input.replace(/\r?\n/g, '<br/>') : input;
    };

    window.Loading = {
        ShowPage: function (message) {
            $(window).loadingOverlay({ messageClass: 'loading-page', message: message, delay: 1000, showOverlayAfter: 1000 }).loadingOverlay('show');
        },
        Show: function (message, delay) {
            $(window).loadingOverlay({ messageClass: '', message: message, delay: delay || 300, showOverlayAfter: delay || 300 }).loadingOverlay('show');
        },
        Hide: function () {
            if ($(window).loadingOverlay('instance')) {
                $(window).loadingOverlay('hide');
            }
        }
    };

    $(function () {
        setTimeout(function () {
            Rogan.Time.synchronise();

            if (window.Sys && window.Sys.WebForms) {
                var prm = Sys.WebForms.PageRequestManager.getInstance();
                prm.add_beginRequest(function () { Loading.ShowPage(locfmt('{ris,OneMomentPlease}')); });
                prm.add_endRequest(function () { Loading.Hide(); });
            }

            $('#SearchBox').keydown(function (e) {
                if (e.keyCode == 13) {
                    // Allow short timeout for the change event to be called.
                    setTimeout(function () {
                        var searchInput = $('#PatientSearchInput');
                        var val = searchInput.val().trim();
                        searchInput.val(val);
                        if (val) {
                            ZillionRis.Patients.Search('auto', val);
                        }
                        return false;
                    });
                }
            });
        }, 500);

        if (window.sessionStorage) {
            // Remembers patient search.
            var searchInput = $('#SearchBox .search-input');
            searchInput.val(sessionStorage.lastSearchText || '');
            searchInput.on('change', function () {
                sessionStorage.lastSearchText = $(this).val().trim();
            });
        }

        (function () {
            /*
             * Time displayed in the top-right corner.
             */
            var $ct = $('#CurrentTime');
            var $date = $('#CurrentTime .mcd');
            var $time = $('#CurrentTime .mct');

            function updateCurrentTime() {
                try {
                    $ct.attr('title', new Date().format(currentCulture.dateTime.dateTimeFull));
                    $date.html(new Date().format('dddd d MMM yyyy'));
                    $time.html(new Date().format(currentCulture.dateTime.timeLong));
                } catch (ex) {
                    $ct.attr('title', '');
                    $date.html($date, '');
                    $time.html($time, '');
                }
            }

            setInterval(updateCurrentTime, 1000);
            updateCurrentTime();
        })();
    });

    (function () {
        /*
         * Person contact cards.
         */
        function ContactPopupViewModel() {
            var self = this;

            this.current = ko.observable();
            this.persons = ko.observableArray([]);
            this.persons.subscribe(function (a) {
                if (a.length === 0) {
                    self.current(null);
                } else if (!self.current()) {
                    self.current(a[0]);
                }
            });

            this.allowCardNav = (function () {
                return self.persons().length > 1;
            });
            this.previousPerson = function () {
                var persons = self.persons();
                var i = persons.indexOf(self.current()) - 1;
                if (i < 0) {
                    i = persons.length - 1;
                }
                self.current(persons[i]);
            };
            this.nextPerson = function () {
                var persons = self.persons();
                var i = persons.indexOf(self.current()) + 1;
                if (i > persons.length - 1) {
                    i = 0;
                }
                self.current(persons[i]);
            };
        }

        function ContactPopupItemViewModel() {
            var self = this;

            this.type = ko.observable();
            this.name = ko.observable();
            this.details = ko.observable();
            this.actions = ko.observableArray([]);
        }

        var cpvm = new ContactPopupViewModel();
        $(function () {
            ko.applyBindings(cpvm, $('#ContactPopup')[0]);
        });

        var cardCommands = new ZillionParts.CommandManager();
        cardCommands.assign(ZillionRis.Commands.Cards);
        cardCommands.assign(ZillionRis.Commands.Application);
        cardCommands.assign(ZillionRis.Commands.Patients);
        cardCommands.assign(ZillionRis.Commands.Orders);
        cardCommands.assign(ZillionRis.Commands.Examinations);

        var check = 0, hovered = null, shown = null;
        function openContactHover(target) {
            if (target && target.is(':visible')) {
                var foo = $('#ContactPopup');
                foo.css({ display: 'block', opacity: 0.1, position: 'absolute', zIndex: 9999 });
                foo.position({ my: 'left+20 top+2', at: 'left bottom', of: target, collision: 'flip' });
                foo.stop(true).animate({ opacity: 0.2 }, 100).delay(100).animate({ opacity: 1 }, 100);
                shown = target;
            }
        }
        function closeContactHover() {
            var foo = $('#ContactPopup');
            foo.css({ display: 'none' });
            shown = null;
        }

        var delay = ZillionParts.DelayCall(function () {
            var c = ++check;
            var nodeList = hovered;
            if (nodeList && nodeList.is(':visible')) {
                if (shown === null || shown[0] !== nodeList[0]) {
                    var data = nodeList.data('person');
                    if (data) {
                        nodeList.addClass('loading');
                        Modules.Task('module://workflow/task/personcard', 'retrieve', { PersonID: ('' + data).split(';') })
                            .then(function (d) {
                                if (c !== check) {
                                    return;
                                }

                                cpvm.persons([]);
                                d.qEach(function (m) {

                                    m.Cards.qEach(function (c) {
                                        var xxx = new ContactPopupItemViewModel();
                                        xxx.type(c.Type);
                                        xxx.name(m.Name);
                                        xxx.details(c.Details);

                                        c.Actions.qEach(function (a) {
                                            xxx.actions.push({ invoke: function () {
                                                cardCommands.execute(a.Action, { PersonID: m.ID, Data: a.Data });
                                                closeContactHover();
                                            }, text: a.Title
                                            });
                                        });

                                        cpvm.persons.push(xxx);
                                    });
                                });

                                openContactHover(nodeList);
                            }).always(function () {
                                nodeList.removeClass('loading');
                            });
                    }
                }
            } else {
                closeContactHover();
                cpvm.persons.removeAll();
            }
        });

        $(document).on('mousemove', '*', function (e) {
            var target = $(e.target);
            if (target.is('.contact-link')) {
                hovered = target;
                setTimeout(function () {
                    delay(100)();
                }, 0);
            } else if (shown) {
                var asdasd = $('#ContactPopup');
                if (target.parents().filter(asdasd).length === 0) {
                    if (hovered) {
                        hovered = null;
                        delay(100)();
                    }
                } else {
                    hovered = shown;
                    delay(500)();
                }
            } else {
                hovered = null;
                delay(500)();
            }
        });
    })();
})(jQuery, window);