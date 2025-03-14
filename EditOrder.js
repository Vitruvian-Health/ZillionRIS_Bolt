(function($, window, undefined) {
    var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);

    var globalExaminationLock, lockChanged = new ZillionParts.Event();

    function requestLock(patientnumber) {
        if (!globalExaminationLock) {
            return globalExaminationLock = LockResource(locfmt('{ris,LockingPatient}'), ['urn:patient:' + patientnumber], locfmt('{ris,OrderBooking_ExaminationLockedByUser}', { user: window['currentUserName'] }), 2)
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
                    globalExaminationLock = LockResource(locfmt('{ris,LockingPatient}'), ['urn:patient:' + patientnumber], locfmt('{ris,OrderBooking_ExaminationLockedByUser}', { user: window['currentUserName'] }), 2)
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

    window.beforeClose = function() {
        var urlParam = /reloadAfterClose=([^&]+)/.exec(window.location.search);
        if (urlParam) {
            window.sessionStorage['reloadAfterClose'] = urlParam[1];
        }
    };

    $(function() {
        window.ExaminationTypeSource = new ContentProviderSource2('module://workflow/data/examinationtypes', { projector: '{id:ID,code:Code,text:"["+Code+"] "+DisplayName}' });
        $(window).on('unload', function () {
            releaseLock();
        });
    });

    window.qandaForms = function(statusChanges, navigateBack) {
        var d = commandManager.execute('examination.lookforqandaforms-multiplestatuses', { StatusesWithExaminations: statusChanges });
        d.always(function() {
            ZillionRis.GoBackToPreviousPage();
        });
    };

    window.scheduledBySecretary = function(statusChanges, orderId) {

        // STEP 1: look for Q&A forms
        var d = $.Deferred();
        if (statusChanges) {
            d = commandManager.execute('examination.lookforqandaforms-multiplestatuses', { StatusesWithExaminations: statusChanges });
        } else {
            d.resolve();
        }

        d.always(function() {
            // STEP 2: schedule the order (this contains the schedule and indepartment status changes with q&A froms and print patient label)
            commandManager.execute('order.schedule-now', { OrderID: orderId })
                .then(function() {

                    // STEP 3: navigate to Reception page
                    ZillionRis.Navigate({ page: "ReceptionLow.aspx", hint: locfmt('{ris,OrderBooking_LoadingOverlay}') });
                }, function() {
                    // TODO:
                });
        });
    };

    window.scheduledByTechnician = function(statusChanges, orderId) {
        // STEP 1: look for Q&A forms
        var d = $.Deferred();
        if (statusChanges) {
            d = commandManager.execute('examination.lookforqandaforms-multiplestatuses', { StatusesWithExaminations: statusChanges });
        } else {
            d.resolve();
        }

        d.always(function() {
            // STEP 2: schedule the order (this contains the schedule and indepartment status changes with q&A froms and print patient label)
            commandManager.execute('order.schedule-now', { OrderID: orderId })
                .then(function() {
                    // STEP 3: give the possibility to change the order's status to in progress
                    commandManager.execute('order.promote-status', { OrderID: orderId, SourceStatusID: "indepartment", TargetStatusID: "inprogress" })
                    .always(function () {

                        // STEP 4: navigate to Imaging page
                        ZillionRis.Navigate({ page: "Imaging.aspx", hint: locfmt('{ris,OrderBooking_LoadingOverlay}') });
                    });
                }, function() {
                    // TODO:
            });
        });
    };

    window.statusChangeCallback = function(s, e) {
        if (e) {
            if (e.errorMessage) {
                alert(e.errorMessage);
            } else {
                switch (e.resultCode) {
                    case 'after-global-popup':
                        break;
                    default:
                        doPagePostBack('statuschange:success');
                        e.cancelPostBack = true;
                        break;
                }
            }
        }
    };

    window.scanRequestForm = function(orderNumber, callback) {
        commandManager.execute('order.scan-document', { OrderNumber: orderNumber })
            .always(function() {
                if (callback) {
                    callback();
                }
            });
    };

    window.ValidateForm = function() {
        return $('.validation-error').length === 0;
    };

    window.autoScheduleOrder = function (statusChanges, orderOrExams, patientName, patientID) {
        // STEP 1: look for Q&A forms
        var d = $.Deferred();
        if (statusChanges) {
            d = commandManager.execute('examination.lookforqandaforms-multiplestatuses', { StatusesWithExaminations: statusChanges });
        } else {
            d.resolve();
        }

        d.always(function() {
            requestLock(patientID).then(function() {
                commandManager.execute('order.auto-schedule', { Examinations: orderOrExams, PatientName: patientName, CommandUsed: "autoScheduleOrder" })
                    .then(function() {
                        ZillionRis.GoBackToPreviousPage();
                        //ZillionRis.Patients.Search('auto', patientNumber);
                    }, function() {
                        releaseLock();
                    });
            }, function(x) {
                ris.notify.showError(locfmt('{ris,OrderBooking_FailLoadingRoomOverview}'), x.reason);
            });
        });
    };

    window.manualScheduleOrder = function (statusChanges, orderOrExams, patientName, patientID, orderNumber) {
        // STEP 1: look for Q&A forms
        var d = $.Deferred();
        if (statusChanges) {
            d = commandManager.execute('examination.lookforqandaforms-multiplestatuses', { StatusesWithExaminations: statusChanges });
        } else {
            d.resolve();
        }

        d.always(function() {
            requestLock(patientID).then(function() {
                commandManager.execute('order.manual-schedule', { Examinations: orderOrExams, OrderNumber: orderNumber, PatientName: patientName, CommandUsed: "manualScheduleOrder" })
                    .then(function() {
                        releaseLock();
                        ZillionRis.GoBackToPreviousPage();
                        //ZillionRis.Patients.Search('auto', patientNumber);
                    }, function() {
                        releaseLock();
                    });
            }, function(x) {
                ris.notify.showError(locfmt('{ris,OrderBooking_FailLoadingRoomOverview}'), x.reason);
            });
        });
    };

    window.finishManualBooking = function (taskID) {
        commandManager.execute('order.validate-schedule', { TaskID: taskID })
        .then(function () {
            ZillionRis.GoBackToPreviousPage();
            //ZillionRis.Patients.Search('auto', patientNumber);
        });
    };

    window.editCancellationReason = function (examIDs, taskID, defaultReasonID, defaultCommentText, postbackCommand) {
        commandManager.execute('examination.cancel', {
            ExaminationID: examIDs,
            ReasonList: window.pageConfig.CancellationEditOrder,
            Title: locfmt("{ris,FieldCancellationReasons}"),
            SaveToTaskID: taskID,
            ReasonID: defaultReasonID,
            DefaultCommentText: defaultCommentText
        }).then(function() {
            if (postbackCommand) {
                doPagePostBack(postbackCommand);
            }
        });
    };

    window.changedExaminations = function(context) {
        var d = $.Deferred();

        var toCompleted = context.TargetStatusID === 'completed';
        if (toCompleted === true) {
            context.TargetStatusID = 'inprogress';
            context.HideUserSelect = false;
        }

        commandManager.execute('order.promote-status', {
                OrderID: context.OrderID,
                SourceStatusID: context.SourceStatusID,
                TargetStatusID: context.TargetStatusID,
                ExaminationIDs: context.ExaminationIDs,
                HideUserSelect: context.HideUserSelect,
                PreviousTechnicians: context.PreviousTechnicians,
                Forced: toCompleted
            })
            .then(function() {
                if (toCompleted) {
                    commandManager.execute('examination.promote-status', { ExaminationIDs: context.ExaminationIDs, SourceStatusID: 'inprogress', TargetStatusID: 'completed' })
                        .then(function() {
                            d.resolve();
                            ZillionRis.GoBackToPreviousPage();
                        }, function() {
                            d.reject();
                            doPagePostBack('changeexamination:cancelled');
                        });
                } else {
                    d.resolve();
                    ZillionRis.GoBackToPreviousPage();
                }
            }, function() {
                d.reject();
                doPagePostBack('changeexamination:cancelled');
            });
        return d;
    };

    window.finishImportingOrder = function (orderID, patientID, scheduledDate, retrospectiveBooking) {
        var d = $.Deferred();
        commandManager.execute('order.import-order', {
            OrderID: orderID,
            PatientID: patientID,
            ScheduledDate: scheduledDate,
            RetrospectiveBooking: retrospectiveBooking
        }).then(function () {
                d.resolve();
                ZillionRis.GoBackToPreviousPage();
            }, function () {
                d.reject();
            }
        );
        return d;
    };

    window.shrinkCells = function(cells) {
        var maxCellWidth = 0;

        $(cells).each(function(idx, cell) {
            var cellWidth = 0;
            $(cell).children().each(function (idx, child) {
                if ($(child).is(':visible')) {
                    cellWidth += $(child).outerWidth(true);
                }
            });
            maxCellWidth = Math.max(maxCellWidth, cellWidth);
        });

        $(cells).width(maxCellWidth);
    };

    var isApplyingBindings = false;
    $(function () {
        Rogan.Ris.Locations.ensure();

        var vm = new EditOrderModel();
        window.updateLocationSchedule = function(x) {
            vm.possibleLocations.load(x);
        };

        $('#Content').addClass('content-maximized');
        setTimeout(function() {
            $('#Content').find(ZillionParts.Setup.NextInput.Selectors.join(',')).not(ZillionParts.Setup.NextInput.Exceptions.join(',')).first().focus();
        });

        var isSecondCopyRequiredChecked = $('[name=SecondCopyRequired]').is(':checked');

        isApplyingBindings = true;
        ko.applyBindings(vm, $('#Content')[0]);
        isApplyingBindings = false;

        // Initialize the secondCopyRequired property of the model using the initial state of the "second copy required"
        // checkbox in the view.
        vm.secondCopyRequired(isSecondCopyRequiredChecked);

        var datepickerOptions = { changeMonth: true, changeYear: true, showButtonPanel: true, showWeek: true, showOtherMonths: true, selectOtherMonths: true };

        $('[name=DateOfRequest]').datepicker($.extend(true, { maxDate: '0' }, datepickerOptions));
        $('[name=ImportOrderDate]').datepicker(datepickerOptions);
        $('[name=RetrievalDate]').datepicker(datepickerOptions);
    });

    function EditOrderModel() {
        var self = this;

        this.disableButtons = function () {
            $(".edit-order-onvalid").attr("disabled", "disabled");
        };

        this.requestingLocationsOff = ko.computed(function() {
            return !window.pageConfig.ShowRequestingLocation;
        });

        this.triggerValidation = ko.observable(true);

        this.referringPhysicianSource = new Modules.ContentProviderSource('module://workflow/data/physicians', {
            cache: {
                search: false
            },
            emptyText: true,
            projector: '{ id: ID, title: DisplayWorkLocation, text: Initials + " " + DisplayName + ";  " + Address + (FunctionSpecialization != "" ?  "; " + addZeroWidthSpace(FunctionSpecialization) : ""), source: $item }',
            onQuerying: function(x) {
                x.ReferralTypeID = self.referralType() && self.referralType().id;
                x.Search = x.Text;
            }
        });
        this.secondCopyRequired = ko.observable(false);
        this.copyToPhysicianSource = new Modules.ContentProviderSource('module://workflow/data/physicians', {
            emptyText: true,
            projector: '{ id: ID, text: Initials + " " + DisplayName + "; " + Address + (FunctionSpecialization != "" ?  "; " + addZeroWidthSpace(FunctionSpecialization) : ""), source: $item }',
            onQuerying: function (x) {
                x.Search = x.Text;
            }
        });
        this.copyToPhysician = ko.observable();
        this.copyToWorkLocation = ko.observable();
        this.copyToRequesterLocation = ko.observable();
        this.copyToWorkLocationSource = new Modules.ContentProviderSource('module://workflow/data/physician-worklocation', {
            emptyText: true,
            cache: {
                search: false
            },
            projector: '{ id: ID, text: DisplayName, source: $item }',
            onQuerying: function (data) {
                var copyToPhysician = self.copyToPhysician();
                if (copyToPhysician && copyToPhysician.id) {
                    data.PhysicianID = copyToPhysician.id;
                }
            }
        });

        this.schedulingUsersSource = new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { Search: x, WorksDuring: new Date() }; }, '{ UserID: $data }');
        this.requestingLocationSource = new Modules.ContentProviderSource('module://workflow/data/requesting-location', {
            queryOnClear: true,
            emptyText: true,
            projector: '{ id: ID, text: Code + " " + DisplayName, source: $item }',
            onQuerying: function (x) {
                x.Search = x.Text;
            }
        });
        this.requestingWorkLocationSource = new Modules.ContentProviderSource('module://workflow/data/physician-worklocation', {
            emptyText: true,
            cache: {
                search: false
            },
            projector: '{ id: ID, text: DisplayName, source: $item }',
            onQuerying: function (data) {
                var referringPhysician = self.referringPhysician();
                if (referringPhysician && referringPhysician.id) {
                    data.PhysicianID = referringPhysician.id;
                }
            }
        });

        this.referralTypeSource = new Modules.ContentProviderSource('module://workflow/data/referraltypes', {
            queryOnClear: true,
            emptyText: true,
            projector: '{ id: ID, text: DisplayName }',
            cache: {
                search: false
            },
            onQuerying: function(data) {
                var referringPhysician = self.referringPhysician();
                if (referringPhysician && referringPhysician.id) {
                    data.PhysicianID = referringPhysician.id;
                }
            }
        });
        this.dateOfRequest = new ko.observable($('[name=DateOfRequest]').val());
        this.retrievalDate = new ko.observable($('[name=RetrievalDate]').val());
        this.possibleLocations = new PossibleLocations();
        this.patientCategory = ko.observable();
        this.referralType = ko.observable();
        this.referringPhysician = ko.observable();
        this.requestingWorkLocation = ko.observable();
        this.schedulingUserID = ko.observable();
        this.requestingLocation = ko.observable();
        this.requireRequestingWorkLocation = ko.computed(function() {
            var p = self.referringPhysician();
            if (p && p.source) {
                return p.source.HasWorkLocation;
            }
            return false;
        });
        this.requireCopyToWorkLocation = ko.computed(function () {
            var p = self.copyToPhysician();
            if (p && p.source) {
                return p.source.HasWorkLocation;
            }
            return false;
        });

        this.orderType = ko.observable();
        this.isOrderTypeRequired = window.pageConfig.IsOrderTypeRequired;
        this.orderTypeValid = ko.computed(function () {
            if (self.isOrderTypeRequired){
                return !!self.orderType();
            }
            return true;
        }, self);

        this.importDate = ko.observable();

        Sys.WebForms.PageRequestManager.getInstance().add_endRequest(function() {
            self.UpdateScheduleButtons();
        });

        this.referralType.subscribe(function (type) {
            //if referraltype is null, clear referrer:
            if (type == null) {
                // Fix for bug 7386:
                // Don't clear referring physician when ko.applyBindings is running because that
                // would cause the initial view of the order to differ from what is stored in the
                // database.
                if (!isApplyingBindings) {
                    self.referringPhysician(null);
                }
            }
            else if (type && (type.text === "Huisarts" || type.text === "GP")) {
                var generalPractitionerId = $('[name=PatientGPPhysicianID]').val();
                var refPhy = self.referringPhysician();
                var referringPhysicianNotSelected = !refPhy;
                if (referringPhysicianNotSelected &&
                    generalPractitionerId && generalPractitionerId != "0") {
                    self.referringPhysician(generalPractitionerId);
                    $('[name=PhysicianID]').val(generalPractitionerId);
                }
            }
            if (self.referringPhysician())
                self.UpdateScheduleButtons();
        });

        this.referringPhysician.subscribe(function (val) {
            var requestingLocationsAreOff = self.requestingLocationsOff() && self.requestingLocationsOff() === true;

            //if requesting locations are off, just update the scheduling buttons.
            if (requestingLocationsAreOff) {
                self.UpdateScheduleButtons();
                return;
            }
            if (val == null) {
                if (!isApplyingBindings) {
                    self.requestingWorkLocation(null);
                    self.requestingLocation(null);
                }
            }
            else if (val && val.source) {
                var workLocation = self.requestingWorkLocation();
                if (workLocation && workLocation.source && !workLocation.source.PhysicianIDs.qContains(val.source.ID)) {
                    // Physician not known by the work location, clear the input value.
                    self.requestingWorkLocation(null);
                }
                else if (self.requireRequestingWorkLocation())
                    self.requestingLocation(null);
                else
                    self.requestingWorkLocation(null);
                }
            
        });


        this.copyToPhysician.subscribe(function (val) {
            var requestingLocationsAreOff = self.requestingLocationsOff() && self.requestingLocationsOff() === true;

            //if requesting locations are off, just update the scheduling buttons.
            if (requestingLocationsAreOff) {
                self.UpdateScheduleButtons();
                return;
            }
            if (val == null) {
                if (!isApplyingBindings) {
                    self.copyToWorkLocation(null);
                    self.copyToRequesterLocation(null);
                }
            }
            else if (val && val.source) {
                var workLocation = self.copyToWorkLocation();
                if (workLocation && workLocation.source && !workLocation.source.PhysicianIDs.qContains(val.source.ID)) {
                    // Physician not known by the work location, clear the input value.
                    self.copyToWorkLocation(null);
                }
                else if (self.requireCopyToWorkLocation())
                    self.copyToRequesterLocation(null);
                else
                    self.copyToWorkLocation(null);
            }

        });

        this.requestingWorkLocation.subscribe(function (val) {
          if (!val) {
                $('[name=RequestingWorkLocationID]').val(null);
            }
            self.UpdateScheduleButtons();
        });

        this.requestingLocation.subscribe(function (val) {
            if (!val) {
                $('[name=RequestingLocationID]').val(null);
            }
            self.UpdateScheduleButtons();
        });

        this.secondCopyRequired.subscribe(function (val) {
            self.UpdateScheduleButtons();
        })

        this.copyToWorkLocation.subscribe(function (val) {
            if (!val) {
                $('[name=CopyToWorkLocationID]').val(null);
            }
            self.UpdateScheduleButtons();
        });

        this.copyToRequesterLocation.subscribe(function (val) {
            if (!val) {
                $('[name=CopyToRequesterLocationID]').val(null);
            }
            self.UpdateScheduleButtons();
        });

        this.patientCategory.subscribe(function () {
            self.UpdateScheduleButtons();
        });

        this.orderType.subscribe(function () {
            if (self.isOrderTypeRequired) {
                self.UpdateScheduleButtons();
            }
        });

        this.schedulingUserID.subscribe(function () {
            self.UpdateScheduleButtons();
        });

        this.dateOfRequest.subscribe(function () {
            var dateOfRequest = new Date.parseLocale(self.dateOfRequest(), currentCulture.dateTime.dateShort);
            var retrievalDate = new Date.parseLocale(self.retrievalDate(), currentCulture.dateTime.dateShort);
            var dateNow = moment().startOf('day').toDate();

            //Requestdates may not be in the future.
            if (dateOfRequest.daysOffsetTo(dateNow) > 0) {
                self.dateOfRequest(moment(dateNow).format(window.ZillionRis.ToMomentFormat(currentCulture.dateTime.dateShort)));
                ris.notify.showError(locfmt('{ris,CommandEditOrder}'), locfmt('{ris,EditOrder_InvalidRequestDate}'));
            }
            
            //Receiced date must be newer than the request date.
            if (typeof self.retrievalDate() !== 'undefined' && retrievalDate.daysOffsetTo(dateOfRequest) < 0) {
                $('[name=RetrievalDate]').val(self.dateOfRequest());
                self.retrievalDate($('[name=RetrievalDate]').val());
            }

            //Do not allow to select dates of the Receiced date picker before the Request date.
            $('[name=RetrievalDate]').datepicker('option', 'minDate', $('[name=DateOfRequest]').datepicker('getDate'));
        });

        this.retrievalDate.subscribe(function () {
            var dateOfRequest = new Date.parseLocale(self.dateOfRequest(), currentCulture.dateTime.dateShort);
            var retrievalDate = new Date.parseLocale(self.retrievalDate(), currentCulture.dateTime.dateShort);
            if (typeof self.dateOfRequest() !== 'undefined' && dateOfRequest.daysOffsetTo(retrievalDate) > 0) {
                $('[name=RetrievalDate]').val(self.dateOfRequest());
                self.retrievalDate(self.dateOfRequest());
                ris.notify.showError(locfmt('{ris,CommandEditOrder}'), locfmt('{ris,EditOrder_InvalidReceivedDate}'));
            }
        });

        function IsValid() {
            $($('.ris-examination-type-laterality').toArray().qWhere('$item.value == ""'))
                .next('.ris-examination-type-laterality')
                .each(function(index, dropdown) {
                    $(dropdown).addClass('validation-error');
                });

            var requestingLocationsAreOff = self.requestingLocationsOff() && self.requestingLocationsOff() === true;
            if ((requestingLocationsAreOff == false && self.requestingWorkLocation() == null && self.requestingLocation() == null) ||
                self.referringPhysician() == null ||
                self.referralType() == null ||
                (!self.disablePatientCategories() && !self.patientCategory()) ||
                (self.isOrderTypeRequired && !self.orderType())) 
            {
                return false;
            }

            if (self.secondCopyRequired()) {
                if (self.copyToPhysician() == null) {
                    return false;
                }
                if (!requestingLocationsAreOff) {
                    if (self.copyToWorkLocation() == null && self.copyToRequesterLocation() == null) {
                        return false;
                    }
                }
            }

            // Any laterality is required and not filled
            if ($('.ris-examination-type-laterality').toArray().qWhere('$item.value == ""').qAny()) {
                $('#BookDirectButton').attr("title",locfmt('{ris,EditOrder_SelectLaterality}'));
                $('#BookManualButton').attr("title", locfmt('{ris,EditOrder_SelectLaterality}'));
                $('#BookOrderNowButton').attr("title", locfmt('{ris,EditOrder_SelectLaterality}'));
                $('#SaveOrderButton').attr("title", locfmt('{ris,EditOrder_SelectLaterality}'));
                return false;
            }

            if (window.Behavior == 'CreateOrderManuallyPlannned') {
                // All examination has to be filled
                if ($('input.ris-examination-type-input').toArray().qWhere('$item.value == ""').qAny()) {
                    $('#BookDirectButton').attr("title", locfmt('{ris,EditOrder_ManualPlanning_MissingExaminations}'));
                    $('#BookManualButton').attr("title", locfmt('{ris,EditOrder_ManualPlanning_MissingExaminations}'));
                    $('#BookOrderNowButton').attr("title", locfmt('{ris,EditOrder_ManualPlanning_MissingExaminations}'));
                    $('#SaveOrderButton').attr("title", locfmt('{ris,EditOrder_ManualPlanning_MissingExaminations}'));
                    return false;
                }
            } else {
                // At least one examination type is not filled
                if ($('.ris-examination-type-input').val() == "") {
                    $('#BookDirectButton').attr("title", locfmt('{ris,EditOrder_SelectOneOrMoreExaminations}'));
                    $('#BookManualButton').attr("title", locfmt('{ris,EditOrder_SelectOneOrMoreExaminations}'));
                    $('#BookOrderNowButton').attr("title", locfmt('{ris,EditOrder_SelectOneOrMoreExaminations}'));
                    $('#SaveOrderButton').attr("title", locfmt('{ris,EditOrder_SelectOneOrMoreExaminations}'));
                    return false;
                }
            }

            $('#BookDirectButton').attr("title", locfmt('{ris,EditOrder_SaveOrder_ToolTip}'));
            $('#BookManualButton').attr("title", locfmt('{ris,EditOrder_SaveOrder_ToolTip}'));
            if (window.pageConfig.ScheduleNowGoesToInProgress) {
                $('#BookOrderNowButton').attr("title", locfmt('{ris,EditOrder_ScheduleNowButton_InProgress}', { locationName: window.pageConfig.ActiveLocationName }));
            } else {
                $('#BookOrderNowButton').attr("title", locfmt('{ris,EditOrder_ScheduleNowButton_InDepartment}', { locationName: window.pageConfig.ActiveLocationName }));
            }
            $('#SaveOrderButton').attr("title", locfmt('{ris,EditOrder_SaveOrder_ToolTip}'));
            return true;
        }

        this.UpdateScheduleButtons = function () {
            if (!IsValid()) {
                // Validation failed, disable the buttons
                $(".edit-order-onvalid").attr("disabled", "disabled");
            } else {
                if (window.Behavior == 'EditOrderBeforeBooking' || window.Behavior == 'ImportOrder' ||
                    window.Behavior == 'CreateOrderManuallyPlannned') {
                    // The buttons won't change
                } else {
                    var validExamTypeIDs = $('input.ris-examination-type-input').toArray().qWhere('$item.value != ""').qSelect('$item.value');
                    if (validExamTypeIDs.qAny()) {
                        Modules.Task('module://workflow/task/approval-required', 'request', { ExaminationIDs: validExamTypeIDs })
                            .then(function(isRequired) {
                                if (isRequired && isRequired == true) {
                                    $('#BookDirectButton').hide();
                                    $('#BookManualButton').hide();
                                } else {
                                    $('#BookDirectButton').show();
                                    $('#BookManualButton').show();
                                }
                            }, function(h) {
                                ris.notify.showError('Unable to define if approval required for the examinations or not.', h.message);
                                $('#BookDirectButton').hide();
                                $('#BookManualButton').hide();
                            });
                    }
                }

                // Validation passed, enable the buttons
                $(".edit-order-onvalid").removeAttr("disabled");
            }
        };

        this.disablePatientCategories = ko.computed(function () {
            var foo = $('[name=PatientCategoryID]');
            return foo.find('option').length === 1;
        });

        this.disableReferringPhysician = ko.computed(function () {
            return !self.referralType();
        });

        this.disableCopyToPhysician = ko.computed(function () {
            return !self.secondCopyRequired();
        });

        this.disableRequestingWorkLocation = ko.computed(function () {
            var referringPhysician = self.referringPhysician();
            var requireRequestingWorkLocation = self.requireRequestingWorkLocation();

            if (!referringPhysician) {
                return true;
            }
            if (requireRequestingWorkLocation) {
                return false;
            }
            return true;
        });

        this.disableRequesterLocation = ko.computed(function () {
            var referringPhysician = self.referringPhysician();
            var requireRequestingWorkLocation = self.requireRequestingWorkLocation();

            if (!referringPhysician)
                return true;
            if (!requireRequestingWorkLocation)
                return false;

            return true;
        });

        this.requestingWorkLocationCaption = ko.computed(function() {
            var referringPhysician = self.referringPhysician();
            var requireRequestingWorkLocation = self.requireRequestingWorkLocation();

            if (!referringPhysician) {
                return locfmt('({ris,EditOrder_NoPhysicianSelected})');
            }

            if (requireRequestingWorkLocation) {
                return locfmt('{ris,EditOrder_SelectWorkLocation}');
            }
            return locfmt('({ris,EditOrder_NoWorkLocationsAvailable})');
        });

        this.requesterLocationCaption = ko.computed(function() {
           if (!self.referringPhysician()) {
                return locfmt('({ris,EditOrder_NoPhysicianSelected})');
            }

            if (self.requireRequestingWorkLocation() === false) {
                return locfmt('{ris,EditOrder_SelectRequestLocation}');
            }

            return locfmt('({ris,EditOrder_NotNeeded})');
        });

        this.copyToWorkLocationCaption = ko.computed(function () {
            var copyToPhysician = self.copyToPhysician();
            var requireCopyToWorkLocation = self.requireCopyToWorkLocation();

            if (!copyToPhysician) {
                return locfmt('({ris,EditOrder_NoCopyToPhysicianSelected})');
            }

            if (requireCopyToWorkLocation) {
                return locfmt('{ris,EditOrder_SelectWorkLocation}');
            }
            return locfmt('({ris,EditOrder_NoWorkLocationsAvailable})');
        });

        this.copyToRequesterLocationCaption = ko.computed(function () {
            if (!self.copyToPhysician()) {
                return locfmt('({ris,EditOrder_NoCopyToPhysicianSelected})');
            }

            if (self.requireCopyToWorkLocation() === false) {
                return locfmt('{ris,EditOrder_SelectRequestLocation}');
            }

            return locfmt('({ris,EditOrder_NotNeeded})');
        });

        this.disableCopyToWorkLocation = ko.computed(function () {
            var copyToPhysician = self.copyToPhysician();
            var requireCopyToWorkLocation = self.requireCopyToWorkLocation();

            if (!copyToPhysician) {
                return true;
            }
            if (requireCopyToWorkLocation) {
                return false;
            }
            return true;
        });

        this.disableCopyToRequesterLocation = ko.computed(function () {
            var copyToPhysician = self.copyToPhysician();
            var requireCopyToWorkLocation = self.requireCopyToWorkLocation();

            if (!copyToPhysician)
                return true;
            if (!requireCopyToWorkLocation)
                return false;

            return true;
        });

        this.patientCategoryCaption = ko.computed(function () {
            if (self.disablePatientCategories()) {
                return locfmt('{ris,EditOrder_NoAvailableOption}');
            }
            return locfmt('{ris,EditOrder_SelectPatientCategory}');
        });

        this.orderTypeCaption = ko.computed(function () {
            if (self.isOrderTypeRequired) {
                return locfmt('{ris,EditOrder_SelectOrderType}');
            }
            return locfmt('{ris,EditOrder_OrderTypeUnspecified}');
        });
        
    }

    var check = 0;

    function PossibleLocations() {
        var self = this;
        this.isLoading = ko.observable(false);
        this.data = ko.observable(null);

        this.hasLocations = ko.computed(function() { return self.data() && self.data().Locations; });

        this.load = function(examinationTypes) {
            examinationTypes = examinationTypes.qWhere(function(x) { return x > 0; });

            self.isLoading(true);
            self.data(null);

            if (examinationTypes.length == 0) {
                self.isLoading(false);
            } else {
                var c = ++check;
                ZillionRis.ScheduleService.RetrieveLocations({ ExaminationTypes: examinationTypes })
                    .then(function(x) {
                        if (x && c === check) {
                            self.data(x);
                        }
                    }, function() {

                    }).always(function() {
                        if (c === check) {
                            self.isLoading(false);
                        }
                    });
            }
        };
    }


})(jQuery, window);