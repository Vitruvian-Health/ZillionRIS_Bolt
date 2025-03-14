(function ($) {
    $(function () {

        var commandManager = new ZillionParts.CommandManager();
        var commandResources = new ZillionParts.CommandResources();

        // Register Commands.
        commandManager.assign(ZillionRis.Commands.Application);
        commandManager.assign(ZillionRis.Commands.Patients);
        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);
        commandManager.assign(ZillionRis.Commands.WorkItems);

        // Register Resources.
        ZillionRis.Commands.RegisterResources(commandResources);
        commandResources.register('examination.remove-from-housekeeping', { title: locfmt('{ris,Housekeeping_RemoveFromHousekeeping}'), iconClass: { '16': 'zillion-ris workflow-icon broom'} });

        function createController() {
            var housekeepingnMenu = new ZillionParts.CommandList();
            with (housekeepingnMenu) {
                add('order.order-information').executeWith('{ OrderID: OrderID }');
                if (window.permissions.hasPatientContactInfoPermission) {
                    add('patient.contact-information').executeWith('{ PatientID: PatientID }');
                }
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }');
                }
            }

            var housekeepingActions = new ZillionParts.CommandList();
            with (housekeepingActions) {
                if (window.permissions.hasFailsafePermission) {
                    add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
                }
                if (window.permissions.hasEditOrderPermission) {
                    add('order.edit-order').executeWith('{ OrderID: OrderID }');
                }
                add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasRequestForm }');
                add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'HousekeepingID',
                commandManager: commandManager,
                commandResources: commandResources,
                contextMenuList: housekeepingnMenu,
                columns: [
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: housekeepingActions, manager: commandManager, resources: commandResources}, width: 78 },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'Scheduled', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldInHousekeepingSince}'), fieldID: 'CreationTime', dataType: 'scheduled-or-event-time' },
                { title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200 },
                { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 140 },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 200 },
                { title: locfmt('{ris,FieldSentby}'), fieldID: 'CreatedBy' },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'ExaminationStatusName', width: 100 },
                { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', width: 80 },
                { title: locfmt('{ris,FieldHousekeepingMemo}'), fieldID: 'HousekeepingMemo', width: 300, renderMethod: function (data) {
                    return $('<span></span>', { text: data, title: data });
                }
                },
                { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' }
            ],
                sort: [
                { "fieldID": "CreationTime", asc: true }
                //                { "fieldID": "Scheduled", asc: true },
                //                { "fieldID": "AccessionNumber", asc: true }
            ],
                gridOptions: {
                    //                onFilterCreated: createGridFilter,
                    onRowCreated: postProcessItem,
                    itemdblclick: function (e, args) {
                        if (window.permissions.hasEditOrderPermission) {
                            ZillionRis.CommandManager.execute('order.edit-order', { OrderID: args.item.OrderID });
                        }
                    },
                    createEmptyDataItem: createEmptyDataItem,
                    onSorting: function (sort) {
                        // Forced sorting:
                        sort = sort.filter(function(x) { return x.fieldID !== 'UrgencySortIndex'; });
                        sort = [{ "fieldID": "UrgencySortIndex", asc: false }].concat(sort);
                        return sort;
                    },
                    onFilterCreated: function (filter) {
                        var customFilter = new ZillionParts.Condition();
                        customFilter.type = 'and';

                        customFilter.include(filter);
                        var currentFilter = housekeepingViewModel.filters.selected();
                        if (currentFilter) {
                            combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                            combineListFilter(customFilter, 'RoomID', currentFilter.rooms);
                            combineListFilter(customFilter, 'ExaminationTypeID', currentFilter.examinationTypes);

                            combineListFilter(customFilter, 'IntendedReporterID', currentFilter.intendedReporters);
                            combineListFilter(customFilter, 'ResponsibleRequestingPhysicianID', currentFilter.requestingResponsibleConsultants);
                            combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);

                            var statusFilter = new ZillionParts.Condition();
                            statusFilter.type = 'or';

                            var cc = 0;
                            if (currentFilter.showWaitingExaminations) {
                                statusFilter.include('ExaminationStatusID === "WAI"');
                                cc++;
                            }
                            if (currentFilter.showApprovedExaminations) {
                                statusFilter.include('ExaminationStatusID === "APP"');
                                cc++;
                            }
                            if (currentFilter.showScheduledExaminations) {
                                statusFilter.include('ExaminationStatusID === "SCH"');
                                cc++;
                            }
                            if (currentFilter.showInDepartmentExaminations) {
                                statusFilter.include('ExaminationStatusID === "IND"');
                                cc++;
                            }

                            if (cc > 0) {
                                customFilter.include(statusFilter);
                            }
                        }

                        return createFilterFunc(customFilter);
                    }
                }
            });

            function createEmptyDataItem(grid) {
                var dv = this.dataView;
                if (dv.getItems(false) != dv.getItems(true)) {
                    var foo = $('<span>' + locfmt('{ris,Imaging_NoDataAvailable}') + '<br /><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                    $('a', foo).click(function () {
                        housekeepingViewModel.clearFilter();
                    });
                    return foo;
                } else {
                    return '<span>' + locfmt('{ris,Imaging_NoDataAvailable}') + '</span>';
                }
            }


            return gridController.create();
        }


        var gridOptions = createController();
        var dataView = gridOptions.dataView;
        var selection = gridOptions.selection;
        var delayUpdate = ZillionParts.Delay(updateFromSelection, 100);
        selection.onChange.subscribe(delayUpdate);
        selection.setMultiSelect(false);

        var refreshTimer = new ris.intervalTimer({ delay: 10 * 60000, onTick: refresh });
        refreshTimer.start();

        $('#WorkListPanel').groupPanel({ toolBar: $('#WorkListToolBar') });

        var housekeepingViewModel = new HousekeepingViewModel();
        $(function () {
            housekeepingViewModel.grid = $('#ExaminationsView');
            housekeepingViewModel.gridOptions = gridOptions;

            // Render each 20 seconds to update the event times.
            setInterval(function () { $('#ExaminationsView').virtualDataGrid('refresh'); }, 20000);

            var currentDate = housekeepingViewModel.selectedDate();
            var storageDate = window.sessionStorage && window.sessionStorage.getItem('housekeeping.date');
            if (storageDate && (storageDate = new Date(storageDate)) && storageDate.toDateString() != currentDate.toDateString()) {
                ris.notify.showInformation(storageDate.format('dddd, d MMMM yyyy'), 'Your currently on the page for ' + storageDate.format('dddd, d MMMM yyyy') + ', because previously this date has been selected.', 10000);
                housekeepingViewModel.selectedDate(storageDate);
            }
            housekeepingViewModel.selectedDate.subscribe(function (a) {
                if (window.sessionStorage) {
                    window.sessionStorage.setItem('housekeeping.date', a);
                }
            });

            housekeepingViewModel.filters.selected.subscribe(function () {
                $('#ExaminationsView').virtualDataGrid('updateFilter');
            });

            // Data bind.
            ko.applyBindings(housekeepingViewModel, $('#WorkListContainer')[0]);

            ZillionRis.WorkList.SelectionStore('#ExaminationsView', gridOptions, 'housekeeping.worklist.selection');
            housekeepingViewModel.gridSettingsStore.initialize('#ExaminationsView', housekeepingViewModel.gridOptions, 'housekeeping', 'housekeeping-worklist').loadSettings();

            housekeepingViewModel.loadSettings();
            housekeepingViewModel.loadFilters();

            createWorkListContextMenu();

            Rogan.Ris.Locations.ensure();

            $(window).resize(layout).resize();

            housekeepingViewModel.refresh();


            housekeepingViewModel.loadSettings();
            housekeepingViewModel.loadFilters();
        });

        function layout() {
            var foo = $(window).height() - $('#DocumentHeader').height() - 140;

            $('#WorkListPanel').height(foo);
            $('#ExaminationsView').height($('#WorkListPanel').height());
            $('#ExaminationsView').virtualDataGrid('refresh');
        }

        $.extend(true, window, {
            housekeepingOptions: gridOptions,
            statusChangeCallback: statusChangeCallback,
            customDateHandler: function (dt, inst) {
                housekeepingViewModel.selectedDate(inst.input.datepicker('getDate'));
            },
            refreshHousekeeping: refresh
        });

        function createWorkListContextMenu() {
            var configurationMenu = $('<input id="ExaminationGridSetting" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
            .configurationMenu({
                align: 'right',
                items: [
                    { text: locfmt('{ris,ContextMenu_Refresh}'), id: 'refresh', iconClass: 'zillion-ris app-icon refresh' },
                    { text: locfmt('{ris,ContextMenu_ClearFilter}'), id: 'clear-filter', iconClass: '' },
                    { text: locfmt('{ris,ContextMenu_ConfigureColumns}'), id: 'configure', iconClass: 'zillion-ris app-icon customize-table' },
                    { text: locfmt('{ris,ContextMenu_DefaultSettings}'), id: 'reset', iconClass: 'ui-icon ui-icon-refresh' }
                ],
                onSelect: function (item) {
                    if (item.id == 'refresh') {
                        refresh();
                    } else if (item.id == 'clear-filter') {
                        housekeepingViewModel.clearFilter();
                    } else if (item.id == 'configure') {
                        housekeepingViewModel.customizeView();
                    } else if (item.id == 'reset') {
                        housekeepingViewModel.reset();
                    }
                }
            });
            var find = $('#WorkListPanel').groupPanel('widget').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function updateFromSelection() {
            var key = getSelectedKey();
            if (key) {
                var data = dataView.getItemByKey(key);
                if (data) {
                    ZillionRis.LoadPatientBanner(data.PatientID);
                } else {
                    ZillionRis.LoadPatientBanner(0);
                }
            } else {
                ZillionRis.LoadPatientBanner(0);
            }
        }

        function getSelectedKey() {
            return selection.getCount() == 1 ? selection.getKeys()[0] : null;
        }

        function createFilterFunc(filters) {
            return function (items) { return filters.filter(items); };
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

        function statusChangeCallback(s, e) {
            if (e.errorMessage && e.errorMessage != '') {
                alert(e.errorMessage);
            } else {
                refresh();
            }
        }

        dataView.onUpdated.subscribe(function (e, data) {
            selection.filter(data, 'ID');

            $('#WorkListPanel').groupPanel({ title: locfmt('{ris,ExaminationsInHousekeeping_Title}') + '(' + dataView.getItems(false).length + '/' + dataView.getItems(true).length + ')' });
        });

        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);
        function refresh() {
            refreshTimer.reset();

            housekeepingViewModel.isLoading(true);
            Modules.ContentProvider('module://housekeeping/data/worklist', 'query')
                .then(function(data) {
                    housekeepingViewModel.gridOptions.dataView.setItems(data, 'HousekeepingID');
                    housekeepingViewModel.gridOptions.dataView.refresh();
                }).always(function() {
                    housekeepingViewModel.isLoading(false);
                });
        }

        function postProcessItem(item, data) {
            ZillionRis.AddUrgencyClasses(item, data.UrgencyID);
        }

        function HousekeepingViewModel() {
            var self = this;

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'housekeeping-filter';

            this.gridOptions = gridOptions;
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();
            this.selectedDate = new ko.observable(new Date());
            this.selectedDateText = new ko.computed(function () {
                var selectedDate = self.selectedDate();
                if (selectedDate) {
                    return selectedDate.format('dddd, d MMMM');
                } else {
                    return '-';
                }
            });
            this.selectedItem = new ko.observable(null);
            this.isLoading = new ko.observable(false);

            this.selectedDate.subscribe(function () {
                self.refresh();
            });

            this.reset = function () {
                this.clearFilter();
                this.gridSettingsStore.resetSettings();
            };
            this.clearFilter = function () {
                $('#ExaminationsView').virtualDataGrid('clearFilter');
                this.filters.selectedID(null);
            };
            this.refresh = function () {
                refresh();
            };
            this.customizeView = function () {
                $('#ExaminationsView').customizeVirtualDataGrid();
            };

            var isLoading = false;
            var hasLoaded = false;
            this.loadSettings = function () {
                ZillionRis.UserSettings.get('housekeeping', 'settings')
                .then(function (data) {
                    try {
                        isLoading = true;
                        if (data) {
                            self.filters.selectedID(data.filter);
                        }
                    } catch (ex) {
                        console.log('ERROR: ' + ex);
                    } finally {
                        isLoading = false;
                        hasLoaded = true;
                    }
                });
            };
            this.saveSettings = function () {
                ZillionRis.UserSettings.set('housekeeping', 'settings', {
                    filter: self.filters.selectedID()
                });
            };
            this.resetSettings = function () {
                ZillionRis.UserSettings.set('housekeeping', 'settings', null);
                this.gridSettingsStore.resetSettings();
            };

            this.customizeFilter = function () {
                $('#FilterDialog').pageSubNav('show');
            };

            this.loadFilters = function () {
                this.filters.loadFilters();
            };

            this.viewLastAccessedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };

            var update = ZillionParts.Delay(function () {
                if (isLoading === false && hasLoaded === true) {
                    self.saveSettings();
                }
            }, 1000, true);
            this.filters.selected.subscribe(update);
        }

        var filterEditor = new ZillionRis.FilterEditor();
        filterEditor.filterFactory = function () {
            return new HousekeepingFilterViewModel(filterEditor);
        };
        filterEditor.filterSave = function (a) {
            return {
                originalName: a.originalName,
                name: a.name(),

                requestingResponsibleConsultants: a.requestingResponsibleConsultants.list().qSelect('id'),
                operators: a.operators.list().qSelect('id'),
                reporters: a.reporters.list().qSelect('id'),
                intendedReporters: a.intendedReporters.list().qSelect('id'),
                modalityTypes: a.modalityTypes.list().qSelect('id'),
                rooms: a.rooms.list().qSelect('id'),
                examinationTypes: a.examinationTypes.list().qSelect('id'),
                urgencies: a.urgencies.list().qSelect('id'),

                showWaitingExaminations: a.showWaitingExaminations(),
                showApprovedExaminations: a.showApprovedExaminations(),
                showScheduledExaminations: a.showScheduledExaminations(),
                showInDepartmentExaminations: a.showInDepartmentExaminations()
            };
        };
        filterEditor.filterLoad = function (a, b) {
            a.originalName = b.originalName;
            a.name(b.name);

            a.requestingResponsibleConsultants.set(b.requestingResponsibleConsultants);
            a.operators.set(b.operators);
            a.reporters.set(b.reporters);
            a.intendedReporters.set(b.intendedReporters);
            a.modalityTypes.set(b.modalityTypes);
            a.rooms.set(b.rooms);
            a.examinationTypes.set(b.examinationTypes);
            a.urgencies.set(b.urgencies);

            a.showWaitingExaminations(b.showWaitingExaminations);
            a.showApprovedExaminations(b.showApprovedExaminations);
            a.showScheduledExaminations(b.showScheduledExaminations);
            a.showInDepartmentExaminations(b.showInDepartmentExaminations);
        };

        filterEditor.filterType = 'housekeeping-filter';
        filterEditor.notificationTitle = 'Housekeeping Work List Filter';
        filterEditor.subject = 'housekeeping';

        filterEditor.close = function () {
            $('#FilterDialog').pageSubNav('hide');
        };

        ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

        $('#FilterDialog').pageSubNav({
            close: function () { housekeepingViewModel.loadFilters(); },
            open: function () {
                filterEditor.openFilterName = housekeepingViewModel.filters.selectedID();
                filterEditor.load();
            }
        });

        function HousekeepingFilterViewModel() {
            this.originalName = '';
            this.name = new ko.observable();

            this.requestingResponsibleConsultants = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requestingResponsibleConsultants.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/physicians', {
                queryParameters: { PhysiciansType: "all" },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.operators = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.operators.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: "Secretary" },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.reporters = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.reporters.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: 'Reporter' },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.intendedReporters = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.intendedReporters.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: 'Reporter' },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.modalityTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.modalityTypes.source = new ZillionRis.Filters.ObjectSourceLocations('modalityTypes', true);

            this.rooms = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.rooms.source = new ZillionRis.Filters.ObjectSourceLocations('rooms', true);

            this.examinationTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.examinationTypes.source = new ZillionRis.Filters.ObjectSourceModules('module://workflow/data/examinationtypes', { projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }' });

            this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                projector: '{ id: ID, label: Name, value: Name }'
            });

            this.showWaitingExaminations = new ko.observable(true);
            this.showApprovedExaminations = new ko.observable(true);
            this.showScheduledExaminations = new ko.observable(true);
            this.showInDepartmentExaminations = new ko.observable(true);

            this.itemAdded = function (elem) {
                if (elem.nodeType === 1) {
                    $(elem).show('highlight', 'slow');
                }
            };
        }

        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);
        commandManager.assign(ZillionRis.Commands.Application);
    });
})(jQuery);