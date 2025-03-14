(function ($, window, undefined) {
    var debugModules = zpDebugProxy('debug modules');
    var isDebugging = zpTestDebugMode('debug') || zpTestDebugMode('modules');

    // Wrapped due to repeated use.
    window.getUrnSpecification = function (ns, urn) {
        if (urn) {
            if (typeof urn === 'string') {
                urn = ZillionParts.Utility.ParseUrn(urn);
            }
            if (urn.namespace === ns) {
                return urn.specification;
            } else {
                console.log('getUrnSpecification: Expected namespace ' + ns + ' instead of ' + urn.namespace);
            }
        }

        return null;
    };
    var reqCountView = 0, reqCountGetData = 0, reqCountQueryData = 0, reqCountContent = 0, reqCountTask = 0;
    $(window).on('mousedown', function () { reqCountView = 0, reqCountGetData = 0, reqCountQueryData = 0, reqCountContent = 0, reqCountTask = 0; isDebugging && updateDebugCounters(); });
    var reqCountEl;
    function updateDebugCounters() {
        $(function() {
            if (!reqCountEl) {
                reqCountEl = document.createElement('span');
                reqCountEl.style.position = 'absolute';
                reqCountEl.style.top = '0px';
                reqCountEl.style.right = '0px';
                reqCountEl.style.color = '#fff';
                reqCountEl.style.padding = '0 6px';
                reqCountEl.style.zIndex = 9999;
                document.body.appendChild(reqCountEl);
            }

            var total = reqCountView + reqCountGetData + reqCountQueryData + reqCountContent + reqCountTask;
            var snap = { views: reqCountView, contents: reqCountContent, contentProvidersGet: reqCountGetData, contentProvidersQuery: reqCountQueryData, tasks: reqCountTask };

            reqCountEl.innerHTML = locfmt('v:{views} cpg:{contentProvidersGet} cpq:{contentProvidersQuery} t:{tasks}', snap);
            reqCountEl.style.backgroundColor = 'hsl('+(((180+total*12)%360))+',100%,40%)';
            reqCountEl.style.opacity = total ? 1 : 0.1;
        });
    }
    function onViewRequest() {
        reqCountView++;
        isDebugging && updateDebugCounters();
    }
    function onDataQueryRequest() {
        reqCountQueryData++;
        isDebugging && updateDebugCounters();
    }
    function onDataGetRequest() {
        reqCountGetData++;
        isDebugging && updateDebugCounters();
    }
    function onContentRequest() {
        reqCountContent++;
        isDebugging && updateDebugCounters();
    }
    function onTaskRequest() {
        reqCountTask++;
        isDebugging && updateDebugCounters();
    }

    window.Modules = {
        Template: template,
        Task: task,
        ContentProvider: contentProvider,
        ContentProviderSource: contentProviderSource,
        ContentUrl: contentUrl,
        Activity: activity,
        Process: process,
        ToJS: function (vm, props) {
            if (props) {
                return ZillionParts.Data.Grab(ko.mapping.toJS(vm), props);
            } else {
                return ko.mapping.toJS(vm);
            }
        },
        ToVM: function (vm, ext) {
            if (ext) {
                return $.extend(true, ko.mapping.fromJS(vm), ext);
            } else {
                return ko.mapping.fromJS(vm);
            }
        },
        UpdateVM: function (vm, update, ext) {
            vm = ko.mapping.fromJS(update, vm);
            if (ext) {
                $.extend(true, vm, ext);
            }
            return vm;
        }
    };

    var _templates = {};

    function resolveUrl(moduleUri) {
        var a = new ZillionParts.Utility.ParseUri(moduleUri);
        var p = a.path.split('/', 3);
        return ZillionRis.ApiUrl('modules/' + p[1] + '/' + a.host + '/' + p[2] + (window.culture ? '?l=' + window.culture : ''));
    }

    function contentUrl(moduleUri) {
        if (/content/.test(moduleUri)) {
            return resolveUrl(moduleUri);
        } else {
            throw new Error('Requires content to be in the module URI.');
        }
    }

    function dup(d) {
        var def = $.Deferred();

        d.then(function(x) {
            def.resolve($(x).clone());
        }, function(x) {
            def.reject(x);
        });

        return def.promise();
    }

    function template(moduleUri) {
        if (!isDebugging) {
            t = window.sessionStorage.getItem(moduleUri);
            if (t) {
                return $.Deferred().resolve($(t)).promise();
            }
        }

        var t = _templates[moduleUri];
        if (!t) {
            var key = moduleUri + (window.culture ? '?l=' + window.culture : '');
            var url = resolveUrl(key);
            var d = $.Deferred();

            onViewRequest();

            $.ajax({ url: url })
                .then(function(h) {
                    d.resolve($(h));
                    window.sessionStorage.setItem(key, h);
                }, function() {
                    console.log('Modules: Failed to load template ' + moduleUri);
                    delete _templates[moduleUri];
                    d.reject();
                });

            _templates[moduleUri] = t = d.promise();
        } 

        return dup(t);
    }

    var taskHandlers = {
        'success': function (d, h) {
            d.resolve(h.data);
        },
        'dataset-h': function (d, h) {
            d.resolve(unwrapData(h.data));
        },
        'contentprovider': function (d, h) {
            d.resolve({ metadata: h.metadata, items: h.data });
        },
        'contentprovider-h': function (d, h) {
            d.resolve({ metadata: h.metadata, items: unwrapData(h.data) });
        },
        'command': function (d, h) {
            ZillionRis.CommandManager.execute(h['method'], h['params'] && h['params'][0])
                .then(function (a) {
                    d.resolve(a);
                }, function (a) {
                    d.reject(a);
                });
        }
    };

    var loggingOut = false;

    function logOut() {
        if (!loggingOut) {
            loggingOut = true;
            $('#Document').css({ opacity: 0.2 });
            alert(locfmt('{ris,LoggedOutFromRis}'));
            window.location = ZillionRis.ApiUrl('../Login.aspx?reason=unauthorized');
        }
    }

    function task(moduleUri, action, data, options) {
        if (isDebugging) {
            var time = Date.now();
            console.log('<< Requesting ' + moduleUri + '[' + action + ']', data);
        }

        var url = resolveUrl(moduleUri);
        var json = JSON.stringify({ Component: action, Data: data, OriginPage: window.pageAccessKey });

        var d = $.Deferred();

        var async = true;
        if (options && options.hasOwnProperty("async")) {
            async = options.async;
        }

        onTaskRequest();
        $.ajax({ url: url, data: json, type: 'POST', jsonp: false, dataType: 'json', async: async })
            .then(function (h) {
                if (isDebugging) {
                    if (h.type === 'error') {
                        console.error('>> Response ' + (Date.now() - time) + 'ms ' + moduleUri + '[' + action + ']', h);
                    } else {
                        console.log('>> Response ' + (Date.now() - time) + 'ms ' + moduleUri + '[' + action + ']', h);
                    }
                }
            var taskHandler = taskHandlers[h.type] || taskHandlers['error'];
                if (taskHandler) {
                    taskHandler(d, h);
                } else {
                    d.reject(h.data);
                }
            }, function (h) {
                if (h.status === 403) {
                    logOut();
                } else {
                    console.log('Modules: Failed to ' + action + ' task ' + moduleUri);
                    d.reject({ error: true, communicationError: true, message: 'Communication error.' });
                }
            });

        return d.promise();
    }
    function taskInternal(moduleUri, action, data) {
        var url = resolveUrl(moduleUri);
        var d = $.Deferred();

        onTaskRequest();
        $.ajax({ url: url, data: JSON.stringify({ Component: action, Data: data }), type: 'POST', jsonp: false, dataType: 'json' })
            .then(function (h) {
                if (h.type === 'success') {
                    d.resolve(h.data, h.View);
                } else if (h.type === 'dataset-h') {
                    d.resolve(unwrapData(h.data), h.View);
                } else {
                    d.reject(h.data);
                }
            }, function (h) {
                if (h.status === 403) {
                    logOut();
                } else {
                    console.log('Modules: Failed to ' + action + ' task ' + moduleUri);
                    d.reject({ error: true, communicationError: true, message: 'Communication error.' });
                }
            });

        return d.promise();
    }

    function contentProvider(moduleUri, action, data) {
        var url = resolveUrl(moduleUri);
        var d = $.Deferred();

        switch (action) {
        case 'get':
            onDataGetRequest();
            break;
        case 'query':
            onDataQueryRequest();
            break;
        default:
            onTaskRequest();
            break;
        }
        var xhr = $.ajax({ url: url, data: JSON.stringify({ Component: action, Data: data, OriginPage: window.pageAccessKey }), type: 'POST', dataType: 'json' });
        xhr.then(function (h) {
                if (h.type === 'success') {
                    d.resolve(h.data);
                } else if (h.type === 'dataset-h') {
                    d.resolve(unwrapData(h.data));
                } else if (h.type === 'contentprovider') {
                    d.resolve({ metadata: h.metadata, items: h.data });
                } else if (h.type === 'contentprovider-h') {
                    d.resolve({ metadata: h.metadata, items: unwrapData(h.data) });
                } else {
                    d.reject(h.data);
                }
            }, function (h) {
                if (h.status === 403) {
                    logOut();
                } else {
                    console.log('Modules: Failed to ' + action + ' content provider ' + moduleUri);
                    d.reject({ error: true, communicationError: true, message: 'Communication error.' });
                }
            });

        // Content query can be aborted.
        var promise = d.promise();
        promise.abort = function () {
            return xhr.abort();
        };
        return promise;
    }
    function contentProviderSource(moduleUri, options) {
        return new ContentProviderSource2(moduleUri, options);
    }

    function activity(moduleUri, options) {
        var d = $.Deferred();
        var opt = $.extend(true, {
            launchOptions: null,
            requires: [],
            host: 'overlay'
        }, options);

        var preventNav = function () {
            return 'Your current information will be lost, if you continue.';
        };

        if (!opt.NotShowDialogBeforeLeaving) {
            $(window).on('beforeunload', preventNav);
        }
        
        d.always(function () {
            $(window).off('beforeunload', preventNav);
        });
        var $body = $('body');
        var beforeClose = (function () {
            var handlers = [];
            return {
                subscribe: function (f) {
                    handlers.push(f);
                    return {
                        unsubscribe: function () {
                            handlers = handlers.qWhere('$item !== $params', f);
                        }
                    };
                },
                invoke: function (resolving) {
                    return $.Deferred.serialize(handlers.qSelect('$item.bind(undefined, $params)', resolving));
                }
            };
        })();

        var container;
        if (opt.host === 'subnav') {
            container = $('<div><div modules-template="{{moduleUri}}" modules-template-launch="launchOptions" modules-template-scope="activityScope" modules-template-focus="true"><span>One moment ...</span></div></div>');
            $body.append(container);
            container.pageSubNav({
                close: function () {
                    d.reject();
                },
                beforeClose: function () {
                    return beforeClose.invoke(false);
                }
            });
        } else {
            container = $('<div class="overlay" style="" tabindex="0" zp-fluids="window"></div>');
            var overlay = $('<div class="overlay-light clickable" style="z-index: auto" ng-click="closeActivity();"></div>');
            var center = $('<div style="top: 50%; left: 50%; position: fixed"></div>');
            var hosta = $('<div ui-center></div>');
            var hostb = $('<div style="position: relative"></div>');
            var host = $('<div modules-template="{{moduleUri}}" modules-template-launch="launchOptions" modules-template-scope="activityScope" modules-template-focus="true"><span style="font: 400 50pt/50pt \'Segoe UI\', Arial; color: #fff; white-space: nowrap">one moment</span></div>');
            var closeText = $('<div class="overlay-close clickable" style="z-index: 1; text-align: center; position: absolute; top: -3.5em" ng-click="closeActivity();"><span class="overlay-close-text clickable">' + locfmt('{ris,Activity_ClickHereToClose}') + '</span></div>');

            container.append(overlay);
            container.append(center);
            center.append(hosta);
            hosta.append(hostb);
            hostb.append(host);
            hostb.append(closeText);
            $body.append(container);

            container.css({ zIndex: ZillionParts.zIndex() });

            setTimeout(function () {
                overlay.hover(function () { closeText.addClass('hover'); }, function () { closeText.removeClass('hover'); });
            });

            container.on('keydown', function (e) {
                if (e.keyCode == $.ui.keyCode.ESCAPE) {
                    beforeClose.invoke(false).then(function () {
                        d.reject();
                    });
                }
            });
        }

        function convertAngularToJQueryPromise(ngPromise) {
            var d = $.Deferred();
            ngPromise.then(function () {
                d.resolve();
            }, function (error) {
                d.reject(error);
            });
            return d.promise();
        }

        var injector = angular.bootstrap(container, ['ris', 'ui.ris', ['$provide', function ($provide) {
            $provide.value('beforeClose', {
                subscribe: function (handler) {
                    return beforeClose.subscribe(function (resolving) {
                        return convertAngularToJQueryPromise(handler(resolving));
                    });
                }
            });
        }]].concat(opt.requires));

        injector.invoke(function ($rootScope) {
            $rootScope.$apply(function () {
                if (opt.launchOptions) {
                    $.extend(true, $rootScope, { launchOptions: opt.launchOptions });
                }
                if (opt.scope) {
                    $.extend(true, $rootScope, { activityScope: opt.scope });
                }
                $rootScope.moduleUri = moduleUri;

                // HACK
                opt && opt.scope && opt.scope.HackCallback && $rootScope.$watch(opt.scope.HackCallback);

                $rootScope.closeActivity = function () {
                    beforeClose.invoke(false).then(function () {
                        d.reject();
                    });
                };
                $rootScope.resolveActivity = function () {
                    beforeClose.invoke(true).then(function () {
                        d.resolve();
                    });
                };
                $rootScope.$on('activity.finish', function (s, e) {
                    $rootScope.resolveActivity();
                });
                $rootScope.$on('activity.cancel', function (s, e) {
                    $rootScope.closeActivity();
                });
            });
        });

        d.always(function () {
            angular.element(container).scope().$destroy();
            angular.element(container).remove();
        });

        if (opt.host === 'subnav') {
            container.pageSubNav('show');
        }
        else {
            setTimeout(function () {
                container.focus();
            });
        }

        return d.promise();
    }

    function process(moduleUri, options) {
        var d = $.Deferred();
        var opt = $.extend(true, {
            request: null,
            requires: [],
            host: 'overlay'
        }, options);

        taskInternal(moduleUri, 'request', opt.request)
            .then(function (data, view) {
                Modules.Activity(view, { launchOptions: data, requires: opt.requires, host: opt.host })
                    .then(function (x) {
                        d.resolve(x);
                    }, function () {
                        d.reject();
                    });
            }, function () {
                d.reject();
            });

        return d;
    }

    function unwrapDataOld(data) {
        var t = new Date();
        var c = data[0];
        var pc = data[1];
        var p = data.slice(2, 2 + pc);
        var d = data.slice(2 + pc);

        var r = [];
        for (var j = 0; j < c; j++) {
            var ri = {};
            for (var i = 0; i < pc; i++) {
                ri[p[i]] = d[j * pc + i];
            }
            r.push(ri);
        }

        t = new Date() - t;
        if (t > 20) {
            console.log('Unwrapping took ' + t + 'ms!');
        }
        return r;
    }
    function unwrapData(data) {
        // This version is faster, atleast in Chrome.
        var t = new Date();
        var c = data[0];
        var pc = data[1];
        var p = data.slice(2, 2 + pc);
        var d = data.slice(2 + pc);

        var s = [];

        for (var i = 0; i < pc; i++) {
            s.push('this.' + p[i] + ' = $d[$i + ' + i + '];');
        }
        var factory = new Function('$d', '$i', s.join(''));

        var r = [];
        for (var j = 0; j < c; j++) {
            r.push(new factory(d, j * pc));
        }

        t = new Date() - t;
        if (t > 20) {
            console.log('Unwrapping took ' + t + 'ms!');
        }
        return r;
    }
})(jQuery, window);