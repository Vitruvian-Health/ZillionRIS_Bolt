(function ($) {
    $(function () {
        function executeCommand(cmd, arg) {
            doPagePostBack(cmd + ';' + arg);
        }

        var commandManager = new ZillionParts.CommandManager();
        commandManager.assign(ZillionRis.Commands.Patients);
        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);
        commandManager.assign(ZillionRis.Commands.Application);

        var commandResources = new ZillionParts.CommandResources();
        ZillionRis.Commands.RegisterResources(commandResources);

        commandResources.register('portering.cancel-transport', { title: locfmt('{ris,ContextMenu_CancelTransport}'), iconClass: {'16': 'zillion-ris workflow-icon declined'} });
        commandResources.register('portering.transport-to-rad', { title: locfmt('{ris,ContextMenu_TransportToRadiographer}'), iconClass: { '16': 'zillion-ris workflow-icon promote-status'} });
        commandResources.register('portering.transport-from-rad', { title: locfmt('{ris,ContextMenu_TransportBackFromRadiographer}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status'} });
        commandResources.register('portering.transport-inprogress', { title: locfmt('{ris,ContextMenu_PendingTransport}'), iconClass: { '16': 'zillion-ris workflow-icon pending'} });

        commandManager.assign({
            'portering.cancel-transport': {
                execute: function (examinationID) {
                    executeCommand('portering.cancel-transport', examinationID);
                },
                canExecute: function (examinationID) {
                    return !!examinationID;
                }
            },
            'portering.transport-to-rad': {
                execute: function (examinationID) {
                    executeCommand('portering.transport-to-rad', examinationID);
                },
                canExecute: function (examinationID) {
                    return !!examinationID;
                }
            },
            'portering.transport-from-rad': {
                execute: function (examinationID) {
                    executeCommand('portering.transport-from-rad', examinationID);
                },
                canExecute: function (examinationID) {
                    return !!examinationID;
                }
            },
            'portering.transport-inprogress': {
                execute: function (examinationID) {
                    // Do nothing. Can't be executed it's just an icon showing that the patient is with the radiographer.
                },
                canExecute: function (examinationID) {
                    return false;
                }
            }
        });

        function createController() {

            var porteringContextMenu = new ZillionParts.CommandList();
            with (porteringContextMenu) {
                if (window.permissions.hasPatientContactInfoPermission) {
                    add('patient.contact-information').executeWith('{ PatientID: PatientID }');
                }
                add('portering.cancel-transport').executeWith('ID').showWhen('PorterIsCurrentUser && (TransportStatus === "Transporting" || TransportStatus === "TransportingBack")');
            }

            var porteringActions = new ZillionParts.CommandList();
            with (porteringActions) {
                add('portering.transport-to-rad').executeWith('ID').showWhen('TransportStatus === "Waiting" || (PorterIsCurrentUser === true && TransportStatus === "Transporting")');
                add('portering.transport-from-rad').executeWith('ID').showWhen('PorterIsCurrentUser === true && (TransportStatus === "WaitingBack" || TransportStatus === "TransportingBack")');
                add('portering.transport-inprogress').executeWith('ID').showWhen('TransportStatus === "Transported"');

                add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, Title: locfmt("{ris,OrderDocumentsFor} ") + PatientName, HasStoredDocument: HasOrderRequestForm }');
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ID',
                commandManager: commandManager,
                commandResources: commandResources,
                //contextMenuList: dictationOverviewMenu,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: porteringContextMenu, manager: commandManager, resources: commandResources} },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: porteringActions, manager: commandManager, resources: commandResources} },
                    { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'Scheduled', dataType: 'scheduled-date', emphasis: 'time' },
                    { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 110 },
                    { title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200 },
                    { title: locfmt('{ris,FieldPatientGender}'), fieldID: 'Gender', width: 60 },
                    { title: locfmt('{ris,FieldPatientDateOfBirth}'), fieldID: 'DateOfBirth', dataType: 'date-of-birth' },
                    { title: locfmt('{ris,FieldLocation}'), fieldID: 'PatientLocation' },
                    { title: locfmt('{ris,FieldMobility}'), fieldID: 'Mobility' },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 200 },
                    { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'ExaminationStatusName' },
                    { title: locfmt('{ris,FieldRoom}'), fieldID: 'Room' },
                    { title: locfmt('{ris,FieldModality}'), fieldID: 'Modality' },
                ],
                sort: [
                    { "fieldID": "Scheduled", asc: true },
                    { "fieldID": "Room", asc: true }
                ],
                gridOptions: {
                    onRowCreated: postProcessItem,
                    syncColumnCellResize: true,
                    columnDefaults: {
                        allowFilter: true,
                        allowSort: true,
                        allowResize: true
                    },
                    showFilterRow: true
                }
            });

            function postProcessItem(item, data) {
                if (data.TransportStatus === "Transporting" || data.TransportStatus === "TransportingBack") {
                    item.addClass('data-ignored').css({ opacity: 0.7, color: '#484' });
                }
            };

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

        var porteringViewModel = new PorteringViewModel();
        porteringViewModel.grid = $('#ExaminationsView');
        porteringViewModel.gridOptions = gridOptions;

        //Persist changed date.
        porteringViewModel.selectedDate.subscribe(function (a) {
            if (window.sessionStorage) {
                window.sessionStorage.setItem('portering.date', a);
                refresh();
            }
        });

        function loadExaminationsViewUserSettings() {
            ZillionRis.UserSettings.get('portering', 'grid').then(function (data) {
                if (data) {
                    $('#ExaminationsView').virtualDataGrid({ sort: data.sort, userColumns: data.columns });
                    $('#ExaminationsView').virtualDataGrid('refresh');
                }
            });
        }

        function clearExaminationsViewUserSettings() {
            ZillionRis.UserSettings.set('portering', 'grid', null);

            $('#ExaminationsView').virtualDataGrid({ sort: gridOptions.sort, userColumns: [] });
            $('#ExaminationsView').virtualDataGrid('refresh');
        }

        function saveExaminationsViewUserSettings(e, userOptions) {
            ris.notify.showInformation(null, locfmt('{ris,Portering_SettingsSaved}'), 1000);
            ZillionRis.UserSettings.set('portering', 'grid', userOptions);
        }

        $('#WorkListPanel').groupPanel({ toolBar: $('#PorteringToolBar') });
        $('#PatientDetailsPanel').groupPanel();
        $('#ExaminationsView').virtualDataGrid(gridOptions);
        $('#ExaminationsView').loadingOverlay({ message: 'One moment please ...' });
        
        // Data bind.
        ko.applyBindings(porteringViewModel, $("#PorteringPage")[0]);

        loadExaminationsViewUserSettings();

        $('#ExaminationsView').virtualDataGrid('onSettingsChanged').subscribe(ZillionParts.Delay(saveExaminationsViewUserSettings, 2000));
        $('#ExaminationsView').loadingOverlay({ delay: 50, message: locfmt('{ris,General_LoadingOverlay}') });

        setInterval(refresh, 15000);

        $(function () {
            // Execute the refresh after the document has been loaded, so the "check" variable is already assign.
            refresh();
        });
        createWorkListContextMenu();

        ZillionParts.GridView.Behaviors.RestrictToDataSet({ dataView: dataView, selection: selection, gridView: '#ExaminationsView' });
        ZillionParts.GridView.Behaviors.ForceSingleSelect({ dataView: dataView, selection: selection, gridView: '#ExaminationsView' });

        $(window).resize(function () {
            $('#ExaminationsView').height($(window).height() - $('#DocumentHeader').height() - 140).virtualDataGrid('refresh');
        });
        $(window).resize();

        $.extend(true, window, {
            porteringOptions: gridOptions,
            statusChangeCallback: statusChangeCallback,
            refresh: refresh
        });

        function createWorkListContextMenu() {
            var configurationMenu = $('<input type="button" id="TransportingListGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                            $('#ExaminationsView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                        } else if (item.id == 'configure') {
                            $('#ExaminationsView').customizeVirtualDataGrid();
                        } else if (item.id == 'reset') {
                            clearExaminationsViewUserSettings();
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
                ZillionRis.LoadPatientBanner(data.PatientID);
            } else {
                ZillionRis.LoadPatientBanner(0);
            }
        }

        function select(key) {
            selection.add(key);
        }

        function getSelectedKey() {
            return selection.getCount() == 1 ? selection.getKeys()[0] : null;
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

            $('#WorkListPanel').groupPanel({ title: locfmt('{ris,TransportingList_Title}') + ' - ' + porteringViewModel.selectedDateText() + ' (' + dataView.getItems(false).length +'/'+ dataView.getItems(true).length + ')' });

            $('#ExaminationsView').virtualDataGrid('refresh');
        });

        var check = 0;
        function refresh() {
            refreshTimer.reset();

            $('#ExaminationsView').loadingOverlay('show');
            var c = ++check;
            Modules.ContentProvider('module://portering/data/worklist', 'query', {Date: porteringViewModel.selectedDate()})
                .then(function(data) {
                    if (c === check) {
                        gridOptions.dataView.setItems(data, 'ID');
                        gridOptions.dataView.refresh();
                    }
                }, function(e) {
                ris.notify.showError('Failed to load the worklist', e.message || 'Unexpected error');
            }).always(function() {
                $('#ExaminationsView').loadingOverlay('hide');
            });
        }

        setTimeout(function () {
            var currentDate = porteringViewModel.selectedDate();
            var storageDate = window.sessionStorage && window.sessionStorage.getItem('portering.date');

            // Restore previous date.
            if (storageDate && (storageDate = new Date(storageDate)) && storageDate.toDateString() != currentDate.toDateString()) {
                ris.notify.showInformation(storageDate.format('dddd, d MMMM yyyy'), locfmt('{ris,General_PreviouslySelectedDate}', { date: storageDate.format('dddd, d MMMM yyyy') }), 10000);
                porteringViewModel.selectedDate(storageDate);
            }
        }, 0);

        function PorteringViewModel() {
            var self = this;

            this.gridOptions = gridOptions;
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.selectedDate = new ko.observable(new Date());
            this.selectedDateText = new ko.computed(function () {
                if (self.selectedDate()) {
                    return self.selectedDate().format('dddd, d MMMM');
                } else {
                    return '-';
                }
            });
            this.today = function () {
                this.selectedDate(new Date());
            };
            this.isToday = function () {
                return this.selectedDate().toDateString() === new Date().toDateString();
            };

            this.dataView = ZillionParts.Data.DataSet();
        }
    });
})(jQuery);