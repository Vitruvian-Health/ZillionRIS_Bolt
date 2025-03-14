(function (window, ko, undefined) {
    var risModule = angular.module('ris', []);
    risModule.provider('rislocations', function () {

        this.$get = function () {
            return Rogan.Ris.Locations;
        };
    });
    risModule.provider('modules', function () {
        this.$get = [
            '$q', '$rootScope', function ($q, $rootScope) {
                var types = ['Template', 'Task', 'ContentProvider', 'Activity', 'Process'];
                var copy = ['ContentProviderSource'];

                $rootScope.$watch(function () {
                    ZillionParts.Fluids.Update();
                });

                var result = {};
                types.qEach(function (x) {
                    result[x] = function () {
                        function patchAngularPromise(scope, asd) {
                            if (!asd.always || !asd.fail) {
                                var then = asd.then;
                                asd.then = function () {
                                    return patchAngularPromise(scope, then.apply(this, arguments));
                                };
                                asd.always = asd['finally'];

                                var catchA = asd['catch'];
                                asd.fail = function () {
                                    return patchAngularPromise(scope, catchA.apply(this, arguments));
                                };
                                asd.fail = asd['catch'];
                            }
                            return asd;
                        }

                        var promise = $q.when(Modules[x].apply(Modules[x], arguments));
                        return patchAngularPromise($rootScope, promise);
                    };
                });
                copy.qEach(function (x) {
                    result[x] = Modules[x];
                });
                return result;
            }
        ];
    });
    risModule.provider('loading', function () {
        this.$get = function () {
            var loading = window.Loading;
            return {
                show: function (message) {
                    loading && loading.Show(message, 200);
                },
                hide: function (message) { loading && loading.Hide(); }
            };
        };
    });
    risModule.provider('riscommands', [
        function () {
            this.$get = [
                '$rootScope', '$q', function ($scope, $q) {
                    return {
                        execute: function (cmd, context) {
                            return $q.when(ZillionRis.CommandManager.execute(cmd, context));
                        }
                    };
                }
            ];
        }
    ]);
    risModule.provider('risurl', function () {
        this.$get = function () {
            return {
                apiUrl: ZillionRis.ApiUrl
            };
        };
    });
    risModule.provider('risusersettings', function () {
        return {
            $get: [
                '$rootScope', '$q', function ($scope, $q) {
                    return {
                        read: function (key) {
                            return $q.when(ZillionRis.UserSettings.get(key));
                        },
                        write: function (key, data) {
                            return $q.when(ZillionRis.UserSettings.set(key, null, data));
                        }
                    };
                }
            ]
        };
    });
    risModule.provider('sessionstorage', function () {
        this.$get = function () {
            return {
                get: function (key, def) {
                    var item = window.sessionStorage.getItem(key);

                    if (item) {
                        try {
                            return ZillionParts.ParseJson(item, true);
                        } catch (ex) {
                            console.log('Failed load setting ' + key + ': ' + item);
                        }
                    }

                    return $.isFunction(def) ? def() : def;
                },
                set: function (key, val) {
                    if (val instanceof Date) {
                        window.sessionStorage.setItem(key, '"urn:epoch:' + val.getTime() + '"');
                    } else {
                        window.sessionStorage.setItem(key, JSON.stringify(val));
                    }
                }
            };
        };
    });

    risModule.service('postForm', function () {
        return function (options) {
            var fields = options.fields;
            var custom = options.custom;

            var $f = $('<form></form>', options.form);
            $f.css('display', 'none');

            $.each(fields, function (k, v) {
                $f.append($('<input />', { type: 'hidden', name: k, value: '' + v }));
            });

            if (custom) {
                custom.qEach(function (x) {
                    $(x).remove();
                    $f.append(x);
                });
            }

            return $f;
        };
    });

    risModule.directive('modulesTemplate', [
        '$compile', '$q', 'modules', function ($compile, $q, modules) {
            return {
                scope: {
                    'modulesTemplate': '@',
                    'modulesTemplateScope': '=?',
                    'modulesTemplateLaunch': '=?',
                    'modulesTemplateFocus': '=?',
                    'context': '=?modulesTemplateContext'
                },
                restrict: 'A',
                link: function (scope, element, attr) {
                    var check = 0, myScope, myLaunch;

                    // General flow:
                    //  1. assign context and template
                    //  2. download template
                    //  3. create a new scope
                    //  4. assign context to scope
                    //  5. assign launch parameters
                    //  6. compile template with scope
                    //  7. update layout
                    //  8. focus first input

                    function newMyScope() {
                        if (myScope) {
                            myScope.$destroy();
                            myScope = null;
                        }

                        myScope = scope.$parent.$new();
                    }

                    function updateTemplate() {
                        var c = ++check;

                        var modulesTemplate = scope.modulesTemplate;
                        if (modulesTemplate) {
                            modules.Template(modulesTemplate)
                                .then(function (view) {
                                    if (c === check) {
                                        view = view.clone();

                                        function compileTemplate() {
                                            element.empty();
                                            element.append($compile(view)(myScope));
                                        }

                                        newMyScope();
                                        updateMyScopeContext();
                                        updateMtLaunch();
                                        compileTemplate();
                                        layout();
                                        focusElement();
                                    }
                                }, function () {
                                    if (c === check) {
                                        element.html('<span class=text-emphasis>Failed to load the template</span>');
                                        layout();
                                    }
                                });
                        } else {
                            element.html('<!-- no template specified -->');
                            layout();
                        }
                    }

                    function layout() {
                        ZillionParts.Fluids.Update();
                        scope.$evalAsync(function () {
                            scope.$emit('layout');
                        });
                    }

                    function focusElement() {
                        setTimeout(function () {
                            if (scope.modulesTemplateFocus) {
                                var finds = [':visible[autofocus]', '.zpselect:visible, :input:visible', ':tabbable'];
                                var input;
                                for (var i = 0, ii = finds.length; i < ii; i++) {
                                    input = element.find(finds[i]).not(':disabled').first();
                                    if (input.length) {
                                        input.focus();
                                        break;
                                    }
                                }
                            }
                        });
                    }

                    function copyNonAngularProperties(y, x) {
                        for (var k in x) {
                            if (k[0] !== '$') {
                                y[k] = x[k];
                            }
                        }
                        return y;
                    }

                    function updateMyScopeContext() {
                        if (myScope && scope.modulesTemplateScope) {
                            myScope.$evalAsync(function () {
                                copyNonAngularProperties(myScope, scope.modulesTemplateScope);
                            });
                        }
                    }

                    function updateMtLaunch() {
                        if (myScope && scope.modulesTemplateLaunch) {
                            myScope.$evalAsync(function () {
                                myScope.$broadcast('mtLaunch', scope.modulesTemplateLaunch);
                            });
                        }
                    }

                    scope.$watch('modulesTemplate', updateTemplate);
                    scope.$watch('modulesTemplateScope', updateMyScopeContext);
                    scope.$watch('modulesTemplateLaunch', updateMtLaunch, true);
                }
            };
        }
    ]);
    risModule.directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    scope.$apply(function () {
                        scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    });
    risModule.directive('taskActivity', [
        '$compile', '$q', function ($compile, $q) {
            return {
                scope: {
                    'taskActivity': '='
                },
                link: function (scope, element, attr) {

                }
            };
        }
    ]);
    risModule.directive('dynamicTypeInput', function () {
        return {
            require: ['ngModel'],
            scope: {
                model: '=ngModel',
                type: '=ngType',
            },
            template:
                '<div ng-switch="type">' +
                    '<zp-checkbox id="InputValue" ng-switch-when="Boolean" ng-model="model.Value"></zp-checkbox>' +
                    '<input id="InputValue" ng-switch-when="Int32" type="number" ng-model="model.Value" class="ui-input" min="0" style="width: 100%;">' +
                    '<input id="InputValue" ng-switch-when="Double" type="number" ng-model="model.Value" class="ui-input" min="0" style="width: 100%;">' +
                    '<input id="InputValue" ng-switch-default type="text" ng-model="model.Value" class="ui-input" style="width: 100%;">' +
                '</div>',

            link: function (scope, element) {
                var castValueToType = function (value, type) {
                    var valueConverted;
                    switch (type) {
                        case "Int32":
                        case "Double":
                            valueConverted = Number(value);
                            break;
                        case "Boolean":
                            valueConverted = angular.isString(value) ? value.toLowerCase() === "true" : null;
                            break;
                        default:
                            valueConverted = value;
                    }
                    return valueConverted;
                };

                scope.$watch('type', function (type) {
                    if (scope.model && scope.model.Value != null) {
                        scope.model.Value = castValueToType(scope.model.Value, type);
                    }
                });
            }
        };
    });
    risModule.directive('zpCheckbox', function () {
        var addHover = function () { $(this).addClass("ui-state-hover"); };
        var removeHover = function () { $(this).removeClass("ui-state-hover"); };

        return {
            restrict: 'E',
            require: ['ngModel'],
            replace: false, //Not true due to weird behavior in the model when replacing html with template below.
            scope: {
                model: '=ngModel',
                disabled: '=ngDisabled'
            },
            template: function (element, attrs) {
                var yes = locfmt('{ris,General_Yes}');
                var $on = $('<label ng-click="click(true)" ng-disabled="disabled" ng-class="{ \'ui-state-active\': !disabled && model === true, \'ui-button-disabled ui-state-disabled\': disabled }"><span class="ui-button-text">' + yes + '</span></label>')
                    .addClass('ui-button ui-widget ui-state-default ui-button-text-only ui-corner-left')
                    .hover(addHover, removeHover);

                var no = locfmt('{ris,General_No}');
                var $off = $('<label ng-click="click(false)" ng-disabled="disabled" ng-class="{ \'ui-state-active\': !disabled && model === false, \'ui-button-disabled ui-state-disabled\': disabled }">' + '<span class="ui-button-text">' + no + '</span></label>').addClass('ui-button ui-widget ui-state-default ui-button-text-only ui-corner-right')
                    .hover(addHover, removeHover);

                return $('<div style="display: inline-block"></div>').addClass('ui-buttonset').append($on).append($off);
            },
            link: function (scope, elem, attrs, requires) {
                var ngModel = requires[0];

                scope.click = function (val) {
                    ngModel.$setViewValue(val);
                };
            }
        };
    });
    risModule.directive('zpExchangelist', [
        'modules', function (modules) {
            return {
                restrict: 'E',
                scope: {
                    zpAction: '@',
                    zpDisabled: '=',
                    zpDisplay: '=',
                    zpShowSetdefault: '=',
                    zpShowAddall: '=?',
                    zpEnableAdd: '=?',
                    zpAddedOptions: '=zpModel',
                    zpTask: '@',
                    zpTitle: '@',
                    zpBottomText: '=',
                    zpExchangelistOptionsClass: '@'
                },
                templateUrl: 'Controls/ExchangeList.html',
                link: function(scope, element, attr) {
                    scope.locfmt = window.locfmt;

                    scope.zpAllOptions = [];
                    scope.zpPossibleOptions = [];
                    scope.zpAddedModel = null;
                    scope.zpPossibleModel = null;

                    scope.zpShowAddall = scope.zpShowAddall != undefined ? scope.zpShowAddall : true;
                    scope.zpEnableAdd = scope.zpEnableAdd != undefined ? scope.zpEnableAdd : true;

                    scope.loadPossibleOptions = function () {
                        modules.Task(scope.zpTask, scope.zpAction).then(function (data) {
                            scope.zpAllOptions = data;
                        });
                    };

                    scope.updatePossibleOptions = function () {
                        // Filter out items that are already in the left list.
                        function comparer(l, r) {
                            // compare zpDisplay properties of each object equality
                            return l[scope.zpDisplay] === r[scope.zpDisplay];
                        }

                        scope.zpPossibleOptions = (scope.zpAllOptions || []).qExcept(scope.zpAddedOptions || [], comparer);
                        scope.zpPossibleModel = scope.zpPossibleOptions[0];
                    };

                    scope.getDisplayName = function (item) {
                        return item.Default ? '> ' + item[scope.zpDisplay] + ' <' : item[scope.zpDisplay];
                    };
                    scope.getDefaultText = function () {
                        return scope.zpAddedModel && scope.zpAddedModel.Default ? locfmt('{ris,clearDefault}') : locfmt('{ris,setDefault}');
                    };
                    scope.isDisabled = function () {
                        return scope.zpDisabled
                            || ((!scope.zpAddedOptions || !scope.zpAddedOptions.length)
                                && (!scope.zpPossibleOptions || !scope.zpPossibleOptions.length));
                    };
                    scope.canDefault = function () {
                        return !scope.isDisabled() && scope.zpAddedModel;
                    };
                    scope.isRemovable = function () {
                        return !scope.isDisabled() && scope.zpAddedOptions && scope.zpAddedOptions.length > 0;
                    };
                    scope.isAddable = function () {
                        return !scope.isDisabled() && scope.zpEnableAdd && scope.zpPossibleOptions && scope.zpPossibleOptions.length > 0;
                    };

                    scope.loadPossibleOptions();
                    scope.$watchCollection('zpAllOptions', scope.updatePossibleOptions);
                    scope.$watchCollection('zpAddedOptions', scope.updatePossibleOptions);

                    // Ensure no empty list item is pushed above the list.
                    scope.$watchCollection('zpAddedOptions', function (newValue) {
                        if (newValue && !newValue.qContains(scope.zpAddedModel)) {
                            scope.zpAddedModel = newValue && newValue[0];
                        }
                    });

                    // Ensure no empty list item is pushed above the list.
                    scope.$watchCollection('zpPossibleOptions', function (newValue) {
                        if (newValue && !newValue.qContains(scope.zpPossibleModel)) {
                            scope.zpPossibleModel = newValue && newValue[0];
                        }
                    });

                    scope.setOrClearDefault = function (item) {
                        if (item.Default === true) {
                            scope.removeDefault();
                            reactivateSelects();
                        } else {
                            scope.setDefault(item);
                        }
                    };

                    scope.setDefault = function (item) {
                        scope.removeDefault();
                        item.Default = true;
                        reactivateSelects();
                    };

                    scope.removeDefault = function () {
                        scope.zpAddedOptions.qEach(function (x) { x.Default = false; });
                    };

                    scope.addAll = function () {
                        // Merge right list into left list.
                        scope.zpAddedOptions = scope.zpAddedOptions.concat(scope.zpPossibleOptions);
                        scope.zpPossibleOptions = [];
                        scope.zpPossibleModel = null;
                        reactivateSelects();
                    };

                    scope.removeAll = function () {
                        // Merge left list into right list.
                        scope.removeDefault();
                        scope.zpPossibleOptions = scope.zpPossibleOptions.concat(scope.zpAddedOptions);
                        scope.zpAddedOptions = [];
                        scope.zpAddedModel = null;
                        reactivateSelects();
                    };

                    scope.moveToLeft = function () {
                        // Move the item
                        var originalIdx = moveItem(scope.zpPossibleOptions, scope.zpPossibleModel, scope.zpAddedOptions);

                        // Correct the state of the select lists.
                        scope.zpPossibleModel = selectItem(scope.zpPossibleOptions, originalIdx, scope.zpDisplay);
                        reactivateSelects();
                    };

                    scope.moveToRight = function () {
                        if (scope.zpAddedModel.Default === true) {
                            scope.removeDefault();
                        }

                        // Move the item
                        var originalIdx = moveItem(scope.zpAddedOptions, scope.zpAddedModel, scope.zpPossibleOptions);

                        // Correct the state of the select lists.
                        scope.zpAddedModel = selectItem(scope.zpAddedOptions, originalIdx, scope.zpDisplay);
                        reactivateSelects();
                    };

                    function moveItem(sourceList, sourceModel, destinationList) {
                        if (!sourceModel || destinationList.indexOf(sourceModel) > -1) {
                            return -1;
                        }
                        destinationList.push(sourceModel);
                        var idx = sourceList.indexOf(sourceModel);
                        if (idx > -1) {
                            sourceList.splice(idx, 1);
                        }

                        return idx;
                    };

                    function selectItem(list, idx, sortBy) {
                        list = list.qSort(sortBy);
                        if (list.length <= idx) {
                            idx = idx - 1;
                        }

                        if (list.length === 0 || idx === -1) {
                            return null;
                        } else {
                            return list[idx];
                        }
                    };

                    function reactivateSelects() {
                        // hack for IE: list items become unselectable after moving items between lists [IN:8265]
                        var selects = $('select', element);

                        if (selects.prop('disabled') === false) {
                            selects.prop('disabled', true);

                            setTimeout(function() {
                                selects.prop('disabled', false);
                            });
                        }
                    }
                }
            };
        }
    ]);

    // To be used on a <select> tag with ng-options
    risModule.directive('zpOptionsClass', ['$parse', function ($parse) {
        return {
            restrict: 'A',
            scope: {
                zpOptionsClass: '@',
                zpOptionsClassModel: '=',
                zpOptionsClassTrackingId: '@?'
            },
            link: function (scope, element, attrs) {
                if (!scope.zpOptionsClass) {
                    return;
                }

                var zpOptionsClassTrackingId = scope.zpOptionsClassTrackingId || '$$hashKey',  // '$$hashKey' is used by default by ng-options
                    getOptionsClass = $parse(scope.zpOptionsClass);

                scope.$watch(function () {
                    return JSON.stringify(scope.zpOptionsClassModel);
                }, function () {
                    angular.forEach(scope.zpOptionsClassModel, function (item, index) {
                        var trackingId = item[zpOptionsClassTrackingId];

                        if (!trackingId) {
                            return;
                        }

                        var classes = getOptionsClass(item),
                            option = element.find('option[value="' + trackingId + '"]');

                        angular.forEach(classes, function (add, className) {
                            if (add) {
                                option.addClass(className);
                            }
                        });
                    });
                });
            }
        };
    }]);

    risModule.factory('convertJQueryToAngularPromise', ['$q', function ($q) {

        return function (jqPromise) {
            var d = $q.defer();
            jqPromise.then(function (x) {
                d.resolve(x);
            }, function (x) {
                d.reject(x);
            });
            return d.promise;
        };

    }]);

}(window, window.ko));
