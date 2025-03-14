(function ($) {

    var commands = {
        'imaging.order.pending-intermediate-request': {
            execute: function () {
            },
            canExecute: function () { return false; }
        },
        'imaging.study.completed-state': {
            execute: function () {
            },
            canExecute: function () { return false; }
        },
        'imaging.study.create-intermediate-request': {
            execute: function (context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://technician/task/sendtoradiologist', 'request', { ExaminationIDs: context.ExaminationIDs }),
                    Modules.Template('module://technician/view/sendtoradiologist')
                ).then(function (model, view) {
                    view = view.clone();

                    model = Modules.ToVM(model, {
                        //radiologist
                        UserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { PermissionName: 'Reporter', Search: x, WorksDuring: new Date() }; }, '{ UserID: $data }')
                    });
                    model.Users(model.Users().qSelect('{ id: window.ko.observable($item) }'));
                    ko.applyBindings(model, view[0]);

                    var confirmPopupHandle = ZillionRis.Confirmation({ title: locfmt('{ris,SendToRadiologist}'), content: view, buttons: 'no yes', autoOpen: false, modal: true });

                    function updateButtons() {
                        confirmPopupHandle.enableButton('yes', model.Users().qAll('id()'));
                    }
                    model.Users().qEach(function(u) {
                        u.id.subscribe(updateButtons);
                    });
                    updateButtons();

                    confirmPopupHandle.then(function (a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'ExaminationIDs Users NoteText');
                                model2.Users = model2.Users.qSelect('id|0');
                                Modules.Task('module://technician/task/sendtoradiologist', 'process', model2)
                                    .then(function () {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function () {
                                        d.reject();
                                    });
                            }
                            ZillionRis.SiteEvents.broadcast('lazy-page-update');
                        }, function () {
                            d.reject();
                        });
                }, function () {
                    d.reject();
                });
            },
            canExecute: function () {
                return true;
            }
        },
        'imaging.study.accept-intermediate-response-accepted': {
            execute: function (examinationID) { return cancelIntermediate(examinationID, true); }
        },
        'imaging.study.accept-intermediate-response-declined': {
            execute: function (examinationID) { return cancelIntermediate(examinationID, false); }
        },
        'imaging.study.cancel-intermediate-request': {
            execute: function (context) {
                checkAvailability(context.ExaminationID).then(function() {
                    ZillionRis.Confirmation({
                        title: locfmt('{ris,Imaging_CancelIntermediateRequest}'),
                        content: '<p>' + locfmt('{ris,Imaging_WaitingForRadiologist}', { radiologist: '<span class="text-emphasis">' + context.Radiologist + '</span>' }) + '</p>'
                            + '<br/>'
                            + '<p>' + locfmt('{ris,Imaging_YouMayCancel}', { yes: '<span class="reference-label">Yes</span>' }) + '</p>'
                    }).then(function(result) {
                        if (result === true) {
                            checkAvailability(context.ExaminationID).then(function () {
                                cancelIntermediate(context.ExaminationID, null);
                            });
                        }
                    });
                });
            }
        },
        'imaging.complete': {
            execute: function (context) {
                var d = $.Deferred();
                var commandManager = this;
                commandManager.execute('examination.promote-status', { ExaminationIDs: context.ExaminationID, SourceStatusID: "inprogress", TargetStatusID: "completed", ShowHolidayWarning: true })
                    .then(function () {
                        d.resolve();
                    }, function () {
                        d.reject();
                    });
            }
        }
    };

    function cancelIntermediate(examinationId, validationCheck) {
        return Modules.Task('module://technician/task/sendtoradiologist', 'cancelintermediate', { ExaminationID: examinationId, ValidationCheck: validationCheck })
            .then(function (x) {
                if (x) {
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                }
            });
    }

    function checkAvailability(examinationId) {
        var d = $.Deferred();

        window.resourceAvailable(['urn:examination:' + examinationId]).then(function (available) {
            if (available === true) {
                d.resolve();
            } else {
                ris.notify.showError(locfmt('{ris,Imaging_ExaminationInUseTitle}'), locfmt('{ris,Imaging_ExaminationInUseMessage}'), ris.notify.shortTimeout);
                d.reject();
            }
        }, function () {
            ris.notify.showError(locfmt('{ris,Imaging_ExaminationInUseErrorTitle}'), locfmt('{ris,Imaging_ExaminationInUseErrorMessage}'), ris.notify.shortTimeout);
            d.reject();
        });

        return d;
    }

    $.extend(true, window, {
        ZillionRis: {
            Commands: {
                Page: {
                    Imaging: commands
                }
            }
        }
    });
})(jQuery);
