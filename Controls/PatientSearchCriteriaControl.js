(function ($) {

    function ObjectSelectionViewModel() {
        var self = this;

        this.source = null;
        this.selecteditem = new ko.observable();

        this.set = function (keys) {
            if (keys) {
                $.each(keys, function (i, e) {
                    var VAR = e;
                    var item = VAR;
                    self.selecteditem = item;

                    self.source.get(VAR, function (a) {
                        item.id = a.id;
                        self.selecteditem(self.selecteditem());
                    });
                });
            }
        };

        this.setSelectedValue = new ko.observable(null);
        this.setSelectedValue.subscribe(function (a) {
            if (a) {
                self.selecteditem(a.id);
            } else {
                self.selecteditem('');
            }

        });
    }

    var Gender = function (name, id) {
        this.genderName = name;
        this.genderID = id;
    };

    function getGendersData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'genders', {})
            .then(function (data) {
                for (var i = 0, ii = data.length; i < ii; i++) {

                    var g = new Gender(data[i].GenderName, data[i].GenderID);
                    vm.genders.push(g);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    var Modality = function (name, id) {
        this.modalityName = name;
        this.modalityID = id;
    };

    function getModalitiesData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'modalitytypes', {})
            .then(function (data) {
                for (var i = 0, ii = data.length; i < ii; i++) {

                    var nameWithCode = data[i].ModalityTypeName;
                    var mod = new Modality(nameWithCode, data[i].ModalityTypeID);
                    vm.modalities.push(mod);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    var Room = function (name, id) {
        this.roomName = name;
        this.roomID = id;
    };

    function getRoomsData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'rooms', {})
            .then(function (data) {
                for (var i = 0, ii = data.length; i < ii; i++) {

                    var room = new Room(data[i].DisplayName, data[i].ID);
                    vm.rooms.push(room);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    var ExamStatus = function (name, id) {
        this.examstatusName = name;
        this.examstatusID = id;
    };

    function getExamStatusesData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'examstatuses', {})
            .then(function (data) {
                for (var i = 0, ii = data.length; i < ii; i++) {

                    var examstat = new ExamStatus(data[i].StatusName, data[i].StatusID);
                    vm.examinationStatuses.push(examstat);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    var RequesterLocation = function (name, id) {
        this.requesterLocationName = name;
        this.requesterLocationID = id;
    };

    function getRequesterLocationsData(vm) {
        Modules.ContentProvider('module://workflow/data/requesting-location', 'query', { projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }' })
            .then(function (data) {
                if (data === null)
                    return;

                vm.requesterLocations([]);
                for (var i = 0, ii = data.length; i < ii; i++) {
                    var patcat = new RequesterLocation('['+ data[i].Code + '] ' + data[i].DisplayName, data[i].ID);
                    vm.requesterLocations.push(patcat);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    var PatientCategory = function (name, id) {
        this.patientcategoryName = name;
        this.patientcategoryID = id;
    };

    function getPatientCategoriesData(vm) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'patientcategories', {})
            .then(function (data) {
                if (data === null)
                    return;

                for (var i = 0, ii = data.length; i < ii; i++) {

                    var patcat = new PatientCategory(data[i].PatientCategoryName, data[i].PatientCategoryID);
                    vm.patientCategories.push(patcat);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    var RequestingWorkLocation = function (name, id) {
        this.requestingworklocationName = name;
        this.requestingworklocationID = id;
    };

    function getRequestingWorkLocationsData(vm, physicianID) {
        Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'requestingworklocations', { ID: physicianID })
            .then(function (data) {
                if (data === null)
                    return;

                vm.requestingWorkLocations([]);
                for (var i = 0, ii = data.length; i < ii; i++) {
                    var reqworkloc = new RequestingWorkLocation(data[i].RequestingWorkLocationName, data[i].RequestingWorkLocationID);
                    vm.requestingWorkLocations.push(reqworkloc);
                }
            }, function (data) {
                alert('Failed to load the data.\n\n' + data.message);
            });
    }

    var LocationGroup = function (name, id) {
        this.locationGroupName = name;
        this.locationGroupID = id;
    };

    function fillLocationGroups(vm) {
        vm.availableLocationGroups.push(new LocationGroup("Inpatient", "In"));
        vm.availableLocationGroups.push(new LocationGroup("Outpatient", "Out"));
    };

    function GetCriteriaVM() {
        var self = this;

        self.datesDisabled = new ko.observable(false);

        self.availableLocationGroups = new ko.observableArray();
        self.selectedLocationGroup = new ko.observable();

        self.genders = new ko.observableArray();
        self.selectedgender = new ko.observable();

        self.modalities = new ko.observableArray();
        self.selectedmodality = new ko.observable();

        self.rooms = new ko.observableArray();
        self.selectedroom = new ko.observable();

        self.examinationStatuses = new ko.observableArray();
        self.selectedExaminationStatus = new ko.observable();

        self.patientCategories = new ko.observableArray();
        self.selectedPatientCategory = new ko.observable();

        self.requesterLocations = new ko.observableArray();
        self.selectedRequesterLocation = new ko.observable();

        self.requestingWorkLocations = new ko.observableArray();
        self.selectedRequestingWorkLocations = new ko.observable();

        self.birthDate = new ko.observable();
        self.startDate = new ko.observable();
        self.endDate = new ko.observable();

        self.requesterTypeSelector = new ko.observable("requesterGP");

        self.examinationTypes = new ObjectSelectionViewModel();
        self.examinationTypes.source = new ZillionRis.Filters.ObjectSourceModules('module://workflow/data/examinationtypes', { projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }' });

        // Physicians
        self.currentResponsibleConsultant = new ObjectSelectionViewModel();
        self.currentResponsibleConsultant.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/physicians', {
            queryParameters: { PhysiciansType: "all" },
            projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
        });

        // GPs or Consultants
        self.requestingResponsibleConsultantSource = ko.observable(null);
        self.requestingResponsibleConsultant = ko.observable(null);

        // Technicians
        self.operator = new ObjectSelectionViewModel();
        self.operator.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
            queryParameters: { AssignmentPermission: "Radiographer" },
            projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
        }); 

        // Radiologists
        self.reporter = new ObjectSelectionViewModel();
        self.reporter.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
            queryParameters: { AssignmentPermission: 'Reporter' },
            projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
        }); 

        self.intendedreporter = new ObjectSelectionViewModel();
        self.intendedreporter.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/users', {
            queryParameters: { AssignmentPermission: 'Reporter' },
            projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
        });

        return self;
    }

    $(function () {

        $.extend(true, window, {
            SocialSecurityNumber_KeyDown: socialSecurityNumber_KeyDown,
            PatientNumber_KeyDown: patientNumber_KeyDown,
            AccessionNumber_KeyDown: accessionNumber_KeyDown,
            OrderNumber_KeyDown: orderNumber_KeyDown,
            SearchButton_OnClick: searchButton_OnClick,
            ClearFieldsButton_OnClick: clearFieldsButton_OnClick
        });

        function clearFieldsButton_OnClick() {
            // Clear search fields
            $('#GivenName').val("");
            $('#FamilyName').val("");
            $('#SocialSecurityNumber').val("");
            $('#PatientNumber').val("");
            $('#PhoneNumber').val("");
            $('#Location_PointOfCare').val("");
            $('#Location_Room').val("");
            $('#Location_Bed').val("");
            $('#ClinicalInformationTextBox').val("");
            $('#ReportTextBox').val("");
            $('#AccessionNumber').val("");
            $('#OrderNumber').val("");
            $('#RequestingResponsibleConsultantInput').val("");
            $('#CurrentResponsibleConsultantInput').val("");
            CriteriaVM.birthDate(null);
            CriteriaVM.selectedLocationGroup(null);
            CriteriaVM.selectedgender(null);
            CriteriaVM.selectedmodality(null);
            CriteriaVM.selectedroom(null);
            CriteriaVM.startDate(null);
            CriteriaVM.endDate(null);
            CriteriaVM.selectedExaminationStatus(null);
            CriteriaVM.selectedPatientCategory(null);
            CriteriaVM.selectedRequesterLocation(null);
            CriteriaVM.selectedRequestingWorkLocations(null);
            CriteriaVM.examinationTypes.setSelectedValue("0");
            CriteriaVM.operator.setSelectedValue("0");
            CriteriaVM.reporter.setSelectedValue("0");
            CriteriaVM.intendedreporter.setSelectedValue("0");
            CriteriaVM.currentResponsibleConsultant.setSelectedValue("0");
            CriteriaVM.requestingResponsibleConsultant(null);

            // Reset every field to enabled
            for (var j = 0, jj = SpecialTextBoxIDs.length; j < jj; j++) {
                var item = SpecialTextBoxIDs[j];
                setEnabled(item);
            }
            setAllOtherEnabled(CriteriaVM);

            // Clear search results
            window.setPatientsSearchViewModel([]);
        }

        var CriteriaVM = new GetCriteriaVM();

        ko.applyBindings(CriteriaVM, $("#CriteriasDiv")[0]);
        $('#SearchPatientsGroupPanel').groupPanel({ height: 285 });
        $('#FilterOrdersGroupPanel').groupPanel({ height: 285 });
        $('#FilterExaminationsGroupPanel').groupPanel({ height: 285 });

        fillLocationGroups(CriteriaVM);
        getGendersData(CriteriaVM);
        getModalitiesData(CriteriaVM);
        getRoomsData(CriteriaVM);
        getExamStatusesData(CriteriaVM);
        getPatientCategoriesData(CriteriaVM);
        getRequesterLocationsData(CriteriaVM);

        function reqesterTypeChanged(vm, requesterType) {
            var osvm = new ObjectSelectionViewModel();
            if (requesterType === "requesterGP") {
                osvm.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/physicians', {
                    queryParameters: { PhysiciansType: "GeneralPracticioner" },
                    projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
                });
            } else {
                osvm.source = new ZillionRis.Filters.ObjectSourceModules('module://websitecore/data/physicians', {
                    queryParameters: { PhysiciansType: "NonGeneralPracticioner" },
                    projector: '{ id: ID, label: DisplayName, code: Code, value: DisplayName }'
                });
            }
            vm.requestingResponsibleConsultantSource(osvm);
        }

        reqesterTypeChanged(CriteriaVM, "requesterGP");

        CriteriaVM.selectedLocationGroup.subscribe(function (newValue) {
            if (newValue && newValue.locationGroupID == "In") {
                $("#LocationFilter").show("blind", 200);
            }
            else {
                $("#LocationFilter").hide("blind", 200);
            }
        });

        CriteriaVM.requesterTypeSelector.subscribe(function (newValue) {
            if (newValue === "requesterGP") {
                $("#RequesterLocationDiv").hide("blind", 200);
                $("#RequestingWorkLocationDiv").show("blind", 200);
                CriteriaVM.selectedRequesterLocation(null);
                CriteriaVM.requestingResponsibleConsultant(null);
                reqesterTypeChanged(CriteriaVM, "requesterGP");

            } else {
                $("#RequesterLocationDiv").show("blind", 200);
                $("#RequestingWorkLocationDiv").hide("blind", 200);
                CriteriaVM.selectedRequestingWorkLocations(null);
                CriteriaVM.requestingResponsibleConsultant(null);
                reqesterTypeChanged(CriteriaVM, "requesterConsultant");
            }
        });

        CriteriaVM.requestingResponsibleConsultant.subscribe(function (newValue) {
            if (CriteriaVM.requesterTypeSelector() === "requesterGP") {
                if (newValue) {
                    getRequestingWorkLocationsData(CriteriaVM, newValue.id);
                }
            }
        });

        function searchButton_OnClick() {
            var SocialSecurityNr = $('#SocialSecurityNumber').val();
            var PatientNr = $('#PatientNumber').val();
            var AccessionNr = $('#AccessionNumber').val();
            var OrderNr = $('#OrderNumber').val();

            if (SocialSecurityNr != null && SocialSecurityNr.length > 0) {
                searchWithSocialSecurityNumber(SocialSecurityNr);
            }
            else if (PatientNr != null && PatientNr.length > 0) {
                searchWithPatientNumber(PatientNr);
            }
            else if (AccessionNr != null && AccessionNr.length > 0) {
                searchWithAccessionNumber(AccessionNr);
            }
            else if (OrderNr != null && OrderNr.length > 0) {
                searchWithOrderNumber(OrderNr);
            }
            else {
                search();
            }
        }

        function searchWithSocialSecurityNumber(SSN) {
            setPatientsSearchViewModelLoading(true);

            Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'searchSSN', { Value: SSN })
            .then(function (data) {
                window.setPatientsSearchViewModel(data);
            }, function (data) {
                throw Error(data['message']);
            })
            .always(function() {
                setPatientsSearchViewModelLoading(false);
            });
        }

        function searchWithPatientNumber(PAS) {
            setPatientsSearchViewModelLoading(true);

            Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'searchPAS', { Value: PAS })
            .then(function (data) {
                window.setPatientsSearchViewModel(data);
            }, function (data) {
                throw Error(data['message']);
            })
            .always(function () {
                setPatientsSearchViewModelLoading(false);
            });
        }

        function searchWithAccessionNumber(AccessionNr) {
            setPatientsSearchViewModelLoading(true);

            Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'searchAccessionNr', { Value: AccessionNr })
            .then(function (data) {
                window.setPatientsSearchViewModel(data);
            }, function (data) {
                throw Error(data['message']);
            })
            .always(function () {
                setPatientsSearchViewModelLoading(false);
            });
        }

        function searchWithOrderNumber(OrderNr) {
            setPatientsSearchViewModelLoading(true);

            Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'searchOrderNr', { Value: OrderNr })
            .then(function (data) {
                window.setPatientsSearchViewModel(data);
            }, function (data) {
                throw Error(data['message']);
            })
            .always(function () {
                setPatientsSearchViewModelLoading(false);
            });
        }

        function search() {
            setPatientsSearchViewModelLoading(true);

            Modules.ContentProvider('module://websitecore/data/advancedpatientsearch', 'search', {
                GivenName: $('#GivenName').val(),
                FamilyName: $('#FamilyName').val(),
                BirthDate_String: CriteriaVM.birthDate(),
                NHS: $('#SocialSecurityNumber').val(),
                PAS: $('#PatientNumber').val(),
                GenderID: CriteriaVM.selectedgender() != null ? CriteriaVM.selectedgender().genderID : "",
                PhoneNumber: $('#PhoneNumber').val(),

                LocationGroup: $('#LocationGroupSelection').val().locationGroupID,
                PatientLocation_PointOfCare: $('#Location_PointOfCare').val(),
                PatientLocation_Room: $('#Location_Room').val(),
                PatientLocation_Bed: $('#Location_Bed').val(),

                ModalityID: CriteriaVM.selectedmodality() != null ? CriteriaVM.selectedmodality().modalityID : 0,
                ExamTypeID: CriteriaVM.examinationTypes.selecteditem() != null ? CriteriaVM.examinationTypes.selecteditem() : 0,
                RoomID: CriteriaVM.selectedroom() != null ? CriteriaVM.selectedroom().roomID : 0,
                StartDate_String: CriteriaVM.startDate(),
                EndDate_String: CriteriaVM.endDate(),

                TechnicianID: CriteriaVM.operator.selecteditem() != null ? CriteriaVM.operator.selecteditem() : 0,
                ReporterID: CriteriaVM.reporter.selecteditem() != null ? CriteriaVM.reporter.selecteditem() : 0,
                IntendedReporterID: CriteriaVM.intendedreporter.selecteditem() != null ? CriteriaVM.intendedreporter.selecteditem() : 0,
                StatusID: CriteriaVM.selectedExaminationStatus() != null ? CriteriaVM.selectedExaminationStatus().examstatusID : null,

                CurrentResponsibleConsultantID: CriteriaVM.currentResponsibleConsultant.selecteditem() != null ? CriteriaVM.currentResponsibleConsultant.selecteditem() : 0,
                RequestingResponsibleConsultantID: CriteriaVM.requestingResponsibleConsultant() != null ? CriteriaVM.requestingResponsibleConsultant().id : 0,
                ClinicalInfoFilter: $('#ClinicalInformationTextBox').val(),
                ReportFilter: $('#ReportTextBox').val(),

                PatientCategoryID: CriteriaVM.selectedPatientCategory() != null ? CriteriaVM.selectedPatientCategory().patientcategoryID : 0,
                RequesterLocationID: CriteriaVM.selectedRequesterLocation() != null ? CriteriaVM.selectedRequesterLocation().requesterLocationID : 0,
                RequestingWorkLocationID: CriteriaVM.selectedRequestingWorkLocations() != null ? CriteriaVM.selectedRequestingWorkLocations().requestingworklocationID : 0
            })
            .then(function (data) {
                window.setPatientsSearchViewModel(data);
            }, function (data) {
                throw Error(data['message']);
            })
            .always(function () {
                setPatientsSearchViewModelLoading(false);
            });
        }

        var SpecialTextBoxIDs = ['SocialSecurityNumber', 'PatientNumber', 'AccessionNumber', 'OrderNumber'];

        function socialSecurityNumber_KeyDown(e) {
            DisableOthersIfCharNumberReachedTheLimit(e, 'SocialSecurityNumber', 1, SpecialTextBoxIDs, CriteriaVM);
        }

        function patientNumber_KeyDown(e) {
            DisableOthersIfCharNumberReachedTheLimit(e, 'PatientNumber', 1, SpecialTextBoxIDs, CriteriaVM);
        }

        function accessionNumber_KeyDown(e) {
            if (OnlyLetNumbers(e, 'AccessionNumber')) {
                DisableOthersIfCharNumberReachedTheLimit(e, 'AccessionNumber', 1, SpecialTextBoxIDs, CriteriaVM);
            }
        }

        function orderNumber_KeyDown(e) {
            if (OnlyLetNumbers(e, 'OrderNumber')) {
                DisableOthersIfCharNumberReachedTheLimit(e, 'OrderNumber', 1, SpecialTextBoxIDs, CriteriaVM);
            }
        }
    });

    function setAllOtherDisabled(vm) {
        setDisabled('GivenName');
        setDisabled('FamilyName');
        setDisabled('ExaminationTypesInput');
        setDisabled('OperatorInput');
        setDisabled('ReporterInput');
        setDisabled('IntendedReporterInput');
        setDisabled('CurrentResponsibleConsultantInput');
        setDisabled('RequestingResponsibleConsultantInput');
        setDisabled('ClinicalInformationTextBox');
        setDisabled('ReportTextBox');
        setDisabled('PhoneNumber');

        setDisabled_ZpSelect('GenderSelection');
        setDisabled_ZpSelect('LocationGroupSelection');
        setDisabled_ZpSelect('ModalitySelection');
        setDisabled_ZpSelect('RoomSelection');
        setDisabled_ZpSelect('WorkflowStatus');

        setDisabled_ZpSelect('RequesterLocation');
        setDisabled_ZpSelect('RequestingWorkLocation');
        setDisabled_ZpSelect('PatientCategory');

        vm.datesDisabled(true);

    }

    function setAllOtherEnabled(vm) {
        setEnabled('GivenName');
        setEnabled('FamilyName');
        setEnabled('ExaminationTypesInput');
        setEnabled('OperatorInput');
        setEnabled('ReporterInput');
        setEnabled('IntendedReporterInput');
        setEnabled('CurrentResponsibleConsultantInput');
        setEnabled('RequestingResponsibleConsultantInput');
        setEnabled('ClinicalInformationTextBox');
        setEnabled('ReportTextBox');
        setEnabled('PhoneNumber');

        setEnabled_ZpSelect('GenderSelection');
        setEnabled_ZpSelect('LocationGroupSelection');
        setEnabled_ZpSelect('ModalitySelection');
        setEnabled_ZpSelect('RoomSelection');
        setEnabled_ZpSelect('WorkflowStatus');


        setEnabled_ZpSelect('RequesterLocation');
        setEnabled_ZpSelect('RequestingWorkLocation');
        setEnabled_ZpSelect('PatientCategory');

        vm.datesDisabled(false);

    }

    function setDisabled(elementID) {
        $('#' + elementID).attr("readonly", true);
    }

    function setDisabled_ZpSelect(elementID) {
        $('#' + elementID).zpSelect({ disabled: true });
    }

    function setEnabled(elementID) {
        $('#' + elementID).attr("readonly", false);
    }

    function setEnabled_ZpSelect(elementID) {
        $('#' + elementID).zpSelect({ disabled: false });
    }

    var BACKSPACE = $.ui.keyCode.BACKSPACE;
    var DELETE = $.ui.keyCode.DELETE;
    var TAB = $.ui.keyCode.TAB;
    var ESCAPE = $.ui.keyCode.ESCAPE;
    var ENTER = $.ui.keyCode.ENTER;
    var TAB = $.ui.keyCode.TAB;
    var HOME = $.ui.keyCode.HOME;
    var END = $.ui.keyCode.END;
    var LEFT = $.ui.keyCode.LEFT;
    var RIGHT = $.ui.keyCode.RIGHT;

    function DisableOthersIfCharNumberReachedTheLimit(event, currentTextBoxID, limit, SpecialTextBoxIDs, vm) {
        var evt = event || window.event;
        if (evt && !document.getElementById(currentTextBoxID).readOnly) {
            var keyCode = evt.charCode || evt.keyCode;
            var oldtext = $('#' + currentTextBoxID).val();

            var isDeleteNow = keyCode == BACKSPACE || keyCode == DELETE;  // backspace or delete
            var isNumbKey = keyCode == TAB || keyCode == ESCAPE || keyCode == ENTER ||
                            ((keyCode == 65 || keyCode == 67) && evt.ctrlKey === true) ||  //  Ctrl+A or Ctrl+C
                            keyCode == HOME || keyCode == END || keyCode == LEFT || keyCode == RIGHT;
            var deleteEnoughChars = evt.srcElement && evt.srcElement.selectionEnd - evt.srcElement.selectionStart > oldtext.length - limit; // after deletion less than 9 chars left

            if (oldtext.length > limit && !(deleteEnoughChars && isDeleteNow) ||
               (oldtext.length == limit && !isDeleteNow && !isNumbKey) ||
               (oldtext.length == (limit - 1) && !isDeleteNow && !isNumbKey)) {

                for (var j = 0, jj = SpecialTextBoxIDs.length; j < jj; j++) {
                    var item = SpecialTextBoxIDs[j];
                    if (item != currentTextBoxID) {
                        setDisabled(item);
                    }
                }
                setAllOtherDisabled(vm);
            }
            else {

                for (var j = 0, jj = SpecialTextBoxIDs.length; j < jj; j++) {
                    var item = SpecialTextBoxIDs[j];
                    if (item != currentTextBoxID) {
                        setEnabled(item);
                    }
                }
                setAllOtherEnabled(vm);
            }
        }
    }

    function OnlyLetNumbers(event, currentTextBoxID) {
        var evt = event || window.event;
        if (evt && !document.getElementById(currentTextBoxID).readOnly) {
            var keyCode = evt.charCode || evt.keyCode;

            if (keyCode == BACKSPACE || keyCode == DELETE || keyCode == TAB || keyCode == ESCAPE || keyCode == ENTER ||
                ((keyCode == 65 || keyCode == 67) && evt.ctrlKey === true) ||  // Allow: Ctrl+A, Ctrl+C
                keyCode == HOME || keyCode == END || keyCode == LEFT || keyCode == RIGHT) {
                return true;
            }
            else {
                // Ensure that it is a number and stop the keypress
                if (evt.shiftKey || evt.ctrlKey || evt.altKey ||
                    (keyCode < 48 || keyCode > 57) && (keyCode < 96 || keyCode > 105)) {
                    evt.returnValue = false;
                    return false;
                }
                else {
                    return true;
                }
            }
        }
    }
})(jQuery);
