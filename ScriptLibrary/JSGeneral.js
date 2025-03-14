(function ($, window) {
    $.fn.pageLoaded = function (callback) {
        $(function () {
            var aspnetSys = window.Sys;
            if (aspnetSys && aspnetSys.WebForms && aspnetSys.WebForms.PageRequestManager) {
                aspnetSys.WebForms.PageRequestManager.getInstance().add_endRequest(callback);
            }

            callback();
        });
    };

    window.Scroller = function (divID, enableH, enableV) {
        var dimensions = {};

        var offsetDiv = $('<div></div>').addClass('ui-scroller').css({ position: 'absolute', left: '0px' });
        var divObject = $(divID);
        divObject.wrapInner(offsetDiv);
        offsetDiv = divObject.find('.ui-scroller');

        function updateDimensions() {
            var pos = divObject.offset();
            var visibleWidth = divObject.outerWidth();
            var scrollableWidth = offsetDiv.outerWidth();

            dimensions.x = pos.left;
            dimensions.vw = visibleWidth;
            dimensions.sw = scrollableWidth;
        }

        var scrollTopLeftEmpty = false;
        function scrollTo(p) {
            if (dimensions.vw < dimensions.sw) {
                if (p < -1) p = -1;
                if (p > 0) p = 0;
                offsetDiv[0].style.left = (((dimensions.vw - dimensions.sw) * p * -1) | 0) + 'px';
                updateDimensions();
                scrollTopLeftEmpty = false;
            } else if (!scrollTopLeftEmpty) {
                offsetDiv[0].style.left = null;
                scrollTopLeftEmpty = true;
            }
        }

        var mouseOut = true;
        $(document).on('mousemove', function (e) {
            if (e.pageY < 200) {
                mouseOut = false;
                var deadZone = 100;
                var left = dimensions.x + deadZone;
                var width = dimensions.vw - deadZone * 2;
                var newPosition = 1 / width * (left - e.pageX);
                scrollTo(newPosition);
            } else if (!mouseOut) {
                mouseOut = true;

                // Scroll to active tab.
                var offset = offsetDiv.find('.ui-state-active').offset();
                if (offset) {
                    var x = offset.left - 200;
                    var x2 = offsetDiv.offset().left;
                    var p = x2 - x;
                    scrollTo(1 / (dimensions.vw) * p);
                }
            }
        });
        this.initialize = function () {
            updateDimensions();

            $(window).on('resize', updateDimensions);

            // Scroll to active tab.
            var offset = offsetDiv.find('.ui-state-active').offset();
            if (offset) {
                var x = offset.left - 200;
                var x2 = offsetDiv.offset().left;
                var p = x2 - x;
                scrollTo(1 / (dimensions.vw) * p);
            }
        };
    };

    /* 
    var vdgBenchmark = (function () {
    var running = false;

    function vdgBenchmark() {
    if (running) {
    return;
    } else {
    running = true;
    }

    var tmp = $('.virtual-data-grid');
    var idx = 0;

    function iteration() {
    try {
    var $this = $(tmp[idx]);
    var score = $this.virtualDataGrid('benchmark');
    var f = $this.find('[benchmark]');
    if (f.length == 0) {
    f = $('<span benchmark style="position: absolute; background: red; color: white; padding: 2px; z-index: 9999; font-weight: bold; font-size: 8pt; line-height: 8pt"></span>');
    f.appendTo($this);
    f.position({ my: 'left top', at: 'left top', of: $this });
    }
    f.html((Math.floor(score.score * 10) / 10).toFixed(1) + ' - ' + score.totalTime.toFixed(0) + 'ms' + ' (' + score.overhead.toFixed(0) + 'ms) - ' + score.timePerItem.toFixed(2) + 'ms');
    f.css('background', score.score >= 8.5 ? 'green' : 'red');
    } catch (ex) { }

    if (++idx < tmp.length) {
    setTimeout(iteration, 100);
    } else {
    setTimeout(vdgBenchmark, 5000);
    running = false;
    }
    }

    if (tmp.length > 0) {
    setTimeout(iteration, 100);
    } else {
    setTimeout(vdgBenchmark, 5000);
    running = false;
    }
    }

    return vdgBenchmark;
    })();

    setTimeout(vdgBenchmark, 2000); /**/

    function IE9_aspxEmulateOnMouseDown(element, evt) {
        var emulatedEvt = document.createEvent("MouseEvents");
        emulatedEvt.initMouseEvent("mousedown", true, true, window, 0, evt.screenX, evt.screenY, evt.clientX, evt.clientY, evt.ctrlKey, evt.altKey, evt.shiftKey, false, 0, null);
        element.dispatchEvent(emulatedEvt);
    }

    // Replace the DevExpress method _aspxEmulateOnMouseDown when the render mode is IE9 or higher.
    if (document['documentMode'] >= 9) {
        document.addEventListener("DOMContentLoaded", function () {
            _aspxEmulateOnMouseDown = IE9_aspxEmulateOnMouseDown;
        }, false);
    }

    window.onSilverlightError = function (sender, args) {
        var appSource = "";
        if (sender != null && sender != 0) {
            appSource = sender.getHost().Source;
        }

        var errorType = args.ErrorType;
        var iErrorCode = args.ErrorCode;

        if (errorType == "ImageError" || errorType == "MediaError") {
            return;
        }

        var errMsg = "Unhandled Error in Silverlight Application " + appSource + "\n";

        errMsg += "Code: " + iErrorCode + "    \n";
        errMsg += "Category: " + errorType + "       \n";
        errMsg += "Message: " + args.ErrorMessage + "     \n";

        if (errorType == "ParserError") {
            errMsg += "File: " + args.xamlFile + "     \n";
            errMsg += "Line: " + args.lineNumber + "     \n";
            errMsg += "Position: " + args.charPosition + "     \n";
        } else if (errorType == "RuntimeError") {
            if (args.lineNumber != 0) {
                errMsg += "Line: " + args.lineNumber + "     \n";
                errMsg += "Position: " + args.charPosition + "     \n";
            }
            errMsg += "MethodName: " + args.methodName + "     \n";
        }

        ErrorReporting.Exception(errMsg, 'Silverlight Error', 'Zillion Speech');
        notify.showInformation(errMsg);
    };
})(jQuery, window);