(function($) {
    var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
    var commandResources = new ZillionParts.CommandResources(ZillionRis.CommandResources);
    var iaEvent = new ZillionParts.Event();
    var authorizationViewModel;

    window.defaultRecorderButtons = {
        play: function() { window.recorder.Play(); },
        stop: function() { window.recorder.Stop(); },
        pause: function() { window.recorder.Pause(); },
        forward: function() { window.recorder.Forward(); },
        rewind: function() { window.recorder.Rewind(); },

        PlayStopToggle: function() {
            var audioStatus = recorder.GetSpeechStatus();
            if (audioStatus === 1 || audioStatus === 6 || audioStatus === 9 || audioStatus === 10) {
                window.recorder.Pause();
            } else {
                window.recorder.Play();
            }
        },

        cancel: function() {
            /*executeCommand('CancelDictation');*/
        },
        Finish: function() {
        },
        Skip: function() {
            var selectedItem = authorizationViewModel.selectedItem();
            if (selectedItem) {
                authorizationViewModel.iaAuthorization.skipDictation();
            }
        },
        Open: function() {
            var selectedItem = authorizationViewModel.selectedItem();
            if (selectedItem) {
                authorizationViewModel.iaAuthorization.open(selectedItem);
            }
        }
    };
    window.recorderButtons = $.extend(true, {}, window.defaultRecorderButtons);

    $(window).on('beforeunload', function() {
        if (authorizationViewModel.iaAuthorization.isOpened()) {
            authorizationViewModel.iaAuthorization.cancel();
        }
    });

    function handleButtonPressed(button) {
        var map = {
            'Play': ['pause', 'play'],
            'Stop': [null, 'pause'],
            'FastRewind': ['pause', 'rewind'],
            'FastForward': ['pause', 'forward'],
            'PlayStopToggle': ['PlayStopToggle', 'PlayStopToggle'],
            'Eol': [null, 'Finish'],
            'Cancel': [null, 'cancel'],
            'Function1': [null, 'Open'],
            'Function2': [null, null],
            'Function3': [null, 'cancel']
        };

        var mappedAction = map[button.action];
        if (mappedAction) {
            var action = mappedAction[button.pressed ? 1 : 0];
            if (action) {
                try {
                    window.recorderButtons[action]();
                } catch (ex) {
                    console.log(locfmt('Button Handling: failed to perform action: {buttonAction} using resolution {resolution}.', { buttonAction: button.action, resolution: action }));
                }
            }
        }
    }

    iaEvent.subscribe(function(s, x) {
        if (x.Event === 'OnFinished') {
            setTimeout(function() {
                authorizationViewModel.refresh();
            }, 500);
        }
    });

    $(function() {
        $.extend(true, window, {
            statusChangeCallback: function(s, args) {
                if (args.type === 'change-user') {
                    var keys = selection.getKeys();
                    if (keys) {
                        var data = dataView.getItemByKey(keys[0]);
                        current_speechID = data.SpeechStateID;
                    }
                    executeCommand('finish-authorization', current_speechID);
                } else {
                    refresh();
                }
            }
        });

        var visitedSpeechStateIDs = [];

        function queryNotVisitedSpeechStates(items) {
            var filteredItems = items.except(visitedSpeechStateIDs, '$left.$key === $right');
            if (filteredItems.length == 0) {
                // All items have been visited, reset the list.
                visitedSpeechStateIDs = [];
                return items;
            } else {
                // Filter out non existing items.
                visitedSpeechStateIDs = items.intersect(visitedSpeechStateIDs, '$left.$key === $right').qSelect('$key');
                return filteredItems;
            }
        }

        function getNextSpeechStateKey(selectedItem) {
            var currentUserID = window.currentUserID;
            var selectedKey = selection.getKeys().qFirst();
            selectedItem = selectedItem || dataView.getItemByKey(selectedKey);

            // Filter down to valid items.
            var items = dataView
                .getItems(false)
                .qWhere(function(item) { return !item.HousekeepingID && (item.SpeechStatusID == 'CTR' || item.AuthoriserID === currentUserID || item.AuthoriserID === null || item.AuthoriserID === 0); });


            // Filter speech states that have been opened by the user.
            items = queryNotVisitedSpeechStates(items);

            // Find next related speech job.
            if (selectedItem) {
                var x = getRelatedSpeechStateKey(selectedItem, items);
                if (x) {
                    visitedSpeechStateIDs.push(x);
                    return x;
                }
            }

            // No related match found, return the first speech state available.
            var firstSpeechState = items.qFirst();
            if (firstSpeechState && firstSpeechState.$key !== selectedKey) {
                visitedSpeechStateIDs.push(firstSpeechState.$key);
                return firstSpeechState.$key;
            }

            // No speech states available.
            return false;

            function getRelatedSpeechStateKey(baseItem, speechStateList) {
                return speechStateList.qWhere('OrderID === $params[0] && $key !== $params[1]', [baseItem.OrderID, baseItem.$key]).qSelect('$key').qFirst()
                    || speechStateList.qWhere('PatientID === $params[0] && $key !== $params[1]', [baseItem.PatientID, baseItem.$key]).qSelect('$key').qFirst();
            }
        }

        Rogan.Ris.Locations.ensure();
        Rogan.Ris.Specialisations.ensure();

        // Register Resources.
        ZillionRis.Commands.RegisterResources(commandResources);

        function createController() {
            var examinationContextMenu = new ZillionParts.CommandList();
            var examinationActionList = new ZillionParts.CommandList();
            with (examinationContextMenu) {
                add('order.order-information').executeWith('{ OrderID: OrderID }');
                add('supervisor.open-memo').executeWith('{ ID: ExaminationID, SupervisorMemo: true }').showWhen('Supervised != null && !Supervised');
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping-aux').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
                if (window.permissions.hasFailsafePermission) {
                    add('examination.send-to-failsafe').executeWith('{ ExaminationID: ExaminationID }').hideWhen('HasUnhandledFailsafe');
                    add('examination.cancel-failsafe').executeWith('{ ExaminationID: ExaminationID }').showWhen('HasUnhandledFailsafe');
                }
            }
            with (examinationActionList) {
                if (window.permissions.hasFailsafePermission) {
                    add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
                }
                add('examination.housekeeping-state').showWhen('HousekeepingID');
                add('transcription.open').executeWith('SpeechStateID').hideWhen('HousekeepingID');
                add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
            }

            function openSpeechStateNow(speechStateKey) {
                if (authorizationViewModel.iaAuthorization.isOpened()) {
                    authorizationViewModel.iaAuthorization.suspend().then(doOpenIA);
                } else {
                    doOpenIA();
                }

                function doOpenIA() {
                    selection.clear();

                    var itemByKey = dataView.getItemByKey(speechStateKey);
                    if (itemByKey) {
                        selection.add(speechStateKey);

                        authorizationViewModel.iaAuthorization.open(itemByKey);
                    }
                }
            }

            commandManager.assign({ 'transcription.open': openSpeechStateNow });
            commandResources.assign({ 'transcription.open': { title: locfmt('{ris,AuthorizationPage_StartAuthorization}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'}} });

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'SpeechStateID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: examinationContextMenu, manager: commandManager, resources: commandResources } },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', renderText: false, commands: { manager: commandManager, resources: commandResources, list: examinationActionList }, dataType: 'commands', width: 55 },
                    { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'StartDateTime', dataType: 'scheduled-date' },
                    { title: locfmt('{ris,FieldDictationTimestamp}'), fieldID: 'SpeechStateCreationDate', width: 140, dataType: 'scheduled-date' },
                    { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 140 },
                    { title: locfmt('{ris,FieldPatientName}'), fieldID: 'Patient', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200 },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 140 },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'Description', width: 120 },
                    { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', width: 80 },
                    { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologist', width: 120 },
                    { title: locfmt('{ris,FieldTypist}'), fieldID: 'Typist', width: 120 },
                    { title: locfmt('{ris,FieldIntendedRadiologist}'), fieldID: 'IntendedReporter' },
                    { title: locfmt('{ris,FieldAuthoriser}'), fieldID: 'Authoriser' },
                    { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName' },
                    { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' }
                ],
                sort: [
                    { "fieldID": "StartDateTime", asc: true },
                    { "fieldID": "SpeechStateCreationDate", asc: true }
                ],
                gridOptions: {
                    onRowCreated: onItemCreated,
                    onFilterCreated: function(filter) {
                        var customFilter = new ZillionParts.Condition();
                        customFilter.type = 'and';

                        customFilter.include(filter);
                        var currentFilter = authorizationViewModel.filters.selected();
                        if (currentFilter) {
                            combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                            combineListFilter(customFilter, 'RoomID', currentFilter.rooms);
                            combineListFilter(customFilter, 'RequesterLocationID', currentFilter.requesterLocations);
                            combineListFilter(customFilter, 'RequesterSpecialisationID', currentFilter.specialisations);
                            combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);

                            combineListFilter(customFilter, 'RadiologistID', currentFilter.reporters);
                        }

                        // Work item type filter.
                        var digital = authorizationViewModel.dictationTypeDigital();
                        var interActive = authorizationViewModel.dictationTypeInterActive();
                        var text = authorizationViewModel.dictationTypeText();
                        var other = authorizationViewModel.dictationTypeOther();
                        if (digital || interActive || text || other) {
                            if (!digital) {
                                customFilter.exclude('DictationTypeID === "DIG"');
                            }
                            if (!interActive) {
                                customFilter.exclude('DictationTypeID === "INT"');
                            }
                            if (!text) {
                                customFilter.exclude('DictationTypeID === "TXT"');
                            }
                            if (!other) {
                                customFilter.exclude('DictationTypeID !== "DIG" && DictationTypeID !== "INT" && DictationTypeID !== "TXT"');
                            }
                        }
                        // Examination count filter.
                        var single = authorizationViewModel.dictationSingleExam();
                        var multiple = authorizationViewModel.dictationMultiExam();
                        if (single || multiple) {
                            if (!single) {
                                customFilter.exclude('WorkItemCount == 1');
                            }
                            if (!multiple) {
                                customFilter.exclude('WorkItemCount > 1');
                            }
                        }

                        return createFilterFunc(customFilter);
                    },
                    createEmptyDataItem: function() {
                        var examinations = authorizationViewModel.gridOptions.dataView.getItems(true).length;
                        if (examinations > 0) {
                            var foo = $('<span>' + locfmt('{ris,NoExaminationsFoundFilter}') + '<br />' + examinations + locfmt('{ris,ExaminationsInTotal}') + '<br /><a>' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                            $('a', foo).click(function() {
                                authorizationViewModel.clearFilter();
                            });
                            return foo;
                        } else {
                            return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                        }
                    },
                    onSorting: function(sort) {
                        // Forced sorting:
                        sort = sort.filter(function(x) { return x.fieldID !== 'UrgencySortIndex'; });
                        sort = [{ "fieldID": "UrgencySortIndex", asc: false }].concat(sort);
                        return sort;
                    },
                    itemdblclick: function(e, args) {
                        openSpeechStateNow(args.item.$key);
                    }
                }
            });

            function onItemCreated($element, data) {
                ZillionRis.AddUrgencyClasses($element, data.UrgencyID);
                if (data.SpeechStatusID == 'PAU') {
                    $element.addClass('data-ignored');
                }
            }

            return gridController.create();
        }

        var gridOptions = createController();
        if (window.pageConfig.enableSupervision) {
            gridOptions.columns.push({ title: locfmt('{ris,FieldSupervisor}'), fieldID: 'SupervisorName' });
        }

        var dataView = gridOptions.dataView;
        var selection = gridOptions.selection;

        var authorizationSelectionChangedTh = { delay: 500, callback: onAuthorizationSelectionChangedCore };
        var authorizationSelectionChanged = throttleFunc(authorizationSelectionChangedTh);
        selection.onChange.subscribe(authorizationSelectionChanged);
        selection.setMultiSelect(false);


        authorizationViewModel = new AuthorizationPageViewModel();
        authorizationViewModel.selection = selection;
        authorizationViewModel.filters.selected.subscribe(function() {
            $("#AuthorizationGridView").virtualDataGrid('updateFilter');
            refresh();
        });

        authorizationViewModel.grid = $('#AuthorizationGridView');
        authorizationViewModel.gridOptions = gridOptions;

        // Triggers grid filter:
        var updateGridFilter = function() {
            authorizationViewModel.grid.virtualDataGrid('updateFilter');
            authorizationViewModel.grid.virtualDataGrid('refresh');
        };
        authorizationViewModel.dictationTypeDigital.subscribe(updateGridFilter);
        authorizationViewModel.dictationTypeInterActive.subscribe(updateGridFilter);
        authorizationViewModel.dictationTypeText.subscribe(updateGridFilter);
        authorizationViewModel.dictationTypeOther.subscribe(updateGridFilter);
        authorizationViewModel.dictationSingleExam.subscribe(updateGridFilter);
        authorizationViewModel.dictationMultiExam.subscribe(updateGridFilter);

        // Triggers layout:
        var updateLayout = function() {
            setTimeout(function() {
                ZillionParts.Fluids.Update();
            });
        };
        var updateView = function () {
            updateLayout();
            window.loadPatientHistory();
        };
        authorizationViewModel.patientHistoryVisible.subscribe(updateView);
        authorizationViewModel.iaAuthorization.error.subscribe(updateLayout);
        authorizationViewModel.iaAuthorization.space.subscribe(updateLayout);

        authorizationViewModel.currentWorklist.subscribe(function (wl) {
            worklist = wl && wl.id;
            refresh();
        });

        bindWorkLists();

        function bindWorkLists() {
            var userName = window['currentUserName'] || 'Current user';
            authorizationViewModel.worklists.push({ id: 'currentuser', name: userName });
            authorizationViewModel.worklists.push({ id: 'allusers', name: locfmt('{ris,Worklist_AllUsersTitle}') });
            authorizationViewModel.currentWorklist(authorizationViewModel.worklists()[0]);
        }

        (function() {
            var storageKey_Space = 'authorization.space';
            var storageKey_PatientHistory = 'authorization.patienthistory';
            var storageKey_DisableAudio = 'authorization.disableAudio';
            // Use local storage for speed.
            var storedTranscriptionSpace = +(window.sessionStorage[storageKey_Space] || 1);
            authorizationViewModel.iaAuthorization.space(storedTranscriptionSpace);
            ZillionRis.UserSettings.get('authorization', 'space')
                .then(function(x) {
                    if (x !== undefined) {
                        storedTranscriptionSpace = +(x || 1);
                        authorizationViewModel.iaAuthorization.space(storedTranscriptionSpace);
                    }
                }).always(function() {
                    authorizationViewModel.iaAuthorization.space.subscribe(function (x) {
                        window.sessionStorage[storageKey_Space] = x;
                        ZillionRis.UserSettings.set('authorization', 'space', x);
                    });
                });
            // Use local storage for speed.
            var patientHistoryVisible = +(window.sessionStorage[storageKey_PatientHistory] || 1);
            authorizationViewModel.patientHistoryVisible(!!patientHistoryVisible);
            ZillionRis.UserSettings.get('authorization', 'patienthistory')
                .then(function(x) {
                    if (x !== undefined) {
                        storedTranscriptionSpace = !!x;
                        authorizationViewModel.patientHistoryVisible(storedTranscriptionSpace);
                    }
                }).always(function() {
                    authorizationViewModel.patientHistoryVisible.subscribe(function(x) {
                        window.sessionStorage[storageKey_PatientHistory] = x ? 1 : 0;
                        ZillionRis.UserSettings.set('authorization', 'patienthistory', x ? 1 : 0);
                    });
                });
            // Use local storage for speed.
            var disableAudio = +(window.sessionStorage[storageKey_DisableAudio] || 0);
            authorizationViewModel.disableAudio(!!disableAudio);
            ZillionRis.UserSettings.get('authorization', 'disableAudio')
                .then(function(x) {
                    if (x !== undefined) {
                        storedTranscriptionSpace = !!x;
                        authorizationViewModel.disableAudio(storedTranscriptionSpace);
                    }
                }).always(function() {
                    authorizationViewModel.disableAudio.subscribe(function(x) {
                        window.sessionStorage[storageKey_DisableAudio] = x ? 1 : 0;
                        ZillionRis.UserSettings.set('authorization', 'disableAudio', x ? 1 : 0);
                    });
                });
        })();
        clearPatientDetails();

        // Data bind.
        ko.applyBindings(authorizationViewModel, $('#MainPanel')[0]);
        ZillionRis.WorkList.SelectionStore('#AuthorizationGridView', authorizationViewModel.gridOptions, 'authorization.selection');

        authorizationViewModel.gridSettingsStore.initialize('#AuthorizationGridView', authorizationViewModel.gridOptions, 'authorization', 'authorization-worklist').loadSettings();

        createTranscriptionContextMenu();

        $(function() {
            authorizationViewModel.loadSettings();
            authorizationViewModel.loadFilters();
            authorizationViewModel.refresh();
        });

        var refreshIntervalMs = window.pageConfig.RefreshIntervalMs;
        if (refreshIntervalMs) {
            // Sanity check.
            if (refreshIntervalMs < 15000) {
                refreshIntervalMs = 15000;
            }

            setInterval(function() {
                if (!authorizationViewModel.iaAuthorization.isOpened()) {
                    authorizationViewModel.refresh();
                }
            }, refreshIntervalMs);
        }

        function createFilterFunc(filters) {
            return function(items) { return filters.filter(items); };
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

        setTimeout(function() {
            ConnectSpeechMike(handleButtonPressed);
        }, 2000);

        $(window).pageLoaded(function() {
            $('#AuthorizationEditor').shortcodes({ TemplateType: 'RPT' });
        });


        function AuthorizationPageViewModel() {
            var self = this;

            this.gridOptions = gridOptions;
            this.dataView = gridOptions.dataView;

            this.getPanelCss = function() {
                var cls = [];
                switch (self.iaAuthorization.space()) {
                case 1:
                    cls.push('page-transcription-small');
                    break;
                case 2:
                    cls.push('page-transcription-medium');
                    break;
                case 3:
                    cls.push('page-transcription-large');
                    break;
                }
                return cls.join(' ');
            };

            this.patientHistory = createPatientHistoryVM();


            this.worklists = ko.observableArray([]);
            this.currentWorklist = ko.observable(null);

            this.worklistTitle = ko.observable();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();
            this.selectedItem = ko.observable();

            this.hasItems = new ko.observable(false);
            this.dataView.onUpdated.subscribe(function() {
                self.hasItems(this.length > 0);

                self.worklistTitle(locfmt('{ris,AuthorizationPage_AuthorizationGridViewHeader}', { shown: self.dataView.getItems(false).length, total: self.dataView.getItems(true).length }));
            });

            this.isLoading = ko.observable(false);

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'authorization-filter';

            this.loadUserSettings = function() {
                gridSettingsStore.loadSettings();
            };
            this.resetUserSettings = function() {
                self.gridSettingsStore.resetSettings();
            };
            this.customizeView = function() {
                $('#AuthorizationGridView').customizeVirtualDataGrid();
            };
            this.clearFilter = function() {
                $('#AuthorizationGridView').virtualDataGrid('clearFilter');
                this.filters.selectedID(null);
                self.dictationTypeDigital(false);
                self.dictationTypeInterActive(false);
                self.dictationTypeText(false);
                self.dictationTypeOther(false);
                self.dictationSingleExam(false);
                self.dictationMultiExam(false);
                self.refresh();
            };

            this.refresh = function() {
                return refresh();
            };

            this.reset = function() {
                self.gridSettingsStore.resetSettings();
                this.filters.selectedID(null);
            };

            var hasLoaded = false;
            this.loadSettings = function() {
                ZillionRis.UserSettings.get('authorization', 'settings')
                    .then(function(data) {
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
            this.saveSettings = function() {
                ZillionRis.UserSettings.set('authorization', 'settings', {
                    filter: self.filters.selectedID()
                });
            };

            var update = ZillionParts.Delay(function() {
                if (self.isLoading() === false && hasLoaded == true) {
                    self.saveSettings();
                }
            }, 1000, true);
            this.filters.selected.subscribe(update);
            this.customizeFilter = function() {
                $('#FilterDialog').pageSubNav('show');
            };
            this.loadFilters = function() {
                this.filters.loadFilters();
            };

            /* Worklist Filters */
            this.dictationTypeDigital = ko.observable(false);
            this.dictationTypeDigitalCount = ko.observable(0);
            this.dictationTypeInterActive = ko.observable(false);
            this.dictationTypeInterActiveCount = ko.observable(0);
            this.dictationTypeText = ko.observable(false);
            this.dictationTypeTextCount = ko.observable(0);
            this.dictationTypeOther = ko.observable(false);
            this.dictationTypeOtherCount = ko.observable(0);
            this.dictationSingleExam = ko.observable(false);
            this.dictationSingleExamCount = ko.observable(0);
            this.dictationMultiExam = ko.observable(false);
            this.dictationMultiExamCount = ko.observable(0);

            this.patientHistoryVisible = ko.observable(true);
            this.disableAudio = ko.observable(true);

            gridOptions.dataView.onUpdated.subscribe(function() {
                var aa = gridOptions.dataView.getItems(true);
                var digital = aa.qCount('DictationTypeID === "DIG"');
                var interActive = aa.qCount('DictationTypeID === "INT"');
                var text = aa.qCount('DictationTypeID === "TXT"');
                var other = aa.length - digital - interActive - text;

                var single = aa.qCount('WorkItemCount == 1');
                var multiple = aa.qCount('WorkItemCount > 1');

                self.dictationTypeDigitalCount(digital);
                self.dictationTypeInterActiveCount(interActive);
                self.dictationTypeTextCount(text);
                self.dictationTypeOtherCount(other);
                self.dictationSingleExamCount(single);
                self.dictationMultiExamCount(multiple);

            });

            this.iaAuthorization = new AuthorizationProcessViewModel({
                Owner: self,
                onFinished: function() {
                    self.refresh();
                },
                onSuspended: function() {
                    self.refresh();
                },
                onCancelled: function(item) {
                    Modules.Task('module://dictation/task/authorization-reservation', 'cancel', { SpeechStateID: item.SpeechStateID })
                        .then(function(x) {
                        }, function() {
                            ris.notify.showInformation('Reservation could not be cancelled.');
                        }).always(function() {
                            self.refresh();
                        });
                },
                onReserved: function() {
                    var x = getNextSpeechStateKey();
                    if (x) {
                        selection.clear();
                        selection.add(x);
                    }
                },
                OnNextDictation: function () {
                    var visitedKeys = selection.getKeys();
                    var selectedItem = dataView.getItemByKey(visitedKeys[0]);
                    Loading.Show('Looking for the next dictation<br/>One moment please ...');

                    next();

                    function next() {
                            var nextJobID = getNextSpeechStateKey(selectedItem);

                            if (!nextJobID) {
                                alert("There's no new dictation available.");
                                Loading.Hide();
                            } else {
                                visitedKeys.push(nextJobID);

                                var item = dataView.getItemByKey(nextJobID);
                                Modules.Task('module://dictation/task/authorization-reservation', 'request', { SpeechStateID: item.SpeechStateID })
                                    .then(function(data) {
                                        if (data.Success) {
                                            selection.clear();
                                            selection.add(nextJobID);
                                            $('#AuthorizationGridView').virtualDataGrid('focusFirstSelection');

                                            Loading.Hide();
                                            setTimeout(function() {
                                                self.iaAuthorization.open(item);
                                            }, 500);
                                        } else {
                                            next();
                                        }
                                    }, function() {
                                        Loading.Hide();
                                        ris.notify.showInformation('Oops.');
                                    });

                            }
                        }
                }
            });
        }

        function showAuthorizationTaken(Description, ReservedByName) {
            $(locfmt('<div>{ris,TranscriptionPage_TranscriptionTakenText}</div>', { description: '<span class="text-emphasis">' + Description + '</span>', reservedByName: '<span class="text-emphasis">' + ReservedByName + '</span>' })).dialog({
                resizable: false,
                title: locfmt("{ris,AuthorizationPage_AuthorizationTaken}"),
                width: 375,
                modal: true,
                buttons: {
                    "Ok": function() {
                        $(this).dialog("close");
                    }
                }
            });
        }


        function AuthorizationProcessViewModel(options) {
            var textAudioController = new AuthorizationTextAudioController(this);
            var interActiveAudioContoller = new AuthorizationInterActiveControllerPopup(this);
            var controllers = {
                INT: interActiveAudioContoller,
                DIG: textAudioController,
                TXT: textAudioController
            };

            function controller(item) {
                var x = controllers[item.DictationTypeID] || textAudioController; // TGR20140918 - Did not get a controller back, fallback to text.
                if (x) {
                    return x;
                }
                return null;
            }


            var self = this;

            self.disableAudio = function() {
                return options.Owner.disableAudio();
            };
            this.options = options;
            this.speechStateInfo = ko.observable(null);
            this.item = ko.observable(null);
            this.isOpened = ko.observable(false);

            this.text = ko.observable(null);
            this.showText = ko.observable(false);
            this.hasAudio = ko.observable(false);
            this.isAudioDisabled = ko.observable(false);

            this.error = ko.observable(null);
            this.errorHousekeepingItem = ko.observable(null);
            this.clearError = function() {
                self.error(null);
                self.errorHousekeepingItem(null);
            };
            this.errorHousekeeping = function() {
                var error = self.error().replace(/<br>/gi, ' ').replace(/\s+/gi, ' ').trim();
                var item = self.errorHousekeepingItem();
                if (item) {
                    commandManager.execute('examination.send-to-housekeeping', {
                        Patient: item.Patient,
                        ExaminationDisplayName: item.Description,
                        ExaminationID: item.ExaminationID,
                        Text: 'System: ' + error,
                        NotRefreshNeeded: true
                    }).then(function() {
                        self.clearError();
                        var authorizationModel = authorizationViewModel.iaAuthorization;
                        authorizationViewModel.refresh().then(function() {
                            if (authorizationModel.isOpened()) {
                                authorizationModel.cancel();
                            }
                            authorizationModel.options.onReserved();
                        });
                    }, function() {
                        alert('Something went wrong while sending the dication to housekeeping, please try again.');
                    });
                }
            };

            this.controllerCall = function(callback) {
                var item = this.item;
                if (item) {
                    var ctrl = controller(item);
                    if (ctrl) {
                        callback(ctrl);
                        return true;
                    }
                }
                return false;
            };

            this.space = ko.observable(1);
            this.smallSpace = function() {
                this.space(1);
            };
            this.mediumSpace = function() {
                this.space(2);
            };
            this.largeSpace = function() {
                this.space(3);
            };

            this.showText.subscribe(function() {
                setTimeout(function() {
                    ZillionParts.Fluids.Update();
                });
            });

            this.resetTextInput = function() {
                self.text(null);
                self.showText(false);
                setTimeout(function() { ZillionParts.Fluids.Update(); });
            };

            this.isOpened.subscribe(function() {
                if (self.isOpened()) {
                    window.recorderButtons = $.extend(true, {}, window.defaultRecorderButtons, {
                        play: function() { self.play(); },
                        PlayStopToggle: function() { self.play(); },
                        pause: function() { self.pause(); },
                        stop: function() { self.stop(); },
                        rewind: function() { self.rewind(); },
                        forward: function() { self.forward(); },
                        cancel: function() { self.cancel(); },
                        Finish: function() { self.nextDictation(); }
                    });
                } else {
                    window.recorderButtons = $.extend(true, {}, window.defaultRecorderButtons);
                }
            });

            this.nextDictation = function() {
                if (self.isOpened()) {
                    self.finish()
                        .then(function() {
                            options.OnNextDictation();
                        });
                } else {
                    refresh().always(function() {
                        options.OnNextDictation();
                    });
                }
            };
            this.skipDictation = function() {
                if (self.isOpened()) {
                    self.cancel()
                        .then(function() {
                            options.OnNextDictation();
                        });
                } else {
                    refresh().always(function() {
                        options.OnNextDictation();
                    });
                }
            };

            this.viewImages = function() {
                if (self.isOpened()) {
                    var item = self.item();
                    commandManager.execute('image-viewer.view-images', { Source: self.speechStateInfo().StudyUrns });
                }
            };

            this.resolveController = function(item) {
                var d = $.Deferred();
                d.resolve(controller(item));

                return d;
            };

            this.isLoading = ko.observable(false);
            this.open = function (item) {
                if (self.isLoading()) {
                    return $.Deferred().reject();
                }

                self.isLoading(true);

                // Mark as visited so the auto next does not come back until all speech states have been visited.
                visitedSpeechStateIDs.push(item.$key);

                self.resetState();
                self.clearError();
                self.speechStateInfo(null);

                if (item.HousekeepingID) {
                    self.error('Examination is currently in housekeeping.');
                    options.onReserved();

                    self.isLoading(false);
                    return $.Deferred().reject();
                }

                {
                    var d = $.Deferred();
                    d.always(function() {
                        self.isLoading(false);
                    });

                    var canZillionSpeech = item.DictationTypeID === 'INT';
                    if (canZillionSpeech) {
                        console.log('Authorization: Detecting Zillion Speech installation.');
                        ConnectController("InterActive").then(function () {
                            if (ScriptServer.ScriptVersion >= 2) {
                                if (!controllers['INT']) {
                                    console.log('Authorization: New Zillion Speech found, use InterActiveController.');
                                    controllers['INT'] = new AuthorizationInterActiveControllerPopup(self);
                                }
                            } else {
                                if (!controllers['INT']) {
                                    console.log('Authorization: Old Zillion Speech found, use TextAudioController.');
                                    controllers['INT'] = new AuthorizationTextAudioController(self);
                                }
                            }
                        }, function () {
                            if (!controllers['INT']) {
                                console.log('Authorization: No Zillion Speech found, use TextAudioController.');
                                controllers['INT'] = new AuthorizationTextAudioController(self);
                            }
                        }).always(function () {
                            openCore(d);
                        });
                    } else {
                        openCore(d);
                    }
                    return d.promise();

                    function openCore(openCoreDef) {
                        Loading.Show('Opening dictation<br/>One moment please ...');
                        Modules.Task('module://dictation/task/speechstateinfo', 'request', { Source: 'urn:speechstate:' + item.SpeechStateID })
                            .then(function(x) {
                                self.speechStateInfo({
                                    Patient: x.PatientName,
                                    Studies: x.Studies,
                                    StudyUrns: x.StudyUrns
                                });
                            }).always(function() {
                                Modules.Task('module://dictation/task/authorization-reservation', 'request', { SpeechStateID: item.SpeechStateID })
                                    .then(function(x) {
                                        if (x.Success) {
                                            var noAudio = item.DictationTypeID === 'TXT';

                                            self.positionBarCss({ width: '0%' });
                                            self.positionBarClasses('');

                                            self.hasAudio(!noAudio);
                                            self.isAudioDisabled(self.disableAudio());
                                            self.showText(false);
                                            self.text(null);

                                            var ctrl = controller(item);
                                            var open = ctrl.open(item, { disableAudio: noAudio, AuthorizationToken: x.AuthorizationToken });
                                            open.then(function() {
                                                self.item(item);
                                                self.isOpened(true);

                                                if (ctrl.showTextInput()) {
                                                    self.showText(true);
                                                    self.text(ctrl.getText());
                                                }

                                                openCoreDef.resolve();
                                            }, function() {
                                                ris.notify.showError(locfmt('{ris,AuthorizationPage_StartAuthorization}'), 'Failed to open the controller.');
                                                self.speechStateInfo(null);
                                                openCoreDef.reject();
                                            }).always(function() {
                                                Loading.Hide();
                                            });
                                        } else {
                                            openCoreDef.reject();
                                            showAuthorizationTaken(item.Description, x.ReservedByName);
                                            Loading.Hide();
                                            //when the item is already taken by another radiologist, we need to set the speechstate info to null
                                            self.speechStateInfo(null);
                                            options.onReserved(item);
                                        }
                                    }, function(error) {
                                        d.reject();
                                        if (error.ReservedByName) {
                                            showAuthorizationTaken(item.Description, error.ReservedByName);
                                        } else {
                                            ris.notify.showError(locfmt('{ris,AuthorizationPage_StartAuthorization}'), locfmt('{ris,UnableToLockExamination}'));
                                        }
                                        Loading.Hide();
                                        options.onReserved(item);
                                    });
                            });
                        } //openCore
                    }
            };
            this.cancel = function() {
                var item = self.item();
                if (item) {
                    var d = $.Deferred();
                    self.resolveController(item)
                        .then(function(ctrl) {
                            ctrl.cancel()
                                .then(function() {
                                    self.isOpened(false);
                                    options.onCancelled(self.item());
                                    self.speechStateInfo(null);
                                    self.resetTextInput();
                                    d.resolve();
                                }, function() {
                                    d.reject();
                                });
                        }, function() {
                            d.reject();
                        });
                    return d;
                } else {
                    return $.Deferred().reject().promise();
                }
            };
            this.suspend = function() {
                var item = self.item();
                if (item) {
                    var d = $.Deferred();
                    self.resolveController(item)
                        .then(function(ctrl) {
                            ctrl.suspend().then(function () {
                                self.speechStateInfo(null);
                                d.resolve();
                            }, function() {
                                d.reject();
                            });
                        }, function() {
                            d.reject();
                        });
                    return d;
                } else {
                    return $.Deferred().reject().promise();
                }
            };
            this.finish = function() {
                var item = self.item();
                if (item) {
                    //var d = $.Deferred();
                    Loading.Show(locfmt('{ris,AuthorizationPage_CompletingAuthorization}'), 0);
                    var ctrl = controller(item), d = $.Deferred();

                    // stop the audio before the popup, clear the images
                    self.stop();
                    ZillionRis.ImageViewer().clear();

                    ctrl.finish()
                    .then(function () {
                        d.resolve();
                    }, function(ex) {
                        ex && ex.error ? ris.notify.showError(locfmt('{ris,AuthorizationPage_FinishAuthorization}'), locfmt('{ris,AuthorizationPage_FinishFailDetails}', ex.message)) 
                            : ris.notify.showError(locfmt('{ris,AuthorizationPage_FinishAuthorization}'), locfmt('{ris,AuthorizationPage_FinishFail}'));
                        d.reject();
                    }).always(function() {
                        Loading.Hide();
                    });
                    //self.resolveController(item)
                    //    .then(function(ctrl) {
                    //        ctrl.finish()
                    //            .then(function () {
                    //                d.resolve();
                    //            }, function(ex) {
                    //                ex && ex.error ? ris.notify.showError(locfmt('{ris,AuthorizationPage_FinishAuthorization}'), locfmt('{ris,AuthorizationPage_FinishFailDetails}', ex.message)) 
                    //                    : ris.notify.showError(locfmt('{ris,AuthorizationPage_FinishAuthorization}'), locfmt('{ris,AuthorizationPage_FinishFail}'));
                    //                d.reject();
                    //            }).always(function() {
                    //                Loading.Hide();
                    //            });
                    //    }, function() {
                    //        Loading.Hide();
                    //        d.reject();
                    //    });
                    return d;
                } else {
                    return $.Deferred().reject().promise();
                }
            };

            // Construct a list of authorization commands that are provided by external modules, e.g.
            // by the supervision module.
            this.pluginCommands = pageConfig
                .PluginCommands
                .qSelect(function(cmd) {
                    return {
                        name: cmd.Name,
                        canExecute:
                            ko.computed(function() {
                                var item = self.item();
                                var text = self.text();
                                if (item === null) {
                                    return false;
                                }
                                var model = { SpeechStateID: item.SpeechStateID, WorkingText: text, Supervised: item.Supervised };
                                return commandManager.canExecute(cmd.Command, model);
                            }),
                        execute: function() {
                            var item = self.item();
                            var model = { SpeechStateID: item.SpeechStateID, WorkingText: self.text(), Supervised: item.Supervised };
                            commandManager.execute(cmd.Command, model)
                                .then(function (x) {
                                    var d = $.Deferred();
                                    self.resolveController(item)
                                        .then(function (ctrl) {
                                            ctrl.suspend()
                                                .then(function () {
                                                    self.isOpened(false);
                                                    self.options.onFinished(item);
                                                    self.speechStateInfo(null);
                                                    self.resetTextInput();
                                                    d.resolve();
                                                }, function () {
                                                    d.reject();
                                                });
                                        }, function () {
                                            d.reject();
                                        });
                                });
                        }
                    };
                });			
            
            this.playPauseIcon = ko.observable("\uf04b");

            this.stopCss = ko.observable();
            this.playCss = ko.observable();
            this.pauseCss = ko.observable();
            this.rewindCss = ko.observable();
            this.forwardCss = ko.observable();

            this.stop = function () {
                var ctrl = controller(self.item());
                if (ctrl && ctrl.audioEnabled) {
                    ctrl.stop();
                }
            };
            this.play = function() {
                var ctrl = controller(self.item());
                if (ctrl && ctrl.audioEnabled) {
                    ctrl.play();
                }
            };
            this.pause = function() {
                var ctrl = controller(self.item());
                if (ctrl && ctrl.audioEnabled) {
                    ctrl.pause();
                }
            };
            this.rewind = function() {
                var ctrl = controller(self.item());
                if (ctrl && ctrl.audioEnabled) {
                    ctrl.rewind();
                    $(window).one('mouseup', function () {
                        ctrl.pause();
                    });
                }
            };
            this.forward = function() {
                var ctrl = controller(self.item());
                if (ctrl && ctrl.audioEnabled) {
                    ctrl.forward();
                    $(window).one('mouseup', function () {
                        ctrl.pause();
                    });
                }
            };

            this.position = ko.observable('Waiting');
            this.positionBarCss = ko.observable({ width: 0 });
            this.positionBarClasses = ko.observable('');
            this.positionBarClick = function(s, ev) {
                var nodeListOf = $(ev.currentTarget);
                var w = nodeListOf.width();
                var posX = nodeListOf.offset().left,
                    posY = nodeListOf.offset().top;
                var x = ev.pageX - posX,
                    y = ev.pageY - posY;

                var ctrl = controller(self.item());
                if (ctrl && ctrl.audioEnabled) {
                    var number = (1 / w * x);
                    var target = self.lengthMs * number;
                    ctrl.seek(target | 0);
                }
            };

            this.playerCss = ko.computed(function () {
                return self.isAudioDisabled() ? 'inactive' : '';
            });
            this.positionText = ko.computed(function () {
                var audioDisabled = self.isAudioDisabled();
                var position = self.position();
                if (audioDisabled) {
                    return 'Audio disabled';
                } else {
                    return position;
                }
            });

            this.resetState = function() {
                self.stopCss('');
                self.playCss('');
                self.pauseCss('');
                self.rewindCss('');
                self.forwardCss('');
                self.position('Waiting');
            };
        };

        function createTranscriptionContextMenu() {
            var configurationMenu = $('<input id="ExaminationGridSetting" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"></input>')
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
                            authorizationViewModel.refresh();
                        } else if (item.id == 'clear-filter') {
                            authorizationViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            authorizationViewModel.customizeView();
                        } else if (item.id == 'reset') {
                            authorizationViewModel.resetUserSettings();
                            authorizationViewModel.reset();
                        }
                    }
                });
            var find = $('#TranscriptionGridPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function onAuthorizationSelectionChangedCore() {
            var selectedKey = selection.getKeys().qFirst();

            if (authorizationViewModel.iaAuthorization.isOpened()) {
                var item = authorizationViewModel.iaAuthorization.item();
                if (item.$key !== selectedKey) {
                    if (confirm(locfmt('{ris,AuthorizationPage_AuthorizationInProgress}'))) {
                        authorizationViewModel.iaAuthorization.cancel();
                        ZillionRis.ImageViewer().clear();
                    } else {
                        if (!dataView.getItemByKey(item.$key)) {
                            // Item could not be found, reset the filters.
                            authorizationViewModel.reset();
                        }

                        if (dataView.getItemByKey(item.$key)) {
                            // Item found! Reset selection.
                            selection.clear();
                            selection.add(item.$key);
                            $('#AuthorizationGridView').virtualDataGrid('focusFirstSelection');
                        } else {
                            // Item still could not be found, suspend the active authorization.
                            authorizationViewModel.iaAuthorization.suspend();
                            ZillionRis.ImageViewer().clear();
                        }
                    }
                }
            } else {
                ZillionRis.ImageViewer().clear();
            }

            if (selectedKey) {
                var data = dataView.getItemByKey(selectedKey);
                if (data) {
                    ZillionRis.LoadPatientBanner(data.PatientID);
                    loadPatientHistory();
                }
            } else {
                clearPatientDetails();
                loadPatientHistory();
            }

        }

        function clearPatientDetails() {
            ZillionRis.LoadPatientBanner(0);
        }

        var worklist = 'currentuser';
        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);

        var check = 0, refreshDeff;

        function refresh() {
            var dataView = authorizationViewModel.gridOptions.dataView;
            var selectedFilter = authorizationViewModel.filters.selected();
            var startDate = null;
            if (selectedFilter && selectedFilter.startDate) {
                startDate = moment(selectedFilter.startDate).startOf('day').toDate();
            }
            var endDate = null;
            if (selectedFilter && selectedFilter.endDate) {
                endDate = moment(selectedFilter.endDate).endOf('day').toDate();
            }

            if (!refreshDeff) {
                refreshDeff = $.Deferred();
                refreshDeff.always(function() {
                    refreshDeff = null;
                });
            }

            var c = ++check;
            authorizationViewModel.isLoading(true);
            Modules.ContentProvider('module://dictation/data/speechstate-authorization', 'query', { Worklist: worklist, StartDate: startDate, EndDate: endDate/*, DateRange: dateRange */})
                .then(function(data) {
                    if (c === check) {
                        dataView.setItems(data, 'SpeechStateID');
                        dataView.refresh();
                        refreshDeff.resolve();
                    }
                }, function() {
                    if (c === check) {
                        refreshDeff.reject();
                    }
                }).always(function() {
                    if (c === check) {
                        authorizationViewModel.isLoading(false);
                    }
                });

                return refreshDeff;
        }

        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);

        commandManager.assign({
            'examination.send-to-housekeeping-aux': {
                execute: function(context) {
                    commandManager.execute('examination.send-to-housekeeping', {
                            Patient: context.Patient,
                            ExaminationDisplayName: context.ExaminationDisplayName,
                            ExaminationID: context.ExaminationID,
                            NotRefreshNeeded: true
                        })
                        .then(function() {
                            var authorizationModel = authorizationViewModel.iaAuthorization;
                            authorizationViewModel.refresh().then(function() {
                                if (authorizationModel.isOpened()) {
                                    authorizationModel.suspend();
                                }
                                authorizationModel.options.onReserved();
                            });

                        }, function() {
                            alert('Something went wrong while sending the dication to housekeeping, please try again.');
                        });
                }
            }
        });
        commandResources.assign({
            'examination.send-to-housekeeping-aux': { title: locfmt('{ris,CommandSendToHousekeeping}'), iconClass: { '16': 'zillion-ris workflow-icon broom' } }
        });

        function AuthorizationFilterViewModel() {
            this.originalName = '';
            this.name = new ko.observable();

            this.reporters = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.reporters.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
                queryParameters: { AssignmentPermission: 'Reporter' },
                projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
            });

            this.modalityTypes = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.modalityTypes.source = new ZillionRis.Filters.ObjectSourceLocations('modalityTypes', true);

            this.rooms = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.rooms.source = new ZillionRis.Filters.ObjectSourceLocations('rooms', true);

            this.requesterLocations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.requesterLocations.source = new ZillionRis.Filters.ObjectSourceLocations('requesterLocations', true);

            this.specialisations = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.specialisations.source = new ZillionRis.Filters.ObjectSourceLocations('specialisations', true);

            this.urgencies = new ZillionRis.Filters.ObjectSelectionViewModel();
            this.urgencies.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/urgencies', {
                projector: '{ id: ID, label: Name, value: Name }'
            });

            this.startDate = new ko.observable(null);
            this.endDate = new ko.observable(null);

            this.itemAdded = function(elem) {
                if (elem.nodeType === 1) {
                    $(elem).show('highlight', 'slow');
                }
            };
        }

        var filterEditor = new ZillionRis.FilterEditor();
        filterEditor.filterFactory = function() {
            return new AuthorizationFilterViewModel(filterEditor);
        };
        filterEditor.filterSave = function(a) {
            return {
                originalName: a.originalName,
                name: a.name(),

                reporters: a.reporters.list().qSelect('id'),
                modalityTypes: a.modalityTypes.list().qSelect('id'),
                rooms: a.rooms.list().qSelect('id'),
                requesterLocations: a.requesterLocations.list().qSelect('id'),
                specialisations: a.specialisations.list().qSelect('id'),
                urgencies: a.urgencies.list().qSelect('id'),
                startDate: a.startDate(),
                endDate: a.endDate()
            };
        };
        filterEditor.filterLoad = function(a, b) {
            a.originalName = b.originalName;
            a.name(b.name);

            a.reporters.set(b.reporters);
            a.modalityTypes.set(b.modalityTypes);
            a.rooms.set(b.rooms);
            a.requesterLocations.set(b.requesterLocations);
            a.specialisations.set(b.specialisations);
            a.urgencies.set(b.urgencies);

            a.startDate(b.startDate);
            a.endDate(b.endDate);
        };

        filterEditor.filterType = 'authorization-filter';
        filterEditor.notificationTitle = 'Authorization Work List Filter';
        filterEditor.subject = 'authorization';

        filterEditor.close = function() {
            $("#FilterDialog").pageSubNav('hide');
        };

        ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

        $("#FilterDialog").show().pageSubNav({
            close: function() { authorizationViewModel.loadFilters(); },
            open: function() {
                filterEditor.openFilterName = authorizationViewModel.filters.selectedID();
                filterEditor.load();
            }
        });
    });


    function createPatientHistoryVM() {
        var patientHistoryViewModel = new PatientHistoryViewModel();

        function createPatientHistoryController() {
            var patientHistoryActions = new ZillionParts.CommandList();
            with (patientHistoryActions) {
                if (window.permissions.hasFailsafePermission) {
                    add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
                }
                add('examination.open-memo').executeWith('{ HasMemo: HasMemo, ID: ExaminationID }');
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasOrderRequestForm }');
                add('protocol.open-protocol').executeWith('{examinationID: ExaminationID}').showWhen('HasProtocol');
                add('examination.open-report').executeWith('{ ExaminationID: ExaminationID, HasReport: HasReport, RegularDictationStatus: RegularDictationStatus }').showWhen(ZillionRis.ShowReportIcon);
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'ExaminationID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', commands: { manager: commandManager, resources: commandResources, list: patientHistoryActions }, dataType: 'commands', width: 140 },
                    { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'ScheduleDateTime', dataType: 'scheduled-date' },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'ExaminationTypeName', width: 200, minWidth: 100 },
                    { title: locfmt('{ris,FieldTechnician}'), fieldID: 'Technicians', width: 100 },
                    { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologists', width: 100 },
                    { title: locfmt('{ris,FieldOrderRequester}'), fieldID: 'ReferringPhysicianName', width: 160 },
                    { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'scheduled-date' },
                    { title: locfmt('{ris,FieldOrderNumber}'), fieldID: 'OrderNumber', width: 80 },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 100 },
                    { title: locfmt('{ris,FieldExaminationStatus}'), fieldID: 'StatusName', width: 80 },
                    { title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 80 },
                    { title: locfmt('{ris,FieldReferralType}'), fieldID: 'ReferralTypeName', width: 80 }
                ],
                sort: [
                    { "fieldID": "ScheduleDateTime", asc: true }
                ],
                gridOptions: {
                    onRowCreated: onRowCreated,
                    createEmptyDataItem: createEmptyDataItem
                }
            });

            function onRowCreated(item, data) {
                if (data.ExaminationID == selectedExaminationID) {
                    item.css({ fontWeight: 'bold' });
                }
            }

            var aa = gridController.create();

            function createEmptyDataItem() {
                var examinations = aa.dataView.getItems(true).length;
                if (examinations > 0) {
                    var message = locfmt('{ris,NoExaminationsFoundFilter}<br />{examinations}{ris,ExaminationsInTotal}<br /><a>{ris,General_ClearFilter}</a>', { examinations: examinations });

                    var $message = $('<span>' + message + '</span>');
                    $('a', $message).click(function() { patientHistoryViewModel.clearFilter(); });
                    return $message;
                } else {
                    return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                }
            }

            return aa;
        }

        

        $(function() {
            patientHistoryViewModel.gridOptions.selection.setMultiSelect(false);
            patientHistoryViewModel.gridSettingsStore.initialize('#PatientHistoryView', patientHistoryViewModel.gridOptions, 'patientHistory', 'patientHistory-worklist').loadSettings();
        });
        createPatientHistoryContextMenu();

        window.loadPatientHistory = loadPatient;

        ZillionRis.SiteEvents.subscribe('lazy-page-update', function() {
            loadPatient();
        });

        var historyCheck = 0;
        var selectedExaminationID = 0;

        

        function loadPatient() {
            if (!authorizationViewModel.patientHistoryVisible()) {
                return;
            }
            selectedExaminationID = 0;
            var dataView = patientHistoryViewModel.gridOptions.dataView;
            dataView.setItems([], 'ExaminationID');
            dataView.refresh();

            var key = authorizationViewModel.gridOptions.selection.getKeys().qFirst();
            if (key) {
                var item = authorizationViewModel.gridOptions.dataView.getItemByKey(key);
                if (item) {
                    var patientID = item.PatientID | 0;
                    selectedExaminationID = item.ExaminationID | 0;
                    patientHistoryViewModel.isLoading(true);

                    var c = ++historyCheck;
                    Modules.ContentProvider('module://workflow/data/examinations', 'query', { Source: 'urn:patient:' + patientID, ExcludeCancelled: true })
                    .then(function (data) {
                        if (c === historyCheck) {
                            dataView.setItems(data, 'ExaminationID');
                            dataView.refresh();
                        }
                    }, function (data) {
                        ris.notify.showError('Patient History Error', 'An error occurred while retrieving patient history.<br/><br/>Details:<br/>' + data);
                    }).always(function () {
                        if (c === historyCheck) {
                            patientHistoryViewModel.isLoading(false);
                        }
                    });
                }
            }
        }
        

        function createPatientHistoryContextMenu() {
            var configurationMenu = $('<input id="HistoryGridSetting" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"></input>')
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
                            loadPatient();
                        } else if (item.id == 'clear-filter') {
                            patientHistoryViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            patientHistoryViewModel.customizeView();
                        } else if (item.id == 'reset') {
                            patientHistoryViewModel.resetSettings();
                            patientHistoryViewModel.reset();
                        }
                    }
                });
            var find = $('#PatientHistoryPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function PatientHistoryViewModel() {
            var self = this;
            this.gridOptions = createPatientHistoryController();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();

            this.worklistTitle = new ko.observable();
            this.selectedItem = new ko.observable(null);
            this.isLoading = new ko.observable(false);

            this.reset = function() {
                this.gridSettingsStore.resetSettings();
            };
            this.refresh = function() {
                loadPatient();
            };
            this.customizeView = function() {
                $('#PatientHistoryView').customizeVirtualDataGrid();
            };

            this.resetSettings = function() {
                ZillionRis.UserSettings.set('patienthistory', 'settings', null);
            };

            this.customizeFilter = function() {
                $('#PatientHistoryView').pageSubNav('show');
            };

            this.clearFilter = function() {
                $('#PatientHistoryView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            };

            this.viewLastAccessedExaminations = function() {
                ZillionRis.LastAccessedShowSubNav();
            };

            this.gridOptions.dataView.onUpdated.subscribe(function () {
                var goo = locfmt('{ris,ExaminationsOverview_Title}') + ' (' + patientHistoryViewModel.gridOptions.dataView.getItems(false).length + '/' + patientHistoryViewModel.gridOptions.dataView.getItems(true).length + ')';
                //{
                //    shown: patientHistoryViewModel.gridOptions.dataView.getItems(false).length,
                //    total: patientHistoryViewModel.gridOptions.dataView.getItems(true).length
                //});
                patientHistoryViewModel.worklistTitle(goo);
            });
        }

        return patientHistoryViewModel;
    }


    function alwaysFalse() { return false; }

    function alwaysTrue() { return false; }

    function notImplemented() { throw new Error('Not implemented.'); }


    window.processStateUpdateAudio = function(viewModel, s, args) {
        var state = +args.state;
        var position = +args.position;
        var length = +args.length;

        viewModel.lastState = state;
        switch (state) {
        case APU_WAITING:
            viewModel.playPauseIcon("\uf04b");
            viewModel.stopCss('active');
            viewModel.playCss('');
            viewModel.pauseCss('');
            viewModel.rewindCss('');
            viewModel.forwardCss('');
            viewModel.positionBarClasses('inactive');
            break;
        case APU_PLAYING:
            viewModel.playPauseIcon("\uf04c");
            viewModel.stopCss('');
            viewModel.playCss('active');
            viewModel.pauseCss('');
            viewModel.rewindCss('');
            viewModel.forwardCss('');
            viewModel.positionBarClasses('active');
            break;
        case APU_PAUSED:
            viewModel.playPauseIcon("\uf04b");
            viewModel.stopCss('');
            viewModel.playCss('');
            viewModel.pauseCss('active');
            viewModel.rewindCss('');
            viewModel.forwardCss('');
            viewModel.positionBarClasses('inactive');
            break;
        case APU_STOPPED:
            viewModel.playPauseIcon("\uf04b");
            viewModel.stopCss('active');
            viewModel.playCss('');
            viewModel.pauseCss('');
            viewModel.rewindCss('');
            viewModel.forwardCss('');
            viewModel.positionBarClasses('stopped');
            break;
        case APU_REWINDING:
            viewModel.playPauseIcon("\uf04b");
            viewModel.stopCss('');
            viewModel.playCss('');
            viewModel.pauseCss('');
            viewModel.rewindCss('active');
            viewModel.forwardCss('');
            viewModel.positionBarClasses('');
            break;
        case APU_FORWARDING:
            viewModel.playPauseIcon("\uf04b");
            viewModel.stopCss('');
            viewModel.playCss('');
            viewModel.pauseCss('');
            viewModel.rewindCss('');
            viewModel.forwardCss('active');
            viewModel.positionBarClasses('');
            break;
        default:
            viewModel.playPauseIcon("\uf04b");
            viewModel.stopCss('');
            viewModel.playCss('');
            viewModel.pauseCss('');
            viewModel.rewindCss('');
            viewModel.forwardCss('');
            viewModel.positionBarClasses('');
            break;
        }

        viewModel.positionMs = position;
        viewModel.lengthMs = length;
        viewModel.position(msToTime(position) + ' / ' + msToTime(length));

        try {
            viewModel.positionBarCss({
                width: Math.min(100, Math.round(100 / (length) * (position))) + '%'
            });
        } catch (ex2) {
            viewModel.positionBarCss({
                width: 0
            });
        }
    };

    function msToTime(s) {

        function addZ(n) {
            return (n < 10 ? '0' : '') + n;
        }

        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;

        return addZ(hrs) + ':' + addZ(mins) + ':' + addZ(secs);
    }

})(jQuery);