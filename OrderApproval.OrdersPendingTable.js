(function ($, window, undefined) {

    $(function () {

        var commandManager = OrderApproval.CommandManager;
        var commandResources = OrderApproval.CommandResources;

        var ordersPendingViewModel = new OrdersPendingViewModel();
        var check = 0;

        function createOrdersPendingController() {
            var referralTypesList;

            var ordersPendingMenu = new ZillionParts.CommandList();
            with (ordersPendingMenu) {
                if (window.permissions.hasPatientContactInfoPermission) {
                    add('patient.contact-information').executeWith('{ PatientID: PatientID }');
                }
            }

            var ordersPendingActions = new ZillionParts.CommandList();
            with (ordersPendingActions) {
                add('order.open-memo').executeWith('{ HasMemo: HasMemo, ID: OrderID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForm }');
                if (window.permissions.hasEditOrderPermission) {
                    add('order.edit-order').executeWith('{ OrderID: OrderID }');
                }
                add('order.change-urgency').executeWith('{ OrderID: OrderID }');
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'OrderID',
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: ordersPendingMenu, manager: commandManager, resources: commandResources} },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', commands: { manager: commandManager, resources: commandResources, list: ordersPendingActions }, dataType: 'commands', width: 140 },
                    { title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber' },
                    { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 110 },
                    {
                        title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200,
                        dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null, contactID: 'PatientID'
                    },
                    { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' },
                    { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', width: 80 },
                    { title: locfmt('{ris,FieldIntendedVetters}'), fieldID: 'IntendedVetterName', width: 200, createFilterMethod: function (val) { var regex = ZillionParts.Data.WildCardToRegex('*' + val); return regex; }, dataType: 'contact', contactID: 'IntendedVetterPersonID' },
                    { title: locfmt('{ris,FieldExternalOrderNumber}'), fieldID: 'ExternalOrderNumber', width: 140 },
                    { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName' },
                    { title: locfmt('{ris,FieldSpecialty}'), fieldID: 'RequesterSpecialisationName' }
                ],
                sort: [
                    { "fieldID": "OrderNumber", asc: true }
                ],
                gridOptions: {
                    onRowCreated: postProcessOrdersPendingItem,
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

                        referralTypesList = Rogan.Ris.Locations.getReferralTypes().query().toArray();

                        var currentFilter = ordersPendingViewModel.filters.selected();
                        if (currentFilter) {
                            combineListFilter(customFilter, 'RequesterLocationID', currentFilter.requesterLocations);
                            combineListFilter(customFilter, 'RequesterSpecialisationID', currentFilter.specialisations);
                            combineListFilter(customFilter, 'ReferralTypeName', referralTypesList.filter(function (item) {
                                return ensureExists(currentFilter.referralTypes).indexOf(item.ID) !== -1;
                            }).qSelect('Name'));
                            combineListFilter(customFilter, 'ResponsibleRequestingPhysicianID', currentFilter.requestingResponsibleConsultants);
                            combineListFilter(customFilter, 'IntendedVetterID', currentFilter.intendedVetters);
                            combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);
                        }

                        return createFilterFunc(customFilter);
                    }
                }
            });


            function createEmptyDataItem() {
                var orders = ordersPendingDataView.getItems(true).length;
                if (orders > 0) {
                    var foo = $('<span>' + locfmt('{ris,NoOrdersFoundFilter}') + '<br />' + orders + locfmt('{ris,OrdersInTotal}') + '<br/><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                    $('a', foo).click(function () {
                        ordersPendingViewModel.clearFilter();
                    });
                    return foo;
                } else {
                    return $('<span>' + locfmt('{ris,NoOrdersFound}') + '</span>');
                }
            }

            return gridController.create();
        }

        function ensureExists(filterCriterion) {
            if (filterCriterion === null || filterCriterion === undefined) {
                return [];
            }
            return filterCriterion;
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

        function postProcessOrdersPendingItem(item, data) {
            ZillionRis.AddUrgencyClasses(item, data.UrgencyID);

            item.dblclick(function (e) {
                if (window.permissions.hasEditOrderPermission) {
                    ZillionRis.CommandManager.execute('order.edit-order', { OrderID: data.OrderID });
                }
            }).disableSelection();
        }

        var totalItemCount = 0;
        var commandButtonClicked = false;
        var ordersPendingGridOptions = ordersPendingViewModel.gridOptions;
        var ordersPendingDataView = ordersPendingGridOptions.dataView;
        var ordersPendingSelection = ordersPendingGridOptions.selection;
        var delayUpdate = ZillionParts.Delay(updateFromOrdersPendingSelection, 100);
        ordersPendingSelection.onChange.subscribe(delayUpdate);
        ordersPendingSelection.setMultiSelect(false);

        $(function () {
            ordersPendingViewModel.currentWorklist.subscribe(function() {
                refresh();
            });

            bindWorkLists();

            function bindWorkLists() {
                var userName = window['currentUserName'] || 'Current user';
                ordersPendingViewModel.worklists.push({ id: 'currentuser', name: userName });
                ordersPendingViewModel.worklists.push({ id: 'allusers', name: locfmt('{ris,Worklist_AllUsersTitle}') });

                var requestedWorklist = window.sessionStorage['orderApproval.worklist'],
                    currentWorklist;

                if (requestedWorklist) {
                    currentWorklist = ordersPendingViewModel.worklists().qWhere(function(x) { return x.id === requestedWorklist; }).qFirst();
                    window.sessionStorage['orderApproval.worklist'] = '';
                } else {
                    currentWorklist = ordersPendingViewModel.worklists()[1];
                }

                ordersPendingViewModel.currentWorklist(currentWorklist);
            }

            ordersPendingViewModel.filters.selected.subscribe(function () {
                $("#OrdersPendingView").virtualDataGrid('updateFilter');
                $("#OrderExaminationsView").virtualDataGrid('updateFilter');
                $("#PatientHistoryView").virtualDataGrid('updateFilter');
            });

            ordersPendingViewModel.grid = $("#OrdersPendingView");

            $('#OrdersPendingPanel').groupPanel({ toolBar: $("#ApprovalToolBar") });

            ko.applyBindings(ordersPendingViewModel, $("#OrdersPendingPanel")[0]);
            ko.applyBindings(ordersPendingViewModel, $("#ApprovalToolBar")[0]);

            ordersPendingViewModel.gridSettingsStore.initialize('#OrdersPendingView', ordersPendingViewModel.gridOptions, 'orderApproval', 'orderApproval-worklist').loadSettings();

            Rogan.Ris.Locations.ensure();
            Rogan.Ris.Specialisations.ensure();

            createOrdersPendingContextMenu();

            ordersPendingViewModel.refresh();

            var idx = 0;
            ordersPendingSelection.onChange.subscribe(function (s, e) {
                if (e.type === ZillionParts.Data.DataSelection.Added) {
                    var sel = ordersPendingSelection.getKeys()[0];
                    idx = ordersPendingDataView.getIdxByKey(sel) | 0;
                }
            });
            ordersPendingDataView.onUpdated.subscribe(function () {
                var sel = ordersPendingSelection.getKeys()[0];
                if (!sel) {
                    var item = ordersPendingDataView.getItemByIdx(idx);
                    if (item) {
                        ordersPendingSelection.add(item.$key);
                    }
                }
            });

            ordersPendingViewModel.loadSettings();
            ordersPendingViewModel.loadFilters();

            ZillionParts.GridView.Behaviors.RestrictToDataSet({ dataView: ordersPendingDataView, selection: ordersPendingSelection, gridView: '#OrdersPendingView' });
            ZillionParts.GridView.Behaviors.ForceSingleSelect({ dataView: ordersPendingDataView, selection: ordersPendingSelection, gridView: '#OrdersPendingView' });

            $('#OrdersPendingView').on('click', '.command-button', function() {
                commandButtonClicked = true;
            });
        });

        function updateFromOrdersPendingSelection() {
            var key = getSelectedOrdersPendingKey();
            var data;
            if (key) {
                data = ordersPendingDataView.getItemByKey(key);
            }

            if (data) {
                if (window.viewerOpened === true && window.viewerOpenedForPatientId && window.viewerOpenedForPatientId !== data.PatientID) {
                    ZillionRis.ImageViewer().clear();
                    window.viewerOpened = false;
                }

                if (window.pageConfig.AutoShowRequestForm && !window.AssignProtocolCounter && !commandButtonClicked) {
                    ZillionRis.CommandManager.execute('stored-documents.popup-close-or-clear');
                    ZillionRis.CommandManager.execute('stored-documents.view', { Source: 'urn:order:' + key, AutoOpen: 'urn:requestform:*', PreferPopup: true });
                }

                ZillionRis.LoadPatientBanner(data.PatientID);
                window.refreshOrdersExamination();
                loadPatientHistory(data.PatientID);
            } else {
                ZillionRis.LoadPatientBanner(0);
                window.refreshOrdersExamination();
                loadPatientHistory(0);

                if (window.viewerOpened === true) {
                    ZillionRis.ImageViewer().clear();
                    window.viewerOpened = false;
                }
            }

            commandButtonClicked = false;
        }

        window.getSelectedOrdersPendingKey = getSelectedOrdersPendingKey;
        function getSelectedOrdersPendingKey() {
            return ordersPendingSelection.getCount() === 1 ? ordersPendingSelection.getKeys()[0] : null;
        }

        window.getSelectedPatientID = getSelectedPatientID;
        function getSelectedPatientID() {
            var orderID = getSelectedOrdersPendingKey();
            if (orderID) {
                var data = ordersPendingDataView.getItemByKey(orderID);
                if (data) {
                    return data.PatientID;
                }
            }
            return 0;
        }

        function createFilterFunc(filters) {
            return function (items) { return filters.filter(items); };
        }

        function refresh() {
            ordersPendingViewModel.isLoading(true);

            var selectedFilter = ordersPendingViewModel.filters.selected();
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

            var modalityTypeIDs = null;
            if (selectedFilter && selectedFilter.modalityTypes) {
                modalityTypeIDs = selectedFilter.modalityTypes;
            }

            var worklist = ordersPendingViewModel.currentWorklist() && ordersPendingViewModel.currentWorklist().id;

            var c = ++check;
            return Modules.ContentProvider('module://workflow/data/orderapprovalworklist', 'query', {
                Worklist: worklist,
                StartDate: startDate,
                EndDate: endDate,
                DateRange: dateRange,
                ModalityTypeIDs: modalityTypeIDs
            }).then(function (model) {
                var data = model.items;
                totalItemCount = model.metadata.totalItemCount;
                if (c === check) {
                    if (data) {
                        if (data.type == 'error') {
                            if (data.data && data.data['message']) {
                                ris.notify.showError('Failed to load the worklist', data.data.message);
                            } else {
                                ris.notify.showError('Failed to load the worklist', 'Failed to load the worklist, use filters to get a part of the worklist. Recommended filters: Date range, Modality type.');
                            }
                        } else {
                            ordersPendingViewModel.gridOptions.dataView.setItems(data, 'OrderID');
                            ordersPendingViewModel.gridOptions.dataView.refresh();
                        }
                    } else {
                        ris.notify.showError('Failed to load the worklist', 'Failed to load the worklist, use filters to get a part of the worklist. Recommended filters: Date range, Modality type.');
                    }
                }
            }, function (data) {
                if (c === check) {
                    if (data && data['error']) {
                        ris.notify.showError('Failed to load the worklist', data['message']);
                    } else {
                        ris.notify.showError('Failed to load the worklist', 'Failed to load the worklist, use filters to get a part of the worklist. Recommended filters: Date range, Modality type.');
                    }
                }
            }).always(function () {
                if (c === check) {
                    ordersPendingViewModel.isLoading(false);
                }
            });
        }
        ZillionRis.SiteEvents.subscribe('lazy-page-update', function(sender, args) {
            ordersPendingViewModel.refreshGrids().then(function() {
                if (args && args.source === 'assign-protocol' && args.action === 'close') {
                    var item = args.orderID && ordersPendingDataView.getItemByKey(args.orderID);
                    if (item) {
                        ordersPendingSelection.add(args.orderID);
                    } else {
                        updateFromOrdersPendingSelection();
                    }
                }
            });
        });

        function waitForDataViewUpdate(dataView, maxWaitInMs) {

            var d = $.Deferred();
            var onUpdatedSubscription;
            var timeoutID;

            onUpdatedSubscription = dataView.onUpdated.subscribe(function () {
                onUpdatedSubscription.unsubscribe();
                window.clearTimeout(timeoutID);
                d.resolve();
            });

            timeoutID = window.setTimeout(function () {
                onUpdatedSubscription.unsubscribe();
                d.reject({ message: 'Worklist retrieval took more than ' + (maxWaitInMs / 1000) + ' seconds.' });
            }, maxWaitInMs)

            return d.promise();
        }

        $.extend(true, window, {
            OrderApproval: {
                createWorklist: function (getItemIdsFunction, firstExaminationId, options) {
                    var gridOptions = ordersPendingViewModel.gridOptions;
                    var selectedOrderId = gridOptions.selection.getKeys()[0];
                    var selectedOrder = selectedOrderId && gridOptions.dataView.getItemByKey(selectedOrderId, false);

                    return new Worklist.GridWorklist({
                        gridOptions: gridOptions,
                        scoringCriteria: ['PatientID'],
                        refreshGridFunction: function() {
                            ordersPendingViewModel.refreshGrids();
                            return waitForDataViewUpdate(gridOptions.dataView, 10000);
                        },
                        getItemIdsFunction: getItemIdsFunction,
                        firstItemGroup: selectedOrder,
                        firstItemId: firstExaminationId,
                        isSingleItem: options && options.singleItem
                    });
                }
            }
        });


        function createOrdersPendingContextMenu() {
            var configurationMenu = $('<input type="button" id="OrderGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                            ordersPendingViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            ordersPendingViewModel.customizeView();
                        } else if (item.id == 'reset') {
                            ordersPendingViewModel.resetSettings();
                            ordersPendingViewModel.reset();
                        }
                    }
                });
            var find = $('#OrdersPendingPanel').groupPanel('widget').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        ordersPendingDataView.onUpdated.subscribe(function (e, data) {
            var foo = locfmt('{ris,Orders_Title}') + ' (' + ordersPendingDataView.getItems(false).length + '/' + totalItemCount +')';
            var foo2 = $('<span></span>');
            foo2.append('<span>' + foo + '</span>');
            $('#OrdersPendingPanel').groupPanel({ title: foo2 });
        });

        function OrdersPendingViewModel() {
            var self = this;

            this.gridOptions = createOrdersPendingController();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.worklists = ko.observableArray([]);
            this.currentWorklist = ko.observable(null);

            this.selectedItem = new ko.observable();
            this.isLoading = new ko.observable(false);

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'orderapproval-filter';

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
                this.filters.selectedID(null);
            };

            this.refreshGrids = function () {
                // update the rest of the page just in case the selection does not change after refresh
                updateFromOrdersPendingSelection();
                return refresh();
            };

            this.refresh = function () {
                return refresh();
            };

            this.customizeView = function () {
                $('#OrdersPendingView').customizeVirtualDataGrid();
            };

            var hasLoaded = false;
            this.loadSettings = function () {
                ZillionRis.UserSettings.get('orderapproval', 'settings')
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
                ZillionRis.UserSettings.set('orderapproval', 'settings', {
                    filter: self.filters.selectedID()
                });
            };


            var update = ZillionParts.Delay(function () {
                if (self.isLoading() === false && hasLoaded == true) {
                    self.saveSettings();
                }
                $("#OrdersPendingView").virtualDataGrid('updateFilter');
                refresh();
            }, 1000, true);

            this.filters.selected.subscribe(update);

            this.viewLastAccessedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };

            this.resetSettings = function () {
                ZillionRis.UserSettings.set('orderapproval', 'settings', null);
            };

            this.customizeFilter = function () {
                $('#FilterDialog').pageSubNav('show');
            };

            this.clearFilter = function () {
                $('#OrdersPendingView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                this.filters.selectedID(null);
            };

            this.loadFilters = function() {
                this.filters.loadFilters();
            };
        }

        function OrdersPendingFilterViewModel() {
            this.originalName = '';
            this.name = new ko.observable();

            this.requestingResponsibleConsultants = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requestingResponsibleConsultants.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/physicians', {
                queryParameters: { PhysiciansType: "all" },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.intendedVetters = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.intendedVetters.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: 'Approver' },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.modalityTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.modalityTypes.source = new ZillionRis.Filters.ObjectSourceLocations('modalityTypes', true);

            this.referralTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.referralTypes.source = new ZillionRis.Filters.ObjectSourceLocations('referralTypes');

            this.requesterLocations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requesterLocations.source = new ZillionRis.Filters.ObjectSourceLocations('requesterLocations', true);

            this.specialisations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.specialisations.source = new ZillionRis.Filters.ObjectSourceLocations('specialisations');

            this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                projector: '{ id: ID, label: Name, value: Name }'
            });

            var self = this;
            this.startDate = new ko.observable(null);
            this.endDate = new ko.observable(null);
            this.dateRange = new ko.observable(null);

            this.dateRange.subscribe(function () {
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
            this.startDate.subscribe(function () {
                if (self.startDate() != null)
                    self.dateRange(null);
            });
            this.endDate.subscribe(function () {
                if (self.endDate() != null)
                    self.dateRange(null);
            });

            this.itemAdded = function (elem) {
                if (elem.nodeType === 1) {
                    $(elem).show('highlight', 'slow');
                }
            };
        }

        var filterEditor = new ZillionRis.FilterEditor();
        filterEditor.filterFactory = function () {
            return new OrdersPendingFilterViewModel(filterEditor);
        };
        filterEditor.filterSave = function (a) {
            return {
                originalName: a.originalName,
                name: a.name(),

                requestingResponsibleConsultants: a.requestingResponsibleConsultants.list().qSelect('id'),
                intendedVetters: a.intendedVetters.list().qSelect('id'),
                modalityTypes: a.modalityTypes.list().qSelect('id'),
                referralTypes: a.referralTypes.list().qSelect('id'),
                requesterLocations: a.requesterLocations.list().qSelect('id'),
                specialisations: a.specialisations.list().qSelect('id'),
                urgencies: a.urgencies.list().qSelect('id'),
                startDate: a.startDate(),
                endDate: a.endDate(),
                dateRange: a.dateRange()
            };
        };
        filterEditor.filterLoad = function (a, b) {
            a.originalName = b.originalName;
            a.name(b.name);

            a.requestingResponsibleConsultants.set(b.requestingResponsibleConsultants || []);
            a.intendedVetters.set(b.intendedVetters || []);
            a.modalityTypes.set(b.modalityTypes || []);
            a.referralTypes.set(ensureExists(b.referralTypes));
            a.requesterLocations.set(b.requesterLocations || []);
            a.specialisations.set(b.specialisations || []);
            a.urgencies.set(b.urgencies);
            a.startDate(b.startDate);
            a.endDate(b.endDate);
            a.dateRange(b.dateRange);
        };

        filterEditor.filterType = 'orderapproval-filter';
        filterEditor.notificationTitle = 'Order approval Work List Filter';
        filterEditor.subject = 'orderapproval';

        filterEditor.close = function () {
            $("#FilterDialog").pageSubNav('hide');
        };

        ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

        $("#FilterDialog").show().pageSubNav({
            close: function () { ordersPendingViewModel.loadFilters(); },
            open: function () {
                filterEditor.openFilterName = ordersPendingViewModel.filters.selectedID();
                filterEditor.load();
            }
        });
    });
})(jQuery, window);
