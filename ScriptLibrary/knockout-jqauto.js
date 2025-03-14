(function ($) {
    ko.bindingHandlers.jqAuto = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var options = valueAccessor() || {},
                allBindings = allBindingsAccessor(),
                unwrap = ko.utils.unwrapObservable,
                modelValue = allBindings.jqAutoValue,
                source = allBindings.jqAutoSource,
                query = allBindings.jqAutoQuery,
                valueProp = allBindings.jqAutoSourceValue,
                inputValueProp = allBindings.jqAutoSourceInputValue || valueProp,
                labelProp = allBindings.jqAutoSourceLabel || inputValueProp,
                codeProp = allBindings.jqAutoSourceCode;

            //function that is shared by both select and change event handlers 

            function writeValueToModel(valueToWrite) {
                if (ko.isWriteableObservable(modelValue)) {
                    modelValue(valueToWrite);
                } else { //write to non-observable 
                    if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers']['jqAutoValue'])
                        allBindings['_ko_property_writers']['jqAutoValue'](valueToWrite);
                }
            }

            //on a selection write the proper value to the model 
            options.select = function (event, ui) {
                writeValueToModel(ui.item ? ui.item.actualValue : null);
            };

            //on a change, make sure that it is a valid value or clear out the model value 
            options.change = function (event, ui) {
                var currentValue = $(element).val();
                var matchingItem = ko.utils.arrayFirst(unwrap(source), function (item) {
                    return unwrap(inputValueProp ? item[inputValueProp] : item) === currentValue;
                });

                if (!matchingItem) {
                    writeValueToModel(null);
                }
            };

            if (!options.position) {
                options.positon = { my: 'left top', at: 'left bottom', collision: 'flip fit' };
            }

            if (!options.appendTo) {
                options.appendTo = $(element).offsetParent();
            }

            //hold the autocomplete current response 
            var currentResponse = null;

            //handle the choices being updated in mappedSource, to decouple value updates from source (options) updates 
            var mappedSource = ko.computed({
                read: function () {
                    mapped = ko.utils.arrayMap(unwrap(source), function (item) {
                        var result = {};
                        result.label = labelProp ? unwrap(item[labelProp]) : unwrap(item).toString(); //show in pop-up choices 
                        result.value = inputValueProp ? unwrap(item[inputValueProp]) : unwrap(item).toString(); //show in input box 
                        result.actualValue = valueProp ? unwrap(item[valueProp]) : item; //store in model 
                        result.code = codeProp ? unwrap(item[codeProp]) : ''; //show in pop-up choices, too
                        return result;
                    });
                    return mapped;
                },
                write: function (newValue) {
                    source(newValue); //update the source observableArray, so our mapped value (above) is correct 
                    if (currentResponse) {
                        currentResponse(mappedSource());
                    }
                },
                disposeWhenNodeIsRemoved: element
            });

            if (query) {
                options.source = function (request, response) {
                    currentResponse = response;
                    query.call(this, request.term, mappedSource);
                };
            } else {
                //whenever the items that make up the source are updated, make sure that autocomplete knows it 
                mappedSource.subscribe(function (newValue) {
                    $(element).autocomplete("option", "source", newValue);
                });

                options.source = mappedSource();
            }

        
            //initialize autocomplete 
            if (codeProp) {
                $(element).autocomplete(options).data("ui-autocomplete")
                ._renderMenu = function( ul, items ) {
                    var self = this;
                    $.each( items, function( index, item ) {
                        if (index == 0) {
                            $("<table>")
                                .data("ui-autocomplete-item", {})   // needed by the 'autocomplete' control (jQuery UI)
                                .append('<tr style="font-weight: bold;"><td style="width: 100px;">Code</td><td>Examination Name</td></tr>')
                                .appendTo(ul);
                        }
                        self._renderItem( ul, item );
                    });
                };
                $(element).autocomplete(options).data("ui-autocomplete")
                ._renderItem = function (ul, item) {
                    return $("<li>")
                        .data("ui-autocomplete-item", item)
                        .append("<a><table><tr><td style=\"width: 100px;\">[" + item.code + "]</td><td>" + item.label + "</td></tr></table></a>")
                        .appendTo(ul);
                };
            }
            else {
                $(element).autocomplete(options);
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            //update value based on a model change 
            var allBindings = allBindingsAccessor(),
                unwrap = ko.utils.unwrapObservable,
                modelValue = unwrap(allBindings.jqAutoValue) || '',
                valueProp = allBindings.jqAutoSourceValue,
                inputValueProp = allBindings.jqAutoSourceInputValue || valueProp;

            //if we are writing a different property to the input than we are writing to the model, then locate the object 
            if (valueProp && inputValueProp !== valueProp) {
                var source = unwrap(allBindings.jqAutoSource) || [];
                var modelValue = ko.utils.arrayFirst(source, function (item) {
                    return unwrap(item[valueProp]) === modelValue;
                }) || {};
            }

            //update the element with the value that should be shown in the input 
            var newValue = (modelValue && inputValueProp !== valueProp) ? unwrap(modelValue[inputValueProp]) : modelValue.toString();
            //            if (newValue || newValue === 0) {
            $(element).val(newValue);
            //            }
        }
    };
})(jQuery);