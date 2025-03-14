(function ($) {

    $(function () {

        window.statusChangeCallback = statusChangeCallback;

        function throwDataRequestError(data) {
            if (data['error']) {
                var item = new ZillionParts.Notifications.Item();
                item.type = 'error';
                item.title = locfmt('{ris,PatientSearch_Title}');
                item.message = locfmt('{ris,PatientSearch_ErrorCommunicating}') + '<br/>' + data['message'];
                notifications.add(item);
                return true;
            }
            return false;
        }

        $.extend(true, window, {
            setPatientsSearchViewModel: setPatientsSearchViewModel,
            setPatientsSearchViewModelLoading: setPatientsSearchViewModelLoading
        });

        function setPatientsSearchViewModelLoading(load) {
            patientsSearchViewModel.isLoading(load);
        }

        function setPatientsSearchViewModel(data) {
            if (data == null) {
                patientsSearchViewModel.gridOptions.dataView.setItems([], 'PatientID');
                patientsSearchViewModel.gridOptions.dataView.refresh();
                return;
            }

            if (data['error']) {
                throw Error(data['message']);
            }

            patientsSearchViewModel.gridOptions.dataView.setItems(data, 'PatientID');
            patientsSearchViewModel.gridOptions.dataView.refresh();
        }

        var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);

        var commandResources = new ZillionParts.CommandResources();
        ZillionRis.Commands.RegisterResources(commandResources);

        var isPatientMergeAvailable = false;
        ZillionRis.SiteEvents.subscribe('patient-merge-available', function () {
            isPatientMergeAvailable = true;
        });

        var patientContextMenu = new ZillionParts.CommandList();
        with (patientContextMenu) {
            if (window.permissions.hasPatientContactInfoPermission) {
                add('patient.contact-information').executeWith('{ PatientID: PatientID }');
            }
            if (window.pageConfig.showPatientDetails) {
                add('patient.edit-patient').executeWith('{PatientID: PatientID }');
            }
            add('patient.merge-patient')
                .executeWith('PatientID')
                .showWhen('IsDummyPatient || window.pageConfig.RISControlsPatientData')
                .hideWhen(function() { return !isPatientMergeAvailable; });
            add('stored-documents.view').executeWith('{ Source: "urn:patientnumber:" + PatientNumber, Title: "Patient Documents" }');
        }

        function createController() {

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'PatientID',
                commandManager: commandManager,
                commandResources: commandResources,
                //contextMenuList: dictationOverviewMenu,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: patientContextMenu, manager: commandManager, resources: commandResources} },
                    { title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientDisplayName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200 },
                    { title: locfmt('{ris,FieldPatientDateOfBirth}'), fieldID: 'DateOfBirth', dataType: 'date-of-birth' },
                    { title: locfmt('{ris,FieldPatientSocialSecurityNumber}'), fieldID: 'SSN', widht: 100 },
                    { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 140 },
                    { title: locfmt('{ris,FieldPatientGender}'), fieldID: 'Gender', width: 80 },
                //{ title: locfmt('{ris,FieldAddress}'), fieldID: 'DisplayAddress', width: 400 }
                ],
                sort: [
                    { "fieldID": "PatientNameFilter", asc: true }
                ],
                gridOptions: {
                    //onRowCreated: onItemCreated
                }
            });

            return gridController.create();
        }

        var gridOptions = createController();
        var dataView = gridOptions.dataView;
        var selection = gridOptions.selection;

        var patientsSearchSelectionChanged = ZillionParts.Delay(onPatientsSearchSelectionChanged, 100);
        selection.onChange.subscribe(patientsSearchSelectionChanged);
        selection.setMultiSelect(false);

        var refreshTimer = new ris.intervalTimer({ delay: 5 * 60000, onTick: refresh });
        refreshTimer.start();

        var patientsSearchViewModel = new PatientsSearchViewModel();

        $('#CreateOrder').button().click(function () {
            ZillionRis.Navigate({ page: 'EditOrder.aspx?patientID=' + getSelectedPatientId(), hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
        });
        $('#ImportOrder').button().click(function () {
            ZillionRis.Navigate({ page: 'EditOrder.aspx?patientID=' + getSelectedPatientId() + '&IsImportedOrder=true', hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
        });

        $('#PatientsSearchResultGridPanel').groupPanel({ autoSize: true, commands: $('#PatientsButtons') });

        patientsSearchViewModel.grid = $('#PatientsSearchResultGridView');
        patientsSearchViewModel.gridOptions = gridOptions;

        clearPatientDetails();

        gridOptions.dataView.onUpdated.subscribe(function (e, data) {
            $('#PatientsSearchResultGridPanel').groupPanel({ title: locfmt('{ris,PatientsSearchResult_Title}') + '(' + this.getItems(false).length + '/' + this.getItems(true).length + ')' });
        });

        // Data bind.
        ko.applyBindings(patientsSearchViewModel, $('#PatientsSearchResultContainer')[0]);

        ZillionRis.WorkList.SelectionStore('#PatientsSearchResultGridView', patientsSearchViewModel.gridOptions, 'advancedPatientsSearch.selection');

        patientsSearchViewModel.gridSettingsStore.initialize('#PatientsSearchResultGridView', patientsSearchViewModel.gridOptions, 'advancedPatientsSearch', 'advancedPatientsSearch-worklist').loadSettings();

        createPatientsSearchContextMenu();

        $(window).resize(layout).resize();

        patientsSearchViewModel.refresh();

        function getSelectedPatientId() {
            var keys = selection.getKeys();

            if (keys.length == 1) {
                return keys[0];
            } else {
                return null;
            }
        }


        function layout() {
            var foo = $(window).height() - $('#DocumentHeader').height() - 440;
            $('#PatientsSearchResultGridPanel .ui-group-panel-content').height(foo);
            $('#PatientsSearchResultGridView').height(foo);
            $('#PatientsSearchResultGridView').virtualDataGrid('refresh');

            $('#PatientHistoryGridPanel .ui-group-panel-content').height(foo);
            $('#PatientHistoryGridView').height(foo);
            if ($('#PatientHistoryGridView').virtualDataGrid('instance')) {
                $('#PatientHistoryGridView').virtualDataGrid('refresh');
            }
        }

        function PatientsSearchViewModel() {
            var self = this;

            this.gridOptions = gridOptions;
            this.dataView = gridOptions.dataView;

            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();
            this.selectedItem = ko.observable();

            this.hasItems = new ko.observable(false);
            this.dataView.onUpdated.subscribe(function () {
                self.hasItems(this.length > 0);
            });

            this.isLoading = ko.observable(false);

            this.loadUserSettings = function () {
                this.gridSettingsStore.loadSettings();
            };
            this.resetUserSettings = function () {
                this.gridSettingsStore.resetSettings();
            };
            this.customize = function () {
                $('#PatientsSearchResultGridView').customizeVirtualDataGrid();
            };

            this.refresh = function () {
                refresh();
            };

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
            };

            this.createOrderEnabled = ko.observable(window.pageConfig.CreateOrderEnabled);
            this.importOrderEnabled = ko.observable(window.pageConfig.ImportOrderEnabled);

            setTimeout(function() {
                // Hide buttons panel if neither button is visible
                var showButtonsPanel = self.createOrderEnabled() || self.importOrderEnabled();
                $('#PatientsButtons').parents('.ui-group-panel-toolbar').toggle(showButtonsPanel);
            });
        }

        function createPatientsSearchContextMenu() {
            var configurationMenu = $('<input type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"></input>')
                .configurationMenu({
                    align: 'right',
                    items: [
                        { text: locfmt('{ris,ContextMenu_Refresh}'), id: 'refresh', iconClass: 'zillion-ris app-icon refresh' },
                        { text: locfmt('{ris,ContextMenu_ConfigureColumns}'), id: 'configure', iconClass: 'zillion-ris app-icon customize-table' },
                        { text: locfmt('{ris,ContextMenu_DefaultSettings}'), id: 'reset', iconClass: 'ui-icon ui-icon-refresh' },
                        { text: locfmt('{ris,ContextMenu_ExportTable}'), id: 'exporttable', iconClass: 'ui-icon ui-icon-extlink' }
                    ],
                    onSelect: function (item) {
                        if (item.id == 'refresh') {
                            patientsSearchViewModel.refresh();
                        } else if (item.id == 'configure') {
                            patientsSearchViewModel.customize();
                        } else if (item.id == 'reset') {
                            patientsSearchViewModel.resetUserSettings();
                            patientsSearchViewModel.reset();
                        } else if (item.id == 'exporttable') {
                            ExportTableToExcel($('#PatientsSearchResultGridView').virtualDataGrid('exportHtml'));
                        }
                    }
                });
            var find = $('#PatientsSearchResultGridPanel').groupPanel('widget').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        var delayPatientsSearchSelectionChanged = null;

        function onPatientsSearchSelectionChanged() {
            if (delayPatientsSearchSelectionChanged !== null) {
                clearTimeout(delayPatientsSearchSelectionChanged);
            }
            delayPatientsSearchSelectionChanged = setTimeout(onPatientsSearchSelectionChangedCore, 100);
        }

        var updateImageViewerWithNewPatientSelection = (function () {
            var previousPatientId = null;
            return function (newValue) {
                var patientId = newValue && newValue.PatientID;
                if (patientId !== previousPatientId) {
                    ZillionRis.ImageViewer().clear();
                }
                previousPatientId = patientId;
            };
        })();

        function onPatientsSearchSelectionChangedCore() {
            if (delayPatientsSearchSelectionChanged !== null) {
                clearTimeout(delayPatientsSearchSelectionChanged);
                delayPatientsSearchSelectionChanged = null;
            }

            var key = selection.getKeys().qFirst();
            if (key) {
                var data = dataView.getItemByKey(key);
                if (data) {
                    var patient = gridOptions.dataView.getItemByKey(data.PatientID);
                    loadPatientHistory(patient);
                    updateImageViewerWithNewPatientSelection(patient);
                    ZillionRis.LoadPatientBanner(data.PatientID);
                    enablePatientButtons();
                }
                else {
                    loadPatientHistory(null);
                    updateImageViewerWithNewPatientSelection(null);
                    clearPatientDetails();
                    disablePatientButtons();
                }
            } else {
                loadPatientHistory(null);
                updateImageViewerWithNewPatientSelection(null);
                clearPatientDetails();
                disablePatientButtons();
            }
        }

        function disablePatientButtons() {
            var createOrderButton = $('#CreateOrder');
            if (createOrderButton) {
                createOrderButton.attr("disabled", "disabled");
            }
            var importOrderButton = $('#ImportOrder');
            if (importOrderButton) {
                importOrderButton.attr("disabled", "disabled");
            }
        }

        function enablePatientButtons() {
            var createOrderButton = $('#CreateOrder');
            if (createOrderButton) {
                createOrderButton.removeAttr("disabled");
            }
            var importOrderButton = $('#ImportOrder');
            if (importOrderButton) {
                importOrderButton.removeAttr("disabled");
            }
        }

        function clearPatientDetails() {
            ZillionRis.LoadPatientBanner(0);
        }

        function refresh() {
            refreshTimer.reset();
        }

        ZillionRis.SiteEvents.subscribe('lazy-page-update', function () {
            onPatientsSearchSelectionChangedCore();
        });

        ZillionRis.SiteEvents.subscribe('lazy-patient-update', function () {
            window.SearchButton_OnClick();
        });

        function statusChangeCallback(s, e) {
            if (e.errorMessage && e.errorMessage != '') {
                alert(e.errorMessage);
            } else {
                onPatientsSearchSelectionChangedCore();
            }
        }


        ///////////////////////////////// Patient History ////////////////////////////////////

        var historyContextMenu = new ZillionParts.CommandList();
        with (historyContextMenu) {
            add('order.order-information').executeWith('{ OrderID: OrderID }');
            add('order.print-patient-label').executeWith('{ OrderID: OrderID}').showWhen('window.pageConfig.PatientLabelsAvailable');

            if (window.pageConfig.HasComplicationFormPermission) {
                add('examination.complication-form').executeWith('{ ExaminationID: ExaminationID }');
            }
            add('examination.indicator-form').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasIndicatorForm');
            if (ZillionRis.ImageViewer().getCapabilities().ImplementsAddImagesCommand) {
                add('examination.add-image').executeWith('ExaminationID').showWhen('StatusID == "completed" || StatusID == "authorised" || StatusID == "billed"');
            }
            add('examination.view-images').executeWith('ExaminationID').showWhen('StatusID == "completed" || StatusID == "authorised" || StatusID == "billed"');

            add('examination.create-addendum').executeWith('{ AccessionNumbers: [AccessionNumber] }').showWhen('HasReport').hideWhen(function (examination) { return examination.HousekeepingID || examination.StatusID === "cancelled" || examination.AddendumDictationStatuses.qAny('$item != "FIN"'); });
            add('examination.cancel-addendum').executeWith('{ AccessionNumbers: [AccessionNumber] }').showWhen(function (examination) { return examination.AddendumDictationStatuses.qAny('$item != "FIN"'); });

            add('order.show-order-appointment').executeWith('{ name: "OrderAppointment", orderID: OrderID }').showWhen('StatusID == "scheduled"').hideWhen('window.pageConfig.EditableAppointmentLetter === false');
            add('order.print-confirmation-letter').executeWith('{ OrderID: OrderID }').showWhen('StatusID == "scheduled"').hideWhen('window.pageConfig.EditableAppointmentLetter === true');
            if (window.permissions.hasDiscussionListPermission) {
                add('examination.move-to-discussion').executeWith('{ ExaminationID: ExaminationID}').hideWhen('StatusID == "cancelled" || StatusID === "waiting"');
            }
            if (window.permissions.hasFailsafePermission) {
                add('examination.send-to-failsafe').executeWith('{ ExaminationID: ExaminationID }')
                    .hideWhen('["cancelled", "invalid", "waiting", "held", "approved", "scheduled", "indepartment", "inprogress"].indexOf(StatusID) > -1 || HasUnhandledFailsafe');
                add('examination.cancel-failsafe').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasUnhandledFailsafe');
            }
            add('examination.change-intended-radiologist').executeWith('{ ExaminationID: ExaminationID }').showWhen('window.pageConfig.ChangeIntendedRadiologistEnabled');
            if (window.pageConfig.PermissionToChangeAssignments) {
                add('examination.change-assignments').executeWith('{ ExaminationID: ExaminationID }');
            }
            if (window.permissions.hasSendToHousekeepingPermission) {
                add('examination.send-to-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationTypeName, ExaminationID: ExaminationID }').hideWhen('HousekeepingID').hideWhen('StatusID == "cancelled"');
                add('examination.remove-from-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationTypeName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
            }

            if (window.pageConfig.PermissionToAutomaticSchedule) {
                add('order.auto-move-order').executeWith('{ Patient: PatientName, OrderID: OrderID }').showWhen('StatusID === "scheduled"');
                add('examination.auto-move-examination').executeWith('{ Patient: PatientName, ExaminationID: ExaminationID }').showWhen('StatusID === "scheduled" || StatusID === "approved"');
            }

            if (window.pageConfig.PermissionToManualSchedule) {
                add('order.manual-move-order').executeWith('{ Patient: PatientName, OrderID: OrderID }').showWhen('StatusID === "scheduled"');
                add('examination.manual-move-examination').executeWith('{ Patient: PatientName, ExaminationID: ExaminationID }').showWhen('StatusID === "scheduled" || StatusID === "approved"');
            }

            add('examination.view-qandaforms').executeWith('{ ExaminationID: ExaminationID }');

            add('examination.correct-administration-errors').executeWith('{ ExaminationID: ExaminationID, OrderID: OrderID, Patient: PatientName}').showWhen('StatusID == "billed" && window.pageConfig.CorrectAdministrationErrorsCommand == true');

            add('examination.cancel-appointment-and-hold-order').executeWith('{ OrderID: OrderID }').showWhen('StatusID === "scheduled" && window.pageConfig.AllowToHoldScheduledExams');
        }

        var historyActions = new ZillionParts.CommandList();
        with (historyActions) {
            if (window.permissions.hasFailsafePermission) {
                add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
            }
            add('examination.housekeeping-state').showWhen('HousekeepingID');
            if (window.permissions.hasEditOrderPermission) {
                add('order.edit-order').executeWith('{ OrderID: OrderID }').hideWhen('HousekeepingID');
            }
            add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
            add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForm }');
            add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
            add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);
        }

        // History resources.
        var HcommandResources = new ZillionParts.CommandResources();
        HcommandResources.inner = commandResources;
        HcommandResources.register('order.open-memo', [{ title: 'Memo', iconClass: { '16': 'zillion-ris orders-icon memo'} }, { when: 'HasMemo', iconClass: { '16': 'zillion-ris orders-icon memo-available'}}]);
        HcommandResources.register('examination.open-memo', [{ title: 'Memo', iconClass: { '16': 'zillion-ris orders-icon memo'} }, { when: 'HasMemo', iconClass: { '16': 'zillion-ris orders-icon memo-available'}}]);


        function createHistoryContextMenu() {
            var find = $('#PatientHistoryGridPanel').groupPanel('widget').find('.ui-group-panel-header');
            $('<input type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
                .configurationMenu({
                    align: 'right',
                    items: [
                        { text: locfmt('{ris,ContextMenu_Refresh}'), id: 'refresh', iconClass: 'zillion-ris app-icon refresh' },
                        { text: locfmt('{ris,ContextMenu_ConfigureColumns}'), id: 'configure', iconClass: 'zillion-ris app-icon customize-table' },
                        { text: locfmt('{ris,ContextMenu_DefaultSettings}'), id: 'reset', iconClass: 'ui-icon ui-icon-refresh' },
                        { text: locfmt('{ris,ContextMenu_ExportTable}'), id: 'exporttable', iconClass: 'ui-icon ui-icon-extlink' }
                    ],
                    onSelect: function (item) {
                        if (item.id == 'refresh') {
                            onPatientsSearchSelectionChangedCore();
                        } else if (item.id == 'configure') {
                            editWorkListUserSettings();
                        } else if (item.id == 'reset') {
                            clearWorkListUserSettings();
                        } else if (item.id == 'exporttable') {
                            ExportTableToExcel($('#PatientHistoryGridView').virtualDataGrid('exportHtml'));
                        }
                    }
                })
                .appendTo(find);
        }

        function loadWorkListUserSettings() {
            ZillionRis.UserSettings.get('advanced-patient-search', 'history-grid').then(function (data) {
                if (data) {
                    $('#PatientHistoryGridView').virtualDataGrid({ sort: data.sort, userColumns: data.columns });
                    $('#PatientHistoryGridView').virtualDataGrid('refresh');
                }
            });
        }
        function saveWorkListUserSettings(e, userOptions) {
            ris.notify.showInformation(null, 'History grid settings saved.', 1000);
            ZillionRis.UserSettings.set('advanced-patient-search', 'history-grid', userOptions);
        }
        function clearWorkListUserSettings() {
            ZillionRis.UserSettings.set('advanced-patient-search', 'history-grid', null);

            $('#PatientHistoryGridView').virtualDataGrid({ sort: patientHistoryGridOptions.sort, userColumns: [] });
            $('#PatientHistoryGridView').virtualDataGrid('refresh');
        }
        function editWorkListUserSettings() {
            $('#PatientHistoryGridView').customizeVirtualDataGrid();
        }

        function createHistoryGridController() {

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ExaminationID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: historyContextMenu, manager: commandManager, resources: HcommandResources } },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: historyActions, manager: commandManager, resources: HcommandResources }, width: 100 },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 200 },
                    { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' },
                    { title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technicians', width: 100 },
                    { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists', width: 100 },
                    { title: locfmt('{ris,FieldIntendedRadiologist}'), fieldID: 'IntendedReporterName', width: 100 },
                    { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName', width: 80 },
                    { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ReferringPhysicianName', width: 160 },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                    { title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber', width: 80 },
                    { title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 80 },
                    { title: locfmt('{ris,FieldRoom}'), fieldID: 'RoomName', width: 120 }
                // { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName', width: 80 },
                // { title: locfmt('{ris,FieldCancellationReasons}'), fieldID: 'CancellationReason', width: 80 }
                ],
                sort: [
                    { "fieldID": "ScheduleDateTime", asc: false },
                    { "fieldID": "AccessionNumber", asc: false }
                ],
                gridOptions: {
                    itemdblclick: function (e, args) {
                        if (window.permissions.hasEditOrderPermission) {
                            ZillionRis.CommandManager.execute('order.edit-order', { OrderID: args.item.OrderID });
                        }
                    }
                }
            });

            return gridController.create();
        }

        var patientHistoryGridOptions = createHistoryGridController();

        patientHistoryGridOptions.selection.setMultiSelect(false);

        patientHistoryGridOptions.dataView.onUpdated.subscribe(function (e, data) {
            $('#PatientHistoryGridPanel').groupPanel({ title: locfmt('{ris,ExaminationsOverview_Title}') + '(' + this.getItems(false).length + '/' + this.getItems(true).length + ')' });
        });

        $('#PatientHistoryGridPanel').groupPanel({ autoSize: true });

        $('#PatientHistoryGridView').virtualDataGrid(patientHistoryGridOptions);
        $('#PatientHistoryGridView').virtualDataGrid('onSettingsChanged').subscribe(ZillionParts.Delay(saveWorkListUserSettings, 2000));
        $('#PatientHistoryGridView').loadingOverlay({ message: locfmt('{ris,General_LoadingOverlay}'), delay: 10 });

        ZillionRis.WorkList.SelectionStore('#PatientHistoryGrid', patientHistoryGridOptions, 'patientsearch.history.selection');

        ZillionParts.GridView.Behaviors.AutoSelectSingleRow(
        {
            dataView: patientHistoryGridOptions.dataView,
            selection: patientHistoryGridOptions.selection,
            gridView: '#PatientHistoryGridView'
        });

        createHistoryContextMenu();

        var historyCheck = 0;
        function loadPatientHistory(patient) {
            var c = ++historyCheck;
            var $grid = $('#PatientHistoryGridView'),
                dataView = patientHistoryGridOptions.dataView;

            dataView.setItems([], 'ExaminationID');
            dataView.refresh();
            $grid.virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');

            if (patient) {
                $grid.loadingOverlay('show');

                Modules.ContentProvider('module://workflow/data/examinations', 'query',
                    {
                        Source: 'urn:patient:' + patient.PatientID,
                        ShowSpeechStateRadiologist: true
                    })
                    .then(function (data) {
                        if (c === historyCheck) {
                            $.each(data, function (i, e) {
                                e.Patient = patient;
                            });

                            dataView.setItems(data, 'ExaminationID');
                            dataView.refresh();

                            $grid.virtualDataGrid('refresh');
                        }
                    }, function (data) {
                        ris.notify.showError('Patient History Error', '{ris,PatientSearch_ErrorLoadingPatientHistory}<br/><br/>' + data);
                    }).always(function () {
                        if (c === historyCheck) {
                            $grid.loadingOverlay('hide');
                        }
                    });
            }
        }

    });

})(jQuery);
