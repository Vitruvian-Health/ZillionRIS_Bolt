(function ($, window, undefined) {
    $(function () {

        $(window).on('unload', function () {
            releaseLock();
        });
        window.statusChangeCallback = function (s, e) {
            ZillionRis.SiteEvents.broadcast('lazy-page-update');
        };

        function getLastSelectedWorklist() {
            return sessionStorage.getItem('orderBooking.lastLoadedWorklist');
        }
        function setLastSelectedWorklist(worklist) {
            sessionStorage.setItem('orderBooking.lastLoadedWorklist', worklist);
        }

        function ensureArray(filterCriterion) {
            if (filterCriterion === null || filterCriterion === undefined) {
                return [];
            }
            if (Array.isArray(filterCriterion)) {
                return filterCriterion;
            }
            return [filterCriterion.id];
        }

        Rogan.Ris.Locations.ensure();
        Rogan.Ris.Specialisations.ensure();
        var referralTypesList;
        var specialisationsList;

        var onHoldOrders;
        window.onHoldOrderTabs = function (listId) {
            onHoldOrders = listId;
            setLastSelectedWorklist(onHoldOrders);
            refreshGrids();
        };

        $('#WorklistTabs').buttonset();
        $('#WorklistTabs input').on('change', function () {
            onHoldOrderTabs($(this).val());
        });

        function setLoadedWorklist(index) {
            var map = {
                0: '#NormalTab',
                1: '#OnHoldTab'
            };

            $(map[index] || map[0]).click();
        }

        ZillionRis.SiteEvents.subscribe('lazy-page-update', refreshGrids);
        function refreshGrids() {
            refresh();
            updateOrdersPendingFromSelection();
        }

        var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
        var commandResources = new ZillionParts.CommandResources();

        $.extend(true, $.ui.virtualDataGrid.dataTypes, {
            'hold-order-date': {
                width: 100,
                renderMethod: function (data, item) {

                    function VM() {
                        var self = this;
                        this.holdUntilString = ko.observable();
                        if (item.HoldUntilDate)
                            this.holdUntilString(moment(item.HoldUntilDate).format('MM/YYYY'));
                        this.changeHeldOrder = function () {
                            commandManager.execute('order.hold-order', { OrderID: item.OrderID, Title: self.holdUntilString() });
                        };
                    }
                    var e = $('#HoldDateTemplate').clone();
                    e.attr('id', null);
                    var vm = this.cacheItem(item, this.fieldID, function () {
                        return new VM();
                    });
                    ko.applyBindings(vm, e[0]);

                    return e.inputex();
                },
                createFilterMethod: function (val) {
                    var regex = ZillionParts.Data.WildCardToRegex('*' + val);
                    return function (date) {
                        if (date instanceof Date == false) return false;
                        return regex.test(date.format('MM/yyyy'));
                    };
                }
            }
        });

        var globalExaminationLock, lockChanged = new ZillionParts.Event();

        function requestLock() {
            if (!globalExaminationLock) {

                return globalExaminationLock = LockResource(locfmt('{ris,LockingExamination}'), ['urn:order:' + getOrdersPendingKey()], locfmt('{ris,OrderBooking_ExaminationLockedByUser}', { user: window['currentUserName'] }), 2)
                .always(function () {
                    lockChanged.notify();
                });
            } else if (!globalExaminationLock.locked) {
                var ip = false;
                globalExaminationLock.always(function () {
                    ip = true;
                });

                if (ip) {
                    if (globalExaminationLock.locked == false) {

                        globalExaminationLock = LockResource(locfmt('{ris,LockingExamination}'), ['urn:order:' + getOrdersPendingKey()], locfmt('{ris,OrderBooking_ExaminationLockedByUser}', { user: window['currentUserName'] }), 2)
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

        setInterval(function () {
            if (globalExaminationLock && globalExaminationLock.locked) {
                globalExaminationLock.renew();
            }
        }, 60000);

        window.TryLock = function () {
            if (!globalExaminationLock || !globalExaminationLock.locked) {
                requestLock().fail(function () {
                    ris.notify.showError(locfmt('{ris,OrderBooking_ExaminationLocked}'), globalExaminationLock.reason);
                });
            }
        };

        ZillionRis.Commands.RegisterResources(commandResources);

        var vm = new OrderBookingViewModel();
        $(function () {
            ko.applyBindings(vm, $('#PossibleLocations')[0]);
        });

        function OrderBookingViewModel() {
            this.possibleLocations = new PossibleLocations();
        }

        function PossibleLocations() {
            var self = this, check = 0;
            this.isLoading = ko.observable(false);
            this.data = ko.observable(null);

            this.hasLocations = ko.computed(function () { return self.data() && self.data().Locations; });

            this.load = function (examinationTypes) {
                self.isLoading(true);
                self.data(null);

                if (examinationTypes.length === 0) {
                    self.isLoading(false);
                } else {
                    var c = ++check;
                    ZillionRis.ScheduleService.RetrieveLocations({ ExaminationTypes: examinationTypes })
                        .then(function (x) {
                            if (x && c === check) {
                                self.data(x);
                            }
                        }, function () {

                        }).always(function () {
                            if (c === check) {
                                self.isLoading(false);
                            }
                        });
                }
            };
        }

        var ordersPendingViewModel = new OrdersPendingViewModel();
        function createOrdersPendingViewModel() {
            var ordersPendingContext = new ZillionParts.CommandList();
            with (ordersPendingContext) {
                add('order.order-information').executeWith('{ OrderID: OrderID }');
                if (window.permissions.hasPatientContactInfoPermission) {
                    add('patient.contact-information').executeWith('{ PatientID: PatientID }');
                }
                if (window.permissions.hasEditOrderPermission) {
                    add('order.edit-order').executeWith('{ OrderID: OrderID }');
                }
                add('order.open-memo').executeWith('{ ID: OrderID, HasMemo: HasMemo }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForm }');
                if (window.pageConfig.EnableKioskIntegrationControls) {
                    add('order.set-kiosk-check-in-not-allowed').executeWith('{ OrderID: OrderID, KioskCheckInNotAllowed: !KioskCheckInNotAllowed }');
                }
            }
            var ordersPendingActions = new ZillionParts.CommandList();
            with (ordersPendingActions) {
                add('order.hold-order').executeWith('{ OrderID : OrderID, Title: locfmt("{ris,HoldOrderBtn}")}').hideWhen('HasStatusHeld');
                add('order.unhold-order').executeWith('{ OrderID: OrderID, OrderNumber: OrderNumber }').hideWhen('!HasStatusHeld');
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'OrderID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: ordersPendingContext, manager: commandManager, resources: commandResources } },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', renderText: true, commands: { manager: commandManager, resources: commandResources, list: ordersPendingActions }, dataType: 'commands', width: 100 },
                    { title: locfmt('{ris,FieldOrderID}'), fieldID: 'OrderNumber' },
                    { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber' },
                    {
                        title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter',
                        dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null, contactID: 'PatientID'
                    },
                    { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' },
                    { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', width: 80 },
                    { title: locfmt('{ris,FieldIntendedVetters}'), fieldID: 'IntendedVetterName', dataType: 'contact', contactID: 'IntendedVetterPersonID', createFilterMethod: function (val) { var regex = ZillionParts.Data.WildCardToRegex('*' + val); return regex; }, width: 140 },
                    { title: locfmt('{ris,FieldHoldUntilDate}'), fieldID: 'HoldUntilDate', dataType: 'hold-order-date', width: 100 },
                    { title: locfmt('{ris,FieldHeldLocation}'), fieldID: 'HoldLocation' },
                    { title: locfmt('{ris,FieldExternalOrderNumber}'), fieldID: 'ExternalOrderNumber', width: 140 },
                    { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName' },
                    { title: locfmt('{ris,FieldSpecialty}'), fieldID: 'SpecialtyName' }
                ],
                sort: [
                    { "fieldID": "OrderID", asc: true }
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
                        specialisationsList = Rogan.Ris.Specialisations.getSpecialisations().query().toArray();

                        var currentFilter = ordersPendingViewModel.filters.selected();
                        if (currentFilter) {
                            combineListFilter(customFilter, 'ExaminationTypeIDs', currentFilter.examinationTypes, 'a');
                            combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                            combineListFilter(customFilter, 'RoomIDs', currentFilter.rooms, 'a');
                            combineListFilter(customFilter, 'IntendedVetterID', currentFilter.intendedVetters);
                            combineListFilter(customFilter, 'ResponsibleRequestingPhysicianID', currentFilter.requestingResponsibleConsultants);
                            combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);
                            combineListFilter(customFilter, 'ReferralTypeName', referralTypesList.filter(function (item) {
                                return ensureArray(currentFilter.referralType).indexOf(item.ID) !== -1;
                            }).qSelect('Name'));
                            combineListFilter(customFilter, 'SpecialtyName', specialisationsList.filter(function (item) {
                                return ensureArray(currentFilter.functionSpecialization).indexOf(item.ID) !== -1;
                            }).qSelect('Name'));
                        }

                        return createFilterFunc(customFilter);
                    }
                }
            });

            function createEmptyDataItem() {
                var orders = ordersPendingDataView.getItems(true).length;
                if (orders > 0) {
                    var foo = $('<span>' + locfmt('{ris,NoOrdersFoundFilter}') + '<br />' + orders + locfmt('{ris,OrdersInTotal}') + '<br /><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
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

        function postProcessOrdersPendingItem(item, data) {
            ZillionRis.AddUrgencyClasses(item, data.UrgencyID);

            item.dblclick(function (e) {
                if (window.permissions.hasEditOrderPermission) {
                    ZillionRis.CommandManager.execute('order.edit-order', { OrderID: data.OrderID });
                }
            }).disableSelection();

        }

        var ordersPendingGridOptions = ordersPendingViewModel.gridOptions;
        var ordersPendingDataView = ordersPendingGridOptions.dataView;
        var ordersPendingSelection = ordersPendingGridOptions.selection;
        var delayUpdate = ZillionParts.Delay(updateOrdersPendingFromSelection, 100);
        ordersPendingSelection.onChange.subscribe(delayUpdate);
        ordersPendingSelection.setMultiSelect(false);

        ordersPendingViewModel.filters.selected.subscribe(function () {
            $("#OrdersPendingView").virtualDataGrid('updateFilter');
            $("#OrderBookingExaminationsView").virtualDataGrid('updateFilter');
        });

        ordersPendingViewModel.grid = $('#OrdersPendingView');
        ko.applyBindings(ordersPendingViewModel, $("#OrdersPendingDiv")[0]);

        ZillionRis.WorkList.SelectionStore('#OrdersPendingView', ordersPendingViewModel.gridOptions, 'ordersPending.worklist.selection');
        ordersPendingViewModel.gridSettingsStore.initialize('#OrdersPendingView', ordersPendingViewModel.gridOptions, 'ordersPending', 'ordersPending-worklist').loadSettings();

        createOrdersPendingContextMenu();

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

        ordersPendingViewModel.loadSettings();
        ordersPendingViewModel.loadFilters();

        ZillionParts.GridView.Behaviors.RestrictToDataSet({ dataView: ordersPendingDataView, selection: ordersPendingSelection, gridView: '#OrdersPendingView' });
        ZillionParts.GridView.Behaviors.ForceSingleSelect({ dataView: ordersPendingDataView, selection: ordersPendingSelection, gridView: '#OrdersPendingView' });

        function updateOrdersPendingFromSelection() {
            var key = getOrdersPendingKey();
            if (key) {
                var data = ordersPendingDataView.getItemByKey(key);
                if (data) {
                    ZillionRis.LoadPatientBanner(data.PatientID);
                    loadOrderDetails(key);
                    loadExaminationDetails(key);
                } else {
                    ZillionRis.LoadPatientBanner(0);
                }
            } else {
                ZillionRis.LoadPatientBanner(0);
            }
            refreshOrderExaminations();
        }

        function getOrdersPendingKey() {
            return ordersPendingSelection.getCount() == 1 ? ordersPendingSelection.getKeys()[0] : null;
        }


        function createFilterFunc(filters) {
            return function (items) { return filters.filter(items); };
        }

        var totalItemCount = 0;

        function refresh() {
            if (!getLastSelectedWorklist()) {
                setLastSelectedWorklist(0);
            }

            ordersPendingViewModel.isLoading(true);

            // in case of tab change, clear the worklist
            if (onHoldOrders != getLastSelectedWorklist()) {
                //onHoldOrders is undefined on load
                ordersPendingViewModel.gridOptions.dataView.setItems([], 'OrderID');
            }

            onHoldOrders = getLastSelectedWorklist();

            var selectedFilter = ordersPendingViewModel.filters.selected();

            var dateRange = selectedFilter && selectedFilter.dateRange ? selectedFilter.dateRange : 0;

            var startDate = selectedFilter && selectedFilter.startDate ? moment(selectedFilter.startDate).startOf('day').toDate() : null;
            var endDate = selectedFilter && selectedFilter.endDate ? moment(selectedFilter.endDate).endOf('day').toDate() : null;

            var reqLoclocationIDs = selectedFilter && selectedFilter.locations ? selectedFilter.locations : null;
            var reqlocationIDs = selectedFilter && selectedFilter.requesterLocations ? selectedFilter.requesterLocations : null;

            // no approval needed / approval done
            var showOnlyWaiting = null;
            if (selectedFilter && selectedFilter.showWaitingExaminations) {
                showOnlyWaiting = true;
            }
            if (selectedFilter && selectedFilter.showApprovedExaminations) {
                showOnlyWaiting = false;
            }

            var c = ++check;
            Modules.ContentProvider('module://workflow/data/orderbookingworklist', 'query', {
                StartDate: startDate,
                EndDate: endDate,
                DateRange: dateRange,
                RequesterLocationIDs: reqlocationIDs,
                RequesterLocationLocationIDs: reqLoclocationIDs,
                OnHoldOrders: onHoldOrders == 1,
                ShowOrdersWithOnlyWaiting: showOnlyWaiting
            }).then(function (model) {
                var data = model.items;
                totalItemCount = model.metadata.totalItemCount;
                if (c === check) {
                    if (data) {
                        if (data.type == 'error') {
                            if (data.data && data.data['message']) {
                                ris.notify.showError('Failed to load the worklist',
                                                data.data.message);
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

        var check = 0;
        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);

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
            var find = $('#OrdersPendingPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        ordersPendingDataView.onUpdated.subscribe(function () {
            var foo = locfmt('{ris,Orders_Title}') + ' (' + ordersPendingDataView.getItems(false).length + '/' + totalItemCount + ')';
            ordersPendingViewModel.worklistTitle(foo);
        });

        function OrdersPendingViewModel() {
            var self = this;

            this.gridOptions = createOrdersPendingViewModel();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.selectedItem = new ko.observable(null);
            this.isLoading = new ko.observable(false);
            this.worklistTitle = new ko.observable(locfmt('{ris,Orders_Title}'));

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'orderbooking-filter';

            this.reset = function () {
                this.resetSettings();
                this.gridSettingsStore.resetSettings();
                this.filters.selectedID(null);
            };
            this.refresh = function () {
                refresh();
            };
            this.customizeView = function () {
                $('#OrdersPendingView').customizeVirtualDataGrid();
            };

            var hasLoaded = false;
            this.loadSettings = function () {
                ZillionRis.UserSettings.get('orderspending', 'settings')
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
                ZillionRis.UserSettings.set('orderspending', 'settings', {
                    filter: self.filters.selectedID()
                });
            };

            var update = function () {
                if (self.isLoading() === false && hasLoaded === true) {
                    self.saveSettings();
                }
                refresh();
            };
            this.filters.selected.subscribe(update);

            this.loadFilters = function () {
                this.filters.loadFilters();
            };

            this.resetSettings = function () {
                ZillionRis.UserSettings.set('orderspending', 'settings', null);
            };

            this.clearFilter = function () {
                $('#OrdersPendingView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                this.filters.selectedID(null);
            };

            this.customizeFilter = function () {
                $('#FilterDialog').pageSubNav('show');
            };

            this.viewLastAccessedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };
        }

        function OrdersPendingFilterViewModel() {
            var self = this;
            this.originalName = '';
            this.name = new ko.observable();

            this.requestingResponsibleConsultants = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requestingResponsibleConsultants.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/physicians', {

                queryParameters: { PhysiciansType: "all" },
                projector: '{ id: ID, code: Code, value: "["+Code+"] "+ DisplayName, label: DisplayName + (FunctionSpecialization != "" ?  " (" + FunctionSpecialization + ")" : "") + ";  " + Address }'
            });

            this.operators = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.operators.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: "Secretary" },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.intendedVetters = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.intendedVetters.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: 'Approver' },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.modalityTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.modalityTypes.source = new ZillionRis.Filters.ObjectSourceLocations('modalityTypes', true);

            this.rooms = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.rooms.source = new ZillionRis.Filters.ObjectSourceLocations('rooms', true);

            this.requesterLocations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requesterLocations.source = new ZillionRis.Filters.ObjectSourceLocations('requesterLocations', true);

            this.requesterLocations.addNew.subscribe(function () {
                self.locations.list([]);
            });

            this.referralType = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.referralType.source = new ZillionRis.Filters.ObjectSourceModules('module://workflow/data/referraltypes', {
                projector: '{ id: ID, label: DisplayName, code: DisplayName, value: DisplayName }'
            });

            this.functionSpecialization = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.functionSpecialization.source = new ZillionRis.Filters.ObjectSourceLocations('specialisations', true);

			this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                projector: '{ id: ID, label: Name, value: Name }'
            });

            // Reception Specific.
            this.showWaitingExaminations = new ko.observable(false);
            this.showApprovedExaminations = new ko.observable(false);
            this.showWaitingExaminations.subscribe(function (val) {
                if (val == true)
                    self.showApprovedExaminations(false);
            });
            this.showApprovedExaminations.subscribe(function (val) {
                if (val == true)
                    self.showWaitingExaminations(false);
            });

            this.locations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.locations.source = new ZillionRis.Filters.ObjectSourceLocations('locations', true);
            this.locations.addNew.subscribe(function () {
                self.requesterLocations.list([]);
            });

            this.examinationTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.examinationTypes.source = new ZillionRis.Filters.ObjectSourceModules('module://workflow/data/examinationtypes', { projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }' });

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
                operators: a.operators.list().qSelect('id'),
                intendedVetters: a.intendedVetters.list().qSelect('id'),
                modalityTypes: a.modalityTypes.list().qSelect('id'),
                rooms: a.rooms.list().qSelect('id'),
                requesterLocations: a.requesterLocations.list().qSelect('id'),
                referralType: a.referralType.list().qSelect('id'),
                functionSpecialization: a.functionSpecialization.list().qSelect('id'),
                locations: a.locations.list().qSelect('id'),
                examinationTypes: a.examinationTypes.list().qSelect('id'),
                urgencies: a.urgencies.list().qSelect('id'),
                startDate: a.startDate(),
                endDate: a.endDate(),
                dateRange: a.dateRange(),

                showWaitingExaminations: a.showWaitingExaminations(),
                showApprovedExaminations: a.showApprovedExaminations()
            };
        };
        filterEditor.filterLoad = function (a, b) {
            a.originalName = b.originalName;
            a.name(b.name);

            a.requestingResponsibleConsultants.set(b.requestingResponsibleConsultants);
            a.operators.set(b.operators);
            a.intendedVetters.set(b.intendedVetters);
            a.modalityTypes.set(b.modalityTypes);
            a.rooms.set(b.rooms);
            a.requesterLocations.set(b.requesterLocations);
            a.referralType.set(ensureArray(b.referralType));
            a.functionSpecialization.set(ensureArray(b.functionSpecialization));
            a.locations.set(b.locations);
            a.examinationTypes.set(b.examinationTypes);
            a.urgencies.set(b.urgencies);
            a.startDate(b.startDate);
            a.endDate(b.endDate);
            a.dateRange(b.dateRange);
            a.showWaitingExaminations(b.showWaitingExaminations);
            a.showApprovedExaminations(b.showApprovedExaminations);
        };

        filterEditor.filterType = 'orderbooking-filter';
        filterEditor.notificationTitle = 'Order pending Work List Filter';
        filterEditor.subject = 'orderbooking';

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

        var orderBookingExaminationsViewModel = new OrderBookingExaminationsViewModel();
        function createOrdersExaminationsViewModel() {
            var examinationContextMenu = new ZillionParts.CommandList();
            with (examinationContextMenu) {
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID }').hideWhen('HousekeepingID').hideWhen('StatusID == "cancelled"');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
            }

            var orderExaminationsActions = new ZillionParts.CommandList();
            with (orderExaminationsActions) {
                add('examination.housekeeping-state').showWhen('HousekeepingID');
                add('examination.open-memo').executeWith('{ ID: ExaminationID, HasMemo: HasMemo }');
                add('examination.add-intended-vetter').executeWith('{ExaminationID: ExaminationID, CurrentIntendedApproverID: IntendedVetterID }').hideWhen('HousekeepingID || HasStatusHeld');
                add('protocol.open-protocol').executeWith('{ examinationID: ExaminationID }').showWhen('HasProtocol');
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ExaminationID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: examinationContextMenu, manager: commandManager, resources: commandResources } },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', commands: { manager: commandManager, resources: commandResources, list: orderExaminationsActions }, dataType: 'commands', width: 80 },
                    { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'ExaminationStatus' },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName' },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber' },
                    { title: locfmt('{ris,FieldIntendedVetter}'), fieldID: 'IntendedVetter', width: 140, dataType: 'contact', contactID: 'IntendedVetterPersonID' }
                ],
                sort: [
                    { 'fieldID': 'AccessionNumber', asc: true }
                ],
                gridOptions: {
                    onRowCreated: onRowCreated,
                    createEmptyDataItem: createEmptyDataItem
                }
            });

            function onRowCreated(item, data) {
                ZillionRis.AddUrgencyClasses(item, data.UrgencyID);
            }

            function createEmptyDataItem() {
                var examinations = orderExaminationsDataView.getItems(true).length;
                if (examinations > 0) {
                    var foo = $('<span>' + locfmt('{ris,NoExaminationsFoundFilter}') + '<br />' + examinations + locfmt('{ris,ExaminationsInTotal}') + '<br /><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                    $('a', foo).click(function () {
                        orderBookingExaminationsViewModel.clearFilter();
                    });
                    return foo;
                } else {
                    return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                }
            }

            return gridController.create();
        }

        var orderExaminationsGridOptions = orderBookingExaminationsViewModel.gridOptions;
        var orderExaminationsDataView = orderExaminationsGridOptions.dataView;
        var orderExaminationsSelection = orderExaminationsGridOptions.selection;
        orderExaminationsSelection.setMultiSelect(false);

        orderBookingExaminationsViewModel.grid = $('#OrderBookingExaminationsView');

        ko.applyBindings(orderBookingExaminationsViewModel, $('#OrderExaminationsContainer')[0]);

        orderBookingExaminationsViewModel.gridSettingsStore.initialize('#OrderBookingExaminationsView', orderBookingExaminationsViewModel.gridOptions, 'orderbookingexaminations', 'orderBookingExaminations-worklist').loadSettings();

        orderBookingExaminationsViewModel.reset();

        setLoadedWorklist(getLastSelectedWorklist());

        createOrderExaminationsContextMenu();

        orderBookingExaminationsViewModel.refresh();

        var examinationRequestcheck = 0;
        function refreshOrderExaminations() {
            releaseLock();

            var orderID = getOrdersPendingKey();
            if (orderID) {
                orderBookingExaminationsViewModel.isLoading(true);

                var c = ++examinationRequestcheck;
                Modules.ContentProvider('module://workflow/data/orderbookingworklist', 'examinations', { OrderID: orderID })
                .then(function (data) {
                    if (c === examinationRequestcheck) {
                        if (data) {
                            if (data.type == 'error') {
                                orderBookingExaminationsViewModel.disableBooking(true);
                                if (data.data && data.data['message']) {
                                    ris.notify.showError('Failed to load the examinations', data.data.message);
                                } else {
                                    ris.notify.showError('Failed to load the examinations', 'Failed to load the examinations.');
                                }
                            } else {
                                requestLock().then(function () {
                                    releaseLock();
                                }, function (x) {
                                    orderBookingExaminationsViewModel.tooltip(x.reason);
                                    orderBookingExaminationsViewModel.disableBooking(true);
                                });

                                orderExaminationsDataView.setItems(data, 'ExaminationID');
                                orderExaminationsDataView.refresh();

                                var types = data.qSelect('ExaminationTypeID');
                                vm.possibleLocations.load(types);

                                if (data.qAny('HousekeepingID != null && HousekeepingID != 0')) {
                                    orderBookingExaminationsViewModel.disableBooking(true);
                                }
                                else {
                                    orderBookingExaminationsViewModel.tooltip('');
                                    orderBookingExaminationsViewModel.disableBooking(false);
                                }
                            }
                        } else {
                            orderBookingExaminationsViewModel.disableBooking(true);
                            ris.notify.showError('Failed to load the examinations', 'Failed to load the examinations.');
                        }
                    }
                }, function (data) {
                    if (c === examinationRequestcheck) {
                        orderBookingExaminationsViewModel.disableBooking(true);
                        if (data && data['error']) {
                            ris.notify.showError('Failed to load the examinations', data['message']);
                        } else {
                            ris.notify.showError('Failed to load the examinations', 'Failed to load the examinations.');
                        }
                    }
                }).always(function () {
                    if (c === examinationRequestcheck) {
                        orderBookingExaminationsViewModel.isLoading(false);
                    }
                });
            } else {
                vm.possibleLocations.load([]);
                orderBookingExaminationsViewModel.disableBooking(true);
                orderBookingExaminationsViewModel.gridOptions.dataView.setItems([], 'ExaminationID');
                orderBookingExaminationsViewModel.gridOptions.dataView.refresh();
            }
        }

        function createOrderExaminationsContextMenu() {
            var configurationMenu = $('<input type="button" id="ExaminationGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                            refreshOrderExaminations();
                        } else if (item.id == 'clear-filter') {
                            orderBookingExaminationsViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            orderBookingExaminationsViewModel.customizeView();
                        } else if (item.id == 'reset') {
                            orderBookingExaminationsViewModel.resetSettings();
                            orderBookingExaminationsViewModel.reset();
                        }
                    }
                });
            var find = $('#OrderExaminationsPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        orderExaminationsDataView.onUpdated.subscribe(function (e, data) {
            var title = locfmt('{ris,Examinations_Title}') + ' (' + orderExaminationsDataView.getItems(false).length + '/' + orderExaminationsDataView.getItems(true).length + ')';
            orderBookingExaminationsViewModel.worklistTitle(title);
        });

        function OrderBookingExaminationsViewModel() {
            var self = this;

            this.gridOptions = createOrdersExaminationsViewModel();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.selectedItem = new ko.observable(null);
            this.isLoading = new ko.observable(false);
            this.worklistTitle = new ko.observable(locfmt('{ris,Examinations_Title}'));

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
            };
            this.refresh = function () {
                this.gridOptions.dataView.refresh();
            };
            this.customizeView = function () {
                $('#OrderBookingExaminationsView').customizeVirtualDataGrid();
            };

            this.resetSettings = function () {
                ZillionRis.UserSettings.set('orderbookingexaminations', 'settings', null);
            };

            this.customizeFilter = function () {
                $('#OrderBookingExaminationsView').pageSubNav('show');
            };

            this.clearFilter = function () {
                $('#OrderBookingExaminationsView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            };

            this.viewLastAccessedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };

            this.bookOrderNow = function () {
                var orderID = getOrdersPendingKey();
                if (orderID) {
                    requestLock().then(function () {
                        var data = ordersPendingDataView.getItemByKey(orderID);
                        if (window.pageConfig.ExternalOrders_OpenEditOrderPage && data && data.ExternalOrderNumber) {
                            ZillionRis.Navigate({ page: 'EditOrder.aspx?orderID=' + orderID + '&FromBookingPage=true', hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
                        } else {
                            commandManager.execute('order.schedule-now', { OrderID: orderID, ConfirmationDialog: true });
                        }
                    }, function (x) {
                        orderBookingExaminationsViewModel.tooltip(x.reason);
                        orderBookingExaminationsViewModel.disableBooking(true);
                        ris.notify.showError(locfmt('{ris,OrderBooking_FailLoadingRoomOverview}'), x.reason);
                    });
                }
            };

            this.bookOrder = function () {
                var orderID = getOrdersPendingKey();
                if (orderID) {
                    requestLock().then(function () {
                        var data = ordersPendingDataView.getItemByKey(orderID);
                        if (window.pageConfig.ExternalOrders_OpenEditOrderPage && data && data.ExternalOrderNumber) {
                            ZillionRis.Navigate({ page: 'EditOrder.aspx?orderID=' + orderID + '&FromBookingPage=true', hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
                        } else {
                            commandManager.execute('order.auto-schedule', { Examinations: ['urn:order:' + orderID], OrderNumber: data.OrderNumber, PatientName: data.PatientName, CommandUsed: "autoScheduleOrder" });
                        }
                    }, function (x) {
                        ris.notify.showError(locfmt('{ris,OrderBooking_FailLoadingRoomOverview}'), x.reason);
                    });
                }
            };

            this.bookOrderManually = function () {
                var orderID = getOrdersPendingKey();
                if (orderID) {
                    requestLock().then(function () {
                        var data = ordersPendingDataView.getItemByKey(orderID);
                        if (window.pageConfig.ExternalOrders_OpenEditOrderPage && data && data.ExternalOrderNumber) {
                            ZillionRis.Navigate({ page: 'EditOrder.aspx?orderID=' + orderID + '&FromBookingPage=true', hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
                        } else {
                            commandManager.execute('order.manual-schedule', { Examinations: ['urn:order:' + orderID], OrderNumber: data.OrderNumber, PatientName: data.PatientName, CommandUsed: "manualScheduleOrder" });
                        }
                    }, function (x) {
                        ris.notify.showError(locfmt('{ris,OrderBooking_FailLoadingRoomOverview}'), x.reason);
                    });
                }
            };

            this.disableBooking = new ko.observable(true);
            this.tooltip = new ko.observable('');

            this.editPatient = function () {
                var key = getOrdersPendingKey();
                if (key) {
                    var data = ordersPendingDataView.getItemByKey(key);
                    if (data) {
                        commandManager.execute('patient.edit-patient', { PatientID: data.PatientID });
                    }
                }
            };
        }

        var orderDetailsAjax = null;
        function loadOrderDetails(orderId) {
            if (orderDetailsAjax === null) {
                orderDetailsAjax = new ZillionRis.SingleAjax();
            }

            if (!orderId) {
                orderDetailsAjax.abort();
            } else {
                $('#OrderDetails').css({ opacity: 0.5 });
                orderDetailsAjax.ajax({
                    url: ZillionRis.PageUrl('Parts/OrderDetails.cshtml?orderID=' + orderId),
                    type: 'post'
                }, function (html) {
                    $('#OrderDetails').html(html);
                    $('#OrderDetails').css({ opacity: 1 });
                }, function () {
                    $('#OrderDetails').empty();
                    $('#OrderDetails').css({ opacity: 1 });

                    var item = new ZillionParts.Notifications.Item();
                    item.type = 'error';
                    item.title = locfmt('{ris,OrderBooking_OrderDetails}');
                    item.message = locfmt('{ris,OrderBooking_FailedToLoad}');
                    notifications.add(item);
                });
            }
        }

        function loadExaminationDetails(orderId) {
            var examinationDetailsAjax = new ZillionRis.SingleAjax();

            if (!orderId) {
                examinationDetailsAjax.abort();
            } else {
                $('#ExaminationInformation').css({ opacity: 0.5 });
                examinationDetailsAjax.ajax({
                    url: ZillionRis.PageUrl('Parts/ExaminationDetails2.cshtml?orderId=' + orderId),
                    type: 'post'
                }, function (html) {
                    $('#ExaminationInformation').html(html);
                    $('#ExaminationInformation').css({ opacity: 1 });
                }, function () {
                    $('#ExaminationInformation').empty();
                    $('#ExaminationInformation').css({ opacity: 1 });

                    var item = new ZillionParts.Notifications.Item();
                    item.type = 'error';
                    item.title = locfmt('{ris,OrderBooking_OrderDetails}');
                    item.message = locfmt('{ris,OrderBooking_FailedToLoad}');
                    notifications.add(item);
                });
            }
        }

    });
})(jQuery, window);