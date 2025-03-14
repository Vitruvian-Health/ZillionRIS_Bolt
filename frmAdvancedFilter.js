(function ($) {

    window.fieldsetHeight = 170;

    function getFunctionSpecializationsData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedfilter', 'functionspecializations', {})
            .then(function (data) {
                if (data.length != 0) {
                    vm.functionSpecializations(data.qSelect('{ id: SpecID, name: SpecName, text: SpecName }'));
                }
                else {
                    vm.functionSpecializations([]);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    function getPatientCategoriesData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'patientcategories', {})
            .then(function (data) {
                if (data.length != 0) {
                    vm.patientCategories(data.qSelect('{ id: PatientCategoryID, name: PatientCategoryName, text: PatientCategoryName }'));
                }
                else {
                    vm.patientCategories([]);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    function getModalityTypesData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'modalitytypes', {})
            .then(function (data) {
                if (data.length != 0) {
                    vm.modalityTypes(data.qSelect('{ id: ModalityTypeID, name:  ModalityTypeName, text:  ModalityTypeName }'));
                }
                else {
                    vm.modalityTypes([]);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    function getReportStatusesData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedfilter', 'reportstatuses', {})
            .then(function (data) {
                if (data.length != 0) {
                    vm.reportStatuses(data.qSelect('{ id: RepStatusID, name: RepStatusText, text: RepStatusText }'));
                }
                else {
                    vm.reportStatuses([]);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    function getExamStatusesData(vm) {

        Modules.ContentProvider('module://websitecore/data/advancedfilter', 'examstatuses', {})
            .then(function (data) {
                if (data.length != 0) {
                    vm.examinationStatuses(data.qSelect('{ id: StatusID, name: StatusName, text: StatusName }'));
                }
                else {
                    vm.examinationStatuses([]);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }


    function LocationFilterViewModel() {
        var self = this;

        this.locations = ko.observable([]);
        this.rooms = ko.observable([]);
        this.allRooms = ko.observable([]);
        this.currentLocation = ko.observable(null);
        this.currentRoom = ko.observable(null);
        this.enableRooms = ko.computed(function () {
            return !!self.rooms().length;
        });

        this.disableLocationSelector = ko.observable(true);

        this.resetLocation = function () { this.currentLocation(null); };
        this.resetRoom = function () { this.currentRoom(null); };

        this.currentLocation.subscribe(function (location) {
            if (location) {
                var allRooms = self.allRooms();
                self.rooms(allRooms.qWhere('location === $params', location));

                if (self.currentRoom()) {
                    if (!self.rooms().qAny('id === $params', self.currentRoom().id)) {
                        self.currentRoom(null);
                    }
                }

            } else {
                self.rooms(self.allRooms());
            }
        });

        this.roomProjector = '{ id: id, text: displayName, name: displayName }';
        this.roomsSource = {
            get: function (id) {
                var d = $.Deferred();
                if (self.rooms() && self.rooms().length != 0) {
                    var selectedRoom = self.rooms().qFirst('id === $params', id);
                    self.currentRoom(selectedRoom);
                    if (selectedRoom) {
                        d.resolve({ id: selectedRoom.id, text: selectedRoom.displayName, name: selectedRoom.displayName });
                    }
                    else {
                        d.isResolved(null);
                    }
                } else {
                    self.currentRoom(null);
                    d.resolve(null);
                }
                return d;
            },
            query: function (text) {
                var d = $.Deferred();
                if (self.rooms() && self.rooms().length != 0) {
                    if (text && text != "") {
                        var x = ZillionParts.Data.WildCardToRegex(text);
                        d.resolve(self.rooms().qWhere('$params.test(displayName)', x).qSelect(self.roomProjector));
                    } else {
                        d.resolve(self.rooms().qSelect(self.roomProjector));
                    }
                } else {
                    d.resolve([]);
                }
                return d;
            }
        };
    }



    function viewModel() {
        var self = this;

        this.valueSource = new ko.observable();
        this.valueSourceProxy = {
            get: function (q) {
                return self.valueSource().get(q);
            },
            query: function (q) {
                return self.valueSource().query(q);
            }
        };


        this.selectedValue = ko.observable(null);

        this.availableFilterTypes = ko.observableArray([]);
        this.selectedFilterType = ko.observable(null);

        this.selectedFilterType.subscribe(function (filterType) {

            getValueSource(filterType);
            if (filterType == "Reports") {
                self.dateSelector("authorizationDate");
            } else {
                self.dateSelector("scheduleDate");
            }
            if (filterType == "RadiologistID") {
                getPatientCategoriesData(filterViewModel);
                getModalityTypesData(filterViewModel);
                getReportStatusesData(filterViewModel);
                $(".RadiologistFilter").show();
            } else {
                $(".RadiologistFilter").hide();
            }
        });

        this.selectedValue.subscribe(function (value) {
            if (self.selectedFilterType() == "ExaminationStatusID" && value == "AUT") {
                self.dateSelector("authorizationDate");
            } else {
                self.dateSelector("scheduleDate");
            }
        });

        this.disableSelectValue = ko.computed(function () {
            return !(self.selectedFilterType() && self.selectedFilterType() != 'Reports' && self.selectedFilterType() != 'PatientNumber');
        });

        this.locationSource = new LocationFilterViewModel();

        this.locationSource.currentLocation.subscribe(function () {
            if (self.selectedFilterType() && self.selectedFilterType() == 'RoomID') {

                if (self.selectedValue()) {
                    if (!self.locationSource.rooms().qAny('id === $params', self.selectedValue().id)) {
                        self.selectedValue(null);
                    }
                }
            }
        });

        this.patientNumber = ko.observable(null);
        this.patientNumberSearch = ko.computed(function () {
            return (self.selectedFilterType() && self.selectedFilterType() == 'PatientNumber');
        });
        this.notPatientNumberSearch = ko.computed(function () {
            return self.patientNumberSearch() != true;
        });

        this.requesterSearch = ko.computed(function() {
            return (self.selectedFilterType() && self.selectedFilterType() == 'PhysicianID');
        });

        this.dateFrom = ko.observable(new Date());
        this.dateTo = ko.observable(new Date());
        this.mailboxNumber = ko.observable(null);
        this.dateSelector = new ko.observable("scheduleDate");

        this.functionSpecializations = ko.observableArray([]);
        this.selectedFuncSpec = ko.observable(null);
        this.modalityTypes = ko.observableArray([]);
        this.selectedModalityType = ko.observable(null);
        this.patientCategories = ko.observableArray([]);
        this.selectedPatCat = ko.observable(null);
        this.reportStatuses = ko.observableArray([]);
        this.selectedRepStatus = ko.observable(null);
        this.examinationStatuses = ko.observableArray([]);

        this.examinationStatusSource = {
            get: function (id) {
                var d = $.Deferred();
                if (self.examinationStatuses() && self.examinationStatuses().length != 0) {
                    d.resolve(self.examinationStatuses().qFirst('id === $params', id));
                } else {
                    d.resolve(null);
                }
                return d;
            },
            query: function (text) {
                var d = $.Deferred();
                if (self.examinationStatuses() && self.examinationStatuses().length != 0) {
                    if (text && text != "") {
                        var x = ZillionParts.Data.WildCardToRegex(text);
                        d.resolve(self.examinationStatuses().qWhere('$params.test(text)', x));
                    } else {
                        d.resolve(self.examinationStatuses());
                    }
                } else {
                    d.resolve([]);
                }
                return d;
            }
        };

        return self;
    };

    var filterViewModel = new viewModel();

    function fillFilterTypes() {
        var elements = [];
        elements.push({ id: 'Reports', name: locfmt('{ris,AdvancedFilter_ExaminationReports}') });
        elements.push({ id: 'RoomID', name: locfmt('{ris,AdvancedFilter_Room}') });
        elements.push({ id: 'PhysicianID', name: locfmt('{ris,AdvancedFilter_Requester}') });
        elements.push({ id: 'ExaminationTypeID', name: locfmt('{ris,AdvancedFilter_ExaminationType}') });
        elements.push({ id: 'RadiologistID', name: locfmt('{ris,AdvancedFilter_Radiologist}') });
        elements.push({ id: 'ReferralTypeID', name: locfmt('{ris,AdvancedFilter_ReferralType}') });
        elements.push({ id: 'ExaminationStatusID', name: locfmt('{ris,AdvancedFilter_ExaminationStatus}') });
        elements.push({ id: 'PatientNumber', name: locfmt('{ris,AdvancedFilter_PatientNumber}') });
        elements.push({ id: 'IntendedRadiologistID', name: locfmt('{ris,AdvancedFilter_IntendedRadiologist}') });
        elements = elements.qSelect('{ id: id, name: name, text: name }');
        filterViewModel.availableFilterTypes(elements);
    };

    function getValueSource(filterType) {

        switch (filterType) {
            case "RoomID":
                filterViewModel.valueSource(filterViewModel.locationSource.roomsSource);
                break;

            case "PhysicianID": // Requester
                filterViewModel.valueSource(new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/physicians', function (x) { return { ReferralTypeID: null, Search: x }; }, '{ PhysicianID: $data }', { showAddress: true, showInitials: true, showSpecialisation: true }));
                break;

            case "ExaminationTypeID":
                filterViewModel.valueSource(new ContentProviderSource2('module://workflow/data/examinationtypes', { projector: '{id: ID, text:Code, text:"["+Code+"] "+DisplayName}' }));
                break;

            case "RadiologistID": // Radiologist
                filterViewModel.valueSource(new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { PermissionName: 'Reporter', Search: x }; }, '{ UserID: $data }', { showCode: true }));
                break;

            case "ReferralTypeID":
                filterViewModel.valueSource(new ContentProviderSource2('module://workflow/data/referraltypes', { emptyText: true, projector: '{ id: ID, text: DisplayName }' }));
                break;

            case "ExaminationStatusID":
                filterViewModel.valueSource(filterViewModel.examinationStatusSource);
                break;

            case "IntendedRadiologistID":
                filterViewModel.valueSource(new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { PermissionName: 'Reporter', Search: x }; }, '{ UserID: $data }', { showCode: true }));
                break;

            default:
                break;
        }
        filterViewModel.selectedValue(null);
    };

    function intialize(vm) {
        Rogan.Ris.Locations.ensure();

        // Subscribe to location data changes.
        Rogan.Ris.Locations.onChanged.subscribe(function (e, service) {
            var locations = service.getLocations().map(function (a) { return { id: a.ID, displayName: a.Name, description: a.Description }; });
            var rooms = service.getRooms().map(function (a) { return { id: a.ID, displayName: a.Name, description: a.Description, location: a.LocationID }; });

            vm.locationSource.locations(locations);
            vm.locationSource.allRooms(rooms);
            vm.locationSource.rooms(rooms);
        });

        vm.locationSource.disableLocationSelector(!window.pageConfig.PermissionToChangeLocation);

        getFunctionSpecializationsData(vm);
        getExamStatusesData(vm);
    }


    $(function () {
        fillFilterTypes();

        ko.applyBindings(filterViewModel, $("#CriteriasDiv")[0]);
        intialize(filterViewModel);
    });

    function validateForm() {
        return $('.validation-error').length === 0;
    };

    $.extend(true, window, {
        ValidateForm: validateForm
    });

    $(function () {

        window.fieldsetHeight = $("fieldset").height();

        $.extend(true, window, {
            ExportButton_OnClick: exportButtonOnClick,
            printButton_OnClick: printReport,
            selectAllButton_click: selectAllButtonClick,
            printSelectedReportsButton_Click: printSelectedReportsButton_Click,
            getSelectAllButtonTexts: getSelectAllButtonTexts,
            onSearchClick: onSearchClick
        });

        var selectalltext, deselectalltext;

        function getSelectAllButtonTexts(select, deselect) {
            selectalltext = select;
            deselectalltext = deselect;
        }

        function selectAllButtonClick() {
            var element = document.getElementById("SelectAllButton");
            if (element) {
                if (element.innerText == selectalltext) {
                    // select all
                    for (var i = 0; i < dataView.getItems().length; i++) {
                        var item = dataView.getItemByIdx(i);
                        if (item && item.HasReport) {
                            selection.add(item['ExaminationID']);
                        }
                    }
                    element.innerText = deselectalltext;
                }
                else {
                    // deselect all
                    selection.clear();
                    element.innerText = selectalltext;
                }
            }
        }

        function exportButtonOnClick() {
            ExportTableToExcel($('#AdvancedFilterGridView').virtualDataGrid('exportHtml'), 'Filtering');
            $('#AdvancedFilterGridView').virtualDataGrid('refresh');
        }

        var selectedOrders = [];

        function printSelectedReportsButton_Click() {
            if (selection.getCount() == 0)
                return;

            var keys = selection.getKeys();
            if (keys) {
                for (var i = 0; i < keys.length; i++) {
                    var data = dataView.getItemByKey(keys[i]);
                    if (data && data.HasReport) {
                        selectedOrders.push(data.ord_OrderID);
                    }
                }
            }
            printSelectedReports();
            selectedOrders = [];
        }

        var commandManager = new ZillionParts.CommandManager();
        var commandResources = new ZillionParts.CommandResources();

        // Register Commands.
        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);
        commandManager.assign(ZillionRis.Commands.Application);

        // Register Resources.
        ZillionRis.Commands.RegisterResources(commandResources);

        function createController() {
            var advancedFilterMenu = new ZillionParts.CommandList();
            with (advancedFilterMenu) {
                if (window.permissions.hasDiscussionListPermission) {
                    add('examination.move-to-discussion').executeWith('{ExaminationID: ExaminationID}');
                }

                if (window.pageConfig.PermissionToAutomaticSchedule) {
                    add('order.auto-move-order').executeWith('{ Patient: pat_PatientName, OrderID: ord_OrderID }').showWhen('StatusID === "scheduled" && IntendedReporterOnLeave === true');
                }
                if (window.pageConfig.PermissionToManualSchedule) {
                    add('order.manual-move-order').executeWith('{ Patient: pat_PatientName, OrderID: ord_OrderID }').showWhen('StatusID === "scheduled" && IntendedReporterOnLeave === true');
                }
                if (window.pageConfig.PermissionToViewExaminations) {
                    add('examination.view-images').executeWith('ExaminationID');
                }
            }

            var advancedFilterActions = new ZillionParts.CommandList();
            with (advancedFilterActions) {
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForms }');
                add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
                add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ExaminationID',
                commandManager: commandManager,
                commandResources: commandResources,
                contextMenuList: advancedFilterMenu,
                columns: [
                            { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: advancedFilterActions, manager: commandManager, resources: commandResources} },
                            { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'actsch_StartDateTime', dataType: 'scheduled-date' },
                            { title: locfmt('{ris,FieldRoom}'), fieldID: 'roo_RoomName', width: 100 },
                            { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'pat_PatientNumber', width: 140 },
                            { title: locfmt('{ris,FieldPatientName}'), fieldID: 'pat_PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200 },
                            { title: locfmt('{ris,FieldPatientGender}'), fieldID: 'gen_GenderName', width: 140 },
                            { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 120 },
                            { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', sortFieldID: 'UrgencySortIndex', width: 80 },
                            { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ref_ReferringPhysicianName', width: 140 },
                            { title: locfmt('{ris,RequestingMailbox}'), fieldID: 'ref_RequestingMailbox', dataType: 'yes-no', emphasis: 'no' },
                            { title: locfmt('{ris,SecondCopy}'), fieldID: 'ref_SecondCopyPhysicianName', width: 140 },
                            { title: locfmt('{ris,SecondCopyMailbox}'), fieldID: 'ref_SecondCopyMailbox', dataType: 'yes-no', emphasis: 'no', allowNull: true },
                            { title: locfmt('{ris,FieldRequesterType}'), fieldID: 'reftyp_ReferralTypeName' },
                            { title: locfmt('{ris,FieldIntendedRadiologist}'), fieldID: 'IntendedReportedText' },
                            { title: locfmt('{ris,FieldRadiologistAndAuthor}'), fieldID: 'RadiologistAndAuthorNames' },
                            { title: locfmt('{ris,FieldPatientCategory}'), fieldID: 'PatientCategoryName' },
                            { title: locfmt('{ris,FieldModalityType}'), fieldID: 'ModalityTypeName' },
                            { title: locfmt('{ris,FieldAuthorisationDate}'), fieldID: 'AuthorisationDate', dataType: 'scheduled-date' },
                            { title: locfmt('{ris,FieldPatientDateOfBirth}'), fieldID: 'DateOfBirth', dataType: 'date-of-birth' },
                            { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'ExaminationStatusName' },
                            { title: locfmt('{ris,FieldSpecialty}'), fieldID: 'Specialty' },
                            { title: locfmt('{ris,FieldReportStatus}'), fieldID: 'ReportStatusText' }
                        ],
                sort: [
                            { "fieldID": "actsch_StartDateTime", asc: true }
                        ],
                gridOptions: {
                    //onRowCreated: onItemCreated
                    itemclick: function (e, args) {
                        var item = args.item;
                        if (e.ctrlKey) {
                            selection.add(item['ExaminationID']);
                        }
                        else {
                            selection.clear();
                            selection.add(item['ExaminationID']);
                        }
                    }
                }
            });

            return gridController.create();
        }

        var gridOptions = createController();
        var dataView = gridOptions.dataView;
        var selection = gridOptions.selection;

        var advancedFilterSelectionChanged = ZillionParts.Delay(onAdvancedFilterSelectionChanged, 100);
        selection.onChange.subscribe(advancedFilterSelectionChanged);
        selection.setMultiSelect(true);

        var advancedFilterViewModel = new AdvancedFilterViewModel();

        var element = document.getElementById("PrintReportsButton");
        if (element) {
            $('#PrintReportsButton').button({ disabled: true });
        }

        advancedFilterViewModel.grid = $('#AdvancedFilterGridView');
        advancedFilterViewModel.gridOptions = gridOptions;

        clearPatientDetails();

        // Data bind.
        ko.applyBindings(advancedFilterViewModel, $('#AdvancedFilterGridContainer')[0]);
        ZillionRis.WorkList.SelectionStore('#AdvancedFilterGridView', advancedFilterViewModel.gridOptions, 'advancedfilter.selection');

        advancedFilterViewModel.gridSettingsStore.initialize('#AdvancedFilterGridView', advancedFilterViewModel.gridOptions, 'advancedfilter', 'advancedfilter-worklist').loadSettings();

        createAdvancedFilterContextMenu();

        function AdvancedFilterViewModel() {
            var self = this;
            this.gridOptions = gridOptions;
            this.dataView = gridOptions.dataView;

            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();
            this.title = new ko.observable();
            this.enablePrint = ko.observable(function () { return window.pageConfig.PermissionToPrintReports; });
            this.dataView.onUpdated.subscribe(function () {
                self.title(locfmt('{ris,Filtering_Title}') + ' (' + self.dataView.getItems(false).length + '/' + self.dataView.getItems(true).length + ')');
            });

            this.isLoading = ko.observable(false);

            var onSelectedItemChanged = (function () {
                var previousPatientId = null;
                return function (newValue) {
                    var patientId = newValue && newValue.PatientID;
                    if (patientId !== previousPatientId) {
                        ZillionRis.ImageViewer().clear();
                    }
                    previousPatientId = patientId;
                };
            })();

            this.selectedItem = ko.observable();
            this.selectedItem.subscribe(onSelectedItemChanged);

            this.loadUserSettings = function () {
                this.gridSettingsStore.loadSettings();
            };
            this.resetUserSettings = function () {
                this.gridSettingsStore.resetSettings();
            };
            this.customize = function () {
                $('#AdvancedFilterGridView').customizeVirtualDataGrid();
            };

            this.refresh = function () {
                refresh();
            };

            this.customizeView = function () {
                $('#AdvancedFilterGridView').customizeVirtualDataGrid();
            };

            this.clearFilter = function () {
                $('#AdvancedFilterGridView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            };

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
            };
        }

        function createAdvancedFilterContextMenu() {
            var configurationMenu = $('<input type="button" id="FilterResultsGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"></input>')
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
                            advancedFilterViewModel.refresh();
                        } else if (item.id == 'clear-filter') {
                            advancedFilterViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            advancedFilterViewModel.customizeView();
                        } else if (item.id == 'reset') {
                            advancedFilterViewModel.resetUserSettings();
                            advancedFilterViewModel.reset();
                        }
                    }
                });
            var find = $('#AdvancedFilterGridContainer').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        var delayAdvancedFilterSelectionChanged = null;

        function onAdvancedFilterSelectionChanged() {
            if (delayAdvancedFilterSelectionChanged !== null) {
                clearTimeout(delayAdvancedFilterSelectionChanged);
            }
            delayAdvancedFilterChanged = setTimeout(onAdvancedFilterSelectionChangedCore, 100);
        }

        function onAdvancedFilterSelectionChangedCore() {
            if (delayAdvancedFilterSelectionChanged !== null) {
                clearTimeout(delayAdvancedFilterSelectionChanged);
                delayAdvancedFilterSelectionChanged = null;
            }

            if (selection.getCount() == dataView.getItems().length) {
                element = document.getElementById("SelectAllButton");
                if (element) {
                    element.value = deselectalltext;
                }
            }

            $('#PrintReportsButton').button({ disabled: !selectionHasReports() });

            var key = selection.getKeys().qFirst();
            if (key) {
                var data = dataView.getItemByKey(key);
                if (data) {
                    ZillionRis.LoadPatientBanner(data.PatientID);
                    selectedItem = data;
                }
            } else {
                clearPatientDetails();
            }
        }

        function selectionHasReports() {
            var keys = selection.getKeys();
            if (keys) {
                for (var i = 0; i < keys.length; i++) {
                    var data = dataView.getItemByKey(keys[i]);
                    if (data && data.HasReport) {
                        return true;
                    }
                }
            }

            return false;
        }

        function clearPatientDetails() {
            ZillionRis.LoadPatientBanner(0);
        }

        var _searchValue, _searchType, _searchFromDate, _searchToDate, _functionSpecialisationID, _modalityTypeID, _locationID, _patientCategoryID, _mailboxNumberCheck, _useAuthorisationDate, _reportStatusID;

        function onSearchClick() {
            if (!ValidateForm()) {
                return false;
            }

            _searchValue = filterViewModel.selectedFilterType() == 'PatientNumber' ? filterViewModel.patientNumber() : filterViewModel.selectedValue();
            _searchType = filterViewModel.selectedFilterType();

            if (filterViewModel.dateFrom()) {
                //if user fills in start date, otherwise sends null, which will be handled serverside
                _searchFromDate = moment(filterViewModel.dateFrom()).startOf("day");
            }

            if (filterViewModel.dateTo()) {
                //if user fills in end date
                _searchToDate = moment(filterViewModel.dateTo()).startOf("day").add(1, 'd').subtract(1, 's');
            } else {
                //otherwise sends the end of the day of today
                _searchToDate = moment().startOf("day").add(1, 'd').subtract(1, 's');
            }

            _functionSpecialisationID = filterViewModel.selectedFuncSpec();
            _modalityTypeID = filterViewModel.selectedModalityType();
            _patientCategoryID = filterViewModel.selectedPatCat();
            _reportStatusID = filterViewModel.selectedRepStatus();
            _locationID = filterViewModel.locationSource.currentLocation();
            _mailboxNumberCheck = filterViewModel.mailboxNumber() ? filterViewModel.mailboxNumber() : false;
            _useAuthorisationDate = filterViewModel.dateSelector() == 'authorizationDate';

            refresh();
        }

        function refresh() {
            advancedFilterViewModel.isLoading(true);

            Modules.ContentProvider('module://websitecore/data/advancedfilter', 'worklist', {
                SearchValue: _searchValue ? _searchValue : "",
                SearchType: _searchType,
                SearchFromDate: _searchFromDate,
                SearchToDate: _searchToDate,
                FunctionSpecialisationID: _functionSpecialisationID ? _functionSpecialisationID : 0,
                ModalityTypeID: _modalityTypeID ? _modalityTypeID : 0,
                PatientCategoryID: _patientCategoryID ? _patientCategoryID : 0,
                ReportStatusID: _reportStatusID ? _reportStatusID : null,
                LocationID: _locationID ? _locationID : 0,
                MailboxNumberCheck: _mailboxNumberCheck,
                UseAuthorisationDate: _useAuthorisationDate
            })
                .then(function (data) {
                    advancedFilterViewModel.gridOptions.dataView.setItems(data, 'ExaminationID');
                    advancedFilterViewModel.gridOptions.dataView.refresh();
                }, function (data) {
                    advancedFilterViewModel.gridOptions.dataView.setItems([], 'ExaminationID');
                    advancedFilterViewModel.gridOptions.dataView.refresh();
                    ris.notify.showError(locfmt('{ris,Filtering_MessageTitle}'), data.message);
                }).always(function () {
                    advancedFilterViewModel.isLoading(false);
                });
        }

        function printReport() {
            var items = advancedFilterViewModel.gridOptions.dataView.getItems();
            if (items.length == 0) {
                ris.notify.showError(locfmt('{ris,Filtering_MessageTitle}'), locfmt('{ris,Filtering_PrintingError}'));
                return;
            }

            var gridContent = $('#AdvancedFilterGridView').virtualDataGrid('exportHtml');
            var content = '<div class="report-header">' + locfmt('{ris,FilteringPage_PrintHeader}', { searchType: _searchType, searchValue: _searchValue }) + '</div>';

            var searchFromDate = filterViewModel.dateFrom();
            var searchToDate = filterViewModel.dateTo();
            if (searchFromDate == null) {
                searchFromDate = new Date();
                searchToDate = new Date();
                searchToDate.setDate(searchToDate.getDate() + 1);
            }
            else if (searchToDate == null) {
                searchToDate = new Date();
                searchToDate.setDate(searchFromDate.getDate() + 1);
            }

            content += '<div class="date-filter">';
            content += '<div>' + searchFromDate.format(currentCulture.dateTime.dateShort) + '</div>';
            content += '<div>' + searchToDate.format(currentCulture.dateTime.dateShort) + '</div>';
            content += '</div>';
            content += gridContent;
            content += '<div class="printed-date">';
            content += '<span class="printed-date-label">' + locfmt('{ris,FilteringPage_PrintedLabel}') + '</span>';
            content += '<span>' + new Date().format(currentCulture.dateTime.dateShort) + '</span>';
            content += '</div>';
            var document = $('<div class="GridToPrint">' + content + '</div>');

            document.printArea({
                mode: "iframe", //printable window is either iframe or browser popup
            });
            $('#AdvancedFilterGridView').virtualDataGrid('refresh');
        }

        function printSelectedReports() {
            var d = $.Deferred();
            Modules.Task('module://reporting/data/print-report', 'printreports', { OrderIDs: selectedOrders })
                .then(function (data) {
                    if (data.PrintUrl) {
                        window.open(data.PrintUrl);
                        if (data.SecondPrintUrl) {
                            window.open(data.SecondPrintUrl);
                        }
                        ris.notify.showSuccess(locfmt('{ris,Filtering_MessageTitle}'), locfmt('{ris,Printing_PDFReportCreated}'));
                    } else {
                        ris.notify.showSuccess(locfmt('{ris,Filtering_MessageTitle}'), locfmt('{ris,Printing_ReportSentToPrint}'));
                    }
                    d.resolve();
                }, function (x) {
                    ris.notify.showError(locfmt('{ris,Filtering_MessageTitle}'), x.message);
                    d.reject();
                });
        }

    });
})(jQuery);