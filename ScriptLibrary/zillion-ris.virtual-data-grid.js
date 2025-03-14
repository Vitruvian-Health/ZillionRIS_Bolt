(function ($) {
    $.extend(true, $.rogan.virtualDataGrid.prototype, {
        options: {
            rowHeight: ZillionParts.Support && ZillionParts.Support.touch ? 30 : 26,
            headerHeight: ZillionParts.Support && ZillionParts.Support.touch ? 30 : 26
        }
    });

    $.extend(true, $.ui, {
        virtualDataGrid:
            {
                dataTypes: {
                    'general': {
                        "conditional": true,
                        renderMethod: function (data, item) {
                            var conditional = this.conditional, show;
                            if (conditional == true) {
                                show = true;
                            } else {
                                show = conditional(data, item);
                            }
                            if (show && data) {
                                return (data + '').replace('\r\n', ', ');
                            }

                            return '';
                        }
                    },
                    "magnify-text": {
                        renderMethod: function (data) {
                            return '<span class="magnify-text" style="vertical-align: middle">' + data + '</span>';
                        }
                    },
                    "checkbox-disabled": {
                        renderMethod: function (data) {
                            return '<div style="text-align: center"><input type="checkbox" disabled ' + (data === true ? 'checked' : '') + '></div>';
                        }
                    },
                    'yes-no': {
                        emphasis: "none",
                        allowNull: false, 
                        renderMethod: function (data) {
                            var self = this;

                            if (self.allowNull && data === null) {
                                return "";
                            }

                            if (data) {
                                return self.emphasis === 'yes' || self.emphasis === 'both'
                                    ? '<span style="color: dark-green;">' + locfmt('{ris,General_Yes}') + '</span>'
                                    : locfmt('{ris,General_Yes}');
                            } 

                            return self.emphasis === 'no' || self.emphasis === 'yes'
                                ? '<span style="font-weight: bold; color: red;">' + locfmt('{ris,General_No}') + '</span>'
                                : locfmt('{ris,General_No}');
                        },
                        createFilterMethod: function (val) {
                            var regex = ZillionParts.Data.WildCardToRegex(val);
                            var includeYes = regex.test(locfmt('{ris,General_Yes}'));
                            var includeNo = regex.test(locfmt('{ris,General_No}'));
                            return function (data) {
                                return data ? includeYes : includeNo;
                            };
                        }
                    },
                    "decimal": {
                        renderMethod: function (data) {
                            return '<div style="text-align: right; line-height: inherit">' + parseFloat(data).toFixed(2) + '</div>';
                        }
                    },
                    "tooltip": {
                        renderMethod: function (data) {
                            return $('<span title="' + data + '">' + data + '</span>');
                        }
                    },
                    "standard-report": {
                        renderMethod: function (data, item) {
                            var tooltip = data;
                            if (this.tooltipContent) {
                                tooltip = data + ':\r\n' + item[this.tooltipContent];
                            }
                            tooltip = tooltip.replace(/"/g,'&quot;');
                            return $('<span title="' + tooltip + '">' + data + '</span>');
                        }
                    },
                    "check": {
                        "title": '',
                        "friendly": 'Check',
                        "onChange": null,
                        "width": 40,
                        "allowFilter": false,
                        "allowSort": false,
                        "allowResize": false,
                        "getValue": function (data, item) {
                            return data;
                        },
                        "renderMethod": function (data, item, r) {
                            var self = this;
                            var element = $('<label style="padding: 2px 5px; display: block; cursor: pointer"><input type="checkbox" ' + (self.getValue(data, item) ? 'checked' : '') + ' /></label>');
                            element.click(function () {
                                var c = data = !self.getValue(data, item);
                                if (c) {
                                    $(this).attr('checked', '');
                                } else {
                                    $(this).removeAttr('checked');
                                }

                                if (typeof self.onChange == 'function') {
                                    return self.onChange(c, item);
                                }
                            });

                            return element;
                        }
                    },
                    "date-of-birth": {
                        "width": 90,
                        "renderMethod": function (data, item) {
                            if (!data)
                                return '';
                            var tooltip = data.format(currentCulture.dateTime.dateLong);
                            var dateExcel = data.format('yyyy-MM-dd hh:mm:ss'); //needed for export dates to Excel.

                            return $('<span class="datetime" data-value="' + dateExcel + '" title="' + tooltip + '">'
                                    + data.format(currentCulture.dateTime.dateShort)
                                    + '</span>');
                        },
                        "createFilterMethod": function (val) {
                            var regex = ZillionParts.Data.WildCardToRegex('*' + val);
                            return function (left, right) {
                                if (left instanceof Date == false) return false;
                                return regex.test(left.format(currentCulture.dateTime.dateShort + ' ' + currentCulture.dateTime.dateLong + ' ' + currentCulture.dateTime.timeLong));
                            };
                        }
                    },
                    "scheduled-date": {
                        "width": 150,
                        "emphasis": "none",
                        "renderMethod": function (data, item) {
                            var self = this;
                            if (!data)
                                return '';

                            return this.cacheItem(item, this.fieldID, function () {
                                var htmlDate;
                                switch (self.emphasis) {
                                    case 'date':
                                        htmlDate = data.format(currentCulture.dateTime.dateShort) + ' <span class="minor-insignificant-text">' + data.format(currentCulture.dateTime.timeShort) + '</span>';
                                        break;
                                    case 'time':
                                        htmlDate = '<span class="minor-insignificant-text">' + data.format(currentCulture.dateTime.dateShort) + '</span> ' + data.format(currentCulture.dateTime.timeShort);
                                        break;
                                    default:
                                        htmlDate = data.format(currentCulture.dateTime.dateShort + ' ' + currentCulture.dateTime.timeShort);
                                }

                                var tooltip = data.format(currentCulture.dateTime.dateLong + ' \'at\' ' + currentCulture.dateTime.timeShort);
                                var dateExcel = data.format('yyyy-MM-dd hh:mm:ss'); //needed for export dates to Excel.
                                return $('<span class="datetime" data-value="' + dateExcel + '" title="' + tooltip + '">' + htmlDate + '</span>');
                            });
                        },
                        "createFilterMethod": function (val) {
                            var regex = ZillionParts.Data.WildCardToRegex('*' + val);
                            return function (left, right) {
                                if (left instanceof Date == false) return false;
                                return regex.test(left.format(currentCulture.dateTime.dateShort + ' ' + currentCulture.dateTime.dateLong + ' ' + currentCulture.dateTime.timeLong));
                            };
                        }
                    },
                    "scheduled-or-event-time": {
                        "width": 150,
                        "emphasis": "none",
                        "renderMethod": function (data, item) {
                            if (!data)
                                return '';

                            var currentTime = Rogan.Time.getCurrentServerTime();
                            var hoursAgo = Math.floor((currentTime - data) / 1000 / 60 / 60);

                            if (hoursAgo >= 1) {
                                return this.cacheItem(item, this.fieldID, function () {
                                    var tooltip = data.format(currentCulture.dateTime.dateLong + ' \'at\' ' + currentCulture.dateTime.timeShort);

                                    switch (this.emphasis) {
                                        case 'date':
                                            return $('<span title="' + tooltip + '">' + data.format(currentCulture.dateTime.dateShort) + ' <span class="minor-insignificant-text">' + data.format(currentCulture.dateTime.timeShort) + '</span></span>');
                                        case 'time':
                                            return $('<span title="' + tooltip + '"><span class="minor-insignificant-text">' + data.format(currentCulture.dateTime.dateShort) + '</span> ' + data.format(currentCulture.dateTime.timeShort) + '</span>');
                                        default:
                                            return $('<span title="' + tooltip + '">' + data.format(currentCulture.dateTime.dateShort + ' ' + currentCulture.dateTime.timeShort) + '</span>');
                                    }
                                });
                            }
                            else {
                                return this.cacheItem(item, this.fieldID, function () {
                                    return moment(data).fromNow();
                                });
                            }
                        },
                        "createFilterMethod": function (val) {
                            var regex = ZillionParts.Data.WildCardToRegex('*' + val);
                            return function (left, right) {
                                if (left instanceof Date == false) return false;
                                return regex.test(left.format(currentCulture.dateTime.dateShort + ' ' + currentCulture.dateTime.dateLong + ' ' + currentCulture.dateTime.timeLong));
                            };
                        }
                    },
                    "event-time": {
                        "width": 130,
                        "emphasis": "none",
                        "renderMethod": function (timeStamp, item) {
                            return this.cacheItem(item, this.fieldID, function () {
                                return moment(timeStamp).fromNow();
                            });
                        },
                        "createFilterMethod": function (val) {
                            var regex = ZillionParts.Data.WildCardToRegex('*' + val);
                            return function (left, right) {
                                if (left instanceof Date == false) return false;
                                return regex.test(left.format(currentCulture.dateTime.dateShort + ' ' + currentCulture.dateTime.dateLong + ' ' + currentCulture.dateTime.timeLong));
                            };
                        }
                    },
                    "context-menu-legacy": {
                        "allowFilter": false,
                        "allowSort": false,
                        "allowResize": false,
                        "width": 32,
                        "renderMethod": function (data, row) {
                            var self = this;
                            var items = self.getContextMenuItems;

                            return $('<input type="button" class="ui-custom-button command-button ui-link" style="background-color: red"/>')
                                .contextMenu({
                                    items: function () { return items(row); },
                                    onOpen: function () {
                                        self.openContextMenu(row);
                                    },
                                    onSelect: function (item) {
                                        self.clickContextMenu(item, row);
                                    }
                                });
                        }
                    },
                    "commands-legacy": {
                        "allowFilter": false,
                        "allowSort": false,
                        "width": 60,
                        "renderMethod": function (data, item) {
                            var self = this,
                                items = self.getActionItems(data, item),
                                actions = [];

                            $.each(items, function () {
                                var s = this;
                                actions.push($('<i class="ui-custom-button command-button ui-link"></i>')
                                    .addClass(s.iconClass)
                                    .click(function () {
                                        self.clickAction(s, item);
                                        return false;
                                    })[0]);
                            });

                            return $('<div style="background-color: red"></div>').append(actions);
                        }
                    },
                    "contact": {
                        "contactID": "ContactID",
                        "renderMethod": function (data, item) {
                            var self = this;
                            if (data) {
                                return this.cacheItem(item, self.fieldID, function () {
                                    var foo = item[self.contactID];
                                    if ($.isArray(foo)) {
                                        return '<span class="contact-link" data-person="' + foo.join(';') + '">' + data + '</span>';
                                    } else {
                                        return '<span class="contact-link" data-person="' + foo + '">' + data + '</span>';
                                    }
                                });
                            } else {
                                return '';
                            }
                        }
                    },
                    "recurrence-reference": {
                        "renderMethod": function (data, item) {
                            var name = !data ? "Year" : "Month";
                            return $('<span>' + name + '</span>');
                        }
                    },
                    "event-indicator": {
                        "width": 64,
                        "title": '',
                        "conditional": true,
                        "tooltip": null,
                        "timeInterval":4,
                        "renderMethod": function (data, item) {
                            var conditional = this.conditional, show;
                            if (conditional == true) {
                                show = true;
                            } else if (conditional == true) {
                                show = true;
                            } else {
                                show = conditional(data, item);
                            }

                            if (show) {
                                var time = item[this.timeField];
                                var difference = Math.ceil((time - new Date()) / 60000);
                                if (Math.abs(difference) < this.timeInterval * 60) {
                                    if (difference > -60 && difference < 0) {
                                        return '<div style="color: #800; font-weight: bold; text-align: center; vertical-align: middle; display: inline-block; width: 100%;" tooltip="' + this.tooltip + '"><span>' + difference + 'm</span></div>';
                                    } else if (difference <= -60) {
                                        var hours = Math.ceil(difference / 60);
                                        var minutes = Math.abs(difference % 60);
                                        return '<div style="color: #800; font-weight: bold; text-align: center; vertical-align: middle; display: inline-block; width: 100%;" tooltip="' + this.tooltip + '"><span>' + hours + 'h&nbsp;' + minutes + 'm</span></div>';
                                    }
                                    if (difference < 10 && difference >= 0) {
                                        return '<div style="color: #080; font-weight: bold; text-align: center; vertical-align: middle; display: inline-block; width: 100%;" tooltip="' + this.tooltip + '"><span>' + difference + 'm</span></div>';
                                    }
                                }
                                return '';
                            }
                        },
                        "createFilterMethod": function (val) {
                            var self = this;
                            var regex = ZillionParts.Data.WildCardToRegex('*' + val);

                            return function(date) {
                                if (date instanceof Date == false) return false;

                                var difference = Math.ceil((date - new Date()) / 60000);

                                if (Math.abs(difference) < self.timeInterval * 60) {
                                    if (difference > -60 && difference < 10) {
                                        return regex.test(difference + 'm');
                                    } else if (difference <= -60) {
                                        var hours = Math.ceil(difference / 60);
                                        var minutes = Math.abs(difference % 60);
                                        return regex.test(hours + 'h ' + minutes + 'm');
                                    }
                                }
                                return false;
                            };
                        }
                    }
                }
            }
    });
})(jQuery);
