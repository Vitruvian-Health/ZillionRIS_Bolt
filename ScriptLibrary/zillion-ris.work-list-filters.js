(function ($) {
    $.extend(true, window, {
        ZillionRis: {
            FilterEditor: FilterEditor,
            FilterList: FilterList,
            FilterListNg: FilterListNg,
            WorkListFilter: {
                Retrieve: getUserFilters
            },
            Filters: {
                ObjectSelectionViewModel: ObjectSelectionViewModel,
                ObjectSource: ObjectSource,
                ObjectSourceLocations: ObjectSourceLocations,
                ObjectSourceService: ObjectSourceService,
                ObjectSourceModules: ObjectSourceModules
            }
        }
    });


    window.ContentProviderSource2 = function (contentProvider, options) {
        options = $.extend(true, { projector: null, emptyText: false }, options);

        var _cacheOpt = $.extend(true, { search: true, item: true }, options.cache);
        var _cache = {};
        var _cacheS = {};

        return {
            features: {
                queryOnClear: !!options.queryOnClear
            },
            get: function(key, opts) {
                var def = $.Deferred();
                var item = _cache[key];
                if (item) {
                    def.resolve(item);
                } else {
                    var data = $.extend(true, {}, opts, { ID: key });

                    Modules
                        .ContentProvider(contentProvider, 'get', data)
                        .then(function(a) {
                            item = [a].qSelect(options.projector).qFirst();

                            if (item) {
                                if (_cacheOpt.item) {
                                    _cache[key] = item;
                                }
                                def.resolve(item);
                            } else {
                                def.reject();
                            }
                        }, function() {
                            def.reject();
                        });
                }

                return def.promise();
            },
            query: function(searchText, opts) {
                var def = $.Deferred();
                if (!searchText && !options.emptyText) {
                    return def.resolve([]).promise();
                }

                var item = _cacheS[searchText];
                if (item) {
                    def.resolve(item);
                } else {
                    var data = $.extend(true, {}, opts, options.queryParameters, { Text: searchText });

                    if (options.onQuerying) {
                        options.onQuerying(data);
                    }

                    Modules.ContentProvider(contentProvider, 'query', data)
                        .then(function(a) {
                            item = a.qSelect(options.projector);
                            if (!opts) {
                                if (_cacheOpt.search) {
                                    _cacheS[searchText] = item;
                                }
                            }
                            item.qEach(function(x) {
                                _cache[x.id] = x;
                            });
                            def.resolve(item);
                        }, function(e) {
                            def.reject();
                        });
                }

                return def.promise();
            }
        };
    };

    function saveUserFilter(filterType, filter) {
        var def = $.Deferred();
        Modules.Task('module://customfilters/task/userfilters', 'save', { FilterType: filterType, Request: JSON.stringify(filter) })
            .then(function() {
                def.resolve(true);
            }, function(a) {
                def.reject(false);
            });

        return def.promise();
    }

    function removeUserFilter(filterType, filterName) {
        var def = $.Deferred();
        Modules.Task('module://customfilters/task/userfilters', 'remove', { FilterType: filterType, Request: filterName })
            .then(function () {
                def.resolve(true);
            }, function () {
                def.reject('Failed to remove the filter.');
            });

        return def.promise();
    }

    function getUserFilters(filterType) {
        var def = $.Deferred();
        Modules.Task('module://customfilters/task/userfilters', 'get', { FilterType: filterType })
            .then(function (data) {
                def.resolve(data);
            }, function () {
                def.reject('Failed to retrieve the filters.');
            });

        return def.promise();
    }

    function FilterList() {
        var self = this;

        this.filterType = '';
        this.source = new ko.observableArray([]);
        this.selectedID = new ko.observable(null);

        this.selected = ko.computed(function() {
            return self.source() && self.source().qFirst(function(x) { return x.name === self.selectedID(); });
        });

        this.loadFilters = function () {
            return ZillionRis.WorkListFilter.Retrieve(this.filterType)
                .then(function (filters) {
                    self.source(filters);
                    if (!filters.qAny(function (x) { return x.name === self.selectedID(); })) {
                        self.selectedID(null);
                    }
                });
        };
    }

    function FilterListNg() {
        var self = this;

        this.filterType = '';
        this.source = [];
        this.selectedID = null;

        var _selectedCache = null;
        this.selected = function () {
            if (!_selectedCache || _selectedCache.name !== self.selectedID) {
                _selectedCache = self.source && self.source.qFirst(function (x) { return x.name === self.selectedID; });
            }
            return _selectedCache;
        };

        this.loadFilters = function () {
            return ZillionRis.WorkListFilter.Retrieve(this.filterType)
                .then(function (filters) {
                    self.source = filters;
                    _selectedCache = null;
                    if (!filters.qAny(function (x) { return x.name === self.selectedID; })) {
                        self.selectedID = null;
                    }
                });
        };
    }

    function FilterEditor() {
        var self = this;

        // Configuration.
        this.subject = 'work list';
        this.notificationTitle = 'Work List Filter';
        this.filterType = '';
        this.filterFactory = function () { };
        this.filterSave = function (a) { };
        this.filterLoad = function (dest, source) { };
        this.openFilterName = null;

        // Properties.
        this.filterList = new ko.observableArray();
        this.selectedFilter = new ko.observable();

        // Methods.
        this.saveSelected = function () {
            var selectedFilter = this.selectedFilter();
            var filterSave = this.filterSave(selectedFilter);
            var originalName = selectedFilter.originalName;
            var filterName = filterSave.name;
            saveUserFilter(this.filterType, filterSave)
                .then(function () {
                    selectedFilter.originalName = selectedFilter.name();

                    if (originalName && originalName != filterName) {
                        // Filter was pre-existing and has a change in name.
                        ris.notify.showSuccess(self.notificationTitle, 'Successfully saved filter ' + originalName + ' and has been renamed to ' + filterName + '.');
                    } else {
                        // Either a new filter or did not change in name.
                        ris.notify.showSuccess(self.notificationTitle, 'Successfully saved filter ' + filterName + '.');
                        self.selectedFilter(null);
                    }
                }, function () {
                    // Failed to save the filter.
                    ris.notify.showError(self.notificationTitle, 'Failed save filter ' + filterName + ', please try again.');
                    self.selectedFilter(null);
                });
        };

        this.deleteSelected = function () {
            var selectedFilter = this.selectedFilter();
            var originalName = selectedFilter.originalName;
            var filterName = selectedFilter.name();

            ZillionRis.Confirmation({
                title: 'Delete Work List Filter',
                content: '<p>Are you sure you want to delete the ' + this.subject + ' filter <span class="text-emphasis">' + filterName + '</span>?</p>'
            })
                .then(function (result) {
                    if (result == true) {
                        if (originalName) {
                            // The filter has already been saved.
                            removeUserFilter(self.filterType, originalName)
                                .then(function () {
                                    // Filter has been removed from the server.
                                    ris.notify.showSuccess(self.notificationTitle, 'Successfully removed filter ' + filterName + '.');
                                }, function () {
                                    // Filter failed to be removed, place it back in the list.
                                    self.filterList.push(selectedFilter);
                                    ris.notify.showError(self.notificationTitle, 'Failed remove filter ' + filterName + ', please try again.');
                                });
                        }

                        self.filterList.remove(selectedFilter);
                        self.selectedFilter(null);
                    }
                });
        };

        this.addNewFilter = function () {
            var filter = this.filterFactory();
            filter.name(locfmt('{ris,General_NewFilter}'));

            this.filterList.push(filter);
            this.selectedFilter(filter);
        };

        this.load = function () {
            this.selectedFilter(null);
            this.filterList.removeAll();

            // Load the filters from the server.
            getUserFilters(this.filterType)
                .then(function (data) {
                    var result = [];

                    $.each(data, function (i, e) {
                        // Create and load the view models with the data from the server.
                        var a = self.filterFactory();
                        e.originalName = e.name;
                        result.push(self.filterLoad(a, e) || a);
                    });

                    // Assign the result as new filter list.
                    self.filterList(result);

                    if (self.openFilterName) {
                        self.selectedFilter($.grep(result, function (a) { return a.name() == self.openFilterName; })[0] || null);
                    }
                }, function () {
                    // Failed to load the list with filters.
                    ris.notify.showError(self.notificationTitle, 'Retrieving the filters failed, please try again.');
                });
        };
    }

    function ObjectSource() {
        this.source = new ko.observableArray([]);

        this.query = function (term, response) {
        };
        this.get = function (key, response) {
        };
    }

    function ObjectSourceLocations(type, locationFilter) {
        ObjectSource.constructor.apply(this, []);

        switch (type) {
            case 'rooms':
                initRooms.apply(this);
                break;
            case 'departments':
                initDepartments.apply(this);
                break;
            case 'locations':
                initLocations.apply(this);
                break;
            case 'modalities':
                initModalities.apply(this);
                break;
            case 'modalityTypes':
                initModalityTypes.apply(this);
                break;
            case 'requesterLocations':
                initRequesterLocations.apply(this);
                break;
            case 'specialisations':
                initFunctionSpecialisations.apply(this);
                break;
            case 'referralTypes':
                initFunctionReferralTypes.apply(this);
                break;
        }

        var projector = '{ id: ID, value: Name, label: Name }';

        function initRooms() {
            var projectorRooms = '{ id: ID, value: "[" + Name + "] " + Description, label: "[" + Name + "] " + Description }';
            this.query = function (term, response) {
                var result = Rogan.Ris.Locations.getRooms().query()
                    .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Name)');

                if (locationFilter) {
                    result = result.where('LocationID === ' + currentLocationID);
                }
                response(result.select(projectorRooms).toArray());
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Locations.getRooms().query()
                .where('ID == "' + id + '"')
                .select(projectorRooms)
                .toArray()
                .qFirst();

                response(result);
            };
        }

        function initDepartments() {
            this.query = function (term, response) {
                var result = Rogan.Ris.Locations.getDepartments().query()
                    .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Name)');

                if (locationFilter) {
                    result = result.where('LocationID === ' + currentLocationID);
                }
                response(result.select(projector).toArray());
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Locations.getDepartments().query()
                .where('ID == "' + id + '"')
                .select(projector)
                .toArray()
                .qFirst();

                response(result);
            };
        }

        function initLocations() {
            this.query = function (term, response) {
                var result = Rogan.Ris.Locations.getLocations().query()
                .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Name)')
                .select(projector)
                .toArray();

                response(result);
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Locations.getLocations().query()
                .where('ID == "' + id + '"')
                .select(projector)
                .toArray()
                .qFirst();

                response(result);
            };
        }

        function initModalities() {
            this.query = function (term, response) {
                var result = Rogan.Ris.Locations.getModalities().query()
                .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Name)');

                if (locationFilter) {
                    result = result.where('LocationIDs.indexOf(' + currentLocationID + ') > -1');
                }
                response(result.select('{ id: ID, value: Name, label: Name, code: Code }').toArray());
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Locations.getModalities().query()
                .where('ID == "' + id + '"')
                .select(projector)
                .toArray()
                .qFirst();

                response(result);
            };
        }

        function initModalityTypes() {
            this.query = function (term, response) {
                var result = Rogan.Ris.Locations.getModalityTypes().query()
                .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Name)');

                if (locationFilter) {
                    result = result.where('LocationIDs.indexOf(' + currentLocationID + ') > -1');
                }
                response(result.select('{ id: ID, value: Name, label: Name, code: Name }').toArray());
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Locations.getModalityTypes().query()
                .where('ID == "' + id + '"')
                .select('{ id: ID, value: Name, label: Name }')
                .toArray()
                .qFirst();

                response(result);
            };
        }

        function initRequesterLocations() {
            this.query = function (term, response) {
                var result = Rogan.Ris.Locations.getRequesterLocations().query()
                .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Description)');

                response(result.select('{ id: ID, value: Description, label: Description }').toArray());
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Locations.getRequesterLocations().query()
                .where('ID == "' + id + '"')
                .select('{ id: ID, value: Description, label: Description }')
                .toArray()
                .qFirst();

                response(result);
            };
        }

        function initFunctionSpecialisations() {
            this.query = function (term, response) {
                var result = Rogan.Ris.Specialisations.getSpecialisations().query()
                .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Name)');

                response(result.select('{ id: ID, value: Name, label: Code? "[" + Code + "] " + Name : "[ - ] " + Name}').toArray());
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Specialisations.getSpecialisations().query()
                .where('ID == "' + id + '"')
                .select('{ id: ID, value: Name, label: Name }')
                .toArray()
                .qFirst();

                response(result);
            };
        }

        function initFunctionReferralTypes() {
            this.query = function (term, response) {
                var result = Rogan.Ris.Locations.getReferralTypes().query()
                .where(ZillionParts.Data.WildCardToRegex('*' + term) + '.test(Name)');

                response(result.select('{ id: ID, value: Name, label: Name, code: Name }').toArray());
            };
            this.get = function (id, response) {
                var result = Rogan.Ris.Locations.getReferralTypes().query()
                .where('ID == "' + id + '"')
                .select('{ id: ID, value: Name, label: Name }')
                .toArray()
                .qFirst();

                response(result);
            };
        }
    }
    ObjectSourceLocations.prototype = new ObjectSource();

    function ObjectSourceService(queryUrl, getUrl) {
        ObjectSource.constructor.apply(this, []);

        var _lastXhr = null;
        var _cache = {};

        this.query = function (term, response) {
            var queryTerm = encodeURIComponent(term.replace(/\s+/g, '-'));
            _lastXhr = $.ajax({
                url: queryUrl.replace("$term", queryTerm),
                success: function (data, status, xhr) {
                    var res = _cache[term] = transform(data);
                    if (xhr === _lastXhr) {
                        response(process(res));
                    }
                },
                error: function () { ris.notify.showError('', 'An error occurred while retrieving items from the search.'); }
            });
        };

        this.get = function (id, response) {
            $.ajax({
                url: getUrl.replace("$id", id),
                success: function (data, status, xhr) {
                    if (data) {
                        response(process(transform([data])).qFirst());
                    } else {
                        response({ id: id, value: 'Error: ' + id, label: 'Error: ' + id, code: 'ERROR' });
                    }
                },
                error: function () { ris.notify.showError('', 'An error occurred while retrieving items from the search.'); }
            });
        };

        function transform(data) {
            var count = data.length;
            data = data.slice(0, 20);
            var map = data.map(function (a) { return { id: a.ID, label: a.DisplayName, code: a.Code, value: a.DisplayName, source: a }; });
            return { count: count, data: map };
        }

        function process(input) {
            var data = input.data;
            //            if (input.count > 10) {
            //                data = data.slice(0, 10);
            //                data.push({ id: null, label: (input.count - 10) + ' More ...', code: '', value: null });
            //            }
            return data;
        }
    }
    ObjectSourceService.prototype = new ObjectSource();

    function ObjectSourceModules(moduleUri, options) {
        ObjectSource.constructor.apply(this, []);
        
        var src = new ContentProviderSource2(moduleUri, options);

        this.query = function (term, response) {
            src.query(term).then(function(data) {
                data = data.slice(0, 20);

                response(data);
            });
        };

        this.get = function (id, response) {
            src.get(id).then(response);
        };
    }
    ObjectSourceModules.prototype = new ObjectSource();

    function ObjectSelectionViewModel() {
        var self = this;
        this.source = null;
        this.list = new ko.observableArray([]);
        this.addNew = new ko.observable(null);

        this.addNew.subscribe(function (a) {
            if (a) {
                self.list.push({ id: a.id, value: ko.observable(a.value), label: ko.observable('[' + a.code + '] ' + a.label), remove: function () { self.list.remove(this); } });
                setTimeout(function () { self.addNew(null); }, 300);
            }
        });

        this.set = function (keys) {
            if (keys) {
                $.each(keys, function (i, e) {
                    var VAR = e;
                    var item = { id: VAR, value: ko.observable('Loading...'), label: ko.observable('Loading...'), remove: function () { self.list.remove(this); } };
                    self.source.get(VAR, function (a) {
                        if (!a || a.code === "ERROR") {
                            item.value(locfmt('{ris,CustomFilters_InactiveItem}'));
                            item.label(locfmt('{ris,CustomFilters_InactiveItem}')); 
                        } else {
                            item.value(a.value);
                            item.label(a.label);
                        }
                        self.list.push(item);
                        
                    });
                });
            }
        };
    }
})(jQuery);
