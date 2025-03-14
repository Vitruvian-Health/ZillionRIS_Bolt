(function ($) {
    $.extend(true, window, {
        ZillionRis: {
            LastAccessedShowSubNav: showLastAccessed
        }
    });

    var _personID = 0;
    var _view = null;
    function showLastAccessed(personID) {
        initLastAccessed();

        _personID = personID;

        Loading.Show(locfmt('{ris,General_LoadingOverlay}'));
        _view.then(function(view) {
            view.pageSubNav('show');
        }).always(function() {
            Loading.Hide();
        });
    }

    function initLastAccessed() {
        if (_view === null) {
            var d = $.Deferred(), vvv;
            _view = d.promise();

            var vm = new LastAccessedExaminationsViewModel();
            vm.attachLists();
            vm.grid = '#LastRecordsGrid';

            vm.close = function () {
                vvv.pageSubNav('hide');
            };

            $.when(
                Modules.Template("module://last-accessed/view/page")
            ).then(function (view) {
                view = view.clone();

                var thing = function () { vm.refresh(); };

                vvv = view.pageSubNav({
                    open: function () {
                        ZillionRis.SiteEvents.broadcast('intermediate-starting', null, {});

                        // Related to "Dictation/Vetting/Patient Overview Page: Image remain's open, when user click on other examination." [IN:007416]
                        // Clear image viewer to make sure that we do not display images that do not correspond to whatever is selected in CSPS page.
                        ZillionRis.ImageViewer().clear();

                        vm.count(1);
                        vm.refresh();
                        ZillionRis.SiteEvents.subscribe('lazy-page-update', thing);
                    },
                    close: function() {
                         ZillionRis.SiteEvents.unsubscribe('lazy-page-update', thing);

                        ZillionRis.ImageViewer().clear();

                        // Image viewer has been cleared, so we're displaying other images than before (assuming that we were displaying images before).
                        var displayingOtherImages = true;

                        ZillionRis.SiteEvents.broadcast('intermediate-finished', null, { displayingOtherImages: displayingOtherImages });
                    }
                });

                ko.applyBindings(vm, vvv[0]);

                setInterval(function () {
                    if ($(vm.grid).is(':visible')) {
                        $(vm.grid).virtualDataGrid('refresh');
                    }
                }, 20000);

                d.resolve(vvv);
            });
        }
    }

    function LastAccessedExaminationsViewModel() {
        var self = this, pageSize = 20;

        this.count = new ko.observable(1);
        this.records = new ko.observable();
        this.more = function () {
            this.count(this.count() + 1);
            this.refresh();
        };
        this.less = function () {
            if (this.count() > 1) {
                this.count(this.count() - 1);
                this.refresh();
            }
        };

        var check = 0;

        this.refresh = function () {
            self.isLoading(true);

            var c = ++check;
            Modules.ContentProvider('module://last-accessed/data/last-accessed', 'query', { Count: this.count() * pageSize, PersonID: _personID })
                .then(function (a) {
                    if (c === check) {
                        self.dataView.setItems(a, 'ExaminationID');
                        self.dataView.refresh();
                    }
                }, function (x) {
                    self.dataView.setItems([], 'ExaminationID');
                    self.dataView.refresh();

                    if (x && x.message) {
                        ris.notify.showError('Last Accessed Error', 'Due to an error the last accessed examinations could not be loaded.<br/><br/>Details:<br/>' + x.message);
                    } else {
                        ris.notify.showError('Last Accessed Error', 'Due to an error the last accessed examinations could not be loaded.');
                    }
                }).always(function () {
                    if (c === check) {
                        self.records(self.dataView.getItems(true).length);
                        self.isLoading(false);
                    }
                });
        };
        this.grid = null;
        this.dataView = ZillionParts.Data.DataSet();

        this.selection = new ZillionParts.Data.DataSelection();
        this.selection.setMultiSelect(false);

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

        this.commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
        this.commandResources = new ZillionParts.CommandResources(ZillionRis.CommandResources);

        this.commandManager.assign({
            'examination.to-transcription-page': {
                execute: function (source) {
                    var speechStateID = window.getUrnSpecification("speechstate", source);
                    this.execute('speechstate.cancel-speech-state', speechStateID);
                },
                canExecute: function () {
                    return true;
                }
            },
            'examination.to-dictation-page': {
                execute: function (context) {
                    var d = $.Deferred();
                    if (context.SpeechStatus == "urn:speechstatus:performingtranscription") {
                        $.when(
                            Modules.Task('module://dictation/task/get-transcriptionist', 'request', { AccessionNumber: 'urn:accessionnumber:' + context.AccessionNumber })
                        ).always(function (transcriptionistName) {
                            ZillionRis.Confirmation({
                                title: 'Examination Locked',
                                content: '<p>' + locfmt('{ris,Dictation_ExaminationBeingTranscripted}', { transcriptionist: transcriptionistName ? '<span class="text-emphasis">' + transcriptionistName + '</span>' : '<span>a user</span>' }) + '</p>',
                                buttons: 'ok', width: 500
                            }
                            ).always(function (a) {
                                d.reject();
                            });
                        });
                    } else {
                        $.when(
                            Modules.Task('module://dictation/task/back-to-dictation', 'process', { AccessionNumber: 'urn:accessionnumber:' + context.AccessionNumber })
                        ).then(function (data) {
                            ZillionRis.SiteEvents.broadcast('lazy-page-update');
                        }, function (data) {
                            ris.notify.showError('Failed to move back the examination', data.message);
                            d.reject();
                        });
                    }
                    return d.promise();
                },
                canExecute: function () {
                    return true;
                }
            },
            'examination.to-approval-page': {
                execute: function (source) {
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                    this.execute('examination.demote-status', source);
                },
                canExecute: function () {
                    return true;
                }
            },
            'order.to-booking-page': {
                execute: function (orderID) {
                    $.when(
                        Modules.Task('module://workflow/task/back-to-bookingpage', 'process', { OrderID: 'urn:order:' + orderID })
                    ).then(function (data) {
                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                    }, function (data) {
                        ris.notify.showError('Failed to move back the order', data.message);
                        d.reject();
                    });
                },
                canExecute: function () {
                    return true;
                }
            },
            'imaging.study.to-in-progress': {
                execute: function(examinationID) {
                    var d = $.Deferred();

                    $.when(
                        Modules.Task('module://workflow/task/backtoinprogress', 'process', { ExaminationID: examinationID })
                    ).then(function(model) {
                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                        d.resolve();
                    }, function(data) {
                        ris.notify.showError('Failed to call back the examination', data.message);
                        d.reject();
                    });
                },
                canExecute: function() {
                    return true;
                }
            }
        });

        this.commandResources.assign({
            'examination.to-transcription-page': { title: locfmt('{ris,Transcription_BackToTranscriptionPage}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status' } },
            'examination.to-dictation-page': { title: locfmt('{ris,Worklist_BackToDictationPage}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status' } },
            'examination.to-approval-page': { title: locfmt('{ris,OrderApproval_BackToApproval}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status' } },
            'order.to-booking-page': { title: locfmt('{ris,OrderBooking_BackToBooking}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status' } },
            'imaging.study.to-in-progress': { title: locfmt('{ris,Imaging_CallbackExamination}'), iconClass: { '16': 'zillion-ris workflow-icon demote-status' } }
        });

        // Register Resources.
        ZillionRis.Commands.RegisterResources(this.commandResources);

        this.commandList = new ZillionParts.CommandList();
        this.actionList = new ZillionParts.CommandList();
        
        with (this.commandList) {
            add('examination.view-images').executeWith('ExaminationID').showWhen('ExaminationStatusID === "COM" || ExaminationStatusID === "AUT" || ExaminationStatusID ==="BIL" || ExaminationStatusID === "VER"');
            
            if (window.permissions.hasSendToHousekeepingPermission) {
                add('examination.send-to-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                add('examination.remove-from-housekeeping').executeWith('{ Patient: PatientName, ExaminationDisplayName: ExaminationDisplayName, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
            }

            if (window.permissions.hasFailsafePermission) {
                add('examination.send-to-failsafe').executeWith('{ ExaminationID: ExaminationID }')
                    .hideWhen('["CAN", "INV", "WAI", "HEL", "APP", "SCH", "IND", "INP"].indexOf(ExaminationStatusID) > -1 || HasUnhandledFailsafe');
                add('examination.cancel-failsafe').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasUnhandledFailsafe');
            }

            if ((window.permissions.hasTranscriptionPermission || window.permissions.hasAuthorizationPermission) && window.permissions.hasDictationWorklistPermission) {
                add('examination.to-transcription-page').executeWith('ChangeSource').showWhen('ChangeType==="urn:speechstatus:completedtranscription"');
                add('examination.to-dictation-page').executeWith('{ AccessionNumber: AccessionNumber, SpeechStatus: ChangeType}').showWhen('ChangeType==="urn:speechstatus:completeddictation" || ChangeType==="urn:speechstatus:performingtranscription"');
                add('examination.create-addendum').executeWith('{ AccessionNumbers: [AccessionNumber] }').showWhen('HasReport').hideWhen(function (examination) { return examination.HousekeepingID || examination.StatusID === "cancelled" || examination.AddendumDictationStatuses.qAny('$item != "FIN"'); });
                add('examination.cancel-addendum').executeWith('{ AccessionNumbers: [AccessionNumber] }').showWhen(function (examination) { return examination.AddendumDictationStatuses.qAny('$item != "FIN"'); });
            } else {
                if (window.permissions.hasTranscriptionPermission || window.permissions.hasAuthorizationPermission) {
                    add('examination.to-transcription-page').executeWith('ChangeSource').showWhen('ChangeType==="urn:speechstatus:completedtranscription"');
                }

                if (window.permissions.hasDictationWorklistPermission) {
                    add('examination.to-dictation-page').executeWith('{ AccessionNumber: AccessionNumber, SpeechStatus: ChangeType}').showWhen('ChangeType==="urn:speechstatus:completeddictation" || ChangeType==="urn:speechstatus:performingtranscription" || ChangeType==="urn:speechstatus:completedtranscription"');
                    add('examination.create-addendum').executeWith('{ AccessionNumbers: [AccessionNumber]}').showWhen('HasReport');
                }
            }

            add('order.order-information').executeWith('{ OrderID: OrderID }');

            if (window.permissions.hasImagingPermission) {
                add('imaging.study.to-in-progress').executeWith('ExaminationID').showWhen('ExaminationStatusID === "COM" && ChangeSource === "urn:status:completed"').hideWhen('HousekeepingID');
            }

            if (window.permissions.hasOrderApprovalPermission) {
                add('examination.to-approval-page').executeWith('{ ExaminationIDs: [ExaminationID], SourceStatusID: "approved", TargetStatusID: "waiting" }').showWhen('ExaminationStatusID == "APP"');
            }
            
            if (window.permissions.hasOrderBookingPermission) {
                add('order.to-booking-page').executeWith('OrderID').showWhen('ExaminationStatusID === "SCH"');
            }

            if (window.permissions.hasReceptionPermission) {
                add('order.demote-status').executeWith('{ OrderID: OrderID, Patient: PatientName, SourceStatusID: "indepartment", TargetStatusID: "scheduled" }').showWhen('ExaminationStatusID == "IND"');
            }
        }

        with (this.actionList) {
            if (window.permissions.hasFailsafePermission) {
                add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
            }

            add('examination.housekeeping-state').showWhen('HousekeepingID');
            if (window.permissions.hasEditOrderPermission) {
                add('order.edit-order').executeWith('{ OrderID: OrderID }').hideWhen('HousekeepingID');
            }
            add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
            add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, Title: locfmt("{ris,OrderDocumentsFor} ") + PatientName, HasStoredDocument: HasOrderRequestForm }');
            add('protocol.open-protocol').executeWith('{ examinationID: ExaminationID }').showWhen('HasProtocol');
            add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);
        }

        this.attachLists = function () {
            this.gridOptions.columns[0].commands.list = this.commandList;
            this.gridOptions.columns[1].commands.list = this.actionList;
        };

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
                var count = self.dataView.getItems(true).length;
                if (count > 0) {
                    var foo = $(locfmt('<span>{ris,Imaging_NoDataAvailable}<br /><a class="ui-link">{ris,General_ClearFilter}</a></span>'));
                    $('a', foo).click(function () {
                        $(self.grid).virtualDataGrid('clearFilter');
                    });
                    return foo;
                } else {
                    return $('<span>' + locfmt('{ris,Imaging_NoAppointmentsForToday}') + '</span>');
                }
            },
            showFilterRow: true,
            columns: [
                { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: this.commandList, manager: this.commandManager, resources: this.commandResources} },
                { title: locfmt('{ris,FieldActions}'), fieldID: 'actions', dataType: 'commands', width: 112, commands: { list: this.actionList, manager: this.commandManager, resources: this.commandResources} },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'Scheduled', width: 110, dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldLastAccessed}'), fieldID: 'LastAccessedTime', width: 110, dataType: 'scheduled-or-event-time' },
                {
                    title: locfmt('{ris,FieldPatientName}'), fieldID: 'PatientName',
                    dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null, contactID: 'PatientID', width: 150
                },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationDisplayName', width: 300 },
                { title: locfmt('{ris,FieldTechnician}'), fieldID: 'TechnicianNames', dataType: 'contact', contactID: 'TechnicianIDs', width: 100 },
                { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'RadiologistNames', dataType: 'contact', contactID: 'RadiologistIDs', width: 100 },
                { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'ExaminationStatusName' },
                { title: locfmt('{ris,FieldPatientDateOfBirth}'), fieldID: 'DateOfBirth', dataType: 'date-of-birth' },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 120 }
            ],
            sort: [
                { "fieldID": "LastAccessedTime", asc: false },
                { "fieldID": "Scheduled", asc: false },
                { "fieldID": "AccessionNumber", asc: true }
            ]
        };

        this.isLoading = ko.observable(false);
    }
})(jQuery);
