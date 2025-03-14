(function ($, window, undefined) {
    window.refreshOrdersExamination = function () { };

    $(function () {

        var WorkflowModes = {
            SingleMode: 'single',
            MultipleMode: 'multiple'
        };

        var examinationIDlist = '';

        var commandManager = OrderApproval.CommandManager;
        var commandResources = OrderApproval.CommandResources;

        $.extend(true, window, {
            OrderApproval: {
                OrderExaminationsViewModel: new OrderExaminationsViewModel()
            }
        });

        function getItemIds(itemGroupId) {
            return Modules.ContentProvider('module://workflow/data/orderapprovalworklist', 'examinations', {
                OrderID: itemGroupId
            }).then(function (data) {
                return data
                    .qWhere(function (item) { return !item.HousekeepingID && (item.ExaminationTypeApprovalRequired || item.IntendedVetterID); })
                    .qSort('AccessionNumber')
                    .qSelect('ExaminationID');
            });
        }

        function assignProtocolSubnav(examinationID, options) {
            options = options || {};
            ZillionRis.SubNavs.ShowAssignProtocol({
                mode: 'approve',
                worklist: OrderApproval.createWorklist(getItemIds, examinationID, { singleItem: options.single }),
                declineExaminationID: options.decline ? examinationID : null
            });
        }

        function checkIfExaminationIsAvailable(context) {
            const dataView = OrderApproval.OrderExaminationsViewModel.gridOptions.dataView;
            return refreshOrdersExamination().then(function () {
                if (OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.getItemByKey(context.ExaminationID, false)) {
                    return $.Deferred().resolve(true);
                }
                return ZillionRis.Confirmation({
                    title: locfmt('{ris,Confirmation_Title}'),
                    content: locfmt('{ris,ExaminationNoLongerAvailable}'),
                    buttons: 'ok'
                }).then(function () {
                    return $.Deferred().resolve(false);
                }, function () {
                    return $.Deferred().resolve(false);
                });
            });
        }

        function approveExamination(context) {
            switch (OrderApproval.OrderExaminationsViewModel.workflowMode()) {

                case WorkflowModes.SingleMode:
                    if (context.ShouldAssignProtocol && window.permissions.hasAssignProtocolPermission) {
                        assignProtocolSubnav(context.ExaminationID, { single: true });
                    } else {
                        checkIfExaminationIsAvailable(context).then(function (available) {
                            if (!available) {
                                return $.Deferred().resolve();
                            }
                            return Modules.Task('module://workflow/task/approve-examination', 'process', { ExaminationID: context.ExaminationID })
                                .then(function () {
                                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                });
                        }).then(null, function (h) {
                            ris.notify.showError('Unable to approve examination', (h && h.message) || 'An error occurred while trying to approve the examination');
                        });
                    }
                    break;

                case WorkflowModes.MultipleMode:
                    assignProtocolSubnav(context.ExaminationID);
                    break;
            }
        }

        function declineExamination(context) {
            switch (OrderApproval.OrderExaminationsViewModel.workflowMode()) {

                case WorkflowModes.SingleMode:
                    checkIfExaminationIsAvailable(context).then(function (available) {
                        if (available) {
                            ZillionRis.CommandManager.execute('examination.decline-examination', context);
                        }
                    }).then(null, function (h) {
                        ris.notify.showError('Unable to decline examination', (h && h.message) || 'An error occurred while trying to decline the examination');
                    })
                    break;

                case WorkflowModes.MultipleMode:
                    assignProtocolSubnav(context.ExaminationID, { decline: true });
                    break;
            }
        }

        function createOrderExaminationsController() {
            commandManager.assign({
                'order-approval.approve-examination': approveExamination,
                'order-approval.decline-examination': declineExamination
            });
            commandResources.assign({
                'order-approval.approve-examination': { title: locfmt('{ris,Approve}'), iconClass: { '16': 'fa fa-thumbs-up' } },
                'order-approval.decline-examination': { title: locfmt('{ris,Decline}'), iconClass: { '16': 'fa fa-thumbs-down' } }
            });

            var examinationContextMenu = new ZillionParts.CommandList();
            with (examinationContextMenu) {
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
            }

            var orderExaminationsActions = new ZillionParts.CommandList();
            with (orderExaminationsActions) {
                add('examination.housekeeping-state').showWhen('HousekeepingID');
                add('examination.open-memo').executeWith('{ ID: ExaminationID, HasMemo: HasMemo }');
                add('examination.add-intended-vetter').executeWith('{ExaminationID: ExaminationID, CurrentIntendedApproverID: IntendedVetterID }').hideWhen('HousekeepingID');

                add('order-approval.approve-examination').executeWith('{ ExaminationID: ExaminationID, ShouldAssignProtocol: HasAvailableProtocols && !HasProtocol }')
                    .showWhen('ExaminationTypeApprovalRequired || IntendedVetterID').hideWhen('HousekeepingID');
                if (window.permissions.hasCancelOrderPermission) {
                    add('order-approval.decline-examination').executeWith('{ ExaminationID: ExaminationID, ReasonList: window.pageConfig.CancellationReasonCategoryDecline }')
                        .showWhen('ExaminationTypeApprovalRequired || IntendedVetterID').hideWhen('HousekeepingID');
                }

                add('protocol.open-protocol').executeWith('{ examinationID: ExaminationID }').showWhen('HasProtocol');
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ExaminationID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: examinationContextMenu, manager: commandManager, resources: commandResources} },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', commands: { manager: commandManager, resources: commandResources, list: orderExaminationsActions }, dataType: 'commands', width: 120 },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 200 },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 120 },
                    { title: locfmt('{ris,FieldIntendedVetter}'), fieldID: 'IntendedVetterName', dataType: 'contact', contactID: 'IntendedVetterPersonID', width: 250 }
                ],
                sort: [
                    { "fieldID": "AccessionNumber", asc: true }
                ],
                gridOptions: {
                    createEmptyDataItem: createEmptyDataItem,
                    onRowCreated: onRowCreated
                }
            });


            function onRowCreated(item, data) {
                ZillionRis.AddUrgencyClasses(item, data.UrgencyID);
            }

            var aa = gridController.create();

            function createEmptyDataItem() {
                var orders = aa.dataView.getItems(true).length;
                if (orders > 0) {
                    var foo = $('<span>' + locfmt('{ris,NoExaminationsFoundFilter}') + '<br />' + orders + locfmt('{ris,ExaminationsInTotal}') + '<br/><a class="ui-link">' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                    $('a', foo).click(function () {
                        OrderApproval.OrderExaminationsViewModel.clearFilter();
                    });
                    return foo;
                } else {
                    return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                }
            }

            return aa;
        }

        OrderApproval.OrderExaminationsViewModel.gridOptions.selection.setMultiSelect(false);

        $('#WorkflowModes').buttonset();

        $('#OrderExaminationsPanel').groupPanel({ toolBar: $("#ExaminationsToolbar") });
        OrderApproval.OrderExaminationsViewModel.grid = $("#OrderExaminationsView");

        ko.applyBindings(OrderApproval.OrderExaminationsViewModel, $("#ExaminationsToolbar")[0]);
        ko.applyBindings(OrderApproval.OrderExaminationsViewModel, $("#OrderExaminationsPanel")[0]);

        OrderApproval.OrderExaminationsViewModel.gridSettingsStore.initialize('#OrderExaminationsView', OrderApproval.OrderExaminationsViewModel.gridOptions, 'orderExaminations', 'orderExaminations-worklist').loadSettings();

        OrderApproval.OrderExaminationsViewModel.loadSettings();

        Rogan.Ris.Locations.ensure();

        createOrderExaminationsContextMenu();

        OrderApproval.OrderExaminationsViewModel.refresh();

        OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.onUpdated.subscribe(function (e, data) {
            var foo = locfmt('{ris,Examinations_Title}') + ' (' + OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.getItems(false).length + '/' + OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.getItems(true).length + ')';

            var foo2 = $('<span></span>');
            foo2.append('<span>' + foo + '</span>');
            $('#OrderExaminationsPanel').groupPanel({ title: foo2 });
        });

        window.refreshOrdersExamination = refreshOrdersExamination;

        var check = 0;
        function refreshOrdersExamination() {
            var orderID = getSelectedOrdersPendingKey();
            if (orderID) {
                OrderApproval.OrderExaminationsViewModel.isLoading(true);

                var c = ++check;
                return Modules.ContentProvider('module://workflow/data/orderapprovalworklist', 'examinations', { OrderID: orderID })
                    .then(function (data) {
                        if (c === check) {
                            if (data) {
                                if (data.type == 'error') {
                                    if (data.data && data.data['message']) {
                                        ris.notify.showError('Failed to load the examinations', data.data.message);
                                    } else {
                                        ris.notify.showError('Failed to load the examinations', 'Failed to load the examinations.');
                                    }
                                } else {
                                    OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.setItems(data, 'ExaminationID');
                                    OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.refresh();

                                    examinationIDlist = '';
                                    for (var i = 0, ii = data.length; i < ii; i++) {
                                        if (i != 0) {
                                            examinationIDlist += "|";
                                        }
                                        examinationIDlist += data[i].ExaminationID.toString();
                                    }
                                }
                            } else {
                                ris.notify.showError('Failed to load the examinations', 'Failed to load the examinations.');
                            }
                        }
                    }, function (data) {
                        if (c === check) {
                            if (data && data['error']) {
                                ris.notify.showError('Failed to load the examinations', data['message']);
                            } else {
                                ris.notify.showError('Failed to load the examinations', 'Failed to load the examinations.');
                            }
                        }
                    }).always(function () {
                        if (c === check) {
                            OrderApproval.OrderExaminationsViewModel.isLoading(false);
                        }
                    });
            }
            else {
                OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.setItems([], 'ExaminationID');
                OrderApproval.OrderExaminationsViewModel.gridOptions.dataView.refresh();
                return $.Deferred().resolve().promise();
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
                        refreshOrdersExamination();
                    } else if (item.id == 'clear-filter') {
                        OrderApproval.OrderExaminationsViewModel.clearFilter();
                    } else if (item.id == 'configure') {
                        OrderApproval.OrderExaminationsViewModel.customizeView();
                    } else if (item.id == 'reset') {
                        OrderApproval.OrderExaminationsViewModel.resetSettings();
                        OrderApproval.OrderExaminationsViewModel.reset();
                    }
                }
            });
            var find = $('#OrderExaminationsPanel').groupPanel('widget').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function OrderExaminationsViewModel() {
            var self = this;

            this.gridOptions = createOrderExaminationsController();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.workflowMode = new ko.observable();
            this.selectedItem = new ko.observable(null);
            this.isLoading = new ko.observable(false);

            this.selectedItem.subscribe(function (v) {
                if (v) {
                    window['examinationID'] = v.ExaminationID;
                    $('#PatientHistoryView').virtualDataGrid('refresh');
                }
            });

            var hasLoaded = false;
            this.loadSettings = function () {
                ZillionRis.UserSettings.get('orderapproval.examinations', 'settings')
                    .then(function (data) {
                        var workflowMode;
                        try {
                            if (data) {
                                workflowMode = data.workflowMode;
                            }
                        } catch (ex) {
                            console.log('ERROR: ' + ex);
                        } finally {
                            workflowMode = workflowMode || WorkflowModes.SingleMode;
                            self.workflowMode(workflowMode);
                            $('#WorkflowModes').buttonset('refresh');
                            hasLoaded = true;
                        }
                    });
            };

            this.saveSettings = function () {
                ZillionRis.UserSettings.set('orderapproval.examinations', 'settings', {
                    workflowMode: self.workflowMode()
                });
            };

            var update = ZillionParts.Delay(function () {
                if (hasLoaded === true) {
                    self.saveSettings();
                }
            }, 1000, true);

            this.workflowMode.subscribe(update);

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
            };
            this.refresh = function () {
                this.gridOptions.dataView.refresh();
            };
            this.customizeView = function () {
                $('#OrderExaminationsView').customizeVirtualDataGrid();
            };

            this.resetSettings = function () {
                ZillionRis.UserSettings.set('orderexaminations', 'settings', null);
            };

            this.customizeFilter = function () {
                $('#OrderExaminationsView').pageSubNav('show');
            };

            this.clearFilter = function () {
                $('#OrderExaminationsView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            };

            this.viewLastAccessedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };
        }
    });
})(jQuery, window);
