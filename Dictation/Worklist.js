(function($) {
    function getDefaultDictationType() {
        return (window.pageConfig && window.pageConfig.DefaultDictationType) || 'INT';
    }

    var dictationCommands = {
        'work-item.assignment': {
            execute: function(context) {
                var d = $.Deferred();

                var commandManager = this;
                $.when(
                    Modules.Task('module://dictation/task/workitem-assignment', 'request', { WorkItemID: context.WorkItemID, WorkItemIDs: context.WorkItemIDs, UserID: context.UserID | 0 }),
                    Modules.Template('module://dictation/view/workitem-assignment')
                ).then(function(model, view) {
                    view = view.clone();

                    model = Modules.ToVM(model, {
                        UserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { PermissionName: 'Reporter', Search: x }; }, '{ UserID: $data }')
                    });

                    model.holidayWarning = ko.observable('');

                    model.UserID.subscribe(function(userID) {
                        model.holidayWarning('');
                        if (userID) {
                            ZillionRis.Commands.Utils.getHolidayWarning(userID).then(model.holidayWarning);
                        }
                    });

                    model.UserID.valueHasMutated();

                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,Title_WorkItemAssignments}'), content: view, buttons: 'no yes' })
                        .then(function(a) {
                            if (a === true) {
                                var model2 = Modules.ToJS(model, 'WorkItemIDs UserID');
                                Modules.Task('module://dictation/task/workitem-assignment', 'process', model2)
                                    .then(function(x) {
                                        if (x.length > 1) {
                                            ris.notify.showSuccess('Assignment Changed', 'The assignments for ' + x.length + ' work items have been changed..');
                                        } else {
                                            x = x[0];
                                            ris.notify.showSuccess('Assignment Changed', x.Examination + ' of ' + x.PatientName + ' created for ' + x.UserName + '.');
                                        }
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError('Unable to change work item assignments.', h.message);
                                        d.reject();
                                    });
                            } else {
                                d.reject();
                            }
                        }, function() {
                            d.reject();
                        });
                }, function() {
                    d.reject();
                });

                return d.promise();
            }
        }
    };

    $(function () {

        function ensureExists(filterCriterion) {
            if (filterCriterion === null || filterCriterion === undefined) {
                return [];
            }
            return filterCriterion;
        }

        function executeCommand(cmd, arg) {
            doPagePostBack(cmd + ';' + arg);
        }

        var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
        var commandResources = new ZillionParts.CommandResources();

        commandManager.assign(dictationCommands);
        commandResources.assign({
            'work-item.assignment': { title: locfmt('{ris,Dictation_MoveToRadiologist}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'} }
        });

        var referralTypesList;

        // Register Resources.
        ZillionRis.Commands.RegisterResources(commandResources);

        function combineListFilter(customFilter, field, values, option) {
            if (values && values.length > 0) {
                var test = values.query();
                if (option == 'a') {
                    test.select('"' + field + '.qAny(function(x){return x==" + JSON.stringify(__items[__i]) + ";})"');
                } else {
                    test.select('("' + field + ' === " + JSON.stringify(__items[__i]))');
                }
                //                        var locCon = new ZillionParts.Condition();
                //                        locCon.type = 'or';
                //                        $.each(examinationTypes, function (i, a) { locCon.include('ExaminationTypeID === "' + a + '"'); });
                customFilter.include('(' + test.toArray().joinText(' || ') + ')');
            }
        }

        function createFilterFunc(filters) {
            return function(items) { return filters.filter(items); };
        }

        var receptionMenu = new ZillionParts.CommandList();
        with (receptionMenu) {
            add('order.order-information').executeWith('{ OrderID: OrderID }');
            if (window.permissions.hasEditOrderPermission) {
                add('order.edit-order').executeWith('{ OrderID: OrderID }').hideWhen('HousekeepingID');
            }
            add('work-item.assignment').executeWith('{ WorkItemID: WorkItemID }');
            if (window.pageConfig.enableSupervision) {
                add('supervision.req-supervision-before-dict').executeWith('{ WorkItemID: WorkItemID, SupervisorID: SupervisorID, BeforeDictation: true }').hideWhen('SupervisionTypeID == "WID" || SupervisionTypeID == "AUT"');
            }
            if (window.permissions.hasSendToHousekeepingPermission) {
                add('examination.send-to-housekeeping').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID }').hideWhen('HousekeepingID').hideWhen('HousekeepingID');
                add('examination.remove-from-housekeeping').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
            }
            //            add('examination.complication-form').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasComplicationForm');
            //            add('examination.indicator-form').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasIndicatorForm');
            //            add('examination.move-to-discussion').executeWith('ExaminationID');
            //            add('dictation.qanda').executeWith('{ExaminationID: ExaminationID}');
            //                getContextMenuItems: function (row) {
            //                    var items = [];
            //                    items.push({ text: locfmt('{ris,Worklist_Move}'), id: 'move-to-radiologist', iconClass: 'zillion-ris patients-icon contact-information' });
            //                    items.push({ text: locfmt('{ris,Worklist_DiscussionList}'), id: 'send-to-discussionlist', iconClass: 'zillion-ris patients-icon contact-information' });
            //                    if (row.HasQAForm) {
            //                        items.push({ text: locfmt('{ris,Worklist_QAForm}'), id: 'view-qaform', iconClass: 'zillion-ris examinations-icon q-and-a' });
            //                    }
            //                    if (row.HasIndicatorForm) {
            //                        items.push({ text: locfmt('{ris,Worklist_IndicatorForm}'), id: 'view-performance-indicator', iconClass: 'zillion-ris examinations-icon indication-form' });
            //                    }
            //                    if (row.HasRequestForm) {
            //                        items.push({ text: locfmt('{ris,Worklist_ExaminationRequest}'), id: 'view-requestform', iconClass: 'zillion-ris orders-icon request-form' });
            //                    }
            //                    items.push({ text: locfmt('{ris,CommandContactInformation}'), id: 'contact', iconClass: 'zillion-ris patients-icon contact-information' });
            //                    return items;
        }

        var dictationWorklistActions = new ZillionParts.CommandList();
        with (dictationWorklistActions) {
            if (window.permissions.hasFailsafePermission) {
                add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
            }
            add('examination.housekeeping-state').showWhen('HousekeepingID');
            add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, Title: locfmt("{ris,OrderDocumentsFor} {patient}", { patient: Patient }), HasStoredDocument: HasRequestForm }');
            add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
            add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
        }

        var locationFilter = {};

        var dataView = ZillionParts.Data.DataSet();
        var selection = new ZillionParts.Data.DataSelection();

        var dictationColumns = [];
        populateDictationColumns();

        function populateDictationColumns() {
            dictationColumns.push({
                fieldID: 'context-menu',
                title: '',
                friendlyName: 'Context Menu',
                dataType: 'context-menu',
                commands: { list: receptionMenu, manager: commandManager, resources: commandResources }
            });

            dictationColumns.push({
                fieldID: 'Selection',
                dataType: 'check',
                friendlyName: locfmt('{ris,SelectionColumn}'),
                getValue: function(d, item) {
                    return selection.hasKey(item.$key);
                },
                onChange: function(d, item) {
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
            });

            dictationColumns.push({ title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', renderText: false, commands: { manager: commandManager, resources: commandResources, list: dictationWorklistActions }, dataType: 'commands', width: 75 });
            dictationColumns.push({ title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'Scheduled', width: 110, dataType: 'scheduled-date', emphasis: 'date' });
            dictationColumns.push(
            {
                    title: locfmt('{ris,FieldPatientName}'),
                    fieldID: 'Patient',
                    filterFieldID: 'PatientNameFilter',
                    sortFieldID: 'PatientNameFilter',
                    dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null,
                    contactID: 'PatientID',
                    width: 200
            });
            dictationColumns.push({ title: locfmt('{ris,FieldExaminationType}'), fieldID: 'Description', width: 300 });
            dictationColumns.push({ title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 });
            dictationColumns.push({ title: locfmt('{ris,FieldExternalExamNumber}'), fieldID: 'ExternalExamNumber', width: 100 });
            dictationColumns.push({ title: locfmt('{ris,FieldExternalOrderNumber}'), fieldID: 'ExternalOrderNumber', width: 100 });
            dictationColumns.push({ title: locfmt('{ris,WorkItemType}'), fieldID: 'WorkItemType' });
            dictationColumns.push({ title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', width: 80 });
            dictationColumns.push({ title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technician' });
            dictationColumns.push({ title: locfmt('{ris,FieldRadiologist}'), fieldID: 'DictationRadiologist' });
            dictationColumns.push({ title: locfmt('{ris,FieldIntendedRadiologist}'), fieldID: 'IntendedReporter' });
            dictationColumns.push({ title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'RequesterName' });
            dictationColumns.push({ title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', dataType: 'magnify-text', width: 120 });
            if (window.pageConfig.showGridRequestTypeColumn) dictationColumns.push({ title: locfmt('{ris,FieldOrderType}'), fieldID: 'OrderTypeName', width: 80 });
            dictationColumns.push({ title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' });
            if (window.pageConfig.showGridPatientDelayedColumn) dictationColumns.push({ title: locfmt('{ris,FieldAppointmentEventIndicator}'), fieldID: 'DepartmentTime', dataType: 'scheduled-date' });
            dictationColumns.push({ title: locfmt('{ris,FieldCompletionEventIndicator}'), fieldID: 'CompletionTime', dataType: 'scheduled-date' });
            if (window.pageConfig.showGridRequestingLocationColumn) dictationColumns.push({ title: locfmt('{ris,FieldRequestingLocation}'), fieldID: 'RequestingLocation' });
            if (window.pageConfig.showGridPatientCategoryColumn) dictationColumns.push({ title: locfmt('{ris,FieldPatientCategory}'), fieldID: 'PatientCategory' });
            dictationColumns.push({ title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName' });
            dictationColumns.push({ title: locfmt('{ris,FieldSpecialty}'), fieldID: 'Specialty' });
            dictationColumns.push({ title: locfmt('{ris,FieldRoom}'), fieldID: 'RoomName' });
            dictationColumns.push({ title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber' });
        }
            
            var gridOptions = {
                dataView: dataView,
                selection: selection,
                keyField: 'ID',
                columnDefaults: {
                    allowFilter: true,
                    allowSort: true,
                    allowResize: true
                },
                onFilterCreated: function(filter) {
                    var customFilter = new ZillionParts.Condition();
                    customFilter.type = 'and';
                    customFilter.include(filter);

                    referralTypesList = Rogan.Ris.Locations.getReferralTypes().query().toArray();

                    var currentFilter = dictationWorkListVM.filters.selected();
                    if (currentFilter) {
                        combineListFilter(customFilter, 'RoomID', currentFilter.rooms);
                        combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                        combineListFilter(customFilter, 'RequestingLocationID', currentFilter.requesterLocations);
                        combineListFilter(customFilter, 'IntendedReporterID', currentFilter.intendedReporters);
                        combineListFilter(customFilter, 'DictationRadiologistID', currentFilter.radiologists);
                        combineListFilter(customFilter, 'SpecialtyID', currentFilter.specialisations);
                        combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);
                        combineListFilter(customFilter, 'ReferralTypeName', referralTypesList.filter(function (item) {
                            return ensureExists(currentFilter.referralTypes).indexOf(item.ID) !== -1;
                        }).qSelect('Name'));
                        if (window.pageConfig.enableSupervision) {
                            combineListFilter(customFilter, 'SupervisorID', currentFilter.supervisors);
                        }
                    }

                    if (dictationWorkListVM.locationID()) {
                        customFilter.include({ LocationID: dictationWorkListVM.locationID() });
                    }
                    if (dictationWorkListVM.roomID()) {
                        customFilter.include({ RoomID: dictationWorkListVM.roomID() });
                    }

                    return createFilterFunc(customFilter);
                },
                showFilterRow: true,
                onRowCreated: onItemCreated,
                createEmptyDataItem: createEmptyDataItem,
                columns: dictationColumns,
                sort: [
                    { "fieldID": "Scheduled", asc: true },
                    { "fieldID": "AccessionNumber", asc: true }
                ],
                onSorting: function(sort) {
                    // Forced sorting:
                    sort = sort.filter(function(x) { return x.fieldID !== 'UrgencySortIndex' && x.fieldID !== '_SortKey'; });
                    sort = [
                        { "fieldID": "UrgencySortIndex", asc: false }
                    ].concat(sort);
                    return sort;
                },
                itemdblclick: function(e, args) {
                    $('#OpenDictationButton').click();
                },
                itemclick: function (_, args) {
                    if (!selection.hasKey(args.item.$key)) {
                        selection.clear();
                        selection.add(args.item.$key);
                    }
                },
                handleSelection: false
            };
            if (window.pageConfig.enableSupervision){
                gridOptions.columns.push({ title: locfmt('{ris,FieldSupervisor}'), fieldID: 'Supervisor' });
            }
            selection.setMultiSelect(true);

            selection.onChange.subscribe(function() { $('#ExaminationsView').virtualDataGrid('refresh'); });

            function onItemCreated($element, data) {
                if (worklist === 'allusers' && data.DictationRadiologistID === window.currentUserID) {
                    $element.addClass('data-ignored').css({ opacity: 0.7, color: '#484' });
                }
                ZillionRis.AddUrgencyClasses($element, data.UrgencyID);
            }

            function createEmptyDataItem() {
                var examinations = dictationWorkListVM.gridOptions.dataView.getItems(true).length;
                if (examinations > 0) {
                    var foo = $('<span>' + locfmt('{ris,NoExaminationsFoundFilter}') + '<br />' + examinations + locfmt('{ris,ExaminationsInTotal}') + '<br /><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                    $('a', foo).click(function () {
                        clearWorkListFilter();
                    });
                    return foo;
                } else {
                    return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                }
            }

            /**********************/
            var dictationWorkListVM = new DictationWorkListViewModel();

            // Data bind.
            ko.applyBindings(dictationWorkListVM, $('#WorklistContainer')[0]);

            ZillionRis.WorkList.SelectionStore('#ExaminationsView', gridOptions, 'dictationworklist.examinations.selection');
            dictationWorkListVM.gridSettingsStore.initialize('#ExaminationsView', dictationWorkListVM.gridOptions, 'dictation-worklist', 'worklist-grid').loadSettings();
            //dictationWorkListVM.gridSettingsStore.loadSettings();

            createWorkListContextMenu();

            $('#OpenDictationButton').click(function() {
                var workItemId = dictationWorkListVM.gridOptions.selection.getKeys().qSingleOrNull();
                if (workItemId) {
                    openDictation(workItemId);
                }
            });

            function getUserDictationType() {
                return sessionStorage.getItem('dictationType');
            }
            function setUserDictationType(type) {
                sessionStorage.setItem('dictationType', type);
            }

            $('.btn-dictation-type').on('click', function() {
                var self = this;

                $('.btn-dictation-type').removeClass('checked');
                $(self).addClass('checked');
                setUserDictationType(getSelectedDictationType() || getDefaultDictationType());
            });
            $('#DictationMode').buttonset();

            $(function() {
                var updateFilter = function () {
                    $('#ExaminationsView').virtualDataGrid('updateFilter');
                    refresh();
                };
                dictationWorkListVM.filters.selected.subscribe(updateFilter);
                dictationWorkListVM.locationID.subscribe(updateFilter);
                dictationWorkListVM.roomID.subscribe(updateFilter);

                dictationWorkListVM.currentWorklist.subscribe(function(wl) {
                    window.sessionStorage['dictation.worklist'] = wl && wl.id;
                    worklist = wl && wl.id;
                    refresh();
                });

                dictationWorkListVM.loadSettings();
                dictationWorkListVM.loadFilters();
                bindWorkLists();

                ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);
                ZillionRis.SiteEvents.broadcast('lazy-page-update');

                initializeLocations();

                Rogan.Ris.Locations.ensure();
                Rogan.Ris.Specialisations.ensure();

                setSelectedDictationType(getUserDictationType());

                // UI initialization done, apply resize methods.

                dictationWorkListVM.refresh();

                ConnectSpeechMike(function(button) {
                    var idx, items, gridSelection, selectedKeys;

                    if (button.action === 'Function1' && button.pressed) {
                        setSelectedDictationType(getDefaultDictationType());
                        $('#OpenDictationButton').click();
                    } else if (button.action === 'Function2' && button.pressed) {
                        gridSelection = dictationWorkListVM.gridOptions.selection;
                        selectedKeys = gridSelection.getKeys();
                        items = dictationWorkListVM.gridOptions.dataView.getItems(false);
                        idx = items.qSelect('{ ID: $key, Index: $index }').qWhere('ID === $params', selectedKeys[0]).qSelect('Index').qFirst() | 0;
                        gridSelection.clear();
                        gridSelection.add(items[(idx + 1) % items.length].$key);
                    } else if (button.action === 'Function3' && button.pressed) {
                        gridSelection = dictationWorkListVM.gridOptions.selection;
                        selectedKeys = gridSelection.getKeys();
                        items = dictationWorkListVM.gridOptions.dataView.getItems(false);
                        idx = items.qSelect('{ ID: $key, Index: $index }').qWhere('ID === $params', selectedKeys[0]).qSelect('Index').qFirst() | 0;
                        if (--idx < 0) {
                            idx = items.length - 1;
                        }
                        gridSelection.clear();
                        gridSelection.add(items[idx].$key);
                    }
                });
            });

            function bindWorkLists() {
                var userName = window['currentUserName'] || 'Current User';
                var enableGeneralWorklist = window.pageConfig.enableGeneralWorklist;

                dictationWorkListVM.worklists.push({ id: 'currentuser', name: userName, dictationFilter: 'allitems' });

                if (enableGeneralWorklist) {
                    dictationWorkListVM.worklists.push({ id: 'general', name: locfmt('{ris,Worklist_GeneralTitle}'), dictationFilter: 'allitems' });
                }

                if (window.pageConfig.showExternalUsersWorkList) {
                    dictationWorkListVM.worklists.push({ id: 'external', name: locfmt('{ris,Worklist_AllExternalUsersTitle}'), dictationFilter: 'currentuseritems' });
                }

                window.pageConfig.worklists.qEach(function(customWorklist) {
                    dictationWorkListVM.worklists.push({ id: customWorklist.ID, name: customWorklist.Name, contentProvider: customWorklist.ContentProvider, dictationFilter: customWorklist.DictationFilter });
                });

                var previousWorklist = window.sessionStorage['dictation.worklist'],
                    currentWorklist = null;

                if (previousWorklist) {
                    currentWorklist = dictationWorkListVM.worklists().qWhere(function(x) { return x.id == previousWorklist; }).qFirst();
                }

                if (!currentWorklist && enableGeneralWorklist && window.currentWorklist && window.currentWorklist == 'General') {
                    currentWorklist = dictationWorkListVM.worklists().qWhere('id == "general"').qFirst();
                }

                dictationWorkListVM.currentWorklist(currentWorklist || dictationWorkListVM.worklists().qFirst());
            }

            function initializeLocations() {
                // Subscribe to location data changes.
                Rogan.Ris.Locations.onChanged.subscribe(function(e, service) {
                    var locations = service.getLocations().map(function(a) { return { id: a.ID, displayName: a.Name, description: a.Description }; });
                    var rooms = service.getRooms().map(function(a) { return { id: a.ID, displayName: '[' + a.Name + '] ' + a.Description, description: a.Description, location: a.LocationID }; });

                    dictationWorkListVM.locationSource.locations(locations);
                    dictationWorkListVM.locationSource.allRooms(rooms);
                });

                Rogan.Ris.Locations.ensure();
            }

            function getSelectedDictationType() {
                if ($('#DigitalDictationButton').hasClass('checked')) {
                    return "DIG";
                } else if ($('#InteractiveDictationButton').hasClass('checked')) {
                    return "INT";
                } else if ($('#TextDictationButton').hasClass('checked')) {
                    return "TXT";
                }
                return null;
            }

            function setSelectedDictationType(type) {
                var map = {
                    'INT': '#InteractiveDictationButton',
                    'TXT': '#TextDictationButton',
                    'DIG': '#DigitalDictationButton'
                };

                $(map[type] || map[getDefaultDictationType()]).click();
            }

            function openDictation(workItemID) {
                var worklistType = dictationWorkListVM.currentWorklist().id;

                // The supervision worklist has no dictation type buttons visible, so in that case there is no selected dictation type.
                var dictationType = worklistType == 'supervision' ? null : getSelectedDictationType() || getDefaultDictationType();

                // Grab the work items to be dictated.
                var currentUserID = window.currentUserID;
                var items;
                var dictationfilter = dictationWorkListVM.currentWorklist().dictationFilter;
                switch (dictationfilter) {
                    case 'allitems':
                        items = dictationWorkListVM.gridOptions.dataView.getItems(false);
                        break;
                    case 'currentuseritems':
                        items = dictationWorkListVM.gridOptions.dataView.getItems(false)
                            .qWhere(function(x) {
                                return x.IntendedReporterID === currentUserID &&
                                ((x.DictationRadiologistID == null || x.DictationRadiologistID === currentUserID) || x.SpeechStatusID === "CAN");
                            });
                        break;
                    default:
                        throw new Error('Type of worklist not implemented for starting dictation: ' + worklistType);
                }

                if (items && items.length > 0) {
                    items = items.qSelect('{ WorkItemID: WorkItemID }');

                    // the indexOf needs the workItemID as number not string (the + is necessary)
                    var startIndex = items.qSelect('WorkItemID').indexOf(+workItemID);
                    if (startIndex == -1) {
                        startIndex = 0;
                    }

                    startDictationList(items, startIndex, dictationType, worklistType);
                }
            }

            /**********************/

            function clearPatientDetails() {
                $('#PatientDetails').html(locfmt('{ris,Imaging_NoPatientSelected}'));
            }

            var aaa = null;
            var updateHistoryCore = function() {
                if (aaa !== null) {
                    clearTimeout(aaa);
                }

                var key = selection.getKeys().qFirst();
                if (key) {
                    var data = dataView.getItemByKey(key);
                    if (data) {
                        ZillionRis.LoadPatientBanner(data.PatientID);
                    }
                } else {
                    clearPatientDetails();
                }
            };
            var updateHistory = function() {
                if (aaa !== null) {
                    clearTimeout(aaa);
                    aaa = null;
                }

                aaa = setTimeout(updateHistoryCore, 100);
                var keys = selection.getKeys();
                var key = keys.qFirst();
                var buttonPropertiesA = { disabled: true };
                var buttonPropertiesB = { disabled: true };

                if (keys.length <= 1) {
                    if (key) {
                        var data = dataView.getItemByKey(key);
                        if (data) {
                            if (dictationWorkListVM.currentWorklist().dictationFilter === 'allitems' ||
                                data.IntendedReporterID === window.currentUserID) {
                                // Disable the button if the examination is in housekeeping
                                if (!data.HousekeepingID) {
                                    buttonPropertiesB.disabled = false;
                                }
                            }
                        }
                    }

                    buttonPropertiesA.disabled = false;
                }

                $('.btn-dictation-type').attr(buttonPropertiesA);
                $('#OpenDictationButton').attr(buttonPropertiesB);
            };

            selection.onChange.subscribe(updateHistory);

            var allowCache = true;

            $.extend(true, window,
            {
                worklistOptions: gridOptions,
                worklistRefresh: refresh,
                statusChangeCallback: statusChangeCallback
            });

            function statusChangeCallback(s, e) {
                if (e && 'errorMessage' in e && e.errorMessage != '') {
                    alert(e.errorMessage);
                } else {
                    refresh();
                }
            }

            var worklist = 'currentuser';
            var lastXhr = null;

            var check = 0,
                refreshTh = {
                    delay: 300
                };

            function refresh() {
                var c = ++check;

                throttle(refreshTh, function() {
                    clearPatientDetails();
                    dictationWorkListVM.isLoading(true);

                    if (lastXhr) {
                        lastXhr.abort();
                    }

                    if (worklist) {
                        var selectedWorklist = dictationWorkListVM.currentWorklist();

                        var selectedFilter = dictationWorkListVM.filters.selected();

                        var dateRange = 0;
                        if (selectedFilter && selectedFilter.dateRange) {
                            dateRange = selectedFilter.dateRange;
                        }

                        var startDate = null;
                        if (selectedFilter && selectedFilter.startDate) {
                            startDate = moment(selectedFilter.startDate).startOf('day').toDate();
                        }

                        var endDate = null;
                        if (selectedFilter && selectedFilter.endDate) {
                            endDate = moment(selectedFilter.endDate).endOf('day').toDate();
                        }

                        var worklistUri = selectedWorklist.contentProvider || 'module://dictation/data/workitems';
                        lastXhr = Modules.ContentProvider(worklistUri, 'query', { WorkList: worklist, StartDate: startDate, EndDate: endDate, DateRange: dateRange });
                        lastXhr.then(function(data) {
                                if (c === check) {
                                    try {
                                        //Try to throttle the items coming in. Check how many items are in data and split it, set the first amount and load the others as we go.                                                                                                                                                                
                                        dataView.setItems(data, 'WorkItemID');
                                        dataView.refresh();


                                        $('#ExaminationsView').virtualDataGrid('refresh');

                                        if (selection.getKeys().length === 0 && dataView.getItems().length !== 0) {
                                            selection.add(dataView.getKeyByIdx(0));
                                        }

                                        //set the view details enable/disable
                                        var key = selection.getKeys().qFirst();
                                        var buttonPropertiesB = { disabled: true };
                                        var item = dataView.getItemByKey(key);
                                        if (item) {
                                            if (dictationWorkListVM.currentWorklist().dictationFilter === 'allitems' || item.IntendedReporterID === window.currentUserID) {
                                                if (!item.HousekeepingID) {
                                                    buttonPropertiesB.disabled = false;
                                                }
                                            }
                                        }
                                        $('#OpenDictationButton').attr(buttonPropertiesB);

                                    } catch (ex) {

                                    }
                                }
                            }, function(h) {
                                if (c === check) {
                                    ris.notify.showError('Dictation Worklist Error', 'An error occurred while retrieving dictation worklist.<br/><br/>Details:<br/>' + h.message);
                                }
                            }).always(function() {
                                if (c === check) {
                                    dictationWorkListVM.isLoading(false);
                                }
                            });
                    } else {
                        dataView.setItems([], 'WorkItemID');
                        dataView.refresh();

                        dictationWorkListVM.isLoading(false);
                    }

                    allowCache = false;
                });
            }

            function clearWorkListFilter() {
                $('#ExaminationsView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                dictationWorkListVM.filters.selectedID(null);
                dictationWorkListVM.locationSource.resetLocation();
            }

            function editWorkListUserSettings() {
                $('#ExaminationsView').customizeVirtualDataGrid();
            }

            function createWorkListContextMenu() {
                var configurationMenu = $('<input id="GridConfigurationButton" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                                refresh();
                            } else if (item.id == 'clear-filter') {
                                clearWorkListFilter();
                            } else if (item.id == 'configure') {
                                editWorkListUserSettings();
                            } else if (item.id == 'reset') {
                                dictationWorkListVM.resetSettings();
                                clearWorkListFilter();
                            }
                        }
                    });
                    var find = $('#WorklistContainer').find('.ui-group-panel-header');

                configurationMenu.appendTo(find);
            }

            function LocationFilterViewModel() {
                var self = this;

                this.locations = ko.observable([]);
                this.rooms = ko.observable([]);
                this.allRooms = ko.observable([]);
                this.currentLocation = ko.observable(null);
                this.currentRoom = ko.observable(null);
                this.enableRooms = ko.computed(function() {
                    return !!self.rooms().length;
                });

                this.resetLocation = function() { this.currentLocation(null); };
                this.resetRoom = function() { this.currentRoom(null); };

                this.currentLocation.subscribe(function(location) {
                    if (location) {
                        var allRooms = self.allRooms();
                        self.rooms(allRooms.qWhere('location === ' + location.id + ''));

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

            function DictationWorkListViewModel() {
                var self = this;

                this.title = ko.observable(locfmt('{ris,Worklist_DictationWorkList}'));
                this.locationSource = new LocationFilterViewModel();
                this.roomID = new ko.observable(null);
                this.locationID = new ko.observable(null);
                this.filters = new ZillionRis.FilterList();
                this.filters.filterType = 'dictation-filter';

                this.worklists = ko.observableArray([]);
                this.currentWorklist = ko.observable(null);

                this.locationSource.currentLocation.subscribe(function(location) {
                    self.locationID(location && location.id);
                    self.roomID(null);
                });
                this.locationSource.currentRoom.subscribe(function(room) {
                    self.roomID(room && room.id);
                });

                this.gridOptions = gridOptions;
                this.dataView = gridOptions.dataView;
                this.dataView.onUpdated.subscribe(function() {
                    self.title(locfmt('{ris,Worklist_DictationWorkList}') + ' (' + self.dataView.getItems().length + '/' + self.dataView.getItems(true).length + ')');
                });

                this.selectedItem = ko.observable();
                this.selectedItems = ko.observable();

                // Multiple selection, used for: move to radiologist, assign supervisor
                this.hasMultiSelection = ko.computed(function() {
                    var selectedItems = self.selectedItems();
                    return selectedItems && selectedItems.length > 1;
                });

                this.addSupervisorButtonDisabled = ko.computed(function() {
                    var selectedItems = self.selectedItems();
                    return selectedItems && selectedItems.length > 1 && selectedItems.qAny('SupervisionTypeID == "WID" || SupervisionTypeID == "AUT"');
                });

                this.addSupervisorButtonToolTip = ko.computed(function () {
                    return self.addSupervisorButtonDisabled() ? locfmt('{ris,Worklist_AddSupervisorButtonTooltip}') : null;
                });
                
                this.showDictationTypes = ko.computed(function() {
                    var currentWorklist = self.currentWorklist();
                    return currentWorklist && currentWorklist.id != "supervision";
                });

                this.showDigitalDictation = ko.observable(window.pageConfig.showDigitalDictation);

                this.addSupervisorToSelection = function() {
                    var items = self.selectedItems();
                    var workItemIDs = items.qSelect('WorkItemID');
                    commandManager.execute('supervision.req-supervision-before-dict', { WorkItemIDs: workItemIDs });
                };
                this.clearSelection = function() {
                    selection.clear();
                };
                this.moveSelection = function() {
                    var items = self.selectedItems();
                    var workItemIDs = items.qSelect('WorkItemID');
                    commandManager.execute('work-item.assignment', { WorkItemIDs: workItemIDs });
                };
                this.showConfiguration = function() {
                    Modules.Activity('module://dictation/view/dictation-configuration', { requires: ["ris.dictation"] });
                };

                $('#ConfigurationDialog').dialog({
                    modal: true,
                    autoOpen: false,
                    minWidth: 600,
                    width: 960,
                    height: 'auto',
                    buttons: [
                        { text: locfmt('{ris,Dictation_Close}'), click: function() { $(this).dialog("close"); } }
                    ]
                }).dialog('widget').appendTo('#aspnetForm');

                this.isLoading = ko.observable(false);
                this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

                this.reset = function() {
                    this.filters.selectedID(null);
                };
                this.clear = function() {
                    this.filters.selectedID(null);
                };

                this.refresh = function() {
                    refresh();
                };

                this.showOverview = function() {
                    $('#RadiologistTaskInfo').pageSubNav('show');
                };

                this.viewCompletedExaminations = function() {
                    ZillionRis.LastAccessedShowSubNav();
                };

                this.openTasksOverview = function () {
                    window.RadiologistDashBoard.Open(getSelectedDictationType());
                };

                $('#OverviewTasksButton').text(locfmt('{ris,TasksOverview}'));

                var isLoading = false;
                var hasLoaded = false;
                this.loadSettings = function() {
                    ZillionRis.UserSettings.get('dictation', 'settings')
                        .then(function(data) {
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
                this.resetSettings = function() {
                    this.gridSettingsStore.resetSettings();
                };
                this.saveSettings = function() {
                    ZillionRis.UserSettings.set('dictation', 'settings', {
                        filter: self.filters.selectedID()
                    });
                };
                this.customizeFilter = function() {
                    $('#FilterDialog').pageSubNav('show');
                };

                var update = ZillionParts.Delay(function() {
                    if (isLoading === false && hasLoaded === true) {
                        self.saveSettings();
                    }
                }, 1000, true);
                this.locationID.subscribe(update);
                this.roomID.subscribe(update);
                this.filters.selected.subscribe(update);

                this.loadFilters = function() {
                    this.filters.loadFilters();
                };

                this.reset();
            }

            /// Dictation  Work List Filter Editing.
            $(function() {

                function DictationFilterViewModel() {
                    this.originalName = '';
                    this.name = new ko.observable();

                    this.intendedReporters = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.intendedReporters.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                        queryParameters: { AssignmentPermission: 'Reporter' },
                        projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
                    });

                    this.radiologists = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.radiologists.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                        queryParameters: { AssignmentPermission: 'Reporter' },
                        projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
                    });

                    this.supervisors = new ZillionRis.Filters.ObjectSelectionViewModel();
                    if (window.pageConfig.enableSupervision) {
                        this.supervisors.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                            queryParameters: { AssignmentPermission: 'Reporter' },
                            projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
                        });
                    } else {
                        this.supervisors.source = new ZillionRis.Filters.ObjectSourceModules();
                    }

                    this.modalityTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.modalityTypes.source = new ZillionRis.Filters.ObjectSourceLocations('modalityTypes');

                    this.rooms = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.rooms.source = new ZillionRis.Filters.ObjectSourceLocations('rooms');

                    this.requesterLocations = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.requesterLocations.source = new ZillionRis.Filters.ObjectSourceLocations('requesterLocations');

                    this.specialisations = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.specialisations.source = new ZillionRis.Filters.ObjectSourceLocations('specialisations', true);

                    this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                        projector: '{ id: ID, label: Name, value: Name }'
                    });

                    this.referralTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
                    this.referralTypes.source = new ZillionRis.Filters.ObjectSourceLocations('referralTypes');

                    var self = this;
                    this.dateRange = new ko.observable(null);
                    this.startDate = new ko.observable(null);
                    this.endDate = new ko.observable(null);
                    this.dateRange.subscribe(function() {
                        var dateRangevalue = parseInt(self.dateRange());
                        if (isNaN(dateRangevalue)) {
                            self.dateRange(null);
                        } 
                        else if (dateRangevalue != null) {
                            self.dateRange(dateRangevalue);
                            self.startDate(null);
                            self.endDate(null);
                        }
                    });
                    this.startDate.subscribe(function() {
                        if (self.startDate() != null)
                            self.dateRange(null);
                    });
                    this.endDate.subscribe(function() {
                        if (self.endDate() != null)
                            self.dateRange(null);
                    });

                    this.itemAdded = function(elem) {
                        if (elem.nodeType === 1) {
                            $(elem).show('highlight', 'slow');
                        }
                    };
                }

                var filterEditor = new ZillionRis.FilterEditor();
                filterEditor.filterFactory = function() {
                    return new DictationFilterViewModel(filterEditor);
                };
                filterEditor.filterSave = function(a) {
                    return {
                        originalName: a.originalName,
                        name: a.name(),

                        intendedReporters: a.intendedReporters.list().qSelect('id'),
                        radiologists: a.radiologists.list().qSelect('id'),
                        supervisors: a.supervisors.list().qSelect('id'),
                        modalityTypes: a.modalityTypes.list().qSelect('id'),
                        rooms: a.rooms.list().qSelect('id'),
                        requesterLocations: a.requesterLocations.list().qSelect('id'),
                        specialisations: a.specialisations.list().qSelect('id'),
                        urgencies: a.urgencies.list().qSelect('id'),
                        referralTypes: a.referralTypes.list().qSelect('id'),
                        startDate: a.startDate(),
                        endDate: a.endDate(),
                        dateRange: a.dateRange()
                    };
                };
                filterEditor.filterLoad = function(a, b) {
                    a.originalName = b.originalName;
                    a.name(b.name);

                    a.intendedReporters.set(b.intendedReporters);
                    a.radiologists.set(b.radiologists);
                    a.supervisors.set(b.supervisors);
                    a.modalityTypes.set(b.modalityTypes);
                    a.rooms.set(b.rooms);
                    a.requesterLocations.set(b.requesterLocations);
                    a.specialisations.set(b.specialisations);
                    a.urgencies.set(b.urgencies);
                    a.referralTypes.set(ensureExists(b.referralTypes));
                    a.startDate(b.startDate);
                    a.endDate(b.endDate);
                    a.dateRange(b.dateRange);
                };

                filterEditor.filterType = 'dictation-filter';
                filterEditor.notificationTitle = locfmt('{ris,Worklist_DictationWorkListFilter}');
                filterEditor.subject = 'dictation';

                filterEditor.close = function() {
                    $('#FilterDialog').pageSubNav('hide');
                };

                ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

                // show(): Filter dialog div is hidden at startup.
                $('#FilterDialog').show().pageSubNav({
                    close: function() { dictationWorkListVM.loadFilters(); },
                    open: function() {
                        filterEditor.openFilterName = dictationWorkListVM.filters.selectedID();
                        filterEditor.load();
                    }
                });
            });
    });

    function startDictationList(items, startIndex, dictationType, worklistType) {
        ZillionRis.Dictation.CheckIfDictationCanBeOpened(dictationType).then(function() {
                var worklistItemIds = items.qSelect('WorkItemID');
                Dictation.worklist.setContents({
                    dictationType: dictationType,
                    worklistType: worklistType,
                    items: worklistItemIds.slice(startIndex, worklistItemIds.length)
                        .concat(worklistItemIds.slice(0, startIndex))
                });

                ZillionRis.Navigate({ page: 'p/dictation/#!?p=' + items[startIndex].WorkItemID });
            },
            function(error) {
                ZillionRis.Confirmation({
                    title: locfmt('{ris,Dictation_Cannot_Be_Opened}'),
                    content: error.message,
                    buttons: 'ok'
                });
            });
    }
})(jQuery);