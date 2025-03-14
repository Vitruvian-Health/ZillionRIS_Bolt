(function($) {
    ris.intervalTimer = function(conf) {
        conf = conf || {};
        var timerID = null;
        var delay = conf.delay | 0;
        var onTick = conf.onTick || null;

        function getDelay() {
            return delay;
        }

        function setDelay(value) {
            delay = value;
            reset();
        }

        function reset() {
            if (timerID === null) {
                return;
            }

            stop();
            start();
        }

        function start() {
            if (timerID !== null) {
                return;
            }

            timerID = setInterval(function() { onTick(); }, delay);
        }

        function stop() {
            if (timerID === null) {
                return;
            }

            clearInterval(timerID);
            timerID = null;
        }

        function isRunning() {
            return timerID != null;
        }

        return {
            isRunning: isRunning,
            getDelay: getDelay,
            setDelay: setDelay,
            reset: reset,
            start: start,
            stop: stop
        };
    }

    //TODO: Refactor.
    ris.interruptableIntervalTimer = function() {
        ris.intervalTimer.apply(this);

        var _interruptions = 0;
        var _resume = false;

        this.enterInterrupt = function() {
            if (_interruptions++ == 0) {
                _resume = this.isRunning();
            }
            this.stop();
        };

        this.leaveInterrupt = function() {
            if (--_interruptions == 0) {
                if (_resume) {
                    this.start();
                }
            }
            if (_interruptions < 0) {
                throw new Error('Interruptions are below 0.');
            }
        };
    };
    ris.interruptableIntervalTimer.prototype.constructor = new ris.intervalTimer();
})(jQuery);