(function() {
    $.support.cors = true;
//DICTATIONPERFDEV
//    var ddd = Date.now();
//    var idx = 0;
//    var ajax = $.ajax;
//    var d = $.Deferred;
//    $(function() {
//        console.log('ASDSADASDAS ' + (Date.now() - ddd));

//        var ori = window.executeCommand;
//        window.executeCommand = function(a, b) {
//            console.log('POSTBACK ' + a + ' :: ' + b);
//            ori.apply(window, arguments);
//        };
//    });
//    $(function () { setTimeout(function() { console.log('ASDSADASDAS ' + (Date.now() - ddd)); }); });
//    $.ajax = function () {
//        var p = (arguments.callee.caller || 'non').toString().substring(0, 200).replace(/\r?\n/g, ' ');
//        var xxx = idx;
//        var optionalParams = arguments[0];
//        var x = Date.now();
//        console.log('A '+xxx, p);

//        //console.log('AJAX ' + xxx, optionalParams);
//        var apply = ajax.apply(this, arguments);
//        apply.always(function() {
//             console.log('AJAX finish ' + (Date.now()-x)+ ' :: ' + xxx, optionalParams);
//        });
//        return apply;
//    };
//    $.Deferred = function () {
//        var i = ++idx;
//        var p = (arguments.callee.caller||'non').toString().substring(0, 200).replace(/\r?\n/g, ' ');
//        var apply = d.apply(this, arguments);
//        var tt = Date.now();
//        apply.then(function() {
//            console.log('Deferred: ' + i + '-' + idx + ' Success! ' + (tt - ddd) + '-' + (Date.now() - ddd) + ' :: ' + (Date.now() - tt), p);
//        });

//        if (i == 17) {
//            //debugger;
//        }
////        var r = apply.resolve;
////        apply.resolve = function() {
////            return this.
////        }
//        return apply;
//    };
//    $.extend(true, $.Deferred, d);

    $.datepicker.setDefaults({
        beforeShow: function(input, inst) {
            setTimeout(function() {
                inst.dpDiv.css({
                    zIndex: function(index, value) {
                        return ZillionParts.zIndex();
                    }
                });
            }, 0);
        }
    });

    // jQuery made me sad by not having a base type for their deferred.
    // Resolves or rejects deferred X using the result of deferred Y.
    jQuery.Deferred.accept = function (x, y) {
        y.done(x.resolve.bind(x));
        y.fail(x.reject.bind(x));
    };

    window.externalLog = {
        log: function(x) {
            console.log(x);
        }
    };

    //
    // Begin :: Customize for correct sorting behavior.
    if (window.moment) {
        moment.fn.toSortKey = function() {
            return this.unix();
        };
    }
    // End :: Customize for correct sorting behavior.
    //

    window.addZeroWidthSpace = function(text) {
        // Add zero-width space (&#x200b;) after each '/', '&', '.' and ','
        return text.replace(/[\/&.,]/g, '$&&#x200b;');
    };

    if (ZillionParts.Support.ie8) {
        function safeActiveElement() {
            try {
                return document.activeElement;
            } catch (err) {
            }
        }

        //
        // Fixes inifinite resize events in IE8, DO NOT REMOVE!
        var prevWW, prevWH;

        function resizeFilter(x) {
            var parentWindow = $(x.target.parentWindow);
            var w = parentWindow.width();
            var h = parentWindow.height();
            if (prevWW !== w || prevWH !== h) {
                prevWW = w;
                prevWH = h;
                return x;
            } else {
                // Prevents the event handlers from being called.
                return false;
            }
        }

        //
        //
        // Very slow in IE8.
        $.expr.filters.tabbable = function() { return false; };

        //    $.ui.dialog.prototype._size = function() {
        //        var b = this.options, c, d, f = this.uiDialog.is(":visible");
        //        this.element.show().css({ width: "auto", minHeight: 0, height: 0 });
        //        if (b.minWidth > b.width) b.width = b.minWidth;
        //        c = this.uiDialog.css({ height: "auto", width: b.width }).height();
        //        d = Math.max(0, b.minHeight - c);
        //        "auto" === b.height ? a.support.minHeight ? this.element.css({ minHeight: d, height: "auto" }) : (this.uiDialog.show(), b = this.element.css("height", "auto").height(), f || this.uiDialog.hide(), this.element.height(Math.max(b, d))) : this.element.height(Math.max(b.height -
        //            c, 0));
        //        this.uiDialog.is(":data(resizable)") && this.uiDialog.resizable("option", "minHeight", this._minHeight());
        //    };
        //$.ui.dialog.prototype._position = function() { };
        $.ui.dialog.prototype.options.FastSizeIE8 = true;
        $.ui.dialog.prototype.open = function() {
            var a = $;
            if (!this._isOpen) {
                var b = this.options, c = this.uiDialog;
                this.overlay = b.modal ? new a.ui.dialog.overlay(this) : null;
                if (b.FastSizeIE8) {
                    var height = b.height || null;
                    var width = b.width || null;
                    var minHeight = b.minHeight || null;
                    var minWidth = b.minWidth || null;
                    this.uiDialog.css({ height: height, width: width, minHeight: minHeight, minWidth: minWidth });
                    //this._size();
                    this._position(b.position);
                } else {
                    this._position(b.position);
                }
                c.show();
                //            this.moveToTop(!0);
                //            b.modal && c.bind("keypress.ui-dialog", function (d) {
                //                if (d.keyCode === a.ui.keyCode.TAB) {
                //                    var b = a(":tabbable", this), c = b.filter(":first"), b = b.filter(":last");
                //                    if (d.target === b[0] && !d.shiftKey) return c.focus(1), !1;
                //                    if (d.target === c[0] && d.shiftKey)
                //                        return b.focus(1),
                //                        !1;
                //                }
                //            });
                //            a(this.element.find(":tabbable").get().concat(c.find(".ui-dialog-buttonpane :tabbable").get().concat(c.get()))).eq(0).focus();
                this._isOpen = !0;
                this._trigger("open");
                return this;
            }
        };

        $.extend(true, jQuery.event, {
            fixHooks: { resize: { filter: resizeFilter } },
            special: {
                focus: {
                    // Fire native event if possible so blur/focus sequence is correct
                    trigger: function(x) {
                        if (this !== safeActiveElement() && this.focus) {
                            try {
                                this.focus();
                                return false;
                            } catch (e) {
                                x.preventDefault();
                                // Support: IE<9
                                // If we error on focus to hidden element (#1486, #12518),
                                // let .trigger() run the handlers
                            }
                        }
                    }
                },
                blur: {
                    trigger: function() {
                        if (this === safeActiveElement() && this.blur) {
                            this.blur();
                            return false;
                        }
                    }
                }
            }
        });
    }

    $(function DevExpress_GetsItSlightlyWrong() {
        __aspxPopupControlZIndex = 10;
    });

    window.ExportTableToExcel = function(table, title) {

        function selectContents() {
            var el = document.getElementById('contents');
            var body = document.body, range, sel;
            if (document.createRange && window.getSelection) {
                range = document.createRange();
                sel = window.getSelection();
                sel.removeAllRanges();
                try {
                    range.selectNodeContents(el);
                    sel.addRange(range);
                } catch (e) {
                    range.selectNode(el);
                    sel.addRange(range);
                }
            } else if (body.createTextRange) {
                range = body.createTextRange();
                range.moveToElementText(el);
                range.select();
            }
        }


        function copyToClipboard() {
            var htmlContent = document.getElementById('contents');
            var controlRange;

            var range = document.body.createTextRange();
            range.moveToElementText(htmlContent);

            //Uncomment the next line if you don't want the text in the div to be selected
            range.select();

            controlRange = document.body.createControlRange();
            controlRange.addElement(htmlContent);
            controlRange.execCommand('Copy');
        }

        var copySupport = !!document.body.createControlRange;
        var x = window.open('about:blank', 'GridExport', 'status=0,resizable=1,width=1000,height=400');
        x.document.open();
        x.document.write('<style>*{font: 400 10pt/1.2em Arial; white-space:nowrap;text-align:left}.explaination{color:#888;font-style:italic}</style>');

        // Header
        x.document.write('<div class=explaination>From here you can copy (CTRL+C) and paste (CTRL+V) the data for example in to Word or Excel.</div>');
        x.document.write('<div>');
        x.document.write('<a href="javascript:selectContents()">Select all</a>');
        if (copySupport) {
            x.document.write(' &bull; <a href="javascript:copyToClipboard()">Copy table to clipboard</a>');
        }
        x.document.write('</div>');
        x.document.write('<br/>');

        // Contents.
        x.document.write('<div id=contents>' + table + '</div>');

        // Scripting.
        x.document.write('<script>');
        x.document.write(selectContents.toString());
        if (copySupport) {
            x.document.write(copyToClipboard.toString());
        }
        if (exportExcelSupport) {
            x.document.write(exportToExcel.toString());
        }
        x.document.write('selectContents();');
        x.document.write('window.scrollTo(0, 0);');
        x.document.write('</script>');
        x.document.close();
        x.document.title = title || 'Export Table';
    };

    $.fn.getAttributes = function() {
        var attributes = {};

        if (this.length) {
            $.each(this[0].attributes, function(index, attr) {
                attributes[attr.name] = attr.value;
            });
        }

        return attributes;
    };


    window.crossDomainAjaxAsync = function(url, data) {
        var ajax = $.ajax({
            url: url,
            cache: false,
            dataType: 'json',
            data: JSON.stringify(data),
            type: 'POST',
            async: true
        });
        return ajax;
    };

    window.crossDomainAjax = function(url, data) {
        var ajax = $.ajax({
            url: url,
            cache: false,
            dataType: 'json',
            data: JSON.stringify(data),
            type: 'POST',
            async: false
        });
        return ajax;
    };

    window['currentCulture'] = { "name": "English (United States)", "dateTime": { "dateTimeFull": "dddd, MMMM dd, yyyy h:mm:ss tt", "dateLong": "dddd, MMMM dd, yyyy", "dateShort": "M/d/yyyy", "timeLong": "h:mm:ss tt", "timeShort": "h:mm tt", "firstDayOfWeek": "Sunday", "yearMonth": "MMMM, yyyy", "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "daysShort": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], "monthsShort": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] } };

    var old_goToToday = $.datepicker._gotoToday;
    $.datepicker._gotoToday = function(id) {
        old_goToToday.call(this, id);
        this._selectDate(id);
    };

    if (!Array.prototype.filter) {
        Array.prototype.filter = function(fun /*, thisp */) {
            "use strict";

            if (this == null)
                throw new TypeError();

            var t = Object(this);
            var len = t.length >>> 0;
            if (typeof fun != "function")
                throw new TypeError();

            var res = [];
            var thisp = arguments[1];
            for (var i = 0; i < len; i++) {
                if (i in t) {
                    var val = t[i]; // in case fun mutates this
                    if (fun.call(thisp, val, i, t))
                        res.push(val);
                }
            }

            return res;
        };
    }
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(searchElement /*, fromIndex */) {
            "use strict";
            if (this == null) {
                throw new TypeError();
            }
            var t = Object(this);
            var len = t.length >>> 0;
            if (len === 0) {
                return -1;
            }
            var n = 0;
            if (arguments.length > 0) {
                n = Number(arguments[1]);
                if (n != n) { // shortcut for verifying if it's NaN
                    n = 0;
                } else if (n != 0 && n != Infinity && n != -Infinity) {
                    n = (n > 0 || -1) * Math.floor(Math.abs(n));
                }
            }
            if (n >= len) {
                return -1;
            }
            var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
            for (; k < len; k++) {
                if (k in t && t[k] === searchElement) {
                    return k;
                }
            }
            return -1;
        };
    }
    if (!Array.prototype.clone) {
        Array.prototype.clone = function() {
            return $.extend(true, [], this);
        };
    }
    if (!Array.prototype.map) {
        Array.prototype.map = function(callback) {
            return $.map(this, callback);
        };
    }
    if (!Array.prototype.each) {
        Array.prototype.each = function(callback) {
            return $.each(this, callback);
        };
    }
    if (!Array.prototype.joinText) {
        Array.prototype.joinText = function(seperator, callback) {
            callback = callback || function(c) { return (c || 'null').toString(); };
            var result = '';
            var ii = this.length;
            if (ii > 0) {
                result += callback(this[0]);
                for (var i = 1; i < ii; ++i) {
                    result += seperator + callback(this[i]);
                }
            }
            return result;
        };
    }

    if ('console' in window === false) {
        window.console = {
            log: function() {
            }
        };
    }

    window.textToClipboard = textToClipboard;

    function textToClipboard(text) {
        if (window.clipboardData) {
            window.clipboardData.setData("Text", text);
            return true;
        } else if (window.netscape) {
            netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
            var clip = Components.classes['@mozilla.org/widget/clipboard;1'].createInstance(Components.interfaces.nsIClipboard);
            if (!clip) {
                return false;
            }

            var trans = Components.classes['@mozilla.org/widget/transferable;1'].createInstance(Components.interfaces.nsITransferable);
            if (!trans) {
                return false;
            }

            trans.addDataFlavor('text/unicode');

            var str = new Object();
            var len = new Object();

            var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
            var copytext = text;

            str.data = copytext;

            trans.setTransferData("text/unicode", str, copytext.length * 2);

            var clipid = Components.interfaces.nsIClipboard;
            if (!clip) {
                return false;
            }
            clip.setData(trans, null, clipid.kGlobalClipboard);
            return true;
        }
        return false;
    }
})();

(function() {
    var scriptServerToken = Date.now().toString(36);
    var scriptServerStarted = false;

    window.InvokeRoganLauncher = function(controller, params) {
        var d = new $.Deferred();
        $(function() {
            var nodeList = $('<iframe src="rogan://' +
                controller +
                '/' +
                params +
                '" style="display: none"></iframe>');
            nodeList.appendTo('body');
            nodeList.on('error', function() { d.reject() });
            nodeList.ready(function() { d.resolve() });
            d.always(function () { setTimeout(function () { nodeList.remove(); }, 5000); });
        });
        return d;
    };

    window.LaunchScriptServer = function() {
        if (!scriptServerStarted) {
            scriptServerStarted = true;
            return InvokeRoganLauncher("scriptserver", scriptServerToken);
        }

        return $.when();
    };

    function getControllerInstance(name) {
        return window.ScriptServer && window.ScriptServer[name];
    }

    var ctrl = {};
    window.ConnectController = function(controller) {
        var localScriptServer = 'http://localhost:18101/scriptserver-proto';
        var ctrlScriptUrl = [localScriptServer, controller, 'script', scriptServerToken].join('/');
        var retryCount = 10;
        var retryDelay = 200;

        var d = ctrl[controller];
        if (!d) {
            d = new $.Deferred();
            if (window.ScriptServer && window.ScriptServer[controller]) {
                d.resolve(window.ScriptServer[controller]);
            } else {
                LaunchScriptServer().then(function() {
                        var onOk = function(data) {
                            if (window.ScriptServer && window.ScriptServer[controller]) {
                                console.log('ScriptServer: Connected to existing ' + controller);
                                d.resolve(window.ScriptServer[controller]);
                            } else {
                                new Function(data)();

                                instance = getControllerInstance(controller);
                                if (instance) {
                                    console.log('ScriptServer: Connected to ' + controller);
                                } else {
                                    console.log('ScriptServer: Deploy of ' + controller + ' failed');
                                }

                                // ===================================================================
                                if (ScriptServer.ScriptVersion >= 2) {
                                } else {
                                    // Support for Rogan Launcher version 1.1
                                    var handlers = [];
                                    instance.receive = function(args) {
                                        if ($.isFunction(args)) {
                                            handlers.push(args);
                                            return {
                                                cancel: function() {
                                                    handlers.remove(args);
                                                }
                                            };
                                        } else {
                                            handlers.qEach(function(x) { x(args); });
                                        }
                                    };
                                }
                                // ===================================================================

                                if (window.ScriptServer && window.ScriptServer[controller]) {
                                    d.resolve(window.ScriptServer[controller]);
                                } else {
                                    ctrl[controller] = null;
                                    d.reject();
                                }
                            }
                        };

                        var onFail = function() {
                            console.log('ScriptServer: Failed to connect to ' + controller);
                            ctrl[controller] = null;
                            d.reject();
                        };

                        var tryConnect = function() {
                            $.ajax({ url: ctrlScriptUrl, method: 'GET', dataType: 'text' })
                                .then(onOk, function() {
                                    if (--retryCount > 0) {
                                        setTimeout(function() {
                                            tryConnect();
                                        }, retryDelay);
                                    } else {
                                        onFail();
                                    }
                                });
                        };

                        tryConnect();
                    },
                    function() {
                        ctrl[controller] = null;
                        d.reject();
                    });
            };
        }

        return d;
    };

    var speechMikeDef, lastSetState;
    window.SetSpeechMikeState = function(state, live) {
        if (lastSetState !== state) {
            lastSetState = state;

            ConnectController('SpeechMike').then(function(speechMike) {
                if (live) {
                    speechMike.SetStateLive({ state: state });
                } else {
                    speechMike.SetState({ state: state });
                }
            });
        }
    };

    window.ConnectSpeechMike = function(buttonHandler) {
        // Fix for Incident 004479: register the current window as being part of the "SpeechMike" window group (using
        // ZillionParts.IsLastActiveWindow) as soon as possible, before it becomes inactive as a result of a popup
        // (e.g. the Stored Documents or VR dictation popup). Otherwise this window will not be the last active
        // "SpeechMike" window.
        ZillionParts.IsLastActiveWindow("SpeechMike");

        var d = $.Deferred();
        d.fail(function() { d = null; });

        ConnectController('SpeechMike').then(function(speechMike) {
            var handle = speechMike.receive(function(data) {
                if (data.Error) {
                    console.log('SpeechMike: ' + data);
                }

                if (data.type === "Button") {
                    if (ZillionParts.IsLastActiveWindow("SpeechMike")) {
                        buttonHandler(data.button, data.previousButton);
                    } else {
                        console.log('Ignoring Speech Mike button, I was not the last active window.');
                    }
                }
            });

            d.resolve(handle);
        }, function() {
            d.reject();
        });
        return d;
    };

    window.InternetExplorerPlugin = (function() {
        var inBrowser = {};
        return {
            Open: function(url, target, options) {
                target = target || 'ris-general';
                ConnectController('InternetExplorerPlugin').then(function (x) {
                    window.setTimeout(function () {
                        x.Open({ Url: url, Target: target, DefaultOptions: options });
                    }, 300);
                }, function() {
                    inBrowser[target] = window.open(url, target, options, true);
                });
            },
            Navigate: function (url, target, options) {
                target = target || 'ris-general';
                ConnectController('InternetExplorerPlugin').then(function (x) {
                    window.setTimeout(function () {
                        x.Navigate({ Url: url, Target: target, DefaultOptions: options });
                    }, 300);
                }, function () {
                    if (inBrowser[target] && !inBrowser[target].closed) {
                        inBrowser[target] = window.open(url, target, options, true);
                    }
                });
            },
            Close: function (target) {
                target = target || 'ris-general';
                var w = inBrowser[target];
                if (w) {
                    inBrowser[target] = null;
                    w.close();
                } else {
                    ConnectController('InternetExplorerPlugin').then(function(x) {
                        x.CloseLive({ Target: target });
                    });
                }
            }
        };
    })();
})();
