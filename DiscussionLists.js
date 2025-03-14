(function ($) {

    $(function () {

        $.extend(true, window, {
            confirmCallback: confirmCallback,
            viewHistoryExaminationImage: viewHistoryExaminationImage,
            addToViewer: addToViewer
        });

        function openDiscussionList(listID) {
            discussionListsViewModel.selectedWorkList(listID);
            discussionListsViewModel.refresh();
        }

        function confirmCallback(w, e) {
            doPagePostBack(e.command);
            refresh();
        }

        function viewHistoryExaminationImage() {
            var item = discussionListsViewModel.selectedItem();
            var selectedexaminationID = patientHistoryGridOptions.selection.getKeys()[0];
            if (item && item.ExaminationID && !selectedexaminationID) {
                commandManager.execute('examination.view-images', item.ExaminationID);
            }
            else if (item && selectedexaminationID) {
                commandManager.execute('examination.view-images', selectedexaminationID);
            }
        }

        function addToViewer() {
            var item = discussionListsViewModel.selectedItem();
            var selectedexaminationID = patientHistoryGridOptions.selection.getKeys()[0];
            if (item && item.ExaminationID && !selectedexaminationID) {
                commandManager.execute('examination.add-image', item.ExaminationID);
            }
            else if (item && selectedexaminationID) {
                commandManager.execute('examination.add-image', selectedexaminationID);
            }
        }

        Rogan.Ris.Locations.ensure();

        var commandManager = new ZillionParts.CommandManager();
        var commandResources = new ZillionParts.CommandResources();

        // Register Commands.
        commandManager.assign(ZillionRis.Commands.Application);
        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);
        commandManager.assign(ZillionRis.Commands.Discussions);
        commandManager.assign(ZillionRis.Commands.Patients);

        // Register Resources.
        ZillionRis.Commands.RegisterResources(commandResources);

        var currentListID = null;
        var selection = new ZillionParts.Data.DataSelection();
        selection.onChange.subscribe(function () {
            var selectedItem;
            var keys = selection.getKeys();
            if (keys && keys.length === 1) {
                selectedItem = discussionListsViewModel.dataView.getItemByKey(keys.qFirst());
            } else {
                selectedItem = null;
            }

            discussionListsViewModel.selectedItem(selectedItem);
            discussionListsViewModel.selection(selection);
            $('#ListedGridView').virtualDataGrid('refresh');
        });
        selection.setMultiSelect(true);

        function createController() {
            var discussionMenu = new ZillionParts.CommandList();

            commandResources.assign({
                'discussion.edit-note': [ { title: locfmt('{ris,Discussion_EditNote}'), iconClass: { '16': 'zillion-ris orders-icon note' } }, { when: 'HasNote', iconClass: { '16': 'zillion-ris orders-icon note-available' } }]
            });
            
            with (discussionMenu) {
                add('order.order-information').executeWith('{ OrderID: OrderID }');
                if (window.permissions.hasPatientContactInfoPermission) {
                    add('patient.contact-information').executeWith('{ PatientID: PatientID }');
                }
                if (window.permissions.hasFailsafePermission) {
                    add('examination.send-to-failsafe').executeWith('{ ExaminationID: ExaminationID }').hideWhen('StatusDBID == "CAN" || !HasAtLeastStatusCompleted || HasUnhandledFailsafe');
                    add('examination.cancel-failsafe').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasUnhandledFailsafe');
                }
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
            }

            var discussionActions = new ZillionParts.CommandList();
            with (discussionActions) {
                if (window.permissions.hasFailsafePermission) {
                    add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
                }
                add('examination.housekeeping-state').showWhen('HousekeepingID');
                add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasRequestForm }');
                add('discussion.edit-note').executeWith(function (item) { return { DiscussionListID: currentListID, ExaminationID: item.ExaminationID, CurrentNote: item.DiscussionNote, HasNote: item.DiscussionNote } });
                add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
                add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);
            }

            var selectionColumn = {
                fieldID: 'Selection',
                dataType: 'check',
                friendlyName: locfmt('{ris,SelectionColumn}'),
                getValue: function (d, item) {
                    return selection.hasKey(item.$key);
                },
                onChange: function (d, item) {
                    if ((item.Selection = d)) {
                        selection.add(item.$key);
                    } else {
                        if (selection.getKeys().length > 1) {
                            selection.remove(item.$key);
                        }
                    }
                    return false;
                },
                getCustomFilterControl: ZillionRis.CreateSelectAllCheckbox
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ExaminationID',
                commandManager: commandManager,
                commandResources: commandResources,
                contextMenuList: discussionMenu,
                columns: [
                    selectionColumn,
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: discussionActions, manager: commandManager, resources: commandResources }, width: 95  },
                    { title: locfmt('{ris,FieldDiscussionListCategory}'), fieldID: 'DiscussionCategoryName' },
                    { title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200 },
                    { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 140 },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 200 },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 140 },
                    { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'Requester', width: 140 },
                    { title: locfmt('{ris,FieldRequesterType}'), fieldID: 'RequesterType', width: 120 },
                    { title: locfmt('{ris,FieldDiscussionNote}'), fieldID: 'DiscussionNote' },
                    { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' },
                    { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName' },
                    { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists' },
                    { title: locfmt('{ris,FieldIntendedRadiologist}'), fieldID: 'IntendedReporter' }
                ],
                sort: [
                    { "fieldID": "AccessionNumber", asc: true }
                ],
                gridOptions: {
                    selection: selection,
                    onFilterCreated: function (filter) {
                        var customFilter = new ZillionParts.Condition();
                        customFilter.type = 'and';

                        customFilter.include(filter);
                        var currentFilter = discussionListsViewModel.filters.selected();
                        if (currentFilter) {
                            combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                            combineListFilter(customFilter, 'RoomID', currentFilter.rooms);
                            combineListFilter(customFilter, 'ExaminationTypeID', currentFilter.examinationTypes);
                            combineListFilter(customFilter, 'RequesterLocationID', currentFilter.requesterLocations);

                            combineListFilter(customFilter, 'ReporterID', currentFilter.reporters);
                            combineListFilter(customFilter, 'IntendedReporterID', currentFilter.intendedReporters);
                            combineListFilter(customFilter, 'ResponsibleRequestingPhysicianID', currentFilter.requestingResponsibleConsultants);
                            combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);
                        }

                        return createFilterFunc(customFilter);
                    },
                    //                    onFilterCreated: createGridFilter,
                    //                    onRowCreated: postProcessItem,
                    createEmptyDataItem: createEmptyDataItem,
                    itemclick: itemClick
                    //                    onRowCreated: onItemCreated
                }

            });

            function createEmptyDataItem() {
                var examinations = this.dataView.getItems(true).length;
                if (examinations > 0) {
                    var message = locfmt('{ris,NoExaminationsFoundFilter}<br />{examinations}{ris,ExaminationsInTotal}<br /><a>{ris,General_ClearFilter}</a>', { examinations: examinations });
                    var $message = $('<span>' + message + '</span>');
                    $('a', $message).click(function () { discussionListsViewModel.clearFilter(); });
                    return $message;
                } else {
                    return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                }
            }

            function itemClick(e, args) {
                if (!selection.hasKey(args.item.$key)) {
                    selection.clear();
                    selection.add(args.item.$key);
                }
            }

            return gridController.create();
        }

        var historyActions = new ZillionParts.CommandList();
        with (historyActions) {
            if (window.permissions.hasFailsafePermission) {
                add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
            }
            add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
            add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForm }');
            add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
            add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);
        }

        var patientHistoryGridOptions = {
            keyField: 'ExaminationID',

            dataView: new ZillionParts.Data.DataSet(),
            selection: new ZillionParts.Data.DataSelection(),
            showFilterRow: true,

            columnDefaults: {
                allowFilter: true,
                allowSort: true,
                allowResize: true
            },

            columns: [
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: historyActions, manager: commandManager, resources: commandResources}, width: 75 },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationTypeName', width: 200 },
                { title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technicians', width: 100 },
                { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists', width: 100 },
                { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ReferringPhysicianName', width: 160 },
                { title: locfmt('{ris,FieldOrderID}'), fieldID: 'OrderNumber', width: 100 },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName', width: 80 },
                { title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 80 },
                { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName', width: 120 }
            //{ title: 'Cancellation Reasons', fieldID: 'cancellation', width: 80 }
            ],
            sort: [
                { "fieldID": "ScheduleDateTime", asc: false },
                { "fieldID": "AccessionNumber", asc: false }
            ]
        };

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

        var gridOptions = createController();
        var dataView = gridOptions.dataView;
        
        var refreshTimer = new ris.intervalTimer({ delay: 10 * 60000, onTick: refresh });
        refreshTimer.start();

        var patientSearchSelectionChanged = ZillionParts.Delay(onPatientSearchSelectionChanged, 100);
        selection.onChange.subscribe(patientSearchSelectionChanged);

        var patientHistorySelectionChanged = ZillionParts.Delay(onPatientHistorySelectionChanged, 100);
        patientHistoryGridOptions.selection.onChange.subscribe(patientHistorySelectionChanged);
        patientHistoryGridOptions.selection.setMultiSelect(false);

        patientHistoryGridOptions.dataView.onUpdated.subscribe(function (e, data) {
            $('#HistoryPanel').groupPanel({ title: locfmt('{ris,ExaminationsOverview_Title}') + ' (' + this.getItems(false).length + '/' + this.getItems(true).length + ')' });
        });

        var discussionListsViewModel = new DiscussionListsViewModel();
        discussionListsViewModel.listsLoaded.subscribe(adjustPageLayout);
        discussionListsViewModel.loadLists();

        discussionListsViewModel.filters.selected.subscribe(function () {
            $("#ListedGridView").virtualDataGrid('updateFilter');
        });

        $('#ListedPanel').groupPanel({ toolBar: $("#DiscussionToolBar") });
        $('#HistoryPanel').groupPanel({ autoSize: true });

        discussionListsViewModel.grid = $('#ListedGridView');
        discussionListsViewModel.gridOptions = gridOptions;

        $('#PatientHistoryGrid').virtualDataGrid(patientHistoryGridOptions);

        // Data bind.
        ko.applyBindings(discussionListsViewModel, $('#DiscussionListPage')[0]);

        ZillionRis.WorkList.SelectionStore('#ListedGridView', discussionListsViewModel.gridOptions, 'discussionlists.selection');
        ZillionRis.WorkList.SelectionStore('#PatientHistoryGrid', patientHistoryGridOptions, 'patientsearch.history.selection');

        discussionListsViewModel.gridSettingsStore.initialize('#ListedGridView', discussionListsViewModel.gridOptions, 'discussion', 'discussion-worklist').loadSettings();

        var historyGridSettingsStore = new ZillionRis.WorkList.SettingsStore();
        historyGridSettingsStore.initialize('#PatientHistoryGrid', patientHistoryGridOptions, 'discussion', 'discussion-history').loadSettings();
        historyGridSettingsStore.loadSettings();

        loadWorkListUserSettings();

        ZillionParts.GridView.Behaviors.AutoSelectSingleRow({
            dataView: dataView,
            selection: selection,
            gridView: '#ListedGridView'
        });

        ZillionParts.GridView.Behaviors.AutoSelectSingleRow({
            dataView: patientHistoryGridOptions.dataView,
            selection: patientHistoryGridOptions.selection,
            gridView: '#PatientHistoryGrid'
        });

        $('#PatientHistoryGrid').loadingOverlay({ message: locfmt('{ris,ExaminationsOverview_LoadingOverlay}') });

        $('#HistoryContextMenu').menu().hide();

        createDiscussionListContextMenu();
        createHistoryContextMenu();

        $(window).resize(adjustPageLayout);

        discussionListsViewModel.refresh();

        discussionListsViewModel.loadSettings();
        discussionListsViewModel.loadFilters();

        function loadWorkListUserSettings() {
            ZillionRis.UserSettings.get('discussion', 'history-grid').then(function (data) {
                if (data) {
                    $('#PatientHistoryGrid').virtualDataGrid({ sort: data.sort, userColumns: data.columns });
                    $('#PatientHistoryGrid').virtualDataGrid('refresh');
                }
            });
        }
        function saveWorkListUserSettings(e, userOptions) {
            ris.notify.showInformation(null, 'History grid settings saved.', 1000);
            ZillionRis.UserSettings.set('discussion', 'history-grid', userOptions);
        }
        function clearWorkListUserSettings() {
            ZillionRis.UserSettings.set('discussion', 'history-grid', null);
            $('#PatientHistoryGrid').virtualDataGrid({ sort: patientHistoryGridOptions.sort, userColumns: [] });
            $('#PatientHistoryGrid').virtualDataGrid('refresh');
        }
        function editWorkListUserSettings() {
            $('#PatientHistoryGrid').customizeVirtualDataGrid();
        }

        function createFilterFunc(filters) {
            return function (items) { return filters.filter(items); };
        }

        function adjustPageLayout() {
            $('#DiscussionListButtons').width($('#ButtonsPanel').width() - $('#AddDeleteButtons').width() - 20);

            var foo = parseInt(($(window).height() - $('#DocumentHeader').height() - $('#DiscussionListButtons').height() - 214) / 2);
            $('#ListedPanel .ui-group-panel-content').height(foo);
            $('#ListedGridView').height(foo);
            $('#ListedGridView').virtualDataGrid('refresh');

            $('#HistoryPanel').height(foo);
            $('#PatientHistoryGrid').height($('#HistoryPanel').height());
            $('#PatientHistoryGrid').virtualDataGrid('refresh');
        }

        function DiscussionListsViewModel() {
            var self = this;

            this.selectedWorkList = ko.observable(null);

            this.gridOptions = gridOptions;
            this.dataView = gridOptions.dataView;
            this.selection = ko.observable();

            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();
            this.selectedItem = ko.observable();

            this.hasItems = new ko.observable(false);
            this.dataView.onUpdated.subscribe(function () {
                self.hasItems(this.length > 0);
                $('#ListedPanel').groupPanel({ title: locfmt('{ris,DiscussionList_Title}') + ' (' + this.getItems(false).length + '/' + this.getItems(true).length + ')' });
            });

            this.isLoading = ko.observable(false);

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'discussion-filter';

            this.hasReport = ko.computed(function() {
                var item = self.selectedItem();
                return item && item.HasReport;
            });

            this.hasSelection = ko.computed(function() {
                var items = self.selection();
                return items && items.getCount() > 0;
            });

            this.hasMultipleSelected = ko.computed(function() {
                var items = self.selection();
                return items && items.getCount() > 1;
            });

            this.hasCompletedItem = ko.computed(function () {
                var item = self.selectedItem();
                return item && item.HasAtLeastStatusCompleted;
            });

            this.showAddButton = ko.observable(ZillionRis.ImageViewer().getCapabilities().ImplementsAddImagesCommand);

            this.clearFilter = function () {
                $('#ListedGridView').virtualDataGrid('clearFilter');
                this.filters.selectedID(null);
            };
            this.loadUserSettings = function () {
                discussionListsViewModel.gridSettingsStore.loadSettings();
            };
            this.resetUserSettings = function () {
                discussionListsViewModel.gridSettingsStore.resetSettings();
            };
            this.customize = function () {
                $('#ListedGridView').customizeVirtualDataGrid();
            };

            this.refresh = function () {
                refresh();
            };

            this.customizeFilter = function () {
                $('#FilterDialog').pageSubNav('show');
            };

            var hasLoaded = false;
            this.loadSettings = function () {
                ZillionRis.UserSettings.get('discussion', 'settings')
                .then(function (data) {
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
            this.saveSettings = function () {
                ZillionRis.UserSettings.set('discussion', 'settings', {
                    filter: self.filters.selectedID()
                });
            };

            var update = ZillionParts.Delay(function () {
                if (self.isLoading() === false && hasLoaded == true) {
                    self.saveSettings();
                }
            }, 1000, true);
            this.filters.selected.subscribe(update);

            this.reset = function () {
                this.resetUserSettings();
                this.clearFilter();
            };

            this.loadFilters = function() {
                this.filters.loadFilters();
            };

            this.PersonalDiscussionLists = ko.observableArray([]);
            this.SharedDiscussionLists = ko.observableArray([]);

            this.selectList = function (item) {
                openDiscussionList(item ? item.id : null);
            };

            this.addList = function() {
                Modules.Activity('module://examination-discussion/view/add-list')
                    .always(function() {
                    self.loadLists();
                });
            };

            this.deleteList = function() {
                var selectedItem = self.PersonalDiscussionLists().qFirst('selected()') || self.SharedDiscussionLists().qFirst('selected()');
                if (selectedItem) {
                    ZillionRis.Confirmation({
                            title: locfmt('{ris,DeleteDiscussionList_Title}'),
                            content: locfmt(selectedItem.shared ? '{ris,DeleteDiscussionList_SharedList}' : '{ris,DeleteDiscussionList_PersonalList}',
                                            { listName: '<span class="text-emphasis">' + selectedItem.title() + '</span>' }),
                            buttons: 'no yes',
                            width: 500
                        })
                        .then(function(a) {
                            if (a) {
                                Modules.Task('module://examination-discussion/task/delete-list', 'process', { ListID: selectedItem.id })
                                    .then(function() {
                                        self.loadLists();
                                    }, function(h) {
                                        ris.notify.showError('Unable to delete the discussion list', h.message);
                                    });
                            }
                        });
                } else {
                    ris.notify.showError('Delete discussion list', 'There is no list marked for removing.');
                }
            };

            this.removeExaminations = function () {
                var discussionListID = self.selectedWorkList();

                var examinationIDs = self.dataView.getItems(true).qWhere(function (item) {
                    return selection.getKeys().indexOf(item.$key) !== -1;
                }).qSelect('ExaminationID');

                removeExaminations(discussionListID, examinationIDs);
            };

            this.addAddendums = function () {
                var selectedItems = self.dataView.getItems(true).qWhere(function(item) {
                    return selection.getKeys().indexOf(item.$key) !== -1;
                });

                var anyUnreported = selectedItems.qAny(function(item) {
                    return item.HasReport === false;
                });

                if (anyUnreported) {
                    ris.notify.showError(locfmt('{ris,AddAddendum_Unable}'), locfmt('{ris,AddAddendum_Unreported}'));
                } else {
                    commandManager.execute('examination.create-addendum', { AccessionNumbers: selectedItems.qSelect('AccessionNumber') });
                }
            };

            function DiscussionListItem(item) {
                var s = this;
                this.title = ko.observable(item.Text);
                if (item.Text.length > 20) {
                    this.name = ko.observable(item.Text.substring(0,20) + '...');
                } else {
                    this.name = ko.observable(item.Text);
                }
                this.id = item.ID;
                this.selected = ko.computed(function () {
                    return s.id === self.selectedWorkList();
                });
                this.shared = item.Shared;
                return s;
            }

            this.listsLoaded = new ZillionParts.Event();

            var checkForDiscussionList = 0;
            this.loadLists = function () {
                var c = ++checkForDiscussionList;
                $.when(
                    Modules.ContentProvider('module://examination-discussion/data/list', 'query', { Shared: false }),
                    Modules.ContentProvider('module://examination-discussion/data/list', 'query', { Shared: true })
                ).then(function (personalLists, sharedLists) {
                    if (c === checkForDiscussionList) {
                        var personalListElements = personalLists.qSelect(function (item) {
                            var x = new DiscussionListItem(item);
                            return x;
                        });
                        var sharedListElements = sharedLists.qSelect(function (item) {
                            var x = new DiscussionListItem(item);
                            return x;
                        });
                        self.PersonalDiscussionLists(personalListElements);
                        self.SharedDiscussionLists(sharedListElements);
                        self.selectList(personalListElements.qFirst() || sharedListElements.qFirst());
                        self.listsLoaded.notify(null, null, self);
                    }
                }, function (h) {
                    if (c === checkForDiscussionList) {
                        ris.notify.showError('Unable to load the discussion lists', h.message);
                    }
                });
            };
        }

        function createDiscussionListContextMenu() {
            var configurationMenu = $('<input type="button" id="DiscussionListsGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                            discussionListsViewModel.refresh();
                        } else if (item.id == 'clear-filter') {
                            discussionListsViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            discussionListsViewModel.customize();
                        } else if (item.id == 'reset') {
                            discussionListsViewModel.reset();
                        }
                    }
                });
            var find = $('#ListedPanel').groupPanel('widget').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function createHistoryContextMenu() {
            var header = $('#HistoryPanel').groupPanel('header');
            $('<input type="button" id="ExaminationGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
                .configurationMenu({
                    align: 'right',
                    items: [
                        { text: locfmt('{ris,ContextMenu_Refresh}'), id: 'refresh', iconClass: 'zillion-ris app-icon refresh' },
                        { text: locfmt('{ris,ContextMenu_ConfigureColumns}'), id: 'configure', iconClass: 'zillion-ris app-icon customize-table' },
                        { text: locfmt('{ris,ContextMenu_DefaultSettings}'), id: 'reset', iconClass: 'ui-icon ui-icon-refresh' }
                    ],
                    onSelect: function (item) {
                        if (item.id == 'refresh') {
                            onPatientSearchSelectionChangedCore();
                        } else if (item.id == 'configure') {
                            editWorkListUserSettings();
                        } else if (item.id == 'reset') {
                            clearWorkListUserSettings();
                        }
                    }
                })
                .appendTo(header);
        }

        function removeExaminations(discussionListID, examinationIDs) {
            Modules.Task('module://examination-discussion/task/remove-examination', 'request', { ListID: discussionListID, ExaminationIDs: examinationIDs })
                   .then(function () {
                       discussionListsViewModel.refresh();
                       ZillionRis.ImageViewer().clear();
                   }, function (h) {
                       ris.notify.showError('Unable to delete examination(s) from the discussion list', h.message);
                   });
        }

        var delayPatientSearchSelectionChanged = null;

        function onPatientSearchSelectionChanged() {
            if (delayPatientSearchSelectionChanged !== null) {
                clearTimeout(delayPatientSearchSelectionChanged);
            }
            delayPatientSearchSelectionChanged = setTimeout(onPatientSearchSelectionChangedCore, 100);
        }

        var LastPatientSelection = null;

        function onPatientSearchSelectionChangedCore() {
            if (delayPatientSearchSelectionChanged !== null) {
                clearTimeout(delayPatientSearchSelectionChanged);
                delayPatientSearchSelectionChanged = null;
            }

            var ExaminationID = selection.getKeys().qFirst();
            if (selection.getCount() === 1 && ExaminationID) {
                var patient = discussionListsViewModel.dataView.getItemByKey(ExaminationID);
                if (patient) {
                    if (patient.PatientID) {
                        loadPatientHistory(patient.PatientID);
                        loadPatientDetails(patient.PatientID);
                    } else {
                        loadPatientHistory(null);
                        clearPatientDetails();
                    }

                    if (LastPatientSelection == null) {
                        LastPatientSelection = patient.PatientID;
                    } else if (LastPatientSelection != patient.PatientID) {
                        ZillionRis.ImageViewer().clear();
                        LastPatientSelection = patient.PatientID;
                    }
                }
            } else {
                loadPatientHistory(null);
                clearPatientDetails();
            }
        }

        var historyCheck = 0;
        function loadPatientHistory(patientID) {
            var c = ++historyCheck;
            var $grid = $('#PatientHistoryGrid'),
                patienthistorydataView = patientHistoryGridOptions.dataView;

            patienthistorydataView.setItems([], 'ExaminationID');
            patienthistorydataView.refresh();
            $grid.virtualDataGrid('refresh');

            if (patientID) {
                $grid.loadingOverlay('show');

                Modules.ContentProvider('module://workflow/data/examinations', 'query', { Source: 'urn:patient:' + patientID })
                    .then(function (data) {
                        if (c === historyCheck) {
                            patienthistorydataView.setItems(data, 'ExaminationID');
                            patienthistorydataView.refresh();

                            $grid.virtualDataGrid('refresh');
                            $grid.virtualDataGrid('focusFirstSelection');
                        }
                    }, function (data) {
                        ris.notify.showError('Patient History Error', '{ris,DiscussionLists_ErrorLoadingPatientHistory}<br/><br/>' + data);
                    }).always(function () {
                        if (c === historyCheck) {
                            $grid.loadingOverlay('hide');
                        }
                    });
            }
        }

        function throwDataRequestError(data) {
            if (data['error']) {
                var item = new ZillionParts.Notifications.Item();
                item.type = 'error';
                item.title = 'Patient Search';
                item.message = locfmt('{ris,DiscussionLists_ErrorCommunicatingWithTheServer}', { br: '<br/>' }) + data['message'];
                notifications.add(item);
                return true;
            }
            return false;
        }

        function clearPatientDetails() {
            ZillionRis.LoadPatientBanner(0);
        }

        function loadPatientDetails(patientID) {
            ZillionRis.LoadPatientBanner(patientID);
        }

        function onPatientHistorySelectionChanged() {
            //loadExaminationInformation(getPatientHistoryFocusedKey());
        }

        ZillionRis.SiteEvents.subscribe('lazy-page-update', function () {
            onPatientSearchSelectionChangedCore();
        });

        window.refreshPage = function () {
            refresh();
        };

        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);
        var check = 0;
        function refresh() {
            refreshTimer.reset();

            if (!discussionListsViewModel.selectedWorkList()) {
                discussionListsViewModel.gridOptions.dataView.setItems([]);
                discussionListsViewModel.gridOptions.dataView.refresh();
                return;
            }

            var c = ++check;
            discussionListsViewModel.isLoading(true);

            Modules.ContentProvider('module://websitecore/data/discussion', 'worklist', { CurrentList: discussionListsViewModel.selectedWorkList() })
            .then(function (data) {
                if (c === check) {
                    if (data != null) {
                        currentListID = discussionListsViewModel.selectedWorkList();
                        discussionListsViewModel.gridOptions.dataView.setItems(data, 'ExaminationID');
                        discussionListsViewModel.gridOptions.dataView.refresh();
                        if (discussionListsViewModel.gridOptions.dataView.getItems().length > 0) {
                            var key = discussionListsViewModel.gridOptions.dataView.getKeyByIdx(0);
                            if (selection.getKeys().length > 0) {
                                var item = discussionListsViewModel.gridOptions.dataView.getItemByKey(selection.getKeys().qFirst());
                                if (!item) {
                                    discussionListsViewModel.gridOptions.selection.add(key);
                                }
                            } else {
                                discussionListsViewModel.gridOptions.selection.add(key);
                            }                          
                        }
                    }
                }
            }, function (error) {
                throw Error(error.message);
            }).always(function () {
                if (c === check) {
                    discussionListsViewModel.isLoading(false);
                }
            });
        }

        function DiscussionFilterViewModel() {
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

            this.requesterLocations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requesterLocations.source = new ZillionRis.Filters.ObjectSourceLocations('requesterLocations', true);

            this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                projector: '{ id: ID, label: Name, value: Name }'
            });

            this.itemAdded = function (elem) {
                if (elem.nodeType === 1) {
                    $(elem).show('highlight', 'slow');
                }
            };
        }

        var filterEditor = new ZillionRis.FilterEditor();
        filterEditor.filterFactory = function () {
            return new DiscussionFilterViewModel(filterEditor);
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
                requesterLocations: a.requesterLocations.list().qSelect('id'),
                urgencies: a.urgencies.list().qSelect('id')
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
            a.requesterLocations.set(b.requesterLocations);
            a.urgencies.set(b.urgencies);
        };

        filterEditor.filterType = 'discussion-filter';
        filterEditor.notificationTitle = 'Discussion Work List Filter';
        filterEditor.subject = 'discussion';

        filterEditor.close = function () {
            $("#FilterDialog").pageSubNav('hide');
        };

        ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

        $("#FilterDialog").show().pageSubNav({
            close: function () { discussionListsViewModel.loadFilters(); },
            open: function () {
                filterEditor.openFilterName = discussionListsViewModel.filters.selectedID();
                filterEditor.load();
            }
        });

    });
})(jQuery);