(function ($) {

    var dictationOverviewViewModel;

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
        },
        Finish: function() {
        },
        Skip: function() {
        },
        Open: function() {
            var selectedItem = dictationOverviewViewModel.selectedItem();
            if (selectedItem) {
                dictationOverviewViewModel.iaTranscription.open(selectedItem);
            }
        }
    };

    window.recorderButtons = $.extend(true, {}, window.defaultRecorderButtons);

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

    $(function () {

        $.extend(true, window, {
            statusChangeCallback: function () { refresh(); }
        });

        var commandManager = new ZillionParts.CommandManager(ZillionRis.CommandManager);
        var commandResources = new ZillionParts.CommandResources();

        // Register Commands.        
        ZillionRis.Commands.RegisterResources(commandResources);

        // Register Resources.
        var dictationoverview = {
            'dictationoverview.change-user': { title: locfmt('{ris,CommandChangeUser}'), iconClass: { '16': 'zillion-ris workflow-icon send-to'} },            
        };
        commandResources.assign(dictationoverview);

        function createController() {
            var dictationOverviewMenu = new ZillionParts.CommandList();
            with (dictationOverviewMenu) {
                add('speechstate.change-speech-state').executeWith('SpeechStateID').hideWhen('(SpeechStatusID == "CAN" || SpeechStatusID == "CAU")');
                add('speechstate.cancel-speech-state').executeWith('SpeechStateID').showWhen('(SpeechStatusID == "PTR" || SpeechStatusID == "PAU")');
                add('dictationoverview.change-user').executeWith(' { SpeechStateID: SpeechStateID }').showWhen('(SpeechStatusID == "CTR")');
                if (window.permissions.hasSendToHousekeepingPermission) {
                    add('examination.send-to-housekeeping').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID }').hideWhen('HousekeepingID');
                    add('examination.remove-from-housekeeping').executeWith('{ Patient: Patient, ExaminationDisplayName: Description, ExaminationID: ExaminationID, HousekeepingID: HousekeepingID }').showWhen('HousekeepingID');
                }
            }

            var dictationOverviewActions = new ZillionParts.CommandList();
            with (dictationOverviewActions) {
                if (window.permissions.hasFailsafePermission) {
                    add('examination.open-failsafe').showWhen('HasUnhandledFailsafe');
                }
                add('examination.housekeeping-state').showWhen('HousekeepingID');
            }

            var gridController = new ZillionRis.WorkList.Controller({
                keyField: 'WorkItemID',
                commandManager: commandManager,
                commandResources: commandResources,
                contextMenuList: dictationOverviewMenu,
                columns: [
                { title: locfmt('{ris,FieldActions}'), fieldID: 'Actions', renderText: false, commands: { manager: commandManager, resources: commandResources, list: dictationOverviewActions }, dataType: 'commands', width: 60 },
                { title: locfmt('{ris,FieldScheduleDate}'), fieldID: 'StartDateTime', dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldDictationTimestamp}'), fieldID: 'SpeechStateCreationDate', width: 200, dataType: 'scheduled-date' },
                { title: locfmt('{ris,FieldPatientNumber}'), fieldID: 'PatientNumber', width: 140 },
                { title: locfmt('{ris,FieldSpeechStatus}'), fieldID: 'SpeechStatusName', width: 200 },
                {
                    title: locfmt('{ris,FieldPatientName}'), fieldID: 'Patient', filterFieldID: 'PatientNameFilter', sortFieldID: 'PatientNameFilter',
                    dataType: window.permissions.hasPatientContactInfoPermission ? 'contact' : null, contactID: 'PatientID', width: 200
                },
                { title: locfmt('{ris,FieldAccessionNumber}'), fieldID: 'AccessionNumber', width: 140 },
                { title: locfmt('{ris,FieldExaminationType}'), fieldID: 'Description', width: 120 },
                { title: locfmt('{ris,FieldUrgency}'), fieldID: 'UrgencyName', width: 80 },
                { title: locfmt('{ris,FieldRadiologist}'), fieldID: 'Radiologist', width: 120 },
                { title: locfmt('{ris,FieldIntendedRadiologist}'), fieldID: 'IntendedReporter' },
                { title: locfmt('{ris,FieldTypist}'), fieldID: 'Typist' },
                { title: locfmt('{ris,FieldAuthoriser}'), fieldID: 'Authoriser' },
                { title: locfmt('{ris,FieldRequestDate}'), fieldID: 'DateOfRequest', dataType: 'date-of-birth' }
            ],
                sort: [
                { "fieldID": "PatientNumber", asc: true }
            ],
                gridOptions: {
                    onRowCreated: onItemCreated,
                    onSorting: function (sort) {
                        // Forced sorting:
                        sort = sort.filter(function(x) { return x.fieldID !== 'UrgencySortIndex'; });
                        sort = [{ "fieldID": "UrgencySortIndex", asc: false }].concat(sort);
                        return sort;
                    }
                }

            });

            return gridController.create();
        }

        function onItemCreated($element, data) {
                ZillionRis.AddUrgencyClasses($element, data.UrgencyID);
        }

        var gridOptions = createController();
        var dataView = gridOptions.dataView;
        var selection = gridOptions.selection;

        var dictationSelectionChanged = ZillionParts.Delay(onDictationSelectionChanged, 100);
        selection.onChange.subscribe(dictationSelectionChanged);
        selection.setMultiSelect(false);

        var refreshTimer = new ris.intervalTimer({ delay: 10 * 60000, onTick: refresh });
        refreshTimer.start();

        dictationOverviewViewModel = new DictationOverviewViewModel();

        $('#PatientDetailsPanel').groupPanel();

        dictationOverviewViewModel.grid = $('#DictationOverviewGridView');
        dictationOverviewViewModel.gridOptions = gridOptions;
        

        (function() {
            var storageKey_Space = 'dictationOverview.space';
            var storageKey_DisableAudio = 'dictationOverview.disableAudio';
            // Use local storage for speed.
            var storedTranscriptionSpace = +(window.sessionStorage[storageKey_Space] || 1);
            dictationOverviewViewModel.iaTranscription.space(storedTranscriptionSpace);
            ZillionRis.UserSettings.get('dictationOverview', 'space')
                .then(function(x) {
                    if (x !== undefined) {
                        storedTranscriptionSpace = +(x || 1);
                        dictationOverviewViewModel.iaTranscription.space(storedTranscriptionSpace);
                    }
                }).always(function() {
                    dictationOverviewViewModel.iaTranscription.space.subscribe(function(x) {
                        window.sessionStorage[storageKey_Space] = x;
                        ZillionRis.UserSettings.set('dictationOverview', 'space', x);
                    });
                });
            
            // Use local storage for speed.
            var disableAudio = +(window.sessionStorage[storageKey_DisableAudio] || 0);
            dictationOverviewViewModel.disableAudio(!!disableAudio);
            ZillionRis.UserSettings.get('dictationOverview', 'disableAudio')
                .then(function(x) {
                    if (x !== undefined) {
                        storedTranscriptionSpace = !!x;
                        dictationOverviewViewModel.disableAudio(storedTranscriptionSpace);
                    }
                }).always(function() {
                    dictationOverviewViewModel.disableAudio.subscribe(function(x) {
                        window.sessionStorage[storageKey_DisableAudio] = x ? 1 : 0;
                        ZillionRis.UserSettings.set('dictationOverview', 'disableAudio', x ? 1 : 0);
                    });
                });
        })();

        clearPatientAndExaminationDetails();

        // Data bind.
        ko.applyBindings(dictationOverviewViewModel, $('#MainPanel')[0]);

        ZillionRis.WorkList.SelectionStore('#DictationOverviewGridView', dictationOverviewViewModel.gridOptions, 'dictationoverview.selection');

        dictationOverviewViewModel.gridSettingsStore.initialize('#DictationOverviewGridView', dictationOverviewViewModel.gridOptions, 'dictationoverview', 'dictationoverview-worklist').loadSettings();

        ZillionParts.GridView.Behaviors.AutoSelectSingleRow({
            dataView: dataView,
            selection: selection,
            gridView: '#DictationOverviewGridView'
        });

        createDictationOverviewContextMenu();

        $(window).resize(layout).resize();

        dictationOverviewViewModel.refresh();

        function layout() {
            var foo = $(window).height() - $('#DocumentHeader').height() - 300;
            $('#TranscriptionGridPanel .ui-group-panel-content').height(foo);
            $('#DictationOverviewGridView').height(foo);
            $('#DictationOverviewGridView').virtualDataGrid('refresh');
        }

        setTimeout(function() {
            ConnectSpeechMike(handleButtonPressed);
        }, 2000);

        function DictationOverviewViewModel() {
            var self = this;

            this.gridOptions = gridOptions;
            this.dataView = gridOptions.dataView;
            
            this.worklistTitle = ko.observable();
            this.gridSettingsStore = new ZillionRis.WorkList.SettingsStore();
            this.selectedItem = ko.observable();

            this.hasItems = new ko.observable(false);
            this.dataView.onUpdated.subscribe(function () {
                self.hasItems(this.length > 0);
                self.worklistTitle(locfmt('{ris,DictationOverview_Header}', { shown: self.dataView.getItems(false).length, total: self.dataView.getItems(true).length }));
            });

            this.isLoading = ko.observable(false);

            this.loadUserSettings = function () {
                this.gridSettingsStore.loadSettings();
            };
            this.resetUserSettings = function () {
                this.gridSettingsStore.resetSettings();
            };
            this.customize = function () {
                $('#DictationOverviewGridView').customizeVirtualDataGrid();
            };

            this.refresh = function () {
                refresh();
            };

            this.reset = function () {
                this.gridSettingsStore.resetSettings();
            };

            this.clearFilter = function (){
                $('#DictationOverviewGridView').virtualDataGrid('clearFilter').virtualDataGrid('updateFilter');
            };

            this.getPanelCss = function() {
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

            this.disableAudio = ko.observable(true);

            this.iaTranscription = new AuthorizationProcessViewModel({
                Owner: self
            });
        }

        function AuthorizationProcessViewModel(options) {
            
            var self = this;

            self.disableAudio = function() {
                return options.Owner.disableAudio();
            };
            this.options = options;
            this.speechStateInfo = ko.observable(null);
            this.item = ko.observable(null);

            this.text = ko.observable(null);
            this.showText = ko.observable(false);
            this.hasAudio = ko.observable(false);
            this.isAudioDisabled = ko.observable(false);

            this.audioController = new DictationOverviewController(this);

            this.error = ko.observable(null);
            this.clearError = function() {
                self.error(null);
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
            
            this.isLoading = ko.observable(false);
            this.open = function (item) {
                if (self.isLoading()) {
                    return $.Deferred().reject();
                }

                self.isLoading(true);

                self.clearError();
                self.speechStateInfo(null);

                var d = $.Deferred();
                d.always(function() {
                    self.isLoading(false);
                });

                Loading.Show('Initializing<br/>One moment please ...');
                Loading.Show('Opening dictation<br/>One moment please ...');
                Modules.Task('module://dictation/task/speechstateinfo', 'request', { Source: 'urn:speechstate:' + item.SpeechStateID })
                    .then(function(x) {
                        self.speechStateInfo({
                            Patient: x.PatientName,
                            Studies: x.Studies,
                            StudyUrns: x.StudyUrns
                        });
                    });

                var noAudio = item.DictationTypeID === 'TXT';

                self.positionBarCss({ width: '0%' });
                self.positionBarClasses('');

                self.hasAudio(!noAudio);
                self.isAudioDisabled(self.disableAudio());
                self.text(null);
                                    
                var open = self.audioController.open(item, { disableAudio: noAudio });
                open.then(function() {
                    self.item(item);

                    if (self.audioController.showTextInput()) {
                        self.showText(true);
                        self.text(self.audioController.getText());
                    }

                    d.resolve();
                }, function() {
                    ris.notify.showError(locfmt('{ris,DictationOverviewPage_OpenDictation}'), 'Failed to open the controller.');
                    d.reject();
                }).always(function() {
                    Loading.Hide();
                });

                return d.promise();
            };
            
            this.playPauseIcon = ko.observable("\uf04b");

            this.stopCss = ko.observable();
            this.playCss = ko.observable();
            this.pauseCss = ko.observable();
            this.rewindCss = ko.observable();
            this.forwardCss = ko.observable();

            this.stop = function() {
                self.audioController.stop();
            };

            this.play = function() {
                self.audioController.play();
            };

            this.pause = function() {
                self.audioController.pause();
            };

            this.rewind = function() {
                self.audioController.rewind();
                $(window).one('mouseup', function() {
                    self.audioController.pause();
                });
            };

            this.forward = function() {
                self.audioController.forward();
                $(window).one('mouseup', function () {
                    self.audioController.pause();
                });
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

                var number = (1 / w * x);
                var target = self.lengthMs * number;
                self.audioController.seek(target | 0);
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

        function createDictationOverviewContextMenu() {
            var configurationMenu = $('<input type="button" id="OverviewDictationsGridSetting" class="ui-custom-button command-button ui-link group-panel-config-icon"/>')
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
                        dictationOverviewViewModel.refresh();
                    } else if (item.id == 'clear-filter') {
                        dictationOverviewViewModel.clearFilter();
                    } else if (item.id == 'configure') {
                        dictationOverviewViewModel.customize();
                    } else if (item.id == 'reset') {
                        dictationOverviewViewModel.resetUserSettings();
                        dictationOverviewViewModel.reset();
                    }
                }
            });
            var find = $('#TranscriptionGridPanel').find('.ui-group-panel-header');

            configurationMenu.appendTo(find);
        }

        var delayDictationSelectionChanged = null;

        function onDictationSelectionChanged() {
            if (delayDictationSelectionChanged !== null) {
                clearTimeout(delayDictationSelectionChanged);
            }
            delayDictationSelectionChanged = setTimeout(onDictationSelectionChangedCore, 100);
        }

        function onDictationSelectionChangedCore() {
            if (delayDictationSelectionChanged !== null) {
                clearTimeout(delayDictationSelectionChanged);
                delayDictationSelectionChanged = null;
            }

            var key = selection.getKeys().qFirst();
            if (key) {
                var data = dataView.getItemByKey(key);
                if (data) {
                    ZillionRis.LoadPatientBanner(data.PatientID);
                    dictationOverviewViewModel.iaTranscription.open(data);
                    return;
                }
            } 
            clearPatientAndExaminationDetails();
        }

        function clearPatientAndExaminationDetails() {
            ZillionRis.LoadPatientBanner(0);
            dictationOverviewViewModel.iaTranscription.showText(false);
            dictationOverviewViewModel.iaTranscription.hasAudio(false);
            dictationOverviewViewModel.iaTranscription.error(false);
            dictationOverviewViewModel.iaTranscription.speechStateInfo(null);
        }

        ZillionRis.SiteEvents.subscribe('lazy-page-update', refresh);
        function refresh() {
            refreshTimer.reset();

            dictationOverviewViewModel.isLoading(true);
            
            Modules.ContentProvider('module://dictation/data/speechstate-dictationoverview', 'query', {})
                .then(function(data) {
                    dictationOverviewViewModel.gridOptions.dataView.setItems(data, 'WorkItemID');
                    dictationOverviewViewModel.gridOptions.dataView.refresh();
                }).always(function() {
                dictationOverviewViewModel.isLoading(false);
            });
        }
    });

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