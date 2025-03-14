(function ($) {
    $.extend(true, window, {
        Rogan: {
            Ris: {
                Specialisations: new specialisationsService()
            }
        }
    });

    function specialisationsService() {
        var lastXhr = null;

        var self = this;
        var hasData = false;
        var specialisationsData = [];
        var specialisationIdx = {};
        var changedEvent = new ZillionParts.Event();

        //Exports.
        $.extend(true, self, {
            ensure: ensureData,
            refresh: refresh,
            getSpecialisations: getSpecialisations,
            onChanged: changedEvent
        });

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

            lastXhr = Modules.ContentProvider('module://websitecore/data/specialisation', 'retrieve', {});
            lastXhr.then(function (data) {
                    processData(data);
                    a.done(self);
                }, function () {
                    a.fail();
                    throw Error('Failed to retrieve specialisation information');
                });
        }

        function processData(data) {
            specialisationsData = data.Specialisations.query().orderBy('Name').toArray();
            hasData = true;
            updateIndexes();
            notifyDataChanged();
        }

        function updateIndexes() {
            specialisationIdx = {};

            $.each(specialisationsData, function (e, i) { specialisationIdx[e.ID] = i; });
        }

        function notifyDataChanged() {
            changedEvent.notify(self, null, self);
        }

        function getSpecialisations(f) {
            if (f) {
                return Rogan.Data.FilterArray(specialisationsData, f);
            }
            return specialisationsData;
        }
    }
})(jQuery);