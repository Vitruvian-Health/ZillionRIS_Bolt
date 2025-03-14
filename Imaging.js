(function ($) {
    $(function () {
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

        function hasCommon(left, right) {
            if (left == null || left.length == 0)
                return true;
            for (var i = 0, ii = left.length; i < ii; i++) {
                if (right.indexOf(left[i]) !== -1) {
                    return true;
                }
            }
            return false;
        }

        var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
        commandManager.assign(ZillionRis.Commands.Page.Imaging);

        var commandResources = new ZillionParts.CommandResources();
        ZillionRis.Commands.RegisterResources(commandResources);
        commandResources.assign({
            'imaging.complete': { title: locfmt('{ris,CommandPromoteStatus}'), iconClass: { '16': 'zillion-ris workflow-icon promote-status'} },
        });

        // Create command lists.
        var departmentMenu = new ZillionParts.CommandList();
        var departmentActions = new ZillionParts.CommandList();
        var inProgressCommands = new ZillionParts.CommandList();
        var inProgressActions = new ZillionParts.CommandList();
        var examinationCommands = new ZillionParts.CommandList();
        var examinationActions = new ZillionParts.CommandList();

        fillCommandLists();

        function fillCommandLists() {
            // Examinations in Department Commands.
            with (departmentMenu) {
                add('order.order-information').executeWith('{ OrderID: OrderID }');
                if (window.permissions.hasCancelOrderPermission) {
                    add('examination.cancel').executeWith('{ ExaminationID: [ExaminationID], ReasonList: window.pageConfig.DNA, Title: locfmt("{ris,Imaging_DidNotAttend}") }')
                        .showWhen('StatusID === "indepartment"').hideWhen('HousekeepingID');
                }
                if (window.permissions.hasEditOrderPermission) {
                    add('order.edit-order').executeWith('{ OrderID: OrderID }').hideWhen('HousekeepingID');
                }
                if (window.permissions.hasPatientContactInfoPermission) {
                    add('patient.contact-information').executeWith('{ PatientID: PatientID }');
                }
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
                add('examination.view-qandaforms').executeWith('{ ExaminationID: ExaminationID }');
            }

            with (departmentActions) {
                add('examination.housekeeping-state').showWhen('HousekeepingID');
                add('order.promote-status').executeWith('{ OrderID: OrderID, SourceStatusID: "indepartment", TargetStatusID: "inprogress" }').showWhen('StatusID === "indepartment"').hideWhen('HousekeepingID');
                add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, Title: locfmt("{ris,OrderDocumentsFor} ") + PatientName, HasStoredDocument: HasRequestForm }');
                add('protocol.open-protocol').executeWith('{ examinationID: ExaminationID }').showWhen('HasProtocol');
            }

            // Orders in Progress Commands.
            with (inProgressCommands) {
                add('order.order-information').executeWith('{ OrderID: OrderID }');
                add('order.demote-status').executeWith('{ OrderID: OrderID, SourceStatusID: "inprogress", TargetStatusID: "indepartment" }');
                if (window.permissions.hasPatientContactInfoPermission) {
                    add('patient.contact-information').executeWith('{ PatientID: PatientID }');
                }
            }

            with (inProgressActions) {
                if (window.permissions.hasEditOrderPermission) {
                    add('order.edit-order').executeWith('{ OrderID: OrderID }');
                }
                add('order.open-memo').executeWith('{ HasMemo: HasMemo, ID: OrderID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, Title: locfmt("{ris,OrderDocumentsFor} ") + PatientName, HasStoredDocument: HasOrderRequestForm }');
                add('imaging.order.pending-intermediate-request').showWhen('Details.qAny("PendingStudy === \'pending\'")');
            }

            // Examinations in Progress Commands.
            with (examinationCommands) {
                add('order.order-information').executeWith('{ OrderID: OrderID }');
                add('examination.demote-status').executeWith('{ ExaminationIDs: [ExaminationID], SourceStatusID: "inprogress", TargetStatusID: "indepartment" }').showWhen('StatusID === "inprogress" && PendingStudy === "none"').hideWhen('HousekeepingID');
                add('examination.demote-status').executeWith('{ ExaminationIDs: [ExaminationID], SourceStatusID: "completed", TargetStatusID: "inprogress" }').showWhen('StatusID === "completed" && PendingStudy === "none"').hideWhen('HousekeepingID');
                if (window.permissions.hasCancelOrderPermission) {
                    add('examination.cancel').executeWith('{ ExaminationID: [ExaminationID], ReasonList: window.pageConfig.DNP, Title: locfmt("{ris,Imaging_NotPerformed}") }').hideWhen('HousekeepingID');
                }
                add('imaging.study.cancel-intermediate-request').executeWith('{ExaminationID:ExaminationID,Radiologist:PendingStudyRadiologistName}').showWhen('PendingStudy === "pending"');
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping').executeWith('{ Patient: Order.PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: Order.PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
                add('examination.view-qandaforms').executeWith('{ ExaminationID: ExaminationID }');
            }

            with (examinationActions) {
                add('examination.housekeeping-state').showWhen('HousekeepingID');
                add('imaging.complete').executeWith('{ ExaminationID: [ExaminationID] }').showWhen('StatusID === "inprogress" && PendingStudy === "none"').hideWhen('HousekeepingID');
                add('imaging.study.completed-state').executeWith('ExaminationID').showWhen('StatusID === "completed" && PendingStudy === "none"').hideWhen('HousekeepingID');
                add('examination.open-memo').executeWith(function(item) {
                    return {
                        HasMemo: item.HasMemo,
                        ID: item.ExaminationID,
                        popupLoaded: function() {
                            // Bug fix: Popup gets half-covered by Examinations grid (IE only)
                            setTimeout(function() {
                                imagingViewModel.examinationsVM.dataView.refresh();
                            }, 1000);
                        }
                    };
                });
                add('imaging.study.create-intermediate-request').executeWith('{ ExaminationIDs: [ExaminationID] }').showWhen('StatusID === "inprogress" && PendingStudy === "none"').hideWhen('HousekeepingID');
                add('imaging.study.cancel-intermediate-request').executeWith('{ExaminationID:ExaminationID,Radiologist:PendingStudyRadiologistName}').showWhen('PendingStudy === "pending"').hideWhen('HousekeepingID');
                add('imaging.study.accept-intermediate-response-accepted').executeWith('ExaminationID').showWhen('PendingStudy === "accepted"').hideWhen('HousekeepingID');
                add('imaging.study.accept-intermediate-response-declined').executeWith('ExaminationID').showWhen('PendingStudy === "declined"').hideWhen('HousekeepingID');
            }
        }
        
        var queryPatientHistory = true;
        var commandButtonClicked = false;
        var imagingViewModel = new ImagingViewModel();
        $(function () {
            imagingViewModel.grid = $('#PatientsGrid');
            imagingViewModel.departmentVM.grid = $('#DepartmentGrid');
            imagingViewModel.inProgressVM.grid = $('#PatientsGrid');
            imagingViewModel.examinationsVM.grid = $('#ExaminationsGrid');
            imagingViewModel.historyVM.grid = $('#HistoryGrid');

            imagingViewModel.arrivedPatientsOnly.subscribe(function () {
                $('#DepartmentGrid').virtualDataGrid('updateFilter');
            });
            imagingViewModel.filters.selected.subscribe(function () {
                $('#DepartmentGrid').virtualDataGrid('updateFilter');
                $('#PatientsGrid').virtualDataGrid('updateFilter');
                $('#ExaminationsGrid').virtualDataGrid('updateFilter');
            });
            imagingViewModel.roomID.subscribe(function () {
                $('#DepartmentGrid').virtualDataGrid('updateFilter');
                $('#PatientsGrid').virtualDataGrid('updateFilter');
                $('#ExaminationsGrid').virtualDataGrid('updateFilter');
            });

            $('#DepartmentGrid').on('click', '.command-button', function() {
                commandButtonClicked = true;
            });

            // Data bind.
            ko.applyBindings(imagingViewModel, $('#ImagingPage')[0]);

            // Create panel context menus.
            createWorkListContextMenu();
            createPatientListContextMenu();
            createExaminationListContextMenu();
            createHistoryListContextMenu();

            var previousOrderID = 0;
            var previousPatientID = 0;

            imagingViewModel.inProgressVM.selectedItem.subscribe(function(item) {
                var orderID = item && item.OrderID || 0;
                var patientId = item && item.PatientID || 0;

                if (orderID !== previousOrderID) {
                    if (item !== null) {
                        imagingViewModel.departmentVM.selection.clear();
                        ZillionRis.CommandManager.execute('stored-documents.popup-close-or-clear');
                        ZillionRis.LoadPatientBanner(patientId);
                    }
                    previousOrderID = orderID;
                }

                clearBannerAndImagesIfNoSelection();

                loadExaminations();

                if (patientId !== previousPatientID) {
                    if (patientId !== 0) {
                        previousPatientID = patientId;
                        ZillionRis.ImageViewer().clear();
                    }
                }

                imagingViewModel.historyVM.loadPatient(patientId);
            });

            var previousExaminationID = 0;
            imagingViewModel.examinationsVM.selectedItem.subscribe(function (a) {
                var examinationID = a && a.ExaminationID;
                if (examinationID != previousExaminationID) {
                    loadExaminationInformation();
                    previousExaminationID = examinationID;
                    imagingViewModel.showOrderInfo(true);
                }
            });

            imagingViewModel.departmentVM.selectedItem.subscribe(function(item) {
                if (item !== null) {
                    imagingViewModel.inProgressVM.selection.clear();

                    imagingViewModel.examinationsVM.dataView.setItems([], 'ExaminationID');
                    imagingViewModel.examinationsVM.dataView.refresh();

                    var patientId = item && item.PatientID || 0;
                    if (patientId !== previousPatientID) {
                        if (patientId !== 0) {
                            previousPatientID = patientId;
                            ZillionRis.ImageViewer().clear();
                        }
                    }

                    ZillionRis.LoadPatientBanner(patientId);
                }

                clearBannerAndImagesIfNoSelection();
            });

            function clearBannerAndImagesIfNoSelection() {
                if (imagingViewModel.departmentVM.selection.getCount() === 0 && imagingViewModel.inProgressVM.selection.getCount() === 0) {
                    ZillionRis.LoadPatientBanner(0);
                    ZillionRis.ImageViewer().clear();
                }
            }

            imagingViewModel.departmentVM.dataView.onUpdated.subscribe(function () {
                imagingViewModel.departmentVM.title(locfmt('{ris,InDepartment_Title}', {
                    date: imagingViewModel.selectedDateText(),
                    shown: this.getItems(false).length,
                    total: this.getItems(true).length
                }));
            });
            imagingViewModel.inProgressVM.dataView.onUpdated.subscribe(function () {
                imagingViewModel.inProgressVM.title(locfmt('{ris,InProgress_Title} ({shown}/{total})', {
                    shown: this.getItems(false).length,
                    total: this.getItems(true).length
                }));                

                // Keep the selected item in sync...
                if (imagingViewModel.inProgressVM.selectedItem()) {
                    var key = imagingViewModel.inProgressVM.selection.getKeys()[0];
                    var currentItem = imagingViewModel.inProgressVM.dataView.getItemByKey(key);

                    imagingViewModel.inProgressVM.selectedItem(currentItem);
                }
            });
            imagingViewModel.examinationsVM.dataView.onUpdated.subscribe(function () {
                historyTitleUpdate();
            });
            var historyVMUpdate = function () {
                if (imagingViewModel.showOrderInfo()) {
                } else {
                    var selectedPatientItem = imagingViewModel.inProgressVM.selectedItem();
                    if (queryPatientHistory) {
                        if (selectedPatientItem) {
                            imagingViewModel.historyVM.loadPatient(selectedPatientItem.PatientID);
                        } else {
                            imagingViewModel.historyVM.loadPatient(0);
                        }
                    }
                    queryPatientHistory = false;
                }
                    historyTitleUpdate();
            };
           
           var historyTitleUpdate = function () {
                if (imagingViewModel.showOrderInfo()) {
                    imagingViewModel.examinationsVM.historyTitle(locfmt('{ris,ExaminationInformation_Title}'));
                } else {
                    var dataView = imagingViewModel.historyVM.dataView;
                    imagingViewModel.examinationsVM.historyTitle(locfmt('{ris,HistoryInformation} ({shown}/{total})', {
                        shown: dataView.getItems(false).length,
                        total: dataView.getItems(true).length
                    }));
                }
            };

            $('#DepartmentGrid').virtualDataGrid('updateFilter');
            imagingViewModel.showOrderInfo.subscribe(historyVMUpdate);
            imagingViewModel.historyVM.dataView.onUpdated.subscribe(historyTitleUpdate);

            setTimeout(function () {
                imagingViewModel.loadSettings();
                imagingViewModel.loadFilters();

                intializeRooms();

                var currentDate = imagingViewModel.selectedDate();
                var storageDate = window.sessionStorage && window.sessionStorage.getItem('imaging.date');
                if (storageDate && (storageDate = new Date(storageDate)) && storageDate.toDateString() != currentDate.toDateString()) {
                    ris.notify.showInformation(storageDate.format('dddd, d MMMM yyyy'), locfmt('{ris,General_PreviouslySelectedDate}', { date: storageDate.format('dddd, d MMMM yyyy') }), 10000);
                    imagingViewModel.selectedDate(storageDate);
                }
                imagingViewModel.selectedDate.subscribe(function (a) {
                    if (window.sessionStorage) {
                        window.sessionStorage.setItem('imaging.date', a);
                    }
                });

                ZillionRis.WorkList.SelectionStore(imagingViewModel.departmentVM.grid, imagingViewModel.departmentVM.gridOptions, 'imaging.department.selection');

                // Initialize and load the user settings for the grids.
                imagingViewModel.departmentSettingsStore1.initialize('#DepartmentGrid', imagingViewModel.departmentVM.gridOptions, 'imaging', 'department-grid').loadSettings();
                imagingViewModel.inProgressSettingsStore1.initialize('#PatientsGrid', imagingViewModel.inProgressVM.gridOptions, 'imaging', 'inprogress-grid').loadSettings();
                imagingViewModel.examinationSettingsStore1.initialize('#ExaminationsGrid', imagingViewModel.examinationsVM.gridOptions, 'imaging', 'examinations-grid').loadSettings();
                
                // Refresh work lists.
                imagingViewModel.refresh();
            }, 100);

            var refreshIntervalMs = window.pageConfig.RefreshIntervalMs;
            if (refreshIntervalMs) {
                // Sanity check.
                if (refreshIntervalMs < 15000) {
                    refreshIntervalMs = 15000;
                }

                setInterval(function () {
                    refresh();
                }, refreshIntervalMs);
            }
        });

        function intializeRooms() {
            // Subscribe to location data changes.
            Rogan.Ris.Locations.onChanged.subscribe(function (e, service) {
                // grab all the rooms
                var rooms = service.getRooms().map(function (a) { return { id: a.ID, displayName: '[' + a.Name + '] ' + a.Description, description: a.Description, location: a.LocationID }; });
                imagingViewModel.locationSource.allRooms(rooms);
                // load rooms based on current location
                loadRoomsForCurrentLocation();
            });
            Rogan.Ris.Locations.ensure();
        }

        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);
        ZillionRis.SiteEvents.subscribe('location-change', loadRoomsForCurrentLocation);

        function loadRoomsForCurrentLocation() {
            var locID = window.currentLocationID;
            if (locID) {
                imagingViewModel.locationSource.currentLocation(locID);

                var rooID = imagingViewModel.roomID();
                if (rooID && imagingViewModel.locationSource.rooms().qAny('id == ' + rooID)) {
                    imagingViewModel.locationSource.currentRoom(imagingViewModel.locationSource.rooms().qFirst('id == ' + rooID));
                }
            }
        }

        var refreshEvent = new ZillionParts.Event();
        function refresh() {
            refreshInProgress();
            refreshDepartment();
            refreshEvent.notify();
        }

        function refreshDepartment() {
            imagingViewModel.departmentVM.isLoading(true);

            return Modules.ContentProvider('module://technician/data/waiting', 'query', { Date: moment(imagingViewModel.selectedDate()) })
                .then(function(data) {
                    imagingViewModel.departmentVM.dataView.setItems(data, 'ExaminationID');
                    imagingViewModel.departmentVM.dataView.refresh();
                }).always(function() {
                  //$('#DepartmentGrid').virtualDataGrid('updateFilter');
                  imagingViewModel.departmentVM.isLoading(false);
                });
        }

        function refreshInProgress() {
            imagingViewModel.inProgressVM.isLoading(true);

            return Modules.ContentProvider('module://technician/data/inprogress', 'query', { Date: moment(imagingViewModel.selectedDate()) })
                .then(function(data) {
                    data.qEach(function (order) { order.Details.qEach(function (detail) { detail.Order = order; }); });

                    imagingViewModel.inProgressVM.dataView.setItems(data, 'OrderID');
                    imagingViewModel.inProgressVM.dataView.refresh();
                }).always(function() {
                    imagingViewModel.inProgressVM.isLoading(false);                    
                    
                    var keys = imagingViewModel.inProgressVM.selection.getKeys();
                    if (keys.length != 0) {
                        imagingViewModel.inProgressVM.selectedItem(imagingViewModel.inProgressVM.dataView.getItemByKey(keys[0]));
                    }

                    loadExaminations();
                });
        }

        function loadExaminations() {
            var selectedItem = imagingViewModel.inProgressVM.selectedItem();
            if (selectedItem) {
                imagingViewModel.examinationsVM.dataView.setItems(selectedItem.Details, 'ExaminationID');
                imagingViewModel.examinationsVM.dataView.refresh();

                if (selectedItem.Details.qAny('HousekeepingID != null && HousekeepingID != 0')) {
                    imagingViewModel.examinationsVM.disableFullOrderButtons(true);
                }
                else {
                    imagingViewModel.examinationsVM.disableFullOrderButtons(false);
                }
                 
            } else {
                imagingViewModel.examinationsVM.dataView.setItems([], 'ExaminationID');
                imagingViewModel.examinationsVM.dataView.refresh();

                imagingViewModel.examinationsVM.disableFullOrderButtons(true);
            }
            queryPatientHistory = true;
            loadExaminationInformation();
        }

        function loadExaminationInformation() {
            // Examination ID is expected to be an integer.
            if (imagingViewModel.examinationsVM.selectedItem() == null) {
                $('#ExaminationInformation').empty();
            } else {
                var examinationID = imagingViewModel.examinationsVM.selectedItem().ExaminationID | 0 ;
                $('#HistoryPanel').loadingOverlay({ message: locfmt('{ris,General_Loading}')});
                $('#HistoryPanel').loadingOverlay('show');

                lastHistoryInfoXhr = $.ajax({
                    url: ZillionRis.PageUrl('Parts/ImagingExaminationInformation.cshtml?examinationID=' + examinationID ),
                    type: 'post',
                    success: function (data, status, xhr) {
                        if (xhr == lastHistoryInfoXhr) {
                            $('#HistoryPanel').loadingOverlay('hide');
                            $('#ExaminationInformation').html(data);
                        }
                    },
                    error : function() {
                        $('#HistoryPanel').loadingOverlay('hide');
                    }
                });
            }
        }

        $.extend(true, window, {
            refreshWorklists: function () { ZillionRis.SiteEvents.broadcast('lazy-page-update'); },
            statusChangeCallback: statusChangeCallback
        });

        function statusChangeCallback(s, e) {
            if (e && 'errorMessage' in e && e.errorMessage != '') {
                alert(e.errorMessage);
            } else {
                ZillionRis.SiteEvents.broadcast('lazy-page-update');
            }
        }

        function createWorkListContextMenu() {
            var configurationMenu = $('<input id="InDepartmentGridSetting" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                        refreshDepartment();
                    } else if (item.id == 'clear-filter') {
                        imagingViewModel.departmentVM.clearFilter();
                    } else if (item.id == 'configure') {
                        imagingViewModel.departmentVM.customize();
                    } else if (item.id == 'reset') {
                        imagingViewModel.departmentVM.resetUserSettings();
                        imagingViewModel.reset();
                    }
                }
            });
            var find = $('#InDepartmentPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function createPatientListContextMenu() {
            var configurationMenu = $('<input id="InProgressGridSetting" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                        refreshInProgress();
                    } else if (item.id == 'clear-filter') {
                        imagingViewModel.inProgressVM.clearFilter();
                    } else if (item.id == 'configure') {
                        imagingViewModel.inProgressVM.customize();
                    } else if (item.id == 'reset') {
                        imagingViewModel.inProgressVM.resetUserSettings();
                        imagingViewModel.reset();
                    }
                }
            });
            var find = $('#PatientsPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function createExaminationListContextMenu() {
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
                        refreshInProgress();
                        //loadExaminations();
                    } else if (item.id == 'clear-filter') {
                        imagingViewModel.examinationsVM.clearFilter();
                    } else if (item.id == 'configure') {
                        imagingViewModel.examinationsVM.customize();
                    } else if (item.id == 'reset') {
                        imagingViewModel.examinationsVM.resetUserSettings();
                        imagingViewModel.reset();
                    }
                }
            });
            var find = $('#ExaminationsPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function createHistoryListContextMenu() {
            var configurationMenu = $('<input id="PatientHistoryGridSetting" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                        loadExaminationInformation();
                    } else if (item.id == 'clear-filter') {
                        imagingViewModel.historyVM.clearFilter();
                    } else if (item.id == 'configure') {
                        imagingViewModel.historyVM.customize();
                    } else if (item.id == 'reset') {
                        imagingViewModel.historyVM.resetUserSettings();
                        imagingViewModel.reset();
                    }
                }
            });
            var find = $('#HistoryPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function LocationFilterViewModel() {
            var self = this;

            this.rooms = ko.observable([]);
            this.allRooms = ko.observable([]);
            this.currentLocation = ko.observable(null);
            this.currentRoom = ko.observable(null);
            this.enableRooms = ko.computed(function () {
                return !!self.rooms().length;
            });

            this.resetRoom = function() {
                this.currentRoom(null);
            };

            this.currentLocation.subscribe(function (location) {
                if (location) {
                    var allRooms = self.allRooms();
                    self.rooms(allRooms.qWhere('location === ' + location + ''));

                    if (self.currentRoom()) {
                        if (!self.rooms().qAny('id === ' + self.currentRoom().id)) {
                            self.currentRoom(null);
                        }
                    }
                } else {
                    self.currentRoom(null);
                    self.rooms([]);
                }
            });

        }

        function createFilterFunc(filters) {
            return function (items) { return filters.filter(items); };
        }

        function DepartmentViewModel() {
            var self = this;

            this.title = ko.observable('');
            this.grid = null;
            this.dataView = ZillionParts.Data.DataSet();

            this.selection = new ZillionParts.Data.DataSelection();
            this.selection.setMultiSelect(false);
            this.selectedItem = ko.observable();

            this.gridOptions = {
                dataView: this.dataView,
                selection: this.selection,
                keyField: 'ExaminationID',
                columnDefaults: {
                    allowFilter: true,
                    allowSort: true,
                    allowResize: true
                },
                onFilterCreated: function (filter) {
                    var customFilter = new ZillionParts.Condition();
                    customFilter.type = 'and';

                    customFilter.include(filter);
                    var currentFilter = imagingViewModel.filters.selected();
                    if (currentFilter) {
                        combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                        combineListFilter(customFilter, 'RoomID', currentFilter.rooms);
                        combineListFilter(customFilter, 'RequesterLocationID', currentFilter.requesterLocations);
                        combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);

                        var statusFilter = new ZillionParts.Condition();
                        statusFilter.type = 'or';

                        var cc = 0;
                        if (!currentFilter.showInDepartmentExaminations) {
                            statusFilter.exclude('StatusID === "indepartment"');
                            cc++;
                        }
                        if (!currentFilter.showScheduledExaminations) {
                            statusFilter.exclude('StatusID === "scheduled"');
                            cc++;
                        }

                        if (cc > 0) {
                            customFilter.include(statusFilter);
                        }
                    }

                    if (imagingViewModel.roomID()) {
                        customFilter.include({ RoomID: imagingViewModel.roomID() });
                    }
                    if (imagingViewModel.arrivedPatientsOnly()) {
                        customFilter.include({ StatusID: 'indepartment' });
                    }
                    return createFilterFunc(customFilter);
                },
                createEmptyDataItem: function () {
                    var count = self.dataView.getItems(true).length;
                    if (count > 0) {
                        var foo = $('<span>' + locfmt('{ris,Imaging_NoDataAvailable}') + '<br/>' + count + locfmt('{ris,Imaging_AppointmentsTotal}') + '<br/><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                        $('a', foo).click(function () {
                            $(self.grid).virtualDataGrid('clearFilter');
                            imagingViewModel.clear();
                        });
                        return foo;
                    } else {
                        return $('<span>' + locfmt('{ris,Imaging_NoAppointmentsForToday}') + '</span>');
                    }
                },
                showFilterRow: true,
                onRowsRendered: onRowsRendered,
                onRowCreated: onItemCreated,
                columns: [
                {
                    fieldID: 'context-menu',
                    title: '',
                    friendlyName: 'Context Menu',
                    dataType: 'context-menu',
                    commands: { list: departmentMenu, manager: commandManager, resources: commandResources }
                },
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: departmentActions, manager: commandManager, resources: commandResources }, width: 75 },
                { title: locfmt('{ris,FieldInDepartmentEventIndicator}'), fieldID: 'EventIndicator', dataType: 'event-indicator', sortFieldID: 'DepartmentTime', timeField: 'DepartmentTime', filterFieldID: 'DepartmentTime',timeInterval: window.pageConfig.WaitingTime, conditional: function (data, item) { return item.StatusID === 'indepartment'; } },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'Scheduled', dataType: 'scheduled-date' },
                {
                    title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter',
                    dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null, contactID: 'PatientID', width: 200
                },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 300 },
                { title: locfmt('{ris,FieldPatientDateOfBirth}'), fieldID: 'DateOfBirth', dataType: 'date-of-birth' },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 120 },
                { title: locfmt('{ris,FieldRoom}'), fieldID: 'RoomName', width: 120, visible: false },
                { title: locfmt('{ris,FieldOrderType}'), fieldID: 'OrderTypeName', width: 120, visible: false },
                { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' },
                { title: locfmt('{ris,FieldInDepartmentSince}'), fieldID: 'DepartmentTime', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', sortFieldID: 'UrgencySortIndex', width: 80 },
                { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName' },
                { title: locfmt('{ris,FieldWaitingRoom}'), fieldID: 'WaitingRoomName', width: 120 }
            ],
                sort: [
                { "fieldID": "Scheduled", asc: true },
                { "fieldID": "AccessionNumber", asc: true }
            ],
                itemdblclick: function (e, args) {
                    var item = args.item;
                    var cmd = departmentActions.get(item, commandManager, commandResources).qFirst('key==="examination.promote-status"');
                    if (cmd) {
                        cmd.execute();
                    }
                },
                onSorting: function (sort) {
                    if (window.pageConfig && window.pageConfig.AutoSortUrgency === true) {
                        // Forced sorting:
                        sort = sort.filter(function(x) { return x.fieldID !== 'UrgencySortIndex'; });
                        sort = [
                                { "fieldID": "UrgencySortIndex", asc: false }
                        ].concat(sort);
                    }

                    return sort;
                }
            };

            this.isLoading = ko.observable(false);

            function onItemCreated($element, item) {
                ZillionRis.AddUrgencyClasses($element, item.UrgencyID);
                if (item.StatusID === 'scheduled') {
                    $element.addClass('data-ignored').css({ opacity: 0.7 });
                }
            }

            function onRowsRendered() {
                highlightOrderExams(self.selectedItem());
            }

            var previousOrderID = 0;
            this.selectedItem.subscribe(function (selectedItem) {
                highlightOrderExams(selectedItem);

                var orderID = selectedItem && selectedItem.OrderID || 0;
                if (orderID !== previousOrderID) {
                    if (window.pageConfig.AutoShowRequestForm && selectedItem != null && !commandButtonClicked) {
                        commandManager.execute('stored-documents.popup-close-or-clear');
                        commandManager.execute('stored-documents.view', { Source: 'urn:order:' + selectedItem.OrderID, AutoOpen: 'urn:requestform:*', PreferPopup: true });
                    }
                    previousOrderID = orderID;
                }

                commandButtonClicked = false;
            });

            function highlightOrderExams(selectedItem) {
                $(self.grid).virtualDataGrid('visitVisibleItems', function(key, item, $element) {
                    $element.removeClass('virtual-data-grid-item-associated');

                    if (item && selectedItem && item.OrderID === selectedItem.OrderID) {
                        $element.addClass('virtual-data-grid-item-associated');
                    }
                });
            }

            this.clearFilter = function () {
                $(self.grid).virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                imagingViewModel.clear();
            };
            this.loadUserSettings = function () {
                imagingViewModel.departmentSettingsStore1.loadSettings();
            };
            this.resetUserSettings = function () {
                imagingViewModel.departmentSettingsStore1.resetSettings();
            };
            this.customize = function () {
                $(self.grid).customizeVirtualDataGrid();
            };
        }

        function InProgressViewModel() {
            var self = this;

            this.title = ko.observable('');
            this.grid = null;
            this.dataView = window.ZillionParts.Data.DataSet();

            this.selection = new window.ZillionParts.Data.DataSelection();
            this.selection.setMultiSelect(false);
            this.selectedItem = ko.observable();

            this.gridOptions = {
                dataView: this.dataView,
                selection: this.selection,
                singleSelect: 'on',
                keyField: 'OrderID',
                columnDefaults: {
                    allowFilter: true,
                    allowSort: true,
                    allowResize: true
                },
                onFilterCreated: function (filter) {
                    var customFilter = new window.ZillionParts.Condition();
                    customFilter.type = 'and';

                    customFilter.include(filter);

                    var currentFilter = imagingViewModel.filters.selected();
                    if (currentFilter) {
                        var locCon;
                        var rooms = currentFilter.rooms;
                        if (rooms.length > 0) {
                            locCon = new window.ZillionParts.Condition();
                            locCon.type = 'or';
                            $.each(rooms, function (i, a) { locCon.include('Details.qAny(\"RoomID === ' + JSON.stringify(a) + '\")'); });
                            customFilter.include(locCon);
                        }

                        var modalities = currentFilter.modalityTypes;
                        if (modalities.length > 0) {
                            locCon = new window.ZillionParts.Condition();
                            locCon.type = 'or';
                            $.each(modalities, function (i, a) { locCon.include('Details.qAny(\"ModalityTypeIDs.indexOf(' + JSON.stringify(a) + ') > -1\")'); });
                            customFilter.include(locCon);
                        }
                    }

                    if (imagingViewModel.roomID()) {
                        customFilter.include('Details.qAny(\"RoomID === ' + JSON.stringify(imagingViewModel.roomID()) + '\")');
                    }

                    return createFilterFunc(customFilter);
                },
                createEmptyDataItem: function () {
                    var dv = this.dataView;
                    if (dv.getItems(false) != dv.getItems(true)) {
                        var foo = $('<span>' + locfmt('{ris,Imaging_NoDataAvailable}') + '<br /><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                        $('a', foo).click(function () {
                            $(self.grid).virtualDataGrid('clearFilter');
                            imagingViewModel.clear();
                        });
                        return foo;
                    } else {
                        return '<span>' + locfmt('{ris,Imaging_NoDataAvailable}') + '</span>';
                    }
                },

                showFilterRow: true,
                onRowCreated: onItemCreated,
                columns: [
                { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: inProgressCommands, manager: commandManager, resources: commandResources} },
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: inProgressActions, manager: commandManager, resources: commandResources} },
                { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 80 },
                {
                    title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter',
                    dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null, contactID: 'PatientID', width: 120
                },
                { title: locfmt('{ris,FieldPatientDateOfBirth}'), fieldID: 'DateOfBirth', dataType: 'date-of-birth' },
                { title: locfmt('{ris,FieldPatientGender}'), fieldID: 'Gender', width: 80 },
                { title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber', width: 80 },
                { title: locfmt('{ris,FieldExternalOrderNumber}'), fieldID: 'ExternalOrderNumber', width: 80 },
                { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', sortFieldID: 'UrgencySortIndex', width: 80 },
                {
                    title: locfmt('{ris,FieldTechnicians}'),
                    fieldID: 'Technicians',
                    renderMethod: function (data, item) {
                        if (!item.Technicians) {
                            item.Technicians = item.Details.qSelect('TechnicianNames').qDistinct().joinText(', ');
                            item.TechnicianPersonIDs = item.Details.qSelectMany('TechnicianPersonIDs').qDistinct().joinText(';');
                        }
                        return '<span class="contact-link" data-person="' + item.TechnicianPersonIDs + '">' + item.Technicians + '</span>';
                    }
                }
            ],
                sort: [
                { "fieldID": "PatientName", asc: true },
                { "fieldID": "PatientNumber", asc: true }
            ],
                onSorting: function (sort) {
                    if (window.pageConfig && window.pageConfig.AutoSortUrgency === true) {
                        // Forced sorting:
                        sort = sort.filter(function(x) { return x.fieldID !== 'UrgencySortIndex'; });
                        sort = [{ "fieldID": "UrgencySortIndex", asc: false }].concat(sort);
                    }

                    return sort;
                }
            };

            this.isLoading = ko.observable(false);

            function onItemCreated($element, data) {
		ZillionRis.AddUrgencyClasses($element, data.UrgencyID);
            }

            this.clearFilter = function () {
                $(self.grid).virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                imagingViewModel.clear();
            };
            this.loadUserSettings = function () {
                imagingViewModel.inProgressSettingsStore1.loadSettings();
            };
            this.resetUserSettings = function () {
                imagingViewModel.inProgressSettingsStore1.resetSettings();
            };
            this.customize = function () {
                $(self.grid).customizeVirtualDataGrid();
            };
        }

        function ExaminationsViewModel() {
            var self = this;

            this.title = ko.observable('');
            this.historyTitle = ko.observable('');
            this.grid = null;
            this.dataView = ZillionParts.Data.DataSet();

            this.selection = new ZillionParts.Data.DataSelection();
            this.selection.setMultiSelect(false);
            this.selectedItem = ko.observable();

            this.hasItems = new ko.observable(false);
            this.dataView.onUpdated.subscribe(function () {
                self.hasItems(this.length > 0);
                
                self.title(locfmt('{ris,Examinations_Title} ({shown}/{total})', {
                    shown: this.getItems(false).length,
                    total: this.getItems(true).length
                }));
            });

            this.gridOptions = {
                dataView: this.dataView,
                selection: this.selection,
                keyField: 'ExaminationID',
                columnDefaults: {
                    allowFilter: true,
                    allowSort: true,
                    allowResize: true
                },
                createEmptyDataItem: function () {
                    if (imagingViewModel.inProgressVM.selectedItem() == null) {
                        return $('<span>' + locfmt('{ris,Imaging_NoPatientSelected}') + '</span>');
                    } else {
                        var count = self.dataView.getItems(true).length;
                        if (count > 0) {
                            var foo = $('<span>' + locfmt('{ris,NoExaminationsFoundFilter}') + '<br/>' + count + locfmt('{ris,ExaminationsInTotal}') + '<br/><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                            $('a', foo).click(function () {
                                $('#ExaminationsGrid').virtualDataGrid('clearFilter');
                                imagingViewModel.clear();
                            });
                            return foo;
                        } else {
                            return $('<span>No examinations found for the selected patient</span>');
                        }
                    }
                },
                showFilterRow: true,
                onRowsRendering: onRowsRendering,
                onRowsRendered: onRowsRendered,
                onRowCreated: onItemCreated,
                columns: [
                { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: examinationCommands, manager: commandManager, resources: commandResources} },
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: { list: examinationActions, manager: commandManager, resources: commandResources} },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'Scheduled', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 140 },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldRoom}'), fieldID: 'RoomName', width: 80 },
                { title: locfmt('{ris,FieldTechnicians}'), fieldID: 'TechnicianNames', dataType: 'contact', contactID: 'TechnicianPersonIDs' }
            ],
                sort: [
                { "fieldID": "UrgencyID", asc: false },
                { "fieldID": "Scheduled", asc: true },
                { "fieldID": "AccessionNumber", asc: true }
            ]
            };

            this.isLoading = ko.observable(false);

            var currentFilter;
            function onRowsRendering() {
                currentFilter = imagingViewModel.filters.selected();
            }
            function onRowsRendered() {
                currentFilter = null;
            }

            function onItemCreated($element, data) {
		ZillionRis.AddUrgencyClasses($element, data.Order.UrgencyID);

                if (data.StatusID === 'completed') {
                    $element.addClass('data-ignored');
                }

                if (!currentFilter) {
                    currentFilter = imagingViewModel.filters.selected();
                }

                var foundFilter = false;
                if (currentFilter) {
                    if (hasCommon(currentFilter.deparments, [data.DepartmentID]) === false) {
                        $element.addClass('data-ignored');
                        foundFilter = true;
                    } else if (hasCommon(currentFilter.rooms, [data.RoomID]) === false) {
                        $element.addClass('data-ignored');
                        foundFilter = true;
                    } else if (hasCommon(currentFilter.modalityTypes, data.ModalityTypeIDs) === false) {
                        $element.addClass('data-ignored');
                        foundFilter = true;
                    }
                } else if (imagingViewModel.roomID()) {
                    if (imagingViewModel.roomID() !== data.RoomID) {
                        $element.addClass('data-ignored');
                        foundFilter = true;
                    }
                }

                if (foundFilter === true) {
                    $element.children(':nth-child(1)').hide();
                    $element.children(':nth-child(2)').hide();
                }
            }

            this.clearFilter = function () {
                this.grid.virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                imagingViewModel.clear();
            };
            this.loadUserSettings = function () {
                imagingViewModel.examinationSettingsStore1.loadSettings();
            };
            this.resetUserSettings = function () {
                imagingViewModel.examinationSettingsStore1.resetSettings();
            };
            this.customize = function () {
                this.grid.customizeVirtualDataGrid();
            };

            this.completeAllExaminations = function () {
                var keys = this.dataView.getItems().qWhere('StatusID === "inprogress" && PendingStudy === "none"').qSelect('ExaminationID');
                commandManager.execute('imaging.complete', { ExaminationID: keys });
            };

            this.createIntermediateAllExaminations = function () {
                var keys = this.dataView.getItems().qSelect('ExaminationID');
                commandManager.execute('imaging.study.create-intermediate-request', { ExaminationIDs: keys });
            };

            this.disableFullOrderButtons = ko.observable(true);
        }

        function ImagingViewModel() {
            var self = this;
            this.locationSource = new LocationFilterViewModel();

            this.showOrderInfo = new ko.observable(true);
            
            this.toggleOrderInfo = function () {
                this.showOrderInfo(!this.showOrderInfo());
                if (this.showOrderInfo())
                    loadExaminationInformation();

                ZillionParts.Fluids.Update();
            };

            this.selectedDate = new ko.observable(new Date());
            this.selectedDateText = new ko.computed(function () {
                var selectedDate = self.selectedDate();
                if (selectedDate) {
                    return selectedDate.format('dddd, d MMMM');
                } else {
                    return '-';
                }
            });
            this.selectedDate.subscribe(function () {
                self.departmentVM.dataView.setItems([], 'ExaminationID');
                self.departmentVM.dataView.refresh();
                self.inProgressVM.dataView.setItems([], 'OrderID');
                self.inProgressVM.dataView.refresh();
                self.examinationsVM.dataView.setItems([], 'ExaminationID');
                self.examinationsVM.dataView.refresh();

                self.refresh();
            });
            this.today = function () {
                this.selectedDate(new Date());
            };
            this.isToday = function () {
                return this.selectedDate().toDateString() === new Date().toDateString();
            };

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'imaging-filter';

            this.departmentVM = new DepartmentViewModel();
            this.departmentSettingsStore1 = new ZillionRis.WorkList.SettingsStore();

            this.inProgressVM = new InProgressViewModel();
            this.inProgressSettingsStore1 = new ZillionRis.WorkList.SettingsStore();

            this.examinationsVM = new ExaminationsViewModel();
            this.examinationSettingsStore1 = new ZillionRis.WorkList.SettingsStore();

            this.historyVM = new ZillionRis.Grid.PatientHistoryViewModel('small', { manager: commandManager, resources: commandResources });
            this.historyVM.enableViewButton = ko.computed(function () {
                var item = self.historyVM.selectedItem();
                if (item) {
                    var itemHasCorrectStatus = item.StatusID === "completed" || item.StatusID === "transcribed" || item.StatusID === "authorised" || item.StatusID === "billed" || item.StatusID === "verified";
                    return itemHasCorrectStatus;
                } else {
                    return false;
                }
            });
            this.historyVM.viewImages = function () {
                commandManager.execute('examination.view-images', self.historyVM.selectedItem().ExaminationID);
            };
            this.historyVM.pageKey = 'imaging';
            this.historyVM.controlKey = 'history';
            this.historyVM.grids = '#HistoryGrid';

            this.historyVM.commandList.add('examination.view-images').executeWith('id').showWhen('StatusID === "completed"');
            if (window.permissions.hasEditOrderPermission) {
                this.historyVM.commandList.add('order.edit-order').executeWith('{ OrderID: OrderID }');
            }

            this.historyVM.actionsList.add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
            this.historyVM.actionsList.add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForm }');
            this.historyVM.actionsList.add('protocol.open-protocol').executeWith('{ examinationID: ExaminationID }').showWhen('HasProtocol');            
            this.historyVM.actionsList.add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);

            // Filters.
            this.arrivedPatientsOnly = new ko.observable();
            this.roomID = new ko.observable();

            this.reset = function () {
                this.arrivedPatientsOnly(true);
                this.roomID(null);
                this.filters.selectedID(null);
            };
            this.clear = function () {
                this.arrivedPatientsOnly(false);
                this.locationSource.resetRoom();
                this.filters.selectedID(null);
            };

            this.refresh = function () {
                refresh();
            };

            this.locationSource.currentLocation.subscribe(function (location) {
                if (self.roomID() && self.locationSource.rooms().qAny('id == ' + self.roomID())) {
                    // Keep the room selection
                }
                else {
                    self.roomID(null);
                }
            });
            this.locationSource.currentRoom.subscribe(function (room) {
                self.roomID(room && room.id);
            });

            var isLoading = false;
            var hasLoaded = false;
            this.loadSettings = function () {
                ZillionRis.UserSettings.get('imaging', 'settings')
                .then(function (data) {
                    try {
                        isLoading = true;
                        if (data) {
                            self.arrivedPatientsOnly(data.arrivedPatientsOnly);
                            //self.locationID(data.locationID);
                            self.roomID(data.roomID);

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
                ZillionRis.UserSettings.set('imaging', 'settings', {
                    arrivedPatientsOnly: self.arrivedPatientsOnly(),
                    //locationID: self.locationID(),
                    roomID: self.roomID(),
                    filter: self.filters.selectedID()
                });
            };
            this.resetSettings = function () {
                ZillionRis.UserSettings.set('imaging', 'settings', null);
            };
            this.customizeFilter = function () {
                $('#FilterDialog').pageSubNav('show');
            };

            var update = ZillionParts.Delay(function () {
                if (isLoading === false && hasLoaded === true) {
                    self.saveSettings();
                }
            }, 1000, true);

            this.arrivedPatientsOnly.subscribe(update);
            //this.locationID.subscribe(update);
            this.roomID.subscribe(update);
            this.filters.selected.subscribe(update);

            this.viewCompletedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };

            this.loadFilters = function () {
                this.filters.loadFilters();
            };

            this.reset();
        }

        /// Imaging Filter Editing.
        function ImagingFilterViewModel() {
            this.originalName = '';
            this.name = new ko.observable();

            this.modalityTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.modalityTypes.source = new ZillionRis.Filters.ObjectSourceLocations('modalityTypes', true);

            this.rooms = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.rooms.source = new ZillionRis.Filters.ObjectSourceLocations('rooms', true);

            this.requesterLocations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requesterLocations.source = new ZillionRis.Filters.ObjectSourceLocations('requesterLocations', true);

            this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                projector: '{ id: ID, label: Name, value: Name }'
            });

            // Reception Specific.
            this.showInDepartmentExaminations = new ko.observable(true);
            this.showScheduledExaminations = new ko.observable(false);

            this.itemAdded = function (elem) {
                if (elem.nodeType === 1) {
                    $(elem).show('highlight', 'slow');
                }
            };
        }

        var filterEditor = new ZillionRis.FilterEditor();
        filterEditor.filterFactory = function () {
            return new ImagingFilterViewModel(filterEditor);
        };
        filterEditor.filterSave = function (a) {
            return {
                originalName: a.originalName,
                name: a.name(),

                modalityTypes: a.modalityTypes.list().qSelect('id'),
                rooms: a.rooms.list().qSelect('id'),
                requesterLocations: a.requesterLocations.list().qSelect('id'),
                urgencies: a.urgencies.list().qSelect('id'),

                showInDepartmentExaminations: a.showInDepartmentExaminations(),
                showScheduledExaminations: a.showScheduledExaminations()
            };
        };
        filterEditor.filterLoad = function (a, b) {
            a.originalName = b.originalName;
            a.name(b.name);

            a.modalityTypes.set(b.modalityTypes);
            a.rooms.set(b.rooms);
            a.requesterLocations.set(b.requesterLocations);
            a.urgencies.set(b.urgencies);

            a.showInDepartmentExaminations(b.showInDepartmentExaminations);
            a.showScheduledExaminations(b.showScheduledExaminations);
        };

        filterEditor.filterType = 'imaging-filter';
        filterEditor.notificationTitle = 'Imaging Work List Filter';
        filterEditor.subject = 'imaging';

        filterEditor.close = function () {
            $('#FilterDialog').pageSubNav('hide');
        };

        ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

        // show(): Filter dialog div is hidden at startup.
        $('#FilterDialog').show().pageSubNav({
            close: function () { imagingViewModel.loadFilters(); },
            open: function () {
                filterEditor.openFilterName = imagingViewModel.filters.selectedID;
                filterEditor.load();
            }
        });
    });

})(jQuery);
