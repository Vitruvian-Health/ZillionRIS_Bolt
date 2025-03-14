(function (window, ko, undefined) {
    var risuimodule = angular.module('ui.ris', ['ngAnimate']);

    var debugModulesGrid = zpDebugProxy('modules grid');
    risuimodule.provider('$virtualDataGridEdit', function () {
        return {
            '$get': [
                function () {
                    return function ($scope) {
                        return {
                            onRequestCancel: function (cb) {
                                $scope.$on('vdg.edit.request-cancel', function (e, options) {
                                    debugModulesGrid.trace('Virtual Data Grid Edit: Requested cancel...');
                                    cb(options);
                                });
                            },
                            requestCancel: function (options) {
                                debugModulesGrid.trace('Virtual Data Grid Edit: Requesting cancel');
                                $scope.$broadcast('vdg.edit.request-cancel', options);
                            },
                            onRequestSave: function (cb) {
                                $scope.$on('vdg.edit.request-save', function (e, options) {
                                    debugModulesGrid.trace('Virtual Data Grid Edit: Requested save...');
                                    cb(options);
                                });
                            },
                            requestSave: function (options) {
                                debugModulesGrid.trace('Virtual Data Grid Edit: Requesting save');
                                $scope.$broadcast('vdg.edit.request-save', options);
                            },
                            onCancel: function (cb) {
                                $scope.$on('vdg.edit.cancel', function (e, options) {
                                    debugModulesGrid.trace('Virtual Data Grid Edit: Cancelling...');
                                    cb(options);
                                });
                            },
                            cancel: function (options) {
                                debugModulesGrid.trace('Virtual Data Grid Edit: Cancel All');
                                $scope.$emit('vdg.edit.cancel', options);
                            },
                            onSave: function (cb) {
                                $scope.$on('vdg.edit.save', function (e, options) {
                                    debugModulesGrid.trace('Virtual Data Grid Edit: Saving...');
                                    cb(options);
                                });
                            },
                            save: function (options) {
                                debugModulesGrid.trace('Virtual Data Grid Edit: Save All');
                                $scope.$emit('vdg.edit.save', options);
                            }
                        };
                    };
                }
            ]
        };
    });

    risuimodule.filter('crln', function () { return crln; });
    risuimodule.filter('fmt', function () {
        return function (input, format) {
            switch (format) {
                case '{0:0.00}':
                    return Math.round((+input) * 100) / 100;
                case '{0:+0.00}':
                    return (input > 0 ? '+' : '') + Math.round((+input) * 100) / 100;

                default:
                    return input;
            }
        };
    });
    risuimodule.filter('moment', function () {
        return function (input, option) {
            var m = moment(input);
            if (m && m.isValid()) {
                m = m.local();

                var text;
                switch (option || 'fromNow') {
                    case 'fromNow':
                        text = m.fromNow();
                        break;
                    case 'humanize':
                        text = m.humanize();
                        break;
                    case 'calendar':
                        text = m.calendar();
                        break;
                    case 'calendar-date':
                        text = m.startOf('day').calendar();
                        break;
                    case 'mediumTime':
                        text = m.format('LTS');
                        break;
                    case 'short':
                        text = m.format('l LT');
                        break;
                    case 'medium':
                        text = m.format('LLL');
                        break;
                    case 'full':
                        text = m.format('LLLL');
                        break;
                    default:
                        text = m.format(option);
                        break;
                }

                return text;
            }
            if (typeof input === 'string') {
                return input;
            }
            return '';
        };
    });
    risuimodule.filter('limitText', function () {
        return function (input, limit) {
            if (input) {
                input = '' + input;
                if (input.length > limit) {
                    return input.substr(0, limit) + '...';
                }
                return input;
            }

            return null;
        };
    });

    risuimodule.animation('.slide-animation', function () {
        return {
            removeClass: function (element, className, done) {
                if (className == 'ng-hide') {
                    element.removeClass('ng-hide');

                    element.css({ left: -element.parent().width(), position: 'absolute' });
                    element.animate({ left: 0 }, {
                        duration: 200,
                        complete: function () {
                            element.css({ position: 'relative' });
                            done();
                        }
                    });
                } else {
                    done();
                }
            }
        };
    });
    risuimodule.animation('.fade-in', function () {
        return {
            enter: function (element, parentElement, afterElement, done) {
                element = element.first();
                element.css({ opacity: 0 });
                element.animate({ opacity: 1 }, { duration: 500, complete: done });
            },
            removeClass: function (element, className, done) {
                element = element.first();
                if (className == 'ng-hide') {
                    element.removeClass('ng-hide');

                    element.css({ opacity: 0 });
                    element.animate({ opacity: 1 }, { duration: 500, complete: done });
                } else {
                    done();
                }
            }
        };
    });

    risuimodule.directive('quickNgRepeat', [
        '$parse', '$animate', '$rootScope', 'quickRepeatList', function ($parse, $animate, $rootScope, quick_repeat_list) {
            // Source: https://github.com/allaud/quick-ng-repeat/
            var NG_REMOVED = '$$NG_REMOVED';
            var ngRepeatMinErr = 'err';
            var uid = ['0', '0', '0'];
            var list_id = window.list_id = (function () {
                var i = 0;
                return function () {
                    return 'list_' + (++i);
                };
            }());

            function hashKey(obj) {
                var objType = typeof obj,
                    key;

                if (objType == 'object' && obj !== null) {
                    if (typeof (key = obj.$$hashKey) == 'function') {
                        // must invoke on object to keep the right this
                        key = obj.$$hashKey();
                    } else if (key === undefined) {
                        key = obj.$$hashKey = nextUid();
                    }
                } else {
                    key = obj;
                }

                return objType + ':' + key;
            };

            function isWindow(obj) {
                return obj && obj.document && obj.location && obj.alert && obj.setInterval;
            };

            function nextUid() {
                var index = uid.length;
                var digit;

                while (index) {
                    index--;
                    digit = uid[index].charCodeAt(0);
                    if (digit == 57 /*'9'*/) {
                        uid[index] = 'A';
                        return uid.join('');
                    }
                    if (digit == 90 /*'Z'*/) {
                        uid[index] = '0';
                    } else {
                        uid[index] = String.fromCharCode(digit + 1);
                        return uid.join('');
                    }
                }
                uid.unshift('0');
                return uid.join('');
            };

            function isArrayLike(obj) {
                if (obj == null || isWindow(obj)) {
                    return false;
                }

                var length = obj.length;

                if (obj.nodeType === 1 && length) {
                    return true;
                }

                return angular.isArray(obj) || !angular.isFunction(obj) && (
                    length === 0 || typeof length === "number" && length > 0 && (length - 1) in obj
                );
            };


            return {
                transclude: 'element',
                priority: 1000,
                terminal: true,
                compile: function (element, attr, linker) {
                    return function ($scope, $element, $attr) {
                        var expression = $attr.quickNgRepeat;
                        var match = expression.match(/^\s*(.+)\s+in\s+(.*?)\s*(\s+track\s+by\s+(.+)\s*)?$/),
                            trackByExp,
                            trackByExpGetter,
                            trackByIdFn,
                            trackByIdArrayFn,
                            trackByIdObjFn,
                            lhs,
                            rhs,
                            valueIdentifier,
                            keyIdentifier,
                            hashFnLocals = { $id: hashKey };

                        if (!match) {
                            throw ngRepeatMinErr('iexp', "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
                                expression);
                        }

                        lhs = match[1];
                        rhs = match[2];
                        trackByExp = match[4];

                        if (trackByExp) {
                            trackByExpGetter = $parse(trackByExp);
                            trackByIdFn = function (key, value, index) {
                                // assign key, value, and $index to the locals so that they can be used in hash functions
                                if (keyIdentifier) hashFnLocals[keyIdentifier] = key;
                                hashFnLocals[valueIdentifier] = value;
                                hashFnLocals.$index = index;
                                return trackByExpGetter($scope, hashFnLocals);
                            };
                        } else {
                            trackByIdArrayFn = function (key, value) {
                                return hashKey(value);
                            };
                            trackByIdObjFn = function (key) {
                                return key;
                            };
                        }

                        match = lhs.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);
                        if (!match) {
                            throw ngRepeatMinErr('iidexp', "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.",
                                lhs);
                        }
                        valueIdentifier = match[3] || match[1];
                        keyIdentifier = match[2];

                        // Store a list of elements from previous run. This is a hash where key is the item from the
                        // iterator, and the value is objects with following properties.
                        //   - scope: bound scope
                        //   - element: previous element.
                        //   - index: position
                        var lastBlockMap = {};

                        var list_name = $attr.quickRepeatList || list_id();

                        //watch props
                        $scope.$watch(rhs, quick_repeat_list[list_name] = function (collection) {
                            var index,
                                length,
                                previousNode = $element[0], // current position of the node
                                nextNode,
                                // Same as lastBlockMap but it has the current state. It will become the
                                // lastBlockMap on the next iteration.
                                nextBlockMap = {},
                                arrayLength,
                                childScope,
                                key,
                                value, // key/value of iteration
                                trackById,
                                collectionKeys,
                                block, // last object information {scope, element, id}
                                nextBlockOrder = [];


                            if (isArrayLike(collection)) {
                                collectionKeys = collection;
                                trackByIdFn = trackByIdFn || trackByIdArrayFn;
                            } else {
                                trackByIdFn = trackByIdFn || trackByIdObjFn;
                                // if object, extract keys, sort them and use to determine order of iteration over obj props
                                collectionKeys = [];
                                for (key in collection) {
                                    if (collection.hasOwnProperty(key) && key.charAt(0) != '$') {
                                        collectionKeys.push(key);
                                    }
                                }
                                collectionKeys.sort();
                            }

                            arrayLength = collectionKeys.length;

                            // locate existing items
                            length = nextBlockOrder.length = collectionKeys.length;
                            for (index = 0; index < length; index++) {
                                key = (collection === collectionKeys) ? index : collectionKeys[index];
                                value = collection[key];
                                trackById = trackByIdFn(key, value, index);
                                if (lastBlockMap.hasOwnProperty(trackById)) {
                                    block = lastBlockMap[trackById];
                                    delete lastBlockMap[trackById];
                                    nextBlockMap[trackById] = block;
                                    nextBlockOrder[index] = block;
                                } else if (nextBlockMap.hasOwnProperty(trackById)) {
                                    // restore lastBlockMap
                                    angular.forEach(nextBlockOrder, function (block) {
                                        if (block && block.startNode) lastBlockMap[block.id] = block;
                                    });
                                    // This is a duplicate and we need to throw an error
                                    throw ngRepeatMinErr('dupes', "Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}",
                                        expression, trackById);
                                } else {
                                    // new never before seen block
                                    nextBlockOrder[index] = { id: trackById };
                                    nextBlockMap[trackById] = false;
                                }
                            }

                            // remove existing items
                            for (key in lastBlockMap) {
                                if (lastBlockMap.hasOwnProperty(key)) {
                                    block = lastBlockMap[key];
                                    $animate.leave(block.elements);
                                    angular.forEach(block.elements, function (element) { element[NG_REMOVED] = true; });
                                    block.scope.$destroy();
                                }
                            }

                            // we are not using forEach for perf reasons (trying to avoid #call)
                            for (index = 0, length = collectionKeys.length; index < length; index++) {
                                key = (collection === collectionKeys) ? index : collectionKeys[index];
                                value = collection[key];
                                block = nextBlockOrder[index];

                                if (block.startNode) {
                                    // if we have already seen this object, then we need to reuse the
                                    // associated scope/element
                                    childScope = block.scope;

                                    nextNode = previousNode;
                                    do {
                                        nextNode = nextNode.nextSibling;
                                    } while (nextNode && nextNode[NG_REMOVED]);

                                    if (block.startNode == nextNode) {
                                        // do nothing
                                    } else {
                                        // existing item which got moved
                                        $animate.move(block.elements, null, angular.element(previousNode));
                                    }
                                    previousNode = block.endNode;
                                } else {
                                    // new item which we don't know about
                                    childScope = $scope.$new();
                                }

                                childScope[valueIdentifier] = value;
                                if (keyIdentifier) childScope[keyIdentifier] = key;
                                childScope.$index = index;
                                childScope.$first = (index === 0);
                                childScope.$last = (index === (arrayLength - 1));
                                childScope.$middle = !(childScope.$first || childScope.$last);
                                childScope.$odd = !(childScope.$even = index % 2 == 0);

                                if (!block.startNode) {
                                    linker(childScope, function (clone) {
                                        $animate.enter(clone, null, angular.element(previousNode));
                                        previousNode = clone;
                                        block.scope = childScope;
                                        block.startNode = clone[0];
                                        block.elements = clone;
                                        block.endNode = clone[clone.length - 1];
                                        nextBlockMap[block.id] = block;
                                    });

                                    if ($rootScope.$$phase !== '$digest' && childScope.$$phase !== '$digest') {
                                        childScope.$digest();
                                    }
                                }
                            }
                            lastBlockMap = nextBlockMap;
                        });
                    };
                }
            };
        }
    ]);

    risuimodule.directive('uiCenter', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var lastTime = 0, lt = 0;
                var update = function () {
                    var fpsHigh = 1000 / 30;
                    var fpsLow = 1000 / 15;
                    var time = Date.now();
                    if (time - lastTime >= fpsHigh) {
                        var el = element[0];
                        if (el) {
                            el.style.position = 'absolute';
                            el.style.top = (((element.outerHeight(true) / 2) * -1) | 0) + 'px';
                            el.style.left = (((element.outerWidth(true) / 2) * -1) | 0) + 'px';
                            lastTime = time;
                        }
                        if (lt) {
                            clearTimeout(lt);
                            lt = 0;
                        }
                    } else if (lt === 0) {
                        lt = setTimeout(update, fpsLow);
                    }
                };
                scope.$on('layout', update);
                scope.$watch(ZillionParts.Delay(update, 0, false), angular.noop);
                $(window).resize(update);
            }
        };
    });
    risuimodule.directive('ngFocusin', function ($parse) {
        return {
            restrict: 'A',
            compile: function ($element, attr) {
                var fn = $parse(attr.ngFocusin);
                return function (scope, element, attr) {
                    element.on('focusin', function (event) {
                        scope.$apply(function () {
                            fn.assign(scope, true);
                        });
                    });
                    element.on('focusout', function (event) {
                        scope.$apply(function () {
                            fn.assign(scope, false);
                        });
                    });
                };

            }
        };
    });
    risuimodule.directive('clickChildren', function ($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var selector = attrs.selector;
                var fun = $parse(attrs.clickChildren);
                element.on('click', selector, function (e) {
                    // no need to create a jQuery object to get the attribute 
                    var idx = e.target.getAttribute('data-index');
                    fun(scope)(idx);
                });
            }
        };
    });
    risuimodule.directive('moment', function ($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var selector = attrs.moment;
                scope.$watch(function () {
                    var fun = scope.$eval(selector);
                    if (fun) {
                        element.text(moment(fun).calendar());
                    } else {
                        element.text('-');
                    }
                });
            }
        };
    });
    risuimodule.directive('shortcodes', function () {
        return {
            scope: false,
            restrict: 'A',
            link: function (scope, element, attr) {
                var options;
                eval('options = ' + attr.shortcodes);
                var templateType = options.TemplateType || null;
                var sign = options.Sign !== '' ? (options.Sign || null) : options.Sign;

                $(element).shortcodes({ TemplateType: templateType, Sign: sign });
            }
        };
    });
    risuimodule.directive('zpValid', function () {
        return {
            //            scope: {
            //                'zpValid': '&'
            //            },
            restrict: 'A',
            link: function (scope, element, attr) {
                var zpValid = attr.zpValid;
                scope.$watch(function ($scope) {
                    try {
                        var valid = $scope.$eval(zpValid);
                        element.removeClass('validation-error');
                        if (!valid) {
                            element.addClass('validation-error');
                        }
                    } catch (ex) {
                    }
                });
            }
        };
    });
    risuimodule.directive('zpChoicelist', [
        '$parse', '$window', '$compile', function ($parse, window, $compile) {
            return {
                link: function (scope, element, attr) {
                    var xxx = $parse(attr.ngModel);
                    var rand = function () {
                        return Math.random().toString(36).substr(2); // remove `0.`
                    };

                    var token = function () {
                        return rand() + rand(); // to make it longer
                    };
                    var map = [];
                    var name = token();
                    element.css('list-style', 'none');
                    element.css('padding-left', '1em');
                    element.children('li').each(function () {
                        var $choice = $(this);
                        var val = $choice.attr('zp-choicelist-value');
                        var fn = $parse(val);

                        $choice.wrapInner('<span></span>');
                        var children = $choice.children().first().clone();

                        var lab = $('<label class="ui-link" style="text-decoration: none; display: block"></label>');
                        var rad = $('<input type="radio" name="' + name + '"/>');
                        rad.on('change', function () {
                            if (rad.is(':checked')) {
                                scope.$apply(function () {
                                    xxx.assign(scope, fn(scope));
                                });
                            }
                        });
                        lab.append(rad);
                        lab.append('&nbsp;');
                        lab.append(children);
                        $choice.children().replaceWith(lab);

                        map.push({ choice: fn, input: rad });
                        return lab;
                    });

                    scope.$watch(xxx, function (y) {
                        map.qEach(function (x) {
                            x.input.prop('checked', x.choice(scope) === y);
                        });
                    });
                }
            };
        }
    ]);
    risuimodule.directive('zoomer', [
        '$parse', '$window', function ($parse, window) {
            return {
                scope: false,
                link: function (scope, element, attr) {
                    var fn = $parse(attr.zoomer);
                    var bd = element.children('[zoomer-border]');

                    var mouseState = { x: 0, y: 0, t: null, d: false };
                    element.on('mousedown', function (e) {
                        if (e.button === 0) {
                            mouseState.d = true;
                            updateFromMouse(e);
                        }
                        return false;
                    });
                    $(window).on('mouseup', function (e) {
                        mouseState.d = false;
                    });
                    element.on('mousemove', function (e) {
                        if (mouseState.d) {
                            updateFromMouse(e);
                        }
                    });

                    function updateFromMouse(e) {
                        mouseState.x = e.pageX - element.offset().left;
                        mouseState.y = e.pageY - element.offset().top;
                        mouseState.t = new Date();

                        scope.$apply(function () {
                            var vp = fn(scope);
                            var xScale = 1 / zoomerSize.w * mouseState.x;
                            var yScale = 1 / zoomerSize.h * mouseState.y;
                            vp.x = vp.w * xScale - vp.vpW * 0.5;
                            vp.y = vp.h * yScale - vp.vpH * 0.5;

                            if (vp.x < 0) {
                                vp.x = 0;
                            } else if (vp.x + vp.vpW > vp.w) {
                                vp.x = vp.w - vp.vpW;
                            }
                            if (vp.y < 0) {
                                vp.y = 0;
                            } else if (vp.y + vp.vpH > vp.h) {
                                vp.y = vp.h - vp.vpH;
                            }

                            fn.assign(scope, vp);
                        });
                    }

                    var zoomerSize = { w: element.width(), h: element.height() };

                    function updateBorder(x) {
                        if (x) {
                            bd.css({
                                display: 'block',
                                left: zoomerSize.w / x.w * x.x,
                                top: zoomerSize.h / x.h * x.y,
                                width: zoomerSize.w / x.w * (x.vpW),
                                height: zoomerSize.h / x.h * (x.vpH)
                            });
                        } else {
                            bd.css({ display: 'none' });
                        }
                    }

                    scope.$watch(function () {
                        zoomerSize = { w: element.width(), h: element.height() };
                        updateBorder(fn(scope));
                    }, true);
                }
            };
        }
    ]);

    risuimodule.directive('zpViewport', [
        '$parse', '$window', function ($parse, window) {
            return {
                scope: false,
                restrict: 'A',
                link: function (scope, element, attr) {
                    var fn = $parse(attr.zpViewport);
                    var timer = null;
                    var position = { x: 0, y: 0, w: 0, h: 0, vpW: 0, vpH: 0, vpOW: 0, vpOH: 0, element: element };
                    var el = element[0];
                    var $window = $(window);

                    function bind() {
                        element.one('scroll.scrollPosition', watch);
                        $window.one('resize.scrollPosition', watch);
                    }

                    function unbind() {
                        element.off('scroll.scrollPosition');
                        $window.off('resize.scrollPosition');
                    }

                    function updateCode() {
                        var x = el.scrollLeft;
                        var y = el.scrollTop;
                        var w = el.scrollWidth;
                        var h = el.scrollHeight;
                        var vpH = el.clientHeight;
                        var vpW = el.clientWidth;
                        var vpOH = element.innerHeight() - 25; //25px = scrollbar height.
                        var vpOW = element.innerWidth() - 25; //25px = scrollbar width.
                        if (position.x === x && position.y === y && position.w === w && position.h === h && position.vpH === vpH && position.vpW === vpW && position.vpOH === vpOH && position.vpOW === vpOW) {
                            clearInterval(timer);
                            timer = null;

                            bind();
                        } else {
                            position.x = x;
                            position.y = y;
                            position.w = w;
                            position.h = h;
                            position.vpW = vpW;
                            position.vpH = vpH;
                            position.vpOW = vpOW;
                            position.vpOH = vpOH;
                            scope.$apply(function () {
                                fn.assign(scope, position);
                            });
                        }
                    }

                    function watch() {
                        if (timer === null) {
                            unbind();
                            timer = setInterval(updateCode, 1);
                        }
                    }

                    watch();
                    scope.$on('updateviewport', function () {
                        watch();
                    });

                    scope.$watch(function () {
                        var x = fn(scope);
                        if (x) {
                            el.scrollLeft = x.x;
                            el.scrollTop = x.y;
                        }
                    });
                }
            };
        }
    ]);

    risuimodule.directive('editInPlace', function () {
        return {
            restrict: 'A',
            transclude: true,
            scope: {
                value: '=editInPlace'
            },
            template: '<span ng-click="edit()" ng-transclude></span><input ng-model="valueTemp"/>',
            link: function ($scope, element, attrs) {
                var inputElement = angular.element(element.children()[1]);
                element.addClass('edit-in-place');
                $scope.editing = false;

                // ng-click handler to activate edit-in-place
                $scope.edit = function () {
                    $scope.valueTemp = $scope.value;
                    $scope.editing = true;

                    element.addClass('active');
                    setTimeout(function () {
                        inputElement[0].select();
                    });
                };

                // When we leave the input, we're done editing.
                inputElement.on('blur', function () {
                    $scope.$apply(function () {
                        $scope.value = $scope.valueTemp;
                        $scope.editing = false;
                    });

                    element.removeClass('active');
                });

                inputElement.on('keydown', function (e) {
                    if (e.keyCode == $.ui.keyCode.ESCAPE) {
                        $scope.editing = false;

                        element.removeClass('active');
                        e.preventDefault();
                        e.stopPropagation();
                    } else if (e.keyCode == $.ui.keyCode.ENTER) {
                        $scope.$apply(function () {
                            $scope.value = $scope.valueTemp;
                            $scope.editing = false;
                        });

                        element.removeClass('active');
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            }
        };
    });
    risuimodule.directive('zpSelect', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            scope: {
                'zpSelect': '=',
                'zpValue': '=',
                'zpSelectedId': '=',
                'zpOptions': '=',
                'zpChange': '&',
                'zpEnableSearch': '=',
                'zpEnableClear': '=',
                'zpDisabled': '='
            },
            link: function (scope, element, attrs) {
                var source = scope.zpSelect, isCustom = false;
                var nameID = attrs.zpSelectId || 'id';
                var nameText = attrs.zpSelectText || 'text';

                if ($.isArray(source) || source == null) {
                    source = new ZillionParts.Select.ArraySource(source, nameID, nameText);
                    isCustom = true;
                }

                element.zpSelect($.extend(true, {
                    behavior: 'single',
                    source: source,
                    selectID: nameID,
                    selectText: nameText,
                    enableSearch: attrs.zpEnableSearch != 'false',
                    enableClear: attrs.zpEnableClear != 'false',
                    captionText: attrs.zpCaption,
                    disabled: scope.zpDisabled
                }, scope.zpOptions));

                element.on('change', function () {
                    $timeout(function () {
                        if (attrs.zpValue) {
                            scope.zpValue = element.zpSelect('value');
                        }
                        if (attrs.zpSelectedId) {
                            // Don't assign the new value if both the old and new value are arrays
                            // with the same contents. If we would leave out this check then the
                            // loading of an item would trigger an infinite loop:
                            //
                            // 10 An item is loaded, causing a change event to be triggered
                            // 20 scope.zpSelectedId is updated causing $watch handler for
                            //    scope.zpSelectedId to be triggered
                            // 30 The 'selectedID' method of the zpSelect control is called with
                            //    the list of ids
                            // 40 The zpSelect control creates a new item for each id and sends
                            //    load request for each item.
                            // 50 GOTO 10 
                            // 
                            // An alternative solution to this check could be to modify the
                            // zpSelect control to not create a new item if it can reuse an
                            // existing item from its list of selected items.
                            if (element.zpSelect('instance')) {
                                var newValue = element.zpSelect('selectedID');
                                if (!$.isArray(newValue) ||
                                    !$.isArray(scope.zpSelectedId) ||
                                    newValue.length != scope.zpSelectedId.length ||
                                    newValue.qAny(function(x, i) { return x !== scope.zpSelectedId[i]; })) {
                                    scope.zpSelectedId = newValue;
                                }
                            }
                        }
                        scope.zpChange();
                    });
                });

                scope.$watch(function () { return (scope.zpValue && scope.zpValue[nameID]) || scope.zpValue; }, function (o) {
                    if (element.zpSelect('instance')) {
                        element.zpSelect('value', o);
                    }
                });

                scope.$watch(function () { return scope.zpSelectedId; }, function (o) {
                    element.zpSelect('selectedID', o);
                });

                scope.$watch('zpSelect', function (o) {
                    if (isCustom) {
                        source.setSource(o);
                    }
                    // The source has changed so re-retrieve the selected items.
                    element.zpSelect('selectedID', element.zpSelect('selectedID'));
                });
                scope.$watch('zpDisabled', function (o) {
                    element.zpSelect({ disabled: o });
                });
            }
        };
    }]);
    risuimodule
        .constant('uiDateConfig', {})
        .directive('uiDate', [
            'uiDateConfig', '$timeout', function (uiDateConfig, $timeout) {
                'use strict';
                var options;
                options = {};
                angular.extend(options, uiDateConfig);
                return {
                    require: '?ngModel',
                    link: function (scope, element, attrs, controller) {
                        var getOptions = function () {
                            return angular.extend({}, uiDateConfig, scope.$eval(attrs.uiDate));
                        };
                        var initDateWidget = function () {
                            var showing = false;
                            var opts = getOptions();

                            // If we have a controller (i.e. ngModelController) then wire it up
                            if (controller) {

                                // Set the view value in a $apply block when users selects
                                // (calling directive user's function too if provided)
                                var _onSelect = opts.onSelect || angular.noop;
                                opts.onSelect = function (value, picker) {
                                    scope.$apply(function () {
                                        showing = true;
                                        controller.$setViewValue(element.datepicker("getDate"));
                                        _onSelect(value, picker);
                                        element.blur();
                                    });
                                };
                                opts.beforeShow = function () {
                                    showing = true;
                                };
                                opts.onClose = function (value, picker) {
                                    showing = false;
                                };
                                element.on('blur', function () {
                                    if (!showing) {
                                        scope.$apply(function () {
                                            element.datepicker("setDate", element.datepicker("getDate"));
                                            controller.$setViewValue(element.datepicker("getDate"));
                                        });
                                    }
                                });

                                // Update the date picker when the model changes
                                controller.$render = function () {
                                    var date = controller.$viewValue;
                                    if (angular.isDefined(date) && date !== null && !angular.isDate(date)) {
                                        throw new Error('ng-Model value must be a Date object - currently it is a ' + typeof date + ' - use ui-date-format to convert it from a string');
                                    }
                                    element.datepicker("setDate", date);
                                };
                            }
                            // If we don't destroy the old one it doesn't update properly when the config changes
                            element.datepicker('destroy');
                            // Create the new datepicker widget
                            element.datepicker(opts);
                            if (controller) {
                                // Force a render to override whatever is in the input text box
                                controller.$render();
                            }
                        };
                        // Watch for changes to the directives options
                        scope.$watch(getOptions, initDateWidget, true);
                    }
                };
            }
        ]);

    risuimodule.directive('andyDraggable', function () {
        return {
            restrict: 'A',
            link: function (scope, elm, attrs) {
                var options = scope.$eval(attrs.andyDraggable); //allow options to be passed in
                options.snap = true; //elm.parent();
                elm.draggable(options);
            }
        };
    });
    risuimodule.directive('loadingOverlay', function() {
        return {
            restrict: 'A',
            scope: {
                loadingOverlay: '@',
                overlayVisible: '=',
                overlayDelay: '&'
            },
            link: function(scope, elm, attrs) {
                var delay = scope.overlayDelay();
                if (typeof delay !== 'undefined') {
                    elm.loadingOverlay({ delay: delay });
                }
                scope.$watch(function() {
                    elm.loadingOverlay({ message: scope.loadingOverlay });
                    elm.loadingOverlay(scope.overlayVisible ? 'show' : 'hide');
                });
            }
        };
    });
    risuimodule.directive('virtualDataGrid', [
        'modules', function (modules) {
            return {
                scope: {
                    'virtualDataGrid': '=',
                    'contentProvider': '=',
                    'contentProviderParameters': '=',
                    'selectedItem': '=?',
                    'contentProviderRequesting': '&',
                    'contentProviderLoaded': '&',
                    'contentProviderFailed': '&'
                },
                link: function ($scope, $element) {
                    var options = $scope.virtualDataGrid,
                        dataView = options.dataView,
                        selection = options.selection,
                        origCreateEmptyDataItem = options.createEmptyDataItem,
                        loadError;

                    options.createEmptyDataItem = function () {
                        if ($scope.isLoading) {
                            return $('<span><span class="important-text">Downloading the information ...</span>');
                        } else if (loadError) {
                            return $('<span><span class="important-text">Sorry I was unable to receive the data for you.</span><br/><a class="ui-link">Try again?<a></span>').on('click', 'a', function () {
                                loadError = null;
                                $scope.isLoading = true;
                                $element.virtualDataGrid('refresh');
                                setTimeout(function () {
                                    $scope.$apply(function () {
                                        loadFromContentProvider();
                                    });
                                }, 500); // for visual feedback.
                            });
                        } else {
                            return origCreateEmptyDataItem ? origCreateEmptyDataItem.apply(this, arguments) : $.rogan.virtualDataGrid.prototype.options.createEmptyDataItem.apply(this, arguments);
                        }
                    };
                    var ignoreSelChange = false;

                    function setSelectionFromScope() {
                        if (selection.getCount() > 1) {
                            return;
                        }

                        var oldItem = dataView.getItemByKey(selection.getKeys().qSingleOrNull());
                        var newItem = $scope.selectedItem;

                        if (newItem !== oldItem) {
                            ignoreSelChange = true;
                            try {
                                selection.clear();
                                if (newItem) {
                                    $scope.selectedItem = newItem;
                                    selection.add(newItem.$key);
                                }
                            } finally {
                                ignoreSelChange = false;
                            }
                        }
                    }

                    function onSelectionChanged(s, e) {
                        if (ignoreSelChange) {
                            return;
                        }

                        switch (e.type) {
                            case 'added':
                            case 'removed':
                            case 'cleared':
                                var item = dataView.getItemByKey(selection.getKeys().qSingleOrNull());
                                if ($scope.selectedItem !== item) {
                                    // Not sure if in digest, so start a new stack.
                                    setTimeout(function () {
                                        $scope.$apply(function () {
                                            $scope.selectedItem = item;
                                        });
                                    });
                                }
                                break;
                        }
                    }

                    function onUpdated() {
                        setSelectionFromScope();
                        $element.virtualDataGrid('refresh');
                    }

                    $element.virtualDataGrid(options);
                    $element.virtualDataGrid('refresh');

                    $scope.$watch('selectedItem', setSelectionFromScope);

                    options.selection.onChange.subscribe(onSelectionChanged);
                    options.dataView.onUpdated.subscribe(setSelectionFromScope);
                    $scope.$on('remove', function () {
                        options.selection.onChange.unsubscribe(onSelectionChanged);
                        options.dataView.onUpdated.unsubscribe(setSelectionFromScope);
                    });

                    var loadCheck = 0;

                    function loadFromContentProvider() {
                        var cp = $scope.contentProvider; //aa[0];
                        var cpp = $scope.contentProviderParameters; //aa[1];
                        var keyField = options.keyField;

                        var c = ++loadCheck;

                        if (cp && cpp) {
                            $scope.isLoading = true;
                            $scope.contentProviderRequesting();

                            modules.ContentProvider(cp, 'query', cpp)
                                .then(function (data) {
                                    if (c === loadCheck) {
                                        setSelectionFromScope();
                                        options.createEmptyDataItem = origCreateEmptyDataItem;
                                        dataView.setItems(data, keyField);
                                        dataView.refresh();
                                        $scope.contentProviderLoaded({ items: data });

                                        if (options.initialSelectedKey) {
                                            selection.clear();
                                            selection.add('' + options.initialSelectedKey);
                                        }

                                        setTimeout(function () {
                                            // Timeout required because the grid has not been rendered yet.
                                            if ($element.virtualDataGrid('instance')) {
                                                $element.virtualDataGrid('focusFirstSelection');
                                            }
                                        });
                                    }
                                }, function (data) {
                                    if (c === loadCheck) {
                                        loadError = true;
                                        if ($element.virtualDataGrid('instance')) {
                                            $element.virtualDataGrid('refresh');
                                        }
                                        $scope.contentProviderFailed(data);
                                    }
                                }).always(function () {
                                    if (c === loadCheck) {
                                        $scope.isLoading = false;
                                        if ($element.virtualDataGrid('instance')) {
                                            $element.virtualDataGrid('refresh');
                                        }
                                    }
                                });
                        }
                    };

                    $scope.$watch(function (s) { return [s.contentProvider, s.contentProviderParameters]; }, function (a) { loadFromContentProvider(); }, true);
                    $scope.$on('refresh', function (a) { loadFromContentProvider(); });
                }
            };
        }
    ]);

    risuimodule.directive('virtualDataGridBare', function () {
        return {
            restrict: 'A',
            replace: false,
            link: function (scope, element, attrs) {
                var options = scope.$eval(attrs.virtualDataGridBare);
                element.virtualDataGrid(options);
                options.dataView.onUpdated.subscribe(function () { element.virtualDataGrid('refresh'); });
            }
        };
    });

    risuimodule.directive('gridConfigurationMenu', function () {
        return {
            restrict: 'A',
            replace: false,
            scope: {
                'gridMenuRefresh': '&',
                'gridMenuClearFilter': '&',
                'gridMenuConfigureColumns': '&',
                'gridMenuDefaultSettings': '&'
            },
            link: function (scope, element, attrs) {
                var clearFilter = attrs.gridMenuClearFilter;
                var configureColumns = attrs.gridMenuConfigureColumns;

                var configurationMenu = $('<input type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
                .configurationMenu({
                    align: 'right',
                    items: [
                        { text: locfmt('{ris,ContextMenu_Refresh}'), id: 'refresh', iconClass: 'zillion-ris app-icon refresh' },
                        { text: locfmt('{ris,ContextMenu_ClearFilter}'), id: 'clear-filter', iconClass: '' },
                        { text: locfmt('{ris,ContextMenu_ConfigureColumns}'), id: 'configure', iconClass: 'zillion-ris app-icon customize-table' },
                        { text: locfmt('{ris,ContextMenu_DefaultSettings}'), id: 'reset', iconClass: 'ui-icon ui-icon-refresh' }
                    ],
                    onSelect: function (item) {
                        var gridContent = element.find('.ui-group-panel-content');
                        switch (item.id) {
                            case 'refresh':
                                scope.$apply(function() { scope.gridMenuRefresh(); });
                                break;
                            case 'clear-filter':
                                if (clearFilter) {
                                    scope.$apply(function() { scope.gridMenuClearFilter(); });
                                } else {
                                    // No handler has been specified for the clear-filter command so
                                    // invoke the default behaviour (clear the column filters).
                                    gridContent.virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                                }
                                break;
                            case 'configure':
                                if (configureColumns) {
                                    scope.$apply(function() { scope.gridMenuConfigureColumns(); });
                                } else {
                                    // No handler has been specified for the clear-filter command so
                                    // invoke the default behaviour (show dialog to configure columns).
                                    gridContent.customizeVirtualDataGrid();
                                }
                                break;
                            case 'reset':
                                scope.$apply(function() {
                                    scope.gridMenuDefaultSettings();
                                    scope.gridMenuClearFilter();
                                });
                                if (!clearFilter) {
                                    // No handler has been specified for the clear-filter command so
                                    // invoke the default behaviour (clear the column filters).
                                    gridContent.virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                                }
                                break;
                        }
                    }
                });
                var gridHeader = element.find('.ui-group-panel-header');
                configurationMenu.appendTo(gridHeader);
            }
        };
    });
    
    risuimodule.directive('virtualDataGridExpansionTemplate', [
        'modules', '$compile', '$virtualDataGridEdit', function (modules, $compile, $virtualDataGridEdit) {
            return {
                restrict: 'A',
                scope: false,
                link: function (scope, $element, attrs) {
                    var virtualDataGridEditScope = $virtualDataGridEdit(scope);
                    var moduleUri = scope.$eval(attrs.virtualDataGridExpansionTemplate);
                    var expandScopes = {};
                    var refreshTh = { delay: 100, callback: function () { $element.virtualDataGrid('refresh', 'asap'); } };

                    // Precache.
                    modules.Template(moduleUri);

                    virtualDataGridEditScope.onCancel(function () {
                        $element.virtualDataGrid('collapseAll');
                    });
                    virtualDataGridEditScope.onSave(function (options) {
                        var grid = $element.virtualDataGrid('option', 'dataView');
                        var selection = $element.virtualDataGrid('option', 'selection');

                        grid.refresh();
                        $element.virtualDataGrid('collapseAll');

                        if (options && options.openNext) {
                            var keys = grid.getItems().qSelect('$key');
                            var current = selection.getKeys()[0];
                            var idx = keys.indexOf(current) + 1;
                            if (idx > 0 && idx < keys.length) {
                                var nextKey = keys[idx];

                                setTimeout(function () {
                                    selection.clear();
                                    selection.add(nextKey);
                                    $element.virtualDataGrid('expand', nextKey);
                                });
                            }
                        }
                    });

                    setTimeout(function () {
                        $element.virtualDataGrid('option', 'onItemExpanding', function (item) {
                            debugModulesGrid.debug('Virtual Data Grid Edit: Row Expanding [' + item.$key + ']');

                            var selection = $element.virtualDataGrid('option', 'selection');

                            selection.clear();
                            selection.add(item.$key);

                            var expandedDiv = $('<div class="panel-border-bottom panel-border-right panel-image panel-padding panel-shadow"><h1>One moment please ...</h1></div>');
                            if (item.$key) {
                                modules.Template(moduleUri)
                                    .then(function (x) {
                                        expandedDiv.html(x);

                                        var child = scope.$new();
                                        child.context = { key: item.$key, item: item, $grid: $element };
                                        try {
                                            child.$watch(function () {
                                                throttle(refreshTh);
                                            });
                                            $compile(expandedDiv)(child);
                                            expandScopes[item.$key] = child;

                                            scope.$broadcast('mtLaunch', { item: item });
                                        } catch (ex) {
                                            child.$destroy();
                                            debugModulesGrid.error('Failed to construct virtual data grid expansion template:\n' + ex);
                                        }

                                        setTimeout(function () {
                                            $element.virtualDataGrid('refresh', 'asap');
                                            $element.virtualDataGrid('focusFirstSelection');
                                        });
                                    });

                            }
                            return expandedDiv;
                        });
                        $element.virtualDataGrid('option', 'itemdblclick', function (e, args) {
                            debugModulesGrid.debug('Virtual Data Grid Edit: Double Click [' + args.item.$key + ']');
                            $element.virtualDataGrid('expand', args.item.$key);
                        });
                        $element.virtualDataGrid('option', 'onItemCollapsed', function (key) {
                            debugModulesGrid.debug('Virtual Data Grid Edit: Row Collapsed [' + key + ']');
                            var child = expandScopes[key];
                            if (child) {
                                child.$destroy();

                                $element.virtualDataGrid('option', 'selection').clear();
                                $element.virtualDataGrid('option', 'selection').add(key);
                            }
                        });
                    });
                }
            };
        }
    ]);

    risuimodule.directive('jqVisible', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var x = true;
                scope.$watch(attrs.jqVisible, function (val, oldVal) {
                    //                    if (val != x) {
                    var number = 300;
                    if (val) {
                        if (!element.is(':visible')) {
                            element.delay(number).show('blind', { direction: 'vertical', easing: 'easeOutCubic', duration: number });
                        }
                    } else {
                        if (element.is(':visible')) {
                            element.hide('blind', { direction: 'vertical', easing: 'linear', duration: number });
                        }
                    }
                    //                        x = val;
                    //                    }
                });
            }
        };
    });

    risuimodule.directive('showUntil', [
        '$timeout', function ($timeout) {
            return {
                template: '<span ng-show="showUntilValue" ng-transclude></span>',
                transclude: true,
                replace: true,
                link: function (scope, element, attrs) {
                    var timer;
                    scope.showUntilValue = true;
                    scope.$watch(attrs['showUntil'], function (v) {
                        $timeout.cancel(timer);
                        var diff = v - Date.now();
                        if (diff < 0) {
                            scope.showUntilValue = false;
                        } else {
                            scope.showUntilValue = true;
                            timer = $timeout(function () {
                                scope.showUntilValue = false;
                            }, diff);
                        }
                    });
                }
            };
        }
    ]);
    risuimodule.directive('hideUntil', [
        '$timeout', function ($timeout) {
            return {
                template: '<span ng-hide="hideUntilValue" ng-transclude></span>',
                transclude: true,
                replace: true,
                link: function (scope, element, attrs) {
                    var timer;
                    scope.hideUntilValue = true;
                    scope.$watch(attrs['hideUntil'], function (v) {
                        $timeout.cancel(timer);
                        var diff = v - Date.now();
                        if (diff < 0) {
                            scope.hideUntilValue = false;
                        } else {
                            scope.hideUntilValue = true;
                            timer = $timeout(function () {
                                scope.hideUntilValue = false;
                            }, diff);
                        }
                    });
                }
            };
        }
    ]);
    risuimodule.directive('zpEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown", function (event) {
                if (event.which === 13) {
                    scope.$apply(function () {
                        scope.$eval(attrs.zpEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    });

    risuimodule.directive('jqDatepicker', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            scope: {
                jqDatepicker: '='
            },
            link: function (scope, element, attrs, ngModelCtrl) {
                var dateFormat = ZillionRis.ToMomentFormat(currentCulture.dateTime.dateShort);

                ngModelCtrl.$formatters.unshift(function (modelValue) {
                    if (!dateFormat || !modelValue) return '';
                    var retVal = moment(Date.parse(modelValue)).format(dateFormat);
                    return retVal;
                });

                var options = $.extend({
                    onSelect: function(date, ui) {
                        scope.$apply(function() {
                            ngModelCtrl.$setViewValue(ui.input.datepicker("getDate"));
                        });
                    },
                    showWeek: true,
                    changeMonth: true,
                    changeYear: true,
                    showButtonPanel: true,
                    showOtherMonths: true,
                    selectOtherMonths: true,
                    firstDay: window.currentCulture.dateTime.firstDayOfWeekInt
                }, scope.jqDatepicker);

                $(function () {
                    element.datepicker(options);
                });
            }
        };
    });

    risuimodule.directive('match', function ($parse) {
        return {
            require: 'ngModel',
            link: function (scope, element, attrs, ctrl) {
                scope.$watch(function () {
                    return $parse(attrs.match)(scope) === ctrl.$modelValue;
                }, function (currentValue) {
                    ctrl.$setValidity('mismatch', currentValue);
                });

            }
        };
    });

    risuimodule.directive('nxEqualEx', function () {
        return {
            require: 'ngModel',
            link: function (scope, elem, attrs, model) {
                if (!attrs.nxEqualEx) {
                    console.error('nxEqualEx expects a model as an argument!');
                    return;
                }
                scope.$watch(attrs.nxEqualEx, function (value) {
                    // Only compare values if the both ctrl has a value.
                    if (model.$viewValue !== undefined && model.$viewValue !== '' && value !== undefined && value !== '') {
                        model.$setValidity('nxEqualEx', value === model.$viewValue);
                    }
                });
                model.$parsers.push(function (value) {
                    // Mute the nxEqual error if the both ctrl is empty.
                    if (model.$viewValue === undefined || model.$viewValue === '' || value === undefined || value === '') {
                        model.$setValidity('nxEqualEx', true);
                        return value;
                    }
                    var isValid = value === scope.$eval(attrs.nxEqualEx);
                    model.$setValidity('nxEqualEx', isValid);
                    return isValid ? value : undefined;
                });
            }
        };
    });

    risuimodule.directive('roganloading', function () {
        return {
            restrict: 'A',
            scope: {
                isLoading: '=roganloading'
            },
            link: function (scope, element, attrs) {
                var x = ZillionRis.RoganLoadingWidget(element);

                scope.$watch('isLoading', function (o) {
                    x.update(o);
                });
            }
        };
    });




}(window, window.ko));
