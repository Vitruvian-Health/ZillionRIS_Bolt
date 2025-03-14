(function ($) {
    $.extend(true, window, {
        ZillionRis: {
            HouseKeeping: {
                SendToHousekeeping: sendToHousekeeping,
                RemoveFromHousekeeping: removeFromHousekeeping
            }
        }
    });

    function sendToHousekeeping(examinationID, memo, notRefreshNeeded) {
        var def = new $.Deferred();

        Modules.Task('module://websitecore/task/housekeeping', 'add', { examinationID: examinationID, memo: memo })
            .then(function(a) {
                if (a) {
                    def.resolve();
                }
            }, function(a) {
                    def.reject(a.message);
            }).always(function () {
                if (!notRefreshNeeded)
                    ZillionRis.SiteEvents.broadcast('lazy-page-update', null, { source: 'housekeeping', action: 'send' });
            });

        return def.promise();
    }

    function removeFromHousekeeping(examinationID, housekeepingID) {
        var def = new $.Deferred();

        Modules.Task('module://websitecore/task/housekeeping', 'remove', { examinationID: examinationID, housekeepingID: housekeepingID })
            .then(function (a) {
                if (a) {
                    def.resolve();
                }
        }, function (a) {
                def.reject(a.message);
            }).always(function () {
                ZillionRis.SiteEvents.broadcast('lazy-page-update', null, { source: 'housekeeping', action: 'remove' });
            });

        return def.promise();
    }
})(jQuery);
