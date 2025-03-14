(function ($) {
    $.extend(true, window, {
        ZillionRis: {
            UserSettings: {
                get: getUserSettings,
                set: setUserSettings
            },
            WorkList: {
                Controller: virtualDataGridController,
                SettingsStore: virtualDataGridSettingsStore,
                SelectionStore: virtualDataGridSelectionStore
            }
        }
    });

    var debugUserSettings = zpDebugProxy('user-settings');

    function getUserSettings(page, control) {
        return Modules.Task('module://workflow/task/settings', 'load', { Key: page + (control||'') });
    }

    function setUserSettings(page, control, data) {
        return Modules.Task('module://workflow/task/settings', 'store', { Key: page + (control || ''), Data: data });
    }


    function virtualDataGridSettingsStore() {
        var self = this;
        var _isLoading = false;
        var _grid = null;
        var _gridOptions = null;
        var _pageKey = null;
        var _controlKey = null;
        var _lastSettings = null;
        var _delay = ZillionParts.Delay(function () { saveSettingsCore(); }, 1000, true);

        this.initialize = function ($grid, gridOptions, pageKey, controlKey) {
            _pageKey = pageKey;
            _controlKey = controlKey;
            _gridOptions = gridOptions;
            _grid = $($grid);

            _grid.virtualDataGrid('onSettingsChanged').subscribe(function (e, settings) {
                if (!_isLoading) {
                    _lastSettings = settings;
                    _delay();
                }
            });

            return this;
        };

        this.loadSettings = function () {
            _isLoading = true;
            ZillionRis.UserSettings.get(_pageKey, _controlKey)
                .then(function (data) {
                    if (data) {
                        _grid.virtualDataGrid({ sort: data.sort, userColumns: data.columns }).virtualDataGrid('refresh');
                    }
                }, function (error) {
                    debugUserSettings.error('Failed to load user settings (pageKey: "' + _pageKey + '", controlKey: "' + _controlKey + '"). Error: ' + JSON.stringify(error));
                }).always(function () {
                    _isLoading = false;
                });
        };
        this.resetSettings = function () {
            _grid.virtualDataGrid({ sort: _gridOptions.sort, userColumns: [] }).virtualDataGrid('refresh');

            ZillionRis.UserSettings.set(_pageKey, _controlKey, null);
        };

        function saveSettingsCore() {
            ZillionRis.UserSettings
                .set(_pageKey, _controlKey, _lastSettings)
                .then(function () {
                    debugUserSettings.debug('Saved user settings (pageKey: "' + _pageKey + '", controlKey: "' + _controlKey + '").');
                }, function (error) {
                    debugUserSettings.error('Failed to save user settings (pageKey: "' + _pageKey + '", controlKey: "' + _controlKey + '"). Error: ' + JSON.stringify(error));
                });
        }
    }


    function virtualDataGridSelectionStore($grid, options, storageKey) {
        // Prefer session storage (only for the current tab), otherwise use localStorage (across sessions).
        var storage = window.sessionStorage || window.localStorage;

        // Load and add the selection when called.
        var onUpdated = function () {
            var selection = options.selection;
            if (selection.getKeys().length === 0) {
                var element = storage.getItem(storageKey);
                if (element) {
                    var dataView = options.dataView;
                    //select from the visible item, thus false for the second parameter
                    var elementIdx = dataView.getIdxByKey(element, false);
                    if (elementIdx !== undefined && elementIdx !== -1) {
                        selection.clear();
                        selection.add(element);

                        $($grid).virtualDataGrid('focusFirstSelection');

                        // When successfully selected the item, remove our event subscription.
                        dataView.onUpdated.unsubscribe(onUpdated);
                    }
                }
            }
        };
        options.dataView.onUpdated.subscribe(onUpdated);

        // When a selection has been made, store the key in the localStorage.
        var th = {
            callback: function () {
                    var keys = options.selection.getKeys().qFirst();
                    if (keys) {
                        storage.setItem(storageKey, keys);
                    }
            },
            delay: 100
        };
        options.selection.onChange.subscribe(function(s, e) {
            if (e.type === ZillionParts.Data.DataSelection.Added) {
                throttle(th);
            }
        });
    }

    var defaultOptions = {
        keyField: 'ID',
        commandManager: null,
        commandResources: null,
        contextMenuList: null,
        actionList: null,
        columns: null,
        gridOptions: {
            columnDefaults: {
                allowFilter: true,
                allowSort: true,
                allowResize: true
            },
            showFilterRow: true
        }
    };

    function virtualDataGridController(options) {
        options = $.extend(true, {}, defaultOptions, options);

        this.dataSource = new ZillionParts.Data.DataSet();
        this.selection = new ZillionParts.Data.DataSelection();

        this.create = function () {
            var _gridOptions = {
                dataView: this.dataSource,
                selection: this.selection,
                keyField: options.keyField,
                columns: [],
                sort: options.sort || []
            };

            if (options.contextMenuList) {
                _gridOptions.columns.push({ title: '', fieldID: 'contextMenu', friendlyName: 'Context Menu', dataType: 'context-menu', commands: { list: options.contextMenuList, manager: options.commandManager, resources: options.commandResources} });
            }
            if (options.actionList) {
                _gridOptions.columns.push({ title: 'Actions', fieldID: 'actions', friendlyName: 'Actions', dataType: 'commands', commands: { list: options.actionList, manager: options.commandManager, resources: options.commandResources} });
            }
            if (options.columns) {
                _gridOptions.columns = _gridOptions.columns.concat(options.columns);
            }

            $.extend(true, _gridOptions, options.gridOptions);

            return _gridOptions;
        };
    }
})(jQuery);