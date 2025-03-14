(function($, window, undefined) {

    $(function() {

        var examinationsGridOptions;
        var examinationsDataView;

        var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
        var commandResources = new ZillionParts.CommandResources();
        ZillionRis.Commands.RegisterResources(commandResources);

        commandManager.assign({
            'protocol-assignment.assign-protocol': {
                execute: function (item) {
                    ZillionRis.SubNavs.ShowAssignProtocol({
                        mode: 'assign',
                        worklist:
                            new Worklist.GridWorklist({
                                gridOptions: examinationsGridOptions,
                                scoringCriteria: ['PatientID', 'OrderID'],
                                refreshGridFunction: refresh,
                                getItemIdsFunction: function (itemGroupId) {
                                    return $.Deferred().resolve([itemGroupId]).promise();
                                },
                                firstItemGroup: item,
                                firstItemId: item[examinationsGridOptions.keyField]
                            })
                    });
                }
            }
        });
        commandResources.assign({
            'protocol-assignment.assign-protocol': [{ title: locfmt('{ris,CommandAssignProtocol}'), iconClass: { '16': 'zillion-ris examinations-icon protocol-assign' } }],
        });

        var examinationsViewModel = new ExaminationsViewModel();

        function createExaminationsController() {
            var protocolContextMenu = new ZillionParts.CommandList();
            with (protocolContextMenu) {
                if (window.permissions.hasEditOrderPermission) {
                    add('order.edit-order').executeWith('{ OrderID: OrderID }');
                }
            }

            var examinationsActions = new ZillionParts.CommandList();
            with (examinationsActions) {
                if (window.permissions.hasAssignProtocolPermission) {
                    add('protocol-assignment.assign-protocol');
                }
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ExaminationID',
                commandManager: commandManager,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: protocolContextMenu, manager: commandManager, resources: commandResources } },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', commands: { manager: commandManager, resources: commandResources, list: examinationsActions }, dataType: 'commands', width: 60 },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 150 },
                    { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'ExaminationStatusName' },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber' },
                    { title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber' },
                    { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' },
                    {
                        title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter',
                        dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null, contactID: 'PatientID', width: 150
                    },
                    { title: locfmt('{ris,FieldLocation}'), fieldID: 'Location' },
                    { title: locfmt('{ris,FieldRoom}'), fieldID: 'Room' },
                    { title: locfmt('{ris,FieldRequesterType}'), fieldID: 'RequesterType' },
                    { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'Requester' }
                ],
                gridOptions: {
                    createEmptyDataItem: createEmptyDataItem,
                    onFilterCreated: function(filter) {
                        var customFilter = new ZillionParts.Condition();
                        customFilter.type = 'and';

                        customFilter.include(filter);
                        var currentFilter = examinationsViewModel.filters.selected();
                        if (currentFilter) {
                            combineListFilter(customFilter, 'ExaminationTypeID', currentFilter.examinationTypes);
                            combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                            combineListFilter(customFilter, 'RequestingLocationID', currentFilter.requesterLocations);
                            combineListFilter(customFilter, 'RoomID', currentFilter.rooms);
                            combineListFilter(customFilter, 'IntendedRadiologistID', currentFilter.intendedReporters);
                            combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);
                        }

                        // Examination status filter
                        var scheduled = examinationsViewModel.filterShowScheduled();
                        var inDepartment = examinationsViewModel.filterShowInDepartment();
                        var inProgress = examinationsViewModel.filterShowInProgress();
                        if (scheduled || inDepartment || inProgress) {
                            if (!scheduled) {
                                customFilter.exclude('ExaminationStatusDBID === "SCH"');
                            }
                            if (!inDepartment) {
                                customFilter.exclude('ExaminationStatusDBID === "IND"');
                            }
                            if (!inProgress) {
                                customFilter.exclude('ExaminationStatusDBID === "INP"');
                            }
                        }

                        return createFilterFunc(customFilter);
                    }
                }
            });

            function createEmptyDataItem() {
                var examinations = examinationsDataView.getItems(true).length;
                if (examinations > 0) {
                    var foo = $('<span>' + locfmt('{ris,ExaminationProtocolAssignments_NoExaminationFound_WithFilter}', { examinations: examinations }) + '<a>' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                    $('a', foo).click(function() {
                        examinationsViewModel.clearFilter();
                    });
                    return foo;
                } else {
                    return $('<span>' + locfmt('{ris,ExaminationProtocolAssignments_NoExaminationFound}') + '</span>');
                }
            }

            return gridController.create();
        }

        examinationsGridOptions = examinationsViewModel.gridOptions;
        examinationsDataView = examinationsGridOptions.dataView;
        var examinationsSelection = examinationsGridOptions.selection;
        var delayUpdate = ZillionParts.Delay(updateFromExaminationsSelection, 100);
        examinationsSelection.onChange.subscribe(delayUpdate);
        examinationsSelection.setMultiSelect(false);

        $(".RefreshCheck").on('click keypress', function() {
            refresh();
        });

        ZillionRis.SiteEvents.subscribe('lazy-page-update', function(sender, args) {
            refresh();

            if (args && args.source === 'assign-protocol' && args.action === 'close' && args.examinationID) {
                examinationsSelection.add(args.examinationID);
            }
        });

        $('#ExaminationsPanel').groupPanel({ toolBar: $('#ExaminationsToolBar') });
        $('#ExaminationsPanel').groupPanel('fitToParent');
        examinationsViewModel.grid = $('#ExaminationsView');

        $('#ExaminationsView').height($('#ExaminationsPanel').height());

        examinationsViewModel.filters.selected.subscribe(function() {
            $("#ExaminationsView").virtualDataGrid('updateFilter');
            refresh();
        });

        ko.applyBindings(examinationsViewModel, $('#ExaminationsContainer')[0]);

        examinationsViewModel.gridSettingsStore.initialize('#ExaminationsView', examinationsViewModel.gridOptions, 'examinations', 'examinationProtocolAssignments-worklist').loadSettings();

        Rogan.Ris.Locations.ensure();

        createExaminationsContextMenu();

        examinationsViewModel.loadSettings();
        examinationsViewModel.loadFilters();

        function updateFromExaminationsSelection() {
            var key = getSelectedExaminationsKey();
            if (key) {
                var item = examinationsDataView.getItemByKey(key);
                if (item) {
                    ZillionRis.LoadPatientBanner(item.PatientID);
                    return;
                }
            }
            ZillionRis.LoadPatientBanner(0);
        }

        function getSelectedExaminationsKey() {
            return examinationsSelection.getCount() === 1 ? examinationsSelection.getKeys()[0] : null;
        }

        function createFilterFunc(filters) {
            return function(items) { return filters.filter(items); };
        }

        function combineListFilter(customFilter, field, values, option) {
            if (values && values.length > 0) {
                var test = values.query();
                if (option == 'a') {
                    test.select('"' + field + '.qAny(function(x){return x==" + JSON.stringify(__items[__i]) + ";})"');
                } else {
                    test.select('("' + field + ' === " + JSON.stringify(__items[__i]))');
                }
                customFilter.include('(' + test.toArray().joinText(' || ') + ')');
            }
        }

        function refresh() {

            examinationsViewModel.isLoading(true);

            var selectedFilter = examinationsViewModel.filters.selected();
            var numberOfDays = 1;
            if (selectedFilter && selectedFilter.nextDays) {
                numberOfDays += +selectedFilter.nextDays;
            }

            return Modules.ContentProvider('module://websitecore/data/examinationprotocolassignments', 'worklist', {
                    Date: moment(examinationsViewModel.selectedDate()),
                    NumberOfDays: numberOfDays
                })
                .then(function(data) {
                    examinationsDataView.setItems(data, 'ExaminationID');
                    examinationsDataView.refresh();
                }, function(data) {
                    throw Error(data['message']);
                }).always(function() {
                    examinationsViewModel.isLoading(false);
                });
        }

        examinationsDataView.onUpdated.subscribe(function(e, data) {
            var allItems = examinationsDataView.getItems(true);
            var foo = locfmt('{ris,Examinations_Title} ({shown}/{total})', { shown: examinationsDataView.getItems(false).length, total: allItems.length });

            var foo2 = $('<span></span>');
            foo2.append('<span>' + foo + '</span>');
            $('#ExaminationsPanel').groupPanel({ title: foo2 });

            var scheduledCount = allItems.qCount('ExaminationStatusDBID === "SCH"');
            var inDepartmentCount = allItems.qCount('ExaminationStatusDBID === "IND"');
            var inProgressCount = allItems.qCount('ExaminationStatusDBID === "INP"');

            examinationsViewModel.filterShowScheduledCount(scheduledCount);
            examinationsViewModel.filterShowInDepartmentCount(inDepartmentCount);
            examinationsViewModel.filterShowInProgressCount(inProgressCount);
        });

        function createExaminationsContextMenu() {
            var configurationMenu = $('<input type="button" id="ExaminationGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"></input>')
                .configurationMenu({
                    align: 'right',
                    items: [
                        { text: locfmt('{ris,ContextMenu_Refresh}'), id: 'refresh', iconClass: 'zillion-ris app-icon refresh' },
                        { text: locfmt('{ris,ContextMenu_ClearFilter}'), id: 'clear-filter', iconClass: '' },
                        { text: locfmt('{ris,ContextMenu_ConfigureColumns}'), id: 'configure', iconClass: 'zillion-ris app-icon customize-table' },
                        { text: locfmt('{ris,ContextMenu_DefaultSettings}'), id: 'reset', iconClass: 'ui-icon ui-icon-refresh' }
                    ],
                    onSelect: function(item) {
                        if (item.id == 'refresh') {
                            examinationsViewModel.refresh();
                        } else if (item.id == 'clear-filter') {
                            examinationsViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            examinationsViewModel.customizeView();
                        } else if (item.id == 'reset') {
                            examinationsViewModel.reset();
                        }
                    }
                });
            var find = $('#ExaminationsPanel').groupPanel('widget').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function ExaminationsViewModel() {
            var self = this;

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'protocolassignment-filter';

            this.gridOptions = createExaminationsController();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.selectedDate = new ko.observable(new Date());
            this.selectedDateText = new ko.computed(function() {
                var selectedDate = self.selectedDate();
                if (selectedDate) {
                    return selectedDate.format('dddd, d MMMM');
                } else {
                    return '-';
                }
            });

            this.today = function() {
                this.selectedDate(new Date());
            };
            this.isToday = function() {
                return this.selectedDate().toDateString() === new Date().toDateString();
            };

            this.resetStatusFilters = function () {
                this.filterShowScheduled(true);
                this.filterShowInDepartment(false);
                this.filterShowInProgress(false);
            };

            this.filterShowScheduled = ko.observable();
            this.filterShowInDepartment = ko.observable();
            this.filterShowInProgress = ko.observable();
            this.resetStatusFilters();

            this.filterShowScheduledCount = ko.observable(0);
            this.filterShowInDepartmentCount = ko.observable(0);
            this.filterShowInProgressCount = ko.observable(0);

            this.isLoading = new ko.observable(false);

            loadSessionFilters();

            this.selectedDate.subscribe(function() {
                saveSessionFilters();
                refresh();
            });

            this.filterShowScheduled.subscribe(function() {
                saveSessionFilters();
                updateGridFilter();
            });
            this.filterShowInDepartment.subscribe(function() {
                saveSessionFilters();
                updateGridFilter();
            });
            this.filterShowInProgress.subscribe(function() {
                saveSessionFilters();
                updateGridFilter();
            });

            function updateGridFilter() {
                $('#ExaminationsView').virtualDataGrid('updateFilter').virtualDataGrid('refresh');
            }

            this.reset = function() {
                this.gridSettingsStore.resetSettings();
                this.clearFilter();
            };
            this.refresh = function() {
                refresh();
            };
            this.customizeView = function() {
                $('#ExaminationsView').customizeVirtualDataGrid();
            };

            this.clearFilter = function() {
                $('#ExaminationsView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                this.resetStatusFilters();
                this.filters.selectedID(null);
            };

            var hasLoaded = false;
            this.loadSettings = function() {
                ZillionRis.UserSettings.get('protocolassignment', 'settings')
                    .then(function(data) {
                        try {
                            if (data) {
                                self.filters.selectedID(data.filter);
                            }
                        } catch (ex) {
                            console.log('ERROR: ' + ex);
                        } finally {
                            hasLoaded = true;
                        }
                    });
            };
            this.saveSettings = function() {
                ZillionRis.UserSettings.set('protocolassignment', 'settings', {
                    filter: self.filters.selectedID()
                });
            };

            this.customizeFilter = function() {
                $('#FilterDialog').pageSubNav('show');
            };

            this.viewLastAccessedExaminations = function() {
                ZillionRis.LastAccessedShowSubNav();
            };

            var update = ZillionParts.Delay(function() {
                if (self.isLoading() === false && hasLoaded == true) {
                    self.saveSettings();
                }
            }, 1000, true);
            this.filters.selected.subscribe(update);

            this.loadFilters = function() {
                this.filters.loadFilters();
            };

            function loadSessionFilters() {
                var filterJson = window.sessionStorage && window.sessionStorage.getItem('protocolassignments.filters');
                if (!filterJson) return;

                var filters = JSON.parse(filterJson);
                if (!filters) return;

                if (filters.date && (filters.date = new Date(filters.date)) && filters.date.toDateString() !== self.selectedDate().toDateString()) {
                    ris.notify.showInformation(filters.date.format('dddd, d MMMM yyyy'), locfmt('{ris,General_PreviouslySelectedDate}', { date: filters.date.format('dddd, d MMMM yyyy') }), 10000);
                    self.selectedDate(filters.date);
                }

                if (filters.statuses) {
                    self.filterShowScheduled(filters.statuses.scheduled);
                    self.filterShowInDepartment(filters.statuses.inDepartment);
                    self.filterShowInProgress(filters.statuses.inProgress);
                }
            }

            function saveSessionFilters() {
                if (window.sessionStorage) {
                    var filters = {
                        date: self.selectedDate(),
                        statuses: {
                            scheduled: self.filterShowScheduled(),
                            inDepartment: self.filterShowInDepartment(),
                            inProgress: self.filterShowInProgress()
                        }
                    };
                    window.sessionStorage.setItem('protocolassignments.filters', JSON.stringify(filters));
                }
            }
        }

        function ExaminationsFilterViewModel() {
            this.originalName = '';
            this.name = new ko.observable();

            this.examinationTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.examinationTypes.source = new ZillionRis.Filters.ObjectSourceModules('module://workflow/data/examinationtypes', { projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }' });

            this.modalityTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.modalityTypes.source = new ZillionRis.Filters.ObjectSourceLocations('modalityTypes');

            this.requesterLocations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requesterLocations.source = new ZillionRis.Filters.ObjectSourceLocations('requesterLocations');

            this.rooms = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.rooms.source = new ZillionRis.Filters.ObjectSourceLocations('rooms');

            this.intendedReporters = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.intendedReporters.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: 'Reporter' },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                projector: '{ id: ID, label: Name, value: Name }'
            });

            var self = this;
            this.nextDays = new ko.observable(null);
            this.nextDays.subscribe(function(value) {
                if (isNaN(value)) {
                    self.nextDays(null);
                }
            });
            this.itemAdded = function(elem) {
                if (elem.nodeType === 1) {
                    $(elem).show('highlight', 'slow');
                }
            };
        }

        var filterEditor = new ZillionRis.FilterEditor();
        filterEditor.filterFactory = function() {
            return new ExaminationsFilterViewModel(filterEditor);
        };
        filterEditor.filterSave = function(a) {
            return {
                originalName: a.originalName,
                name: a.name(),

                nextDays: a.nextDays(),
                examinationTypes: a.examinationTypes.list().qSelect('id'),
                modalityTypes: a.modalityTypes.list().qSelect('id'),
                requesterLocations: a.requesterLocations.list().qSelect('id'),
                rooms: a.rooms.list().qSelect('id'),
                intendedReporters: a.intendedReporters.list().qSelect('id'),
                urgencies: a.urgencies.list().qSelect('id')
            };
        };
        filterEditor.filterLoad = function(a, b) {
            a.originalName = b.originalName;
            a.name(b.name);

            a.examinationTypes.set(b.examinationTypes);
            a.modalityTypes.set(b.modalityTypes);
            a.requesterLocations.set(b.requesterLocations);
            a.rooms.set(b.rooms);
            a.intendedReporters.set(b.intendedReporters);
            a.urgencies.set(b.urgencies);

            a.nextDays(b.nextDays);
        };

        filterEditor.filterType = 'protocolassignment-filter';
        filterEditor.notificationTitle = 'Protocol assignment Work List Filter';
        filterEditor.subject = 'protocolassignment';

        filterEditor.close = function() {
            $("#FilterDialog").pageSubNav('hide');
        };

        ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

        $("#FilterDialog").show().pageSubNav({
            close: function() { examinationsViewModel.loadFilters(); },
            open: function() {
                filterEditor.openFilterName = examinationsViewModel.filters.selectedID();
                filterEditor.load();
            }
        });

    });

})(jQuery, window);
