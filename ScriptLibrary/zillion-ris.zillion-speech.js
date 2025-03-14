(function($) {
    $.extend(true, window, {
        ZillionRis: {
            ZillionSpeech: {
                ConfigViewModel: configurationViewModel
            }
        }
    });

    function configurationViewModel(defaults) {
        var self = this;

        defaults = defaults || { };

        self.ServiceUrl = ko.observable();
        self.UserName = ko.observable();
        self.ConText = ko.observable();
        self.Language = ko.observable();
        self.SMApi = ko.observable();
        self.DataSync = ko.observable();

        self.reset = function() {
            self.ServiceUrl(defaults.ServiceUrl);
            self.UserName(defaults.UserName);
            self.ConText(defaults.ConText);
            self.Language(defaults.Language);
            self.SMApi(defaults.SMApi && data.SMApi[0]);
            self.DataSync(defaults.DataSync && data.DataSync[0]);
        };

        self.load = function() {
            ZillionRis.UserSettings.get("zillionspeech", "configuration")
                .then(function(data) {
                    if (data === null) {
                        return;
                    }

                    self.ServiceUrl(data.ServiceUrl);
                    self.UserName(data.UserName);
                    self.ConText(data.ConText);
                    self.Language(data.Language);
                    self.SMApi(data.SMApi && data.SMApi[0]);
                    self.DataSync(data.DataSync && data.DataSync[0]);
                });
        };

        self.save = function() {
            var data = ko.toJS(self);
            data.SMApi = [data.SMApi];
            data.DataSync = [data.DataSync];
            ZillionRis.UserSettings.set("zillionspeech", "configuration", data).then(function() { alert('Zillion Speech configuration has been saved.'); });
        };
    }
})(jQuery);