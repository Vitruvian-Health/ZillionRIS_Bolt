(function ($) {
    $.extend(true, window, {
        Rogan: {
            Ris: {
                Locations: new locationsService()
            }
        }
    });

    function locationsService() {
        var lastXhr = null;

        var self = this;
        var hasData = false;
        var locationsData = [];
        var locationIdx = {};
        var departmentsData = [];
        var departmentsIdx = {};
        var modalitiesData = [];
        var modalitiesIdx = {};
        var modalityTypesData = [];
        var modalityTypesIdx = {};
        var roomsData = [];
        var roomsIdx = {};
        var requesterLocationsData = [];
        var requesterLocationsIdx = {};
        var referralTypesData = [];
        var referralTypesIdx = [];
        var changedEvent = new ZillionParts.Event();

        // Exports.
        $.extend(true, self, {
            ensure: ensureData,
            refresh: refresh,
            getLocations: getLocations,
            getDepartments: getDepartments,
            getRooms: getRooms,
            getModalities: getModalities,
            getModalityTypes: getModalityTypes,
            getRequesterLocations: getRequesterLocations,
            getReferralTypes: getReferralTypes,
            onChanged: changedEvent
        });

        // Methods.
        function processData(data) {
            locationsData = data.Locations.query().orderBy('Name').toArray();
            departmentsData = data.Departments.query().orderBy('Name').toArray();
            modalitiesData = data.Modalities.query().orderBy('Name').toArray();
            modalityTypesData = data.ModalityTypes.query().orderBy('Name').toArray();
            roomsData = data.Rooms.query().orderBy('Name').toArray();
            requesterLocationsData = data.RequesterLocations.query().orderBy('Name').toArray();
            referralTypesData = data.ReferralTypes.query().orderBy('Name').toArray();
            hasData = true;
            updateIndexes();
            notifyDataChanged();
        }
        function updateIndexes() {
            locationIdx = {};
            departmentsIdx = {};
            modalitiesIdx = {};
            roomsIdx = {};

            $.each(locationsData, function (e, i) { locationIdx[e.ID] = i; });
            $.each(departmentsData, function (e, i) { departmentsIdx[e.ID] = i; });
            $.each(modalitiesData, function (e, i) { modalitiesIdx[e.ID] = i; });
            $.each(modalityTypesData, function (e, i) { modalityTypesIdx[e.ID] = i; });
            $.each(roomsData, function (e, i) { roomsIdx[e.ID] = i; });
            $.each(requesterLocationsData, function (e, i) { requesterLocationsIdx[e.ID] = i });
            $.each(referralTypesData, function (e, i) { referralTypesIdx[e.ID] = i });
        }
        function notifyDataChanged() {
            changedEvent.notify(self, null, self);
        }
        function ensureData() {
            if (hasData === false) {
                if (lastXhr) {
                    return;
                }

                refresh();
            }
        }
        function refresh() {
            if (lastXhr && lastXhr.state() === 'pending') {
                lastXhr.abort();
            }

            var a = new $.Deferred();
            lastXhr = Modules.ContentProvider('module://websitecore/data/location', 'retrieve', {});
            lastXhr.then(function(data) {
                    processData(data);
                    a.done(self);
                }, function(data) {
                    a.fail();
                    throw Error('Failed to retrieve location information.');
                });

            return a.promise();
        }

        function getLocations(f) {
            if (f) {
                return Rogan.Data.FilterArray(locationsData, f);
            }
            return locationsData;
        }
        function getDepartments(f) {
            if (f) {
                return Rogan.Data.FilterArray(departmentsData, f);
            }
            return departmentsData;
        }
        function getModalities(f) {
            if (f) {
                return Rogan.Data.FilterArray(modalitiesData, f);
            }
            return modalitiesData;
        }
        function getModalityTypes(f) {
            if (f) {
                return Rogan.Data.FilterArray(modalityTypesData, f);
            }
            return modalityTypesData;
        }
        function getRooms(f) {
            if (f) {
                return Rogan.Data.FilterArray(roomsData, f);
            }
            return roomsData;
        }
        function getRequesterLocations(f) {
            if (f) {
                return Rogan.Data.FilterArray(requesterLocationsData, f);
            }
            return requesterLocationsData;
        }
        function getReferralTypes(f) {
            if (f) {
                return Rogan.Data.FilterArray(referralTypesData, f);
            }
            return referralTypesData;
        }
    }
})(jQuery);