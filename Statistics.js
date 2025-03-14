(function ($) {
    $(function () {
        var vm = {
            "showFailedPrintsWorklist": function () {
                showFailedPrintsWorklist();
            },
            "showFailedXdsDocumentsWorklist": function() {
                showFailedXdsDocumentsWorklist();
            },
            "showXdsPendingDocuments": function() {
                return window.pageConfig.ShowXdsPendingDocumentsButton;
            }
        };

        ko.applyBindings(vm, $('#Buttons')[0]);
    });
    var $dialog, $xdsdialog, failedPrintsWorklistVM, failedXdsDocumentWorklistVM;

    function showFailedPrintsWorklist() {
        if (!$dialog) {
            failedPrintsWorklistVM = {
                gridOptions: {
                    columnDefaults: {
                        allowFilter: true,
                        allowSort: true,
                        allowResize: true
                    },
                    columns: [
                        { title: 'Report name', fieldID: 'ReportName', width: 100 },
                        { title: 'Parameters', fieldID: 'ParametersToShow', width: 225 },
                        { title: 'Error', fieldID: 'Error', width: 225 },
                        { title: 'Timestamp', fieldID: 'LogTimestamp', dataType: 'scheduled-date', emphasis: 'date', width: 110 }
                    ],
                    dataView: new ZillionParts.Data.DataSet(),
                    selection: new ZillionParts.Data.DataSelection(),
                    showFilterRow: true,
                },
                selectedItem: ko.observable(),
                refresh: function () {
                     Modules.ContentProvider('module://websitecore/data/statistics', 'request', {})
                        .then(function(data) {
                        failedPrintsWorklistVM.gridOptions.dataView.setItems(data, 'CrystalReportLogID');
                        failedPrintsWorklistVM.gridOptions.dataView.refresh();
                        }, function(data) {
			                if (data.error) {
                                throw Error(data.message);
                            }
                    });
                },
                enableMultiSelect: ko.observable(true)
            };

            var selectAllText = "Select all";
            var deselectAllText = "Deselect all";
            failedPrintsWorklistVM.enableMultiSelect.subscribe(function(val) {
                selection.setMultiSelect(val);

                var button = $(".ui-dialog-buttonpane button:contains('" + selectAllText + "')").length > 0 
                    ? $(".ui-dialog-buttonpane button:contains('" + selectAllText + "')") 
                    : $(".ui-dialog-buttonpane button:contains('" + deselectAllText + "')");

                if (!val) {
                    button.button("disable");
                    button.button({ text: selectAllText });                
                } else {
                    button.button("enable");
                }
            });

            var selection = failedPrintsWorklistVM.gridOptions.selection;
            var dataView = failedPrintsWorklistVM.gridOptions.dataView;
            
            ZillionParts.GridView.Behaviors.RestrictToDataSet({ dataView: dataView, selection: selection, grid: '#FailedPrintView' });
            ZillionParts.GridView.Behaviors.ForceSingleSelect({ dataView: dataView, selection: selection, grid: '#FailedPrintView' });
            var selectedReports = [];

            $dialog = $('#FailedPrintWorklistOverview').dialog({
                resizable: false,
                width: 720,
                buttons: [
                    { text: selectAllText, click: function(event) {
                        selectAllReports(event);
                    }},
                    { text: 'Print selected', click: function () {
                        printSelectedReportsButton_click();
                    }
                    },
                    { text: 'Close', click: function () { $dialog.dialog('close'); } }
                ]
            }).show();

            function selectAllReports(event) {
                if (event.srcElement.innerText == selectAllText) {
                    // select all
                    for (var i = 0; i < dataView.getItems().length; i++) {
                        var item = dataView.getItemByIdx(i);
                        selection.add(item['CrystalReportLogID']);
                    }
                    event.srcElement.innerText = deselectAllText;
                } else {
                    // deselect all                    
                    selection.clear();
                    event.srcElement.innerText = selectAllText;
                }
            }

            function printSelectedReportsButton_click() {
                if (selection.getCount() == 0)
                    return;

                var keys = selection.getKeys();
                if (keys) {
                    for (var i = 0; i < keys.length; i++) {
                        var data = dataView.getItemByKey(keys[i]);
                        if (data) {
                            selectedReports.push(data.CrystalReportLogID);
                        }
                    }
                }
                printSelectedReports();
                selectedReports = [];
            }

            function printSelectedReports() {
                Modules.ContentProvider('module://websitecore/data/statistics', 'printselectedreports', { ReportIDs: selectedReports })
                    .then(function(data) {
                        if (data.type == 'statusreport') {
                            var warnings = data.warnings;
                            if (warnings && warnings.length > 0) {
                                $.each(warnings, function (k, msg) { alert(msg); });
                            } else {
                                ris.notify.showError(locfmt('{ris,FailedPrintsWorklist}'), data.message);
                            }
                        } else if (data.redirectUrl) {
                            window.open(data.redirectUrl);
                        }
                        failedPrintsWorklistVM.refresh();
                    }, function (data) {
                        ris.notify.showError(locfmt('{ris,FailedPrintsWorklist}'), data.message);
                    });
            }

            ko.applyBindings(failedPrintsWorklistVM, $dialog[0]);
        } else {
            $dialog.dialog('open');
        }

        failedPrintsWorklistVM.refresh();
    };

    function showFailedXdsDocumentsWorklist() {
        if (!$xdsdialog) {
            failedXdsDocumentWorklistVM = {
                gridOptions: {
                    columnDefaults: {
                        allowFilter: true,
                        allowSort: true,
                        allowResize: true
                    },
                    columns: [
                        { title: 'Accession Number', fieldID: 'AccessionNumber' },
                        { title: 'Action Type', fieldID: 'ActionType' },
                        { title: 'Error Message', fieldID: 'ErrorMessage', width: 370  },
                        { title: 'Creation Time', fieldID: 'CreationTime', dataType: 'scheduled-date', emphasis: 'date' }
                    ],
                    dataView: new ZillionParts.Data.DataSet(),
                    selection: new ZillionParts.Data.DataSelection(),
                    showFilterRow: true
                },
                selectedItem: ko.observable(),
                refresh: function () {
                    Modules.ContentProvider('module://websitecore/data/statistics', 'requestxdsdocuments', {})
                        .then(function(data) {
                        failedXdsDocumentWorklistVM.gridOptions.dataView.setItems(data, 'PendingDocumentID');
                        failedXdsDocumentWorklistVM.gridOptions.dataView.refresh();
                        }, function(data) {
			                if (data.error) {
                                throw Error(data.message);
                            }
                    });
                },
                enableMultiSelect: ko.observable(true)
            };

            var selectAllText = "Select all";
            var deselectAllText = "Deselect all";
            failedXdsDocumentWorklistVM.enableMultiSelect.subscribe(function(val) {
                selection.setMultiSelect(val);

                var button = $(".ui-dialog-buttonpane button:contains('" + selectAllText + "')").length > 0 
                    ? $(".ui-dialog-buttonpane button:contains('" + selectAllText + "')") 
                    : $(".ui-dialog-buttonpane button:contains('" + deselectAllText + "')");

                if (!val) {
                    button.button("disable");
                    button.button({ text: selectAllText });                
                } else {
                    button.button("enable");
                }
            });

            var selection = failedXdsDocumentWorklistVM.gridOptions.selection;
            var dataView = failedXdsDocumentWorklistVM.gridOptions.dataView;
            
            ZillionParts.GridView.Behaviors.RestrictToDataSet({ dataView: dataView, selection: selection, grid: '#FailedXdsDocumentView' });
            ZillionParts.GridView.Behaviors.ForceSingleSelect({ dataView: dataView, selection: selection, grid: '#FailedXdsDocumentView' });
            var selectedXdsDocuments = [];

            $xdsdialog = $('#FailedXdsDocumentWorklistOverview').dialog({
                resizable: false,
                width: 720,
                buttons: [
                    { text: selectAllText, click: function(event) {
                        selectAllDocuments(event);
                    }},
                    { text: 'Resend selected', click: function () {
                        resendSelectedXdsDocumentsButton_click();
                    }
                    },
                    { text: 'Close', click: function () { $xdsdialog.dialog('close'); } }
                ]
            }).show();
            
            function selectAllDocuments(event) {
                if (event.srcElement.innerText == selectAllText) {
                    // select all
                    for (var i = 0; i < dataView.getItems().length; i++) {
                        var item = dataView.getItemByIdx(i);
                        selection.add(item['PendingDocumentID']);
                    }
                    event.srcElement.innerText = deselectAllText;
                } else {
                    // deselect all                    
                    selection.clear();
                    event.srcElement.innerText = selectAllText;
                }
            }

            function resendSelectedXdsDocumentsButton_click() {
                if (selection.getCount() == 0)
                    return;

                var keys = selection.getKeys();
                if (keys) {
                    for (var i = 0; i < keys.length; i++) {
                        var data = dataView.getItemByKey(keys[i]);
                        if (data) {
                            selectedXdsDocuments.push(data.PendingDocumentID);
                        }
                    }
                }
                resendSelectedXdsDocuments();
                selectedXdsDocuments = [];
            }

            function resendSelectedXdsDocuments() {
                $("#FailedXdsDocumentWorklistOverview").loadingOverlay();
                $("#FailedXdsDocumentWorklistOverview").loadingOverlay({ message: 'The documents are being sent. Please wait.' });
                $("#FailedXdsDocumentWorklistOverview").loadingOverlay('show');

                Modules.ContentProvider('module://websitecore/data/statistics', 'resendselectedxdsdocuments', { XdsDocumentIDs: selectedXdsDocuments })
                        .then(function(data) {
                    $("#FailedXdsDocumentWorklistOverview").loadingOverlay('hide');
                    alert('The worklist has been updated.');
                    failedXdsDocumentWorklistVM.refresh();
                    }, function() {
                        alert('Communication problem.');
                        $("#FailedXdsDocumentWorklistOverview").loadingOverlay('hide');
                    });
            }

            ko.applyBindings(failedXdsDocumentWorklistVM, $xdsdialog[0]);
        } else {
            $xdsdialog.dialog('open');
        }

        failedXdsDocumentWorklistVM.refresh();
    }
})(jQuery);