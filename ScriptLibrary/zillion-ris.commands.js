(function($) {

    $.extend(true, window, {
        ZillionRis: {
            ContentProvider: {
                ContentProviderSource: ContentProviderSource
            }
        }
    });

    var WorkItemActionsIDs = {
        NoWorkItem: 'NoWorkItem',
        SendToRadiologist: 'SendToRadiologist',
        DoStandardReport: 'DoStandardReport'
    };

    function ContentProviderSource(moduleUri, query, get, options) {
        if (typeof query == 'string') {
            query = new Function('$data', 'with ($data) { return ' + query + '; }');
        }
        if (typeof get == 'string') {
            get = new Function('$data', 'with ($data) { return ' + get + '; }');
        }

        var projector = '{ id: ID, text: DisplayName }';
        if (options && options.showAddress === true && options.showInitials === true && options.showSpecialisation) {
            projector = '{ id: ID, text: Initials + " " + DisplayName + "; " + Address + (FunctionSpecialization != "" ?  "; " + FunctionSpecialization : "") }';
        } else if (options && options.showAddress === true && options.showInitials === true) {
            projector = '{ id: ID, text: Initials + " " + DisplayName + "; " + Address }';
        } else if (options && options.showAddress === true) {
            projector = '{ id: ID, text: DisplayName + "; " + Address }';
        } else if (options && options.showInitials === true) {
            projector = '{ id: ID, text: Initials + " " + DisplayName }';
        } else if (options && options.showCode === true) {
            projector = '{ id: ID, text: "[" + Code + " " + DisplayName + "]" }';
        }

        return {
            "get": function(id) {
                var d = $.Deferred();
                var r = get(id);

                Modules.ContentProvider(moduleUri, 'query', r)
                    .then(function(data) {
                        d.resolve(data.qSelect(projector).qFirst());
                    }, function() {
                        d.reject();
                    });

                return d;
            },
            "query": function(text) {
                var d = $.Deferred();
                var r = query(text);

                Modules.ContentProvider(moduleUri, 'query', r)
                    .then(function(data) {
                        d.resolve(data.qSelect(projector));
                    }, function() {
                        d.reject();
                    });

                return d;
            }
        };
    }

    function lookForQandAForm(commandManager, examinationIDs, newStatus, functionAfterSuccess) {
        var parameters = examinationIDs.qSelect(function(item) {
            return { Type: 'urn:statistics:qandaform', Target: 'urn:examination:' + item, NewStatus: newStatus };
        });
        var templates = parameters.qSelect(function(item) {
            return Modules.Task('module://statistics/task/inquiry', 'template-available', item);
        });

        $.when.apply($, templates)
            .then(function() {
                // Resolve all templates deffered into a new array of resolved templates.
                templates = Array.prototype.slice.apply(arguments);

                // Create a flat list of examinations with templates to show.
                var templatesInput = examinationIDs
                    .qSelectMany(function(x, j) {
                        return templates[j]
                            .qSelect(function(template) {
                                return {
                                    examinationID: x,
                                    status: newStatus,
                                    template: template,
                                };
                            });
                    });

                var templatesCommand = templatesInput
                    .qSelect(function(item, j) {
                        return function() {
                            return commandManager.execute('examination.qanda-form', {
                                ExaminationID: item.examinationID,
                                Status: item.status,
                                TemplateID: item.template.ID,
                                Title: locfmt('{title} (Q&A form {i}/{total})', { title: item.template.Title, i: (j + 1), total: templatesInput.length })
                            });
                        };
                    });

                $.Deferred.serializeAlways(templatesCommand).always(function () {
                    functionAfterSuccess();
                });
            });

    }

    function setSchedulingReason(examinationIdentifiers) {
        var def = $.Deferred();
        $.when(
            Modules.Task('module://workflow/task/reason', 'request', { Examinations: examinationIdentifiers }),
            Modules.Template('module://workflow/view/reason')
        ).then(function(model, view) {
            view = view.clone();
            model.OrderTypeID = ko.observable(model.OrderTypeID);
            model.ScheduleReasons.qEach(function(exam) {
                exam.ScheduleReasonID = ko.observable(exam.ScheduleReasonID);
            });

            ko.applyBindings(model, view[0]);

            var buttons = [
                {
                    text: locfmt('{ris,General_Skip}'),
                    click: function(def2) {
                        def2.reject('skipped');
                    }
                },
                {
                    text: locfmt('{ris,General_Ok}'),
                    click: function(buttonActions) {
                        var orderTypeValid = model.OrderTypeSource === null ? true : model.OrderTypeID() > 0;
                        var schedulingReasonsValid = model.ScheduleReasons.qCount('ScheduleReasonID() !== 0') === model.ScheduleReasons.length;
                        if (orderTypeValid && schedulingReasonsValid) {
                            buttonActions.resolve(null);
                        }
                    }
                }
            ];

            ZillionRis.Confirmation({ title: locfmt('{ris,PopupHeaderText_ReasonForSchedule}'), content: view, buttons: buttons, width: 500 })
                .then(function(a, reason) {
                    if (a) {
                        var model2 = Modules.ToJS(model, 'ScheduleReasons OrderTypeID');
                        def.resolve(model2);
                    } else if (reason === 'skipped') {
                        def.resolve(null);
                    } else {
                        def.reject();
                    }
                }, function() {
                    def.reject();
                });

        }, function() {
            def.reject();
        });
        return def.promise();
    }

    function afterSchedulingActions(commandManager, orderID, options) {
        var d = $.Deferred();

        //
        // STEP 1: Print confirmation letter if the checkbox is set
        //
        var printConfirmationLetter = function() {
            if (!options.confirmationLetterNeeded) {
                var d1 = $.Deferred();
                d1.resolve();
                return d1;
            }

            if (options.editableAppointmentLetter) {
                return commandManager.execute('order.show-order-appointment', { name: "OrderAppointment", orderID: orderID });
            } else {
                return commandManager.execute('order.print-confirmation-letter', { OrderID: orderID });
            }
        };
        
        //
        // STEP 2: Print patient label if the checkbox is set
        //
        var printPatientLabel = function() {
            if (options.patientLabelNeeded) {
                return commandManager.execute('order.print-patient-label', { OrderID: orderID, CheckForAutoPrint: false });
            }

            var d2 = $.Deferred();
            d2.resolve();
            return d2;
        };
        
        //
        // STEP 3: Set KioskCheckInNotAllowed 
        //
        var setKioskCheckInNotAllowed = function() {
            if (options.setKioskCheckInNotAllowed) {
                return commandManager.execute('order.set-kiosk-check-in-not-allowed', { OrderID: orderID, KioskCheckInNotAllowed: options.kioskCheckInNotAllowed });
            }

            var d3 = $.Deferred();
            d3.resolve();
            return d3;
        };

        printConfirmationLetter().always(function() {


            printPatientLabel().always(function() {

                setKioskCheckInNotAllowed().always(function() {
                    //
                    // STEP 4: Refresh page
                    //
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                    d.resolve();
                });
            });
        });

        return d.promise();
    }

    function doScheduleWorkflow(commandManager, view, viewmodel, context, orderID, isReschedule, schedulingReason) {
        var d = $.Deferred();

        ko.applyBindings(viewmodel, view[0]);

        var defaultTitle = locfmt('{ris,Scheduling_Title}');
        if (context.OrderNumber && context.PatientName) {
            defaultTitle = locfmt('{ris,Scheduling_TitleWithOrderAndPatientInfo}', { orderNumber: context.OrderNumber, patientName: context.PatientName });
        } else if (context.PatientName) {
            defaultTitle = locfmt('{ris,Scheduling_TitleWithPatientInfo}', { patientName: context.PatientName });
        }

        var buttons = [];
        buttons.push({ id: 'CancelButton', text: locfmt('{ris,General_Cancel}'), click: function(buttonActions) { buttonActions.reject(); } });
        buttons.push({ id: 'BookButton' , text: locfmt('{ris,General_Book}'), click: function (buttonActions) { bookButtonClick(buttonActions); } });

        //
        // STEP 1: Show scheduling popup
        //  
        ZillionRis.Confirmation({ title: context.Title || defaultTitle, content: view, buttons: buttons, width: 'auto' })
            .then(function(a) {
                if (a === true) {
                    //TODO: Check if this is still necesary
                } else {
                    d.reject();
                }
            }, function() {
                d.reject();
            });

        function bookButtonClick(buttonActions) {
            if (view.find('.validation-error').length == 0) {
                if (viewmodel.roomOverviews().qAny(function(roomOverview) {
                    return !roomOverview.scheduleInformation.scheduleDetails();
                })) {
                    ZillionRis.Confirmation({ title: locfmt('{ris,General_ValidationError}'), content: locfmt('{ris,Scheduling_AllExaminationHasToBeScheduled}'), buttons: 'continue', width: 400 });
                } else {
                    viewmodel.isBusy(true);

                    //
                    // STEP 2: Do scheduling
                    //  
                    Modules.Task('module://calendars/task/auto-scheduling-popup', 'process', {
                            SchedulingUserID: 0,
                            IsReschedule: isReschedule,
                            CommandUsed: context.CommandUsed,
                            Examinations: viewmodel.roomOverviews().qSelect(function(item) {
                                return {
                                    ExaminationID: item.examID,
                                    RoomID: item.roomID(),
                                    IntendedRadiologistID: item.scheduleInformation.intendedRadiologistID || 0,
                                    StartTime: item.scheduleInformation.startDateTime,
                                    EndTime: item.scheduleInformation.endDateTime,
                                    IsScheduleManual: item.isScheduleManual // Used for automatic scheduling, indicates wether the user moved the appointment.
                                };
                            }),
                            ReSchedulingReason: schedulingReason
                        })
                        .then(function() {
                            viewmodel.isBusy(false);
                            buttonActions.resolve();

                            //
                            // STEP 3: Q&A forms for Scheduled status
                            //
                            var newStatusUrn = 'urn:status:scheduled';
                            lookForQandAForm(commandManager, viewmodel.ExaminationIDs, newStatusUrn, function() {

                                //
                                // STEP 4: Show/print the necessary documents
                                //
                                afterSchedulingActions(commandManager, orderID, {
                                    editableAppointmentLetter: viewmodel.editableAppointmentLetter,
                                    confirmationLetterNeeded: viewmodel.printConfirmationLetter(),
                                    patientLabelNeeded: viewmodel.printPatientLabel(),
                                    setKioskCheckInNotAllowed: viewmodel.enableKioskIntegrationControls(),
                                    kioskCheckInNotAllowed: viewmodel.kioskCheckInNotAllowed()
                                }).then(function() {
                                    d.resolve();
                                }, function() {
                                    d.reject();
                                });
                            });
                        }, function(error) {

                            ZillionRis.Confirmation({
                                title: locfmt('{ris,General_ValidationError}'),
                                content: error.message,
                                buttons: 'ok',
                                width: 400
                            }).always(function() {
                                d.reject();
                                viewmodel.isBusy(false);
                                viewmodel.DoAutoSchedule();
                            });
                        });
                }
            } else {
                ZillionRis.Confirmation({ title: 'Validation Error', content: "Something important is missing for booking. It's marked with red.", buttons: 'continue', width: 400 });
            }
        }

        //$(window).resize();

        return d.promise();
    }

    var cardCommands = {
        'card.patient.appointments': {
            execute: function(context) {
                ZillionRis.Patients.Search('patientnumber', context.Data);
            }
        },
        'card.patient.edit': {
            execute: function() {
            }
        },
        'card.patient.ordercomm': {
            execute: function(context) {
                Modules.Task('module://ordercomm/task/launch-url', 'request', {
                    Patient: 'urn:person:' + context.PersonID
                }).then(function(response) {
                    // if the Rogan Launcher supports the InternetExplorerPlugin, that will make sure the OrderComm is opened in IE.
                    // the fallback is to open it in the current browser
                    if (window.InternetExplorerPlugin) {
                        window.InternetExplorerPlugin.Open(response.Url, 'OrderComm');
                    } else {
                        window.open(response.Url);
                    }
                }, function(error) {
                    ris.notify.showError('Unable to launch OrderComm', error.message);
                });
            }
        },
        'card.patient.patientportal': {
            execute: function (context) {
                Modules.Task('module://patientportal/task/launch-url', 'request', {
                    Patient: 'urn:person:' + context.PersonID
                }).then(function (response) {
                    if (window.InternetExplorerPlugin) {
                        window.InternetExplorerPlugin.Open(response.Url, 'PatientPortal');
                    } else {
                        window.open(response.Url);
                    }
                }, function (error) {
                    ris.notify.showError('Unable to launch Patient Portal Context', error.message);
                });
            }
        },
        'card.patient.medisec': {
            execute: function(context) {
                Modules.Task('module://medisec/task/pci-url', 'request', {
                    Patient: 'urn:person:' + context.PersonID
                }).then(function(response) {
                    // if the Rogan Launcher supports the InternetExplorerPlugin, that will make sure the Medisec is opened in IE.
                    // the fallback is to open it in the current browser
                    if (window.InternetExplorerPlugin) {
                        // Medisec uses cache-control: private, causing the page Patient.aspx from Medisec to be cached. Work-around since Medisec is not going to fix it (for now).
                        window.InternetExplorerPlugin.Open(response.Url, 'Medisec');
                        var patientAspx = response.Url.replace(/medisecpci\.aspx.*$/i, 'Patient.aspx');
                        setTimeout(function() { window.InternetExplorerPlugin.Open(patientAspx + '?' + Date.now(), 'Medisec'); }, 1000);
                    } else {
                        window.open(response.Url);
                    }
                }, function(error) {
                    ris.notify.showError('Unable to launch Medisec', error.message);
                });
            }
        },
        'card.patient.documents': {
            execute: function(context) {
                return this.execute('stored-documents.view', { Source: 'urn:person:' + context.PersonID, Title: 'Patient Documents' });
            }
        },
        'card.user.last-accessed': {
            execute: function(context) {
                ZillionRis.LastAccessedShowSubNav(context.PersonID);
            }
        }
    };

    var sdwindow = null;
    var appCommands = {
        'indicator-forms.view': {
            execute: function (context) {
                var performanceIndicators = [];
                context.ExaminationIDs.qSelect(function (x, i) {
                    performanceIndicators.push(function () {
                        return commandManager.execute('examination.indicator-form', { Source: context.ExaminationIDs[i] });
                    });
                });
                $.Deferred.serializeAlways(performanceIndicators);
            },
        },
        'protocol.open-protocol': {
            execute: function(context) {
                return ZillionRis.SubNavs.ShowViewProtocol({
                    examinationID: context.examinationID
                });
            }
        },
        'stored-documents.popup-close-or-clear': {
            execute: function(context) {
                if (ZillionParts.Support.ie) {
                    // Internet Explorer 9 and newer should not close the popup because
                    // its size will change a little each time that it is opened.
                    clearPopupStoredDocuments();
                } else {
                    // Chrome needs to close the popup to make sure that the popup appears on top
                    // when the next examination is opened.
                    closePopupStoredDocuments();
                }
            }
        },
        'stored-documents.view': {
            execute: function(context) {
                var container = $('<div class="sub-page-nav-full-width"></div>');
                container.append('<h1 class="section-title sub-page-nav-title" zp-fluids="fixed">' + locfmt('{ris,StoredDocuments_Title}') + '</h1>');

                var pop = $('<div class="sub-page-nav-inner-content ui-corner-all" zp-fluids="fill"></div>');
                pop.appendTo(container);

                var d = $.Deferred();
                container.pageSubNav({
                    close: function () {
                        if (closingEvent) {
                            closingEvent.unsubscribe();
                        }
                        container.remove();
                        d.reject();
                    }
                });

                var closingEvent;
                if (!context.PreferPopup) {
                    closingEvent = ZillionRis.SiteEvents.subscribe('close-popup', function () {
                        container.pageSubNav('hide');
                    });
                }

                $("#Document").loadingOverlay();
                $("#Document").loadingOverlay({ message: locfmt('{ris,StoredDocuments_LoadingMessage}') });
                $("#Document").loadingOverlay('show');


                // Delay for auto popup.
                bootstrapStoredDocuments(pop, function() {
                    return {
                        source: context.Source,
                        autoOpen: context.AutoOpen,
                        preferPopup: !!context.PreferPopup,
                        autoBeginScan: !!context.AutoBeginScan,
                        launchCallback: function() {
                            container.pageSubNav('show');
                            $("#Document").loadingOverlay('hide');

                        }
                    };
                }).always(function() {
                    d.resolve();
                    container.pageSubNav('hide');
                    $("#Document").loadingOverlay('hide');

                });

                return d;
            }
        },
        'person.select': function(context, man) {
            var d = $.Deferred();
            Modules.Template('module://workflow/view/person-select')
                .then(function(view) {
                    view = view.clone();
                    var model = new PersonSelect({ type: context.Type });
                    model.dblclick.subscribe(function() {
                        // TODO.
                    });

                    var buttons = [];

                    if (window.permissions.hasAddPatientPermission && context.Type === 'patient') {
                        buttons.push({
                            text: locfmt('{ris,Button_CreateDummyPatient}'),
                            click: function(a) {
                                a.resolve('dummy');
                            }
                        });
                    }

                    buttons.push('cancel');
                    buttons.push('continue');

                    ask();

                    function ask() {
                        ko.applyBindings(model, view[0]);
                        ZillionRis.Confirmation({ title: context.Title || 'Select a person', content: view, buttons: buttons, width: 720 })
                            .then(function(a, b) {
                                if (a === true) {
                                    if (b === 'dummy') {
                                        man.execute('patient.create-dummy-patient', { Title: locfmt('{ris,CreateDummyPatient_Title}'), LastName: model.searchName(), DateOfBirth: model.birthDate() ? model.birthDate() : null })
                                            .then(function(p) {
                                                d.resolve(p.PatientID);
                                            }, function() {
                                                ask();
                                            });
                                    } else {
                                        var p = model.selectedPerson();
                                        if (p) {
                                            d.resolve(p.ID);
                                        } else {
                                            d.reject();
                                        }
                                    }
                                } else {
                                    d.reject();
                                }
                            }, function(c) {
                                if (c === 'dummy') {
                                    ask();
                                } else {
                                    d.reject();
                                }
                            });
                    }

                }, function() {
                    d.reject();
                });
            return d.promise();
        },
        'image-viewer.view-images': {
            execute: function(context) {
                return ZillionRis.ImageViewer().view({ images: context.Source })
                    .fail(function(data) {
                        if (data && data.error) {
                            ris.notify.showError(data.viewerName || 'Image Viewer', data.details, ris.notify.longTimeout);
                        } else {
                            ris.notify.showError('Image Viewer', 'The images could not be opened in the viewer.', ris.notify.longTimeout);
                        }
                    });
            }
        },
        'image-viewer.add-images': {
            execute: function(context) {
                return ZillionRis.ImageViewer().add({ images: context.Source })
                    .fail(function(data) {
                        if (data && data.error) {
                            ris.notify.showError(data.viewerName || 'Image Viewer', data.details, ris.notify.longTimeout);
                        } else {
                            ris.notify.showError('Image Viewer', 'The images could not be opened in the viewer.', ris.notify.longTimeout);
                        }
                    });
            }
        },
        'ris.execCommands': {
            execute: function (context) {
                var cmdMgr = this;
                var cmdPromises = context.Commands.qSelect(function(cmd) {
                    return cmdMgr.execute(cmd['method'], cmd['params'] && cmd['params'][0]);
                });
                return $.when.apply($, cmdPromises);
            }
        }
    };

    var patientCommands = {
        'patient.contact-information': {
            execute: function(context) {
                ZillionRis.PatientContactInfo(context.PatientID, window.pageAccessKey);
            },
            canExecute: function(context) {
                if (!context)
                    return false;
                return parseInt(context.PatientID) > 0;
            }
        },
        'patient.edit-patient': {
            execute: function(context) {
                ZillionRis.SubmitForm({ page: 'frmPatients.aspx', data: { patientID: context.PatientID, ReferralPage: window.pageAccessKey }, hint: locfmt('{ris,PatientDetails_LoadingOverlay}') });
            },
            canExecute: function(context) {
                if (!context)
                    return false;
                return parseInt(context.PatientID) > 0;
            }
        },
        'patient.merge-patient': {
            execute: function(patientID) {
                return this.execute('patient-merge.open', { MasterPatientID: patientID });
            },
            canExecute: function(patientID) {
                return parseInt(patientID) > 0;
            }
        },
        'patient.workflow-documents': {
            execute: function(patientID) {
                ZillionRis.XDW.OpenPatientOverview(patientID);
            }
        },
        'patient.create-dummy-patient': {
            execute: function(context) {
                var def = new $.Deferred();

                var options = $.extend(true, {}, ZillionParts.Data.Grab(context, 'FirstName LastName DateOfBirth GenderID MaritalStateID Notes'));

                $.when(
                    Modules.Task('module://workflow/task/create-dummy-patient', 'request', options),
                    Modules.Template('module://workflow/view/create-dummy-patient')
                ).then(function(model, view) {
                    view = view.clone();

                    var controller = angular.bootstrap(view[0], ['ui.ris', 'ris']);

                    var preCreateValidation = function(x) {
                        var isValid = false, validationMessages = null;
                        controller.invoke(function($rootScope) {
                            isValid = $rootScope.$$childTail.IsValid();
                            validationMessages = $rootScope.$$childTail.ValidationMessages();
                        });

                        if (isValid) {
                            x.resolve(true, 'continue');
                        } else {
                            var messagesHtml = validationMessages.qSelect('" - " + $item').join('<br/>');
                            ZillionRis.Confirmation({ title: context.Title, content: locfmt('<span><span class="text-emphasis">{ris,CreateDummyPatient_ValidationError}</span><br/>' + messagesHtml + '</span>'), buttons: 'continue' });
                        }
                    };
                    ZillionRis.Confirmation({
                        title: context.Title || locfmt('{ris,CreateDummyPatient_Title}'),
                        content: view,
                        buttons: ['cancel', { text: locfmt('{ris,CreateDummyPatient_CreatePatientButton}'), click: preCreateValidation }],
                        width: 500
                    }).then(function(x) {
                        if (x === true) {
                            var data = {};
                            controller.invoke(function($rootScope) {
                                data = ZillionParts.Data.Grab($rootScope.$$childTail, 'FirstName BirthName MiddleNames PartnerName DateOfBirth PhoneNumber Notes');
                                data.GenderID = $rootScope.$$childTail.Gender ? $rootScope.$$childTail.Gender.id : null;
                                data.MaritalStateID = $rootScope.$$childTail.MaritalState ? $rootScope.$$childTail.MaritalState.id : null;
                            });

                            Loading.Show('<span>Creating a new dummy patient<br/>One moment ...</span>', 500);
                            Modules.Task('module://workflow/task/create-dummy-patient', 'process', data)
                                .then(function(x) {
                                    def.resolve({ PatientID: x.PatientID, PatientNumber: x.PatientNumber, DisplayName: x.DisplayName });
                                }, function(x) {
                                    alert('There was a problem creating the dummy patient: ' + x.message + '.');
                                    def.reject();
                                }).always(function() {
                                    Loading.Hide();
                                });
                        } else {
                            def.reject();
                        }
                    });
                    }, function (h) {
                        ris.notify.showError('Add Patient', "Unable to add a patient.<br/><br/>Details:<br/>"+h.message.replace("\n", '<br />'));
                    def.reject();
                });

                return def;
            }
        }
    };

    var orderCommands = {
        'order.order-information': {
            execute: function(context) {
                ZillionRis.OrderInfo(context.OrderID, window.pageAccessKey);
            },
            canExecute: function(context) {
                if (!context)
                    return false;
                return parseInt(context.OrderID) > 0;
            }
        },
        'order.select-order': {
            execute: function(input) {
                var int = parseInt(window.prompt('Please enter an order ID'));
                if (int > 0) {
                    return int;
                }
                throw Error('No order ID specified.');
            }
        },
        'order.edit-order': {
            execute: function(input, man) {
                var page = 'EditOrder.aspx?orderID=' + input.OrderID;
                if (input.reloadAfterClose) {
                    page += '&reloadAfterClose=' + input.reloadAfterClose;
                }
                // delay needed so that grid selection can be saved before page is navigated away from
                setTimeout(function() {
                    ZillionRis.Navigate({ page: page, hint: locfmt('{ris,LoadingOrder}') });
                }, 50);
                return $.Deferred();
            },
            canExecute: function(orderID) {
                return true; // parseInt(orderID) > 0;
            }
        },

        'order.stored-document': {
            execute: function(context) {
                return this.execute('stored-documents.view', { Title: context.Title || locfmt('{ris,OrderDocuments}'), Source: 'urn:ordernumber:' + context.OrderNumber, AutoOpen: 'urn:requestform:*' });
            }
        },
        'order.auto-move-order': {
            param: '{ Patient: "PatientName", OrderID: "int" }',
            execute: function(context) {
                var d = $.Deferred();

                commandManager.execute('order.auto-schedule', { Examinations: ['urn:order:' + context.OrderID], PatientName: context.Patient, IsReschedule: true, CommandUsed: 'autoMoveOrder' });
                return d.promise();
            }
        },
        'order.manual-move-order': {
            param: '{ Patient: "PatientName", OrderID: "int" }',
            execute: function(context) {
                var d = $.Deferred();

                commandManager.execute('order.manual-schedule', { Examinations: ['urn:order:' + context.OrderID], PatientName: context.Patient, IsReschedule: true, CommandUsed: 'manualMoveOrder' });

                return d.promise();
            }
        },
        'supervisor.open-memo': {
            execute: function(context) {
                var d = $.Deferred();
                commandManager.execute('examination.open-memo', { ID: context.ID, SupervisorMemo: context.SupervisorMemo });
                return d.promise();
            }
        },
        'order.open-memo': {
            execute: function(context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://workflow/task/memo', 'request', { Source: ['urn:order:' + context.ID] }),
                    Modules.Template('module://workflow/view/memo-knockout')
                ).then(function(model, view) {
                    view = view.clone();

                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({ title: locfmt('{ris,OrderMemo}'), content: view, buttons: 'cancel save', width: 500 })
                        .then(function(a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'Source Add');
                                Modules.Task('module://workflow/task/memo', 'process', model2)
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError('Unable to add the memo', h.message);
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
        },
        'order.print-confirmation-letter': {
            execute: function(context) {
                var def = $.Deferred();
                Modules.Task('module://reporting/task/crystal', 'process', { ReportName: 'OrderAppointment', OrderID: context.OrderID, Parameters: [] })
                    .then(function(b) {
                        Modules.Task('module://legacy/task/print-appointmentletter', 'request', { url: b })
                            .then(function(c) {
                                if (c === true) {
                                    window.open(b);
                                }
                                def.resolve();
                            }, function() {
                                def.reject();
                            });
                    }, function() {
                        def.reject();
                    });
                return def;
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'order.print-patient-label': {
            execute: function(context) {
                var def = $.Deferred();
                $.when(
                    Modules.Task('module://legacy/task/print-patientlabel', 'request', { OrderID: context.OrderID, CheckForAutoPrint: context.CheckForAutoPrint || false })
                ).then(function(model) {
                    if (model.PrintUrl) {
                        window.open(model.PrintUrl);
                        def.resolve();
                    } else {
                        // the printing was already done in server side
                        def.resolve();
                    }
                }, function(error) {
                    ZillionRis.Confirmation({
                        title: locfmt('{ris,PrintAppointmentTitle}'),
                        content: locfmt('<p>{ris,PatientLabelFailed}</p>', { error: error.message }),
                        buttons: ['ok'],
                        width: 500
                    }).always(function() {
                        d.reject();
                    });
                });
                return def;
            }
        },
        'order.show-order-appointment': {
            execute: function(context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://reporting/task/crystal', 'show-parameters', { Name: context.name, OrderID: context.orderID }), /*here here*/
                    Modules.Template('module://reporting/view/crystal')
                ).then(function(model, view) {
                    if (!model) {
                        alert('Report could not be found!');
                        return d.reject();
                    }

                    view = view.clone();
                    model = Modules.ToVM(model);
                    model.Parameters().qEach(function(x) {
                        x.Values = Modules.ToJS(x.Values);
                        if (x.Values) {
                            x.Type = 'select';
                        } else if (typeof x.Value() === 'boolean') {
                            x.Type = 'checkbox';
                        } else if (typeof x.Value() === 'string') {
                            x.Type = 'text';
                        }
                    });
                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({
                        title: locfmt('{ris,PrintAppointmentTitle}'),
                        content: view,
                        buttons: [
                            'cancel',
                            {
                                text: locfmt('{ris,General_Continue}'),
                                click: function(e) {
                                    var hasRequiredValues = !model.Parameters().qAny('(Values === null || Values.length > 0) && IsRequired() && !Value()');
                                    if (!hasRequiredValues) {
                                        alert('Please fill out all required information.');
                                    } else {
                                        e.resolve(true);
                                    }
                                }
                            }
                        ],
                        width: 500
                    }).then(function(a) {
                        if (a === true) {
                            var model2 = Modules.ToJS(model, 'Parameters OrderID ReportName');
                            Modules.Task('module://reporting/task/crystal', 'process', model2)
                                .then(function(b) {
                                    Modules.Task('module://legacy/task/print-appointmentletter', 'request', { url: b })
                                        .then(function(c) {
                                            if (c === true) {
                                                window.open(b);
                                            }
                                            d.resolve();
                                        }, function() {
                                            d.reject();
                                        });
                                }, function() {
                                    d.reject();
                                });
                        } else {
                            d.reject();
                        }
                    }, function() {
                        d.reject();
                    });
                }, function(error) {
                    ZillionRis.Confirmation({
                        title: locfmt('{ris,PrintAppointmentTitle}'),
                        content: locfmt('<p>{ris,AppointmentLetterFailed}</p>', { error: error.message }),
                        buttons: ['ok'],
                        width: 500
                    }).always(function() {
                        d.reject();
                    });
                });
                return d;
            }
        },
        'order.auto-schedule': {
            execute: function(context) {
                var commandManager = this;
                var d = $.Deferred();
                var isReschedule = false;
                var schedulingReason = null;
                var def = $.Deferred();
                if (context.IsReschedule) {
                    isReschedule = context.IsReschedule;

                    // If needed, show the scheduling reason popup
                    setSchedulingReason(context.Examinations).then(function(schedulingReasonObject) {
                        schedulingReason = schedulingReasonObject;
                        def.resolve();
                    }, function() {
                        def.reject();
                    });

                } else {
                    def.resolve();
                }

                def.done(function() {
                    $.when(
                        Modules.Task('module://calendars/task/auto-scheduling-popup', 'request', { Examinations: context.Examinations, IsReschedule: isReschedule }),
                        Modules.Template('module://calendars/view/auto-scheduling-popup')
                    ).then(function(model, view) {
                        view = view.clone();

                        var language = window.culture || 'nl-NL';
                        moment.locale(language);

                        var options = {
                            ScheduleType: 'auto',
                            Locations: model.Locations,
                            ExaminationIDs: model.ExaminationIDs,
                            Language: language,
                            IsReschedule: isReschedule,
                            AutoPrintConfirmationLetter: model.AutoPrintConfirmationLetter,
                            AutoPrintPatientLabel: model.AutoPrintPatientLabel,
                            EditableAppointmentLetter: model.EditableAppointmentLetter,
                            EnableKioskIntegrationControls: model.EnableKioskIntegrationControls,
                            KioskCheckInNotAllowed: model.KioskCheckInNotAllowed
                        };
                        var viewmodel = new AutoSchedulingPopupViewModel(options);

                        doScheduleWorkflow(commandManager, view, viewmodel, context, model.OrderID, isReschedule, schedulingReason)
                            .then(function() {
                                d.resolve();
                            }, function() {
                                d.reject();
                            });
                    }, function(error) {
                        if (error.message) {
                            ris.notify.showError('Auto Scheduling', 'Failed to start the auto scheduling.<br/><br/>Details:<br/>' + error.message);
                        } else {
                            ris.notify.showError('Auto Scheduling', 'Failed to start the auto scheduling.');
                        }
                        d.reject();
                    });
                });

                return d.promise();
            }
        },
        'order.manual-schedule': {
            execute: function(context) {
                var commandManager = this;
                var d = $.Deferred();
                var isReschedule = false;
                var schedulingReason = null;
                var def = $.Deferred();
                if (context.IsReschedule) {
                    isReschedule = context.IsReschedule;

                    // If needed, show the scheduling reason popup
                    setSchedulingReason(context.Examinations).then(function(schedulingReasonObject) {
                        schedulingReason = schedulingReasonObject;
                        def.resolve();
                    }, function() {
                        def.reject();
                    });
                } else {
                    def.resolve();
                }

                def.done(function() {
                    $.when(
                        Modules.Task('module://calendars/task/manual-scheduling-popup', 'request', { Examinations: context.Examinations, IsReschedule: isReschedule }),
                        Modules.Template('module://calendars/view/manual-scheduling-popup')
                    ).then(function(model, view) {
                        view = view.clone();

                        var language = window.culture || 'nl-NL';
                        moment.locale(language);

                        var options = {
                            RoomOptionsPerLocation: model.RoomOptionsPerLocation,
                            DontAutoSelectLocation: context.DefaultSchedules != null,
                            ScheduleType: 'manual',
                            Locations: model.Locations,
                            ExaminationIDs: model.ExaminationIDs,
                            Language: language,
                            IsReschedule: isReschedule,
                            AutoPrintConfirmationLetter: model.AutoPrintConfirmationLetter,
                            AutoPrintPatientLabel: model.AutoPrintPatientLabel,
                            EditableAppointmentLetter: model.EditableAppointmentLetter,
                            EnableKioskIntegrationControls: model.EnableKioskIntegrationControls,
                            KioskCheckInNotAllowed: model.KioskCheckInNotAllowed
                        };
                        var viewmodel = new ManualSchedulingPopupViewModel(options);

                        doScheduleWorkflow(commandManager, view, viewmodel, context, model.OrderID, isReschedule, schedulingReason)
                            .then(function() {
                                d.resolve();
                            }, function() {
                                d.reject();
                            });

                        if (context.DefaultSchedules) {

                            // Go to the date
                            var defaultDate = new Date();
                            try {
                                defaultDate = context.DefaultSchedules.qFirst().StartDateTime;
                            } catch (ex) {
                                ris.notify.showInformation('Appointment information', 'Failed to load the date of the appointments.<br/><br/>Details:<br/>', +ex);
                            }
                            viewmodel.scheduleStartDay(defaultDate);

                            // Select location
                            var locID = context.DefaultSchedules.qSelect('LocationID').qFirst();
                            var selectedLoc = viewmodel.locations().qFirst('id === $params', locID);
                            if (selectedLoc) {
                                viewmodel.changeLocation(selectedLoc);
                            } else {
                                // TODO: the examinations should not be scheduled on this location. (at least one exam don't have action requirement for this loc!!)
                            }

                            // Select the rooms
                            viewmodel.exams().qEach(function(examViewModel) {
                                var scheduleData = context.DefaultSchedules.qFirst('ExaminationID == $params', examViewModel.examID);
                                if (scheduleData) {
                                    var roomOption = examViewModel.roomOptions.qFirst('roomID == $params', scheduleData.RoomID);
                                    if (roomOption) {
                                        examViewModel.selectedOption(roomOption);
                                    } else {
                                        // TODO: the examination should not be scheduled on this room. (no action requirement!!)
                                    }
                                }
                            });

                            // Set the default appointments (the ones what was saved in the task)
                            viewmodel.roomOverviews().qEach(function(roomOverview) {
                                var examID = roomOverview.examID;
                                var scheduleData = context.DefaultSchedules.qFirst('ExaminationID == $params', examID);
                                if (scheduleData) {
                                    var end = moment(scheduleData.StartDateTime).add(roomOverview.examDurationInRoom, 'minutes').toDate();
                                    // add the event to the calendar:
                                    roomOverview.intervalSelectedFunction(scheduleData.StartDateTime, end, false, scheduleData.RoomID);
                                    roomOverview.goToDate(scheduleData.StartDateTime);
                                } else {
                                    ris.notify.showError('Appointment information', 'Failed to load the appointment information for examination ' + roomOverview.examName());
                                }
                            });
                        };
                    }, function(error) {
                        if (error.message) {
                            ris.notify.showError('Manual Scheduling', 'Failed to start the manual scheduling.<br/><br/>Details:<br/>' + error.message);
                        } else {
                            ris.notify.showError('Manual Scheduling', 'Failed to start the manual scheduling.');
                        }
                        d.reject();
                    });
                });


                return d.promise();
            }
        },
        'order.validate-schedule': {
            execute: function(context) {

                var commandManager = this;
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://calendars/task/validate-schedule', 'request', { TaskID: context.TaskID })
                ).then(function(model) {
                    var defaultTitle = locfmt('{ris,Title_FinishManualScheduling}');
                    if (model.OrderNumber && model.PatientName) {
                        defaultTitle = locfmt('{ris,Title_FinishManualScheduling_Params}', { orderNumber: model.OrderNumber, patientName: model.PatientName });
                    }
                    var examinationUrns = model.Schedules.qSelect('"urn:examination:" + ExaminationID');

                    var options = {
                        Title: defaultTitle,
                        Examinations: examinationUrns,
                        DefaultSchedules: model.Schedules,
                        CommandUsed: context.CommandUsed
                    };

                    commandManager.execute('order.manual-schedule', options)
                        .then(function() {
                            d.resolve();
                        }, function() {
                            d.reject();
                        });

                }, function() {
                    d.reject();
                });

                return d.promise();
            }
        },
        'order.calendarpage-schedule': {
            execute: function(context) {
                var openRoomEvent = {
                    handled: false,
                    roomID: context.RoomID,
                    promise: null
                };
                ZillionRis.SiteEvents.broadcast('room-overview.open', openRoomEvent);
                if (openRoomEvent.handled && openRoomEvent.promise) {
                    return openRoomEvent.promise;
                }

                var commandManager = this;
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://calendars/task/calendarpage-scheduling-popup', 'request', {}),
                    Modules.Template('module://calendars/view/calendarpage-scheduling-popup')
                ).then(function(model, view) {
                    view = view.clone();

                    var language = window.culture || 'nl-NL';
                    moment.locale(language);

                    var options = {
                        AutoPrintConfirmationLetter: model.AutoPrintConfirmationLetter,
                        AutoPrintPatientLabel: model.AutoPrintPatientLabel,
                        ShowDailyRoomSchedulesInCalendarPage: model.ShowDailyRoomSchedulesInCalendarPage,
                        ScheduleType: 'calendar',
                        RoomID: context.RoomID,
                        Language: language,
                        Date: context.Date,
                        CurrentUserID: model.CurrentUserID,
                        CurrentUserName: model.CurrentUserName
                    };

                    var viewmodel = new CalendarPageSchedulingPopupViewModel(options);
                    ko.applyBindings(viewmodel, view[0]);

                    var buttons = viewmodel.Buttons;
                    //
                    // STEP 1: Show scheduling popup
                    //
                    // when the calendar page manul schedule popup shows up, there is at least one room overview.
                    var popupWidth = 320 + 390;
                    var cp = ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,Scheduling_Title}'), content: view, buttons: buttons, modal: false, width: 'auto' });
                    cp.then(function(a) {
                                if (a === true) {
                                    Modules.Task('module://calendars/task/book-appointments', 'request', {
                                        Appointments: viewmodel.roomOverviewsVM.getAllTemporaryEvent(),
                                        SchedulingUserID: viewmodel.CurrentUserID
                                    }).then(function(data) {
                                        if (data && data.TaskID) {
                                            commandManager.execute('person.select', { Type: 'patient', Title: locfmt('{ris,ManualBooking_PersonSelect}') })
                                                .then(function(personID) {
                                                    ZillionRis.Navigate({ page: 'EditOrder.aspx?patientid=' + personID + '&m=' + data.TaskID, hint: locfmt('{ris,CreateOrder_LoadingOverlay}') });
                                                });
                                        }
                                    }, function(error) {
                                        if (error.message) {
                                            ris.notify.showError('Book appointments', 'Failed to do the booking.<br/><br/>Details:<br/>' + error.message);
                                        } else {
                                            ris.notify.showError('Book appointments', 'Failed to do the booking.');
                                        }
                                    }).always(function() {
                                    });

                                } else {
                                    d.reject();
                                }
                            }, function() {
                                d.reject();
                            }
                        );

                    var wholeDialog = cp.$dialog.parent();
                    viewmodel.roomOverviewsVM.inMovingMode.subscribe(function(isInMovingMode) {
                        var confirmButton = wholeDialog.find('#ConfirmBookButton');
                        var changeSchedulingUserButton = wholeDialog.find('#ChangeSchedulingUserButton');
                        if (isInMovingMode === true) {
                            confirmButton.button("option", "label", "Cancel moving");
                            //changeSchedulingUserButton.show(); // TODO: use the selected user when event is moved
                        } else {
                            confirmButton.button("option", "label", locfmt('{ris,General_Book}'));
                            changeSchedulingUserButton.hide();
                        }
                    });
                    wholeDialog.find('.ui-dialog-buttonset').css('width', '100%');

                    var roomOverviewOpenFunc = function(e) {
                        e.handled = true;
                        e.promise = d;

                        viewmodel.addRoomOverview(e.roomID);
                    };

                    ZillionRis.SiteEvents.subscribe('room-overview.open', roomOverviewOpenFunc);
                    cp.always(function() {
                        ZillionRis.SiteEvents.unsubscribe('room-overview.open', roomOverviewOpenFunc);
                    });

                    viewmodel.roomOverviewsVM.roomOverviews.subscribe(function(x) {
                        var columnNumber = x.length;
                        var popupWidth = columnNumber * 320 + 390;
                        if (cp.$dialog.width() != popupWidth) {
                            cp.$dialog.dialog({ position: { my: "center", at: "center", of: window } });
                        }
                    });

                    setTimeout(function() {
                        cp.$dialog.dialog({ position: { my: "center", at: "center", of: window } });
                    }, 500);

                    $(window).resize();
                }, function() {
                    d.reject();
                });


                return d.promise();
            }
        },
        'order.schedule-now': {
            execute: function(context) {
                var Workflow_Task_BookOrderNow = 'module://workflow/task/schedulenow';
                var Workflow_View_BookOrderNow = 'module://workflow/view/schedulenow';

                //
                // STEP 1: Choose rooms for all examination
                //
                var d = $.Deferred();
                var commandManager = this;
                $.when(
                    Modules.Task(Workflow_Task_BookOrderNow, 'request', { OrderID: context.OrderID || 0, ExaminationIDs: context.ExaminationIDs || [] }),
                    Modules.Template(Workflow_View_BookOrderNow)
                ).then(function(model, view) {
                    view = view.clone();

                    var date = new Date();

                    var viewModelOptions = {
                        Examinations: model.Examinations,
                        ScheduleDate: date,
                        OrderNumber: model.OrderNumber,
                        PatientName: model.PatientName,
                        ShowIntendedRadiologist: model.ShowIntendedRadiologist
                    };
                    var viewmodel = new ScheduleNowViewModel(viewModelOptions);
                    ko.applyBindings(viewmodel, view[0]);

                    var buttons = [];
                    buttons.push('no');
                    buttons.push('yes');
                    ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,ScheduleNow_Title}'), content: view, buttons: buttons.join(' '), width: 520 })
                        .then(function(a) {
                            if (a === true) {

                                //
                                // STEP 2: Confirm the whole booking (give an option to cancel it)
                                //
                                var def = $.Deferred();
                                if (context.ConfirmationDialog) {
                                    var buttons = [];
                                    buttons.push('no');
                                    buttons.push('yes');

                                    def = ZillionRis.Confirmation({
                                        title: context.Title || locfmt('{ris,TitleConfirmation}'),
                                        buttons: buttons.join(' '),
                                        width: 520,
                                        content: locfmt('<p>{ris,ScheduleNowConfirm}</p>', { order: '<span class="text-emphasis">' + model.OrderNumber + '</span>' })
                                    });
                                }
                                // STEP 2 can be skipped.
                                else {
                                    def.resolve(true);
                                }

                                def.then(function(b) {
                                    if (b === true) {
                                        var examinationItems = [];
                                        viewmodel.examinations().qEach(function(x) {
                                            var exam = {
                                                ExaminationID: x.examinationID,
                                                RoomID: x.roomID(),
                                                IntendedRadiologistID: x.intendedRadiologistID()
                                            };
                                            examinationItems.push(exam);
                                        });

                                        Modules.Task(Workflow_Task_BookOrderNow, 'process', { Examinations: examinationItems, SchedulingUserID: context.SchedulingUserID })
                                            .then(function(autoPrintPatientLabel) {
                                                var newStatusUrn = 'urn:status:scheduled';
                                                //
                                                // STEP 3: Q&A forms for scheduling status
                                                //
                                                lookForQandAForm(commandManager, examinationItems.qSelect('ExaminationID'), newStatusUrn, function() {

                                                    //
                                                    // STEP 4: Change the status to 'in department' for all these examinations
                                                    //
                                                    var users = context.SchedulingUserID ? [context.SchedulingUserID] : []; // empty means: let it be the current RIS user
                                                    var model3 = {
                                                        SourceStatusID: 'scheduled',
                                                        TargetStatusID: 'indepartment',
                                                        ShowExaminationRooms: false, // it means the room hasn't been changed, won't touch the action schedulings
                                                        Examinations: viewmodel.examinations().qSelect('{ ID: examinationID }'),
                                                        Users: users
                                                    };

                                                    Modules.Task('module://workflow/task/changeexaminationstatus', 'process', model3)
                                                        .then(function() {
                                                            //
                                                            // STEP 5: Q&A forms for 'in department' status
                                                            //
                                                            var newStatusUrn = 'urn:status:' + model3.TargetStatusID;
                                                            lookForQandAForm(commandManager, model3.Examinations.qSelect('ID'), newStatusUrn, function() {

                                                                if (autoPrintPatientLabel) {
                                                                    //
                                                                    // STEP 6: Print patient label ifthe configuration is set
                                                                    //
                                                                    commandManager.execute('order.print-patient-label', { OrderID: context.OrderID, CheckForAutoPrint: false })
                                                                        .always(function() {
                                                                            ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                                                            d.resolve();
                                                                        });
                                                                } else {
                                                                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                                                    d.resolve();
                                                                }
                                                            });

                                                        }, function(h) {
                                                            ris.notify.showError('Unable to change the status', h.message);
                                                            d.reject();
                                                        });
                                                });
                                            }, function(h) {
                                                ris.notify.showError('Unable to schedule now the order.', h.message);
                                                d.reject();
                                            });
                                    } else {
                                        d.resolve();
                                    }
                                }, function() {
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
        },
        'order.promote-status': {
            execute: function(context) {
                var Workflow_Task_ChangeOrderStatus = 'module://workflow/task/changeorderstatus';
                var Workflow_View_ChangeOrderStatus = 'module://workflow/view/changeorderstatus';

                var d = $.Deferred();
                var commandManager = this;
                $.when(
                    Modules.Task(Workflow_Task_ChangeOrderStatus, 'request', { OrderID: context.OrderID, SourceStatusID: context.SourceStatusID, TargetStatusID: context.TargetStatusID, ExaminationIDs: context.ExaminationIDs, HideUserSelect: context.HideUserSelect, PreviousTechnicians: context.PreviousTechnicians }),
                    Modules.Template(Workflow_View_ChangeOrderStatus)
                ).then(function(model, view) {
                    if (context.TargetStatusID == 'inprogress' && model.Examinations.qAny('Laterality === "O"')) {
                        alert('Order can not be moved to "In progress" if one of the examination\'s laterality is "Onbekend" ');
                        d.reject();
                        return;
                    }

                    view = view.clone();
                    model = Modules.ToVM(model, {
                        //technician
                        UserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { PermissionName: model.UserAssignmentPermission(), Search: x, WorksDuring: new Date() }; }, '{ UserID: $data }')
                    });
                    model.Examinations().qEach(function(x) {
                        x.RoomResources = Modules.ToJS(x.RoomResources);

                        // If the room that was selected is not anymore available (it is already inactive or the examination type has change).
                        // Unselect the value from the dropdown to force the user to choose a new room.
                        if (!x.RoomResources.qAny('ID == ' + x.RoomID())) {
                            x.RoomID(0);
                        }
                        x.DoStandardReport = ko.observable(false);
                        x.SelectedStandardReportID = ko.observable();
                    });

                    model.Users(model.Users().qSelect('{ id: window.ko.observable($item) }'));
                    model.NoAvailableResources(model.Examinations().qAny('HasRoomResources() == false'));

                    calculateStandardReportElementIDs(model);

                    ko.applyBindings(model, view[0]);

                    handleStandardReportSelection(model);

                    var buttons = [];
                    var showSeparateButton = model.ShowSeparateButton() == true;
                    var ableToSeparate = model.Examinations().length > 1;

                    if (model.NoAvailableResources())
                        buttons.push('cancel');
                    else {
                        if (ableToSeparate && showSeparateButton) {
                            buttons.push('separate');
                        }

                        buttons.push('no');
                        buttons.push('yes');
                    }
                    ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,PromoteStatusTitle}'), content: view, buttons: buttons.join(' '), width: 520 })
                        .then(function(a) {
                            if (a === true) {
                                var model2 = Modules.ToJS(model, 'OrderID PatientName Examinations Users AssignmentTypeName TargetStatusID SourceStatusID HideUserSelect EditableAppointmentLetter PrintConfirmationLetter PrintPatientLabel');
                                model2.Forced = context.Forced;
                                model2.Users = model2.Users.qSelect('id|0');
                                var needUsers = model2.Examinations.qAny('!DoStandardReport') && model2.HideUserSelect == false;
                                if (needUsers && model2.Users.qAny('$item !== 0') == false) {
                                    alert('Unable to continue, no user(s) specified for changing the status.');
                                    d.reject();
                                } else {
                                    model2.Examinations.qEach(function(exam) {
                                        exam.SelectedAction = exam.DoStandardReport ? WorkItemActionsIDs.DoStandardReport : WorkItemActionsIDs.SendToRadiologist;
                                    });
                                    Modules.Task(Workflow_Task_ChangeOrderStatus, 'process', model2)
                                        .then(function () {
                                            afterSchedulingActions(commandManager, context.OrderID, {
                                                editableAppointmentLetter: model2.EditableAppointmentLetter && model2.TargetStatusID === 'scheduled',
                                                confirmationLetterNeeded: model2.PrintConfirmationLetter && model2.TargetStatusID === 'scheduled',
                                                patientLabelNeeded: model2.PrintPatientLabel && model2.TargetStatusID === 'scheduled'
                                            }).always(function () {
                                                var newStatusUrn = 'urn:status:' + model2.TargetStatusID;
                                                lookForQandAForm(commandManager, model2.Examinations.qSelect('ID'), newStatusUrn, function () {
                                                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                                    d.resolve();
                                                });
                                            });
                                        }, function(h) {
                                            ris.notify.showError('Unable to change the status', h.message);
                                            d.reject();
                                        });
                                }
                            } else if (a === 'separate') {

                                var examinationIDs = model.Examinations().qSelect('ID()');
                                var idx = -1;

                                function thisFunction() {
                                    if (++idx < examinationIDs.length) {
                                        commandManager.execute('examination.promote-status', { ExaminationIDs: [examinationIDs[idx]], SourceStatusID: context.SourceStatusID, TargetStatusID: context.TargetStatusID, Title: (idx + 1) + '/' + examinationIDs.length }).then(thisFunction);
                                    } else {
                                        d.resolve();
                                    }
                                }

                                thisFunction();
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
        },
        'order.hold-order': {
            execute: function(context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://workflow/task/holdorder', 'request', { OrderID: context.OrderID, ShowReasons: context.ShowReasons }),
                    Modules.Template('module://workflow/view/holdorder')
                ).then(function(model, view) {
                    view = view.clone();

                    model = Modules.ToVM(model);

                    ko.applyBindings(model, view[0]);
                    ZillionRis.Confirmation({ title: locfmt('{ris,HoldOrderPopUp}'), content: view, buttons: 'cancel ok' })
                        .then(function(a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'OrderID Month Year MonthList Location Reason');
                                Modules.Task('module://workflow/task/holdorder', 'process', model2)
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                    }, function(h) {
                                        var message = h.message.startsWith('{') ? locfmt(h.message) : h.message;
                                        ZillionRis.Confirmation({ title: locfmt('{ris,HoldOrder_UnableToHold}'), content: message, buttons: 'ok' });
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
            },
            canExecute: function() {
                return true;
            }
        },
        'order.unhold-order': {
            execute: function(context) {
                var d = $.Deferred();
                var content = $('<div></div>');
                content.append(locfmt('<p>{ris,UnholdOrderConfirm}</p>', { order: '<span class="text-emphasis">' + context.OrderNumber + '</span>' }));
                ZillionRis.Confirmation({ title: locfmt('{ris,UnholdOrderPopUp}'), content: content })
                    .then(function(a) {
                        if (a) {
                            Modules.Task('module://workflow/task/holdorder', 'unhold', { OrderID: context.OrderID })
                                .then(function() {
                                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                }, function(h) {
                                    ris.notify.showError('Unable to hold the order', h.message);
                                    d.reject();
                                });
                        } else {
                            d.reject();
                        }
                    }, function() {
                        d.reject();
                    });
            },
            canExecute: function() {
                return true;
            }
        },
        'order.demote-status': {
            execute: function(context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://workflow/task/changeorderstatusback', 'request', { OrderID: context.OrderID, SourceStatusID: context.SourceStatusID, TargetStatusID: context.TargetStatusID }),
                    Modules.Template('module://workflow/view/changeorderstatusback')
                ).then(function(model, view) {
                    view = view.clone();
                    model = Modules.ToVM(model);

                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,Title_Demote}'), content: view, buttons: 'no yes' })
                        .then(function(a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'OrderID ExaminationIDs TargetStatusID SourceStatusID');
                                Modules.Task('module://workflow/task/changeorderstatusback', 'process', model2)
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError('Unable to demote the examination status', h.message);
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
        },
        'order.change-urgency': {
            execute: function(context) {
                return Modules
                    .Activity('module://workflow/view/changeurgency', { requires: [], scope: { source: context.Source || ('urn:order:' + context.OrderID) } })
                    .then(function() {
                        ZillionRis.SiteEvents.broadcast('lazy-page-update', null, { source: 'order', action: 'change-urgency' });
                    });
            },
            canExecute: function() {
                return true;
            }
        },
        'order.scan-document': {
            execute: function(context) {
                var d = commandManager.execute('stored-documents.view', { Source: 'urn:ordernumber:' + context.OrderNumber, AutoBeginScan: true });
                d.always(function() {
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                    d.resolve();
                });
                return d.promise();
            },
            canExecute: function() {
                return true;
            }
        },
        'order.silent-examination-status-change': {
            execute: function(context) {
                var d = $.Deferred();
                var examIDs = context.Examinations.qSelect('ID');
                $.when(
                    Modules.Task('module://workflow/task/changeexaminationstatus', 'request', {
                        ExaminationIDs: examIDs,
                        SourceStatusID: context.SourceStatusID,
                        TargetStatusID: context.TargetStatusID
                    })
                ).then(function(model) {
                    Modules.Task('module://workflow/task/changeexaminationstatus', 'process', {
                        SourceStatusID: context.SourceStatusID,
                        TargetStatusID: context.TargetStatusID,
                        ShowExaminationRooms: false, // it means the room hasn't been changed, don't touch the action schedulings
                        Examinations: context.Examinations,
                        Users: context.Users || []
                    }).then(function() {
                        if (context.LookForQAndAForms) {
                            lookForQandAForm(commandManager, examIDs, context.TargetStatusID, function() {
                                d.resolve();
                            });
                        } else {
                            d.resolve();
                        }
                    }, function(h) {
                        ris.notify.showError('Unable to change the status to ' + context.TargetStatusID, h.message);
                        d.reject();
                    });
                }, function(h) {
                    ris.notify.showError('Unable to start changing the examination status to ' + context.TargetStatusID, h.message);
                    d.reject();
                });
                return d.promise();
            },
            canExecute: function() {
                return true;
            }
        },
        'order.import-order': {
            execute: function(context, man) {
                var d = $.Deferred();

                $.when(
                    Modules.Task('module://workflow/task/importorder', 'request', { Identifier: context.OrderID, PatientID: context.PatientID, RetrospectiveBooking: context.RetrospectiveBooking }),
                    Modules.Template('module://workflow/view/importorder')
                ).then(function(model, view) {
                    view = view.clone();
                    model = Modules.ToVM(model, {
                        TechnicianUserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { PermissionName: model.TechnicianPermission(), Search: x, WorksDuring: new Date() }; }, '{ UserID: $data }'),
                        RadiologistUserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function (x) { return { PermissionName: model.ReporterPermission(), Search: x, WorksDuring: new Date() }; }, '{ UserID: $data }')
                    });

                    var actionOptions = [
                        { id: WorkItemActionsIDs.NoWorkItem, text: 'No dictation needed' },
                        { id: WorkItemActionsIDs.SendToRadiologist, text: 'Send to radiologist' }
                    ];

                    model.TechnicianUsers(model.TechnicianUsers().qSelect('{ id: window.ko.observable($item) }'));
                    model.RadiologistUsers(model.RadiologistUsers().qSelect('{ id: window.ko.observable($item) }'));
                    model.Examinations().qEach(function(exam) {
                        var options = actionOptions.slice(0); // returns the selected elements in an array, as a new array object
                        exam.ActionOptions = ko.observableArray(options);
                        if (exam.CanStandardReport()) {
                            exam.ActionOptions.push({ id: WorkItemActionsIDs.DoStandardReport, text: 'Use standard report' });
                        }
                        exam.SelectedAction = ko.observable(WorkItemActionsIDs.NoWorkItem);
                        exam.RoomResources = Modules.ToJS(exam.RoomResources);
                    });
                    model.ShowRadiologistUsers = ko.computed(function() {
                        var anySendToRadiologist = model.Examinations().qAny('SelectedAction() == $params', WorkItemActionsIDs.SendToRadiologist);
                        return anySendToRadiologist && model.RadiologistUsers().qAny();
                    });

                    ko.applyBindings(model, view[0]);

                    //
                    // STEP 1: Show the popup
                    //
                    ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,ImportOrderTitle}'), content: view, buttons: 'cancel ok' })
                        .then(function(a) {
                            if (a) {
                                var needUsers = model.Examinations().qAny('SelectedAction() == $params', WorkItemActionsIDs.SendToRadiologist);
                                if (needUsers && !model.RadiologistUsers().qAny('id()')) {
                                    ris.notify.showError(locfmt('{ris,ImportOrder_NoRadiologistSelected}'));
                                    d.reject();
                                } else {

                                    if (!model.TechnicianUsers().qAny('id()')) {
                                        ris.notify.showError(locfmt('{ris,ImportOrder_NoTechnicianSelected}'));
                                        d.reject();
                                        return;
                                    }

                                    if (!context.RetrospectiveBooking) {
                                        ZillionRis.UserSettings.set('OutsiderTechnicianID', null, model.TechnicianUsers().qWhere('id()').qSelect('id()'));
                                    }

                                    var exams = model.Examinations().qSelect('{ ID: ExaminationID(), SelectedAction: SelectedAction() }');

                                    //
                                    // Steps: 1. Schedule, 2. In department, 3. In progress, 4. Completed
                                    //
                                    var tasks = [
                                        function() {
                                            var deffScheduledQAndA = $.Deferred();
                                            Modules.Task('module://workflow/task/importorder', 'process', {
                                                ScheduledDate: context.ScheduledDate,
                                                SchedulingUserID: context.SchedulingUserID,
                                                Examinations: model.Examinations().qSelect('{ ExaminationID: ExaminationID(), RoomID: RoomID() }')
                                            }).then(function() {
                                                if (model.LookForQAndAForms) {
                                                    lookForQandAForm(commandManager, exams.qSelect('ID'), 'urn:status:scheduled', function() {
                                                        deffScheduledQAndA.resolve();
                                                    });
                                                } else {
                                                    deffScheduledQAndA.resolve();
                                                }
                                            });
                                            return deffScheduledQAndA.promise();
                                        },
                                        function() {
                                            return man.execute('order.silent-examination-status-change', {
                                                Examinations: exams,
                                                SourceStatusID: 'scheduled',
                                                TargetStatusID: 'indepartment',
                                                Users: context.SchedulingUserID ? [context.SchedulingUserID] : []
                                            });
                                        },
                                        function() {
                                            return man.execute('order.silent-examination-status-change', {
                                                Examinations: exams,
                                                SourceStatusID: 'indepartment',
                                                TargetStatusID: 'inprogress',
                                                Users: model.TechnicianUsers().qSelect('id()'),
                                                OneTimeUserAssignments: context.RetrospectiveBooking == false
                                            });
                                        },
                                        function() {
                                            return man.execute('order.silent-examination-status-change', {
                                                Examinations: exams,
                                                SourceStatusID: 'inprogress',
                                                TargetStatusID: 'completed',
                                                Users: model.RadiologistUsers().qSelect('id()')
                                            });
                                        }
                                    ];

                                    $.Deferred.serialize(tasks).then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError('Unable to do all the steps of importing the order', h.message);
                                        d.reject();
                                    });


                                }
                            } else {
                                d.reject();
                            }
                        }, function() {
                            d.reject();
                        });
                }, function(h) {
                    ris.notify.showError('Unable to open the popup to finish importing the order', h.message);
                    d.reject();
                });
                return d.promise();
            }
        },
        'order.view-audit-trail': {
            execute: function(context) {
                return Modules.Activity('module://audit-trail/view/audit-trail', {
                    host: 'subnav',
                    requires: ['AuditTrail'],
                    launchOptions: {
                        Source: context.Source
                    },
                    NotShowDialogBeforeLeaving: true
                });
            }
        }
    };

    var examinationCommands = {
        'examination.decline-examination': {
            execute: function(context) {
                return this.execute('examination.cancel', { ExaminationID: [context.ExaminationID], ReasonList: context.ReasonList, Title: locfmt("Declined Examination") });
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'examination.change-assignments': {
            execute: function(context) {
                return Modules.Activity('module://workflow/view/examinationassignments', {
                    launchOptions: {
                        Source: 'urn:examination:' + context.ExaminationID
                    },
                    requires: [
                        'ris'
                    ]
                });
            }
        },
        'examination.change-intended-radiologist': {
            execute: function(context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://workflow/task/change-intended-radiologist', 'request', { ExaminationID: context.ExaminationID }),
                    Modules.Template('module://workflow/view/change-intended-radiologist')
                ).then(function(vm, view) {
                    view = view.clone();

                    var model = {
                        UserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function(x) { return { PermissionName: 'Reporter', Search: x }; }, '{ UserID: $data }'),
                        User: ko.observable(null)
                    };

                    var defaultUserID = vm.CurrentIntendedRadiologistID || vm.CurrentUserID;
                    if (defaultUserID != 0) {
                        model.UserSource.get(defaultUserID).then(function(user) {
                            model.User(user);
                        });
                    }

                    var isValid = function(x) {
                        if (model.User()) {
                            x.resolve(true, 'continue');
                        } else {
                            ris.notify.showError(locfmt('{ris,ChangeIntendedRadiologistPopup_ErrorTitle}'), locfmt('{ris,ChangeIntendedRadiologistPopup_IntendedNoSelected}'));
                            x.reject();
                        }
                    };

                    model.holidayWarning = ko.observable('');

                    model.User.subscribe(function(user) {
                        model.holidayWarning('');
                        if (user) {
                            ZillionRis.Commands.Utils.getHolidayWarning(user.id).then(model.holidayWarning);
                        }
                    });

                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({ title: locfmt('{ris,ChangeIntendedRadiologistPopup_Title}'), content: view, buttons: ['cancel', { text: locfmt('{ris,General_Continue}'), click: isValid }] })
                        .then(function(a) {
                            if (a === true) {
                                Modules.Task('module://workflow/task/change-intended-radiologist', 'process', { ExaminationID: context.ExaminationID, IntendedRadiologistID: model.User().id })
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function() {
                                        ris.notify.showError(locfmt('{ris,ChangeIntendedRadiologistPopup_ErrorTitle}'), locfmt('{ris,ChangeIntendedRadiologistPopup_FailedToAssign}'));
                                        d.reject();
                                    });
                            }
                        });

                }, function() {
                    ris.notify.showError(locfmt('{ris,ChangeIntendedRadiologistPopup_ErrorTitle}'), locfmt('{ris,ChangeIntendedRadiologistPopup_FailedToOpen}'));
                    d.reject();
                });
                return d.promise();
            }
        },
        'examination.open-report': {
            execute: function(context) {
                var examinationID = context.ExaminationID;
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://workflow/task/reportform', 'request', { ExaminationID: examinationID }),
                    Modules.Template('module://workflow/view/reportform')
                ).then(function(model, view) {
                    view = view.clone();
                    ko.applyBindings(model, view[0]);
                    if (model.Reports.qAny()) {
                        Modules.Task('module://workflow/task/audit', 'auditreportviewed', { ExaminationID: examinationID });
                    }
                    ZillionRis.Confirmation({ title: 'Report', content: view, buttons: 'pdf print ok', width: 600, height: 500 })
                        .then(function(ab, a) {
                            if (a === "ok") {
                                var model2 = Modules.ToJS(model, 'ExaminationID');
                                Modules.Task('module://workflow/task/reportform', 'process', model2)
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        d.reject();
                                    });
                            } else if (a === "pdf") {
                                window.open(model.PrintUrl);
                                //if there is a copy to, print again
                                if (model.CopyToDisplayText) {
                                    window.open(model.SecondPrintUrl);
                                }
                                d.resolve();
                            } else if (a === "print") {
                                Modules.Task('module://reporting/task/print-report', 'printreports', { OrderIDs: [model.OrderID] })
                                    .then(function(printModel) {
                                        if (printModel.PrintUrl) {
                                            window.open(printModel.PrintUrl);
                                            //if there is a copy to, print again
                                            if (printModel.SecondPrintUrl) {
                                                window.open(printModel.SecondPrintUrl);
                                            }
                                        }
                                        d.resolve();
                                    });

                            }
                        }, function() {
                            d.reject();
                        });
                }, function() {
                    d.reject();
                });
                return d.promise();
            }
        },
        'examination.move-to-discussion': {
            execute: function(context) {
                Modules.Activity('module://examination-discussion/view/add', {
                    launchOptions: {
                        Source: context.Source ? context.Source : ['urn:examination:' + context.ExaminationID]
                    }
                });
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'examination.send-to-failsafe': {
            execute: function(context) {
                var d = $.Deferred();
                Modules.Activity('module://failsafe/view/send-to-failsafe', {
                    launchOptions: {
                        Source: context.Source ? context.Source : ['urn:examination:' + context.ExaminationID]
                    },
                    requires: ["SendToFailSafeModule"]
                }).then(function() {
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                    d.resolve();
                }, function() {
                    d.reject();
                });
                return d.promise();
            }
        },
        'examination.open-failsafe': {
            execute: function(context) {
                commandManager.execute('examination.send-to-failsafe', context);
            }
        },
        'examination.cancel-failsafe': {
            execute: function(context) {
                var d = $.Deferred();
                Modules.Activity('module://failsafe/view/cancel-failsafe', {
                    launchOptions: {
                        ExaminationID: context.ExaminationID
                    },
                    requires: ['CancelFailSafeModule']
                }).then(function() {
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                    d.resolve();
                }, function() {
                    d.reject();
                });
                return d.promise();
            }
        },
        'examination.open-memo': {
            execute: function(context) {
                var d = $.Deferred();
                var supervisorMemo = context.SupervisorMemo;
                $.when(
                    Modules.Task('module://workflow/task/memo', 'request', { Source: ['urn:examination:' + context.ID], SupervisorMemo: supervisorMemo }),
                    Modules.Template('module://workflow/view/memo-knockout')
                ).then(function(model, view) {
                    view = view.clone();
                    ko.applyBindings(model, view[0]);

                    var title = supervisorMemo ? locfmt('{ris,MemoPopup_TitleSupervisorMemo}') : locfmt('{ris,MemoPopup_TitleRegular}');
                    ZillionRis.Confirmation({ title: title, content: view, buttons: 'cancel save', width: 500 })
                        .then(function(a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'Source Add');
                                var action = supervisorMemo ? 'add-supervision-memo' : 'process';
                                Modules.Task('module://workflow/task/memo', action, model2)
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError('Unable to add the memo', h.message);
                                        d.reject();
                                    });
                            } else {
                                d.reject();
                            }
                        }, function() {
                            d.reject();
                        });

                    if (context.popupLoaded) {
                        context.popupLoaded();
                    }
                }, function() {
                    d.reject();
                });
                return d.promise();
            },
            canExecute: function(context) {
                return !!context;
            }
        },
        'examination.cancel': {
            execute: function(context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://workflow/task/cancelexamination', 'request', { ExaminationIDs: context.ExaminationID, ReasonList: context.ReasonList, ReasonID: context.ReasonID | 0, AlreadyCancelled: context.AlreadyCancelled ? context.AlreadyCancelled : false }),
                    Modules.Template('module://workflow/view/cancelexamination'),
                    Modules.ContentProvider('module://workflow/data/cancellationreason', 'query', { List: context.ReasonList, CurrentReasonID: context.ReasonID })
                ).then(function(model, view, reasons) {
                    view = view.clone();

                    model = Modules.ToVM(model, {
                        ReasonSource: reasons
                    });

                    model.ReasonID.subscribe(validateFields);

                    model.ReasonID(reasons.qAny('ID === $params', context.ReasonID) ? context.ReasonID : 0);
                    model.Comment(context.DefaultCommentText || null);

                    ko.applyBindings(model, view[0]);

                    var popup;
                    (popup = ZillionRis.Confirmation({ title: context.Title || 'Cancel Examination', content: view, buttons: 'no yes', width: 500 }))
                        .then(function(a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'ExaminationIDs ReasonID Comment');
                                model2.SaveToTaskID = context.SaveToTaskID;
                                Modules.Task('module://workflow/task/cancelexamination', 'process', model2)
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError(locfmt('{ris,CancellationReason_UnableSave}'), h.message);
                                        d.reject();
                                    });
                            } else {
                                d.reject();
                            }
                        }, function() {
                            d.reject();
                        });

                    validateFields();

                    function validateFields() {
                        var isValid = model.ReasonID();
                        popup.enableButton('yes', isValid);
                    }
                }, function(h) {
                    ris.notify.showError(locfmt('{ris,CancellationReason_UnableSave}'), h.message);
                    d.reject();
                });
                return d.promise();
            },
            canExecute: function(context) {
                return !!context;
            }
        },
        'examination.view-images': {
            execute: function(examinationID) {
                return ZillionRis.ImageViewer().view({ images: ['urn:examination:' + examinationID] })
                    .fail(function(data) {
                        if (data && data.error) {
                            ris.notify.showError(data.viewerName || 'Image Viewer', data.details, ris.notify.longTimeout);
                        } else {
                            ris.notify.showError('Image Viewer', 'The images could not be opened in the viewer.', ris.notify.longTimeout);
                        }
                    });
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'examination.add-image': {
            execute: function(examinationID) {
                return ZillionRis.ImageViewer().add({ images: ['urn:examination:' + examinationID] })
                    .fail(function(data) {
                        if (data && data.error) {
                            ris.notify.showError(data.viewerName || 'Image Viewer', data.details, ris.notify.longTimeout);
                        } else {
                            ris.notify.showError('Image Viewer', 'The images could not be opened in the viewer.', ris.notify.longTimeout);
                        }
                    });
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'examination.complication-form': {
            execute: function(context) {
                return Modules.Activity('module://workflow/view/form-viewer', {
                    launchOptions: {
                        Source: context.Source || 'urn:examination:' + context.ExaminationID,
                        FormType: 'ComplicationForm'
                    }
                });
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'examination.indicator-form': {
            execute: function(context) {
                return Modules.Activity('module://workflow/view/form-viewer', {
                    launchOptions: {
                        Source: context.Source || 'urn:examination:' + context.ExaminationID,
                        FormType: 'PerformanceIndicatorForm'
                    }
                });
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'examination.qanda-form': {
            execute: function(context) {
                return Modules.Activity('module://workflow/view/form-viewer', {
                    launchOptions: {
                        Source: context.Source || 'urn:examination:' + context.ExaminationID,
                        ExtraParameters: { ExaminationStatus: context.Status, TemplateID: context.TemplateID, Title: context.Title },
                        FormType: 'QAndAForm'
                    }
                });
            }
        },
        'examination.auto-move-examination': {
            param: '{ Patient: "PatientName", ExaminationID: "int" }',
            execute: function(context) {
                var d = $.Deferred();

                commandManager.execute('order.auto-schedule', { Examinations: ['urn:examination:' + context.ExaminationID], PatientName: context.Patient, IsReschedule: true, CommandUsed: 'autoMoveExamination' });

                return d.promise();
            }
        },
        'examination.manual-move-examination': {
            param: '{ Patient: "PatientName", ExaminationID: "int" }',
            execute: function(context) {
                var d = $.Deferred();

                commandManager.execute('order.manual-schedule', { Examinations: ['urn:examination:' + context.ExaminationID], PatientName: context.Patient, IsReschedule: true, CommandUsed: 'manualMoveExamination' });
                return d.promise();
            }
        },
        'examination.create-addendum': {
            execute: function(context) {
                var d = $.Deferred();
                Modules.Activity('module://dictation/view/create-addendum', {
                    launchOptions: {
                        AccessionNumbers: context.AccessionNumbers,
                        UserID: context.UserID || 0
                    },
                    requires: ['CreateAddendumModule']
                }).then(function() {
                    // Make sure that the visibility of the 'examination.create-addendum' command is up-to-date.
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');

                    d.resolve();
                }, function() {
                    d.reject();
                });
                return d.promise();
            }
        },
        'examination.cancel-addendum': {
            execute: function (context) {
                var d = $.Deferred();
                Modules.Activity('module://dictation/view/cancel-addendum', {
                    launchOptions: {
                        AccessionNumbers: context.AccessionNumbers,
                        UserID: context.UserID || 0
                    },
                    requires: ['CancelAddendumModule']
                }).then(function (model) {
                    // Make sure that the visibility of the 'examination.cancel-addendum' command is up-to-date.
                    ZillionRis.SiteEvents.broadcast('lazy-page-update');

                    d.resolve();
                }, function (error) {
                    d.reject();
                });
                return d.promise();
            }
        },
        'dictationoverview.change-user': {
            execute: function(context) {
                var d = $.Deferred();

                //var commandManager = this;
                $.when(
                    Modules.Task('module://dictation/task/change-user', 'request', { SpeechStateID: context.SpeechStateID }),
                    Modules.Template('module://dictation/view/change-user')
                ).then(function(model, view) {
                    view = view.clone();
                    model = Modules.ToVM(model, {
                        UserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function(x) {
                            return {
                                PermissionName: 'Authorizer',
                                Search: x,
                                WorksDuring: new Date()
                            };
                        }, '{ UserID: $data }'),
                    });
                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({ title: locfmt('{ris,DictationOverview_ChangeUserTitle}'), content: view, buttons: 'no yes' })
                        .then(function(a) {
                            if (a === true) {
                                var model2 = Modules.ToJS(model, 'SpeechStateID UserID AuthoriserName');

                                Modules.Task('module://dictation/task/change-user', 'process', model2)
                                    .then(function(x) {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        ris.notify.showSuccess(locfmt('{ris,DictationOverview_Title}'), locfmt('{ris,DictationOverview_ChangeUserSuccess}', { user: x.AuthoriserName }));
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError(locfmt('{ris,DictationOverview_ChangeUserFail}'), h.message);
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
        },
        'examination.housekeeping-state': {
            execute: function() {},
            canExecute: function() { return false; }
        },
        'examination.send-to-housekeeping': {
            param: '{ Patient: "PatientName", ExaminationID: "int", ExaminationDisplayName: "Examination Description" }',
            execute: function(context) {
                var d = $.Deferred();
                var content = $('<div></div>');
                var memo = $('<textarea class="ui-input" id="HousekeepingMemoInput" style="width: 100%"></textarea>');
                if (context.Text) {
                    memo.val(context.Text);
                }
                content.append(locfmt('<p>{ris,HousekeepingAdd}</p>', { examination: '<span class="text-emphasis">' + context.ExaminationDisplayName + '</span>', patient: ' <span class="text-emphasis">' + context.Patient + '</span>' }));
                content.append('<br/>');
                content.append(locfmt('<p>{ris,HousekeepingMemo}</p>'));
                content.append(memo);

                ZillionRis.Confirmation({ title: locfmt('{ris,Title_HouseKeeping}'), content: content, buttons: 'no yes' })
                    .then(function(result) {
                        if (result) {
                            var notRefreshNeeded = context.NotRefreshNeeded || false;
                            ZillionRis.HouseKeeping.SendToHousekeeping(context.ExaminationID, memo.val(), notRefreshNeeded)
                                .then(function() {
                                    var item = new ZillionParts.Notifications.Item();
                                    item.type = 'success';
                                    item.title = 'Housekeeping';
                                    item.message = locfmt('{ris,HousekeepingAddSuccess}', { examination: context.ExaminationDisplayName, patient: context.Patient });
                                    item.ttl = 5000;
                                    notifications.add(item);
                                    d.resolve();
                                }, function(reason) {
                                    d.reject();
                                    var item = new ZillionParts.Notifications.Item();
                                    item.type = 'error';
                                    item.title = 'Housekeeping';
                                    item.message = locfmt('{ris,HousekeepingAddFail}', { examination: context.ExaminationDisplayName, patient: context.Patient, reason: reason });
                                    notifications.add(item);
                                });
                        }
                    });
                return d.promise();
            }

        },
        'examination.remove-from-housekeeping': {
            param: '{ Patient: "PatientName", ExaminationID: "int", HousekeepingID: "int", ExaminationDisplayName: "Examination Description" }',
            execute: function(context) {

                var content = $('<div></div>');
                content.append(locfmt('<p>{ris,HousekeepingRemove}</p>', { examination: '<span class="text-emphasis">' + context.ExaminationDisplayName + '</span>', patient: ' <span class="text-emphasis">' + context.Patient + '</span>' }));
                content.append('<br/>');
                content.append(locfmt('<p>{ris,WouldYouLikeToContinuePrompt}</p>'));

                ZillionRis.Confirmation({ title: locfmt('{ris,Title_CancelHouseKeeping}'), content: content })
                    .then(function(result) {
                        if (result) {
                            ZillionRis.HouseKeeping.RemoveFromHousekeeping(context.ExaminationID, context.HousekeepingID)
                                .then(function() {
                                    var item = new ZillionParts.Notifications.Item();
                                    item.type = 'success';
                                    item.title = locfmt('{ris,Title_HouseKeeping}');
                                    item.message = locfmt('{ris,HouseKeeping_SuccessfullyRemoved}', { patientName: context.Patient });
                                    item.ttl = 5000;
                                    notifications.add(item);
                                }, function(reason) {
                                    var item = new ZillionParts.Notifications.Item();
                                    item.type = 'error';
                                    item.title = locfmt('{ris,Title_HouseKeeping}');
                                    item.message = locfmt('{ris,HouseKeeping_UnableToRemove}', { patientName: context.Patient, reason: '<br/>' + reason });
                                    notifications.add(item);
                                });
                        }
                    });
            }
        },
        'examination.promote-status': {
            execute: function(context) {
                var d = $.Deferred();
                var commandManager = this;

                $.when(
                    Modules.Task('module://workflow/task/changeexaminationstatus', 'request', { ExaminationIDs: context.ExaminationIDs, SourceStatusID: context.SourceStatusID, TargetStatusID: context.TargetStatusID }),
                    Modules.Template('module://workflow/view/changeexaminationstatus')
                ).then(function(model, view) {
                    view = view.clone();
                    model = Modules.ToVM(model, {
                        UserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function(x) {
                            return {
                                    PermissionName: model.UserAssignmentPermission(),
                                    Search: x,
                                    WorksDuring: (context.ShowHolidayWarning ? undefined : new Date())
                                };
                        }, '{ UserID: $data }'),
                        RoomsSource: Rogan.Ris.Locations.getRooms().qWhere('LocationID === window.currentLocationID').qSelect('{ ID: ID, Name: Name }')
                    });

                    var popup;

                    model.Examinations().qEach(function(exam) {
                        exam.DoStandardReport = ko.observable(false);
                        exam.SelectedStandardReportID = ko.observable();

                        exam.DoStandardReport.subscribe(function (checked) {
                            enableYesInPromote(model, popup);
                        });
                    });

                    model.Users(model.Users().qSelect('{ id: window.ko.observable($item) }'));
                    model.Users().qFirst().id.subscribe(function (id) {
                        enableYesInPromote(model, popup);
                    });

                    model.ShowUsers = ko.computed(function() {
                        var anyNonStandard = model.Examinations().qAny('!DoStandardReport()');

                        return anyNonStandard && model.Users().qAny();
                    });
                    model.ShowAuthorizer = ko.computed(function () {
                        if (!model.EnableAuthorizer()) {
                            return false;
                        }

                        if (!model.AuthorizerSource) {
                            model.AuthorizerID = ko.observable();
                            model.AuthorizerSource = new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function(x) {
                                return {
                                    PermissionName: 'Authorizer',
                                    Search: x
                                };
                            }, '{ UserID: $data }');

                            model.AuthorizerID.subscribe(function (authorizer) {
                                enableYesInPromote(model, popup);
                            });
                        }

                        var needsStandardReporting = model.Examinations().qAny('DoStandardReport()');

                        return needsStandardReporting;
                    });

                    model.Users().qEach(function(user) {
                        user.holidayWarning = ko.observable('');

                        if (context.ShowHolidayWarning) {
                            user.id.subscribe(function(userID) {
                                user.holidayWarning('');
                                if (userID) {
                                    ZillionRis.Commands.Utils.getHolidayWarning(userID).then(user.holidayWarning);
                                }
                            });

                            user.id.valueHasMutated();
                        }
                    });
                    
                    calculateStandardReportElementIDs(model);

                    ko.applyBindings(model, view[0]);

                    handleStandardReportSelection(model);

                    (popup = ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,PromoteStatusTitle}'), content: view, buttons: 'no yes', width: 540 }))
                        .then(function(a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'PatientName Examinations Users AssignmentTypeName TargetStatusID SourceStatusID ShowExaminationRooms AuthorizerID PatientID');
                                model2.Users = model2.Users.qSelect('id|0');
                                var needUsers = model2.Examinations.qAny('!DoStandardReport');
                                if (needUsers && model2.Users.qAny('$item !== 0') == false) {
                                    alert('Unable to continue, no user(s) specified for changing the status.');
                                    d.reject();
                                } else {
                                    model2.Examinations.qEach(function(exam) {
                                        exam.SelectedAction = exam.DoStandardReport ? WorkItemActionsIDs.DoStandardReport : WorkItemActionsIDs.SendToRadiologist;
                                        if (exam.SelectedStandardReportID !== undefined) {
                                            exam.SelectedStandardReportID = parseInt(exam.SelectedStandardReportID);
                                        }
                                    });

                                    $.Deferred.accept(d, finalizePromote(model2));

                                    function finalizePromote(promotionModel) {
                                        var d2 = $.Deferred();
                                        Modules.Task('module://workflow/task/changeexaminationstatus', 'process', promotionModel)
                                        .then(function (result) {
                                            if (result.Error && result.Error.Type === "dummy-patient") {
                                                // Some standard reports could not be processed due to the patient being a dummy patient, process standard reports only.
                                                commandManager.execute('patient.merge-patient', promotionModel.PatientID).then(function() {
                                                    // Successfully merged, only continue with the standard reports.
                                                    promotionModel.Examinations = promotionModel.Examinations.qWhere(function(x) {
                                                        return x.DoStandardReport === true;
                                                    });

                                                    $.Deferred.accept(d2, finalizePromote(promotionModel));
                                                }, function() {
                                                    ZillionRis.Confirmation({ title: result.Error.Title, content: result.Error.Message, buttons: 'ok' }).then(function () {
                                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                                        d2.reject();
                                                    });
                                                });
                                            } else {
                                                var newStatusUrn = 'urn:status:' + promotionModel.TargetStatusID;
                                                lookForQandAForm(commandManager, promotionModel.Examinations.qSelect('ID'), newStatusUrn, function () {
                                                    ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                                    d2.resolve();
                                                });
                                            }
                                        }, function (h) {
                                            ris.notify.showError('Unable to change the status', h.message);
                                            d2.reject();
                                        });

                                        return d2.promise();
                                    };
                                }
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
        },
        'examination.add-intended-vetter': {
            execute: function(context) {
                var d = $.Deferred();

                $.when(
                    Modules.Task('module://workflow/task/change-intended-approver', 'request', {}),
                    Modules.Template('module://workflow/view/change-intended-approver')
                ).then(function(model, changeApproverView) {
                    changeApproverView = changeApproverView.clone();

                    var changeApproverModel = {
                        UserSource: new ZillionRis.ContentProvider.ContentProviderSource('module://workflow/data/users', function(x) { return { PermissionName: model.PermissionName, Search: x }; }, '{ UserID: $data }'),
                        User: ko.observable(null)
                    };

                    var isValid = function(x) {
                        if (changeApproverModel.User()) {
                            x.resolve(true, 'continue');
                        } else {
                            ris.notify.showError(locfmt('{ris,ChangeAssingmentPopup_ErrorTitle}'), locfmt('{ris,ChangeAssingmentPopup_IntendedNoSelected}'));
                            x.reject();
                        }
                    };

                    var defaultUser = context.CurrentIntendedApproverID || model.CurrentUserID;
                    if (defaultUser != 0) {
                        changeApproverModel.UserSource.get(defaultUser).then(function(user) {
                            changeApproverModel.User(user);
                        });
                    }

                    changeApproverModel.holidayWarning = ko.observable('');

                    changeApproverModel.User.subscribe(function(user) {
                        changeApproverModel.holidayWarning('');
                        if (user) {
                            ZillionRis.Commands.Utils.getHolidayWarning(user.id).then(changeApproverModel.holidayWarning);
                        }
                    });

                    ko.applyBindings(changeApproverModel, changeApproverView[0]);

                    ZillionRis.Confirmation({ title: locfmt('{ris,ChangeAssingmentPopup_Title}'), content: changeApproverView, buttons: ['cancel', { text: locfmt('{ris,General_Continue}'), click: isValid }] })
                        .then(function(a) {
                            if (a === true) {
                                Modules.Task('module://workflow/task/change-intended-approver', 'process', { ExaminationID: context.ExaminationID, IntendedApproverID: changeApproverModel.User().id })
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function() {
                                        ris.notify.showError(locfmt('{ris,ChangeAssingmentPopup_ErrorTitle}'), locfmt('{ris,ChangeAssingmentPopup_FailedToAssign}'));
                                        d.reject();
                                    });
                            }
                        });
                }, function() {
                    ZillionRis.Confirmation({ title: locfmt('{ris,ChangeAssingmentPopup_ErrorTitle}'), content: locfmt('{ris,ChangeAssingmentPopup_FailedToOpen}'), buttons: 'continue', width: 400 })
                        .always(function() {
                            d.reject();
                        });
                });

                return d.promise();
            },
            canExecute: function(examinationID) {
                return !!examinationID;
            }
        },
        'examination.demote-status': {
            execute: function(context) {
                var d = $.Deferred();
                $.when(
                    Modules.Task('module://workflow/task/changeexaminationstatusback', 'request', { ExaminationIDs: context.ExaminationIDs, SourceStatusID: context.SourceStatusID, TargetStatusID: context.TargetStatusID }),
                    Modules.Template('module://workflow/view/changeexaminationstatusback')
                ).then(function(model, view) {
                    view = view.clone();
                    model = Modules.ToVM(model);

                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({ title: context.Title || locfmt('{ris,Title_Demote}'), content: view, buttons: 'no yes' })
                        .then(function(a) {
                            if (a) {
                                var model2 = Modules.ToJS(model, 'ExaminationIDs TargetStatusID SourceStatusID');
                                Modules.Task('module://workflow/task/changeexaminationstatusback', 'process', model2)
                                    .then(function() {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError('Unable to demote the examination status', h.message);
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
        },
        'examination.lookforqandaforms-multiplestatuses': {
            execute: function(context) {
                var dd = $.Deferred();
                var commandManager = this;
                var ccc = [];

                var qandasforStatuses = context.StatusesWithExaminations.qSelect(function(x, idx) {
                    var newStatusUrn = context.StatusesWithExaminations[idx].Key;
                    var examinationIDs = context.StatusesWithExaminations[idx].Value;
                    var parameters = examinationIDs.qSelect('{ Type: "urn:statistics:qandaform", Target: "urn:examination:" + $item, NewStatus: newStatusUrn }');
                    var templates = parameters.qSelect('Modules.Task("module://statistics/task/inquiry", "template-available", $item)');

                    var d = $.Deferred();

                    $.when.apply($, templates).then(function() {
                        var xx = Array.prototype.slice.call(arguments);
                        var xxCount = xx.qWhere('$item').length;
                        examinationIDs.qSelect(function(x, i) {
                            var templatesArray = xx[i];
                            var xxiCount = xx[i].qWhere('$item').length;

                            templatesArray.qSelect(function(y, j) {
                                ccc.push(function() {
                                    var title = locfmt('{title} (Q&A form {qaIdx}/{qaCnt} for examination {examIdx}/{examCnt} for status: {status}', {
                                        title: templatesArray[j].Title,
                                        qaIdx: (j + 1),
                                        qaCnt: xxiCount,
                                        examIdx: (i + 1),
                                        examCnt: xxCount,
                                        status: context.StatusesWithExaminations[idx].Key.split(':')[2]
                                    });
                                    return commandManager.execute('examination.qanda-form', { ExaminationID: examinationIDs[i], Status: newStatusUrn, TemplateID: templatesArray[j].ID, Title: title });
                                });
                            });
                        });

                        d.resolve();
                    });

                    return d;
                });

                $.when.apply($, qandasforStatuses).then(function() {
                    $.Deferred
                        .serializeAlways(ccc)
                        .then(function() {
                            dd.resolve();
                        }, function() {
                            dd.reject();
                        });
                });

                return dd.promise();
            }
        },
        'examination.view-qandaforms': {
            execute: function(context) {
                return this.execute('stored-documents.view', { Source: 'urn:examination:' + context.ExaminationID, Title: "Q&A Forms" });
            }
        },
        'examination.cancel-appointment-and-hold-order': {
            execute: function(context) {
                return this.execute('order.hold-order', { OrderID: context.OrderID, ShowReasons: true });
            }
        },
        'examination.correct-administration-errors': {
            execute: function(context) {
                var d = $.Deferred();

                $.when(
                    Modules.Task('module://workflow/task/correct-administration-errors', 'request', { ExaminationID: context.ExaminationID, OrderID: context.OrderID }),
                    Modules.Template('module://workflow/view/correct-administration-errors')
                ).then(function(model, view) {
                    view = view.clone();
                    model.Patient = context.Patient;
                    model = new CorrectAdministrationErrorsViewModel(model);
                    ko.applyBindings(model, view[0]);

                    var preValidation = function(x) {
                        if (model.isValid()) {
                            x.resolve(true, 'continue');
                        }
                    };

                    ZillionRis.Confirmation({ title: locfmt('{ris,CommandCorrectAdministrationErrors}'), content: view, buttons: ['cancel', { text: locfmt('{ris,General_Continue}'), click: preValidation }] })
                        .then(function(a) {
                            if (a === true) {
                                var model2 = {
                                    OrderID: context.OrderID,
                                    Examinations: model.Examinations().qSelect(function(exam) {
                                        return Modules.ToJS(exam);
                                    }),
                                    RequestingPhysicianID: model.referringPhysician() ? model.referringPhysician().id : 0,
                                    ReferralTypeID: model.referralType() ? model.referralType().id : 0
                                };
                                Modules.Task('module://workflow/task/correct-administration-errors', 'process', model2)
                                    .then(function(x) {
                                        ris.notify.showSuccess(locfmt('{ris,CorrectAdministrationErrors_SuccessTitle}'), locfmt('{ris,CorrectAdministrationErrors_SuccessText}'));
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError(locfmt('{ris,CorrectAdministrationErrors_FailTitle}'), h.message);
                                        d.reject();
                                    });
                            } else {
                                d.reject();
                            }
                        }, function() {
                            d.reject();
                        });
                }, function(h) {
                    ris.notify.showError(locfmt('{ris,CorrectAdministrationErrors_FailTitle}'), h.message);
                    d.reject();
                });

                return d.promise();
            }
        }
    };


    var discussionCommands = {
        'discussion.edit-note': {
            param: '{ ExaminationID: "ExaminationID", DiscussionListID: "DiscussionListID", CurrentNote: "CurrentNote", HasNote: "CurrentNote" }',
            execute: function(context) {
                var content = $('<div class="notes-container"></div>');
                var currentNote = context.CurrentNote || '';
                var note = $('<textarea id="NoteTextArea" class="ui-input" style="width: 100%; height: auto" rows="7">' + currentNote + '</textarea>');
                content.append(note);

                ZillionRis.Confirmation({ title: locfmt('{ris,NotePopup_Title}'), buttons: 'cancel save', content: content })
                    .then(function(result) {
                        if (result) {
                            changeNote(context.ExaminationID, context.DiscussionListID, note.val())
                                .then(function() {
                                    var item = new ZillionParts.Notifications.Item();
                                    item.type = 'success';
                                    item.title = locfmt('{ris,NotePopup_Title}');
                                    item.message = locfmt('{ris,NotePopup_SuccessMessage}');
                                    item.ttl = 5000;
                                    notifications.add(item);
                                }, function() {
                                    var item = new ZillionParts.Notifications.Item();
                                    item.type = 'error';
                                    item.title = locfmt('{ris,NotePopup_Title}');
                                    item.message = locfmt('{ris,NotePopup_FailedMessage}');
                                    notifications.add(item);
                                });
                        }
                    });
            }
        }
    };

    var speechStateCommands = {
        'speechstate.change-speech-state': {
            execute: function(speechStateID) {
                var d = $.Deferred();

                $.when(
                    Modules.Task('module://dictation/task/change-speech-status', 'request', { SpeechStateID: speechStateID }),
                    Modules.Template('module://dictation/view/change-speech-status')
                ).then(function(model, view) {
                    view = view.clone();
                    var model2 = {
                        AvailableStatuses: ko.observableArray(model.AvailableStatuses),
                        SpeechStatusID: ko.observable(model.SpeechStatusID)
                    };

                    ko.applyBindings(model2, view[0]);

                    ZillionRis.Confirmation({ title: locfmt('{dictation,ChangeSpeechStatus_Title}'), content: view, buttons: 'cancel continue' })
                        .then(function(a) {
                            if (a === true) {
                                var model3 = { SpeechStateID: speechStateID, OldSpeechStatus: model.CurrentSpeechStatus, NewSpeechStatus: model2.SpeechStatusID() };

                                Modules.Task('module://dictation/task/change-speech-status', 'process', model3)
                                    .then(function(x) {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        ris.notify.showSuccess(locfmt('{dictation,ChangeSpeechStatus_Title}'), locfmt('{dictation,ChangeSpeechStatus_Success}'));
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError(locfmt('{dictation,ChangeSpeechStatus_Fail}'), h.message);
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
            },
            canExecute: function(speechStateID) {
                return !!speechStateID;
            }
        },
        'speechstate.cancel-speech-state': {
            execute: function(speechStateID) {
                var d = $.Deferred();

                $.when(
                    Modules.Task('module://dictation/task/cancel-speech-status', 'request', { SpeechStateID: speechStateID }),
                    Modules.Template('module://dictation/view/cancel-speech-status')
                ).then(function(model, view) {
                    view = view.clone();
                    model = Modules.ToVM(model);
                    ko.applyBindings(model, view[0]);

                    ZillionRis.Confirmation({ title: locfmt('{dictation,CancelSpeechStatus_Title}'), content: view, buttons: 'cancel continue' })
                        .then(function(a) {
                            if (a === true) {
                                var model2 = { SpeechStateID: speechStateID, OldSpeechStatus: model.CurrentSpeechStatus() };

                                Modules.Task('module://dictation/task/cancel-speech-status', 'process', model2)
                                    .then(function(x) {
                                        ZillionRis.SiteEvents.broadcast('lazy-page-update');
                                        ris.notify.showSuccess(locfmt('{dictation,ChangeSpeechStatus_Title}'), locfmt('{dictation,CancelSpeechStatus_Success}'));
                                        d.resolve();
                                    }, function(h) {
                                        ris.notify.showError(locfmt('{dictation,ChangeSpeechStatus_Fail}'), h.message);
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
            },
            canExecute: function(speechStateID) {
                return !!speechStateID;
            }
        }
    };

    var utils = {
        getHolidayWarning: function(userID) {
            var d = $.Deferred();

            Modules.ContentProvider('module://workflow/data/users', 'holiday', { UserID: userID })
                .then(function(data) {
                    if (data && data.HolidayEndDate) {
                        var dateTimeFormat = currentCulture.dateTime.dateShort + ' ' + currentCulture.dateTime.timeShort;

                        var text = '<span class="text-emphasis">' + locfmt('{ris,Warning}') + ':</span> ' +
                            locfmt('{ris,UserOnHoliday}',
                            {
                                user: data.UserName,
                                startDate: data.HolidayStartDate.format(dateTimeFormat),
                                endDate: data.HolidayEndDate.format(dateTimeFormat)
                            });

                        d.resolve(text);
                    } else {
                        d.resolve('');
                    }
                },
                function(h) {
                    ris.notify.showError('Error retrieving user holiday', h.message);
                    d.reject();
                });

            return d;
        }
    };

    function handleStandardReportSelection(model) {
        model.Examinations()
            .qEach(function(examination) {
                examination.DoStandardReport.subscribe(function(newValue) {
                        if (newValue === true && examination.LinkedStandardReports().length > 0) {
                            var currentSelectedReportId = examination.SelectedStandardReportID();
                            examination.SelectedStandardReportID(null);

                            if (currentSelectedReportId) {
                                examination.SelectedStandardReportID(currentSelectedReportId);
                            } else {
                                examination
                                    .SelectedStandardReportID(examination.LinkedStandardReports()[0]
                                        .StandardReportID()
                                        .toString());
                            }
                        }
                    },
                    model);
            });
    };

    function calculateStandardReportElementIDs(model) {
        model.Examinations().qEach(function(examination) {
            examination.StandardReportCheckboxID = 'StandardReportCheckbox_' + examination.ID();
            examination.StandardReportRadioGroupName = 'StandardReportRadioGroup_' + examination.ID();

            var linkedStandardReports = examination.LinkedStandardReports();
            if (linkedStandardReports != null) {
                examination.LinkedStandardReports()
                    .forEach(function(report) {
                        report.StandardReportRadioID = ko
                            .observable(examination.StandardReportRadioGroupName + '_' + report.StandardReportID());
                    });
            }
        });
    };

    function changeNote(ExaminationID, DiscussionListID, note) {
        var def = new $.Deferred();

        Modules.ContentProvider('module://websitecore/data/discussion', 'changenote', { ExaminationID: ExaminationID, DiscussionListID: DiscussionListID, new_note: note })
            .then(function(a) {
                if (a === true) {
                    def.resolve();
                } else {
                    def.reject(a && a.message);
                }
            }, function() {
                def.reject('Error while communication with the server.');
            }).always(function() {
                ZillionRis.SiteEvents.broadcast('lazy-page-update');
            });

        return def.promise();
    }

    function enableYesInPromote(model, popup) {
        if (popup) {
            // When standard report is enabled, any examinations needs standard reporting then an authorizer must be present.
            if (model.EnableAuthorizer() && model.Examinations().qAny('DoStandardReport()') && !model.AuthorizerID()) {
                popup.disableButton('yes');
            }
            // When there is anything not needing standard reporting then a regular user must be present.
            else if (model.Examinations().qAny('!DoStandardReport()') && !model.Users().qFirst().id()) {
                popup.disableButton('yes');
            } else {
                popup.enableButton('yes');
            }
        }
    }

    var allCommands = $.extend(true, {}, appCommands, cardCommands, patientCommands, orderCommands, examinationCommands, speechStateCommands, discussionCommands);

    var commandManager = new ZillionParts.CommandManager();
    commandManager.assign(allCommands);

    $.extend(true, window, {
        ZillionRis: {
            Commands: {
                Application: appCommands,
                Cards: cardCommands,
                Patients: patientCommands,
                Orders: orderCommands,
                Examinations: examinationCommands,
                SpeechStates: speechStateCommands,
                Discussions: discussionCommands,
                Resources: allCommands,
                Utils: utils
            },
            CommandManager: commandManager
        }
    });
})(jQuery);
