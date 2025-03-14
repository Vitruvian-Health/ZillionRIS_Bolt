(function(window, ko, undefined) {

    moment.locale('precise-en', {
        relativeTime: {
            future: "in %s",
            past: "%s ago",
            s: "%d seconds", //see https://github.com/timrwood/moment/pull/232#issuecomment-4699806
            m: "a minute",
            mm: "%d minutes",
            h: "an hour",
            hh: "%d hours",
            d: "a day",
            dd: "%d days",
            M: "a month",
            MM: "%d months",
            y: "a year",
            yy: "%d years"
        }
    });

    if (ko) {
        ko.bindingHandlers.validation = {
            init: function(element, valueAccessor) {
            },
            update: function(element, valueAccessor, allBindingsAccessor) {
                setTimeout(function() {
                    try {
                        var value = ko.utils.unwrapObservable(valueAccessor());
                        var valid = ko.utils.unwrapObservable(value.valid);
                        var disabled = ko.utils.unwrapObservable(value.disabled);

                        $(element).removeClass('validation-error');
                        if (!disabled) {
                            if (!valid) {
                                $(element).addClass('validation-error');
                            }
                        }
                    } catch (ex) {
                    }
                });
            }
        };
        ko.bindingHandlers.roganLoading = {
            init: function(element, valueAccessor) {
                $(element).data('_roganLoading', ZillionRis.RoganLoadingWidget(element));
            },
            update: function(element, valueAccessor, allBindingsAccessor) {
                $(element).data('_roganLoading').update(ko.utils.unwrapObservable(valueAccessor()));
            }
        };

        ko.bindingHandlers.slider = {
            init: function(element, valueAccessor, allBindingsAccessor) {
                var options = allBindingsAccessor().sliderOptions || {};
                $(element).slider(options);
                ko.utils.registerEventHandler(element, "slidechange", function(event, ui) {
                    var observable = valueAccessor();
                    observable(ui.value);
                });
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    $(element).slider("destroy");
                });
                ko.utils.registerEventHandler(element, "slide", function(event, ui) {
                    var observable = valueAccessor();
                    observable(ui.value);
                });
            },
            update: function(element, valueAccessor) {
                var value = ko.utils.unwrapObservable(valueAccessor());
                if (isNaN(value)) value = 0;
                $(element).slider("value", value);

            }
        };

        ko.bindingHandlers.slideVisible = {
            init: function(element, valueAccessor) {
                var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
                if (value === true) {
                    $(element).show(); // jQuery will hide/show the element depending on whether "value" or true or false
                } else {
                    $(element).hide(); // jQuery will hide/show the element depending on whether "value" or true or false
                }
            },
            update: function(element, valueAccessor, allBindingsAccessor) {
                // Leave as before
                var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
                if (value === true) {
                    $(element).slideDown(); // jQuery will hide/show the element depending on whether "value" or true or false
                } else {
                    $(element).slideUp(); // jQuery will hide/show the element depending on whether "value" or true or false
                }
            }
        };

        ko.bindingHandlers.personlink = {
            init: function(element, valueAccessor) {
                var $element = $(element);
                var value = valueAccessor();
                var valueUnwrapped = ko.utils.unwrapObservable(value);
                if ($.isArray(valueUnwrapped)) {
                    valueUnwrapped = valueUnwrapped.join(',');
                }
                $element.addClass('contact-link').attr('data-person', valueUnwrapped);
            },
            update: function(element, valueAccessor) {
                var $element = $(element);
                var value = valueAccessor();
                var valueUnwrapped = ko.utils.unwrapObservable(value);
                if ($.isArray(valueUnwrapped)) {
                    valueUnwrapped = valueUnwrapped.join(',');
                }
                $element.addClass('contact-link').attr('data-person', valueUnwrapped);
            }
        };

        ko.bindingHandlers.virtualDataGrid = {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {

                var value = valueAccessor(), allBindings = allBindingsAccessor();
                var valueUnwrapped = ko.utils.unwrapObservable(value);

                var options = valueUnwrapped.options;

                var changed = function() {
                    if (valueUnwrapped.singleSelect) {
                        var keys = options.selection.getKeys();
                        var current = valueUnwrapped.singleSelect();
                        if (keys.length === 1 && current !== keys[0]) {
                            valueUnwrapped.singleSelect(options.dataView.getItemByKey(keys[0]));
                        } else {
                            valueUnwrapped.singleSelect(null);
                        }
                    }
                };
                var $grid = $(element);
                $grid.virtualDataGrid(options);

                ZillionParts.GridView.Behaviors.RestrictToDataSet(options);

                if (valueUnwrapped['singleSelect']) {
                    var changed1 = ZillionParts.Delay(changed, 100);

                    options.selection.onChange.subscribe(changed1);
                }

                if (valueUnwrapped['multiSelect']) {
                    var changed1 = function() {
                        var keys = options.selection.getKeys();
                        valueUnwrapped.multiSelect(keys.map(function(key) { return options.dataView.getItemByKey(key); }));
                    };
                    changed1 = ZillionParts.Delay(changed1, 100);

                    options.selection.onChange.subscribe(changed1);
                }

                options.dataView.onUpdated.subscribe(function() {
                    $grid.virtualDataGrid('refresh');
                });
                $grid.virtualDataGrid('refresh');
            },
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                //            $(element).virtualDataGrid('updateFilter');
            }
        };

        ko.bindingHandlers.loadingOverlay = {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                $(element).loadingOverlay(valueAccessor());
            },
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                // First get the latest data that we're bound to
                var value = valueAccessor(), allBindings = allBindingsAccessor();

                // Next, whether or not the supplied model property is observable, get its current value
                var valueUnwrapped = ko.utils.unwrapObservable(value);

                $(element).loadingOverlay(valueAccessor());
                if (!!valueUnwrapped.show) {
                    $(element).loadingOverlay('show');
                } else {
                    $(element).loadingOverlay('hide');
                }
            }
        };

        ko.bindingHandlers.jqTabs = {
            init: function(element, valueAccessor) {
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    $(element).tabs("destroy");
                });
            },
            update: function(element, valueAccessor, allBindingsAccessor) {
                var dependency = ko.utils.unwrapObservable(valueAccessor()), //just to create a dependency
                    options = allBindingsAccessor().jqTabOptions || {}, //any additional options
                    selected = $(element).tabs("option", "selected"); //restore selected index

                //do in a setTimeout, as the DOM elements are not built yet when we are using bindings to create them
                setTimeout(function() {
                    $(element).tabs("destroy").tabs(options).tabs("option", "selected", selected);
                }, 0);
            }
        };

        ko.bindingHandlers.button = {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                $(element).addClass('btn');
            },
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            }
        };

        //        var bindingTime = new Date().getTime();
        //        bindingTime = new Date().getTime() - bindingTime;
        //        console.log('Binding Time: ' + bindingTime + 'ms');
        //        $('#DocumentHeader').append('<span>[' + bindingTime + 'ms</span>');

        ko.bindingHandlers.zpSelect = {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {

                //        var bindingTime = new Date().getTime();

                var bindOptions = valueAccessor();

                var widgetOptions = $.extend(true, {}, ko.mapping.toJS(bindOptions));
                delete widgetOptions['value'];
                delete widgetOptions['source'];

                var source = ko.utils.unwrapObservable(bindOptions.source);
                if ($.isArray(source)) {
                    $(element).data('src', widgetOptions.source = new ZillionParts.Select.ArraySource(source, bindOptions.selectID, bindOptions.selectText));
                } else {
                    widgetOptions.source = source;
                }

                $(element).zpSelect(widgetOptions);

                if (bindOptions.legacyBind && bindOptions.selectedID) {
                    if (bindOptions.bind) {
                        try {
                            var val = $(widgetOptions.bind).val();
                            if (val === '') {
                                val = null;
                            }
                            bindOptions.selectedID(val);
                        } catch (ex) {
                            console.log('Legacy bind: ' + ex);
                        }
                    } else {
                        try {
                            var val = $(element).val();
                            if (val === '') {
                                val = null;
                            }
                            bindOptions.selectedID(val);
                        } catch (ex) {
                            console.log('Legacy bind: ' + ex);
                        }
                    }
                }
                if (bindOptions.legacyBind && bindOptions.value) {
                    if (bindOptions.bind) {
                        try {
                            var val = $(widgetOptions.bind).val();
                            if (val === '') {
                                val = null;
                            }
                            bindOptions.value(val);
                        } catch (ex) {
                            console.log('Legacy bind: ' + ex);
                        }
                    } else {
                        try {
                            var val = $(element).val();
                            if (val === '') {
                                val = null;
                            }
                            bindOptions.value(val);
                        } catch (ex) {
                            console.log('Legacy bind: ' + ex);
                        }
                    }
                }

                $(element).change(function() {
                    if (bindOptions.value) {
                        var selectedValue = $(element).zpSelect('value');
                        if (bindOptions.selectedID) {
                            bindOptions.selectedID(selectedValue && selectedValue[bindOptions.selectID || 'id']);
                        } else {
                            bindOptions.value(selectedValue);
                        }
                    } else if (bindOptions.selectedID) {
                        var selectedID = $(element).zpSelect('selectedID');
                        bindOptions.selectedID(selectedID);
                    }
                });

                //                bindingTime = new Date().getTime() - bindingTime;
                //                console.log('Binding Time: ' + bindingTime + 'ms');
                //                $('#DocumentHeader').append('<span>' + bindingTime + 'ms</span>');
            },
            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var bindOptions = valueAccessor() || {};

                var widgetOptions = $.extend(true, {}, ko.mapping.toJS(bindOptions));
                delete widgetOptions['value'];
                delete widgetOptions['source'];

                var bindSource = ko.utils.unwrapObservable(bindOptions.source);
                var arraySource = $(element).data('src');
                if ($.isArray(bindSource) && arraySource) {
                    arraySource.setSource(bindSource);
                }

                $(element).zpSelect(widgetOptions);

                if (bindOptions.value) {
                    $(element).zpSelect('value', ko.utils.unwrapObservable(bindOptions.value));
                } else if (bindOptions.selectedID) {
                    $(element).zpSelect('selectedID', ko.utils.unwrapObservable(bindOptions.selectedID));
                } else {
                    $(element).zpSelect('bind');
                }
            }
        };

        ko.bindingHandlers.datepicker = {
            init: function(element, valueAccessor, allBindingsAccessor) {
                //initialize datepicker with some optional options
                var options = allBindingsAccessor().datepickerOptions || {};
                $(element).datepicker($.extend(true, {}, { showWeek: true, changeMonth: true, changeYear: true, showButtonPanel: true, showOtherMonths: true, selectOtherMonths: true, firstDay: window.currentCulture.dateTime.firstDayOfWeekInt }, options));

                //handle the field changing
                ko.utils.registerEventHandler(element, "change", function() {
                    var observable = valueAccessor();
                    observable($(element).datepicker("getDate"));
                });

                //handle disposal (if KO removes by the template binding)
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    $(element).datepicker("destroy");
                });

            },
            update: function(element, valueAccessor, allBindingsAccessor) {
                var options = allBindingsAccessor().datepickerOptions || {};
                $(element).datepicker(options);

                var value = ko.utils.unwrapObservable(valueAccessor());

                //handle date data coming via json from Microsoft
                if (String(value).indexOf('/Date(') == 0) {
                    value = new Date(parseInt(value.replace(/\/Date\((.*?)\)\//gi, "$1")));
                }

                var current = $(element).datepicker("getDate");

                if (value - current !== 0) {
                    $(element).datepicker("setDate", value);
                }
            }
        };

        ko.bindingHandlers.shortcodes = {
            'init': function(element, valueAccessor) {
                if ($.fn.shortcodes) {
                    $(element).shortcodes(valueAccessor());
                }
            }
        };

        ko.bindingHandlers.buttonset = {
            'init': function(element, valueAccessor, allBindingsAccessor) {
                var updateHandler = function() {
                    var valueToWrite;
                    if (element.type == "checkbox") {
                        valueToWrite = element.checked;
                    } else if ((element.type == "radio") && (element.checked)) {
                        valueToWrite = element.value;
                    } else {
                        return; // "checked" binding only responds to checkboxes and selected radio buttons
                    }

                    var modelValue = valueAccessor();
                    if ((element.type == "checkbox") && (ko.utils.unwrapObservable(modelValue) instanceof Array)) {
                        // For checkboxes bound to an array, we add/remove the checkbox value to that array
                        // This works for both observable and non-observable arrays
                        var existingEntryIndex = ko.utils.arrayIndexOf(ko.utils.unwrapObservable(modelValue), element.value);
                        if (element.checked && (existingEntryIndex < 0)) modelValue.push(element.value);
                        else if ((!element.checked) && (existingEntryIndex >= 0)) modelValue.splice(existingEntryIndex, 1);
                    } else if (ko.isWriteableObservable(modelValue)) {
                        if (modelValue() !== valueToWrite) { // Suppress repeated events when there's nothing new to notify (some browsers raise them)
                            modelValue(valueToWrite);
                        }
                    } else {
                        var allBindings = allBindingsAccessor();
                        if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers']['checked']) {
                            allBindings['_ko_property_writers']['checked'](valueToWrite);
                        }
                    }
                };
                ko.utils.registerEventHandler(element, "click", updateHandler);

                // IE 6 won't allow radio buttons to be selected unless they have a name
                if ((element.type == "radio") && !element.name)
                    ko.bindingHandlers['uniqueName']['init'](element, function() {
                        return true;
                    });
            },

            'update': function(element, valueAccessor) {
                /////////////// addded code to ko checked binding /////////////////
                var buttonSet = function(element) {

                    // now update the css classes
                    // Normally when knockout updates button, there
                    // isn't an event to transfer new status
                    // to buttonset label
                    //                var buttonId = $(element).attr('id');
                    //                if (buttonId) {
                    //                    var buttonSetDiv = $(element).parent('.ui-buttonset');
                    //                    var elementLabel = $(buttonSetDiv).find('label[for="' + buttonId + '"]');
                    //                    if (elementLabel.length === 0) {
                    //                        // was just a single button, so look for label
                    //                        elementLabel = $(element).parent('*').find('label[for="' + buttonId + '"]');
                    //                    }
                    //                    // check to see if element is already configured
                    //                    if (element.checked && !$(elementLabel).hasClass('ui-state-active')) {
                    //                        $(elementLabel).addClass('ui-state-active');
                    //                    }
                    //                    if (!element.checked && $(elementLabel).hasClass('ui-state-active')) {
                    //                        $(elementLabel).removeClass('ui-state-active');
                    //                    }
                    //                }
                    $(element).button();
                };
                /////////////// end add /////////////////////////// 
                var value = ko.utils.unwrapObservable(valueAccessor());

                if (element.type == "checkbox") {
                    if (value instanceof Array) {
                        // When bound to an array, the checkbox being checked represents its value being present in that array
                        element.checked = ko.utils.arrayIndexOf(value, element.value) >= 0;
                    } else {
                        // When bound to anything other value (not an array), the checkbox being checked represents the value being trueish
                        element.checked = value;
                    }
                    /////////////// addded code to ko checked binding /////////////////
                    buttonSet(element);
                    /////////////// end add ///////////////////////////
                    // Workaround for IE 6 bug - it fails to apply checked state to dynamically-created checkboxes if you merely say "element.checked = true"
                    if (value && ko.utils.isIe6) element.mergeAttributes(document.createElement("<input type='checkbox' checked='checked' />"), false);
                } else if (element.type == "radio") {
                    element.checked = (element.value == value);
                    /////////////// addded code to ko checked binding /////////////////
                    buttonSet(element);
                    /////////////// end add ///////////////////////////
                    // Workaround for IE 6/7 bug - it fails to apply checked state to dynamically-created radio buttons if you merely say "element.checked = true"
                    if ((element.value == value) && (ko.utils.isIe6 || ko.utils.isIe7)) element.mergeAttributes(document.createElement("<input type='radio' checked='checked' />"), false);
                }
            }
        };
        ko.bindingHandlers.zpEnter = {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var allBindings = allBindingsAccessor();

                $(element).bind("keydown", function(event) {
                    if (event.which === 13) {
                        allBindings.zpEnter.call(viewModel, viewModel, event.target, element);

                        event.preventDefault();
                    }
                });
            }
        };

        ko.bindingHandlers.spinner = {
            //            init: function(element, valueAccessor, allBindingsAccessor) {
            //                //initialize spinner with some optional options
            //                var options = allBindingsAccessor().spinnerOptions || {};
            //                $(element).spinner(options);

            //                //handle the field changing
            //                ko.utils.registerEventHandler(element, "spinchange", function () {
            //                    var observable = valueAccessor();
            //                    observable($(element).spinner("value"));
            //                });

            //                //handle disposal (if KO removes by the template binding)
            //                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            //                    $(element).spinner("destroy");
            //                });

            //            },
            //            update: function(element, valueAccessor) {
            //                var value = ko.utils.unwrapObservable(valueAccessor());

            //                current = $(element).spinner("value");
            //                if (value !== current) {
            //                    $(element).spinner("value", value);
            //                }
            //            }

        };
    }
})(window, window.ko);