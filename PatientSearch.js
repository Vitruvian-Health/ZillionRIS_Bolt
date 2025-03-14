(function ($) {
    var patientSearchAjax = new ZillionRis.SingleAjax();

    $(function () {
        var openedViewer = false;
        var openedViewerForPatientId = null;

        $.extend(true, $.ui.virtualDataGrid.dataTypes, {
            'imported-order-type': {
                renderMethod: function (value) {
                    return value ? locfmt('{ris,FieldImportedOrder}') : '';
                },
                createFilterMethod: function (search) {
                    var regex = ZillionParts.Data.WildCardToRegex(search + '*');
                    return regex.test(locfmt('{ris,FieldImportedOrder}'));
                }
            }
        });

        window.statusChangeCallback = statusChangeCallback;

        var patientSearchCommands = {
            'patient-search.view-images': {
                execute: function (context) {
                    openedViewer = true;
                    openedViewerForPatientId = getPatientSearchFocusedKey();
                    return commandManager.execute('examination.view-images', context.ExaminationID);
                }
            }
        };

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

        var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
        commandManager.assign(patientSearchCommands);

        var commandResources = new ZillionParts.CommandResources();
        ZillionRis.Commands.RegisterResources(commandResources);
        commandResources.register('patient-search.view-images', [{ title: locfmt('{ris,CommandViewImages}'), iconClass: { '16': 'zillion-ris patients-icon search-patient'}}]);

        var isPatientMergeAvailable = false;
        ZillionRis.SiteEvents.subscribe('patient-merge-available', function () {
            isPatientMergeAvailable = true;
        });

        var patientContextMenu = new ZillionParts.CommandList();
        with (patientContextMenu) {
            if (window.permissions.hasPatientContactInfoPermission) {
                add('patient.contact-information').executeWith('{ PatientID: ID }');
            }
            if (window.pageConfig.showPatientDetails) {
                add('patient.edit-patient').executeWith('{PatientID: ID }');
            }
            add('patient.merge-patient')
                .executeWith('ID')
                .showWhen('IsDummyPatient || window.pageConfig.RISControlsPatientData')
                .hideWhen(function () { return !isPatientMergeAvailable; });
            add('stored-documents.view').executeWith('{ Source: "urn:patientnumber:" + PatientNumber, Title: "Patient Documents" }');
            add('order.view-audit-trail').executeWith('{ Source: "urn:patientnumber:" + PatientNumber }').showWhen('window.pageConfig.PermissionToViewAuditTrails');
        }

        var historyContextMenu = new ZillionParts.CommandList();
        with (historyContextMenu) {
            add('order.order-information').executeWith('{ OrderID: OrderID }');
            if (window.pageConfig.showPatientHistoryPrintLabel) {
                add('order.print-patient-label').executeWith('{ OrderID: OrderID}').showWhen('window.pageConfig.PatientLabelsAvailable');
            }
            if (window.pageConfig.showPatientHistoryComplicationForm) {
                add('examination.complication-form').executeWith('{ ExaminationID: ExaminationID }');
            }
            add('examination.indicator-form').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasIndicatorForm');
            if (ZillionRis.ImageViewer().getCapabilities().ImplementsAddImagesCommand) {
                add('examination.add-image').executeWith('ExaminationID').showWhen('StatusID == "completed" || StatusID == "authorised" || StatusID == "billed"');
            }
            add('patient-search.view-images').executeWith('{ ExaminationID: ExaminationID }').showWhen('StatusID == "completed" || StatusID == "authorised" || StatusID == "billed"');
            add('examination.create-addendum').executeWith('{ AccessionNumbers: [AccessionNumber] }').showWhen('HasReport').hideWhen(function (examination) { return examination.HousekeepingID || examination.StatusID === "cancelled" || examination.AddendumDictationStatuses.qAny('$item != "FIN"'); });
            if (window.pageConfig.CancelAddendumEnabled) {
                add('examination.cancel-addendum').executeWith('{ AccessionNumbers: [AccessionNumber] }').showWhen(function (examination) { return examination.AddendumDictationStatuses.qAny('$item != "FIN"'); });
            }
            add('order.show-order-appointment').executeWith('{ name: "OrderAppointment", orderID: OrderID }').showWhen('StatusID == "scheduled"').hideWhen('window.pageConfig.EditableAppointmentLetter === false');
            add('order.print-confirmation-letter').executeWith('{ OrderID: OrderID }').showWhen('StatusID == "scheduled"').hideWhen('window.pageConfig.EditableAppointmentLetter === true');
            if (window.permissions.hasDiscussionListPermission) {
                add('examination.move-to-discussion').executeWith('{ ExaminationID: ExaminationID }').hideWhen('StatusID == "cancelled" || StatusID === "waiting"');
            }
            if (window.permissions.hasFailsafePermission) {
                add('examination.send-to-failsafe').executeWith('{ ExaminationID: ExaminationID }')
                    .hideWhen('["cancelled", "invalid", "waiting", "held", "approved", "scheduled", "indepartment", "inprogress"].indexOf(StatusID) > -1 || HasUnhandledFailsafe');
                add('examination.cancel-failsafe').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasUnhandledFailsafe');
            }

            add('examination.change-intended-radiologist').executeWith('{ ExaminationID: ExaminationID }').showWhen('window.pageConfig.ChangeIntendedRadiologistEnabled && StatusID !== "authorised" && StatusID !== "billed"');
            if (window.pageConfig.showPatientHistoryChangeAssignments && window.pageConfig.PermissionToChangeAssignments) {
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

            if (window.pageConfig.showPatientHistoryViewQAForms) {
                add('examination.view-qandaforms').executeWith('{ ExaminationID: ExaminationID }');
            }
            add('examination.correct-administration-errors').executeWith('{ ExaminationID: ExaminationID, OrderID: OrderID, Patient: PatientName}').showWhen('StatusID == "billed" && window.pageConfig.CorrectAdministrationErrorsCommand == true');

            add('examination.cancel-appointment-and-hold-order').executeWith('{ OrderID: OrderID }').showWhen('StatusID === "scheduled" && window.pageConfig.AllowToHoldScheduledExams');

            add('order.view-audit-trail').executeWith('{ Source: "urn:order:" + OrderID }').showWhen('window.pageConfig.PermissionToViewAuditTrails');
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

        function getLocationHash() {
            return window.location.hash.substring(1);
        }

        var patientSearchGridOptions = {
            keyField: 'ID',
            dataView: new ZillionParts.Data.DataSet(),
            selection: new ZillionParts.Data.DataSelection(),
            commandResources: commandResources,
            showFilterRow: true,
            columnDefaults: {
                allowFilter: true,
                allowSort: true,
                allowResize: true
            },
            columns: [
                { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: patientContextMenu, manager: commandManager, resources: commandResources} },
                { title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 300 },
                { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber' },
                { title: locfmt('{ris,FieldPatientDateOfBirth}'), fieldID: 'DateOfBirth', dataType: 'date-of-birth' },
                { title: locfmt('{ris,FieldPatientGender}'), fieldID: 'Gender' },
                { title: locfmt('{ris,FieldAddress}'), fieldID: 'Address', width: 400 }
            ],
            sort: [
                { "fieldID": "PatientNameFilter", asc: true },
                { "fieldID": "PatientNumber", asc: true }
            ]
        };

        patientSearchGridOptions.dataView.onUpdated.subscribe(function () {
            $('#PatientSearchGrid').virtualDataGrid('refresh');

            loadPatientInformation(getPatientSearchFocusedKey());
        });

        var patientHistoryColumns = [];
        populatePatientHistoryColumns();

        function populatePatientHistoryColumns() {
            patientHistoryColumns.push({ title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: historyContextMenu, manager: commandManager, resources: HcommandResources } });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: historyActions, manager: commandManager, resources: HcommandResources }, width: 112 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber', width: 80 });
            if (window.pageConfig.showPatientHistoryGridColumnExternalOrderNumber) {
                patientHistoryColumns.push({ title: locfmt('{ris,FieldExternalOrderNumber}'), fieldID: 'ExternalOrderNumber', width: 140 });
                patientHistoryColumns.push({ title: locfmt('{ris,FieldExternalExamNumber}'), fieldID: 'ExternalExamNumber', width: 140 });
            }
            if (window.pageConfig.showPatientHistoryGridColumnImported) patientHistoryColumns.push({ title: locfmt('{ris,FieldImportedOrder}'), fieldID: 'IsImportedOrder', dataType: 'imported-order-type', width: 70 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 200 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName', width: 80 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technicians', dataType: 'contact', contactID: 'TechnicianPersonIDs', width: 100 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists', dataType: 'contact', contactID: 'RadiologistIDs', width: 100 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ReferringPhysicianName', dataType: 'contact', contactID: 'ReferringPhysicianID', width: 160 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 80 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName', width: 80 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldCancellationReasons}'), fieldID: 'CancellationReason', dataType: 'tooltip', width: 80 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldIntendedReporter}'), fieldID: 'IntendedRadiologist' });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldAuthoriser}'), fieldID: 'Authoriser', width: 100 });
            patientHistoryColumns.push({ title: locfmt('{ris,FieldRoom}'), fieldID: 'RoomName', width: 120 });
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
            columns: patientHistoryColumns,
            sort: [
                { "fieldID": "StartDateTime", asc: false },
                { "fieldID": "AccessionNumber", asc: false }
            ],
            itemdblclick: function (e, args) {
                if (window.permissions.hasEditOrderPermission) {
                    ZillionRis.CommandManager.execute('order.edit-order', { OrderID: args.item.OrderID });
                }
            }
        };
        
        var patientSearchSelectionChanged = ZillionParts.Delay(onPatientSearchSelectionChanged, 100);
        patientSearchGridOptions.selection.onChange.subscribe(patientSearchSelectionChanged);
        patientSearchGridOptions.selection.setMultiSelect(false);

        patientHistoryGridOptions.selection.setMultiSelect(false);

        $('#PatientSearchGrid').virtualDataGrid(patientSearchGridOptions);
        $('#PatientHistoryGrid').virtualDataGrid(patientHistoryGridOptions);

        ZillionRis.WorkList.SelectionStore('#PatientSearchGrid', patientSearchGridOptions, 'patientsearch.patients.selection');
        ZillionRis.WorkList.SelectionStore('#PatientHistoryGrid', patientHistoryGridOptions, 'patientsearch.history.selection');

        $('#PatientHistoryGrid').virtualDataGrid('onSettingsChanged').subscribe(ZillionParts.Delay(saveWorkListUserSettings, 2000));

        loadWorkListUserSettings();

        ZillionParts.GridView.Behaviors.AutoSelectSingleRow(
        {
            dataView: patientSearchGridOptions.dataView,
            selection: patientSearchGridOptions.selection,
            gridView: '#PatientSearchGrid'
        });
        ZillionParts.GridView.Behaviors.AutoSelectSingleRow(
        {
            dataView: patientHistoryGridOptions.dataView,
            selection: patientHistoryGridOptions.selection,
            gridView: '#PatientHistoryGrid'
        });

        $('#PatientSearchGrid').loadingOverlay({ message: locfmt('{ris,PatientSearchGrid_LoadingOverlay}', { br: '<br/>' }) });
        $('#PatientHistoryGrid').loadingOverlay({ message: locfmt('{ris,PatientHistoryGrid_LoadingOverlay}', { br: '<br/>' }) });

        $('#HistoryContextMenu').menu().hide();

        $('#CreatePatient').click(function () {
            ZillionRis.Navigate({ page: 'frmPatients.aspx', hint: locfmt('{ris,PatientDetails_LoadingOverlay}') });
        });
        $('#CreateOrder').click(function () {
            ZillionRis.Navigate({ page: 'EditOrder.aspx?patientID=' + getPatientSearchFocusedKey(), hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
        });
        $('#ImportOrder').click(function () {
            ZillionRis.Navigate({ page: 'EditOrder.aspx?patientID=' + getPatientSearchFocusedKey() + '&IsImportedOrder=true', hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
        });
        $('#AbortButton').click(function () {
            ZillionRis.GoBackToPreviousPage();
        });

        createHistoryContextMenu();

        createPatientContextMenu();

        $(window).on('hashchange', function () {
            patientSearch(getLocationHash());
        });
        $(window).trigger('hashchange');

        ko.applyBindings(new PatientSearchViewModel(), $('#PatientSearchPage')[0]);

        function PatientSearchViewModel() {
            this.changeSearch = function (type) {
                var s = getLocationHash().split(';');

                window.location.href = ZillionRis.PageUrl('patient/search#' + type + ';' + s[1]);
            };

            this.createOrderEnabled = ko.observable(window.pageConfig.CreateOrderEnabled);
            this.importOrderEnabled = ko.observable(window.pageConfig.ImportOrderEnabled);

            this.patientGrid = new PatientGridViewModel();
            this.historyGrid = new HistoryGridViewModel();
        }

        function PatientGridViewModel() {
            var self = this;
            this.title = new ko.observable();
            this.gridOptions = patientSearchGridOptions;
            this.dataView = patientSearchGridOptions.dataView;
            self.dataView.onUpdated.subscribe(function (e, data) {
                self.title(locfmt('{ris,PatientsFound_Title}') + '(' + self.dataView.getItems(false).length + '/' + self.dataView.getItems(true).length + ')');
            });
            this.createDummyPatient = function () {
                commandManager.execute('patient.create-dummy-patient', {}).then(function (p) {
                    ZillionRis.Patients.Search('auto', p.PatientNumber);
                });
            };

            this.patientButtonsVisible = ko.observable(window.pageConfig.PatientButtonsVisible);
            return self;
        }

        function HistoryGridViewModel() {
            var self = this;
            this.title = new ko.observable();
            this.gridOptions = patientHistoryGridOptions;
            this.dataView = patientHistoryGridOptions.dataView;
            self.dataView.onUpdated.subscribe(function (e, data) {
                self.title(locfmt('{ris,ExaminationsOverview_Title}') + ' (' + self.dataView.getItems(false).length + '/' + self.dataView.getItems(true).length + ')');
            });

            return self;
        }

        function loadWorkListUserSettings() {
            ZillionRis.UserSettings.get('patient-search', 'history-grid').then(function (data) {
                if (data) {
                    $('#PatientHistoryGrid').virtualDataGrid({ sort: data.sort, userColumns: data.columns });
                    $('#PatientHistoryGrid').virtualDataGrid('refresh');
                }
            });
        }

        function saveWorkListUserSettings(e, userOptions) {
            ris.notify.showInformation(null, 'History grid settings saved.', 1000);
            ZillionRis.UserSettings.set('patient-search', 'history-grid', userOptions);
        }

        function clearWorkListUserSettings() {
            ZillionRis.UserSettings.set('dictation', 'worklist', null);

            $('#PatientHistoryGrid').virtualDataGrid({ sort: patientHistoryGridOptions.sort, userColumns: [] });
            $('#PatientHistoryGrid').virtualDataGrid('refresh');
        }

        function editWorkListUserSettings() {
            $('#PatientHistoryGrid').customizeVirtualDataGrid();
        }

        function loadPatientInformation(patientID) {
            if (patientID != lastPatientID) {
                refreshPatientInformation(patientID);
            }
        }

        function refreshPatientInformation(patientID) {
            var patient = patientSearchGridOptions.dataView.getItemByKey(patientID);
            if (patient) {
                loadPatientHistory(patient);
                loadPatientDetails(patientID);

                lastPatientID = patientID;
            } else {
                loadPatientHistory(null);
                clearPatientDetails();

                lastPatientID = null;
            }
        }
    
        function refresh() {

           $('#PatientSearchGrid').loadingOverlay('show');
            var search;
            var parts = getLocationHash().split(';');
            if (parts.length == 1) {
                search = { mode: 'auto', text: decodeURIComponent(parts[0]) };
            } else {
                search = { mode: parts[0], text: decodeURIComponent(parts[1]) };
            }
            
            patientSearchAjax.ajax({
                url: ZillionRis.ApiUrl('data/patient/search'),
                type: 'post',
                data: JSON.stringify(search),
                dataType: 'json'
            }, function (data) {
                if (!throwDataRequestError(data)) {
                    try {
                        Loading.Hide();
                        patientSearchGridOptions.dataView.setItems(data, 'ID');
                        patientSearchGridOptions.dataView.refresh();
                    } catch (ex) {
                    }
                }
            }, function () {
            }, function () {
                $('#PatientSearchGrid').loadingOverlay('hide');
            });
        }


        function createPatientContextMenu() {
            var header = $('#PatientPanel').find('.ui-group-panel-header');
            $('<input type="button" id="PatientsFoundGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
                .configurationMenu({
                    align: 'right',
                    items: [
                        { text: locfmt('{ris,ContextMenu_Refresh}'), id: 'refresh', iconClass: 'zillion-ris app-icon refresh' },
                        { text: locfmt('{ris,ContextMenu_ConfigureColumns}'), id: 'configure', iconClass: 'zillion-ris app-icon customize-table' },
                        { text: locfmt('{ris,ContextMenu_DefaultSettings}'), id: 'reset', iconClass: 'ui-icon ui-icon-refresh' }
                    ],
                    onSelect: function (item) {
                        if (item.id == 'refresh') {
                            refresh();
                        } else if (item.id == 'configure') {
                            $('#PatientSearchGrid').customizeVirtualDataGrid();
                        } else if (item.id == 'reset') {
                            $('#PatientSearchGrid').virtualDataGrid({ sort: patientSearchGridOptions.sort, userColumns: [] });
                            $('#PatientSearchGrid').virtualDataGrid('refresh');
                        }
                    }
                })
                .appendTo(header);
        }

        function createHistoryContextMenu() {
            var header = $('#HistoryPanel').find('.ui-group-panel-header');
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
                            refreshPatientInformation(getPatientSearchFocusedKey());
                        } else if (item.id == 'configure') {
                            editWorkListUserSettings();
                        } else if (item.id == 'reset') {
                            clearWorkListUserSettings();
                        }
                    }
                })
                .appendTo(header);
            }
        
        function patientSearch(type, text) {
            var $grid = $('#PatientSearchGrid'),
                $historyGrid = $('#PatientHistoryGrid'),
                dataView = patientSearchGridOptions.dataView;

            $grid.virtualDataGrid('clearFilter');
            $historyGrid.virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            dataView.setFilter({});

            var search;
            if (typeof text === 'undefined') {
                var parts = type.split(';');
                if (parts.length == 1) {
                    search = { mode: 'auto', text: decodeURIComponent(parts[0]) };
                } else {
                    search = { mode: parts[0], text: decodeURIComponent(parts[1]) };
                }
            } else {
                search = { mode: type, text: text };
            }

            dataView.setItems([], 'ID');
            dataView.refresh();
            patientHistoryGridOptions.dataView.setItems([], 'ExaminationID');
            patientHistoryGridOptions.dataView.refresh();

            if (search.mode && search.text) {
                $grid.loadingOverlay('show');
                patientSearchAjax.ajax({
                    url: ZillionRis.ApiUrl('data/patient/search'),
                    type: 'post',
                    data: JSON.stringify(search),
                    dataType: 'json'
                }, function (data) {
                    if (!throwDataRequestError(data)) {
                        try {
                            Loading.Hide();
                            dataView.setItems(data, 'ID');
                            dataView.refresh();
                        } catch (ex) {
                        }
                    }
                }, function () {
                }, function () {
                    $grid.loadingOverlay('hide');
                });
            } else {
                $('#PatientSearchInput').select();
            }
        }

        var historyCheck = 0;
        function loadPatientHistory(patient) {
            var c = ++historyCheck;
            var $grid = $('#PatientHistoryGrid'),
            patienthistorydataView = patientHistoryGridOptions.dataView;

            if (patient) {
                $grid.loadingOverlay('show');

                Modules.ContentProvider('module://workflow/data/examinations', 'query',
                    {
                        Source: 'urn:patient:' + patient.ID,
                        ShowSpeechStateRadiologist: true
                    })
                    .then(function (data) {
                        if (c === historyCheck) {
                            $.each(data, function (x, e) {
                                e.Patient = patient;
                            });

                            patienthistorydataView.setItems(data, 'ExaminationID');
                            patienthistorydataView.refresh();

                            var searchParameters = getLocationHash().split(';');
                            if (searchParameters.length > 1) {
                                var items = patienthistorydataView.getItems();
                                var possibleAccessionNumber = searchParameters[1];
                                for (var i = 0; i < items.length; i++) {
                                    if (items[i].AccessionNumber == possibleAccessionNumber) {
                                        patientHistoryGridOptions.selection.add(items[i].ExaminationID);
                                        break;
                                    }
                                }
                            }

                            $grid.virtualDataGrid('refresh');
                            $grid.virtualDataGrid('focusFirstSelection');
                        }
                    }, function (data) {
                        patienthistorydataView.setItems([], 'ExaminationID');
                        patienthistorydataView.refresh();
                        $grid.virtualDataGrid('refresh');

                        ris.notify.showError('Patient History Error', locfmt('{ris,PatientSearch_ErrorLoadingPatientHistory}<br/><br/>' + data.message));
                    }).always(function () {
                        if (c === historyCheck) {
                            $grid.loadingOverlay('hide');
                        }
                    });
            }
        }

        function clearPatientDetails() {
            ZillionRis.LoadPatientBanner(0);
        }

        function loadPatientDetails(patientID) {
            ZillionRis.LoadPatientBanner(patientID);
        }

        var lastPatientID = null;
        var delayPatientSearchSelectionChanged = null;

        function onPatientSearchSelectionChanged() {
            if (delayPatientSearchSelectionChanged !== null) {
                clearTimeout(delayPatientSearchSelectionChanged);
            }
            delayPatientSearchSelectionChanged = setTimeout(onPatientSearchSelectionChangedCore, 100);
            TryLock();
            $('#CreateOrder').attr({ disabled: !getPatientSearchFocusedKey(), title: locfmt('{ris,ltNewOrder}') });
            $('#ImportOrder').attr({ disabled: !getPatientSearchFocusedKey(), title: locfmt('{ris,ltImportOrder}') });
        }

        function onPatientSearchSelectionChangedCore() {
            if (delayPatientSearchSelectionChanged !== null) {
                clearTimeout(delayPatientSearchSelectionChanged);
                delayPatientSearchSelectionChanged = null;
            }

            var patientId = getPatientSearchFocusedKey();
            if (openedViewer === true && openedViewerForPatientId !== patientId) {
                ZillionRis.ImageViewer().clear();
                openedViewer = false;
                openedViewerForPatientId = null;
            }

            loadPatientInformation(patientId);
        }

        function getPatientSearchFocusedKey() {
            var options = patientSearchGridOptions,
                selection = options.selection,
                keys = selection.getKeys();

            if (keys.length == 1) {
                return keys[0];
            } else {
                return null;
            }
        }

        function TryLock() {
            var keys = patientSearchGridOptions.selection.getKeys();
            if (keys.length == 1) {
                requestLock(getPatientSearchFocusedKey()).then(function () {
                    releaseLock();
                   return false;
               }, function (x) {
                   $('#CreateOrder').attr({ disabled: true, title: x.reason });
                   $('#ImportOrder').attr({ disabled: true, title: x.reason });
                });
            } else {
                return null;
            }
        }


        var globalExaminationLock, lockChanged = new ZillionParts.Event();

        function requestLock(patientID) {
            if (!globalExaminationLock) {
                globalExaminationLock = LockResource(locfmt('{ris,LockingPatient}'), ['urn:patient:' + patientID], locfmt('{ris,OrderBooking_ExaminationLockedByUser}', { user: window['currentUserName'] }), 2)
                .always(function () {
                    lockChanged.notify();
                });
                return globalExaminationLock;
            } else if (!globalExaminationLock.locked) {
                var ip = false;
                globalExaminationLock.always(function () {
                    ip = true;
                });

                if (ip) {
                    if (globalExaminationLock.locked == false) {

                        globalExaminationLock = LockResource(locfmt('{ris,LockingPatient}'), ['urn:patient:' + patientID], locfmt('{ris,OrderBooking_ExaminationLockedByUser}', { user: window['currentUserName'] }), 2)
                        .always(function () {
                            lockChanged.notify();
                        });
                    }
                }
            }

            return globalExaminationLock;
        }

        function releaseLock() {
            if (globalExaminationLock && globalExaminationLock.locked) {
                globalExaminationLock.release();
            }
        }

        function getPatientHistoryFocusedKey() {
            var options = patientHistoryGridOptions,
                selection = options.selection,
                keys = selection.getKeys();

            if (keys.length == 1) {
                return keys[0];
            } else {
                return null;
            }
        }

        ZillionRis.SiteEvents.subscribe('lazy-page-update', function () {
            refreshPatientInformation(getPatientSearchFocusedKey());
        });

        ZillionRis.SiteEvents.subscribe('lazy-patient-update', function () {
            patientSearch(getLocationHash());
        });

        function statusChangeCallback(s, e) {
            if (e.errorMessage && e.errorMessage != '') {
                alert(e.errorMessage);
            } else {
                patientSearch(getLocationHash());
                onPatientSearchSelectionChangedCore();
            }
        }
    });
})(jQuery);
