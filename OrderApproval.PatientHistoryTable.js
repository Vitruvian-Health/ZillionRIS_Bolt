(function ($, window, undefined) {
    $(function () {
        var commandManager = OrderApproval.CommandManager;
        var commandResources = OrderApproval.CommandResources;

        var patientHistoryViewModel = new PatientHistoryViewModel();

        function createPatientHistoryController() {
            var patientHistoryActions = new ZillionParts.CommandList();
            with (patientHistoryActions) {
                add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForm }');
                add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
                add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'id',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', commands: { manager: commandManager, resources: commandResources, list: patientHistoryActions }, dataType: 'commands', width: 140 },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 200, minWidth: 100 },
                { title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technicians', width: 100, dataType: 'contact', contactID: 'TechnicianIDs' },
                { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists', width: 100, dataType: 'contact', contactID: 'RadiologistIDs' },
                { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ReferringPhysicianName', width: 160, dataType: 'contact', contactID: 'ReferringPhysicianID' },
                { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' },
                { title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber', width: 80 },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName', width: 80 },
                { title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 80 },
                { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName', width: 80 }
            ],
                sort: [
                { "fieldID": "ScheduleDateTime", asc: true }
            ],
                gridOptions: {
                    onRowCreated: onRowCreated,
                    createEmptyDataItem: createEmptyDataItem
                }
            });

            function onRowCreated(item, data) {
                if (data.ExaminationID == window['examinationID']) {
                    item.css({ fontWeight: 'bold' });
                }
            }

            var aa = gridController.create();

            function createEmptyDataItem() {
                var examinations = aa.dataView.getItems(true).length;
                if (examinations > 0) {
                    var foo = $('<span>' + locfmt('{ris,NoExaminationsFoundFilter}') + '<br />' + examinations + locfmt('{ris,ExaminationsInTotal}') + '<br /><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                    $('a', foo).click(function () {
                        patientHistoryViewModel.clearFilter();
                    });
                    return foo;
                } else {
                    return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                }
            }

            return aa;
        }

        patientHistoryViewModel.gridOptions.selection.setMultiSelect(false);

        $('#PatientHistoryPanel').groupPanel({ commands: $('#HistoryButtons') });
        patientHistoryViewModel.grid = $('#PatientHistoryView');

        ko.applyBindings(patientHistoryViewModel, $('#PatientHistoryContainer')[0]);

        patientHistoryViewModel.gridSettingsStore.initialize('#PatientHistoryView', patientHistoryViewModel.gridOptions, 'patientHistory', 'patientHistory-worklist').loadSettings();

        createPatientHistoryContextMenu();

        window.loadPatientHistory = loadPatient;

        var historyCheck = 0;
        function loadPatient(patientID) {
            if (patientHistoryViewModel.patientId === patientID) {
                return;
            }

            var dataView = patientHistoryViewModel.gridOptions.dataView;
            dataView.setItems([], 'ExaminationID');
            dataView.refresh();

            // If there is no order selected, don't try to load patient history
            if (patientID == 0)
                return;

            patientHistoryViewModel.patientId = patientID;
            patientHistoryViewModel.isLoading(true);

            var c = ++historyCheck;
            var excludeCancelled = true;
            if (window.pageConfig) {
                excludeCancelled = window.pageConfig.ExcludeCancelledInHistory;
            }
            Modules.ContentProvider('module://workflow/data/examinations', 'query', { Source: 'urn:patient:' + patientID, ExcludeCancelled: excludeCancelled })
            .then(function (data) {
                if (c === historyCheck) {
                    dataView.setItems(data, 'ExaminationID');
                    dataView.refresh();
                }
            }, function (data) {
                ris.notify.showError('Patient History Error', 'An error occurred while retrieving patient history.<br/><br/>Details:<br/>' + data);
            }).always(function () {
                if (c === historyCheck) {
                    patientHistoryViewModel.isLoading(false);
                }
            });
        }

        $(function () {
            $('#PatientHistoryPanel').groupPanel({ commands: $('#HistoryButtons') });
        });

        function createPatientHistoryContextMenu() {
            var configurationMenu = $('<input type="button" id="PatientHistoryGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                        loadPatient(getSelectedPatientID());
                    } else if (item.id == 'clear-filter') {
                        patientHistoryViewModel.clearFilter();
                    } else if (item.id == 'configure') {
                        patientHistoryViewModel.customizeView();
                    } else if (item.id == 'reset') {
                        patientHistoryViewModel.resetSettings();
                        patientHistoryViewModel.reset();
                    }
                }
            });
            var find = $('#PatientHistoryPanel').groupPanel('widget').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        patientHistoryViewModel.gridOptions.dataView.onUpdated.subscribe(function (e, data) {
            var foo = locfmt('{ris,ExaminationsOverview_Title}') + ' (' + patientHistoryViewModel.gridOptions.dataView.getItems(false).length + '/' + patientHistoryViewModel.gridOptions.dataView.getItems(true).length + ')';

            var foo2 = $('<span></span>');
            foo2.append('<span>' + foo + '</span>');
            $('#PatientHistoryPanel').groupPanel({ title: foo2 });
        });

        function PatientHistoryViewModel() {
            var self = this;
            this.gridOptions = createPatientHistoryController();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.selectedItem = new ko.observable(null);
            this.isLoading = new ko.observable(false);
            this.patientId = null;

            this.enableViewButton = ko.computed(function () {
                var item = self.selectedItem();
                if (item) {
                    var itemHasCorrectStatus = item.StatusID === "completed" || item.StatusID === "transcribed" || item.StatusID === "authorised" || item.StatusID === "billed" || item.StatusID === "verified";
                    return itemHasCorrectStatus;
                } else {
                    return false;
                }
            });

            this.viewImages = function () {
                commandManager.execute('examination.view-images', self.selectedItem().ExaminationID);
                window.viewerOpened = true;
                window.viewerOpenedForPatientId = self.patientId;
            };

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
            };
            this.refresh = function () {
                loadPatient(getSelectedPatientID());
            };
            this.customizeView = function () {
                $('#PatientHistoryView').customizeVirtualDataGrid();
            };

            this.resetSettings = function () {
                ZillionRis.UserSettings.set('patienthistory', 'settings', null);
            };

            this.customizeFilter = function () {
                $('#PatientHistoryView').pageSubNav('show');
            };

            this.clearFilter = function () {
                $('#PatientHistoryView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            };

            this.viewLastAccessedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };
        }
    });
})(jQuery, window);