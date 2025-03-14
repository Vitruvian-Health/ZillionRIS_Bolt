(function ($, window, undefined) {
    function executeCommand(cmd, arg) {
        doPagePostBack(cmd + ';' + arg);
    }

    window.ValidateForm = function() {
        return $('.validation-error').length === 0;
    };

    function getReadonlyVM() {
        var withoutHIS = $('#HiddenWithoutHIS').val();
        var shouldBeReadonly = withoutHIS && withoutHIS != "true";

        this.shouldBeReadonlyObservable = new ko.observable(shouldBeReadonly);
        this.lastNameValue = new ko.observable($('[name=lblLastName]').val());
        this.birthDateValue = new ko.observable($('[name=deBirthDate]').val());
    }

    function getTabsVM() {
        var self = this;
        this.selectedTab = ko.observable(null);
        this.changeTab = function (tabId) {
            var tabs = [
                '#PatientTabs',
                '#AdmissionHistoryTab',
                '#NextOfKinTabPanel'
            ];

            tabs.qEach(function (x) { $(x).hide(); });

            $('#' + tabId).show();
            self.selectedTab(tabId);
        };
        this.readOnlyVM = new getReadonlyVM();

        return self;
    }

    /// -------------- Grid ---------------- ///

    var historyCheck = 0;

    $(function () {
        $('#Content').addClass('content-maximized');

        setTimeout(function () { $('#PatientTabs input:tabbable:first').focus(); }, 0);

        var datepickerOptions = { changeMonth: true, changeYear: true, yearRange: '1900:+00', showButtonPanel: true, showWeek: true, showOtherMonths: true, selectOtherMonths: true };
        
        $('[name=deBirthDate]').datepicker(datepickerOptions);
        $('[name=nok_DateOfBirth]').datepicker(datepickerOptions);

        var editPatientViewModel = {
            referringPhysicianSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/physicians', function (x) { return { ReferralTypeID: 3 || null, Search: x }; }, '{ PhysicianID: $data }', { showCode: true }),
            referringPhysician: new ko.observable(null)
        };

        editPatientViewModel.referringPhysician.subscribe(function (id) {
            executeCommand('patients.gp-changed', id);
        });

        var tabsVM = new getTabsVM();
        tabsVM.changeTab('PatientTabs');
        tabsVM.readOnlyVM.editPatientViewModel = editPatientViewModel;

        var commandManager = new ZillionParts.CommandManager();
        var commandResources = new ZillionParts.CommandResources();

        // Register Commands.
        commandManager.assign(ZillionRis.Commands.Application);
        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);
        commandManager.assign(ZillionRis.Commands.Discussions);
        commandManager.assign(ZillionRis.Commands.Patients);

        window.showPatientDocuments = function () {
            commandManager.execute('stored-documents.view', { Source: "urn:patientnumber:" + window.currentPatientNumber, Title: "Patient Documents" });
        };

        // Register Resources.
        ZillionRis.Commands.RegisterResources(commandResources);

        function createController() {

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'AdmissionEventID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                        { title: locfmt('{ris,PatientAdmissionHistory_AdmissionStatusHeader}'), fieldID: 'AdmissionStatus' },
                        { title: locfmt('{ris,PatientAdmissionHistory_PatientClassHeader}'), fieldID: 'PatientClass', width: 110 },
                        { title: locfmt('{ris,PatientAdmissionHistory_PointOfCareHeader}'), fieldID: 'PointOfCare', width: 110 },
                        { title: locfmt('{ris,PatientAdmissionHistory_RoomHeader}'), fieldID: 'Room', width: 60 },
                        { title: locfmt('{ris,PatientAdmissionHistory_BedHeader}'), fieldID: 'Bed', width: 50 },
                        { title: locfmt('{ris,PatientAdmissionHistory_AttendingDoctorHeader}'), fieldID: 'AttendingDoctor', width: 145 },
                        { title: locfmt('{ris,PatientAdmissionHistory_AdmittingDoctorHeader}'), fieldID: 'AdmittingDoctor', width: 145 },
                        { title: locfmt('{ris,PatientAdmissionHistory_MessageCreationDateHeader}'), fieldID: 'MessageCreationDate', dataType: 'scheduled-date', width: 160 },
                        { title: locfmt('{ris,PatientAdmissionHistory_AdmissionDateHeader}'), fieldID: 'AdmissionDate', dataType: 'scheduled-date' },
                        { title: locfmt('{ris,PatientAdmissionHistory_DischargeDateHeader}'), fieldID: 'DischargeDate', dataType: 'scheduled-date' },
                        { title: locfmt('{ris,PatientAdmissionHistory_ExpectedDischargeDateHeader}'), fieldID: 'ExpectedDischargeDate', dataType: 'scheduled-date', width: 175 },
                        { title: locfmt('{ris,PatientAdmissionHistory_VisitNumberHeader}'), fieldID: 'VisitNumber' }
                    ],
                sort: [
                        { "fieldID": "MessageCreationDate", asc: true }
                    ]
            });

            return gridController.create();
        }

        var gridOptions = createController();
        var dataView = gridOptions.dataView;
        var selection = gridOptions.selection;

        var refreshTimer = new ris.intervalTimer({ delay: 10 * 60000, onTick: refresh });
        refreshTimer.start();

        selection.setMultiSelect(false);

        var admissionHistoryViewModel = new AdmissionHistoryViewModel();

        $('#AdmissionHistoryPanel').groupPanel();

        admissionHistoryViewModel.grid = $('#AdmissionHistoryGridView');
        admissionHistoryViewModel.gridOptions = gridOptions;

        // Data bind.
        tabsVM.admissionHistoryViewModel = admissionHistoryViewModel;
        ko.applyBindings(tabsVM, $('#TabsControlDiv')[0]);

        ZillionRis.WorkList.SelectionStore('#AdmissionHistoryGridView', admissionHistoryViewModel.gridOptions, 'admissionhistory.selection');

        admissionHistoryViewModel.gridSettingsStore.initialize('#AdmissionHistoryGridView', admissionHistoryViewModel.gridOptions, 'admissionhistory', 'admissionhistory-worklist').loadSettings();

        ZillionParts.GridView.Behaviors.AutoSelectSingleRow({
            dataView: dataView,
            selection: selection,
            gridView: '#AdmissionHistoryGridView'
        });

        $(window).resize(layout).resize();

        admissionHistoryViewModel.refresh();

        function layout() {
            var foo = parseInt(($(window).height() - $('#DocumentHeader').height() - 140) / 2) - 50;
            $('#AdmissionHistoryPanel .ui-group-panel-content').height(foo);
            $('#AdmissionHistoryGridView').height(foo);
            $('#AdmissionHistoryGridView').virtualDataGrid('refresh');
        }

        function AdmissionHistoryViewModel() {
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

            this.refresh = function () {
                refresh();
            };

            this.reset = function () {
                //this.clearFilter();
                this.gridSettingsStore.resetSettings();
            };

        }

        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);

        function refresh() {
            refreshTimer.reset();

            var patientID = $('#HiddenPatientId').val();
            if (!patientID)
                return;

            admissionHistoryViewModel.isLoading(true);

            var c = ++historyCheck;
            Modules.ContentProvider('module://workflow/data/admissionhistory', 'query', { Source: 'urn:patient:' + patientID })
                    .then(function (data) {
                        if (c === historyCheck) {
                            if (data != null && data['error']) {
                                throw Error(data['message']);
                            }
                            else if (data != null) {
                                admissionHistoryViewModel.gridOptions.dataView.setItems(data, 'AdmissionEventID');
                                admissionHistoryViewModel.gridOptions.dataView.refresh();
                            }
                        }
                    }, function (data) {
                        ris.notify.showError('Admission History Error', 'An error occurred while retrieving admission history.<br/><br/>Details:<br/>' + data);
                    })
                    .always(function () {
                        if (c === historyCheck) {
                            admissionHistoryViewModel.isLoading(false);
                        }
                    });
        }
    });

})(jQuery, window);