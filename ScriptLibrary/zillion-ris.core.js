(function ($) {
    window.ris = window.ris || {};

    jQuery.fx.off = window.sessionStorage.jQueryFxOff == 'true';

    $.extend(true, window, {
        ZillionRis: {
            ApiUrl: function (url) { throw Error('Unable to resolve API url ' + url + '. ZillionRis.ApiUrl has not been overriden, this is implemented in the PageBase.'); /*return './api/' + url;*/ },
            PageUrl: function (url) { throw Error('Unable to resolve page url' + url + '. ZillionRis.PageUrl has not been overriden, this is implemented in the PageBase.'); /*return './' + url;*/ },
            Navigate: risnavigate,
            SubmitForm: rissubmit,
            PatientContactInfo: openPatientContactInformation,
            OrderInfo: openOrderInformation,
            ApiAjax: apiAjax,
            SingleAjax: SingleAjax,
            SingleApiAjax: SingleApiAjax,
            SiteEvents: new siteEvents(),
            LoadPatientBanner: loadPatientBanner,
            CreateUserAlert: createUserAlert,
            Patients: {
                Search: searchPatient
            },
            LoadingWidget: loadingWidget,
            RoganLoadingWidget: roganLoading,
            Confirmation: confirmDialog,
            ImageViewer: imageViewer,
            GoBackToPreviousPage: goBackToPreviousPage,
            ShowReportIcon: showReportIcon,
            ShowReportTranscribedIcon: showReportTranscribedIcon,
            ShowReportAuthorizedIcon: showReportAuthorizedIcon,
            ToMomentFormat: toMomentFormat,
            ToJQueryFormat: toJQueryFormat,
            HtmlEncode: htmlEncode,
            CreateSelectAllCheckbox: createSelectAllCheckbox,
            AddUrgencyClasses: addUrgencyClasses,
            Withholdable: withholdable
        }
    });

    var historyLength = history.length;

    function goBackToPreviousPage() {
        history.go(historyLength - history.length - 1);
    }

    function htmlEncode(text) {
        return document.createElement('div').appendChild(document.createTextNode(text)).parentNode.innerHTML;
    }

    function toMomentFormat(format) {
        var token = /d{1,4}|M{1,4}|yy(?:yy)?|([HhmsTt])\1?|[LloSZ]|\"[^\"]*\"|'[^']*'/g;
        var flags = {
            d: 'D',
            dd: 'DD',
            ddd: 'ddd',
            dddd: 'dddd',
            M: 'M',
            MM: 'MM',
            MMM: 'MMM',
            MMMM: 'MMMM',
            y: 'YY',
            yy: 'YY',
            yyy: 'YY',
            yyyy: 'YYYY',
            h: 'h',
            hh: 'hh',
            H: 'H',
            HH: 'HH',
            m: 'm',
            mm: 'mm',
            s: 's',
            ss: 'ss',
            t: 'A',
            tt: 'A',
            z: 'Z',
            zz: 'Z',
            zzz: 'ZZ'
        };

        return format.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
    function toJQueryFormat(format) {
        var token = /d{1,4}|M{1,4}|yy(?:yy)?|([HhmsTt])\1?|[LloSZ]|\"[^\"]*\"|'[^']*'/g;
        var flags = {
            d: 'd',
            dd: 'dd',
            ddd: 'D',
            dddd: 'DD',
            M: 'm',
            MM: 'mm',
            MMM: 'M',
            MMMM: 'MM',
            y: 'y',
            yy: 'y',
            yyy: 'yy',
            yyyy: 'yy'
        };

        return format.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };

    function imageViewer() {
        return {
            view: function (params) {

                Loading.Show('Launching the image viewer<br/>One moment please ...');
                return Modules
                    .Task('module://workflow/task/imageviewer', 'show',
                        {
                            Images: params.images,
                            RelevantImagesIncluded: params.relevantImagesIncluded
                        })
                    .always(function() {
                        Loading.Hide();
                    });

            },
            add: function (params) {

                Loading.Show('Adding images<br/>One moment please ...');
                return Modules
                    .Task('module://workflow/task/imageviewer', 'add',
                        {
                            Images: params.images
                        })
                    .always(function() {
                        Loading.Hide();
                    });

            },
            hide: function () {
                return Modules.Task('module://workflow/task/imageviewer', 'hide');
            },
            clear: function() {
                return Modules.Task('module://workflow/task/imageviewer', 'clear');
            },
            clearBeforeUnload: function () {
                ZillionRis.SiteEvents.broadcast('simpleClearViewer');
            },
            getCapabilities: function () {
                return window.ImageViewerCapabilities;
            }
        };
    }

    function apiAjax(options) {
        var result = $.Deferred();

        var ajax = $.ajax(options)
            .then(function (data, status, xhr) {
                if (data.type === 'error') {
                    result.reject(data, status, xhr);
                } else {
                    result.resolve(data, status, xhr);
                }
            }, function (data, status, statusMsg) {
                result.reject({ type: 'error', errorType: 'communication', message: 'A communication error occurred (' + statusMsg + ').', data: data }, status);
            });

        var promise = result.promise();
        promise.abort = function () { return ajax.abort.apply(ajax, arguments); };
        return promise;
    }

    function siteEvents() {
        var self = this;
        var _subscriptions = {};
        var _queue = {};

        this.subscribe = function (eventName, callback) {
            var entry = _subscriptions[eventName];
            if (!entry) {
                _subscriptions[eventName] = entry = [];
            }

            entry.push(callback);

            // Execute events that were remembered before
            var queueEntry = _queue[eventName];
            if (queueEntry) {
                for (var i = 0; i < queueEntry.length; i++) {
                    try {
                        var event = queueEntry[i];
                        callback.apply(event.ref || this, [event.sender, event.args]);
                    } catch (ex) {
                        console.log('Site Events Invoke Error: [' + eventName + '] ' + ex);
                    }
                }
            }

            return {
                unsubscribe: function () {
                    self.unsubscribe(eventName, callback);
                }
            };
        };

        this.broadcast = function (eventName, sender, args, ref, rememberMe) {
            // Should be executed if the broadcast comes in later
            if (rememberMe) {
                var queueEntry = _queue[eventName];
                if (!queueEntry) {
                    _queue[eventName] = queueEntry = [];
                }
                queueEntry.push({ sender: sender, args: args, ref: ref });
            }

            var entry = _subscriptions[eventName];
            if (entry) {
                for (var i = 0, ii = entry.length; i < ii; i++) {
                    try {
                        entry[i].apply(ref || this, [sender, args]);
                    } catch (ex) {
                        // Eat exception.
                        console.log('Site Events Invoke Error: [' + eventName + '] ' + ex);
                    }
                }
            }
        };

        this.unsubscribe = function (eventName, callback) {
            var entry = _subscriptions[eventName];
            if (entry) {
                var i = entry.indexOf(callback);
                if (i > -1) {
                    entry.splice(i, 1);
                }
            }
        };
    }

    var _alertKeyInc = 0;
    function createUserAlert(key, title, clickHandler) {
        if (!key) {
            key = ++_alertKeyInc;
        }
        var alert = { key: key, title: title, click: clickHandler };

        function cancel() {
            ZillionRis.SiteEvents.broadcast('user-alert-ended', null, { key: key });
        }

        ZillionRis.SiteEvents.broadcast('user-alert', null, alert);

        return { alert: alert, cancel: cancel };
    }

    function SingleApiAjax() {
        var lastXhr = null;

        function ajax(options, success, fail, complete, always) {
            abort();

            var def = $.Deferred();

            var xhr = lastXhr = ZillionRis.ApiAjax(options);
            if (success) {
                xhr.then(function (data, status, xhr2) {
                    if (xhr === lastXhr) {
                        success(data, status, xhr2);
                    }
                }, function (data, status, xhr2) {
                    if (xhr === lastXhr && fail) {
                        fail(data, status, xhr2);
                    }
                });
            }
            if (complete) {
                xhr.always(function () {
                    if (xhr === lastXhr) {
                        complete(xhr);
                    }
                });
            }
            if (always) {
                xhr.always(function () {
                    always(xhr);
                });
            }

            return def.promise();
        }

        function abort() {
            var xhr = lastXhr;
            lastXhr = null;
            if (xhr !== null) {
                xhr.abort();
            }
        }

        return {
            "ajax": ajax,
            "abort": abort
        };
    }

    function SingleAjax() {
        var lastXhr = null;

        function ajax(options, success, fail, complete, always) {
            abort();

            var def = $.Deferred();

            var xhr = lastXhr = $.ajax(options);
            if (success) {
                xhr.then(function (data, status, xhr2) {
                    if (xhr === lastXhr) {
                        success(data, status, xhr);
                    }
                }, function (data, status, xhr2) {
                    if (xhr === lastXhr && fail) {
                        fail(data, status, xhr2);
                    }
                });
            }
            if (complete) {
                xhr.always(function () {
                    if (xhr === lastXhr) {
                        complete(xhr);
                    }
                });
            }
            if (always) {
                xhr.always(function () {
                    always(xhr);
                });
            }

            return def.promise();
        }

        function abort() {
            var xhr = lastXhr;
            lastXhr = null;
            if (xhr !== null) {
                xhr.abort();
            }
        }

        return {
            "ajax": ajax,
            "abort": abort
        };
    }

    function openPatientContactInformation(patientID, referralPage) {
        var cancel = false;
        var foo = $('<div>' + locfmt('{ris,ContactInformation_Loading}') + '</div>');
        foo
            .dialog({
                title: locfmt('{ris,ContactInformation_Title}'),
                buttons: [{ text: locfmt('{ris,General_Close}'), click: function () { $(this).dialog('close'); } }],
                close: function () {
                    if (closingEvent) {
                        closingEvent.unsubscribe();
                    }
                    $(this).remove();
                    cancel = true;
                },
                width: 500,
                height: 'auto'
            })
            .load(ZillionRis.PageUrl('Parts/PatientContactInformation.cshtml'),
                { id: patientID, referralPage: referralPage },
                function () {
                    if (!cancel) {
                        foo.dialog({ position: { my: "center", at: "center", of: window } });
                    }
                });

        var closingEvent = ZillionRis.SiteEvents.subscribe('close-popup', function () {
            foo.dialog('close');
        });
    }

    function openOrderInformation(orderID, referralPage) {
        var cancel = false;
        var foo = $('<div>' + locfmt('{ris,OneMomentPlease}') + '</div>');
        foo
            .dialog({
                title: locfmt('{ris,CommandOrderInformation}'),
                buttons: [{ text: locfmt('{ris,General_Close}'), click: function () { $(this).dialog('close'); } }],
                close: function () {
                    if (closingEvent) {
                        closingEvent.unsubscribe();
                    }
                    $(this).remove();
                    cancel = true;
                },
                width: 900,
                height: 'auto'
            })
            .load(ZillionRis.PageUrl('Parts/OrderInformation.cshtml'),
                { id: orderID, referralPage: referralPage },
                function () {
                    if (!cancel) {
                        foo.dialog({ position: { my: "center", at: "center", of: window } });
                    }
                });

        var closingEvent = ZillionRis.SiteEvents.subscribe('close-popup', function () {
            foo.dialog('close');
        });
    }

    function showUnloadMessage(overlayOptions) {
        function cancel() {
            Loading.Hide();
        }

        var timeout = setTimeout(function () { cancel(); }, 5000);

        $(window).one('unload', function () {
            clearTimeout(timeout);
        });

        $(window).loadingOverlay().loadingOverlay(overlayOptions).loadingOverlay('show');
    }

    var defaultNavigationOptions = {
        hint: 'Navigating...',
        url: null,
        page: null
    };
    function risnavigate(options) {
        options = $.extend(true, {}, defaultNavigationOptions, options);

        if (options.page) {
            options.url = ZillionRis.PageUrl(options.page);
        }

        if (!options.url) {
            ris.notify.showError('Unable to open the requested page', 'Due to an error the page is unable to navigate, please reload this page and try again.');
        }

        showUnloadMessage({ message: options.hint });
        setTimeout(function () { window.location.href = options.url; }, 0);
    }

    var defaultSubmitOptions = {
        hint: 'Submitting...',
        url: null,
        page: null,
        data: {},
        method: 'post'
    };
    function rissubmit(options) {
        options = $.extend(true, {}, defaultSubmitOptions, options);

        if (options.page) {
            options.url = ZillionRis.PageUrl(options.page);
        }

        if (!options.url) {
            ris.notify.showError('Unable to open the requested page', 'Due to an error the page is unable to navigate, please reload this page and try again.');
        }

        showUnloadMessage({ message: options.hint });

        var form = $('<form method="' + (options.method || 'post') + '"></form>').attr('action', options.url);
        $.each(options.data, function (key, value) {
            $('<input type="hidden"/>').attr('name', key).val(value).appendTo(form);
        });
        form.appendTo(document.body).submit();
    }

    var patientBannerAjax = null;
    function loadPatientBanner(patientId) {
        if (patientBannerAjax === null) {
            patientBannerAjax = new ZillionRis.SingleAjax();
        }

        if (!patientId) {
            patientBannerAjax.abort();
            $('#PatientBanner').empty();
        } else {
            $('#PatientBanner').css({ opacity: 0.5 });
            patientBannerAjax.ajax({
                url: ZillionRis.PageUrl('Parts/PatientBanner.cshtml?id=' + patientId),
                type: 'post'
            }, function (html) {
                $('#PatientBanner').html(html);
                $('#PatientBanner').css({ opacity: 1 });
            }, function () {
                $('#PatientBanner').empty();
                $('#PatientBanner').css({ opacity: 1 });

                var item = new ZillionParts.Notifications.Item();
                item.type = 'error';
                item.title = 'Patient Banner';
                item.message = 'Failed to load the information for the patient banner due to a communication error with the server.';
                notifications.add(item);
            });
        }
    }

    function searchPatient(type, text) {
        if (text === undefined) {
            text = type;
            type = 'auto';
        } else if (type === undefined) {
            type = 'auto';
        }

        text = encodeURIComponent(text);

        var page = 'patient/search' + '#' + type + ';' + text;
        //        var page = 'patient/search' + '#!search/' + type + '/' + text; // + can.route.url({type :type, text: text});
        //        var page = 'patient/search' + can.route.url({route: 'search', type :type, text: text});
        if (location.pathname === '/patient/search') {
            location.href = ZillionRis.PageUrl(page);
        } else {
            ZillionRis.Navigate({ page: page, hint: locfmt('{ris,LoadingPatientOverview}') });
        }
    }

    function getReportIconToShow(item) {
        if (!('HasReport' in item))
            throw "Item does not have HasReport propery";

        if (!('RegularDictationStatus' in item))
            throw "Item does not have RegularDictationStatus property";            
        
        if (item.HasReport) {
            return "authorized";
        }
        
        if (!item.RegularDictationStatus)
            return "none";

        switch (item.RegularDictationStatus) {
            case "PEN":
            case "CAN":
                return "none";

            case "CDI":
            case "PTR":
                return "dictated";

            case "CTR":
            case "PAU":
            case "CAU": // there is no report yet so we don't return "authorized"
                return "transcribed";

            case "FIN":
                return "authorized";

            default:
                throw "Invalid speech status id";
        }
    }

    function showReportIcon(item) {
        return getReportIconToShow(item) !== "none";
    }

    function showReportTranscribedIcon(item) {
        return getReportIconToShow(item) === "transcribed";
    }

    function showReportAuthorizedIcon(item) {
        return getReportIconToShow(item) === "authorized";
    }

    function loadingWidget(element) {
        $(element).imageloop({
            interval: 100,
            duration: 100,
            frames: [
                { url: ZillionRis.PageUrl('styles/default/loading/1.png'), duration: 500 },
                ZillionRis.PageUrl('styles/default/loading/2.png'),
                ZillionRis.PageUrl('styles/default/loading/3.png'),
                ZillionRis.PageUrl('styles/default/loading/4.png'),
                ZillionRis.PageUrl('styles/default/loading/5.png'),
                ZillionRis.PageUrl('styles/default/loading/6.png'),
                ZillionRis.PageUrl('styles/default/loading/7.png'),
                ZillionRis.PageUrl('styles/default/loading/8.png'),
                ZillionRis.PageUrl('styles/default/loading/9.png'),
                ZillionRis.PageUrl('styles/default/loading/10.png')
            ]
        });
    }

    function roganLoading(element) {
        element = $(element);

        var idx = 1, prev = -1, max = 9, wait = 4;

        var cls = 'rogan loading ani-';
        var duration = 50;
        var timer = 0;

        function set(isLoading) {
            if (isLoading) {
                if (!timer) {
                    //                            start = new Date();
                    timer = setInterval(update, duration);
                    element.stop(true, false).css({ opacity: 1 });
                    update();
                }
            } else {
                if (timer) {
                    element.animate({ opacity: 0 }, 200, function () {
                        clearInterval(timer);
                        timer = 0;

                        element.removeClass(cls + prev);
                    });
                }
            }
        }

        function remove() {
            update(false);
        }

        function update() {
            if (++idx > max + wait) {
                idx = 1;
            }
            var cur = idx - wait;
            if (cur < 1) {
                cur = 1;
            }

            if (prev != cur) {
                element.removeClass(cls + prev);
                element.addClass(cls + cur);
                prev = cur;
            }
            element.addClass(cls + 1);
        }

        return {
            "update": set,
            "remove": remove
        };
    }

    var defaultOptions = {
        title: 'Message',
        content: '',
        height: 'auto',
        width: '400',
        buttons: 'no yes',
        modal: true
    };

    function confirmDialog(options) {
        options = $.extend(true, {}, defaultOptions, options);

        var def = $.Deferred();

        var dialog = $('<div id="ConfirmationDialogContent"></div>');
        dialog.html(options.content);

        var foo = [];
        var buttons = options.buttons;
        if ($.isArray(buttons) == false)
            buttons = buttons.split(' ');
        buttons.qEach(function (a) {
            if ($.isPlainObject(a) && a.click && a.text) {
                var oldClick = a.click;
                a.click = function () {
                    oldClick.call(a, { resolve: function (c) { def.resolve(true, c || a); }, reject: function (c) { def.resolve(false, c || a); } });
                };
                foo.push(a);
            } else {
                switch (a) {
                    case 'close':
                        foo.push({ 'id': getIdByName('close'), 'text': locfmt('{ris,General_Close}'), 'class': 'dialog-cancel-button', 'click': function () { def.resolve(false, a); } });
                        break;
                    case 'yes':
                        foo.push({ 'id': getIdByName('yes'), 'text': locfmt('{ris,General_Yes}'), 'class': 'dialog-save-button', 'click': function () { def.resolve(true, a); } });
                        break;
                    case 'no':
                        foo.push({ 'id': getIdByName('no'), 'text': locfmt('{ris,General_No}'), 'class': 'dialog-cancel-button', 'click': function () { def.resolve(false, a); } });
                        break;
                    case 'cancel':
                        foo.push({ 'id': getIdByName('cancel'), 'text': locfmt('{ris,General_Cancel}'), 'class': 'dialog-cancel-button', 'click': function () { def.resolve(false, a); } });
                        break;
                    case 'ok':
                        foo.push({ 'id': getIdByName('ok'), 'text': locfmt('{ris,General_Ok}'), 'class': 'dialog-save-button', 'click': function () { def.resolve(true, a); } });
                        break;
                    case 'save':
                        foo.push({ 'id': getIdByName('save'), 'text': locfmt('{ris,General_Save}'), 'class': 'dialog-save-button', 'click': function () { def.resolve(true, a); } });
                        break;
                    case 'continue':
                        foo.push({ 'id': getIdByName('continue'), 'text': locfmt('{ris,General_Continue}'), 'class': 'dialog-save-button', 'click': function () { def.resolve(true, a); } });
                        break;
                    case 'retry':
                        foo.push({ 'id': getIdByName('retry'), 'text': locfmt('{ris,General_Retry}'), 'class': 'dialog-save-button', 'click': function () { def.resolve(true, a); } });
                        break;
                    case 'skip':
                        foo.push({ 'id': getIdByName('skip'), 'text': locfmt('{ris,General_Skip}'), 'class': 'dialog-cancel-button', 'click': function () { def.resolve(false, a); } });
                        break;
                        // Special cases.     
                    case 'separate':
                        foo.push({ 'id': getIdByName('separate'), 'text': locfmt('{ris,General_Separate}'), 'class': 'dialog-cancel-button', 'click': function () { def.resolve('separate'); } });
                        break;
                    case 'pdf':
                        foo.push({ 'id': getIdByName('pdf'), 'text': locfmt('{ris,General_ToPDF}'), 'class': 'dialog-cancel-button', 'click': function () { def.resolve(true, a); } });
                        break;
                    case 'print':
                        foo.push({ 'id': getIdByName('print'), 'text': locfmt('{ris,General_Print}'), 'class': 'dialog-cancel-button', 'click': function () { def.resolve(true, a); } });
                        break;
                }
            }
        });
        foo.qEach(function (a, idx) {
            if (idx < foo.length - 1) {
                a.priority = 'secondary';
            }
        });
        dialog.dialog({
            autoOpen: true,
            modal: options.modal,
            resizable: false,
            height: options.height,
            width: options.width,
            title: options.title,
            close: function () {
                if (closingEvent) {
                    closingEvent.unsubscribe();
                }
                def.reject('closed');
            },
            buttons: foo
        });
        dialog.on('keypress', 'form,textarea', function (e) {
            e.stopPropagation();
        });
        dialog.on('keypress', function (e) {
            if (e.keyCode == $.ui.keyCode.ENTER) {
                if (e.currentTarget === dialog[0]) {
                    def.resolve(true);
                    dialog.dialog('close');
                }
            }
        });

        var closingEvent = ZillionRis.SiteEvents.subscribe('close-popup', function () {
            dialog.dialog('close');
        });

        def.always(function () {
            dialog.empty().remove();
        });
        var promise = def.promise();
        promise.$dialog = dialog;
        promise.center = function () {
            dialog.dialog({ position: { my: "center", at: "center", of: window } });
        };
        promise.disableButton = function (name) {
            setButtonAvailability(name, false);
        };
        promise.enableButton = function(name, enable) {
            setButtonAvailability(name, (typeof enable !== 'undefined') ? enable : true);
        };

        function setButtonAvailability(name, enabled) {
            var dialogButtons = dialog.dialog('option', 'buttons');
            var button = dialogButtons.qWhere('id === "' + getIdByName(name) + '"').qFirst();
            if (button) {
                button.disabled = !enabled;
                dialog.dialog('option', 'buttons', dialogButtons);
            }
        }

        function getIdByName(name) {
            switch (name) {
                case 'close':
                    return 'CloseConfirmationButton';
                case 'yes':
                    return 'YesConfirmationButton';
                case 'no':
                    return 'NoConfirmationButton';
                case 'cancel':
                    return 'CancelConfirmationButton';
                case 'ok':
                    return 'OkConfirmationButton';
                case 'save':
                    return 'SaveConfirmationButton';
                case 'continue':
                    return 'ContinueConfirmationButton';
                case 'retry':
                    return 'RetryConfirmationButton';
                case 'skip':
                    return 'SkipConfirmationButton';
                case 'separate':
                    return 'SeparateConfirmationButton';
                case 'pdf':
                    return 'PdfConfirmationButton';
                case 'print':
                    return 'PrintConfirmationButton';
            }
        }

        return promise;
    }


    $.fn.customizeVirtualDataGrid = function () {
        $.each(this, function () {
            var $this = $(this);

            var defaultcolumns = $this.virtualDataGrid('option', 'columns');
            var userColumns = $this.virtualDataGrid('option', 'userColumns');

            // Combine user columns with default columns and sort by visible index.
            var columns = defaultcolumns.qSelect(function(e, i) {
                var userColumn = userColumns.qFirst('fieldID === $params', e.fieldID);
                var columnInfo = $.extend(true, {
                    fieldID: e.fieldID,
                    title: e.friendlyName || e.title,
                    defaultVisible: e.visible == undefined ? true : e.visible,
                    visible: e.visible == undefined ? true : e.visible,
                    index: i
                }, userColumn);
                columnInfo.visible = new zpProperty(columnInfo.visible);
                return columnInfo;
            }).qSort('index');

            // Gather field IDs for default and restore.
            var defaultVisible = columns.qWhere('defaultVisible').qSelect('fieldID');
            var originalVisible = columns.qWhere('visible()').qSelect('fieldID');

            var options = columns.qSelect(function (x) {
                var listItem = $('<li></li>');
                var label = $('<label></label>', { 'class': 'ui-input-checkbox', css: { lineHeight: '1.5em', display: 'block'} });
                var checkbox = $('<input type="checkbox" />').prop('checked', x.visible());
                var text = $('<span></span>', { text: x.title, css: {marginLeft: 5} });

                label.append(checkbox);
                label.append(text);
                listItem.append(label);

                // Change property backing to the checkbox.
                x.visible.read = function () { return checkbox.is(':checked'); };
                x.visible.write = function(v) { if (checkbox.prop('checked') !== !!v) { checkbox.prop('checked', !!v); } };

                return listItem[0];
            });

            var buttons = $('<div class="ui-helper-clearfix"></div>');
            var buttonsLeft = $('<span class="left"></span>').appendTo(buttons);
            buttonsLeft.append($('<button type="button" class="ui-link padded">' + locfmt('{ris,ConfigureColumns_All}') + '</button>').click(function () {
                columns.qEach(function (x) {
                    x.visible(true);
                });
                applyVisible();
            }));
            buttonsLeft.append($('<button type="button" class="ui-link padded">' + locfmt('{ris,ConfigureColumns_None}') + '</button>').click(function () {
                columns.qEach(function (x) {
                    x.visible(false);
                });
                applyVisible();
            }));
            buttonsLeft.append($('<button type="button" class="ui-link padded">' + locfmt('{ris,ConfigureColumns_Default}') + '</button>').click(function () {
                columns.qEach(function (x) {
                    x.visible(defaultVisible.qContains(x.fieldID));
                });
                applyVisible();
            }));

            var buttonsRight = $('<span class="right"></span>').appendTo(buttons);
            buttonsRight.append($('<button type="button" class="ui-link padded">' + locfmt('{ris,General_Cancel}') + '</button>').click(function () {
                columns.qEach(function (x) {
                    x.visible(originalVisible.qContains(x.fieldID));
                });
                applyVisible();
                close();
            }));
            buttonsRight.append($('<button type="button" class="btn">' + locfmt('{ris,General_Ok}') + '</button>').click(function () {
                applyVisible();
                close();
            }));

            var panel = $('<div></div>');
            panel.append('<h2>' + locfmt('{ris,ConfigureColumns_Title}') + '</h2>');
            panel.append('<hr/>');
            panel.append($('<ul style="list-style: none;"></ul>').append(options));
            panel.append('<hr/>');
            panel.append(buttons);
            panel.on('change', function () {
                applyVisible();
            });

            panel.find('button').css({ margin: 2 });
            panel
                .addClass('ui-widget-content')
                .css({ position: 'absolute', zIndex: 500, padding: 10, minWidth: 300 })
                .appendTo('body')
                .position({ my: 'right top', at: 'right top', of: $(this) })
                .show();
        
            
            // Clicking outside of the panel should close it.
            setTimeout(function () {
                $('body').on('mousedown.customizeVirtualDataGrid', function (e) {
                    var $target = $(e.target);
                    var $parents = $target.parents();

                    if (!$target.is(panel) && !$parents.is(panel)) {
                        close();
                    }
                });
            });

            function close() {
                $('body').off('.customizeVirtualDataGrid');
                panel.remove();
            }

            function applyVisible() {
                var items = columns.qSelect('{ fieldID: fieldID, visible: visible() }');

                $this.virtualDataGrid({ userColumns: items });
                $this.virtualDataGrid('refresh');
                return true;
            };
        });
    };

    function createSelectAllCheckbox(column, gridElement) {

        var dataView = gridElement.virtualDataGrid('option', 'dataView');
        var selection = gridElement.virtualDataGrid('option', 'selection');

        var checkbox = $('<input type="checkbox" />');

        var updateCheckBox = function () {
            if (selection.getCount() !== 0 && selection.getCount() === dataView.getItems(false).length) {
                checkbox.attr('checked', '');
            } else {
                checkbox.removeAttr('checked');
            }
        }

        var unsubscribeUpdateCheckboxOnSelectionChanged = function () { };
        var subscribeUpdateCheckboxOnSelectionChanged = function () {
            var subscribeResult = selection.onChange.subscribe(updateCheckBox);
            unsubscribeUpdateCheckboxOnSelectionChanged = subscribeResult.unsubscribe;
        }

        var unsubscribeUpdateCheckboxOnDataViewUpdated = function () { };
        var subscribeUpdateCheckboxOnDataViewUpdated = function () {
            var subscribeResult = dataView.onUpdated.subscribe(updateCheckBox);
            unsubscribeUpdateCheckboxOnDataViewUpdated = subscribeResult.unsubscribe;
        }

        subscribeUpdateCheckboxOnSelectionChanged();

        // The checkbox state depends on the number of items in the dataView: if all are selected, the checkbox should be checked.
        // Make sure that the checkbox is updated when the number of items in the dataView changes.
        subscribeUpdateCheckboxOnDataViewUpdated();

        checkbox.change(function () {
            var i, items;

            // We want to update the selection according to the current checkbox state.
            // Make sure that changing the selection does not change the checkbox state because that would mess things up.
            unsubscribeUpdateCheckboxOnSelectionChanged();
            unsubscribeUpdateCheckboxOnDataViewUpdated();

            selection.clear();
            if (checkbox.attr('checked')) {
                items = dataView.getItems(false);
                for (i = 0; i < items.length; i += 1) {
                    selection.add(items[i].$key);
                }
            }

            // The checkbox and selection state are in sync again.
            subscribeUpdateCheckboxOnSelectionChanged();
            subscribeUpdateCheckboxOnDataViewUpdated();
        });

        checkbox.on('remove', function () {
            // The checkbox has been removed from the DOM so there's no need to update it anymore.
            unsubscribeUpdateCheckboxOnSelectionChanged();
            unsubscribeUpdateCheckboxOnDataViewUpdated();
        });

        return checkbox;
    }

    function addUrgencyClasses(htmlElement, urgencyId) {
        if (urgencyId !== 'NOR') {
            htmlElement.addClass('urgent').addClass('urgent_' + urgencyId);
        }
    }

    // withholdable converts a function (taking no parameters and returning a promise) to the same type of function but
    // with two additional member functions: withold and release. Calling withhold will cause function invocations to be
    // postponed (and consolidated into one invocation) until the release function is called.
    function withholdable(f) {

        var withholdCount = 0; // the number of calls to withhold that have no corresponding call to release
        var deferred = null; // deferred object for invocations that are currently being withheld.

        var result = function () {
            if (withholdCount === 0) {
                return f();
            }
            if (deferred === null) {
                deferred = $.Deferred();
            }
            return deferred.promise();
        };

        result.withhold = function () {
            ++withholdCount;
        };

        result.release = function () {
            if (withholdCount === 0) {
                throw 'release called without corresponding call to withhold';
            }
            --withholdCount;
            if (withholdCount === 0 && deferred) {
                var d = deferred;
                deferred = null;
                f().then(d.resolve.bind(d), d.reject.bind(d));
            }
        };

        return result;
    }

})(jQuery);