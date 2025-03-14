(function ($) {
    $.extend(true, window,
        {
            Rogan: {
                Time: {
                    getCurrentServerTime: getCurrentServerTime,
                    getLatestUpdateTime: getLatestUpdateTime,
                    getServerCount: getServerCount,
                    getTickDifference: getTickDifference,
                    synchronise: function () { setTimeout(function() { synchronise(); }, 0); },
                    updated: new ZillionParts.Event()
                }
            }
        });

    var timePerServer = {};
    var lastServer = null;

    function synchronise() {
        var date = new Date();

        Modules.Task('module://websitecore/task/time', 'server-time', {})
            .then(function (data) {
                processResponse(date, data);
            }, function () {
                console.log('Failed to synchronize the time with the server.');
            });
    }

    function processResponse(startTime, data) {
        var endTime = new Date();
        var duration = endTime - startTime;

        timePerServer[data.serverID] = {
            callDuration: duration,
            startTime: startTime,
            endTime: endTime,
            serverTime: data.currentTime
        };
        lastServer = data.serverID;

        Rogan.Time.updated.notify();
    }

    function calculateOffset(localStartTime, callDuration, serverTime) {
        return Math.round(serverTime - localStartTime + callDuration / 5);
    }

    function getTickDifference(options) {
        options = $.extend(true, {}, options, { serverID: lastServer });

        var data = timePerServer[options.serverID];
        if (!data)
            return 0;

        return calculateOffset(data.startTime, data.callDuration, data.serverTime);
    }

    function getCurrentServerTime(options) {
        options = $.extend(true, {}, options, { serverID: lastServer });

        var currentTime = new Date();
        var data = timePerServer[options.serverID];
        if (!data) {
            return currentTime;
        }

        var ticksSinceUpdate = currentTime - data.endTime;
        var expectedCurrentTime = data.serverTime.getTime() + ticksSinceUpdate;
        return new Date(expectedCurrentTime);
    }

    function getLatestUpdateTime(options) {
        options = $.extend(true, {}, options, { serverID: lastServer });

        return timePerServer[options.serverID].endTime;
    }

    function getServerCount() {
        return -1;
    }
})(jQuery);