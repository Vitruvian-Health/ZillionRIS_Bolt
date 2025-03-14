﻿(function ($) {
    var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
    var commandResources = new ZillionParts.CommandResources(ZillionRis.CommandResources);
    var iaEvent = new ZillionParts.Event();
    var transcriptionViewModel;

    window.defaultRecorderButtons = {
        play: function () { window.recorder.Play(); },
        stop: function () { window.recorder.Stop(); },
        pause: function () { window.recorder.Pause(); },
        forward: function () { window.recorder.Forward(); },
        rewind: function () { window.recorder.Rewind(); },

        PlayStopToggle: function () {
            var audioStatus = recorder.GetSpeechStatus();
            if (audioStatus === 1 || audioStatus === 6 || audioStatus === 9 || audioStatus === 10) {
                window.recorder.Pause();
            } else {
                window.recorder.Play();
            }
        },

        cancel: function () {
            /*executeCommand('CancelDictation');*/
        },
        Finish: function () {
        },
        Skip: function () {
            var selectedItem = transcriptionViewModel.selectedItem();
            if (selectedItem) {
                transcriptionViewModel.iaTranscription.skipDictation();
            }
        },
        Open: function () {
            var selectedItem = transcriptionViewModel.selectedItem();
            if (selectedItem) {
                transcriptionViewModel.iaTranscription.open(selectedItem);
            }
        }
    };
    window.recorderButtons = $.extend(true, {}, window.defaultRecorderButtons);

    $(window).on('beforeunload', function () {
        if (transcriptionViewModel.iaTranscription.isOpened()) {
            transcriptionViewModel.iaTranscription.cancel();
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

    iaEvent.subscribe(function (s, x) {
        if (x.Event === 'OnFinished') {
            setTimeout(function () {
                transcriptionViewModel.refresh();
            }, 500);
        }
    });

    $(function () {
        $.extend(true, window, {
            statusChangeCallback: function (s, args) {
                if (args.type === 'change-user') {
                    var keys = selection.getKeys();
                    if (keys) {
                        var data = dataView.getItemByKey(keys[0]);
                        current_speechID = data.SpeechStateID;
                    }
                    executeCommand('finish-transcription', current_speechID);
                } else {
                    refresh();
                }
            }
        });

        var visited = [];
        function filterVisited(items) {
            var filteredItems = items.except(visited, '$left.SpeechStateID == $right');
            if (filteredItems.length == 0) {
                // All items have been visited, reset the list.
                visited = [];
                return items;
            } else {
                // Filter out non existing items.
                visited = items.intersect(visited, '$left.SpeechStateID == $right').qSelect('SpeechStateID');
                return filteredItems;
            }
        }

        function SelectNextSpeechJob(selectedItem) {
            var currentUserID = window.currentUserID;
            var selectedKey = selection.getKeys()[0];
            visited.push(selectedKey);
            selectedItem = selectedItem || dataView.getItemByKey(selectedKey);

            // Filter down to valid items.
            var items = dataView
                .getItems()
                .qWhere(function (item) { return !item.HousekeepingID && (item.TypistID === currentUserID || item.TypistID === null || item.TypistID === 0); });

            items = filterVisited(items);

            if (selectedItem) {
                // Find next related speech job.
                var x = FindNextSpeechJobKey(selectedItem, items);
                if (x) {
                    visited.push(x);
                    return x;
                }
            }

            var y = items.qFirst();
            if (y && y.$key !== selectedKey) {
                visited.push(y.$key);
                return y.$key;
            }

            return false;

            function FindNextSpeechJobKey(baseItem, items2) {
                var current_orderID, current_patientID, current_speechID;
                current_orderID = baseItem.OrderID;
                current_patientID = baseItem.PatientID;
                current_speechID = baseItem.SpeechStateID;

                var item, i, ii = items2.length;
                for (i = 0; i < ii; i++) {
                    item = items2[i];
                    if (item.OrderID == current_orderID && item.SpeechStateID != current_speechID) {
                        return item.$key;
                    }
                }

                // Select the next speech job from the same patient.
                for (i = 0; i < ii; i++) {
                    item = items2[i];
                    if (item.PatientID == current_patientID && item.SpeechStateID != current_speechID) {
                        return item.$key;
                    }
                }

                return null;
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
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping-aux').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
            }
            with (examinationActionList) {
                if (window.permissions.hasFailsafePermission) {
                    add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
                }
                add('examination.housekeeping-state').showWhen('HousekeepingID');
                add('transcription.open').executeWith('SpeechStateID').hideWhen('HousekeepingID');
            }

            function openSpeechStateNow(speechStateID) {
                if (transcriptionViewModel.iaTranscription.isOpened()) {
                    transcriptionViewModel.iaTranscription.suspend().then(doOpenIA);
                } else {
                    doOpenIA();
                }

                function doOpenIA() {
                    selection.clear();

                    var itemByKey = dataView.getItemByKey(speechStateID);
                    if (itemByKey) {
                        selection.add(speechStateID);

                        transcriptionViewModel.iaTranscription.open(itemByKey);
                    }
                }
            }

            commandManager.assign({ 'transcription.open': openSpeechStateNow });
            commandResources.assign({ 'transcription.open': { title: locfmt('{ris,TranscriptionPage_StartTranscription}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'}} });

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'SpeechStateID',
                commandManager: commandManager,
                commandResources: commandResources,
                columns: [
                    { title: '', friendlyName: 'Context Menu', fieldID: 'context-menu', dataType: 'context-menu', commands: { list: examinationContextMenu, manager: commandManager, resources: commandResources} },
                    { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', renderText: false, commands: { manager: commandManager, resources: commandResources, list: examinationActionList }, dataType: 'commands', width: 43 },
                    { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'StartDateTime', dataType: 'scheduled-date' },
                    { title: locfmt('{ris,FieldDictationTimestamp}'), fieldID: 'SpeechStateCreationDate', width: 140, dataType: 'scheduled-date' },
                    { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 140 },
                    { title: locfmt('{ris,FieldPatientName}'), fieldID: 'Patient', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter', width: 200 },
                    { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 140 },
                    { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'Description', width: 120 },
                    { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', width: 80 },
                    { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologist', width: 120 },
                    { title: locfmt('{ris,FieldTypist}'), fieldID: 'Typist', width: 120 },
                    { title: locfmt('{ris,FieldModality}'), fieldID: 'ModalityName', width: 120 },
                    { title: locfmt('{ris,FieldLocation}'), fieldID: 'LocationName', width: 120 },
                    { title: locfmt('{ris,FieldDepartment}'), fieldID: 'DepartmentName', width: 120 },
                    { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' }
                ],
                sort: [
                    { "fieldID": "StartDateTime", asc: true },
                    { "fieldID": "SpeechStateCreationDate", asc: true }
                ],
                gridOptions: {
                    onRowCreated: onItemCreated,
                    onFilterCreated: function (filter) {
                        var customFilter = new ZillionParts.Condition();
                        customFilter.type = 'and';

                        customFilter.include(filter);
                        var currentFilter = transcriptionViewModel.filters.selected();
                        if (currentFilter) {
                            combineListFilter(customFilter, 'ModalityTypeIDs', currentFilter.modalityTypes, 'a');
                            combineListFilter(customFilter, 'RoomID', currentFilter.rooms);
                            combineListFilter(customFilter, 'RequestingLocationID', currentFilter.requesterLocations);
                            combineListFilter(customFilter, 'RequesterSpecialisationID', currentFilter.specialisations);
                            combineListFilter(customFilter, 'UrgencyID', currentFilter.urgencies);

                            combineListFilter(customFilter, 'RadiologistID', currentFilter.reporters);
                        }

                        // Work item type filter.
                        var digital = transcriptionViewModel.dictationTypeDigital();
                        var interActive = transcriptionViewModel.dictationTypeInterActive();
                        var other = transcriptionViewModel.dictationTypeOther();
                        if (digital || interActive || other) {
                            if (!digital) {
                                customFilter.exclude('DictationTypeID === "DIG"');
                            }
                            if (!interActive) {
                                customFilter.exclude('DictationTypeID === "INT"');
                            }
                            if (!other) {
                                customFilter.exclude('DictationTypeID !== "DIG" && DictationTypeID !== "INT"');
                            }
                        }
                        // Examination count filter.
                        var single = transcriptionViewModel.dictationSingleExam();
                        var multiple = transcriptionViewModel.dictationMultiExam();
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
                    createEmptyDataItem: function () {
                        var examinations = transcriptionViewModel.gridOptions.dataView.getItems(true).length;
                        if (examinations > 0) {
                            var foo = $('<span>' + locfmt('{ris,NoExaminationsFoundFilter}') + '<br />' + examinations + locfmt('{ris,ExaminationsInTotal}') + '<br /><a>' + locfmt('{ris,General_ClearFilter}') + '</a></span>');
                            $('a', foo).click(function () {
                                transcriptionViewModel.clearFilter();
                            });
                            return foo;
                        } else {
                            return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                        }
                    },
                    onSorting: function (sort) {
                        // Forced sorting:
                        sort = sort.filter(function(x) { return x.fieldID !== 'UrgencySortIndex'; });
                        sort = [{ "fieldID": "UrgencySortIndex", asc: false }].concat(sort);
                        return sort;
                    },
                    itemdblclick: function (e, args) {
                        openSpeechStateNow(args.item.$key);
                    }
                }
            });

            function onItemCreated($element, data) {
                ZillionRis.AddUrgencyClasses($element, data.UrgencyID);
                if (data.SpeechStatusID == 'PTR') {
                    $element.addClass('data-ignored');
                }
            }

            return gridController.create();
        }

        var gridOptions = createController();
        var dataView = gridOptions.dataView;
        var selection = gridOptions.selection;

        var transcriptionSelectionChangedTh = { delay: 500, callback: onTranscriptionSelectionChangedCore };
        var transcriptionSelectionChanged = throttleFunc(transcriptionSelectionChangedTh);
        selection.onChange.subscribe(transcriptionSelectionChanged);
        selection.setMultiSelect(false);


        transcriptionViewModel = new TranscriptionViewModel();
        transcriptionViewModel.selection = selection;
        transcriptionViewModel.filters.selected.subscribe(function () {
            $("#TranscriptionGridView").virtualDataGrid('updateFilter');
            refresh();
        });

        transcriptionViewModel.grid = $('#TranscriptionGridView');
        transcriptionViewModel.gridOptions = gridOptions;

        // Triggers grid filter:
        var updateGridFilter = function () {
            transcriptionViewModel.grid.virtualDataGrid('updateFilter');
            transcriptionViewModel.grid.virtualDataGrid('refresh');
        };
        transcriptionViewModel.dictationTypeDigital.subscribe(updateGridFilter);
        transcriptionViewModel.dictationTypeInterActive.subscribe(updateGridFilter);
        transcriptionViewModel.dictationTypeOther.subscribe(updateGridFilter);
        transcriptionViewModel.dictationSingleExam.subscribe(updateGridFilter);
        transcriptionViewModel.dictationMultiExam.subscribe(updateGridFilter);

        // Triggers layout:
        var updateLayout = function () {
            setTimeout(function () {
                ZillionParts.Fluids.Update();
            });
        };
        var updateView = function () {
            updateLayout();
            window.loadPatientHistory();
        };
        transcriptionViewModel.patientHistoryVisible.subscribe(updateView);
        transcriptionViewModel.iaTranscription.error.subscribe(updateLayout);
        transcriptionViewModel.iaTranscription.space.subscribe(updateLayout);

        (function () {
            var storageKey_Space = 'transcription.space';
            var storageKey_PatientHistory = 'transcription.patienthistory';
            // Use local storage for speed.
            var storedTranscriptionSpace = +(window.sessionStorage[storageKey_Space] || 1);
            transcriptionViewModel.iaTranscription.space(storedTranscriptionSpace);
            ZillionRis.UserSettings.get('transcription', 'space')
                .then(function (x) {
                    storedTranscriptionSpace = +(x || 1);
                    transcriptionViewModel.iaTranscription.space(storedTranscriptionSpace);
                }).always(function () {
                    transcriptionViewModel.iaTranscription.space.subscribe(function (x) {
                        window.sessionStorage[storageKey_Space] = x;
                        ZillionRis.UserSettings.set('transcription', 'space', x);
                    });
                });
            // Use local storage for speed.
            var patientHistoryVisible = +(window.sessionStorage[storageKey_PatientHistory] || 1);
            transcriptionViewModel.patientHistoryVisible(!!patientHistoryVisible);
            ZillionRis.UserSettings.get('transcription', 'patienthistory')
                .then(function (x) {
                    storedTranscriptionSpace = !!x;
                    transcriptionViewModel.patientHistoryVisible(storedTranscriptionSpace);
                }).always(function () {
                    transcriptionViewModel.patientHistoryVisible.subscribe(function (x) {
                        window.sessionStorage[storageKey_PatientHistory] = x ? 1 : 0;
                        ZillionRis.UserSettings.set('transcription', 'patienthistory', x ? 1 : 0);
                    });
                });
        })();
        clearPatientDetails();

        // Data bind.
        ko.applyBindings(transcriptionViewModel, $('#MainPanel')[0]);
        ZillionRis.WorkList.SelectionStore('#TranscriptionGridView', transcriptionViewModel.gridOptions, 'transcription.selection');

        transcriptionViewModel.gridSettingsStore.initialize('#TranscriptionGridView', transcriptionViewModel.gridOptions, 'transcription', 'transcription-worklist').loadSettings();

        createTranscriptionContextMenu();

        $(function () {
            transcriptionViewModel.loadSettings();
            transcriptionViewModel.loadFilters();
            transcriptionViewModel.refresh();
        });

        var refreshIntervalMs = window.pageConfig.RefreshIntervalMs;
        if (refreshIntervalMs) {
            // Sanity check.
            if (refreshIntervalMs < 15000) {
                refreshIntervalMs = 15000;
            }

            setInterval(function () {
                if (!transcriptionViewModel.iaTranscription.isOpened()) {
                    transcriptionViewModel.refresh();
                }
            }, refreshIntervalMs);
        }

        function createFilterFunc(filters) {
            return function (items) { return filters.filter(items); };
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

        setTimeout(function () {
            ConnectSpeechMike(handleButtonPressed);
        }, 2000);

        $(window).pageLoaded(function () {
            $('#TranscriptionEditor').shortcodes({ TemplateType: 'RPT' });
        });


        function TranscriptionViewModel() {
            var self = this;

            this.gridOptions = gridOptions;
            this.dataView = gridOptions.dataView;

            this.getPanelCss = function () {
                var cls = [];
                switch (self.iaTranscription.space()) {
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

            this.worklistTitle = ko.observable();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();
            this.selectedItem = ko.observable();

            this.hasItems = new ko.observable(false);
            this.dataView.onUpdated.subscribe(function () {
                self.hasItems(this.length > 0);

                self.worklistTitle(locfmt('{ris,TranscriptionPage_TranscriptionGridViewHeader}', { shown: self.dataView.getItems(false).length, total: self.dataView.getItems(true).length }));
            });

            this.isLoading = ko.observable(false);

            this.filters = new ZillionRis.FilterList();
            this.filters.filterType = 'transcription-filter';

            this.loadUserSettings = function () {
                gridSettingsStore.loadSettings();
            };
            this.resetUserSettings = function () {
                self.gridSettingsStore.resetSettings();
            };
            this.customizeView = function () {
                $('#TranscriptionGridView').customizeVirtualDataGrid();
            };
            this.clearFilter = function () {
                $('#TranscriptionGridView').virtualDataGrid('clearFilter');
                this.filters.selectedID(null);
                self.dictationTypeDigital(false);
                self.dictationTypeInterActive(false);
                self.dictationTypeOther(false);
                self.dictationSingleExam(false);
                self.dictationMultiExam(false);
                self.refresh();
            };

            this.refresh = function () {
                return refresh();
            };

            this.reset = function () {
                self.gridSettingsStore.resetSettings();
                this.filters.selectedID(null);
            };

            var hasLoaded = false;
            this.loadSettings = function () {
                ZillionRis.UserSettings.get('transcription', 'settings')
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
                ZillionRis.UserSettings.set('transcription', 'settings', {
                    filter: self.filters.selectedID()
                });
            };

            var update = ZillionParts.Delay(function () {
                if (self.isLoading() === false && hasLoaded == true) {
                    self.saveSettings();
                }
            }, 1000, true);
            this.filters.selected.subscribe(update);
            this.customizeFilter = function () {
                $('#FilterDialog').pageSubNav('show');
            };
            this.loadFilters = function () {
                this.filters.loadFilters();
            };

            /* Worklist Filters */
            this.dictationTypeDigital = ko.observable(false);
            this.dictationTypeDigitalCount = ko.observable(0);
            this.dictationTypeInterActive = ko.observable(false);
            this.dictationTypeInterActiveCount = ko.observable(0);
            this.dictationTypeOther = ko.observable(false);
            this.dictationTypeOtherCount = ko.observable(0);
            this.dictationSingleExam = ko.observable(false);
            this.dictationSingleExamCount = ko.observable(0);
            this.dictationMultiExam = ko.observable(false);
            this.dictationMultiExamCount = ko.observable(0);

            this.patientHistoryVisible = ko.observable(true);

            gridOptions.dataView.onUpdated.subscribe(function () {
                var aa = gridOptions.dataView.getItems(true);
                var digital = aa.qCount('DictationTypeID === "DIG"');
                var interActive = aa.qCount('DictationTypeID === "INT"');
                var other = aa.length - digital - interActive;

                var single = aa.qCount('WorkItemCount == 1');
                var multiple = aa.qCount('WorkItemCount > 1');

                self.dictationTypeDigitalCount(digital);
                self.dictationTypeInterActiveCount(interActive);
                self.dictationTypeOtherCount(other);
                self.dictationSingleExamCount(single);
                self.dictationMultiExamCount(multiple);

            });

            this.iaTranscription = new TranscriptionIAViewModel({
                onFinished: function () {
                    self.refresh();
                },
                onSuspended: function () {
                    self.refresh();
                },
                onCancelled: function (item) {
                    Modules.Task('module://dictation/task/transcription-reservation', 'cancel', { SpeechStateID: item.SpeechStateID })
                        .then(function (x) {
                        }, function () {
                            ris.notify.showInformation('Reservation could not be cancelled.');
                        }).always(function () {
                            self.refresh();
                        });
                },
                onReserved: function () {
                    var x = SelectNextSpeechJob();
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
                        var nextJobID = SelectNextSpeechJob(selectedItem);

                        if (!nextJobID) {
                            alert("There's no new dictation available.");
                            Loading.Hide();
                        } else {
                            visitedKeys.push(nextJobID);

                            var item = dataView.getItemByKey(nextJobID);
                            Modules.Task('module://dictation/task/transcription-reservation', 'request', { SpeechStateID: item.SpeechStateID })
                                .then(function (data) {
                                    if (data.Success) {
                                        selection.clear();
                                        selection.add(nextJobID);
                                        $('#TranscriptionGridView').virtualDataGrid('focusFirstSelection');

                                        Loading.Hide();
                                        setTimeout(function () {
                                            self.iaTranscription.open(item);
                                        }, 500);
                                    } else {
                                        next();
                                    }
                                }, function () {
                                    Loading.Hide();
                                    ris.notify.showInformation('Oops.');
                                });

                        }
                    }
                }
            });
        }

        function showTranscriptionTaken(Description, ReservedByName) {
            $(locfmt('<div>{ris,TranscriptionPage_TranscriptionTakenText}</div>', { description: '<span class="text-emphasis">' + Description + '</span>', reservedByName: '<span class="text-emphasis">' + ReservedByName + '</span>' })).dialog({
                resizable: false,
                title: locfmt("{ris,TranscriptionPage_TranscriptionTaken}"),
                width: 375,
                modal: true,
                buttons: {
                    "Ok": function () {
                        $(this).dialog("close");
                    }
                }
            });
        }


        function TranscriptionIAViewModel(options) {
            var fallbackController = new TranscriptionTextAudioController(this);
            var controllers = {
                INT: null, // Filled in by open.
                DIG: new TranscriptionTextAudioController(this)
            };

            function controller(item) {
                var x = controllers[item.DictationTypeID];
                if (x) {
                    return x;
                }

                return fallbackController;
            }


            var self = this;

            this.options = options;
            this.speechStateInfo = ko.observable(null);
            this.item = ko.observable(null);
            this.isOpened = ko.observable(false);

            this.text = ko.observable(null);
            this.showText = ko.observable(false);

            this.error = ko.observable(null);
            this.errorHousekeepingItem = ko.observable(null);
            this.clearError = function () {
                self.error(null);
                self.errorHousekeepingItem(null);
            };
            this.showErrorHousekeeping = window.permissions.hasSendToHousekeepingPermission;
            this.errorHousekeeping = function () {
                var error = self.error();
                var item = self.errorHousekeepingItem();
                if (item) {
                    commandManager.execute('examination.send-to-housekeeping', {
                        Patient: item.Patient,
                        ExaminationDisplayName: item.Description,
                        ExaminationID: item.ExaminationID,
                        Text: 'System: ' + error,
                        NotRefreshNeeded: true
                    }).then(function () {
                        self.clearError();
                        var transcriptionModel = transcriptionViewModel.iaTranscription;
                        transcriptionViewModel.refresh().then(function () {
                            if (transcriptionModel.isOpened()) {
                                transcriptionModel.cancel();
                            }
                            transcriptionModel.options.onReserved();
                        });
                    }, function () {
                        alert('Something went wrong while sending the dication to housekeeping, please try again.');
                    });
                }
            };

            this.controllerCall = function (callback) {
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
            this.smallSpace = function () {
                this.space(1);
            };
            this.mediumSpace = function () {
                this.space(2);
            };
            this.largeSpace = function () {
                this.space(3);
            };

            this.showText.subscribe(function () {
                setTimeout(function () {
                    ZillionParts.Fluids.Update();
                });
            });

            this.resetTextInput = function () {
                self.text(null);
                self.showText(false);
                setTimeout(function () { ZillionParts.Fluids.Update(); });
            };

            this.isOpened.subscribe(function () {
                console.log('isOpened: ' + self.isOpened());
                if (self.isOpened()) {
                    window.recorderButtons = $.extend(true, {}, window.defaultRecorderButtons, {
                        play: function () { self.play(); },
                        PlayStopToggle: function () { self.play(); },
                        pause: function () { self.pause(); },
                        stop: function () { self.stop(); },
                        rewind: function () { self.rewind(); },
                        forward: function () { self.forward(); },
                        cancel: function () { self.cancel(); },
                        Finish: function () { self.nextDictation(); }
                    });
                } else {
                    window.recorderButtons = $.extend(true, {}, window.defaultRecorderButtons);
                }
            });

            this.nextDictation = function () {
                if (self.isOpened()) {
                    self.finish()
                        .then(function () {
                            options.OnNextDictation();
                        });
                } else {
                    refresh().always(function () {
                        options.OnNextDictation();
                    });
                }
            };
            this.skipDictation = function () {
                if (self.isOpened()) {
                    self.cancel()
                        .then(function () {
                            options.OnNextDictation();
                        });
                } else {
                    refresh().always(function () {
                        options.OnNextDictation();
                    });
                }
            };

            this.isLoading = ko.observable(false);
            this.open = function (item) {
                if (self.isLoading()) {
                    return $.Deferred().reject();
                }

                self.isLoading(true);
                self.resetState();
                self.clearError();
                self.speechStateInfo(null);

                if (item.DictationTypeID === 'TXT') {
                    self.error(locfmt('{ris,Transcription_TextDictationAppearedError}'));
                    self.errorHousekeepingItem(item);
                    self.isLoading(false);
                    return $.Deferred().reject();
                }

                if (item.HousekeepingID) {
                    self.error('Examination is currently in housekeeping.');
                    options.onReserved();
                    self.isLoading(false);

                    return $.Deferred().reject();
                }

                {
                    var d = $.Deferred();
                    d.always(function () {
                        self.isLoading(false);
                    });

                    var canAudio = item.DictationTypeID === 'DIG';
                    var canZillionSpeech = item.DictationTypeID === 'INT';

                    if (canZillionSpeech) {
                        console.log('Transcription: Detecting Zillion Speech installation.');
                        ConnectController("InterActive").then(function () {
                            if (ScriptServer.ScriptVersion >= 2) {
                                if (!controllers['INT']) {
                                    console.log('Transcription: New Zillion Speech found, use InterActiveController.');
                                    controllers['INT'] = new TranscriptionInterActiveController(self);
                                }
                            } else {
                                if (!controllers['INT']) {
                                    console.log('Transcription: Old Zillion Speech found, use TextAudioController.');
                                    controllers['INT'] = new TranscriptionTextAudioController(self);
                                }
                            }
                        }, function () {
                            if (!controllers['INT']) {
                                console.log('Transcription: No Zillion Speech found, use TextAudioController.');
                                controllers['INT'] = new TranscriptionTextAudioController(self);
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
                            .then(function (x) {
                                self.speechStateInfo({
                                    Patient: x.PatientName,
                                    Studies: x.Studies
                                });
                            }, function () {
                                self.speechStateInfo({
                                    Patient: 'N/A',
                                    Studies: 'N/A'
                                });
                            }).always(function () {
                                Modules.Task('module://dictation/task/transcription-reservation', 'request', { SpeechStateID: item.SpeechStateID })
                                    .then(function (x) {
                                        if (x.Success) {
                                            self.positionBarCss({ width: '0%' });
                                            self.positionBarClasses('');

                                            self.showText(false);
                                            self.text(null);

                                            var ctrl = controller(item);
                                            var open = ctrl.open(item, { TranscriptionToken: x.TranscriptionToken });
                                            open.then(function () {
                                                self.item(item);
                                                self.isOpened(true);

                                                if (ctrl.showTextInput()) {
                                                    self.showText(true);
                                                    self.text(ctrl.getText());
                                                }

                                                openCoreDef.resolve();
                                            }, function () {
                                                ris.notify.showError(locfmt('{ris,TranscriptionPage_StartTranscription}'), 'Failed to open the controller.');
                                                self.speechStateInfo(null);
                                                openCoreDef.reject();
                                            }).always(function () {
                                                Loading.Hide();
                                            });
                                            return open;
                                        } else {
                                            openCoreDef.reject();
                                            showTranscriptionTaken(item.Description, x.ReservedByName);
                                            Loading.Hide();
                                            //when the item is already taken by another typist, we need to set the speechstate info to null
                                            self.speechStateInfo(null);
                                            options.onReserved(item);
                                        }
                                    }, function (error) {
                                        d.reject();
                                        if (error.ReservedByName) {
                                            showTranscriptionTaken(item.Description, error.ReservedByName);
                                        } else {
                                            ris.notify.showError(locfmt('{ris,TranscriptionPage_StartTranscription}'), locfmt('{ris,UnableToLockExamination}'));
                                        }
                                        Loading.Hide();
                                        options.onReserved(item);
                                    });
                            });
                    } //end of opencore
                }
            };
            this.cancel = function () {
                var item = self.item();
                if (item) {
                    var ctrl = controller(item);
                    return ctrl.cancel()
                        .then(function () {
                            self.isOpened(false);
                            self.speechStateInfo(null);
                            self.resetTextInput();
                            options.onCancelled(self.item());

                        });
                } else {
                    return $.Deferred().reject().promise();
                }
            };
            this.suspend = function () {
                var item = self.item();
                if (item) {
                    var ctrl = controller(item);
                    return ctrl.suspend();
                } else {
                    return $.Deferred().reject().promise();
                }
            };
            this.finish = function () {
                var item = self.item();
                if (item) {
                    var ctrl = controller(item), d = $.Deferred();

                    // stop the audio before the popup, clear the images
                    self.stop();
                    ZillionRis.ImageViewer().clear();

                    if (ctrl.viewModel && !ctrl.viewModel.text()) {
                        ctrl.viewModel.error("The report text can't be empty.");
                        ctrl.viewModel.errorHousekeepingItem(self.item);
                        d.reject();
                        return d;
                    }

                    popupSendToAuthorizer().then(finishTranscriptionController, function () { d.reject(); });

                    return d;

                    function assignCurrentUserAsAuthorizer() {
                        var def = $.Deferred();
                        Modules.Task('module://dictation/task/send-to-authorizer', 'request', { Source: 'urn:speechstate:' + item.SpeechStateID })
                            .then(function (model) {
                                model.UserID = window.currentUserID;

                                Modules.Task('module://dictation/task/send-to-authorizer', 'process', model).then(function () {
                                    def.resolve();
                                }, function (err) {
                                    def.reject(err);
                                });
                            }, function (err) {
                                def.reject(err);
                            });
                        return def;
                    }

                    function popupSendToAuthorizer() {
                        return Modules.Activity('module://dictation/view/send-to-authorizer', {
                            requires: ['ris.dictation'],
                            launchOptions: { Source: 'urn:speechstate:' + item.SpeechStateID }
                        });
                    }

                    function finishTranscriptionController() {
                        Loading.Show(locfmt('{ris,TranscriptionPage_CompletingTranscription}'), 0);
                        ctrl.finish().fail(function (ex) {
                            ex && ex.error
                                    ? ris.notify.showError(locfmt('{ris,TranscriptionPage_FinishTranscription}'), locfmt('{ris,TranscriptionPage_FinishFailDetails}', ex.message))
                                    : ris.notify.showError(locfmt('{ris,TranscriptionPage_FinishTranscription}'), locfmt('{ris,TranscriptionPage_FinishFail}'));
                        }).always(function () {
                            Loading.Hide();
                            self.speechStateInfo(null);
                        }).then(function () {
                            d.resolve();
                        }, function () {
                            d.reject();
                        });
                    }
                } else {
                    return $.Deferred().reject().promise();
                }
            };

            this.playPauseIcon = ko.observable("\uf04b");

            this.stopCss = ko.observable();
            this.playCss = ko.observable();
            this.pauseCss = ko.observable();
            this.rewindCss = ko.observable();
            this.forwardCss = ko.observable();

            this.stop = function () {
                var ctrl = controller(self.item());
                if (ctrl) {
                    ctrl.stop();
                }
            };
            this.play = function () {
                var ctrl = controller(self.item());
                if (ctrl) {
                    ctrl.play();
                }
            };
            this.pause = function () {
                var ctrl = controller(self.item());
                if (ctrl) {
                    ctrl.pause();
                }
            };
            this.rewind = function () {
                var ctrl = controller(self.item());
                if (ctrl) {
                    ctrl.rewind();
                    $(window).one('mouseup', function () {
                        ctrl.pause();
                    });
                }
            };
            this.forward = function () {
                var ctrl = controller(self.item());
                if (ctrl) {
                    ctrl.forward();
                    $(window).one('mouseup', function () {
                        ctrl.pause();
                    });
                }
            };

            this.position = ko.observable('Waiting');
            this.positionBarCss = ko.observable({ width: 0 });
            this.positionBarClasses = ko.observable('');
            this.positionBarClick = function (s, ev) {
                var nodeListOf = $(ev.currentTarget);
                var w = nodeListOf.width();
                var posX = nodeListOf.offset().left,
                    posY = nodeListOf.offset().top;
                var x = ev.pageX - posX,
                    y = ev.pageY - posY;

                var ctrl = controller(self.item());
                if (ctrl) {
                    var number = (1 / w * x);
                    var target = self.lengthMs * number;
                    ctrl.seek(target | 0);
                }
            };

            this.resetState = function () {
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
                    onSelect: function (item) {
                        if (item.id == 'refresh') {
                            transcriptionViewModel.refresh();
                        } else if (item.id == 'clear-filter') {
                            transcriptionViewModel.clearFilter();
                        } else if (item.id == 'configure') {
                            transcriptionViewModel.customizeView();
                        } else if (item.id == 'reset') {
                            transcriptionViewModel.resetUserSettings();
                            transcriptionViewModel.reset();
                        }
                    }
                });
            var find = $('#TranscriptionGridPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        function onTranscriptionSelectionChangedCore() {
            var selectedKey = selection.getKeys().qFirst();

            if (transcriptionViewModel.iaTranscription.isOpened()) {
                var item = transcriptionViewModel.iaTranscription.item();
                if (item.$key !== selectedKey) {
                    if (confirm(locfmt('{ris,TranscriptionPage_TranscriptionInProgress}'))) {
                        transcriptionViewModel.iaTranscription.cancel();
                        ZillionRis.ImageViewer().clear();
                    } else {
                        if (!dataView.getItemByKey(item.$key)) {
                            // Item could not be found, reset the filters.
                            transcriptionViewModel.reset();
                        }

                        if (dataView.getItemByKey(item.$key)) {
                            // Item found! Reset selection.
                            selection.clear();
                            selection.add(item.$key);
                            $('#TranscriptionGridView').virtualDataGrid('focusFirstSelection');
                        } else {
                            // Item still could not be found, suspend the active transcription.
                            transcriptionViewModel.iaTranscription.suspend();
                            ZillionRis.ImageViewer().clear();
                        }
                    }
                }
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

        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);

        var check = 0;

        function refresh() {
            var d = $.Deferred();
            var worklistAjax = new ZillionRis.SingleAjax();

            var selectedFilter = transcriptionViewModel.filters.selected();
            var startDate = null;
            if (selectedFilter && selectedFilter.startDate) {
                startDate = moment(selectedFilter.startDate).startOf('day').toDate();
            }
            var endDate = null;
            if (selectedFilter && selectedFilter.endDate) {
                endDate = moment(selectedFilter.endDate).endOf('day').toDate();
            }

            var retryCount = 0;
            var c = ++check;
            transcriptionViewModel.isLoading(true);
            Modules.ContentProvider('module://dictation/data/speechstate-transcription', 'query', { StartDate: startDate, EndDate: endDate })
                .then(function (data) {
                    if (c === check) {
                        dataView.setItems(data, 'SpeechStateID');
                        dataView.refresh();
                        d.resolve();
                    }
                }, function () {
                    if (c === check) {
                        d.reject();
                    }
                }).always(function () {
                    if (c === check) {
                        transcriptionViewModel.isLoading(false);
                    }
                });

            return d;
        }

        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);

        commandManager.assign({
            'examination.send-to-housekeeping-aux': {
                execute: function (context) {
                    commandManager.execute('examination.send-to-housekeeping', {
                        Patient: context.Patient,
                        ExaminationDisplayName: context.ExaminationDisplayName,
                        ExaminationID: context.ExaminationID,
                        NotRefreshNeeded: true
                    })
                    .then(function () {
                        var transcriptionModel = transcriptionViewModel.iaTranscription;
                        transcriptionViewModel.refresh().then(function () {
                            if (transcriptionModel.isOpened()) {
                                transcriptionModel.suspend();
                            }
                            transcriptionModel.options.onReserved();
                        });

                    }, function () {
                        alert('Something went wrong while sending the dication to housekeeping, please try again.');
                    });
                }
            }
        });
        commandResources.assign({
            'examination.send-to-housekeeping-aux': { title: locfmt('{ris,CommandSendToHousekeeping}'), iconClass: { '16': 'zillion-ris workflow-icon broom'} },
        });

        function TranscriptionFilterViewModel() {
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

            this.itemAdded = function (elem) {
                if (elem.nodeType === 1) {
                    $(elem).show('highlight', 'slow');
                }
            };
        }

        var filterEditor = new ZillionRis.FilterEditor();
        filterEditor.filterFactory = function () {
            return new TranscriptionFilterViewModel(filterEditor);
        };
        filterEditor.filterSave = function (a) {
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
        filterEditor.filterLoad = function (a, b) {
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

        filterEditor.filterType = 'transcription-filter';
        filterEditor.notificationTitle = 'Transcription Work List Filter';
        filterEditor.subject = 'transcription';

        filterEditor.close = function () {
            $("#FilterDialog").pageSubNav('hide');
        };

        ko.applyBindings(filterEditor, $('#FilterDialog')[0]);

        $("#FilterDialog").show().pageSubNav({
            close: function () { transcriptionViewModel.loadFilters(); },
            open: function () {
                filterEditor.openFilterName = transcriptionViewModel.filters.selectedID();
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
                add('order.stored-document').executeWith('{ OrderNumber: OrderNumber, HasStoredDocument: HasStoredDocument }');
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
                    $('a', $message).click(function () { patientHistoryViewModel.clearFilter(); });
                    return $message;
                } else {
                    return $('<span>' + locfmt('{ris,NoExaminationsFound}') + '</span>');
                }
            }

            return aa;
        }

        $(function () {
            patientHistoryViewModel.gridOptions.selection.setMultiSelect(false);
            patientHistoryViewModel.gridSettingsStore.initialize('#PatientHistoryView', patientHistoryViewModel.gridOptions, 'patientHistory', 'patientHistory-worklist').loadSettings();
        });
        createPatientHistoryContextMenu();

        window.loadPatientHistory = loadPatient;

        ZillionRis.SiteEvents.subscribe('lazy-page-update', function () {
            loadPatient();
        });

        var historyCheck = 0;
        var selectedExaminationID = 0;

        function loadPatient() {
            if (!transcriptionViewModel.patientHistoryVisible()) {
                return;
            }
                
            selectedExaminationID = 0;
            var dataView = patientHistoryViewModel.gridOptions.dataView;
            dataView.setItems([], 'ExaminationID');
            dataView.refresh();

            var key = transcriptionViewModel.gridOptions.selection.getKeys().qFirst();
            if (key) {
                var item = transcriptionViewModel.gridOptions.dataView.getItemByKey(key);
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
            var configurationMenu = $('<input id="PatientHistoryGridSetting" type="button" class="ui-custom-button command-button ui-link group-panel-config-icon"></input>')
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

            this.selectedItem = new ko.observable(null);
            this.isLoading = new ko.observable(false);

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
            };
            this.refresh = function () {
                loadPatient();
            };
            this.customizeView = function () {
                $('#PatientHistoryView').customizeVirtualDataGrid();
            };

            this.resetSettings = function () {
                ZillionRis.UserSettings.set('patienthistory', 'settings', null);
            };

            this.customizeFilter = function () {
                $('#PatientHistoryView').pageSubNav('show');
            };

            this.clearFilter = function () {
                $('#PatientHistoryView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            };

            this.viewLastAccessedExaminations = function () {
                ZillionRis.LastAccessedShowSubNav();
            };
        }

        return patientHistoryViewModel;
    }


    function alwaysFalse() { return false; }

    function alwaysTrue() { return false; }

    function notImplemented() { throw new Error('Not implemented.'); }


    window.processStateUpdateAudio = function (viewModel, s, args) {
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