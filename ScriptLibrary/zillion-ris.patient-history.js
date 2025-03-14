(function ($) {
    $.extend(true, window, {
        ZillionRis: {
            Grid: {
                PatientHistoryViewModel: viewModel
            }
        }
    });


    function viewModel(style, commands) {
        var self = this;
        this.dataView = ZillionParts.Data.DataSet();
        this.commands = commands;
        this.commandList = new ZillionParts.CommandList();
        this.actionsList = new ZillionParts.CommandList();

        var columnStyles = {
            'normal': [
                {
                    fieldID: 'context-menu',
                    title: '',
                    friendlyName: 'Context Menu',
                    dataType: 'context-menu',
                    commands: $.extend(true, self.commands, { list: self.commandList })
                },
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: $.extend(true, {}, self.commands, { list: self.actionsList }) },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 200, minWidth: 100 },
                { title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technicians', dataType: 'contact', contactID: 'Technicians', width: 100 },
                { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists', width: 100 },
                { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ReferringPhysicianName', dataType: 'contact', contactID: 'ReferringPhysicianName', width: 160 },
                { title: locfmt('{ris,FieldOrderID}'), fieldID: 'OrderNumber', width: 80 },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName', width: 80 },
                { title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 80 },
                { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName', width: 80 }
            ],
            'small': [
                {
                    fieldID: 'context-menu',
                    title: '',
                    friendlyName: 'Context Menu',
                    dataType: 'context-menu',
                    commands: $.extend(true, self.commands, { list: self.commandList }),
                    visible: false
                },
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', commands: $.extend(true, {}, self.commands, { list: self.actionsList }), width: 74 },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 160, minWidth: 100 },
                { title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technicians', width: 100, visible: false },
                { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists', width: 100, visible: false },
                { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ReferringPhysicianName', width: 160, visible: false },
                { title: locfmt('{ris,FieldOrderID}'), fieldID: 'OrderNumber', width: 80, visible: false },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName', width: 80 },
                { title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 80, visible: false },
                { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName', width: 80, visible: false }
            ]
        };

        this.selection = new ZillionParts.Data.DataSelection();
        this.selection.setMultiSelect(false);
        this.selectedItem = ko.observable();
        var key = 'ExaminationID';
        this.gridOptions = {
            dataView: this.dataView,
            selection: this.selection,
            keyField: key,
            columnDefaults: {
                allowFilter: true,
                allowSort: true,
                allowResize: true
            },
            createEmptyDataItem: function () {
                if (currentPatientID == 0) {
                    return $('<span>No patient selected.</span>');
                } else {
                    var count = self.dataView.getItems(true).length;
                    if (count > 0) {
                        var foo = $('<span>No examinations found with the current filter<br/>' + count + ' examinations in total<br/><a>Clear filter</a></span>');
                        $('a', foo).click(function () {
                            $(self.grids).virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
                        });
                        return foo;
                    } else {
                        return $('<span>No examinations found for the selected patient</span>');
                    }
                }
            },
            showFilterRow: true,
            onRowCreated: onItemCreated,
            columns: columnStyles[style || 'normal'],
            sort: [
                { "fieldID": "ScheduleDateTime", asc: false },
                { "fieldID": "AccessionNumber", asc: false }
            ],
            itemdblclick: function (e, args) {
            }
        };

        ZillionParts.GridView.Behaviors.RestrictToDataSet(this.gridOptions);

        self.isLoading = ko.observable(false);

        var singleAjax = ZillionRis.SingleAjax();

        var currentPatientID = 0;
        var historyCheck = 0;

        this.loadPatient = function (patientID) {
            var c = ++historyCheck;
            var dataView = self.dataView;
            $(self.grids).virtualDataGrid('refresh');

            var attemptToRefresh = function(dataView) {
                try {
                    $(self.grids).virtualDataGrid('refresh');
                    dataView.refresh();
                } catch (e) {
                    $(self.grids).virtualDataGrid('refresh');
                }
            };

            if (patientID != currentPatientID) {
                dataView.setItems([], 'ExaminationID');
                attemptToRefresh(dataView);
            }
            if (patientID) {
                self.isLoading(true);

                Modules.ContentProvider('module://workflow/data/examinations', 'query', { Source: 'urn:patient:' + patientID })
                    .then(function (data) {
                        if (c === historyCheck) {
                            dataView.setItems(data, 'ExaminationID');
                            attemptToRefresh(dataView);
                            currentPatientID = patientID;
                        }
                    }, function (data) {
                        ris.notify.showError('Patient History Error', locfmt('{ris,PatientSearch_ErrorLoadingPatientHistory}<br/><br/>' + data.message));
                    }).always(function () {
                        if (c === historyCheck) {
                            self.isLoading(false);
                        }
                    });
            }
    };

        function openContextMenu(item) {
            self.selection.add(item[key]);
        }

        function clickContextMenu(command, item) {
            if (command.id == '')
                return;
            self.executeCommand(command.id, item[key]);
        }

        function getContextMenuItems(item) {
            var items = [];
            if (item.ExaminationStatusID === 5 && item.PendingStudy === 'none') {
                items.push({ text: 'Move Back', id: 'back-to-in-department', iconClass: 'zillion-ris workflow-icon demote-status' });
            }
            items.push({ text: 'Not Performed', id: 'examination-not-performed', iconClass: 'zillion-ris workflow-icon declined' });
            items.push({ text: 'Discussion List', id: 'send-to-discussionlist', iconClass: 'zillion-ris patients-icon contact-information' });
            items.push({ text: 'House Keeping', id: 'house-keeping', iconClass: 'zillion-ris workflow-icon broom' });
            return items;
        }

        function onItemCreated($element, data) {
            if (data.ExaminationStatusID === 3) {
                $element.addClass('data-ignored').css({ opacity: 0.7, color: '#484' });
            }
        }

        this.clearFilter = function () {
            $('#PatientsGrid').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
        };

        this.pageKey = '';
        this.controlKey = '';
        this.grids = null;
        this.executeCommand = null;

        this.loadUserSettings = function () {
            ZillionRis.UserSettings.get(self.pageKey, self.controlKey).then(function (data) {
                if (data) {
                    $(self.grids).virtualDataGrid({ sort: data.sort, userColumns: data.columns });
                    $(self.grids).virtualDataGrid('refresh');
                }
            });
        };
        this.saveUserSettings = function (e, userOptions) {
            ris.notify.showInformation(null, 'Work list settings saved.', 1000);
            ZillionRis.UserSettings.set(self.pageKey, self.controlKey, userOptions);
        };
        this.resetUserSettings = function () {
            ZillionRis.UserSettings.set(self.pageKey, self.controlKey, null);

            $(self.grids).virtualDataGrid({ sort: [], userColumns: [] });
            $(self.grids).virtualDataGrid('refresh');
        };
        this.customize = function () {
            $(self.grids).customizeVirtualDataGrid();
        };

        this.completeAllExaminations = function () {
            var keys = this.dataView.getItems().joinText(';', function (a) { return a[key]; });
            self.executeCommand('complete-examinations', keys);
        };
    }
})(jQuery);