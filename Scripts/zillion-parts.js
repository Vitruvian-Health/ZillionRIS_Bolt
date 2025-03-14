(function($, window, undefined) {

var ZillionParts = window.ZillionParts;
if (!ZillionParts) {
    ZillionParts = window.ZillionParts = {
        Version: '2.4.4'
    };
}


// Special for <= IE8.
if ('now' in Date === false) {
    Date.now = function () { return new Date().getTime(); };
}

window.assertTrue = function(cond, err) {
    if (!cond) {
        throw new Error('Assertion failed: ' + err);
    }
};
window.returnInputValue = function(x) { return x; };
window.notImplemented = function() { throw new Error('Not implemented.'); };
window.alwaysFalse = function() { return false; };
window.alwaysTrue = function() { return true; };
window.always = function (x) { return window.returnInputValue.bind(window, x); };
var createDigitToken6 = window.createDigitToken6 = function() {
    return '' + (1000 + (Math.random() * 8999) | 0) + (10 + (Date.now() % 89) | 0);
};
var createDigitToken8 = window.createDigitToken8 = function() {
    return '' + (1000 + (Math.random() * 8999) | 0) + (1000 + (Date.now() % 8999) | 0);
};
var createDigitToken12 = window.createDigitToken12 = function() {
    return '' + (10000000 + (Math.random() * 89999999) | 0) + (1000 + (Date.now() % 8999) | 0);
};

if (!Function.prototype.zpImpl) {
    Function.prototype.zpImpl = function(parentClassOrObject) {
        if (parentClassOrObject.constructor == Function) {
            //Normal Inheritance
            this.prototype = new parentClassOrObject;
            this.prototype.constructor = this;
            this.prototype.parent = parentClassOrObject.prototype;
        } else {
            //Pure Virtual Inheritance
            this.prototype = parentClassOrObject;
            this.prototype.constructor = this;
            this.prototype.parent = parentClassOrObject;
        }
        return this;
    };
}


function zpClass() {
    this._name = null;
    this._inherits = [];
    this._publics = [];
    this._constructor = null;
}

var anonymousCounter = 0, zpClassContext = { cIndex: 0 };
zpClass.prototype = {
    name: function(name) {
        this._name = name;
        return this;
    },
    inherits: function(other, baseCall) {
        this._inherits = [[other, baseCall]];
        return this;
    },
    proto: function(defintion) {
        this._publics = [defintion];
        return this;
    },
    constructor: function(f) {
        this._constructor = f;
        return this;
    },
    end: function() {
        var inherits = this._inherits;
        var publics = this._publics;
        var fnConstructor = this._constructor;

        var constructors = [];

        var name = this._name || ('Anonymous' + (++anonymousCounter));

        if (fnConstructor) {
            constructors.push(fnConstructor);
        }

        var constructorCalls = [];
        for (var j = 0, jj = constructors.length; j < jj; j++) {
            constructorCalls.push('_constructor[' + j + '].apply(this, arguments);');
        }

        var inherit = inherits[0] && inherits[0][0];
        var typeBody = [
            'var f = function ' + name + '() { ' + constructorCalls.join('') + ' };',
            inherit ? 'f.prototype = new _c();' : 'f.prototype = {};',
            'for (i = 0, ii = _publics.length; i < ii; i++) $.extend(true, f.prototype, _publics[i]);',
//            'for (i = 0, ii = _constructor.length; i < ii; i++) _constructor[i].apply(f.prototype, []);',
            'return f;'
        ];

        var type = new Function('_context', '_publics', '_constructor', '_c', typeBody.join(''))(zpClassContext, publics, constructors, inherit);
        return type;
    }
};
window.zpClass = function(name) { return new zpClass().name(name); };

window.zpProperty = function(initialValue) {
    var value = initialValue, listeners = [];

    var onChange = function(newValue, oldValue) {
        var list = listeners.slice(0), item;
        for (var i = 0, ii = list.length; i < ii; i++) {
            item = list[i];
            if (item.enabled) {
                item.callback(newValue, oldValue);
            }
        }
    };
    var object;
    object = function() {
        if (arguments.length === 0) {
            return object.read();
        } else if (arguments.length === 1) {
            var x = arguments[0];
            var oldValue = object.read();
            object.write(x);
            onChange(x, oldValue);
            return oldValue;
        }
    };
    object.read = function() {
        return value;
    };
    object.write = function(val) {
        value = val;
    };
    object.subscribe = function(x) {
        listeners.push({ enabled: true, callback: x });
    };
    object.unsubscribe = function(x) {
        var keep = listeners.qWhere('callback !== $params', x);
        var remove = listeners.qWhere('callback === $params', x);

        for (var i = 0, ii = remove.length; i < ii; i++) {
            remove[i].enabled = false;
        }

        listeners = keep;
    };

    return object;
};
window.zpProperty.custom = function(r, w) {
    var res = new zpProperty();
    res.read = r;
    res.write = w;
    return res;
};
window.zpProperty.read = function(x) {
    if (x instanceof window.zpProperty) {
        return x();
    } else {
        return x;
    }
};
window.zpSelectProperties = function(obj, selectPredicate, params) {
    var u = undefined, r = [];
    selectPredicate = predicateIIP(selectPredicate) || returnInputValue;
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            var value = selectPredicate(obj[x], x, params);

            if (value !== u) {
                r.push(value);
            }
        }
    }
    return r;
};
window.zpForEachProperty = function(obj, forEachCallback, params) {
    forEachCallback = predicateIIP(forEachCallback) || alwaysTrue;
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            var value = forEachCallback(obj[x], x, params);
            if (value === false) {
                break;
            }
        }
    }
};

window.newString = function(l, c) {
    var r = '';
    while (l-- > 0) {
        r += c;
    }
    return r;
};

//////////////////////////////////////////////////
// Enter qArray
var predicateIIP, predicateLRP, FunctionCache, alwaysEqualLR = function(l, r) { return l === r; };
(function() {
    var predicateIIPCacheEnabled = true,
        predicateIIPCacheE = {}, predicateIIPLastKeyE = '', predicateIIPLastE = null,
        predicateIIPCacheO = {}, predicateIIPLastKeyO = '', predicateIIPLastO = null,
        predicateLRPCache = {}, predicateLRPCacheLastKey = '', predicateLRPCacheLast = null,
        predicateIIPCompileCount = 0,
        predicateIIPCacheCount = 0,
        predicateIIPCacheHitCount = 0,
        predicateIIPCacheHitPlusCount = 0,
        predicateIIPCacheMissCount = 0,
        funcCacheInstanceCount = 0,
        funcCacheCompileCount = 0,
        funcCacheCacheCount = 0,
        funcCacheHitCount = 0,
        funcCacheMissCount = 0;

    zpExport({
        ArrayQuery: {
            Statistics: function() {
                console.log('Predicate compile count: ' + predicateIIPCompileCount);
                console.log('Predicate cache count: ' + predicateIIPCacheCount);
                console.log('Predicate cache hit count: ' + predicateIIPCacheHitCount);
                console.log('Predicate cache hit+ count: ' + predicateIIPCacheHitPlusCount);
                console.log('Predicate cache miss count: ' + predicateIIPCacheMissCount);
                console.log('Function instance count: ' + funcCacheInstanceCount);
                console.log('Function compile count: ' + funcCacheCompileCount);
//                console.log('Function cache count: ' + funcCacheCacheCount);
                console.log('Function cache hit count: ' + funcCacheHitCount);
//                console.log('Function cache miss count: ' + funcCacheMissCount);
            },
            PredicateCache: function(enable) {
                predicateIIPCacheEnabled = !!enable;
                predicateIIPCacheE = predicateIIPCacheEnabled ? {} : null;
                predicateIIPCacheO = predicateIIPCacheEnabled ? {} : null;
                predicateIIPCacheCount = predicateIIPCacheHitCount = predicateIIPCacheHitPlusCount = predicateIIPCacheMissCount = 0;
                funcCacheCacheCount = funcCacheHitCount = funcCacheMissCount = 0;
            }
        }
    });

    setInterval(function() {
        var total = (funcCacheCacheCount + predicateIIPCacheCount);
        if (total > 100) {
            zpError('Predicate + function cache above 100! ' + total);
        }
    }, 30000);


    FunctionCache = function() {
        funcCacheInstanceCount++;

        var _cacheE = {};
        var _cacheO = {};
        var _lastKeyE, _lastE;
        var _lastKeyO, _lastO;
        var _tempFunction;
        this.get = function (script, params) {
            // Split the cache in two.
            var e = (script.length % 2) === 0;
            if (e) {
                if (_lastKeyE === script) {
                    return _lastE;
                }
                _tempFunction = _cacheE[script];
                if (!_tempFunction) {
                    params = params.concat([script]);
                    _tempFunction = Function.constructor.apply(null, params);
                    funcCacheCompileCount++;
                    _cacheE[script] = _tempFunction;
                    funcCacheCacheCount++;
                    funcCacheMissCount++;
                } else {
                    funcCacheHitCount++;
                }

                _lastKeyE = script;
                _lastE = _tempFunction;
                return _tempFunction;
            } else {
                if (_lastKeyO === script) {
                    return _lastO;
                }
                _tempFunction = _cacheO[script];
                if (!_tempFunction) {
                    params = params.concat([script]);
                    _tempFunction = Function.constructor.apply(null, params);
                    funcCacheCompileCount++;
                    _cacheO[script] = _tempFunction;
                    funcCacheCacheCount++;
                    funcCacheMissCount++;
                } else {
                    funcCacheHitCount++;
                }

                _lastKeyO = script;
                _lastO = _tempFunction;
                return _tempFunction;
            }
        };
    };

    var iipParams = '$item, $index, $params';
    var quickReplaceTest = /^\s*[a-z][a-z0-9]+\s*$/i;
    var extractRootProperties = /(^|[\s\:\[\(])(?![\.])([$_a-z][a-z0-9$_]*)([\.\[\(\)\]\s\,]+|$)/gi;
    var outOfWith = ['$item', '$index', '$params', 'window', 'undefined', 'true', 'false', 'Object', 'Number', 'String', 'document'];
    predicateIIP = function(callback) {
        if (typeof callback === 'string') {
            var key = callback;
            var keyEven = (key.length % 2) === 0;
            var cache = keyEven ? predicateIIPCacheE : predicateIIPCacheO;
            var existing;

            if (cache) {
                // Quick Cache.
                if (keyEven) {
                    if (predicateIIPLastKeyE === key) {
                        ++predicateIIPCacheHitPlusCount;
                        return predicateIIPLastE;
                    }
                } else {
                    if (predicateIIPLastKeyO === key) {
                        ++predicateIIPCacheHitPlusCount;
                        return predicateIIPLastO;
                    }
                }

                // Large Cache.
                existing = cache[key];
                if (existing) {
                    ++predicateIIPCacheHitCount;
                    if (keyEven) {
                        predicateIIPLastKeyE = key;
                        predicateIIPLastE = existing;
                    } else {
                        predicateIIPLastKeyO = key;
                        predicateIIPLastO = existing;
                    }
                    return existing;
                }
                ++predicateIIPCacheMissCount;
            }

            // Compile.
//            if (quickReplaceTest.test(callback)) {
//                callback = new Function(iipParams, 'return ($item.' + callback + ');');
//            } else if (extractRootProperties.test(callback)) {
////                console.log('FROM: ' + callback);
//                // Try to optimize the with statement.
//                try {
//                    var replace = callback.replace(extractRootProperties, function(a, b, c, d) {
//                        if (outOfWith.indexOf(c) === -1) {
//                            return b + '$item.' + c + d;
//                        } else {
//                            return b + c + d;
//                        }
//                    });
////                    console.log('TO:   ' + replace);
//                    callback = new Function(iipParams, 'return (' + replace + ');');
//                } catch (ex) {
//                    zpTrace('Unable to optimize this predicate: ' + callback);
//                    callback = new Function(iipParams, 'with ($item) { return (' + callback + '); }');
//                }
//            } else {
                callback = new Function(iipParams, 'with ($item) { return (' + callback + '); }');
//            }
            ++predicateIIPCompileCount;

            // Put Cache
            if (cache) {
                cache[key] = callback;
                ++predicateIIPCacheCount;

                if (keyEven) {
                    predicateIIPLastKeyE = key;
                    predicateIIPLastE = callback;
                } else {
                    predicateIIPLastKeyO = key;
                    predicateIIPLastO = callback;
                }
            }
        }

        return callback;
    };
    predicateLRP = function(callback) {
        if (typeof callback === 'string') {
            var predicateLRPCacheKey = callback;
            var predicateLRPCacheItem;
            if (predicateLRPCache) {
                predicateLRPCacheItem = predicateLRPCache[predicateLRPCacheKey];
                if (predicateLRPCacheItem) {
                    ++predicateIIPCacheHitCount;
                    return predicateLRPCacheItem;
                }
                ++predicateIIPCacheMissCount;
            }

            callback = new Function('$left, $right, $params', 'return (' + callback + ');');
            ++predicateIIPCompileCount;

            if (predicateLRPCache) {
                predicateLRPCache[predicateLRPCacheKey] = callback;
                ++predicateIIPCacheCount;
            }
        }

        return callback;
    };
})();

/**
 * UAParser.js v0.7.8
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2015 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 & MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION = '0.7.8',
        EMPTY = '',
        UNKNOWN = '?',
        FUNC_TYPE = 'function',
        UNDEF_TYPE = 'undefined',
        OBJ_TYPE = 'object',
        STR_TYPE = 'string',
        MAJOR = 'major', // deprecated
        MODEL = 'model',
        NAME = 'name',
        TYPE = 'type',
        VENDOR = 'vendor',
        VERSION = 'version',
        ARCHITECTURE = 'architecture',
        CONSOLE = 'console',
        MOBILE = 'mobile',
        TABLET = 'tablet',
        SMARTTV = 'smarttv',
        WEARABLE = 'wearable',
        EMBEDDED = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend: function (regexes, extensions) {
            for (var i in extensions) {
                if ("browser cpu device engine os".indexOf(i) !== -1 && extensions[i].length % 2 === 0) {
                    regexes[i] = extensions[i].concat(regexes[i]);
                }
            }
            return regexes;
        },
        has: function (str1, str2) {
            if (typeof str1 === "string") {
                return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
            } else {
                return false;
            }
        },
        lowerize: function (str) {
            return str.toLowerCase();
        },
        major: function (version) {
            return typeof (version) === STR_TYPE ? version.split(".")[0] : undefined;
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx: function () {

            var result, i = 0, j, k, p, q, matches, match, args = arguments;

            // loop through all regexes maps
            while (i < args.length && !matches) {

                var regex = args[i],       // even sequence (0,2,4,..)
                    props = args[i + 1];   // odd sequence (1,3,5,..)

                // construct object barebones
                if (typeof result === UNDEF_TYPE) {
                    result = {};
                    for (p in props) {
                        q = props[p];
                        if (typeof q === OBJ_TYPE) {
                            result[q[0]] = undefined;
                        } else {
                            result[q] = undefined;
                        }
                    }
                }

                // try matching uastring with regexes
                j = k = 0;
                while (j < regex.length && !matches) {
                    matches = regex[j++].exec(this.getUA());
                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        result[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        result[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        result[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        result[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                    result[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                result[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            return result;
        },

        str: function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser: {
            oldsafari: {
                version: {
                    '1.0': '/8',
                    '1.2': '/1',
                    '1.3': '/3',
                    '2.0': '/412',
                    '2.0.2': '/416',
                    '2.0.3': '/417',
                    '2.0.4': '/419',
                    '?': '/'
                }
            }
        },

        device: {
            amazon: {
                model: {
                    'Fire Phone': ['SD', 'KF']
                }
            },
            sprint: {
                model: {
                    'Evo Shift 4G': '7373KT'
                },
                vendor: {
                    'HTC': 'APA',
                    'Sprint': 'Sprint'
                }
            }
        },

        os: {
            windows: {
                version: {
                    'ME': '4.90',
                    'NT 3.11': 'NT3.51',
                    'NT 4.0': 'NT4.0',
                    '2000': 'NT 5.0',
                    'XP': ['NT 5.1', 'NT 5.2'],
                    'Vista': 'NT 6.0',
                    '7': 'NT 6.1',
                    '8': 'NT 6.2',
                    '8.1': 'NT 6.3',
                    '10': ['NT 6.4', 'NT 10.0'],
                    'RT': 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser: [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80

        ], [NAME, VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
        ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron
        ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i,                        // IE11
            /(Edge)\/((\d+)?[\w\.]+)/i                                          // IE12
        ], [[NAME, 'IE'], VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
        ], [[NAME, 'Yandex'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
        ], [[NAME, /_/g, ' '], VERSION], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i,
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            /(uc\s?browser|qqbrowser)[\/\s]?([\w\.]+)/i
                                                                                // UCBrowser/QQBrowser
        ], [NAME, VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
        ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
        ], [[NAME, 'Chrome'], VERSION], [

            /XiaoMi\/MiuiBrowser\/([\w\.]+)/i                                   // MIUI Browser
        ], [VERSION, [NAME, 'MIUI Browser']], [

            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)/i         // Android Browser
        ], [VERSION, [NAME, 'Android Browser']], [

            /FBAV\/([\w\.]+);/i                                                 // Facebook App for iOS
        ], [VERSION, [NAME, 'Facebook']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
        ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
        ], [VERSION, NAME], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
        ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
        ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
        ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
        ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu: [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
        ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
        ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
        ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
        ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
        ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
        ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
        ], [[ARCHITECTURE, util.lowerize]]
        ],

        device: [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
        ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
        ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
        ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
        ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
        ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
        ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
        ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
        ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Huawei/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
        ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
        ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7)/i
        ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
        ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /(?:sony)?(?:(?:(?:c|d)\d{4})|(?:so[-l].+))\sbuild\//i
        ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Phone'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
        ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
        ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[3portablevi]+)/i                                    // Playstation
        ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
        ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
        ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w+)*/i,                                                    // ZTE
            /(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
                                                                                // Alcatel/GeeksPhone/Huawei/Lenovo/Nexian/Panasonic/Sony
        ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
        ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
        ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
        ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w+)*/i,
            /(XT\d{3,4}) build\//i
        ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
        ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n8000|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
        ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-n900))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
            /sec-((sgh\w+))/i
        ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [
            /(samsung);smarttv/i
        ], [VENDOR, MODEL, [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
        ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [
            /sie-(\w+)*/i                                                       // Siemens
        ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]+)*/i
        ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
        ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
        ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
        ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w+)*/i
        ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
        ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
        ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
        ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
        ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+(\w+)\s+build\/hm\1/i,                                        // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,                   // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus)?[\s_]*(?:\d\w)?)\s+build/i    // Xiaomi Mi
        ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [

            /(mobile|tablet);.+rv\:.+gecko\//i                                  // Unidentifiable
        ], [[TYPE, util.lowerize], VENDOR, MODEL]

            /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(R1001)/i                                                          // Oppo R1001
            ], [MODEL, [VENDOR, 'OPPO'], [TYPE, MOBILE]], [
            /(X9006)/i                                                          // Oppo Find 7a
            ], [[MODEL, 'Find 7a'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [
            /(R2001)/i                                                          // Oppo YOYO R2001
            ], [[MODEL, 'Yoyo R2001'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [
            /(R815)/i                                                           // Oppo Clover R815
            ], [[MODEL, 'Clover R815'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [
             /(U707)/i                                                          // Oppo Find Way S
            ], [[MODEL, 'Find Way S'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            
            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine: [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
        ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
        ], [NAME, VERSION], [

            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
        ], [VERSION, NAME]
        ],

        os: [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
        ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
        ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
        ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
        ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\os|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
        ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
        ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
        ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
        ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids3portablevu]+)/i,                    // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?([\w\.-]+)*/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
            /(gnu)\s?([\w\.]+)*/i                                               // GNU
        ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
        ], [[NAME, 'Chromium OS'], VERSION], [

            // Solaris
            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
        ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
        ], [NAME, VERSION], [

            /(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i             // iOS
        ], [[NAME, 'iOS'], [VERSION, /_/g, '.']], [

            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
        ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
            /(haiku)\s(\w+)/i,                                                  // Haiku
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]+)*/i                                              // UNIX
        ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////


    var UAParser = function (uastring, extensions) {

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;

        this.getBrowser = function () {
            var browser = mapper.rgx.apply(this, rgxmap.browser);
            browser.major = util.major(browser.version);
            return browser;
        };
        this.getCPU = function () {
            return mapper.rgx.apply(this, rgxmap.cpu);
        };
        this.getDevice = function () {
            return mapper.rgx.apply(this, rgxmap.device);
        };
        this.getEngine = function () {
            return mapper.rgx.apply(this, rgxmap.engine);
        };
        this.getOS = function () {
            return mapper.rgx.apply(this, rgxmap.os);
        };
        this.getResult = function () {
            return {
                ua: this.getUA(),
                browser: this.getBrowser(),
                engine: this.getEngine(),
                os: this.getOS(),
                device: this.getDevice(),
                cpu: this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            return this;
        };
        this.setUA(ua);
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME: NAME,
        MAJOR: MAJOR, // deprecated
        VERSION: VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE: ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL: MODEL,
        VENDOR: VENDOR,
        TYPE: TYPE,
        CONSOLE: CONSOLE,
        MOBILE: MOBILE,
        SMARTTV: SMARTTV,
        TABLET: TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME: NAME,
        VERSION: VERSION
    };
    UAParser.OS = {
        NAME: NAME,
        VERSION: VERSION
    };


    ///////////
    // Export
    //////////


    // check js environment
    if (typeof (exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if (typeof (define) === FUNC_TYPE && define.amd) {
            define(function () {
                return UAParser;
            });
        } else {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note: 
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window.jQuery || window.Zepto;
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(this);

$.support.borderRadius = true;

var environmentTests = {};
var uaBrowser = new UAParser().getBrowser();
var uaBrowserName = uaBrowser.name.toLowerCase();
var uaBrowserVersion = parseInt(uaBrowser.major);


// Internet Explorer browser exceptions.
var msie = /^ie$|^ie mobile$/.test(uaBrowserName);
var version = uaBrowserVersion;
if (msie) {
    environmentTests['sbr'] = function() {
        if ($.support.borderRadius) {
            return parseInt(version, 10) == 9;
        }
    };
}

environmentTests['touch'] = function() {
    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch) {
        return true;
    }
};
environmentTests['ie'] = function() {
    if (msie) {
        return true;
    }
};
environmentTests['ie8'] = function() {
    if (msie && version === 8) {
        return true;
    }
};
environmentTests['ie9'] = function() {
    if (msie && version === 9) {
        return true;
    }
};
environmentTests['ie10'] = function() {
    if (msie && version === 10) {
        return true;
    }
};
environmentTests['ie11'] = function() {
    if (msie && version === 11) {
        return true;
    }
};
environmentTests['msedge'] = function () {
    if (msie && version === 12) {
        return true;
    }
};

function runEnvironmentTests() {
    var sessionStorage = window.sessionStorage;
    var test = (sessionStorage && sessionStorage.environmentTest) || '';

    function hasTest(input, key) {
        var r = new RegExp('(\\-|\\+)' + key + '(\\s|$)', 'gi');
        var m = r.exec(test);
        if (m && (m[1] == '+' || m[1] == '-')) {
            if (m[1] == '+') {
                return true;
            } else {
                return false;
            }
        } else {
            return input;
        }
    }

    var support = {};
    // Run the tests and create the support.
    var $html = $('html');
    $.each(environmentTests, function(k, v) {
        var classNames = 'x-' + k.replace(' ', '-').toLowerCase();
        try {
            if (hasTest(!!v(), k)) {
                support[k] = true;
                $html.addClass(classNames);
            } else {
                support[k] = false;
                $html.removeClass(classNames);
            }
        } catch(ex) {
            support[k] = undefined;
            console.log('Zillion Parts - Environment Test ' + k + ': ' + ex);
        }
    });
    zpExport({ Support: support });
}

runEnvironmentTests();
$(function() { runEnvironmentTests(); });

function daysOffset(date, comparand) {
    var day = 1000 * 60 * 60 * 24;
    comparand = (comparand ? comparand : Date.now()).getTime();

    date = Math.floor(date / day);
    comparand = Math.floor(comparand / day);
//    date -= date % day;
//    date /= day;
//    comparand -= comparand % day;
//    comparand /= day;

    return date - comparand;
}

Date.prototype.daysOffsetTo = function(comparand) {
    return daysOffset(this, comparand);
};

// Active Window Tracking.
var activeControlGroups = [];
var windowKey = window.localStorage["ZPWinKey"] = window.sessionStorage["MyZPWinKey"] || (window.sessionStorage["MyZPWinKey"] = 'ZPW' + createDigitToken6());
var isWindowActive = zpProperty(true), windowLastActive = new Date(), windowLastInactive = 0;
$(window).on('blur', function () { isWindowActive(false); windowLastInactive = new Date(); });
$(window).on('focus', function() {
    isWindowActive(true);
    windowLastActive = new Date();

    window.localStorage["ZPWinKey"] = windowKey;
    activeControlGroups.qEach(function(x) {
        window.localStorage["ZPWinKey"+x] = windowKey;
    });
});

zpExport({
    IsWindowActive: isWindowActive,
    IsLastActiveWindow: function (group) {
        var lastActiveWindowKey = window.localStorage["ZPWinKey" + (group || '')];

        if (isWindowActive() && lastActiveWindowKey !== windowKey) {
            window.localStorage["ZPWinKey" + (group || '')] = lastActiveWindowKey = windowKey;
        }

         return lastActiveWindowKey === windowKey;
    }
});

var Localize = (function() {
    var localizeDictionary = {};

    function isAValue(x) {
        return x !== undefined && x !== null;
    }

    function firstApplies(a, b, c) {
        if (isAValue(a)) {
            return a;
        }
        if (isAValue(b)) {
            return b;
        }
        if (isAValue(c)) {
            return c;
        }
        return '';
    }

    function formatLocalize(format, args) {
        args = args || {};

        var message, stack = [];

        message = rep(10, null, format + '');

        function rep(depth, def, text) {
            var replace;
            if (--depth > 0) {
                replace = text.replace(/(\{((\w+)\,)?(\d+|[a-z][a-z0-9_]*)\})/ig, function($0, $1, $2, $dictionary, $key) {
                    var dict, dictName = $dictionary || def, compositeKey, returnValue;
                    if (dictName && (dict = localizeDictionary[dictName])) {
                        compositeKey = dictName + ',' + $key;
                        if (stack.indexOf(compositeKey) === -1) {
                            stack.push(compositeKey);
                            returnValue = rep(depth, dictName, firstApplies(args[$key], dict[$key], $key) + '');
                            stack.pop();
                            return returnValue;
                        } else {
                            stack.push(compositeKey);
                            zpTrace('Localize: Recursive dictionary loop in ' + stack.qSelect('"[" + $item + "]"').join(' -> ') + '.');
                            stack.pop();
                            return firstApplies(args[$key], dict[$key], $key) + '';
                        }
                    } else {
                        compositeKey = $key;
                        if (stack.indexOf(compositeKey) === -1) {
                            stack.push(compositeKey);
                            returnValue = rep(depth, null, firstApplies(args[$key], $key) + '');
                            stack.pop();
                            return returnValue;
                        } else {
                            stack.push(compositeKey);
                            zpTrace('Localize: Recursive loop in ' + stack.qSelect('"[" + $item + "]"').join(' -> ') + '.');
                            stack.pop();
                            return firstApplies(args[$key], $key) + '';
                        }
                    }
                });
            } else {
                zpTrace('Localize: Formatting string to deeply nested: ' + stack.qSelect('"[" + $item + "]"').join(' -> ') + '.');
                return text;
            }
            depth++;
            return replace;
        }

        return message;
    }

    function extendDictionary(dict, value) {
        var d = localizeDictionary[dict] || (localizeDictionary[dict] = {});
        var val;

        for (var k in value) {
            if (value.hasOwnProperty(k)) {
                val = value[k];
                if (typeof val === 'string') {
                    d[k] = val;
                } else {
                    zpTrace('Localize: Attempt to register non string into the dictionary ' + dict + ',' + k + '.');
                }
            }
        }
    }

    function exportDictionary() {
        return $.extend(true, {}, localizeDictionary);
    }

    if (window.console) {
        window.console.logfmt = function(fmt, args) {
            console.log(formatLocalize(fmt, args));
        };
    }

    return { Format: formatLocalize, Extend: extendDictionary, Export: exportDictionary };
})();

$.extend($.ui.dialog, { getTitleId: function (a) {
    a = a.attr("id");
    a || (a = this.uuid += 1);
    return "udt" + a;
} /*, overlay: function (b) {
    this.$el = a.ui.dialog.overlay.create(b)
} */
});

/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function () {
    var token = /d{1,4}|M{1,4}|yy(?:yy)?|([HhmsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        if (date instanceof Date == false) {
            if (date) {
                date = new Date(date);
            } else {
                date = new Date();
            }
        }

        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            M = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            m = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d: d,
                dd: pad(d),
                ddd: dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                M: M + 1,
                MM: pad(M + 1),
                MMM: dF.i18n.monthNames[M],
                MMMM: dF.i18n.monthNames[M + 12],
                yy: String(y).slice(2),
                yyyy: y,
                h: H % 12 || 12,
                hh: pad(H % 12 || 12),
                H: H,
                HH: pad(H),
                m: m,
                mm: pad(m),
                s: s,
                ss: pad(s),
                l: pad(L, 3),
                L: pad(L > 99 ? Math.round(L / 10) : L),
                t: H < 12 ? "a" : "p",
                tt: H < 12 ? "am" : "pm",
                T: H < 12 ? "A" : "P",
                TT: H < 12 ? "AM" : "PM",
                Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
} ();

// Some common format strings
dateFormat.masks = {
    "default":      "ddd MMM dd yyyy HH:mm:ss",
    shortDate:      "M/d/yy",
    mediumDate:     "MMM d, yyyy",
    longDate:       "MMMM d, yyyy",
    fullDate:       "dddd, MMMM d, yyyy",
    shortTime:      "h:mm TT",
    mediumTime:     "h:mm:ss TT",
    longTime:       "h:mm:ss TT Z",
    isoDate:        "yyyy-MM-dd",
    isoTime:        "HH:mm:ss",
    isoDateTime:    "yyyy-MM-dd'T'HH:mm:ss",
    isoUtcDateTime: "UTC:yyyy-MM-dd'T'HH:mm:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

/*!
 * jQuery scrollintoview() plugin and :scrollable selector filter
 *
 * Version 1.9.4 (06 April 2016)
 * Requires jQuery 1.4 or newer
 *
 * Copyright (c) 2011 Robert Koritnik
 * Licensed under the terms of the MIT license
 * http://www.opensource.org/licenses/mit-license.php
 */

!function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'));
    } else {
        factory(root.jQuery);
    }
}
(this, function($) {
    var converter = {
        vertical: { x: false, y: true },
        horizontal: { x: true, y: false },
        both: { x: true, y: true },
        x: { x: true, y: false },
        y: { x: false, y: true }
    };

    var settings = {
        duration: "fast",
        direction: "both",
        viewPadding: 0
    };

    var rootrx = /^(?:html)$/i;

    // gets border dimensions
    var borders = function(domElement, styles) {
        styles = styles || (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(domElement, null) : domElement.currentStyle);
        var px = document.defaultView && document.defaultView.getComputedStyle ? true : false;
        var b = {
            top: (parseFloat(px ? styles.borderTopWidth : $.css(domElement, "borderTopWidth")) || 0),
            left: (parseFloat(px ? styles.borderLeftWidth : $.css(domElement, "borderLeftWidth")) || 0),
            bottom: (parseFloat(px ? styles.borderBottomWidth : $.css(domElement, "borderBottomWidth")) || 0),
            right: (parseFloat(px ? styles.borderRightWidth : $.css(domElement, "borderRightWidth")) || 0)
        };
        return {
            top: b.top,
            left: b.left,
            bottom: b.bottom,
            right: b.right,
            vertical: b.top + b.bottom,
            horizontal: b.left + b.right
        };
    };

    var dimensions = function($element) {
        var elem = $element[0],
            isRoot = rootrx.test(elem.nodeName),
            $elem = isRoot ? $(window) : $element;
        return {
            border: isRoot ? { top: 0, left: 0, bottom: 0, right: 0 } : borders(elem),
            scroll: {
                top: $elem.scrollTop(),
                left: $elem.scrollLeft(),
                maxtop: elem.scrollHeight - elem.clientHeight,
                maxleft: elem.scrollWidth - elem.clientWidth
            },
            scrollbar: isRoot
                ? { right: 0, bottom: 0 }
                : {
                    right: $elem.innerWidth() - elem.clientWidth,
                    bottom: $elem.innerHeight() - elem.clientHeight
                },
            rect: isRoot ? { top: 0, left: 0, bottom: elem.clientHeight, right: elem.clientWidth } : elem.getBoundingClientRect()
        };
    };

    $.fn.extend({
        scrollintoview: function(options) {
            /// <summary>Scrolls the first element in the set into view by scrolling its closest scrollable parent.</summary>
            /// <param name="options" type="Object">Additional options that can configure scrolling:
            ///        duration (default: "fast") - jQuery animation speed (can be a duration string or number of milliseconds)
            ///        direction (default: "both") - select possible scrollings ("vertical" or "y", "horizontal" or "x", "both")
            ///        complete (default: none) - a function to call when scrolling completes (called in context of the DOM element being scrolled)
            /// </param>
            /// <return type="jQuery">Returns the same jQuery set that this function was run on.</return>

            options = $.extend({}, settings, options);
            options.direction = converter[typeof (options.direction) === "string" && options.direction.toLowerCase()] || converter.both;

            if (typeof options.viewPadding == "number") {
                options.viewPadding = { x: options.viewPadding, y: options.viewPadding };
            } else if (typeof options.viewPadding == "object") {
                if (options.viewPadding.x == undefined) {
                    options.viewPadding.x = 0;
                }
                if (options.viewPadding.y == undefined) {
                    options.viewPadding.y = 0;
                }
            }

            var dirStr = "";
            if (options.direction.x === true) dirStr = "horizontal";
            if (options.direction.y === true) dirStr = dirStr ? "both" : "vertical";

            var el = this.eq(0);
            var scroller = el.parent().closest(":scrollable(" + dirStr + ")");

            // check if there's anything to scroll in the first place
            if (scroller.length > 0) {
                scroller = scroller.eq(0);

                var dim = {
                    e: dimensions(el),
                    s: dimensions(scroller)
                };

                var rel = {
                    top: dim.e.rect.top - (dim.s.rect.top + dim.s.border.top),
                    bottom: dim.s.rect.bottom - dim.s.border.bottom - dim.s.scrollbar.bottom - dim.e.rect.bottom,
                    left: dim.e.rect.left - (dim.s.rect.left + dim.s.border.left),
                    right: dim.s.rect.right - dim.s.border.right - dim.s.scrollbar.right - dim.e.rect.right
                };

                var animProperties = {};

                // vertical scroll
                if (options.direction.y === true) {
                    if (rel.top < 0) {
                        animProperties.scrollTop = Math.max(0, dim.s.scroll.top + rel.top - options.viewPadding.y);
                    } else if (rel.top > 0 && rel.bottom < 0) {
                        animProperties.scrollTop = Math.min(dim.s.scroll.top + Math.min(rel.top, -rel.bottom) + options.viewPadding.y, dim.s.scroll.maxtop);
                    }
                }

                // horizontal scroll
                if (options.direction.x === true) {
                    if (rel.left < 0) {
                        animProperties.scrollLeft = Math.max(0, dim.s.scroll.left + rel.left - options.viewPadding.x);
                    } else if (rel.left > 0 && rel.right < 0) {
                        animProperties.scrollLeft = Math.min(dim.s.scroll.left + Math.min(rel.left, -rel.right) + options.viewPadding.x, dim.s.scroll.maxleft);
                    }
                }

                // scroll if needed
                if (!$.isEmptyObject(animProperties)) {
                    var scrollExpect = {},
                        scrollListener = scroller;

                    if (rootrx.test(scroller[0].nodeName)) {
                        scroller = $("html,body");
                        scrollListener = $(window);
                    }

                    function animateStep(now, tween) {
                        scrollExpect[tween.prop] = Math.floor(now);
                    };

                    function onscroll(event) {
                        $.each(scrollExpect, function(key, value) {
                            if (Math.floor(scrollListener[key]()) != Math.floor(value)) {
                                options.complete = null; // don't run complete function if the scrolling was interrupted
                                scroller.stop('scrollintoview');
                            }
                        });
                    }

                    scrollListener.on('scroll', onscroll);

                    scroller
                        .stop('scrollintoview')
                        .animate(animProperties, { duration: options.duration, step: animateStep, queue: 'scrollintoview' })
                        .eq(0) // we want function to be called just once (ref. "html,body")
                        .queue('scrollintoview', function(next) {
                            scrollListener.off('scroll', onscroll);
                            $.isFunction(options.complete) && options.complete.call(scroller[0]);
                            next();
                        })

                    scroller.dequeue('scrollintoview');
                } else {
                    // when there's nothing to scroll, just call the "complete" function
                    $.isFunction(options.complete) && options.complete.call(scroller[0]);
                }
            }

            // return set back
            return this;
        }
    });

    var scrollValue = {
        auto: true,
        scroll: true,
        visible: false,
        hidden: false
    };

    var scroll = function(element, direction) {
        direction = converter[typeof (direction) === "string" && direction.toLowerCase()] || converter.both;
        var styles = (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(element, null) : element.currentStyle);
        var overflow = {
            x: scrollValue[styles.overflowX.toLowerCase()] || false,
            y: scrollValue[styles.overflowY.toLowerCase()] || false,
            isRoot: rootrx.test(element.nodeName)
        };

        // check if completely unscrollable (exclude HTML element because it's special)
        if (!overflow.x && !overflow.y && !overflow.isRoot) {
            return false;
        }

        var size = {
            height: {
                scroll: element.scrollHeight,
                client: element.clientHeight
            },
            width: {
                scroll: element.scrollWidth,
                client: element.clientWidth
            },
            // check overflow.x/y because iPad (and possibly other tablets) don't dislay scrollbars
            scrollableX: function() {
                return (overflow.x || overflow.isRoot) && this.width.scroll > this.width.client;
            },
            scrollableY: function() {
                return (overflow.y || overflow.isRoot) && this.height.scroll > this.height.client;
            }
        };
        return direction.y && size.scrollableY() || direction.x && size.scrollableX();
    };

    $.expr[":"].scrollable = $.expr.createPseudo(function(direction) {
        return function(element) {
            return scroll(element, direction);
        };
    });
});

function zpExport(what) {
    $.extend(true, ZillionParts, what);
//    var target = ZillionParts, name, src, value;
//    for (name in what) {
//        if (what.hasOwnProperty(name)) {
//            src = target[name];
//            value = what[name];

//            if (value === undefined || target === value || src === value) {
//                continue;
//            }

//            target[name] = value;
//        }
//    }
}

zpExport({
    Condition: condition,
    Data: {
        ArrayQuery: ArrayQuery,
        UnpackHArray: unpackHomogeneousArray,
        PackHArray: packHomogeneousArray,
        FilterArray: arrayFilter,
        MatchObject: objectFilter,
        WildCardToRegex: wildCardToRegex,
        Grab: grabProperties,
        DataSet: dataSet,
        DataGrouping: dataGrouping,
        DataSelection: dataSelection,
        RemoveCacheProperties: removeCacheProperties
    },
    Event: Event,
    EventData: EventData,
    EventHandler: EventHandler,
    Notifications: {
        Manager: notifications,
        Item: notificationItem
    },
//    Workflow: {
//        Process: WorkflowProcess,
//        TaskController: WorkflowController
//    },
    UI: {
        RenderHighlightFunc: renderHighlightFunc,
        CreateOverlay: createOverlay
//        AddHighlights: highlightText,
//        RemoveHighlights: removeHighlight
    },
    Utility: {
        ParseUri: parseUri,
        ParseUrn: parseUrn
    },
    Localize: Localize,
    Select: {
        ArraySource: ArraySelectSource
    },
    CommandList: commandList,
    CommandManager: commandManager,
    CommandResources: commandResources,
    CommandBinding: commandBinding,
    TriggerCommand: triggerCommand,
    Support: {
    }
});

zpExport({
    IdleMonitor: new IdleMonitor(),
    Window: {
        ResizeWatch: new resizeWatch()
    }
});

if (!window.locfmt) {
    window.locfmt = Localize.Format;
}

window.ZillionParts.DateFormat = dateFormat;

setTimeout(function() {
    // Stupid .NET overriding my function....
    Date.prototype.format = function(mask, utc) {
        return dateFormat(this, mask, utc);
    };
}, 0);

$(function() {
    // Stupid .NET overriding my function....
    Date.prototype.format = function(mask, utc) {
        return dateFormat(this, mask, utc);
    };
});

var noop = function () { };
var consoleFunctions = ["log", "info", "warn", "error", "assert", "dir", "clear", "profile", "profileEnd"];
var hasConsole = !!window.console;

var isIE89 = msie && version < 10;
var isIE10 = msie && version == 10;
var doubleClickTime = isIE89 ? 1000 : 500;

// Add imaginary console if not available.
(function() {
    if (!hasConsole) {
        window.console = {
            log: function() {}
        };
    } else {
        if (!isIE89) {
            var doWrapConsoleFunctions = Function.prototype.bind && hasConsole && typeof console.log == "object";
            for (var i = 0, ii = consoleFunctions.length; i < ii; i++) {
                var method = consoleFunctions[i];
                if (!window.console[method]) {
                    window.console[method] = noop;
                }

                if (doWrapConsoleFunctions) {
                    //            consoleFunctions
                    //                .forEach(function(method) {
                    //                    console[method] = this.call(window.console[method], window.console);
                    //                }, Function.prototype.bind);
                    window.console[method] = Function.prototype.bind.call(window.console[method], window.console);
                }
            }
        }
    }
})();

var getComputedStyle = isIE89 ? function(el) { return el.currentStyle; } : window.getComputedStyle.bind(window);
var consoleLogDelegate = function () { console.log(Array.prototype.join.call(arguments, ' ')); };
var alertDelegate = function() { window.alert('Zillion Parts: ' + JSON.stringify(arguments)); };
var debugMode = window.localStorage && window.localStorage['debug'];
var isBenchmarking = testDebugMode('benchmark');
var isTraceEnabled = testDebugMode('trace');
var isDebugEnabled = testDebugMode('debug');
var zpTrace = isTraceEnabled ? consoleLogDelegate : noop;
var zpDebug = isDebugEnabled ? consoleLogDelegate : noop;
var zpError = isDebugEnabled ? alertDelegate : consoleLogDelegate;
var zpAssert = isDebugEnabled ? function (x, msg) {
    if (!x) {
        console.log(msg);
        debugger;
    }
} : noop;

function debugProxy(word) {
    return {
        error: zpError,
        trace: (testDebugMode('trace') || testDebugMode(word)) ? consoleLogDelegate : noop,
        debug: (testDebugMode('debug') || testDebugMode(word)) ? consoleLogDelegate : noop
    };
}

function debugModePattern(pattern) {
    if (pattern instanceof RegExp) {
        return [pattern];
    } else {
        var text = '' + pattern;
        var x = text.split(/\s+/g);
        var r = [];
        for (var i = 0, ii = x.length; i < ii; i++) {
            r.push(new RegExp(['((?:^|\\s)(', x[i], ')(?:\\s|$))'].join(''), 'gi'));
        }
        return multipleRegex(r);
    }
}
function multipleRegex(arr) {
    return {
        test: function (text) {
            for (var i = 0, ii = arr.length; i < ii; i++) {
                if (!arr[i].test(text)) return false;
            }
            return arr.length > 0;
        },
        replace: function (text, withText) {
            for (var i = 0, ii = arr.length; i < ii; i++) {
                text = text.replace(arr[i], withText);
            }
            return text;
        }
    }
}

function testDebugMode(pattern) {
    return debugMode === 'true' || debugMode === '*' || debugModePattern(pattern).test(debugMode);
}
function clearDebugMode(word) {
    if (word === undefined) {
        delete window.localStorage['debug'];
        console.log('All Debug Modes Disabled. Reload the page to apply the changes.');
    } else {
        setDebugMode(word, false);
    }
}
function setDebugMode(word, value) {
    if (word instanceof Array) {
        word = word.join(' ');
    }
    if (typeof(word) !== 'string') {
        throw new Error('Specify a string.');
    }
    if (value === undefined) {
        value = true;
    }

    var words = word.split(/\s+/gi);
    for (var i = 0, ii = words.length; i < ii; i++) {
        word = words[i];
        var pat = debugModePattern(word);
        var test = pat.test(window.localStorage['debug']);
        if (!value !== !test) {
            if (value) {
                window.localStorage['debug'] = window.localStorage['debug'] += ' ' + word;
                console.log('[' + word + '] Mode Enabled. Reload the page to apply the changes.');
            } else {
                window.localStorage['debug'] = pat.replace(window.localStorage['debug'], '');
                console.log('[' + word + '] Mode Disabled. Reload the page to apply the changes.');
            }
        } else {
            console.log('[' + word + '] Mode Unchanged.');
        }
    }
}

window.zpDebugProxy = debugProxy;
window.zpClearDebugMode = clearDebugMode;
window.zpTestDebugMode = testDebugMode;
window.zpSetDebugMode = setDebugMode;

if (isDebugEnabled) {
    zpTrace('Zillion Parts: Running in debug mode');
}
if (isBenchmarking) {
    zpTrace('Zillion Parts: Running in benchmark mode');
}
if (!isTraceEnabled) {
    console.log('Zillion Parts: Trace logging disabled. Run zpSetDebugMode("trace") to enable.');
}

/*
 * Promise Time Tracing.
 */
var debugPromise = debugProxy('promise');
function tracePromise(hint, promise) {
    var start = Date.now();
    if (promise && promise.then) {
        promise.then(function () {
            var time = Date.now() - start;
            debugPromise.trace('Promise: [' + time + 'ms] ' + hint + '. Success');
        }, function () {
            var time = Date.now() - start;
            debugPromise.error('Promise: [' + time + 'ms] ' + hint + '. Error', arguments);
        });
    }
    return promise;
};
window.zpTracePromise = tracePromise;

/*
 * Common String Operations.
 */
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function(str) {
        return this.slice(0, str.length) === str;
    };
}
if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function(str) {
        return this.slice(-str.length) === str;
    };
}
if (typeof String.prototype.trim != 'function') {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

Array.prototype.remove = function() {
    var value, values = arguments, valuesLength = values.length, ax;
    while (valuesLength && this.length) {
        value = values[--valuesLength];
        while ((ax = this.indexOf(value)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(value, startIdx) {
        startIdx = startIdx || 0;
        var ii = this.length;
        while (startIdx < ii) {
            if (this[startIdx] === value) {
                return startIdx;
            }
            ++startIdx;
        }
        return -1;
    };
}

$.ui.dialog.maxZ = 500;

jQuery.fn.extend({
    getPath: function(path) {
        // The first time this function is called, path won't be defined.
        if (typeof path == 'undefined') path = '';

        // If this element is <html> we've reached the end of the path.
        if (this.is('html'))
            return 'html' + path;

        // Add the element name.
        var cur = this.get(0);
        if (cur != null) {
            cur = cur.nodeName.toLowerCase();

            // Determine the IDs and path.
            var id = this.attr('id'),
                classx = this.attr('class');


            // Add the #id if there is one.
            if (typeof id != 'undefined')
                cur += '#' + id;
            else {
                // Add any classes.
                if (typeof classx != 'undefined')
                    cur += '.' + classx.split(/[\s\n]+/).join('.');
            }
            // Recurse up the DOM.
            var parent = this.parent();
            if (parent && parent.length) {
                return parent.getPath(' > ' + cur + path);
            } else {
                return '####' + path;
            }
        } else {
            return '####' + path;
        }
    }
});
window.throttle = function(token, func, delay) {
    if (token._id) {
        clearTimeout(token._id);
        token._id = null;
    }

    var callback = func || token.callback;
    if (callback) {
        var d = (delay === 0) ? (0) : (delay || delay || token.delay);
        token._id = setTimeout(function() { callback(); }, d);
    }
};
window.throttleStop = function(token) {
    if (token._id) {
        clearTimeout(token._id);
        token._id = null;
    }
};
window.throttleFunc = function(token, func, delay) {
    return function() {
        throttle(token, func, delay);
    };
};

zpExport({
    Delay: Delay,
    DelayCall: DelayCall,
    FloodProtect: floodProtect,
    DelegateDeferred: delegateDeferred,
    IsControlKey: function(keyCode) {
        return !((keyCode > 47 && keyCode < 58) || // number keys
            keyCode == 32 || keyCode == 13 || // spacebar & return key(s) (if you want to allow carriage returns)
            (keyCode > 64 && keyCode < 91) || // letter keys
            (keyCode > 95 && keyCode < 112) || // numpad keys
            (keyCode > 185 && keyCode < 193) || // ;=,-./` (in order)
            (keyCode > 218 && keyCode < 223)); // [\]' (in order)
    },
    zIndex: function () {
        return $.ui.dialog.maxZ;
        //return 500;
        //        if ($ && $.ui) {
        //            if ($.ui.dialog.maxZ < 100) {
        //                $.ui.dialog.maxZ = 100;
        //            }
        //            return ++$.ui.dialog.maxZ;
        //        } else {
        //            return 100;
        //        }
    },
    Setup: {
        NextInput: {
            Selectors: [':input:visible', '.zpselect:visible'],
            Exceptions: [':disabled', ':hidden', '.zpselect-disabled']
        }
    },
    Element: {
        StackToTop: stackToTop
    },
    Promise: {
        Delegate: promiseDelegate
    }
});

function stackToTop(selector) {
    var el = $(selector)[0];
    if (el) {
        var parent = el.parentElement;
        if (parent) {
            parent.removeChild(el);
            parent.appendChild(el);
        }
    }
};

function delegateDeferred(deferred, promise) {
    promise.then(
        function(a) { deferred.resolve(a); },
        function(a) { deferred.reject(a); });
}

if ('serializeObject' in $.fn == false) {
    $.fn.serializeObject = function() {
        var o = {};
        var a = this.serializeArray();

        $.each(a, function() {
            var val = o[this.name];
            if (val !== undefined) {
                if ($.isArray(val) === false) {
                    val = o[this.name] = [val];
                }
                val.push(this.value || null);
            } else {
                o[this.name] = this.value || null;
            }
        });
        return o;
    };
}

$.fn.postJson = function(options) {
    $.ajax($.extend(true, { type: 'post', contentType: 'application/json; charset=utf-8' }, options));
};

function Delay(callback, delay, resetOnCall) {
    var id = null;

    function handler() {
        cancel();
        callback.apply(this, arguments);
    }

    function cancel() {
        if (id !== null) {
            clearTimeout(id);
            id = null;
        }
    }

    var notify = function() {
        if (id !== null) {
            if (resetOnCall === false) {
                return;
            }

            clearTimeout(id);
        }

        var args = arguments;
        var self = this;
        id = setTimeout(function() { handler.apply(self, args); }, delay);
    };

    notify.cancel = function() {
        cancel();
    };
    notify.invoke = function(instance, args) {
        handler.apply(instance || this, args);
    };

    return notify;
}

function DelayCall(defaultFunc, defaultDelay) {
    var _id = null,
        _func = defaultFunc,
        _delay = defaultDelay;

    function cancel() {
        if (_id !== null) {
            clearTimeout(_id);
            _id = null;
        }
    }

    var _entry = function(delay, func) {
        if (!func) {
            func = _func;
        }
        if ((delay | 0) < 0) {
            delay = _delay;
        }


        return function() {
            cancel();

            var args = arguments;
            var self = this;
            _id = setTimeout(function() { func.apply(self, args); }, delay);
        };
    };
    _entry.cancel = cancel;

    return _entry;
}

$.fn.bounds = function() {
    var $this = this.first();

    var position = $this.position();
    var leftOffset = parseInt($this.css("margin-left"), 10);
    var topOffset = parseInt($this.css("margin-top"), 10);

    return {
        left: position.left + leftOffset,
        top: position.top + topOffset,
        width: $this.outerWidth(false),
        height: $this.outerHeight(false)
    };
};

$.fn.databound = function() {
    $(this).trigger('databound');
};

$.fn.focusNextInput = function() {
    var setup = ZillionParts.Setup.NextInput;
    var selectors = setup.Selectors;
    var inputs = $(this).nextAll(selectors.join(','));
    var exceptions = setup.Exceptions;

    exceptions.qEach(function (x) {
        inputs = inputs.not(x);
    });

    inputs = inputs.first();

    if (inputs.length === 0) {
        inputs = $(this).prevAll(selectors.join(','));

        exceptions.qEach(function (x) {
            inputs = inputs.not(x);
        });

        inputs = inputs.last();
    }

    inputs.focus();
};

function floodProtect(callback, duration) {
    var _self = this;
    var _last = null;
    var _lastResult = null;
    var _time = null;

    function call() {
        var time = new Date();
        try {
            return (_lastResult = callback.apply(_self, arguments));
        } finally {
            _time = new Date();
            _last = _time - time;
        }
    }

    var _delay = ZillionParts.Delay(call, duration, false);

    return function() {
        if (new Date() < _last + _time) {
            _delay();
            return _lastResult;
        } else {
            call();
        }
    };
}

function parseUrn(input, mode) {
    var o = parseUrn.options;
    if (mode === undefined) mode = (o.strictMode ? "strict" : "loose");
    var m = o.parser[mode].exec(input),
        k = o.keys[mode],
        urn = { protocol: "urn" },
        i = k.length;

    while (i--) urn[k[i]] = m[i] || "";

    return urn;
};

parseUrn.options = {
    strictMode: false,
    keys: {
        strict: ["source", "namespace", "specification"],
        loose: ["source", "protocol", "namespace", "specification"]
    },
    parser: {
        strict: /^urn:((?:[a-z0-9][a-z0-9]+)):(([\w#!:.?+=&%@!\-\/])+)?/i,
        loose: /^((?:[a-z][a-z]+)):((?:[a-z0-9][a-z0-9]+)):(([\w#!:.?+=&%@!\-\/])+)?/i
    }
};

function parseUri(input, mode) {
    var o = parseUri.options;
    if (mode === undefined) mode = (o.strictMode ? "strict" : "loose");
    var m = o.parser[mode].exec(input),
        uri = {},
        i = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
};

parseUri.options = {
    strictMode: false,
    key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
    q: {
        name: "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

$.Deferred.serialize = function(fns) {
    if (!$.isArray(fns) || fns.length === 0)
        return $.Deferred().resolve().promise();

    var pipeline = fns[0](), c = 1, l = fns.length;
    for (; c < l; c++)
        pipeline = pipeline.then(fns[c]);
    return pipeline;
};

$.Deferred.parallelize = function(fns) {
    if (!$.isArray(fns) || fns.length === 0)
        return $.Deferred().resolve().promise();

    return $.when.apply(this, _.map(fns, function(fn) { return fn(); }));
};

function promiseDelegate(promise, callback) {
    callback().then(promise.resolve.bind(promise), promise.reject.bind(promise));
}

$.Deferred.serializeAlways = function(callbacks) {
    var rootPromise, previousPromise;
    rootPromise = previousPromise = $.Deferred();
    for (var c, i = 0, ii = callbacks.length; i < ii; i++) {
        c = callbacks[i];
        var currentPromise = $.Deferred();
        previousPromise.always(promiseDelegate.bind(window, currentPromise, c));
        previousPromise = currentPromise;
    }
    rootPromise.resolve();
    return previousPromise.promise();
};

/*
* jQuery AJAX JSON - string to date conversion
*/
var jsonDateUrnStart = 'urn:epoch:';
var jsonDateUrnStartLength = jsonDateUrnStart.length;

var postProcessJson = function(key, value) {
    if (typeof value === "string") {
        if (value.length < 40) {
            if (value.substring(0, jsonDateUrnStartLength) === jsonDateUrnStart) {
                return new Date(parseInt(value.substr(jsonDateUrnStartLength)));
            }
        }
    } else if (typeof value === "object") {
        for (var k in value) {
            if (value.hasOwnProperty(k)) {
                value[k] = postProcessJson(k, value[k]);
            }
        }
    }

    return value;
};

function parseJson(json) {
    var start = Date.now();
    var input = window.JSON.parse(json);
    var processed = postProcessJson(null, input);

    var duration = Date.now() - start;
    if (duration > 50) {
        zpTrace('JSON Parsing 50ms+: ' + duration);
    }

    return processed;
};

zpExport({
    ParseJson: parseJson,
    PostProcessJson: postProcessJson.bind(window, null),
    Trace: funcDebug
});

$.ajaxSetup({
    converters: {
        "text json": parseJson
    }
});

function returnInputValue(i) {
    return i;
}

(function() {
    Function.prototype.trace = function() {
        var trace = [];
        var current = this;
        while (current) {
            trace.push(current.signature());
            current = current.caller;
        }
        return trace;
    };
    Function.prototype.signature = function() {
        var signature = {
            name: this.getName(),
            params: [],
            toString: function() {
                var params = this.params.length > 0 ?
                    "'" + this.params.join("', '") + "'" : "";
                return this.name + "(" + params + ")";
            }
        };
        if (this.arguments) {
            for (var x = 0; x < this.arguments.length; x++)
                signature.params.push(this.arguments[x]);
        }
        return signature;
    };

    var nameExp = /^function ([^\s(]+).+/;
    Function.prototype.getName = function() {
        if (this.name)
            return this.name;
        var definition = this.toString().split("\n")[0];
        if (nameExp.test(definition))
            return definition.split("\n")[0].replace(nameExp, "$1") || "anonymous";
        return "anonymous";
    };
})();

function resizeWatch() {
    var lastSizeX = 0, lastSizeY = 0;
    var evt = new ZillionParts.Event();
    var thr = {};
    $(window).resize(function() {
        throttle(thr, function() {
            var y = $(window).height();
            var x = $(window).width();
            if (lastSizeX !== x || lastSizeY !== y) {
                lastSizeX = x;
                lastSizeY = y;
                evt.notify({ width: x, height: y });
            }
        }, 50);
    });

    $(function() { $(window).resize(); });

    return evt;
}

function funcDebug(fn) {
    var s = [
        'var p = ', fn, ',',
        'n = ', fn, ' = function () {',
        'try {',
        'throw new Error("Stacktrace ', fn, '");',
        '} catch (ex) {',
        'console.log.apply(console, [fn].concat(arguments));',
        'console.log(ex.stack);',
        '}',
        'return p.apply(this, arguments);',
        '};',
        'n.prototype = p;',
        //            '$.extend(true, n, p);',
        'return p;'
    ];

    return new Function('fn', s.join(''))(fn);
}

var zpAjax = null;

(function() {
    if (window.XMLHttpRequest) {
        zpAjax = ecmaAjax;
    } else {
        zpAjax = function() { throw Error('No ajax support'); };
    }
    window.zpAjax = zpAjax;

    var errorRequestCancelled = 'Request cancelled.';
    var errorInternalServer = 'Internal server error.';
    var errorUnauthorized = 'Unauthorized request.';
    var errorUnexpected = 'Unexpected error during the request.';

    function ecmaAjax(options) {
        options = $.extend(true, {
            type: 'GET',
            data: null,
            dataType: 'json',
            url: null,
            async: true
        }, options);

        var d = $.Deferred();

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                if (xmlhttp.status == 200) {
                    d.resolve(parseJson(xmlhttp.responseText));
                } else if (xmlhttp.status == 500) {
                    d.reject({ error: true, code: 500, message: errorInternalServer, details: errorInternalServer });
                } else if (xmlhttp.status == 402) {
                    d.reject({ error: true, code: 402, message: errorUnauthorized, details: errorUnauthorized });
                } else {
                    d.reject({ error: true, code: xmlhttp.status, message: errorUnexpected, details: errorUnexpected });
                }
            }
        };
        xmlhttp.open(options.type, options.url, options.async);

        switch (options.dataType) {
        case 'json':
            xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            break;
        }

        if (options.data) {
            xmlhttp.send(options.data);
        } else {
            xmlhttp.send();
        }

        d.abort = function() {
            xmlhttp.abort();
            d.reject({ error: true, message: errorRequestCancelled, details: errorRequestCancelled });
        };

        return d;
    }
})();

ZillionParts.Html = Html;

function Html() {
    this.content = '';
}
Html.toHtmlLineEnding = function(text) {
    return text.replace(/\r?\n/g, '<br/>');
};
Html.prototype.parseText = function(text) {
    this.content = Html.toHtmlLineEnding(text);
    return this;
};

// Shallow object comparison.
Object.areEqual = function (x, y) {
    if (x === y) return true;

    var k, len,
        xEmpty = x === null || x === undefined,
        yEmpty = y === null || y === undefined;

    if (xEmpty && yEmpty) return true;
    if (xEmpty) return false;
    if (yEmpty) return false;

    if (x.hasOwnProperty('length') && y.hasOwnProperty('length')) {
        len = x.length;
        if (len !== y.length) return false;
        for (k = 0; k < len; k++) {
            if (x[k] !== y[k]) {
                return false;
            }
        }
        return true;
    }

    // Has the same properties with the same values?
    for (k in y) {
        if (x.hasOwnProperty(k) !== y.hasOwnProperty(k)) {
            return false;
        }
        if (x[k] !== y[k]) {
            return false;
        }
    }

    return true;
};

$.fn.findDataField = function (fieldID) {
    return $(this).find("[data-field='" + fieldID + "']");
};

function Event() {
    var self = this;
    var handlers = [];

    /***
    * Adds an event handler to be called when the event is fired.
    * <p>Event handler will receive two arguments - an <code>EventData</code> and the <code>data</code>
    * object the event was fired with.<p>
    * @method subscribe
    * @param fn {Function} Event handler.
    */
    this.subscribe = function (fn) {
        handlers.push(fn);
        return { unsubscribe: function () { self.unsubscribe(fn); } };
    };

    /***
    * Removes an event handler added with <code>subscribe(fn)</code>.
    * @method unsubscribe
    * @param fn {Function} Event handler to be removed.
    */
    this.unsubscribe = function (fn) {
        for (var i = handlers.length - 1; i >= 0; i--) {
            if (handlers[i] === fn) {
                handlers.splice(i, 1);
            }
        }
    };

    /***
    * Fires an event notifying all subscribers.
    * @method notify
    * @param args {Object} Additional data object to be passed to all handlers.
    * @param e {EventData}
    *      Optional.
    *      An <code>EventData</code> object to be passed to all handlers.
    *      For DOM events, an existing W3C/jQuery event object can be passed in.
    * @param scope {Object}
    *      Optional.
    *      The scope ("this") within which the handler will be executed.
    *      If not specified, the scope will be set to the <code>Event</code> instance.
    */
    this.notify = function (args, e, scope) {
        e = e || new EventData();
        scope = scope || this;

        var returnValue;
        for (var i = 0; i < handlers.length && !(e.isPropagationStopped() || e.isImmediatePropagationStopped()); i++) {
            returnValue = handlers[i].call(scope, e, args);
        }

        return returnValue;
    };
}

function EventData() {
    var isPropagationStopped = false;
    var isImmediatePropagationStopped = false;

    /***
    * Stops event from propagating up the DOM tree.
    * @method stopPropagation
    */
    this.stopPropagation = function () {
        isPropagationStopped = true;
    };

    /***
    * Returns whether stopPropagation was called on this event object.
    * @method isPropagationStopped
    * @return {Boolean}
    */
    this.isPropagationStopped = function () {
        return isPropagationStopped;
    };

    /***
    * Prevents the rest of the handlers from being executed.
    * @method stopImmediatePropagation
    */
    this.stopImmediatePropagation = function () {
        isImmediatePropagationStopped = true;
    };

    /***
    * Returns whether stopImmediatePropagation was called on this event object.\
    * @method isImmediatePropagationStopped
    * @return {Boolean}
    */
    this.isImmediatePropagationStopped = function () {
        return isImmediatePropagationStopped;
    };
}

function EventHandler() {
    var handlers = [];

    this.subscribe = function (event, handler) {
        handlers.push({
            event: event,
            handler: handler
        });
        event.subscribe(handler);
    };

    this.unsubscribe = function (event, handler) {
        var i = handlers.length;
        while (i--) {
            if (handlers[i].event === event &&
                    handlers[i].handler === handler) {
                handlers.splice(i, 1);
                event.unsubscribe(handler);
                return;
            }
        }
    };

    this.unsubscribeAll = function () {
        var i = handlers.length;
        while (i--) {
            handlers[i].event.unsubscribe(handlers[i].handler);
        }
        handlers = [];
    };
}

// Registering Object.prototype.toSortKey conflicts with jQuery code like $(...).css({ background: 'none' });
// toSortKey was treated as property.
var toSortKey = window.toSortKey = function(x) {
    if (x === undefined || x === null) {
        return ''; //return empty string to avoid wrong compare function
    } else {
        return (x.toSortKey && x.toSortKey()) || ('' + x).toLowerCase();
    }
};

Date.prototype.toSortKey = function () { return this.getTime(); };
Number.prototype.toSortKey = function () { return this; };
String.prototype.toSortKey = function () { return this ? this.toLowerCase() : null; };
Boolean.prototype.toSortKey = function () { return this.valueOf() ? 1 : 0; };

function removeCacheProperties(obj) {
    delete obj['$key'];
    delete obj['$cache'];
}

function grabProperties(obj, properties) {
    var fields;
    if ($.isArray(properties)) {
        fields = properties;
    }
    else if (typeof properties === 'string') {
        fields = properties.split(' ');
    }

    var result;
    var i = 0, ii = fields.length;
    if ($.isArray(obj)) {
        result = [];
        for (; i < ii; i++) {
            result.push(obj[fields[i]]);
        }
        return result;
    } else {
        result = {};
        for (; i < ii; i++) {
            result[fields[i]] = obj[fields[i]];
        }
        return result;
    }
}

var conditionFuncCache = new FunctionCache();
function condition() {
    var self = this;
    var conditions = [];
    var _compiled = null;

    this.type = 'or';

    this.include = function (callback, params) {
        _compiled = null;

        if (typeof callback == 'string') {
            var x = predicateIIP(callback);
            callback = function($item) { return x($item, null, params); };
        } else if ($.isPlainObject(callback)) {
            var filter = callback;
            callback = function (v) { return ZillionParts.Data.MatchObject(v, filter); };
        } else if (callback instanceof ZillionParts.Condition) {
            var inner = callback;
            callback = function (v) { return inner.match(v); };
        }

        conditions.push({ callback: callback, exclusive: false });
        return this;
    };
    this.exclude = function (callback, params) {
        _compiled = null;
        if (typeof callback == 'string') {
            var x = predicateIIP(callback);
            callback = function ($item) { return x($item, null, params); };
        } else if ($.isPlainObject(callback)) {
            var filter = callback;
            callback = function (v) { return ZillionParts.Data.MatchObject(v, filter); };
        } else if (callback instanceof ZillionParts.Condition) {
            var inner = callback;
            callback = function (v) { return inner.match(v); };
        }

        conditions.push({ callback: callback, exclusive: true });
        return this;
    };

    this.match = function (context) {
        if (_compiled == null) {
            var i, ii = conditions.length, body = [];

            if (self.type === 'and') {
                for (i = 0; i < ii; i++) {
                    if (conditions[i].exclusive) {
                        body.push('if (__cb[' + i + '].callback(__c)) return false;');
                    }
                }
                for (i = 0; i < ii; i++) {
                    if (!conditions[i].exclusive) {
                        body.push('if (!__cb[' + i + '].callback(__c)) return false;');
                    }
                }
                body.push('return true;');
            } else {
                for (i = 0; i < ii; i++) {
                    if (conditions[i].exclusive) {
                        body.push('if (__cb[' + i + '].callback(__c)) return false;');
                    }
                }
                var incCount = 0;
                for (i = 0; i < ii; i++) {
                    if (!conditions[i].exclusive) {
                        body.push('if (__cb[' + i + '].callback(__c)) return true;');
                        incCount++;
                    }
                }
                if (incCount === 0) {
                    body.push('return true;');
                } else {
                    body.push('return false;');
                }
            }

            _compiled = conditionFuncCache.get(body.join(''), ['__c, __cb']);
        }

        return _compiled(context, conditions);
    };

    this.filter = function (list) {
        return $.grep(list, function (i) { return self.match(i); });
    };
}

function dataSet() {
    // Fields.
    var keyField = 'ID';
    var sourceItems = [];
    var sourceItemsIdx = {};
    var postItems = [];
    var postItemsIdx = [];

    var sortComparer = null;
    var sortAsc = null;

    var filter = null;
    var filterFunc = null;
    var filterArgs = null;

    // Events.
    var updatedEvent = new ZillionParts.Event();

    // Methods.
    function createIndex(items, objectKeyField) {
        var index = {},
            id = '';

        for (var i = 0, ii = items.length; i < ii; i++) {
            id = items[i].$key = ''+items[i][objectKeyField];
            if (id === undefined || index[id] !== undefined) {
                zpTrace("DataSet: Duplicate key collision with key [" + id + "].");
                throw "Each data element must implement a unique '" + keyField + "' property.";
            }
            index[id] = i;
        }

        return index;
    }

    function setItems(data, objectKeyField) {
        var key = objectKeyField || keyField;

        sourceItemsIdx = createIndex(data, key);
        sourceItems = data;
        keyField = key;
    }

    function getItems(fromSource) {
        if (fromSource === true) {
            return sourceItems;
        } else {
            return postItems;
        }
    }

    function getKeyField() {
        return keyField;
    }

    function getItemByKey(key, fromSource) {
        if (fromSource === true) {
            return sourceItems[sourceItemsIdx[key]];
        } else {
            return postItems[postItemsIdx[key]];
        }
    }

    function getItemByIdx(idx, fromSource) {
        if (fromSource === true) {
            return sourceItems[idx];
        } else {
            return postItems[idx];
        }
    }

    function getIdxByKey(key, fromSource) {
        var idx;
        if (fromSource === true) {
            idx = sourceItemsIdx[key];
        } else {
            idx = postItemsIdx[key];
        }
        if (idx === undefined) {
            return -1;
        }
        return idx;
    }

    function getKeyByIdx(idx, fromSource) {
        if (fromSource === true) {
            return sourceItems[idx].$key;
        } else {
            return postItems[idx].$key;
        }
    }

    function sort(comparer, ascending) {
        sortAsc = ascending || true;
        sortComparer = comparer;

        var gt = sortAsc ? 1 : -1;
        var lt = sortAsc ? -1 : 1;

        // Replace a string (field ID) with a comparer.
        if (typeof comparer == 'string') {
            var field = comparer;

            comparer = function (a, b) {
                a = a[field];
                b = b[field];

                if (a === b) {
                    return 0;
                } else if (a === null) {
                    return -1;
                } else if (b === null) {
                    return 1;
                } else {
                    a = toSortKey(a);
                    b = toSortKey(b);

                    return a == b ? 0 : a > b ? gt : lt;
                }
            };
        }

        postItems.sort(comparer);

        postItemsIdx = createIndex(postItems, '$key');
    }

    function reSort() {
        if (sortComparer) {
            sort(sortComparer, sortAsc);
        }
    }

    function setFilter(func) {
        if ($.isPlainObject(func)) {
            filter = func;
            filterFunc = function (items) { return ZillionParts.Data.FilterArray(items, filter); };
        } else if ($.isFunction(func)) {
            filter = func;
            filterFunc = func; // TODO: Something...
        }
    }

    function setFilterArgs(args) {
        filterArgs = args;
    }

    function refresh(includingSource) {
        reset();

        if (includingSource !== false) {
            sourceItemsIdx = createIndex(sourceItems, keyField);
        }

        var items = sourceItems.slice(0); // Create a copy of the array.
        if ($.isFunction(filterFunc)) {
            items = filterFunc(items, filterArgs);
        }

        postItemsIdx = createIndex(items, keyField);
        postItems = items;
        reSort();

        updatedEvent.notify(items, null, instance);
    }

    function reset() {
        for (var i = 0, ii = sourceItems.length; i < ii; i++) {
            removeCacheProperties(sourceItems[i]);
        }
    }

    var instance = {
        // Public Methods.
        "setItems": setItems,
        "getItems": getItems,
        "getKeyField": getKeyField,
        "getItemByKey": getItemByKey,
        "getItemByIdx": getItemByIdx,
        "getIdxByKey": getIdxByKey,
        "getKeyByIdx": getKeyByIdx,
        "sort": sort,
        "setFilter": setFilter,
        "setFilterArgs": setFilterArgs,
        "refresh": refresh,
        "reset": reset,

        // Public Events.
        "onUpdated": updatedEvent
    };

    return instance;
}



function dataGrouping() {
    var _items = {};
    var _grouping = [];
    var _updatedEvent = new ZillionParts.Event();
    var _dataSource = null;

    function onUpdated() {
        refresh();
    };

    function setDataSource(dataSource) {
        if (_dataSource) {
            _dataSource.onUpdated.unsubscribe(onUpdated);
        }

        _dataSource = dataSource;
        _dataSource.onUpdated.subscribe(onUpdated);
    }

    function getItems() {
        return { hasGroups: true, data: _items };
    }

    function getGroupPath(obj) {
        var res = [];
        for (var i = 0; i < _grouping.length; i++) {
            var item = obj[_grouping[i]];
            if (item) {
                res.push(item);
            } else {
                res.push(undefined);
            }
        }
        return res;
    }

    function getBucket(root, path) {
        var current = root;
        for (var i = 0; i < path.length; i++) {
            if (path[i] in current == false) {
                current[path[i]] = {};
            }

            current = current[path[i]];
        }

        return current;
    }

    function refresh() {
        var source = _dataSource.getItems();

        var items = _items = {};

        for (var i = 0; i < source.length; i++) {
            var item = source[i];
            var path = getGroupPath(item);
            var bucket = getBucket(items, path);
            if ('items' in bucket === false) {
                bucket.items = [];
            }

            bucket.items.push(item);
        }

        _updatedEvent.notify();
    }

    return {
        "getItems": getItems,
        "setDataSource": setDataSource,

        "refresh": refresh,

        "onUpdated": _updatedEvent
    };
}

function dataSelection(multiSelect) {
    var selection = [];
    var count = 0;
    var onChange = new ZillionParts.Event();
    var isMultiSelect = multiSelect || true;
    var keyField = 'ID';

    function setKeyField(name) {
        keyField = name;
    }

    function addByObject(obj) {
        add(obj[keyField]);
    }
    function removeByObject(obj) {
        add(obj[keyField]);
    }

    function add(key) {
        var eventArgs = { type: dataSelection.Adding, keys: ['' + key] };
        onChange.notify(eventArgs, null, this);
        var r = [];
        eventArgs.keys.qEach(function (theKey) {
            theKey = '' + theKey;
            if (hasKey(theKey) === false) {
                if (isMultiSelect === false && count !== 0) {
                    clear();
                }

                selection.push(theKey);
                r.push(theKey);
                count++;
            }
        });
        onChange.notify({ type: dataSelection.Added, keys: r }, null, this);
    }

    function remove(key) {
        key = (key || '').toString();
        if (hasKey(key) === true) {
            onChange.notify({ type: dataSelection.Removing, keys: [key] }, null, this);
            selection = selection.filter(function (a) { return a !== key; });
            count--;
            onChange.notify({ type: dataSelection.Removed, keys: [key] }, null, this);
        }
    }

    // Returns true, when the key has been added; false when the key has been removed.
    function toggle(key) {
        if (hasKey(key)) {
            remove(key);
            return false;
        } else {
            add(key);
            return true;
        }
    }

    function clear() {
        var old = selection;
        onChange.notify({ type: dataSelection.Clearing, keys: old.slice(0) }, null, this);
        selection = [];
        count = 0;
        onChange.notify({ type: dataSelection.Cleared, keys: old.slice(0) }, null, this);
    }

    function getKeys() {
        return selection.slice(0);
    }

    function getCount() {
        return count;
    }

    function hasKey(key) {
        key = (key || '').toString();
        return selection.indexOf(key) > -1;
    }

    function setMultiSelect(value) {
        if (value !== isMultiSelect) {
            if (value === true) {
                isMultiSelect = value;
            } else if (value === false) {
                isMultiSelect = false;
                clear();
            }
        }
    }

    /*
     * f - callback function or an array.
     * field - when f is an array, the property field is used to filter from array.
     */

    function filter(f, field) {
        if ($.isArray(f)) {
            var array = f;
            if (field) {
                array = array.qSelect(function (idx) { return (idx[field] || '').toString(); });
            }
            f = function (idx) { return array.indexOf(idx) > -1; };
        }

        var sel = selection.slice(0);
        for (var i = 0, ii = sel.length; i < ii; i++) {
            var item = sel[i];
            if (!f(item)) {
                remove(item);
            }
        }
    }

    return {
        // Property accessors.
        "setMultiSelect": setMultiSelect,

        // Methods.
        "add": add,
        "remove": remove,
        "toggle": toggle,
        "clear": clear,
        "getKeys": getKeys,
        "getCount": getCount,
        "hasKey": hasKey,
        "filter": filter,

        "setKeyField": setKeyField,
        "addByObject": addByObject,
        "removeByObject": removeByObject,

        // Events.
        "onChange": onChange
    };
}

// Data Selection change events.
dataSelection.Adding = 'adding';
dataSelection.Added = 'added';
dataSelection.Removing = 'removing';
dataSelection.Removed = 'removed';
dataSelection.Clearing = 'clearing';
dataSelection.Cleared = 'cleared';

function compileObjectFilter(filter) {
    var script = 'with(__item){';
    var cbs = [];

    $.each(filter, function (prop, val) {
        if ($.isFunction(val)) {
            script += 'if (!__cb[' + cbs.length + '](' + prop + ')) return false;';
            cbs.push(val);
        } else {
            if (val instanceof RegExp) {
                script += 'if (!' + val + '.test(' + prop + ')) return false;';
            } else if (val instanceof Number) {
                script += 'if (' + val + ' !== ' + prop + ') return false;';
            } else {
                script += 'if (' + JSON.stringify(val) + ' !== (' + prop + ')) return false;';
            }
        }
    });

    script += '} return true;';

    if (cbs.length > 0) {
        var func = new Function('__item, __cb', script);

        return function (item) { return func(item, cbs); };
    } else {
        return new Function('__item', script);
    }
}

function objectFilter(obj, filter) {
    var isValid = true;

    zpForEachProperty(filter, function (val, prop) {
        var objVal = obj[prop];

        if ($.isFunction(val)) {
            isValid = isValid && val(objVal);
        } else {
            if (val instanceof RegExp) {
                isValid = isValid && val.test(objVal);
            } else {
                isValid = isValid && objVal === val;
            }
        }

        if (!isValid) {
            return false;
        }
    });
    return isValid;
}

function arrayFilter(input, filter) {
    if ($.isEmptyObject(filter))
        return input;

    return input.qWhere(compileObjectFilter(filter));
}

function escapeRegex(text) {
    var propertyName = /[-[\]{}()+.,\\\/^$|#\s]/g;
    return text.replace(propertyName, "\\$&");
}

function wildCardToRegex(pattern) {
    var regex = '^';

    pattern = escapeRegex(pattern);
    regex += pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    //        if (pattern.length > 0 && pattern[0] == "*") {
    //            regex += '$';
    //        }

    return RegExp(regex, 'i');
}

function getFunctionInfo(fn) {
    var fnRegex = /^function[^(]*\(([^)]*)\)\s*{([\s\S]*)}$/;
    var matches = fn.toString().match(fnRegex);
    return {
        params: matches[1].split(","),
        body: matches[2]
    };
}

/*
 * The homogeneous format: [{property name*},{item count},{values*}].
 */

function unpackHomogeneousArray(homogeneousArray) {
    // Retrieve the properties and item count.
    var properties = [];
    var startIndex = 0;
    var count = 0;
    for (var i = 0; i < homogeneousArray.length; i++) {
        var homogeneous = homogeneousArray[i];
        if (typeof homogeneous === 'number') {
            startIndex = i + 1;
            count = homogeneous;
            break;
        }
        properties.push(homogeneous);
    }

    // Create objects from the homogenous array.
    var length = properties.length;
    var result = [];
    for (var j = 0; j < count; j++) {
        var obj = { };
        for (var k = 0; k < length; k++) {
            obj[properties[k]] = homogeneousArray[startIndex + j * length + k];
        }
        result.push(obj);
    }
    return result;
}

function packHomogeneousArray(objectArray, propertyArray) {
    if (objectArray.length === 0)
        return [0];

    var result = [];

    // Determine the properties.
    if (propertyArray === undefined) {
        propertyArray = [];
        $.each(objectArray[0], function(name) {
            propertyArray.push(name);
            result.push(name);
        });
    }

    var ii = objectArray.length, jj = propertyArray.length;

    // Add the row count to the result.
    result.push(ii);

    for (var i = 0; i < ii; i++) {
        var item = objectArray[i];
        for (var j = 0; j < jj; j++) {
            result.push(item[propertyArray[j]]);
        }
    }

    return result;
}

//
// Common Shared Methods.
function arrayEach(list, callback) {
    for (var i = 0, ii = list.length; i < ii; i++) {
        var val = list[i];
        if (callback(val, i, ii) === false) {
            break;
        }
    }
    return this;
};

function arrayEachThis(callback) {
    callback = predicateIIP(callback);

    for (var i = 0, ii = this.length; i < ii; i++) {
        var val = this[i];
        if (callback(val, i, ii) === false) {
            break;
        }
    }
    return this;
};

Array.prototype.qSum = function (callback) {
    if (this.length === 0) {
        return 0;
    } else {
        callback = predicateIIP(callback);
        var counter = 0;
        for (var i = 0, ii = this.length; i < ii; i++) {
            counter += (+callback(this[i], i, ii));
        }
        return counter;
    }
};

//
// Array Extensions.
Array.prototype.qExcept = function(other, comparer, params) {
    var result = [],
        thisLength = this.length,
        otherLength = other.length,
        item,
        addItem;

    if (otherLength == 0)
        return this.slice();

    comparer = predicateLRP(comparer) || alwaysEqualLR;

    for (var i = 0; i < thisLength; i++) {
        addItem = true;
        item = this[i];
        for (var j = 0; j < otherLength; j++) {
            if (comparer(item, other[j], params)) {
                addItem = false;
                break;
            }
        }
        if (addItem) {
            result.push(item);
        }
    }

    return result;
};

Array.prototype.qIntersect = function(other, comparer, params) {
    var result = [],
        thisLength = this.length,
        otherLength = other.length,
        item,
        addItem;

    if (otherLength == 0)
        return this.slice(0);

    comparer = predicateLRP(comparer) || alwaysEqualLR;

    for (var i = 0; i < thisLength; i++) {
        addItem = false;
        item = this[i];
        for (var j = 0; j < otherLength; j++) {
            if (comparer(item, other[j], params)) {
                addItem = true;
                break;
            }
        }
        if (addItem) {
            result.push(item);
        }
    }

    return result;
};

// Compatiblity with <1.8
Array.prototype.except = Array.prototype.qExcept;
Array.prototype.intersect = Array.prototype.qIntersect;

Array.prototype.query = function() {
    return new ArrayQuery(this);
};

function ArrayQuery(context) {
    var _parameters = [];
    var _script = 'var __items=this.slice(0),__newItems;';

    this.addParameter = function(val) {
        _parameters.push(val);
        return 'arguments[' + (_parameters.length - 1) + ']';
    };
    this.script = function(text) {
        _script += text;
    };

    this.compile = function() {
        var func = new Function('__items', _script + 'return __items;');
        return function(items) {
            return func.apply(items, _parameters);
        };
    };

    this.toArray = function() {
        return this.compile()(context);
    };
}

ArrayQuery.prototype.where = function(condition, params) {
    this.script('__newItems = [];');
    this.script('for (var __i = 0, __ii = __items.length; __i < __ii; ++__i) {');
    this.script('with(__items[__i]) { if (' + condition + ') { __newItems.push(__items[__i]); } }');
    this.script('}');
    this.script('__items = __newItems;');
    return this;
};

ArrayQuery.prototype.select = function(what) {
    this.script('__newItems = [];');
    this.script('for (var __i = 0, __ii = __items.length; __i < __ii; ++__i) {');
    this.script('with(__items[__i]) { __newItems.push(' + what + '); }');
    this.script('}');
    this.script('__items = __newItems;');
    return this;
};

ArrayQuery.prototype.orderBy = function(field) {
    if (field) {
        var t = 'function(__a, __b) { with (__a) { __a = (' + field + ') }; with (__b) { __b = (' + field + ') } if (__a == __b) return 0; return (__a < __b) ? -1 : 1; }';
        this.script('__items.sort(' + t + ');');
    } else {
        this.script('__items.sort();');
    }
    return this;
};

ArrayQuery.prototype.orderByDescending = function(field) {
    if (field) {
        var t = 'function(__a, __b) { with (__a) { __a = (' + field + ') }; with (__b) { __b = (' + field + ') } if (__a == __b) return 0; return (__a > __b) ? -1 : 1; }';
        this.script('__items.sort(' + t + ');');
    } else {
        this.script('__items.sort();');
        this.script('__items.reverse();');
    }
    return this;
};

(function(Array) {
    Array.prototype.qGroupBy = function(callback, params) {
        var self = this, result = {}, i = 0, ii = self.length, item, itemKey;
        if (ii > 0) {
            callback = predicateIIP(callback) || returnInputValue;

            for (; i < ii; ++i) {
                item = self[i];
                itemKey = callback(self[i], i, params);

                (result[itemKey] || (result[itemKey] = [])).push(item);
            }
        }

        return result;
    };

    Array.prototype.qMap = function (keyCallback, valueCallback, params) {
        var self = this, result = {}, i = 0, ii = self.length, item;
        if (ii > 0) {
            keyCallback = predicateIIP(keyCallback) || returnInputValue;
            valueCallback = predicateIIP(valueCallback) || returnInputValue;

            for (; i < ii; ++i) {
                item = self[i];
                result[keyCallback(item, i, params)] = valueCallback(item, i, params);
            }
        }

        return result;
    };
    Array.prototype.qSelect = function(callback, params) {
        var self = this, result = [], i = 0, ii = self.length, item;
        if (ii > 0) {
            callback = predicateIIP(callback) || returnInputValue;

            for (; i < ii; ++i) {
                item = self[i];
                result.push(callback(item, i, params));
            }
        }

        return result;
    };

    Array.prototype.qSelectNonNull = function (callback, params) {
        var self = this, result = [], i = 0, ii = self.length, item;
        if (ii > 0) {
            callback = predicateIIP(callback) || returnInputValue;

            for (; i < ii; ++i) {
                item = self[i];
                item = callback(item, i, params);
                if (item !== null) {
                    result.push(item);
                }
            }
        }

        return result;
    };

    Array.prototype.qSelectMany = function(callback, params) {
        var self = this, result = [], i = 0, ii = self.length, item;
        if (ii > 0) {
            callback = predicateIIP(callback) || returnInputValue;
            for (; i < ii; ++i) {
                item = callback(self[i], i, params);
                if ($.isArray(item)) {
                    result = result.concat(item);
                } else {
                    result.push(item);
                }
            }
        }

        return result;
    };

    Array.prototype.qWhere = function(callback, params) {
        if (callback) {
            var self = this, result = [], i = 0, ii = self.length, item;
            if (ii > 0) {
                callback = predicateIIP(callback);
                for (; i < ii; ++i) {
                    item = self[i];
                    if (callback(item, i, params)) {
                        result.push(item);
                    }
                }
            }

            return result;
        } else {
            return this.slice(0);
        }
    };

    Array.prototype.qDistinct = function(callback, params) {
        var self = this, result = [], i = 0, ii = self.length, item, itemKey;
        if (ii > 0) {
            callback = predicateIIP(callback);
            if (callback) {
                var keys = [];
                for (; i < ii; ++i) {
                    item = self[i];
                    itemKey = callback(item, params);

                    if (keys.indexOf(itemKey) === -1) {
                        keys.push(itemKey);
                        result.push(item);
                    }
                }
            } else {
                for (; i < ii; ++i) {
                    item = self[i];

                    if (result.indexOf(item) === -1) {
                        result.push(item);
                    }
                }
            }
        }

        return result;
    };

    Array.prototype.qAny = function (callback, params) {
        var self = this, i = 0, ii = self.length;
        if (ii > 0) {
            callback = predicateIIP(callback) || returnInputValue;

            for (; i < ii; ++i) {
                if (callback(self[i], i, params)) {
                    return true;
                }
            }
        }

        return false;
    };

    //Array.prototype.qAggregate = function (callback, input, params) {
    //    var self = this, i = 1, ii = self.length;
    //    if (ii > 0) {
    //        callback = predicateLRP(callback) || returnInputValue;

    //        var val = input;
    //        for (; i < ii; ++i) {
    //            val = callback(val, self[i], params);
    //        }
    //        return val;
    //    }

    //    return undefined;
    //};

    Array.prototype.qContains = function(value) {
        return this.indexOf(value) !== -1;
    };
    Array.prototype.qForEach = function(callback, params) {
        for (var i, ii = this.length; i < ii; i++) {
            if (callback(this[i], i, params) === false) {
                break;
            }
        }
    };

    Array.prototype.qAll = function(callback, params) {
        var self = this, i = 0, ii = self.length;

        callback = predicateIIP(callback) || returnInputValue;
        for (; i < ii; ++i) {
            if (!callback(self[i], i, params)) {
                return false;
            }
        }

        return true;
    };

    var sortCache = new FunctionCache();
    Array.prototype.qSort = function(field) {
        var fmt = function(nm, asc) {
            return asc
                ? 'if (a["' + nm + '"]<b["' + nm + '"])return 1;if (a["' + nm + '"]>b["' + nm + '"])return -1;'
                : 'if (a["' + nm + '"]>b["' + nm + '"])return 1;if (a["' + nm + '"]<b["' + nm + '"])return -1;';
        };

        var s = '';
        if (typeof field === 'string') {
            s+=(fmt(field));
        } else if ($.isArray(field)) {
            field.qEach(function(v) { s+=(fmt(v)); });
        }
        s+=('return 0;');
        var f = sortCache.get(s, ['a', 'b']);

        return this.sort(f);
    };

    Array.prototype.qFirst = function(predicate, params) {
        var self = this, ii = self.length;
        if (ii > 0) {
            if (predicate) {
                var filtered = self.qWhere(predicate, params);
                return filtered.length === 0 ? null : filtered[0];
            } else {
                return self[0];
            }
        } else {
            return null;
        }
    };
    Array.prototype.qLast = function(predicate, params) {
        var self = this, ii = self.length;
        if (ii > 0) {
            if (predicate) {
                var filtered = self.qWhere(predicate, params);
                return filtered.length === 0 ? null : filtered[filtered.length - 1];
            } else {
                return self[ii - 1];
            }
        } else {
            return null;
        }
    };
    Array.prototype.qReverse = function() {
        var copy = this.slice(0);
        copy.reverse();
        return copy;
    };
    Array.prototype.qTake = function(count) {
        var copy = this.slice(0, count);
        return copy;
    };
    Array.prototype.qSkip = function(count) {
        var copy = this.slice(count, this.length);
        return copy;
    };

    function returnJoinAsArray(l, r) { return [l, r]; };

    Array.prototype.qJoin = function(rightArray, predicate, selector, params) {
        predicate = predicateLRP(predicate);
        selector = predicateLRP(selector) || returnJoinAsArray;

        var li = 0, ri = 0, lii = this.length, rii = rightArray.length, result = [], l, r;
        for (; li < lii; ++li) {
            l = this[li];
            for (ri = 0; ri < rii; ++ri) {
                r = rightArray[ri];
                if (predicate(l, r, params)) {
                    result.push(selector(l, r, params));
                }
            }
        }
        return result;
    };
    Array.prototype.qEach = arrayEachThis;
    Array.prototype.qSingleOrNull = function(predicate, params) {
        var items = this.qWhere(predicate, params);
        if (items.length === 1) {
            return items[0];
        } else {
            return null;
        }
    };
    Array.prototype.qCount = function(predicate, params) {
        return this.qWhere(predicate, params).length;
    };
})(window.Array);


function isPromise(obj) {
    return obj && $.isFunction(obj.promise);
}

function commandManager(innerCommandManager) {
    var self = this;
    var _commands = {};
    var inner = innerCommandManager||null;

    function resolveDeps(obj, input) {
        var result = input;
        var root = $.Deferred();

        if ($.isPlainObject(result) === false) {
            result = {};
        }

        var i = 0, j = 0;
        var arr = [];
        zpForEachProperty(obj, function (val, key) {
            if (key in result === false) {
                arr[i++] = [key, val];
            }
        });

        function step() {
            if (j < arr.length) {
                // Grab the next in queue.
                var key = arr[j][0];
                var val = arr[j][1];

                if (typeof val == 'string') {
                    if (val.indexOf('RESOLVE WITH ') == 0) {
                        // Resolve with other command.
                        var name = val.substr(13);
                        var execute = self.execute(name, null);

                        execute.then(function (res) {
                            result[key] = res;

                            // Next step.
                            j++; setTimeout(function () { step(); }, 0);
                        }, function (res) {
                            root.reject(new Error('Missing parameter ' + key + '.\n' + res));
                        });
                    }
                } else {
                    result[key] = val;

                    // Next step.
                    j++; setTimeout(function () { step(); }, 0);
                }
            } else {
                root.resolve(result);
            }
        }

        setTimeout(function () { step(); }, 0);

        return root.promise();
    }

    this.require = function (argument, pattern) {
        return resolveDeps(pattern, argument);
    };

    this.register = function (name, callback, canCallback, ref) {
        var commandHandler = {
            ref: ref || this,
            callback: callback,
            canCallback: canCallback || true
        };

        _commands[name] = commandHandler;
        return this;
    };
    this.assign = function (commands) {
        zpForEachProperty(commands, function (cmd, key) {
            if ($.isFunction(cmd)) {
                self.register(key, cmd);
            } else {
                self.register(key, cmd.execute, cmd.canExecute, cmd.ref);
            }
        });
        return this;
    };

    this.unregister = function (name) {
        delete _commands[name];
        return this;
    };

    function executeCore(handler, context, ref) {
        var result;
        try {
            result = handler.callback.call(ref || handler.ref, context, self);
            if (!isPromise(result)) {
                var wrapped = $.Deferred();
                wrapped.resolve(result);

                result = wrapped.promise();
            }
            return result;
        } catch (ex) {
            zpDebug('Command Error: ' + ex.toString());

            result = $.Deferred();
            result.reject(ex);

            return result.promise();
        }
    }

    this.execute = function(name, context, ref) {
        var handler = _commands[name];
        if (handler) {
            return executeCore(handler, context, ref);
        } else if (inner) {
            // Use the inner command manager as fallback.
            return inner.execute(name, context, ref);
        } else {
            var result = $.Deferred();
            result.reject(new Error("Command " + name + " could not be found."));

            return result.promise();
        }
    };

    this.canExecute = function (name, context, ref) {
        var handler = _commands[name];
        if (handler) {
            if (handler.canCallback === true) {
                return true;
            }

            return handler.canCallback.call(ref || handler.ref, context);
        } else if (inner) {
            // Use the inner command manager as fallback.
            return inner.canExecute(name, context, ref);
        } else {
            return null;
        }
    };

    this.get = function (key, context) {
        var cmd = _commands[key];
        if (cmd) {
            var canExecute = cmd.canCallback === true || cmd.canCallback(cmd.commandName, context);
            return { key: key, context: context, can: canExecute, execute: function () { return executeCore(cmd, this.context); } };
        } else if (inner) {
            // Use the inner command manager as fallback.
            return inner.get(key);
        } else {
            return null;
        }
    };

    this.list = function() {
        var keys = [];
        zpForEachProperty(_commands, function(item, key) { keys.push(key); });

        if (inner) {
            // Use the inner command manager as fallback.
            keys = keys.concat(inner.list(name, context, ref)).qDistict();
        }

        keys.sort();
        return keys;
    };

    this.help = function (key) {
        var cmd = _commands[key];
        if (cmd) {
            return { key: key, param: cmd.param, description: cmd.description, returnValue: cmd.returnValue };
        } else if (inner) {
            // Use the inner command manager as fallback.
            return inner.help(key);
        } else {
            return null;
        }
    };
}

function commandListItemBuilder(cmd) {
    this.showWhen = function (callback) {
        cmd.conditions.include(callback);
        return this;
    };
    this.hideWhen = function (callback) {
        cmd.conditions.exclude(callback);
        return this;
    };

    this.executeWith = function (callback) {
        if (typeof callback == 'string') {
            callback = new Function('__item', 'with(__item){return(' + callback + ');}');
        }
        cmd.contextCallback = callback;
        return this;
    };

    this.match = function (context) {
        return cmd.conditions.match(context);
    };
}

function commandList() {
    var _commands = [];

    this.add = function (key) {
        var cmd = { key: key, conditions: new ZillionParts.Condition(), contextCallback: null };
        _commands.push(cmd);

        return new commandListItemBuilder(cmd);
    };

    this.remove = function (key) {
        _commands = _commands.qWhere('key !== $params', key);
    };

    this.get = function (context, manager, resources) {
        var validCommands = _commands.qWhere('conditions.match($params)', context);

        var result = [];
        for (var i = 0; i < validCommands.length; i++) {
            var command = validCommands[i];

            if (manager) {
                // Lookup the command in the manager.
                var coreCommand = manager.get(command.key, context);
                if (coreCommand) {
                    // Command has been found,
                    // add the context, parameter, enabled properties and add execute function to the returned command.
                    coreCommand.context = context;

                    if (command.contextCallback) {
                        coreCommand.context = command.contextCallback(context);
                    } else {
                        coreCommand.context = context;
                    }

                    coreCommand.enabled = manager.canExecute(coreCommand.key, coreCommand.context, coreCommand);
                    coreCommand.execute = function () {
                        return manager.execute(this.key, this.context);
                    };

                    result.push(coreCommand);
                } else {
                    zpTrace('CommandList: Command key not found ' + command.key + '.');
                }
            }
        }

        if (resources) {
            return resources.extend(result);
        }

        return result;
    };
    this.getBindings = function (context, resources) {
        var validCommands = _commands.qWhere('conditions.match($params)', context);

        var result = [];
        for (var i = 0; i < validCommands.length; i++) {
            var command = validCommands[i];

            // Lookup the command in the manager.
            var coreCommand = {
                key: command.key, context: context, can: function() { return true; },
                execute: function() {
                },
                element: null
            };

            // Command has been found,
            // add the context, parameter, enabled properties and add execute function to the returned command.
            coreCommand.context = context;

            if (command.contextCallback) {
                coreCommand.context = command.contextCallback(context);
            } else {
                coreCommand.context = context;
            }

            coreCommand.enabled = coreCommand.can();
            coreCommand.execute = function() {
                return this.element.triggerCommand(this.key, this.context, this);
            };

            result.push(coreCommand);
        }

        if (resources) {
            return resources.extend(result);
        }

        return result;
    };
}

function commandResources(innerCommandResources) {
    var self = this;
    var _commands = {};

    self.inner = innerCommandResources || null;

    function compileResource(item) {
        var script = 'var __res={};with($data){';
        var args = [];

        zpForEachProperty(item.items, function (res) {
            var when = res.when;
            if (when) {
                script += 'try{';

                if (typeof (when) == 'string') {
                    script += 'if (!!(' + when + '))';
                } else {
                    script += 'if (__arg[' + args.length + ']($data))';
                    args.push(when);
                }

                // start if block
                script += '{';
            }

            zpForEachProperty(res, function (a, k) {
                if (k != 'when') {
                    if ($.isFunction(a)) {
                        script += '__res.' + k + '=(' + a.toString() + ')($data);';
                    } else {
                        script += '__res.' + k + '=' + JSON.stringify(a) + ';';
                    }
                }
            });

            if (when) {
                // end if block
                script += '}';
                script += '}catch(__eat){ZillionParts.CommandResources.Errors.push(__eat); if(ZillionParts.CommandResources.Errors.length === 1) { console.log("Command resource binding errors."); } }';
            }
        });

        script += '}return __res;';

        if (args.length === 0) {
            return new Function('$data', script);
        } else {
            return new Function('__arg, $data', script).bind(self, args);
        }
    }

    commandResources.Errors = [];

    function registerInternal(key, options) {
        options = $.extend(true, {}, options);

        // Create a new key when it doesn't exist yet.
        var commandEntry = _commands[key];
        if (!commandEntry) {
            _commands[key] = commandEntry = { get: null, items: [] };
        }

        // Add the new entry.
        commandEntry.items.push(options);
        commandEntry.get = compileResource(commandEntry);
    }

    this.register = function (key, options) {
        if ($.isArray(options)) {
            zpForEachProperty(options, function (e) { registerInternal(key, e); });
        } else {
            registerInternal(key, options);
        }
        return this;
    };

    this.assign = function (obj) {
        zpForEachProperty(obj, function (options, key) {
            self.register(key, options);
        });
        return this;
    };

    this.resolve = function (key, context) {
        var resources = _commands[key];
        if (resources) {
            return resources.get(context);
        }

        if (self.inner) {
            return self.inner.resolve(key, context);
        }

        zpTrace('CommandResources: No resource found for command key ' + key + '.');
        return null;
    };

    this.extend = function (items) {
        if (self.inner) {
            return items.qSelect(function (cmd) {
                return $.extend(true, cmd, self.resolve(cmd.key, cmd.context));
            });
        } else {
            return items.qSelect(function (cmd) {
                return $.extend(true, cmd, self.resolve(cmd.key, cmd.context));
            });
        }
    };
}


function commandBinding(element, options) {
    options = options || { };
    if (!options.manager) {
        options.manager = new ZillionParts.CommandManager();
    }
    if (!options.resources) {
        options.resources = new ZillionParts.CommandResources();
    }

    var $this = $(element);
    $this.data('command-manager', options.manager);
    $this.data('command-resources', options.resources);

    $this.on('command', function (e) {
        var args = e.command;
        var cmd = options.manager.get(args.command, args.argument);
        if (cmd) {
            args.returnValue = cmd.execute();
            e.stopPropagation();
            e.preventDefault();
        }
    });
    $this.on('click', '[command]', function (e) {
        var $c = $(this);
        var cmd = $c.data('command-key');
        var arg = $c.data('command-argument');
        var context = $c.data('command-context');

        if (typeof context == 'undefined') {
            context = $c;
        }

        $c.triggerCommand(cmd, arg, context, e);
    });

    return options;
}

function triggerCommand(element, command, argument, context, event) {
    var args = {
        command: command,
        argument: argument,
        context: context,
        returnValue: null,
        event: event
    };

    var commandEvent = jQuery.Event("command", { command: args });

    $(element).trigger(commandEvent);

    if (commandEvent.isPropagationStopped()) {
        event.stopPropagation();
    }
    if (commandEvent.isDefaultPrevented()) {
        event.preventDefault();
    }

    return args.returnValue;
}

function setCommand(element, command, argument, context) {
    var $this = $(element);
    $this.attr('command', '');
    $this.data('command-key', command);
    $this.data('command-argument', argument);
    $this.data('command-context', context);
}

//
// jQuery Functions.
$.fn.commandBinding = function (options) {
    var res = [];
    $(this).each(function () {
        res.push(ZillionParts.CommandBinding(this, options));
    });

    if (res.length == 0) return null;
    if (res.length == 1) return res[0];
    return res;
};
$.fn.triggerCommand = function (command, argument, context, e) {
    var res = [];
    $(this).each(function () {
        res.push(ZillionParts.TriggerCommand(this, command, argument, context, e));
    });

    if (res.length == 0) return null;
    if (res.length == 1) return res[0];
    return res;
};
$.fn.setCommand = function (command, argument, context) {
    $(this).each(function () {
        setCommand(this, command, argument, context);
    });
    return this;
};

$.extend(true, $.ui, {
    inputex: {
        defaults: {
            disabled: false,
            hoverDelay: 250,
            fadeInTime: 300,
            fadeOutTime: 300,
            hoverOpacity: 1,
            disabledClass: '',
            activeClass: '',
            hoverClass: '',
            inactiveClass: ''
        }
    }
});

$.widget('rogan.inputex', {
    options: $.ui.inputex.defaults,
    _state: null,
    _create: function () {
        var self = this,
                options = self.options,
                element = $(self.element),
                editor = element.children('div[editor]');

        // Private states.
        self._inFocus = false;
        self._inHover = false;
        self._inShownPrev = null;

        // Setup elements.
        //            element.addClass('ui-helper-clearfix');
        element.addClass('zp-inputex');
        editor.css({ opacity: 0 }).hide();

        // Initial setup.
        self.refresh();

        var isFocus = false;
        var isHovering = false;

        var delayActivate = new ZillionParts.Delay(function () { self.refresh(); }, 0, true);
        var delayHover = new ZillionParts.Delay(function () {
            if (isHovering != self._inHover || isFocus != self._inFocus) {
                self._inHover = isHovering;
                self._inFocus = isFocus;
                self.refresh();
            }
        }, options.hoverDelay, true);
        var delayHover2 = new ZillionParts.Delay(function () {
            if (isHovering != self._inHover || isFocus != self._inFocus) {
                self._inHover = isHovering;
                self._inFocus = isFocus;
                self.refresh();
            }
        }, options.hoverDelay * 2, true);

        element.on('focusin', function (e) {
            isFocus = true;
            delayHover();
        }).on('click', function (e) {
            element.find(':tabbable:first').focus();
            isFocus = true;
            delayHover();
        }).on('focusout', function (e) {
            isFocus = false;
            delayHover();
        }).hover(function () {
            isHovering = true;
            delayHover();
        }, function () {
            isHovering = false;
            delayHover2();
        });

        editor.children().addClass('zp-inputex-element');
    },
    _changeState: function (state) {
        var self = this,
                options = self.options,
                element = self.element,
                editor = element.children('div[editor]'),
                preview = element.children('div[preview]');

        if (state !== self._state) {
            // Only update when necessary.
            switch (state) {
                case 'focus':
                    element.addClass('x-activate zp-inputex-focus ' + self.options.activeClass + ' ' + self.options.hoverClass);
                    element.removeClass('zp-inputex-inactive ' + self.options.inactiveClass);

                    preview.hide();
                    editor.show();
                    self._select();

                    editor.animate({ opacity: 1, marginTop: 0 }, (options.fadeInTime / 2)|0, function () {
                        preview.hide();
                        preview.css({ marginTop: 20, opacity: 0 });
                        editor.show();
                    });
                    break;

                case 'hover':
                    element.addClass(self.options.hoverClass);
                    element.removeClass('zp-inputex-inactive x-activate ' + self.options.activeClass);

                    preview.hide();
                    editor.show();

                    editor.animate({ opacity: options.hoverOpacity, marginTop: 0 }, options.fadeInTime, function () {
                        preview.hide();
                        preview.css({ marginTop: 20, opacity: 0 });
                        editor.show();
                    });
                    break;

                default:
                    element.removeClass('x-activate ' + self.options.activeClass + '  ' + self.options.hoverClass);
                    element.addClass('zp-inputex-inactive ' + self.options.inactiveClass);

                    editor.animate({ opacity: 0, marginTop: -20 }, 0/* (options.fadeOutTime / 4)|0*/, function () {
                        editor.hide();
                        preview.animate({ marginTop: 0, opacity: 1 }, options.fadeOutTime);
                        preview.show();
                    });
            }

            setTimeout(function () {
                self.layout();
            }, 0);
            this.layout();
        }
    },
    refresh: function () {
        var self = this,
                options = self.options,
                element = self.element;

        if (options.disabled) {
            self._inFocus = self._inHover = false;
            element.addClass(self.options.disabledClass);
        } else {
            element.removeClass(self.options.disabledClass);
        }

        if (self._inFocus) {
            self._changeState('focus');
        } else if (self._inHover) {
            self._changeState('hover');
        } else {
            self._changeState('normal');
        }
    },
    _select: function () {
        var self = this,
                element = self.element,
                editor = element.children('div[editor]');

        var ccc = editor.find('input[type="text"]:first');
        if (ccc.length) {
            ccc.select();
        } else {
            if (ccc.length === 0) ccc = editor.find(':tabbable:first');
            //                if (ccc.length === 0) ccc = editor.find('select:first');
            //                if (ccc.length === 0) ccc = editor.find('input[type="button"]:first');
            //                if (ccc.length === 0) ccc = editor.find('input:first');

            if (ccc.length) {
                ccc[0].focus();
            }
        }
    },
    layout: function () {
        var self = this,
                element = self.element,
                editor = element.children('div[editor]');

        var availableWidth = element.width();
        var widthUsed = 0;
        editor.children().each(function () {
            var $this = $(this);
            if (!$this.is('[autosize]')) {
                widthUsed += $this.outerWidth(true);
            }
        });

        var editorAutoSize = editor.children('[autosize]');
        var autoSizeAvailable = availableWidth - widthUsed - 8, autoSizeWidth = (autoSizeAvailable / editorAutoSize.length) | 0;
        editorAutoSize.each(function () {
            var $this = $(this);
            var diff = $this.outerWidth(true) - $this.width();
            $this.width(autoSizeWidth - diff);
        });
    }
});

$(function () {
    // Auto initialize controls.
    $('.zp-inputex').inputex();
    $('body').on('databound', function () {
        $('.zp-inputex').inputex();
    });

    // Update layout during resizing.
    $(window).resize(function () { $('.zp-inputex:visible').inputex('layout'); });

//    // Work-around.
//    setInterval(function () {
//        $('.zp-inputex-focus:visible').inputex('layout');
//    }, 1000);
});

$.fn.positionAfter = function (to, els) {
    for (var i = 0, ii = els.length; i < ii; i++) {
        if (els[i] && els[i].length > 0) {
            this.insertAfter(els[i]);
            return;
        }
    }
    this.prependTo(to);
};

$.widget("rogan.groupPanel", {
    // default options
    options: {
        autoSize: false,
        toolBar: null,
        commands: null,
        title: null,
        height: null,
        width: null,
        fill: false,
        fillMargin: null,
        textPanel: false
    },

    // the constructor
    _create: function () {
        this.originalTitle = this.element.attr('title');
        // #5742 - .attr() might return a DOMElement
        if (typeof this.originalTitle !== "string") {
            this.originalTitle = "";
        }

        this.options.title = this.options.title || this.originalTitle;
        var self = this,
            options = self.options,
            titleId = $.ui.dialog.getTitleId(self.element),
            panel = self._panelElement = (self.element.is('.ui-group-panel') ? $(self.element) :
                ($('<div></div>'))
                    .insertAfter(self.element)
                    .addClass('ui-group-panel')),
            panelToolbar = $(panel.children('.ui-group-panel-toolbar.top')[0]
                || $('<div></div>')
                    .addClass('ui-group-panel-toolbar top'));

        var headerSource = panel.children('.ui-group-panel-header');
        if (headerSource.length === 1) {
            headerSource.addClass('ui-helper-clearfix');
            this._panelTitleBar = headerSource;
            var title = headerSource.find('.ui-group-panel-title:first');
            title.attr('id', titleId);

            if (options.title === null) {
                options.title = title.html();
            }
        } else if (this.options.title) {
            var panelHeader = $('<div class="ui-group-panel-header ui-helper-clearfix"></div>')
                .prependTo(panel);
            var panelTitle = $('<span class="ui-group-panel-title"></span>')
                        .attr('id', titleId)
                        .html(options.title)
                        .prependTo(panelHeader);
            this._panelTitleBar = panelHeader;
        }

        if (this.options.toolBar) {
            this._panelToolBar = panelToolbar;
            $(this.options.toolBar).appendTo(panelToolbar);
            panelToolbar.positionAfter(panel, [this._panelTitleBar]);
        }

        var contentSource = panel.children('.ui-group-panel-content');
        if (contentSource.length === 1) {
            contentSource.addClass('');
            this._panelContent = contentSource;
        } else {
            var content = self.element
                    .removeAttr('title')
                    .addClass('ui-group-panel-content');

            content.positionAfter(panel, [this._panelToolBar, this._panelTitleBar]);
            this._panelContent = content;
        }

        if (this.options.textPanel) {
            this.element.addClass('text-panel');
        }

        if (this._panelTitleBar) {
            this._panelTitleBar.disableSelection();
        }
        var commandsPanelSource = panel.children('.ui-group-panel-toolbar.bottom');

        var hasButtons = commandsPanelSource.length === 1;
        if (hasButtons) {
            commandsPanelSource.addClass('ui-helper-clearfix');
            this._panelCommandBar = commandsPanelSource;
        } else if (options.commands) {
            var toolbarBottom = $('<div class="ui-group-panel-toolbar bottom ui-helper-clearfix"></div>'),
            uiButtonSet = $("<div></div>")
                .addClass("ui-dialog-buttonset ui-helper-clearfix")
                .appendTo(toolbarBottom);

            $(options.commands).appendTo(uiButtonSet);
            toolbarBottom.positionAfter(panel, [this._panelContent, this._panelToolBar, this._panelTitleBar]);
            this._panelCommandBar = toolbarBottom;
        }

        self._panel = panel;
        self._panelHeader = panelHeader;

        self._panel
            .on("focusin", function () { self._panel.addClass('ui-group-panel-shadow'); })
            .on("focusout", function () { self._panel.removeClass('ui-group-panel-shadow'); });
    },

    _init: function () {
        this._updateData();
    },

    _updateData: function () {
        var paddingX = this._panelContent.outerWidth(true) - this._panelContent.width();
        var paddingY = this._panelContent.outerHeight(true) - this._panelContent.height();

        if (this.options.fill) {
            this.fitToParent();
            return;
        }

        var height = this.options.height || 'auto';
        var width = this.options.width || 'auto';

        if (height == 'auto') {
            this._panelElement.css('height', 'auto');
            this.element.css('height', 'auto');
        } else {
            var nettoHeight = height;

            if (this._panelTitleBar) nettoHeight -= this._panelTitleBar.outerHeight(true);
            if (this._panelToolBar) nettoHeight -= this._panelToolBar.outerHeight(true);
            if (this._panelCommandBar) nettoHeight -= this._panelCommandBar.outerHeight(true);
            if (this._panelContent) nettoHeight -= paddingY;

            this._panel.css('height', 'auto');
            this._panelContent.css('height', nettoHeight + 'px');
        }

        if (width == 'auto') {
            this._panelElement.css('width', 'auto');
            this.element.css('width', 'auto');
        } else {
            var nettoWidth = width;

            if (this._panelElement) nettoWidth -= paddingX;

            this._panel.css('width', width + 'px');
            this._panelContent.css('width', nettoWidth + 'px');
        }
    },
    addedHeight: function () {
        var paddingY = this._panelElement.outerHeight() - this._panelElement.height();
        var paddingY2 = this.element.outerHeight() - this.element.height();

        var others = [
            this._panelTitleBar,
            this._panelToolBar,
            this._panelCommandBar
        ];
        var a = paddingY + paddingY2;
        $.each(others, function (c, b) { if (b) a += b.outerHeight(true); });
        return a;
    },
    fitToParent: function () {
        var paddingX = this._panelElement.outerWidth(true) - this._panelElement.width();
        var paddingY = this._panelElement.outerHeight(true) - this._panelElement.height();
        var paddingY2 = this.element.outerHeight(true) - this.element.height();

        var availableHeight = this._panelElement.offsetParent().height() - paddingY;
        var foo2 = this._panelElement.offsetParent().width() - paddingX;

        var a = this.addedHeight();
        this._panelElement.css({ height: availableHeight - paddingY, width: 'auto' });
        this.element.css({ height: availableHeight - a, width: 'auto' });
    },
    widget: function () {
        return this._panel;
    },
    header: function () {
        return this._panelHeader;
    },
    content: function () {
        return this._panelContent;
    },

    // called when created, and later when changing options
    _refresh: function () {
        this._updateData();
        $('#' + $.ui.dialog.getTitleId(this.element)).html(this.options.title);
    },

    // events bound via _bind are removed automatically
    // revert other modifications here
    _destroy: function () {
        this.element.removeClass("ui-group-panel");
    },

    // _setOptions is called with a hash of all options that are changing
    // always refresh when changing options
    _setOptions: function () {
        // in 1.9 would use _superApply
        $.Widget.prototype._setOptions.apply(this, arguments);

        this._refresh();
    },

    // _setOption is called for each individual option that is changing
    _setOption: function (key, value) {
        // prevent invalid color values
        if (/height|width|title/.test(key) == false) {
            return;
        }

        //        if (key === "height") {
        //            var foo = value | 0;

        //            $(this._panel).height(foo);
        //            $(this.groupPanelContent).height(foo - this.addedHeight());
        //            return;
        //        }

        // in 1.9 would use _super
        $.Widget.prototype._setOption.call(this, key, value);
    }
});

var defaultOptions = {
    appendTo: 'body',
    position: 'left bottom',
    width: 300,
    defaultTtl: 30000
};

function notifications(options) {
    var self = this;

    var _list = [];

    options = $.extend(true, {}, defaultOptions, options);

    var elementCss = {};
    var containerCss = {};
    var $closeAllContainer = null;

    this.create = function () {
        this.element = $('<div class="rog-notification-area" style="position: fixed" class="ui-helper-clearfix"></div>');

        createPosition();

        this.element.css(elementCss);

        $closeAllContainer = $('<div class="rog-notification-item-container ui-helper-clearfix" style="visibility: hidden"></div>').css(containerCss);
        var $closeAllItem = $('<div class="rog-notification-close-all rog-notification-item-clickable">Close All Notifications</div>').appendTo($closeAllContainer);
        $closeAllContainer.css({ paddingBottom: 0 });
        $closeAllItem.css({ 'float': 'left', 'width': options.width, paddingBottom: 0 });
        $closeAllItem.click(function () { self.closeAll(); });
        $closeAllContainer.appendTo(this.element);

        this.element.disableSelection();
        this.element.appendTo('body');
    };

    function createPosition() {
        var pos = (options.position || '').split(' ');
        if (pos.length === 2) {
            var p = pos[0];
            var offset = '0px';
            if (p === 'left') {
                elementCss.left = offset;
                elementCss.right = 'auto';
                containerCss.paddingLeft = '1em';
            } else if (p === 'right') {
                elementCss.left = 'auto';
                elementCss.right = offset;
                containerCss.paddingRight = '1em';
            }
            var qp = pos[1];
            if (qp === 'top') {
                elementCss.top = offset;
                elementCss.bottom = 'auto';
                containerCss.paddingTop = '0.5em';
            } else if (qp === 'bottom') {
                elementCss.top = 'auto';
                elementCss.bottom = offset;
                containerCss.paddingBottom = '0.5em';
            }
        }
        elementCss.zIndex = ZillionParts.zIndex();
    }

    function updateCloseAll() {
        if (_list.length > 1) {
            $closeAllContainer.css('visibility', 'visible');
        } else {
            $closeAllContainer.css('visibility', 'hidden');
        }
    }

    this.closeAll = function() {
        $.each(_list, function(i, e) { e.close(); });
    };

    this.add = function (item) {
        var $item = notificationItemRenderer(item);
        if (!item.ttl) {
            item.ttl = options.defaultTtl;
        }

        $item.css({ 'float': 'left', 'width': options.width });
        $item.hover(function () {
            $item.addClass('rog-notification-item-hover');
        }, function () {
            $item.removeClass('rog-notification-item-hover');
        });

        var $p = $('<div class="rog-notification-item-container ui-helper-clearfix"></div>').css(containerCss);
        $item.appendTo($p);
        $p.insertBefore($closeAllContainer);

        $p.hide().slideDown();

        var handle = { ui: $item, item: item };
        var handler = new notificationHandler(item, $item, handle);
        handle.close = handler.close;
        // Dirty Fix.
        _list.push(handle);
        item.onClosed.subscribe(function () {
            var i = _list.indexOf(handle);
            _list.splice(i, 1);
            $p.remove();

            setTimeout(function () { updateCloseAll(); }, 0);
        });

        setTimeout(function () { updateCloseAll(); }, 0);

        // Update to latest z-index.
        self.element.css({ zIndex: ZillionParts.zIndex() + 1});

        return handle;
    };
}

function notificationItem() {
    this.onClosed = new ZillionParts.Event();
    this.type = '';
    this.cssClass = '';
    this.title = '';
    this.message = '';
}

function notificationHandler(item, $item, handle) {
    var self = this;
    var _closed = false;

    var _lastActive = Date.now();
    var _inHover = false;
    var closeDelay = 2000;
    var keepAliveTime = 3000;

    function startClosing() {
        if (_inHover || (Date.now() - _lastActive < keepAliveTime)) {
            setTimeout(startClosing, keepAliveTime);
            return;
        }

        self.fadeOut();
        setTimeout(function() {
            if (_inHover || (Date.now() - _lastActive < keepAliveTime)) {
                setTimeout(startClosing, keepAliveTime);
                return;
            }
            self.close();
        }, closeDelay);
    }

    this.keepAlive = function() {
        _lastActive = Date.now();
    };

var minTime = Math.max(closeDelay, item.ttl - closeDelay);
    setTimeout(startClosing, minTime);

    $item.find('.rog-notification-close:first').click(function () {
        self.close();
        return false;
    });
    $item.hover(function () {
        self.keepAlive();
        _inHover = true;
        self.fadeIn();
    }, function () {
        _inHover = false;
    });

    if (item.click) {
        $item.addClass('rog-notification-item-clickable');
        $item.click(function () { item.click(handle); });
    }

    this.close = function () {
        if (_closed) {
            return;
        }
        $item.animate({ opacity: 0.0 }, 300, function () {
            $item.remove();
            try {
                item.onClosed.notify(handle);
            } finally {
                item.ui = null;
            }
        });
        _closed = true;
    };
    this.fadeOut = function () {
        $item.animate({ opacity: 0.6 }, 1000);
    };
    this.fadeIn = function () {
        $item.animate({ opacity: 1 }, 200);
    };
}

function notificationItemRenderer(item) {
    var typeCssClass = '';
    switch (item.type) {
        case 'error':
            typeCssClass = 'rog-notification-item-error';
            break;
        case 'info':
        case 'information':
            typeCssClass = 'rog-notification-item-info';
            break;
        case 'success':
            typeCssClass = 'rog-notification-item-success';
            break;
    }

    var $result = $('<div class="rog-notification-item"></div>').addClass(typeCssClass + item.cssClass);

    var $titleDiv = $('<div class="rog-notification-title"></div>').appendTo($result);
    $('<span></span>').append(item.title).appendTo($titleDiv);
    $('<div class="rog-notification-close">X</div>').appendTo($titleDiv);

    var $contentDiv = $('<div class="rog-notification-content"></div>').appendTo($result);
    $('<span class="rog-notification-message"></span>').append(item.message).appendTo($contentDiv);

    return $result;
}

(function($) {
    $.widget("rogan.listbox", {
        _create: function() {
            // hide this.element
            this.selectedList = $('<ul class="ui-multiselect selected" style="float: left;"></ul>').appendTo(this.element);
            this.availableList = $('<ul class="ui-multiselect available" style="float: right;"></ul>').appendTo(this.element);
            this.selectedList.width('45%');
            this.availableList.width('45%');
            this.populateLists();


            if (this.options.sortable) {
                // make current selection sortable
                $(this.selectedList).sortable({
                    axis: 'y',
                    distance: 5,
                    update: function(event, ui) {
                        $(this).find('.ui-multiselect-item').each(function(i, e) { $(e).data('item').idx = i; });
                    }
                });
            }

            this.element.disableSelection();
            //            this.element.on("hover", ".ui-multiselect-item", function () {
            //                $(this).toggleClass('ui-state-hover');
            //            });
        },
        destroy: function() {
            this.selectedList.remove();
            this.availableList.remove();

            $.Widget.prototype.destroy.apply(this, arguments);
        },
        populateLists: function() {
            this.selectedList.empty();
            this.availableList.empty();

            var that = this;
            var items = that.options.items;
            var selectedItems = items.filter(function(i) { return i.selected; });
            var availableItems = items.filter(function(i) { return !i.selected; });
            selectedItems.sort(function(a, b) {
                a = a.idx;
                b = b.idx;
                if (a === b)
                    return 0;
                return a > b ? 1 : -1;
            });
            availableItems.sort(function(a, b) {
                a = a.text;
                b = b.text;
                if (a === b)
                    return 0;
                return a > b ? 1 : -1;
            });
            $.each(selectedItems,
                function() {
                    var item = $('<li class="ui-multiselect-item ui-state-default">'
                        + '<span class="ui-multiselect-item-move ui-icon"></span>'
                        + this.text
                        + '<a class="ui-multiselect-item-toggle ui-link"><span class="ui-corner-all ui-icon"></span></a>'
                        + '</li>')
                        .data('item', this);

                    item.appendTo(that.selectedList);
                    that.applyItemState(item);
                });
            $.each(availableItems,
                function() {
                    var item = $('<li class="ui-multiselect-item ui-state-default">'
                        + '<span class="ui-multiselect-item-move ui-icon"></span>'
                        + this.text
                        + '<a class="ui-multiselect-item-toggle ui-link"><span class="ui-corner-all ui-icon"></span></a>'
                        + '</li>')
                        .data('item', this);

                    item.appendTo(that.availableList);
                    that.applyItemState(item);
                });
        },
        applyItemState: function(item) {
            var self = this;
            if (item.data('item').selected) {
                $(item).removeClass('ui-priority-secondary');
                if (this.options.sortable)
                    $(item).find('span:first').addClass('ui-icon-arrowthick-2-n-s').removeClass('ui-helper-hidden').addClass('ui-icon');
                else
                    $(item).find('span:first').removeClass('ui-icon-arrowthick-2-n-s').addClass('ui-helper-hidden').removeClass('ui-icon');
                $(item).find('a.ui-multiselect-item-toggle span').addClass('ui-icon-minus').removeClass('ui-icon-plus');
            } else {
                //                $(item).addClass('ui-priority-secondary');
                $(item).find('span:first').removeClass('ui-icon-arrowthick-2-n-s').addClass('ui-helper-hidden').removeClass('ui-icon');
                $(item).find('a.ui-multiselect-item-toggle span').addClass('ui-icon-plus').removeClass('ui-icon-minus');
            }
            $(item).find('a.ui-multiselect-item-toggle span').click(function() {
                var is = item.data('item').selected = !item.data('item').selected;
                if (is) {
                    var tot = 0;
                    $.each(self.options.items, function(i, e) {
                        if (e.selected) {
                            tot = Math.max(tot, e.idx);
                        }
                    });

                    item.data('item').idx = ++tot;

                    $.each(self.options.items, function(i, e) {
                        if (!e.selected) {
                            e.idx = ++tot;
                        }
                    });
                }
                item.hide('blind', 200, function() {
                    self.populateLists();
                });
            });
        }
    });
})(jQuery);

(function ($) {
    $.widget("rogan.loadingOverlay", {
        options: {
            message: 'Loading...',
            compact: false,
            overlayClass: null,
            messageClass: null,
            delay: 100,
            show: 'fade',
            hide: 'fade',
            showOverlayAfter: 0,
            hideMessageAfter: 300,
            overlayPosition: {
                at: "left top",
                my: "left top",
                collision: "none"
            },
            messagePosition: {
                collision: "none"
            }
        },
        _shown: false,
        _fluidsUpdated: function () {
            var self = this;
            if (self._shown) {
                self._layout();
            }
        },
        _create: function () {
            var self = this,
                options = self.options,
                element = self.element,
                parent = element,
                host = parent;

            if (host.is([window])) {
                host = $('body');
            }

            var maskDiv = $('<div class="loading-overlay" style="display: none"></div>').appendTo(host),
                maskMsgDiv = $('<div class="loading-overlay-message" style="display: none"></div>').appendTo(maskDiv);

            if (options.overlayClass) {
                maskDiv.addClass(options.overlayClass);
            }
            if (options.compact === true) {
                maskMsgDiv.addClass('loading-overlay-message-compact');
            }
            if (options.messageClass) {
                maskMsgDiv.addClass(options.messageClass);
            }

            if (parent.is([window]) === false && parent.css('position') === "static") {
                parent.css('position', 'relative');
            }

            self.maskMessage = maskMsgDiv;
            self.mask = maskDiv;
            self.parent = parent;

            self.maskMessage.disableSelection();
            self.mask.disableSelection();

            self.refresh();
        },
        destroy: function () {
            var self = this,
                mask = self.mask;

            self._clearTimer();
            self.hide();

            mask.remove();
        },
        _clearTimer: function () {
            var self = this,
                element = self.element;

            // if this element has delayed mask scheduled then remove it and display the new one
            if (element.data("_mask_timeout") !== undefined) {
                clearTimeout(element.data("_mask_timeout"));
                element.removeData("_mask_timeout");
            }
        },
        _show: function () {
            var self = this,
                element = self.element,
                options = self.options;

            self._clearTimer();

            if (!self._shown) {
                element.addClass("masked");

                self.mask.show();
                self._shown = true;
                self.maskMessage.stop(true, true).fadeIn(200, function () { self._layout(); });
                self.refresh();
                setTimeout(function () {
                    self._layout();
                }, 0);

                if (options.showOverlayAfter > 190) {
                    // Reposition the mask when it is shown.
                    setTimeout(function () { self._layout(); }, options.showOverlayAfter + 10);
                }
            }
        },
        _layout: function () {
            var self = this,
                options = self.options,
                element = self.element,
                mask = self.mask,
                message = self.maskMessage,
                position;

            if (self._shown) {
                var positionMask = mask.is(':visible');

                if (element.is([window])) {
                    position = { left: 0, top: 0, right: 0, bottom: 0, width: 'auto', height: 'auto', position: 'fixed' };
                } else {
                    position = { left: 0, top: 0, width: '100%', height: '100%', position: 'absolute' };
                }

                // Position the mask.
                mask.css(position);
                if (positionMask) {
                    var pos2 = $.extend(true, { of: self.element }, options.overlayPosition);
                    mask.position(pos2);
                }

                // Position the message.
                if (message) {
                    var pos = $.extend(true, { of: self.element }, options.messagePosition);
                    message.css({ left: 0, top: 0 }).position(pos);
                }
            }
        },
        refresh: function () {
            var self = this,
                options = self.options,
                message = self.maskMessage;

            var messageDiv = $('<div></div>').append(options.message);
            message.empty().append(messageDiv);
            self._layout();
        },
        _moveToTop: function () {
            var self = this;
            var visibleElementsAfterMask = self.mask.nextAll(":visible");
            if (visibleElementsAfterMask.length > 0) {
                self.mask.insertAfter(visibleElementsAfterMask.last());
            }
        },
        show: function () {
            var self = this,
                options = self.options,
                element = self.element;

            self._clearTimer();
            self._moveToTop();

            if (options.delay > 0) {
                element.data("_mask_timeout", setTimeout(function () { self._show(); }, options.delay));
            } else {
                self._show();
            }
        },
        hide: function () {
            var self = this,
                element = self.element,
                options = self.options;

            self._clearTimer();

            if (self._shown) {
                element.removeClass("masked");

                element.find("select").removeClass("masked-hidden");

                self.mask.hide();
                self._shown = false;
                self.maskMessage.stop(true, true).delay(options.hideMessageAfter).fadeOut(200);
            }
        }
    });
})(jQuery);

function compileSort(options) {
    var sortBody = 'var _val1,_val2;';

    options.qEach(function (e) {
            sortBody += '_val1 = _item1["' + e.fieldID + '"];';
            sortBody += 'if(_val1){_val1=toSortKey(_val1);}';

            sortBody += '_val2 = _item2["' + e.fieldID + '"];';
            sortBody += 'if(_val2){_val2=toSortKey(_val2);}';

            if (e.asc === false) {
                sortBody += 'if(_val1>_val2)return -1;';
                sortBody += 'else if(_val1<_val2)return 1;';
            } else {
                sortBody += 'if(_val1>_val2)return 1;';
                sortBody += 'else if(_val1<_val2)return -1;';
            }
});

    sortBody += 'return 0;';
    return new Function("_item1", "_item2", sortBody);
}

$.widget('rogan.virtualizedDataView', {
    options: {
        dataView: null,
        keyField: 'id',
        sort: [],
        onSorting: function (sort) {
        },
        onRowCreated: function ($element, data) {
        },
        onRowsRendering: function () {
        },
        onRowsRendered: function () {
        }
    },
    _usedElements: {},
    _unusedElements: {},
    _create: function () {

    },
    destroy: function () {

    },
    _setDataInformation: function (element, index, data) {
        var key = data[this.options.keyField];
        if (typeof key == 'undefined') {
            throw Error('Key not found for item of index ' + index + '.');
        }

        return element.data('item', { row: index, key: key });
    },
    _removeDataInformation: function (element) {
        return element.data('item', null);
    },
    _getDataKey: function (element) {
        return element.data('item').key;
    },
    _createItemElement: function (index) {
        var self = this,
            options = self.options;

        return self._initItemElement($('<div></div>'), index);
    },
    _initItemElement: function (element, index) {
        var self = this,
            options = self.options,
            data = self.options.dataView.getItemByIdx(index);
        var renderItemElement = self._renderItemElement(self._setDataInformation(element, index, data), data);
        options.onRowCreated(renderItemElement, data);
        return renderItemElement;
    },
    _clearItemElement: function (element) {
        var self = this;

        return self
            ._removeDataInformation(element)
            .empty();
    },
    _renderItemElement: function (element, data) {
        $('<span>' + JSON.stringify(data) + '</span>').appendTo(element);
        return element;
    },
    _currentSortList: null,
    _scrollingPreviewFieldID: null,
    _applySort: function () {
        var self = this,
            options = self.options,
            dataView = options.dataView,
            sort = options.sort;

        if (dataView) {
            // Preprocess the sort options.
            if ($.isFunction(options.onSorting)) {
                var res = options.onSorting(sort.slice(0));
                if ($.isArray(res)) {
                    sort = res;
                }
            }

            var keyField = dataView.getKeyField();
            var hasKeyField = sort.qAny('fieldID === $params', keyField);
            if (!hasKeyField) {
                sort.push({ fieldID: keyField, asc: true });
            }

            // Update scrolling preview based on the current sorting.
            self._scrollingPreviewFieldID = sort.qSelectNonNull(function (i) {
                return self._columnsConfig.qFirst('fieldID === $params && scrollingPreview === true', i.fieldID);
            }).qSelect('fieldID').qFirst();

            // Apply sort to the data set.
            var sortFields = sort.qSelect(function(s) {
                var underlyingField = self._columnsConfigFieldMap[s.fieldID];
                var underlyingSortFieldID = underlyingField && (underlyingField.sortFieldID || underlyingField.fieldID);

                return { fieldID: underlyingSortFieldID || s.fieldID, asc: s.asc };
            });
            dataView.sort(compileSort(self._currentSortList = sortFields), true);
        }
    },
    _lastSortFieldID: null,
    _lastSortFieldCount: 0,
    setFieldSort: function (fieldID, asc) {
        var self = this,
            options = self.options;

        var sort = options.sort, remove = false;
        if (typeof asc == 'undefined') {
            var count;
            if (fieldID === self._lastSortFieldID) {
                count = ++self._lastSortFieldCount;
            } else {
                self._lastSortFieldID = fieldID;
                self._lastSortFieldCount = count = 1;
            }

            if (count % 3 === 0) {
                remove = true;
            } else {
                var filter = sort.qSingleOrNull('fieldID === $params', fieldID);
                if (filter) {
                    var idx = sort.indexOf(filter);
                    asc = idx === 0 ? !filter.asc : filter.asc;
                } else {
                    asc = true;
                }
            }
        }

        sort = sort.qWhere('fieldID !== $params', fieldID);

        if (!remove) {
            sort.reverse();
            sort.push({ fieldID: fieldID, asc: asc });
            sort.reverse();
        }

        options.sort = sort;
    }
});

var vdgPerformance = {
    enabled: false,
    renderViewCount: 0,
    renderViewTime: 0
};

var debugGrid = zpDebugProxy('grid');

$.extend(true, window, {
    ZillionParts: {
        Performance: {
            VirtualDataGrid: function() {
                if (!vdgPerformance.enabled) {
                    vdgPerformance.enabled = true;
                }

                var extend = $.extend(true, {}, vdgPerformance);
                extend.renderViewAvg = extend.renderViewCount > 0 ? extend.renderViewTime / extend.renderViewCount : 0;
                return extend;
            }
        }
    }
});

function defaultCreateEmptyItem(element) {
    if (!this.dataView) {
        return 'No data source assigned.';
    }

    var length = this.dataView.getItems(true).length;
    if (length > 0) {
        var clearFilter = $('<span>No data available with the specified filters<br/>' + length + ' items available in total<br/><a class="ui-link">Clear filter</a></span>');
        clearFilter
            .find('a')
            .click(function() {
                element
                    .virtualDataGrid('clearFilter')
                    .virtualDataGrid('updateFilter');
            });
        return clearFilter;
    } else {
        return 'No data available';
    }
}

function onRowCreatedCallback(selection, options, $item, item) {
    if (selection.hasKey(item.$key)) {
        $item.addClass('virtual-data-grid-item-selected');
    }
    if (options.onRowCreated) {
        options.onRowCreated($item, item);
    }
}

function renderItemForGridCallback(fragment, item) { return this._itemRenderer.renderMethod(fragment, item.idx, item.data); };

function renderItemForGridCallbackDebug(fragment, item) { return this._itemRenderer.renderMethodDebug(fragment, item.idx, item.data); };

var virtualDataGridFuncCache = new FunctionCache();
$.widget("rogan.virtualDataGrid", $.rogan.virtualizedDataView, {
    _onSettingsChanged: null,
    _renderer: null,
    _itemRenderer: null,
    onSettingsChanged: function() { return this._onSettingsChanged; },
    options: {
        columns: [],
        rowClass: null,
        rowHeight: 30,
        headerClass: null,
        headerHeight: 30,
        showFilterRow: false,
        fillColumnWidth: false,
        gridLines: 'both',
        columnDefaults: {
            scrollingPreview: false,
            createFilterMethod: defaultFilterMethod,
            renderFieldID: null,
            filterFieldID: null,
            sortFieldID: null,
            dataType: 'general',
            allowFilter: false,
            allowSort: false,
            allowResize: false,
            allowExportHtml: true,
            visible: true,
            width: 120
        },
        selection: null,
        singleSelect: 'always',
        handleSelection: true,
        filterDelay: 200,
        userColumns: [],
        createEmptyDataItem: defaultCreateEmptyItem,
        emptyDataItemClass: 'virtual-data-grid-empty-data-item',
        expandMode: 'one',
        onItemExpanding: function(item, element) {
            return null;
        },
        onItemCollapsed: function(item, element) {
            return null;
        },
        onFilterCreated: function(filter) {
        }
    },
    /**
    * Columns Implementation
    */
    _columnsConfig: [],
    _columnsConfigFieldMap: {},
    _compileColumnOptions: function() {
        var self = this,
            options = self.options;

        var getUserColumn = function(fieldID) {
            return options.userColumns.qFirst('fieldID === $params', fieldID);
        };

        function ensureUniqueFieldID(columns) {
            var temp = {};
            columns.qEach(function(col, idx) {
                if (!col) {
                    debugGrid.trace('VirtualDataGrid: Undefined or null column; If you are running in IE, is there an empty column definition in the grid options? (i.e. [ columnA, columnB, ])');
                    throw Error(locfmt('VirtualDataGrid: Column at index ' + idx + ' is null or undefined.', { index: idx }));
                }

                var fieldID = col.fieldID;
                if (!fieldID) {
                    throw Error(locfmt('VirtualDataGrid: Null or undefined field ID at column index {index}.', { index: idx }));
                }
                if (temp[fieldID]) {
                    throw Error(locfmt('VirtualDataGrid: Duplicate field ID {fieldID} at column index {index}.', { index: idx, fieldID: fieldID }));
                }
                temp[fieldID] = true;
            });
        }

        ensureUniqueFieldID(options.columns);

        var columnsConfig = options.columns.qSelectNonNull(function(e, i) {
            var userOptions = getUserColumn(e.fieldID);
            var dataType = userOptions ? userOptions.dataType : null;
            var dataTypeName = dataType || e.dataType || options.columnDefaults.dataType || 'general';
            var dt = $.ui.virtualDataGrid.dataTypes[dataTypeName];
            if (!dt) {
                dt = { renderMethod: function() { return 'Unknown data type: ' + dataTypeName; } };
            }
            var columnBase = {
                visibleIndex: i,
                cache: function(item) { return item.$cache || (item.$cache = {}); },
                cacheItem: function(item, key, creator) {
                    var cache = this.cache(item);
                    var ci = cache[key];
                    if (ci == undefined) {
                        ci = cache[key] = creator();
                    }
                    return ci;
                }
            };
            var columnOptions = $.extend(true, columnBase, options.columnDefaults, dt, e, userOptions);

            if (columnOptions.visible === false)
                return null;

            // Custom sorting, filtering and rendering.
            if (columnOptions.renderFieldID) {
                if (!columnOptions.filterFieldID) {
                    columnOptions.filterFieldID = columnOptions.fieldID;
                }
                if (!columnOptions.sortFieldID) {
                    columnOptions.sortFieldID = columnOptions.fieldID;
                }
                columnOptions.fieldID = columnOptions.renderFieldID;
            } else {
                columnOptions.renderFieldID = columnOptions.fieldID;
                if (!columnOptions.filterFieldID) {
                    columnOptions.filterFieldID = columnOptions.fieldID;
                }
                if (!columnOptions.sortFieldID) {
                    columnOptions.sortFieldID = columnOptions.fieldID;
                }
            }

            return columnOptions;
        });
        columnsConfig.qSort('visibleIndex');

        self._itemRenderer.compile(self, self.element, columnsConfig, onRowCreatedCallback.bind(self.element, options.selection, options));
        self._columnsConfig = columnsConfig;
        self._columnsConfigFieldMap = columnsConfig.qMap('$item.fieldID');
    },
    _applyUserColumns: function(columns) {
        var self = this, options = self.options;

        $.each(columns, function() {
            var settings = this;
            if (typeof settings.fieldID !== 'string') {
                throw Error('ApplyUserColumns: fieldID should be a string (not ' + (typeof settings.fieldID) + ').');
            }

            function getUserColumn(fieldID) {
                return options.userColumns.qSingleOrNull('fieldID === $params', fieldID);
            }

            function getCompiledColumn(fieldID) {
                return self._columnsConfig.qSingleOrNull('fieldID === $params', fieldID);
            }

            var column = getUserColumn(settings.fieldID);
            if (!column) {
                options.userColumns.push(settings);
            } else {
                $.extend(true, column, settings);
            }

            $.extend(true, getCompiledColumn(settings.fieldID), settings);
        });

        self.onUserSettingsChanged();
    },
    applyUserColumns: function(columns) {
        var self = this;
        self._applyUserColumns(columns);
        self.refresh();
    },
    _fillColumns: function() {
        var self = this,
            columns = [],
            total = 0,
            width = self._viewportBounds.width - 1,
            width2 = width,
            last = 0;

        $.each(self._columnsConfig, function(i, e) {
            if (e.allowResize === true) {
                columns.push({ fieldID: e.fieldID, width: e.width });
                total += e.width;
                last = i;
            } else {
                width -= e.width;
                width2 -= e.width;
            }
        });

        $.each(columns, function(i, e) {
            if (i === last) {
                e.width = width2;
            } else {
                var foo = Math.floor((e.width / total) * (width));
                e.width = foo;
                width2 -= foo;
            }
        });

        self._applyUserColumns(columns);
        self._applyColumnHeaderWidths();
        self._applyColumnWidths();
    },
    fillColumns: function() {
        var self = this;
        self._fillColumns();
        self.refresh();
    },
    /**
    * Expanding Rows
    */
    _expandedItems: {},
    _expandedItemsCompiled: [],
    _updateExpandedItems: function() {
        var self = this, dataSet = self.options.dataView;

        zpForEachProperty(self._expandedItems, function(item, key) {
            item.idx = dataSet.getIdxByKey(key);

            if (item.idx === -1) {
                // Non-existing in data set.
                self.collapse(key);
            } else if (item.parent) {
                // Attached.
                item.height = item.element.outerHeight(true);
            } else {
                // Detached.
                item.height = 0;
            }
        });
    },
    _compileExpandedItems: function() {
        var self = this,
            dataSet = self.options.dataView,
            items = new Array(dataSet.getItems(false).length);

        var nullObject = {};
        for (var i = 0, ii = items.length; i < ii; i++) {
            items[i] = nullObject;
        }
        zpForEachProperty(self._expandedItems, function(item) {
            items[item.idx] = item;
        });
        self._expandedItemsCompiled = items;
    },
    _isItemExpanded: function(key) {
        return key in this._expandedItems;
    },
    _collapseAll: function() {
        var self = this, options = self.options;

        zpForEachProperty(self._expandedItems, function(item, key) {
            item.element.remove();
            item.parent && $(item.parent).remove(), item.parent = null;

            if ($.isFunction(options.onItemCollapsed)) {
                options.onItemCollapsed(key);
            }
        });

        self._expandedItems = {};
        self.refresh('asap');
    },
    _collapseItem: function (key) {
        var self = this, options = self.options;

        var expandedItem = self._expandedItems[key];
        if (expandedItem) {
            expandedItem.element.remove();
            expandedItem.parent && $(expandedItem.parent).remove(), expandedItem.parent = null;
            delete self._expandedItems[key];

            if ($.isFunction(options.onItemCollapsed)) {
                options.onItemCollapsed(key);
            }
        }
    },
    _expandItem: function(key) {
        var self = this, options = self.options, dataSet = options.dataView, expandedItems = self._expandedItems;

        if (self._isItemExpanded(key)) {
            //when the item is already expanded, put auto focus on the expanded item
            expandedItems[key].autoFocus = true;
            return;
        }

        if (options.expandMode === 'one') {
            for (var k in expandedItems) {
                if (expandedItems.hasOwnProperty(k)) {
                    if (k !== key) {
                        self._collapseItem(k);
                    }
                }
            }
        }


        if (!$.isFunction(options.onItemExpanding)) {
            return;
        }

        var idx = dataSet.getIdxByKey(key);
        var item = dataSet.getItemByKey(key);
        var $el = $('<div></div>');

        var element = options.onItemExpanding(item, $el);
        if (element === null) {
            // Expansion cancelled.
            return;
        }

        if (typeof element === 'undefined') {
            element = $el;
        } else {
            element = $(element);
        }

        // Text selection is disabled in the grid, we need to enable it in the expanded item
        element.on('selectstart', function(event) {
            event.stopPropagation();
        });

        expandedItems[key] = {
            key: key,
            idx: idx,
            element: element,
            height: element.outerHeight(true),
            parent: null,
            autoFocus: true
        };
    },
    expand: function(key) {
        var self = this;

        self._expandItem(key);
        self.refresh('asap');
    },
    collapse: function(key) {
        var self = this;

        self._collapseItem(key);
        self.refresh('asap');
    },
    toggle: function(key) {
        var self = this;

        if (self._isItemExpanded(key)) {
            self._collapseItem(key);
            self.refresh('asap');
        } else {
            self._expandItem(key);
            self.refresh('asap');
        }
    },
    collapseAll: function() {
        var self = this;

        self._collapseAll();
    },
    /**
    *
    */
    _viewportBounds: {},
    _updateViewportBounds: function() {
        var self = this,
            viewport = self.viewport,
            left = viewport.scrollLeft(),
            top = viewport.scrollTop(),
            width = viewport.width(),
            height = viewport.height();

        return self._viewportBounds = { left: left, top: top, height: height, width: width };
    },
    _create: function() {
        var self = this,
            options = self.options,
            uid = "vdg_" + Math.round(1000000 * Math.random()),
            element = self.element.addClass('virtual-data-grid').addClass(uid),
            header = $('<div></div>').addClass('virtual-data-grid-header ui-helper-clearfix').appendTo(element),
            columns = $('<div></div>').addClass('virtual-data-grid-columns').appendTo(header),
            filters = $('<div></div>').addClass('virtual-data-grid-filters').appendTo(header),
            viewport = $('<div></div>').addClass('virtual-data-grid-viewport').attr('tabindex', 0).appendTo(element),
            canvas = $('<div></div>').addClass('virtual-data-grid-canvas').css({ width: 1000 }).appendTo(viewport);

        self._onSettingsChanged = new ZillionParts.Event();
        self._itemRenderer = new itemRenderer();
        self.uid = uid;
        self.header = header;
        self.columns = columns;
        self.filters = filters;
        self.viewport = viewport;
        self.canvas = canvas;

        //        viewport.on('mousedown', function (e) {
        //            var x = { pageX: e.pageX, pageY: e.pageY };
        //            var p = { y: viewport.scrollTop(), x: viewport.scrollLeft() };
        //            $(window).on('mousemove.vdgmouse', function (e2) {
        //                viewport.scrollTop(p.y + (x.pageY - e2.pageY));
        //                viewport.scrollLeft(Math.max(0, Math.min(p.x + (x.pageX - e2.pageX),  canvas.width() - viewport.width())));
        //                viewport.scroll();
        //                return false;
        //            });
        //            $(window).one('mouseup', function () {
        //                $(window).off('.vdgmouse');
        //            });
        //        });

        self._setGridLines(options.gridLines);

        self.canvas.disableSelection();

        //        self._delayRenderVisibleView = self._renderVisibleView;
        self._delayRenderVisibleView = ZillionParts.Delay(self._renderVisibleView, 100, false); // 10 fps updates.

        options.selection.onChange.subscribe(function(e, args) {
            if (args.type === 'cleared') {
                $(zpSelectProperties(self._renderer.elements, '$item[0]')).removeClass('virtual-data-grid-item-selected');
            } else if (args.type === 'added') {
                var el = self._renderer.elements[args.keys];
                if (el) {
                    el.addClass('virtual-data-grid-item-selected');
                }
            } else if (args.type === 'removed') {
                var el = self._renderer.elements[args.keys];
                if (el) {
                    el.removeClass('virtual-data-grid-item-selected');
                }
            }
        });

        self._columnsChanged = true;
        self._updateFilterTimer = ZillionParts.Delay(self.updateFilter, options.filterDelay, true);
        self._renderer = new virtualViewRenderer();
        self._renderer.renderItem = renderItemForGridCallback.bind(self);

        self.viewport.bind('keydown', function(e) {
            switch (e.keyCode) {
            case 38:
            {
                // Up.
                if (options.handleSelection) {
                    var idx = self.options.dataView.getIdxByKey(options.selection.getKeys()[0]) - 1;
                    var classNames = options.dataView.getItemByIdx(idx);
                    if (classNames) {
                        options.selection.add(classNames.$key);

                        self._focus(idx, false);
                        return false;
                    }
                }
            }
            case 40:
            {
                // Down.
                if (options.handleSelection) {
                    var idx = self.options.dataView.getIdxByKey(options.selection.getKeys()[0]) + 1;
                    var itemByIdx = options.dataView.getItemByIdx(idx);
                    if (itemByIdx) {
                        options.selection.add(itemByIdx.$key);

                        self._focus(idx, true);
                        return false;
                    }
                }
            }
            case 33:
            {
                // Page Up.
                if (options.handleSelection) {
                    var idx = self.options.dataView.getIdxByKey(options.selection.getKeys()[0]) - 10;
                    var classNames = options.dataView.getItemByIdx(idx);
                    if (classNames) {
                        options.selection.add(classNames.$key);

                        self._focus(idx, false);
                        return false;
                    }
                }
            }
            case 34:
            {
                // Page Down.
                if (options.handleSelection) {
                    var idx = self.options.dataView.getIdxByKey(options.selection.getKeys()[0]) + 10;
                    var itemByIdx = options.dataView.getItemByIdx(idx);
                    if (itemByIdx) {
                        options.selection.add(itemByIdx.$key);

                        self._focus(idx, true);
                        return false;
                    }
                }
            }
            }
        });

        // Begin of Look at me
        var scrollingPreviewEl = $('<div class="virtual-data-grid-scrollingPreview" style="position: absolute; z-index: 10; background: #222; background: rgba(80,80,80,0.9); border-radius: 4px; color: #fff; padding: 2px 5px; white-space: pre; text-shadow: 0 0 2px #000"></div>');
        var scrollingPreviewElText = $('<span class="virtual-data-grid-scrollingPreview-text"></span>').appendTo(scrollingPreviewEl);
        var scrollingPreviewHideTimer = 0;
        var scrollingPreviewHide = function() {
            if (scrollingPreviewHideTimer) {
                clearTimeout(scrollingPreviewHideTimer);
            }
            scrollingPreviewHideTimer = setTimeout(function() {
                scrollingPreviewHideTimer = 0;
                scrollingPreviewEl.hide();
            }, 1000);
        };
        var scrollingPreviewShow = function(x) {
            scrollingPreviewEl.position({ my: 'right-20 center', at: 'right center', of: element, collision: 'none' });
            if (scrollingPreviewEl.is(':visible')) {
                scrollingPreviewElText.text(x);
            } else {
                scrollingPreviewElText.text(x);
                scrollingPreviewEl.show();
            }
            scrollingPreviewHide();
        };
        scrollingPreviewEl.appendTo(element);
        // End of Look at me

        var lastScrollVisualStart, lastScrollVisualEnd;
        self.viewport.bind("scroll", function() {
            var viewportBounds = self._updateViewportBounds();
            self.columns.css('left', -1000 - viewportBounds.left);
            self.filters.css('left', -1000 - viewportBounds.left);

            var scrollingPreviewFieldID = self._scrollingPreviewFieldID;
            if (scrollingPreviewFieldID) {
                try {
                    var vp = self._viewportBounds;
                    var layout = self._createLayoutSystem();

                    var visualStart = layout.skipUntil(vp.top).idx,
                        visualEnd = layout.skipUntil(vp.top + vp.height).idx;
                    if (visualStart !== lastScrollVisualStart || visualEnd !== lastScrollVisualEnd) {
                        var a = options.dataView.getItemByIdx(visualStart);
                        var b = options.dataView.getItemByIdx(visualEnd);
                        var aa = '' + a[scrollingPreviewFieldID];
                        var bb = '' + b[scrollingPreviewFieldID];
                        scrollingPreviewShow(aa.substr(0, 10) + '...\r\n---\r\n' + bb.substr(0, 10) + '...');
                        lastScrollVisualStart = visualStart;
                        lastScrollVisualEnd = visualEnd;
                    }
                } catch (ex) {
                    debugGrid.trace('LookatMe: ' + ex);
                }
            }

            if (self.__renderData.time < 100) {
                self._renderVisibleView();
            } else {
                self._delayRenderVisibleView();
            }
        });

        self.columns
            .on("click", ".virtual-data-grid-column-grip", false)
            .on("click", ".virtual-data-grid-column", function() {
                var column = $(this).data('column');
                if (column.allowSort === true) {
                    self.setFieldSort(column.fieldID);
                    self.updateSort(column.fieldID);
                    self.refresh();
                    self.onUserSettingsChanged();
                }
            });

        var lastKey = null;
        self.canvas.on('dblclick', '.virtual-data-grid-item', function(e) {
            var $this = $(this),
                key = self._getDataKey($this);

            if (lastKey === key) {
                self._itemDblClick(e, $this);
            }
        });
        self.canvas.on('click', '.virtual-data-grid-item', function(e) {
            var $this = $(this),
                key = self._getDataKey($this);

            // detail=1 prevents the event being handled when the mouse is clicked multiple times
            // (i.e. the event will not be handled during the second click of a double click).
            // In IE, detail is always 0.
            if ("detail" in e === false || e.detail <= 1) {
                self._itemClick(e, $this);
                lastKey = key;
            }
        });
        self.refresh();
    },
    _itemClick: function(e, $item) {
        var self = this,
            key = self._getDataKey($item),
            options = self.options,
            selection = options.selection,
            item = options.dataView.getItemByKey(key, true);

        if (self._trigger('itemclick', e, { item: item })) {
            if (options.handleSelection) {
                if (options.singleSelect === 'always') {
                    selection.add(key);
                } else {
                    selection.toggle(key);
                }
            }
        }
    },
    _itemDblClick: function(e, $item) {
        var self = this,
            key = self._getDataKey($item),
            options = self.options,
            selection = options.selection,
            item = options.dataView.getItemByKey(key, true);

        if (self._trigger('itemdblclick', e, { item: item })) {
            // Make sure the item is selected.
            if (options.handleSelection) {
                selection.add(key);
            }
        }
    },
    _destroy: function() {

    },
    _updateFilterTimer: null,
    _filterChanged: function() {
        this._updateFilterTimer();
    },
    clearFilter: function() {
        var self = this,
            $filters = self.filters.find('.virtual-data-grid-filter-input');

        $filters.val('');
    },
    updateFilter: function () {
        var self = this,
            options = self.options,
            $filters = self.filters.find('.virtual-data-grid-filter-input');

        var obj = {};
        $filters.each(function(i, e) {
            var $this = $(e),
                column = $this.data('column'),
                fieldID = column.filterFieldID,
                value = $this.val();

            if (fieldID && value && value != '') {
                obj[fieldID] = column.createFilterMethod(value);
            }
        });

        if ($.isFunction(options.onFilterCreated)) {
            var res = options.onFilterCreated(obj);

            if (typeof res !== 'undefined') {
                obj = res;
            }
        }

        options.dataView.setFilter(obj);
        options.dataView.refresh();
        self.refresh();
    },
    _updateSortHeaders: function() {
        var self = this,
            options = self.options,
            sort = options.sort,
            columns = self._columnsConfig,
            $headers = self.columns;

        var $column, $columns;
        $columns = $headers.children();

        $columns.each(function(columnIndex, columnElement) {
            $column = $(columnElement);

            var $order = $column.find(".virtual-data-grid-column-order");
            $order.empty();

            var col = columns[columnIndex];
            var fieldID = col.fieldID;
            var a = sort.qSingleOrNull('fieldID === $params', fieldID);
            if (a) {
                var idx = sort.indexOf(a), opacity = 0.2;
                switch (idx) {
                case 0:
                    opacity = 1;
                    break;
                case 1:
                    opacity = 0.6;
                    break;
                case 2:
                    opacity = 0.4;
                    break;
                }

                idx++;

                if (a.asc === false) {
                    $('<div class="ui-icon ui-icon-triangle-1-s"></div>').attr('title', 'Sort descending').css({ opacity: opacity }).appendTo($order);
                } else {
                    $('<div class="ui-icon ui-icon-triangle-1-n"></div>').attr('title', 'Sort ascending').css({ opacity: opacity }).appendTo($order);
                }
            } else if (col.allowSort) {
                $('<div class="ui-icon ui-icon-carat-2-n-s"></div>').attr('title', 'Click to sort').css({ opacity: 0.2 }).appendTo($order);
            }
        });
    },
    onUserSettingsChanged: function() {
        var self = this,
            options = self.options,
            sort = options.sort;

        self._onSettingsChanged.notify({ sort: sort, columns: options.userColumns }, null, self);
    },
    updateSort: function() {
        var self = this;
        self._applySort();
        self._updateSortHeaders();
    },
    visitVisibleItems: function(callback) {
        var self = this,
            renderer = self._renderer,
            dataSet = self.options.dataView,
            elements = renderer.elements;

        zpForEachProperty(elements, function(item, key) {
            callback(key, dataSet.getItemByKey(key), item);
        });
    },
    _lastRender: {},
    _clearExpansions: function() {
        var self = this, expandedItems = self._expandedItems;

        zpForEachProperty(expandedItems, function(item) {
            item.element.detach();
            item.parent && $(item.parent).remove(), item.parent = null;
        });
    },
    _clearCanvas: function() {
        var self = this;

        if (self._emptyDataItem !== null) {
            self._emptyDataItem.remove();
            self._emptyDataItem = null;
        }
    },
    __renderData: { count: 0, items: [], time: 0 },
    _renderVisibleView: function() {
        var self = this, start = Date.now();

        var viewport = self._viewportBounds;
        var expansions = self._expandedItemsCompiled;
        var itemsSource = self.options.dataView.getItems(false), itemsSourceLength = itemsSource.length;

        var layout = self._createLayoutSystem();
        if (viewport.top > 0) {
            layout.skipUntil(viewport.top);
        }
        if (layout.idx > 0) {
            layout.substract(1);
        }

        var cc = 10;
        var backCount = cc + (layout.idx % cc);
        if (layout.idx - backCount > 0) {
            layout.substract(backCount);
        } else {
            layout.substract(layout.idx);
        }

        var renderData = self.__renderData;
        renderData.count = 0;

        var maxHeight = viewport.top + viewport.height;
        var upperLimit = layout.idx;
        var items = renderData.items;

        if (itemsSourceLength) {
            var item = itemsSource[0];

            zpAssert(item, 'No data');
            if (item) {
                var key = item.$key;

                zpAssert(key !== null && key !== undefined, 'No key in data');
            }
        }

        var idx, data;
        while (layout.currentTop < maxHeight && layout.idx < itemsSourceLength) {
            idx = layout.idx;
            data = itemsSource[idx];
            zpAssert(data, 'No data');
            cc = items[renderData.count] || (items[renderData.count] = { idx: 0, top: 0, data: null, element: null, expansion: null });
            cc.idx = idx;
            cc.top = layout.currentTop;
            cc.data = data;
            cc.element = null;
            cc.expansion = expansions[idx];
            renderData.count++;

            layout.next();
        }

        var upperIndex = self._itemCount - 1;
        var idxLimit = Math.min(upperIndex, layout.idx + cc * 2 - (layout.idx % cc));
        if (idxLimit <= upperIndex) {
            while (idx < idxLimit) {
                idx = layout.idx;
                data = itemsSource[idx];
                zpAssert(data, 'No data');
                cc = items[renderData.count] || (items[renderData.count] = { idx: 0, top: 0, data: null, element: null, expansion: null });
                cc.idx = idx;
                cc.top = layout.currentTop;
                cc.data = data;
                cc.element = null;
                cc.expansion = expansions[idx];
                renderData.count++;

                layout.next();
            }
        }

        var lowerLimit = upperLimit + renderData.count;
        self._clearCanvas();
        self._lastRender = { start: upperLimit, count: upperIndex, end: lowerLimit, coreRenderTime: 0 };
        self._renderCore(layout, self._lastRender, renderData);
        renderData.time = Date.now() - start;
    },
    _headersCreated: false,
    _headersColumnConfigJsonLast: '',
    _createHeaders: function() {
        var self = this,
            options = self.options,
            columns = self._columnsConfig;

        var configJson = JSON.stringify(columns);
        if (configJson !== self._headersColumnConfigJsonLast) {
            // Config changed.
            self._headersColumnConfigJsonLast = configJson;

            var $columns = self.columns.empty(),
                $filters = self.filters.empty();

            if (self._headersCreated) {
                $columns.sortable('destroy');
                self._headersCreated = false;
            }

            for (var i = 0, ii = columns.length; i < ii; i++) {
                self._createHeaderElement($columns, columns[i]);

                if (options.showFilterRow === true) {
                    self._createFilterElement($filters, columns[i]);
                }
            }

            self.setupColumnOrderIcon();
            self.setupColumnResize();
            self._applyColumnHeaderWidths();

            $columns.on("mousedown", ".virtual-data-grid-column-grip", function(e) {
                e.stopPropagation();
            });
            $columns.sortable({
                containment: 'parent',
                axis: 'x',
                start: function() {
                    self.canvas.css({ opacity: 0.5 });
                },
                stop: function() {
                    self.canvas.css({ opacity: 1 });
                },
                update: function(event, ui) {
                    var newUserSettings = $columns
                        .children()
                        .map(function(i, e) {
                            var column = $.data(e, 'column');
                            return { fieldID: column.fieldID, visibleIndex: i };
                        });

                    self._applyUserColumns(newUserSettings);
                    self._columnsChanged = true;
                    self.refresh();
                }
            });
            $columns.sortable('refresh');

            self._headersCreated = true;
        }
    },
    _createHeaderElement: function(columnsEl, column) {
        var head = $('<div></div>')
            .addClass('virtual-data-grid-column')
            .addClass('ui-state-default')
            .attr("data-header", column.fieldID)
            .data('column', column)
            .css({ width: column.width })
            .appendTo(columnsEl);

        $('<span></span>').html(column.title).appendTo(head);
        head.disableSelection();
    },
    _createFilterElement: function($filters, column) {
        var self = this, $head, $box;

        $head = $('<div></div>')
            .addClass('virtual-data-grid-filter')
            .css({ width: column.width })
            .appendTo($filters);

        $box = $('<div class="virtual-data-grid-filter-box"></div>')
            .appendTo($head);

        if (column.getCustomFilterControl) {
            column.getCustomFilterControl(column, self.element).appendTo($box);
        } else if (column.allowFilter === true) {
            $('<input class="virtual-data-grid-filter-input" type="text" />')
                .data('column', column)
                .attr("data-column-filter", column.fieldID)
                .change(function(e) { self._filterChanged(); })
                .keydown(function(e) {
                    self._filterChanged();

                    if (e.keyCode === 13) {
                        return false;
                    }
                })
                .appendTo($box);
        }
    },
    _applyColumnHeaderWidths: function() {
        var self = this,
            columns = self._columnsConfig,
            $headers = self.columns.children(),
            $filters = self.filters.children();

        var item, newWidth;
        var i, ii, items;

        // Update headers.
        for (i = 0, items = $headers, ii = items.length; i < ii; i++) {
            item = items[i];
            newWidth = columns[i].width | 0;
            if (item.style.width !== newWidth) {
                item.style.width = newWidth + 'px';
            }
        }

        // Update filters.
        for (i = 0, items = $filters, ii = items.length; i < ii; i++) {
            item = items[i];
            newWidth = columns[i].width | 0;
            if (item.style.width !== newWidth) {
                item.style.width = newWidth + 'px';
            }
        }
    },
    _applyColumnWidths: function() {
        var self = this,
            uid = self.uid,
            columns = self._columnsConfig;

        var rowWidth = self.getItemWidth();
        var x = 0, w, rule;
        for (var i = 0, ii = columns.length; i < ii; i++) {
            w = columns[i].width;

            rule = self._findCssRule("." + uid + " .l" + i);
            rule.style.left = x + "px";

            rule = self._findCssRule("." + uid + " .r" + i);
            rule.style.right = (rowWidth - x - w) + "px";

            x += w;
        }

        rule = self._findCssRule("." + uid + " .virtual-data-grid-item");
        rule.style.width = rowWidth + "px";
    },
    _findCssRule: function(selector) {
        var self = this,
            rules = (self.styleContext.stylesheet.cssRules || self.styleContext.stylesheet.rules);

        for (var i = 0; i < rules.length; i++) {
            if (rules[i].selectorText == selector)
                return rules[i];
        }

        return null;
    },

    getItemWidth: function() {
        var self = this,
            options = self.options,
            columns = self._columnsConfig,
            style = options,
            i = columns.length,
            rowWidth = 0;

        while (i--) {
            rowWidth += columns[i].width;
        }
        return rowWidth;
    },

    _createStyleContext: function() {
        var self = this,
            uid = self.uid,
            options = self.options,
            columns = self._columnsConfig,
            style = options;

        if (self.styleContext) {
            $(self.styleContext.style).remove();
        }

        var itemWidth = self.getItemWidth();

        var rules = [
            "." + uid + " .virtual-data-grid-column { left: 1000px; height:" + style.headerHeight + "px; }",
            "." + uid + " .virtual-data-grid-columns { height:" + style.headerHeight + "px; line-height:" + (style.headerHeight - 2) + "px; }",
            "." + uid + " .virtual-data-grid-cell { height:" + style.rowHeight + "px; line-height:" + (style.rowHeight - 2) + "px; }",
            "." + uid + " .virtual-data-grid-item { width:" + itemWidth + "px; height:" + options.rowHeight + "px; }"
        ];

        var x = 0, w;
        for (var i = 0; i < columns.length; i++) {
            w = columns[i].width;
            rules.push("." + uid + " .l" + i + " { left: " + x + "px; }");
            rules.push("." + uid + " .r" + i + " { right: " + (itemWidth - x - w) + "px; }");
            x += w;
        }

        self.styleContext = createCssRules(rules);
    },

    layout: function() {
        var self = this,
            options = self.options,
            viewport = self.viewport,
            canvas = self.canvas,
            itemCount = options.dataView.getItems().length;

        self._recompile();

        var layout = self._createLayoutSystem();
        layout.skip(itemCount);

        var headerHeight = self.header.outerHeight();
        var itemWidth = self.getItemWidth();

        viewport.css({ height: self.element.height() - headerHeight });
        canvas.css({ height: layout.currentTop, width: itemWidth });

        var columnsFilled = Math.abs(self._viewportBounds.width - self.getItemWidth()) < 10;
        var vpb = self._updateViewportBounds();

        if (vpb.height < vpb.maxHeight) {
            self.viewport.addClass('virtual-data-grid-viewport-overflow');
        } else {
            self.viewport.removeClass('virtual-data-grid-viewport-overflow');
        }

        // Fill columns to the available width.
        if (options.fillColumnWidth === true) {
            self._fillColumns();
        } else if (options.fillColumnWidth === false) {

        } else if (options.fillColumnWidth === 'auto') {
            if (columnsFilled) {
                self._fillColumns();
            }
        }

        // Recalculate expanded row heights.
        zpForEachProperty(self._expandedItems, function(item) {
            if (item.parent) {
                item.height = item.element.outerHeight(true);
            }
        });
    },
    _itemCount: 0,
    _refreshTh: null,
    _recompile: function() {
        var self = this;

        // Refresh columns.
        if (self._columnsChanged) {
            self._compileColumnOptions();
            self._createStyleContext();
            self._createHeaders();
            self._columnsChanged = false;
        }
    },
    refresh: function(x) {
        var self = this,
            th = self._refreshTh,
            options = self.options;

        var callback = function() {
            // Reset.
            self._lastRender = null;
            self._renderer.clear();

            // Update.
            self._itemCount = options.dataView.getItems().length;

            self._updateExpandedItems();
            self._compileExpandedItems();
            self.layout();

            // Refresh data.
            self.updateSort();
            self._renderVisibleView();
        };
        if (!th) {
            callback();
            self._refreshTh = {};
        } else if (x === 'asap' || self.__renderData.time < 25) {
            callback();
            throttleStop(th);
        } else {
            throttle(th, callback, 100);
        }
    },
    _createLayoutSystem: function() {
        var self = this,
            options = self.options,
            expandedItems = self._expandedItemsCompiled;

        var rowHeight = options.rowHeight - 1;

        var layout = new layoutSystem();
        layout.heights = expandedItems.qSelect('(($item && $item.height)|0) + $params', rowHeight);
        layout.getItemHeight = function(idx) {
            return this.heights[idx];
        };
        return layout;
    },
    _emptyDataItem: null,
    benchmark: function(t) {
        var self = this,
            maxDuration = 1000 / 15, /* 15fps */
            maxIterations = 5,
            timeout = Date.now() + (t || 250),
            samples = [];

        for (var i = 0; i < maxIterations; i++) {
            self._lastRender = null;
            self._renderer.clear();

            var start = Date.now();
            self._renderVisibleView();
            var total = Date.now() - start;

            samples.push({ total: total, render: self._lastRender.coreRenderTime });

            if (Date.now() > timeout) {
                // Benchmark timed out.
                break;
            }
        }

        function expon(val) {
            var minv = Math.log(1);
            var maxv = Math.log(1000);
            var scales = (maxv - minv) / (1000 - 1);
            return Math.exp(minv + scales * (val - 1));
        }

        var renderTime = 0, totalTime = 0, overheadTime = 0;
        var sampleCount = samples.length;
        for (var j = 0; j < sampleCount; j++) {
            totalTime += samples[j].total;
            renderTime += samples[j].render;
            overheadTime += samples[j].total - samples[j].render;
        }

        var processOverhead = overheadTime;
        var itemCount = self._lastRender.end - self._lastRender.start;
        var scale = Math.min(maxDuration, (renderTime / sampleCount / itemCount)) * (1000 / maxDuration);
        var score = expon(1000 - scale) / 100;

        return {
            score: score,
            totalTime: renderTime / sampleCount,
            timePerItem: renderTime / sampleCount / itemCount,
            overhead: processOverhead
        };
    },
    _renderCore: function(layout, input, renderData) {
        var timeMeasure,
            self = this,
            viewport = self.viewport,
            canvas = self.canvas,
            elCanvas = self.canvas[0],
            options = self.options,
            start = input.start,
            columns = self._columnsConfig,
            end = input.end,
            renderer = self._renderer,
            itemRenderer = self._itemRenderer,
            recalcBecauseExpanded = false;

        if (start === 0 && end === 0) {
            timeMeasure = Date.now();

            // In case elements are still cached, clear them from the renderer.
            renderer.clear();

            if (self._emptyDataItem === null) {
                var html = options.createEmptyDataItem;

                // When html is a function, assume this will render the content.
                if ($.isFunction(options.createEmptyDataItem)) {
                    html = options.createEmptyDataItem(self.element);
                }

                if (html !== null) {
                    var emptyCssClass = options.emptyDataItemClass + ' ' + 'l0 r' + (columns.length - 1);
                    self._emptyDataItem = $('<div class="' + emptyCssClass + '"></div>')
                        .css({ top: 0, position: 'absolute' })
                        .html(html)
                        .appendTo(canvas);
                }
            }

            self._lastRender.coreRenderTime += Date.now() - timeMeasure;
        } else {
            var itemsFragment = window.document.createDocumentFragment();
            var expansionFragment = window.document.createDocumentFragment();

            try {
                timeMeasure = Date.now();
                renderer.renderView(itemsFragment, renderData);
                self._lastRender.coreRenderTime += Date.now() - timeMeasure;
            } catch (ex) {
                renderer.renderItem = function(fragment, x) { return itemRenderer.renderMethodDebug(fragment, x.index, x.data); };

                try {
                    renderer.renderView(itemsFragment, renderData);
                } catch (ex) {
                    throw Error('Error while rendering view: from item ' + start + ' to ' + end + '.\r\n' + ex);
                }

                throw ex;
            }

            options.onRowsRendering();

            // Compile canvas.
            var itemsToRender = renderData.items;
            var autoFocus = null, autoFocusIdx = null;

            var element, expansion, expansionElement;
            for (var i = 0, ii = renderData.count; i < ii; i++) {
                var item = itemsToRender[i];

                if (item.generation === 0) {
                    element = item.element[0];
                    element.style.top = item.top + 'px';
                    itemsFragment.appendChild(element);
                }

                expansion = item.expansion;

                // Has expansion?
                if (expansion && expansion.element) {
                    if (expansion.parent) {
                        // Parent already there, just update.
                        expansion.parent.className = 'l0 r' + (columns.length - 1);
                        expansion.parent.style.top = (item.top + options.rowHeight) + 'px';
                    } else {
                        debugGrid.debug('Virtual Data Grid: Expansion New - ' + item.data.$key);

                        // OMG, no parent found. Create one that will keep this child.
                        expansionElement = expansion.element;
                        element = $('<div class="l0 r' + (columns.length - 1) + '" style="top: ' + (item.top + options.rowHeight) + 'px; position: absolute"></div>').append(expansionElement)[0];

                        expansionFragment.appendChild((expansion.parent = element));
                        recalcBecauseExpanded = true;
                    }

                    if (expansion.autoFocus) {
                        expansion.autoFocus = false;
                        autoFocusIdx = item.idx;
                        autoFocus = expansion.parent;
                    }
                }
            }

            //// Remove non visible expansions.
            //zpForEachProperty(self._expandedItems, function(expandedItem, idx) {
            //    var hasItem = keysToRender.indexOf(idx) > -1;
            //    if (!hasItem && expandedItem.parent) {
            //        debugGrid.debug('Virtual Data Grid: Removing out of view expansion. Key ' + idx);

            //        // We no need this one.
            //        parent = expandedItem.parent;
            //        expandedItem.element.detach();
            //        expandedItem.parent.remove();
            //        expandedItem.parent = null;
            //    }
            //});
            options.onRowsRendered();

            elCanvas.appendChild(itemsFragment);
            elCanvas.appendChild(expansionFragment);
        }

        if (autoFocus !== null && autoFocusIdx !== null) {
            $(autoFocus).focusNextInput();
            self._focus(autoFocusIdx, 'top');
        }

        if (vdgPerformance.enabled) {
            vdgPerformance.renderViewCount++;
            vdgPerformance.renderViewTime += Date.now() - timeMeasure;
        }

        if (recalcBecauseExpanded) {
            // Lazy rerender; requires height update expansions, layout system recalculation - then update styles.
            self._updateExpandedItems();
            self._renderVisibleView();
        }
    },

    _setOptions: function() {
        var self = this, options = self.options;
        $.Widget.prototype._setOptions.apply(self, arguments);


        self._updateFilterTimer = ZillionParts.Delay(self.updateFilter, options.filterDelay, true);
    },
    _columnsChanged: false,
    _setOption: function(key, value) {
        if (/style|columns|request|dataView|sort|userColumns|onItemExpanding|onItemCollapsed|itemclick|itemdblclick/.test(key) === false) {
            return;
        }

        var self = this;

        if (/columns|userColumns|sort/.test(key)) {
            value = value || {};
            self._columnsChanged = true;
        }

        $.Widget.prototype._setOption.call(self, key, value);

        if (/userColumns|sort/.test(key)) {
            self.onUserSettingsChanged();
        }
        if (/gridLines/.test(key)) {
            self._setGridLines(value);
        }

        if (/columns|userColumns|sort/.test(key)) {
            self.refresh();
        }
    },
    _setGridLines: function(value) {
        this.canvas.removeClass('virtual-data-grid-lines-h');
        this.canvas.removeClass('virtual-data-grid-lines-v');
        this.canvas.removeClass('virtual-data-grid-lines-both');

        switch (value) {
        case 'both':
            this.canvas.addClass('virtual-data-grid-lines-both');
            break;
        case 'h':
            this.canvas.addClass('virtual-data-grid-lines-h');
            break;
        case 'v':
            this.canvas.addClass('virtual-data-grid-lines-v');
            break;
        }
    },

    setupColumnOrderIcon: function() {
        var self = this,
            $headers = self.columns;

        var $column, $columns;
        $columns = $headers.children();
        $columns.find(".virtual-data-grid-column-order").remove();

        $columns.each(function(columnIndex, columnElement) {
            $column = $(columnElement);
            $("<div class='virtual-data-grid-column-order'></div>").appendTo(columnElement);
        });
    },
    setupColumnResize: function() {
        var self = this,
            $headers = self.columns,
            $columns = $headers.children();

        $columns.find(".virtual-data-grid-column-grip").remove();

        var start = 0, startE = 0, width, columnSizeMode;
        $columns.each(function(columnIndex, columnElement) {
            var column = self._columnsConfig[columnIndex];
            if (column.allowResize === true) {
                $("<div class='virtual-data-grid-column-grip' draggable='true' />")
                    .appendTo(columnElement)
                    .on('click.virtualDataGrid', false)
                    .on('dragstart.virtualDataGrid', function(e) {
                        columnSizeMode = self.options.fillColumnWidth;
                        startE = e.pageX;
                        start = column.width;
                        self.canvas.css({ opacity: 0.5 });
                    })
                    .on('drag.virtualDataGrid dragend.virtualDataGrid', function(e) {
                        if (columnSizeMode === true) {

                        } else if (columnSizeMode === 'auto') {
                            width = Math.max(column.minWidth || 20, start + (e.pageX - startE));
                            self._applyUserColumns([{ fieldID: column.fieldID, width: width }]);
                            self._applyColumnHeaderWidths();
                        } else {
                            width = Math.max(column.minWidth || 20, start + (e.pageX - startE));
                            self._applyUserColumns([{ fieldID: column.fieldID, width: width }]);
                            self._applyColumnHeaderWidths();
                        }
                    })
                    .on('dragend.virtualDataGrid', function(e) {
                        self._applyColumnWidths();
                        self.canvas.css({ opacity: 1 });
                        self.refresh();
                    });
            }
        });

    },
    invalidate: function(keys) {
        var self = this,
            options = self.options;
        var refresh = false;
        var lastRenderer = self._lastRender;

        if (arguments.length === 0) {
            refresh = true;
        } else {
            $.each(keys, function(i, k) {
                // Invalidate the entry when cached.
                self._renderer.invalidate.push(k);

                // Check if one of the keys has been rendered.
                var idx = options.dataView.getIdxByKey(k);
                if (idx >= lastRenderer.start || idx < lastRenderer.end) {
                    // If so, refresh the view.
                    refresh = true;
                    return false;
                }
            });
        }

        if (refresh) {
            self._lastRender = null;
            self._renderVisibleView();
        }
    },
    _focus: function(idx, up) {
        var self = this,
            $viewport = self.viewport,
            viewport = self._viewportBounds;
        var layout = self._createLayoutSystem().skip(idx);

        var itemTop = layout.currentTop;
        var halfHeight = layout.height();
        var itemTopMiddle = (itemTop + halfHeight / 2);

        var offset = itemTopMiddle - viewport.top;

        var viewPartOuter = viewport.height / 5; // 20%
        var viewPartOuter2 = viewport.height - viewPartOuter; // 20%
        var viewPartInner = viewport.height / 4;
        var viewPartInner2 = viewport.height - viewPartInner;

        if (up === 'top') {
            $viewport.animate({ scrollTop: itemTop }, { duration: 250, queue: false });
        } else {
            if (offset > viewPartOuter && offset < viewPartOuter2) {
                // Do nothing.
            } else {
                var offsetTop = up ? viewPartInner : viewPartInner2;

                $viewport.animate({ scrollTop: itemTopMiddle - offsetTop }, { duration: 250, queue: false });
                // put focus on the viewport so user can use arrow buttons to go up and down the rows
                $viewport.focus();
            }
        }
    },
    focus: function(idx) {
        this._focus(idx, true);
    },
    focusFirstSelection: function() {
        var self = this,
            data = self.options.dataView,
            selection = self.options.selection;

        if (selection.getCount() === 0) {
            return;
        } else {
            var i = selection.getKeys()[0];
            self.focus(data.getIdxByKey(i));
        }
    },
    exportHtml: function(options) {
        options = $.extend(true, { tableClass: null, headColumnClass: null, rowClass: null }, options);
        var self = this, data = self.options.dataView.getItems();

        var columns = [];
        var rowScript = '__html+="<tr' + (options.rowClass ? ' class="' + options.rowClass + '"' : '') + '>";';
        var headerHtml = '<tr' + (options.rowClass ? ' ' + options.rowClass : '') + '>';

        self._columnsConfig.qEach(function(c, i) {
            if (c.allowExportHtml) {
                columns[i] = c;
                headerHtml += '<th' + (options.headColumnClass ? ' ' + options.headColumnClass : '') + '>' + c.title + '</th>';

                if (c.exportMethod) {
                    rowScript += '__cell = __render[' + (i | 0) + '].exportMethod(__item["' + c.fieldID + '"], __item, __grid, { type: "html-table" });';
                    rowScript += 'if (__cell) {';
                    rowScript += '__cell = $("<div></div>").append(__cell).html();';
                    rowScript += '} else { __cell = ""; }';
                    rowScript += '__html+=("<td>"+__cell+"</td>");';
                } else if (c.renderMethod) {
                    rowScript += '__cell = __render[' + (i | 0) + '].renderMethod(__item["' + c.fieldID + '"], __item, __grid);';
                    rowScript += 'if (__cell) {';
                    rowScript += '__cell = $("<div></div>").append(__cell).html();';
                    rowScript += '} else { __cell = ""; }';
                    rowScript += '__html+=("<td>"+__cell+"</td>");';
                } else {
                    rowScript += '__html+=("<td>"+(__item["' + c.fieldID + '"]||"")+"</td>");';
                }
            }
        });
        rowScript += '__html+="</tr>\\r\\n";';
        headerHtml += '</tr>';

        var bodyScript = '';
        bodyScript += 'var __html="",__item,__cell;';
        //        bodyScript += '__data.qEach(function(__item) {';
        bodyScript += 'for (var i = 0, ii = __data.length; i < ii; i++) { __item = __data[i]; ' + rowScript + ' }';
        bodyScript += 'return __html';
        var bodyF = virtualDataGridFuncCache.get(bodyScript, ['__data', '__render', '__grid']);

        var bodyHtml = bodyF(data, columns, self.element);
        var tableHtml = '';

        tableHtml += '<table' + (options.tableClass ? ' ' + options.tableClass : '') + '>';
        tableHtml += '<thead>';
        tableHtml += headerHtml;
        tableHtml += '</thead>';
        tableHtml += '<tbody>';
        tableHtml += bodyHtml;
        tableHtml += '</tbody>';
        tableHtml += '</table>';

        return tableHtml;
    }
});

function createCssRules(rules) {
    var styleElement = $('<style type="text/css" rel="stylesheet" />').appendTo('head');

    if (styleElement[0].styleSheet) { // IE
        styleElement[0].styleSheet.cssText = rules.join(" ");
    } else {
        styleElement[0].appendChild(document.createTextNode(rules.join(" ")));
    }

    var stylesheet = null;
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
        if ((sheets[i].ownerNode || sheets[i].owningElement) == styleElement[0]) {
            stylesheet = sheets[i];
            break;
        }
    }

    return { style: styleElement, stylesheet: stylesheet };
}

function defaultFilterMethod(val) {
    return ZillionParts.Data.WildCardToRegex(val);
}

var defaultDataTypes = {
    "general": {

    },
    "boolean": {
        "renderMethod": function(data, item) {
            return '<input type="checkbox" disabled="disabled"' + (data ? ' checked="true"' : '') + '"></input>';
        }
    }
};

$.extend(true, $.ui, {
    virtualDataGrid: {
        dataTypes: defaultDataTypes
    }
});

function subclass(base, type, ex) {
    type.prototype = new base;
    $.extend(true, type.prototype, ex);
}

function layoutSystem() {
    return {
        idx: 0,
        currentTop: -1,
        getItemHeight: function(idx) {
            return 30;
        },
        reset: function() {
            this.idx = 0;
            this.currentTop = -1;
        },
        skip: function(count) {
            while (count > 5) {
                this.currentTop += this.getItemHeight(this.idx++)
                    + this.getItemHeight(this.idx++)
                    + this.getItemHeight(this.idx++)
                    + this.getItemHeight(this.idx++)
                    + this.getItemHeight(this.idx++);

                count -= 5;
            }

            while (count-- > 0) {
                this.currentTop += this.getItemHeight(this.idx++);
            }
            return this;
        },
        substract: function(count) {
            while (count > 5) {
                this.currentTop -= this.getItemHeight(--this.idx)
                    + this.getItemHeight(--this.idx)
                    + this.getItemHeight(--this.idx)
                    + this.getItemHeight(--this.idx)
                    + this.getItemHeight(--this.idx);

                count -= 5;
            }

            while (count-- > 0) {
                this.currentTop -= this.getItemHeight(--this.idx);
            }

            return this;
        },
        skipUntil: function(top) {
            while (this.currentTop <= top) {
                this.currentTop += this.getItemHeight(this.idx++);
            }
            return this;
        },
        next: function() {
            var currentTop = this.currentTop;
            this.currentTop += this.getItemHeight(this.idx++);
            return currentTop;
        },
        height: function(idxOffset) {
            return this.getItemHeight(this.idx + (idxOffset | 0));
        }
    };
};

function renderCache() {
    this.cache = {};
}

renderCache.prototype = {
    cache: null,
    count: 0,
    onRemove: function(key, element) {},
    clean: function() {
        var self = this, cache = self.cache;

        zpSelectProperties(cache, function(entry, key) {
            if (entry.gen++ > 10) {
                return key;
            } else {
                return undefined;
            }
        }).qForEach(function(n, key) {
            var entry = cache[key];
            self.count--;
            entry.element.remove();
            self.onRemove(key, entry.element);
            delete cache[key];
        });
    },
    getCount: function() {
        return this.cache.length;
    },
    put: function(key, element) {
        var self = this;
        self.remove(key);
        self.count++;
        self.cache[key] = { gen: 0, element: element };
    },
    get: function(key) {
        var entry = this.cache[key];
        if (entry) {
            entry.gen = 0;
            return entry.element;
        }

        return null;
    },
    clear: function() {
        var self = this,
            cache = self.cache;

        self.cache = {};
        self.count = 0;

        zpForEachProperty(cache, function(e, i) {
            e.element.remove();
            self.onRemove(i, e.element);
        });
    },
    remove: function(key) {
        var self = this, entry = self.cache[key];
        if (entry) {
            self.count--;
            entry.element.remove();
            self.onRemove(key, entry.element);
        }
    },
    select: function(genPredictate) {
        var self = this;
        var elements = $.map(self.cache, function(e) {
            if (genPredictate(e.gen)) {
                return e.element;
            }
        });
        return $(elements);
    }
};

function virtualViewRenderer() {
    this.elements = {};
    this.invalidate = [];

    return this;
}

virtualViewRenderer.prototype = {
    elements: {},
    invalidate: [],
    clear: function() {
        var self = this;
        zpForEachProperty(self.elements, function(item, key) { self.removeItem(key, item); });
        self.elements = {};
    },
    renderItem: function(key) {
        return $('<span>No render method</span>');
    },
    removeItem: function(key, element) {
        element.empty().remove();
    },
    renderView: function(fragment, datas) {
        var self = this,
            existingElements = self.elements,
            elements = {},
            invalidate = self.invalidate,
            noInvalidates = invalidate.length === 0;

        var items = datas.items;
        for (var i = 0, ii = datas.count; i < ii; i++) {
            var renderArgs = items[i];
            var key = renderArgs.data.$key;

            var existing = existingElements[key];
            if (existing && (noInvalidates || invalidate.indexOf(key) === -1)) {
                // Element can be reused.
                delete existingElements[key];
                renderArgs.element = existing;
                renderArgs.generation = 0;
            } else {
                try {
                    existing = self.renderItem(fragment, renderArgs);
                    renderArgs.element = existing;
                    renderArgs.generation = 0;
                } catch (ex) {
                    throw Error('Unable to render item with key ' + key + '.\r\n' + ex);
                }
            }

            elements[key] = existing;
        }

        // Reset invalidate keys.
        self.invalidate = [];

        // Remove unused elements.
        //        for (var key in existingElements) {
        //            if (existingElements.hasOwnProperty(key)) {
        //                existingElements[key].detach();
        //            }
        //        }

//        setTimeout(function () {
        for (var key in existingElements) {
            if (existingElements.hasOwnProperty(key)) {
                self.removeItem(i, existingElements[key]);
            }
        }
//        }, 100);

        // Replace with new elements.
        self.elements = elements;
    }
};

function itemRenderer() {
    this.renderMethod = null;
    this.renderMethodDebug = null;
}

itemRenderer.prototype = {
    compile: function(gridinst, grid, columns, callback) {
        function htmlEncode(data) {
            if (data && typeof data === 'string') {
                return document.createElement('div').appendChild(document.createTextNode(data)).parentNode.innerHTML;
            } else {
                return data;
            }
        }

        function renderCore(debug) {
            var columnsLength = columns.length;

            var script =
                'var __key = __item.$key, __element, __content, __cells = new Array(' + columnsLength + ');' +
                    '__element = $("<div class=\'virtual-data-grid-item\'></div>");' +
                    '$.data(__element[0], "item", { item: __item, key: __key });';

            if (debug) {
                script += 'try {';
            }

            for (var i = 0, ii = columnsLength; i < ii; i++) {
                try {
                    var column = columns[i];
                    var dataAccess = '(__htmlEncode(__item["' + (column.memberPath || column.fieldID) + '"]))';

                    if (column.renderMethod) {
                        if (debug) {
                            script += ('try {');
                        }

                        var ccc = '__columns[' + i + '].renderMethod(' + dataAccess + ', __item, __grid)';
                        script += ('__cells[' + i + '] = $("<div class=\'virtual-data-grid-cell l' + i + ' r' + i + '\'></div>").append(' + ccc + ')[0];');

                        if (debug) {
                            script += ('} catch (ex) { console.log("VDG: column [' + (column.memberPath || column.fieldID) + '] with value [" + (' + dataAccess + '||"(no value)") + "] render error on [" + __key + "]. Error: " + ex.toString()); throw ex; }');
                        }
                    } else {
                        script += ('__cells[' + i + '] = $("<div class=\'virtual-data-grid-cell l' + i + ' r' + i + '\'>"+ ((' + dataAccess + '||"-") + "") +"</div>")[0];');
                    }

                } catch (ex) {
                    throw Error('Error while creating render method column: ' + column['fieldID'] + '.\r\n' + ex);
                }
            }

            if (debug) {
                script += ('} catch (ex) { console.log("VDG: render error [key: " + __key + "]."); throw ex; }');
            }

            if (callback) {
                script += ('__callback(__element, __item);');
            }

            script += ('__element.append($(__cells));');
            script += ('return __element;');
            return script;
        }

        var func1 = virtualDataGridFuncCache.get(renderCore(false), ['__gridinst', '__grid', '__columns', '__callback', '__htmlEncode', '__fragment', '__index', '__item']);
        var func2 = virtualDataGridFuncCache.get(renderCore(true), ['__gridinst', '__grid', '__columns', '__callback', '__htmlEncode', '__fragment', '__index', '__item']);
        this.renderMethod = func1.bind(null, gridinst, grid, columns, callback, htmlEncode);
        this.renderMethodDebug = func2.bind(null, gridinst, grid, columns, callback, htmlEncode);
    }
};

function mapCommands($item) {
    return { text: $item.title || $item.key, id: $item.key, enabled: $item.enabled, command: $item, iconClass: $item.iconClass && $item.iconClass["16"] };
}

$.extend(true, $.ui, {
    virtualDataGrid:
    {
        dataTypes: {
            "boolean-check": {
                "width": 40,
                "exportMethod": function(data, item) {
                    return data ? '&chi;' : '';
                },
                "renderMethod": function(data, item) {
                    return data ? '<div style="text-align: center"><i class="ui-icon ui-icon-circle-check" style="vertical-align: middle; display: inline-block"></i></div>' : '';
                }
            },
            "context-menu": {
                "allowExportHtml": false,
                "allowFilter": false,
                "allowSort": false,
                "allowResize": false,
                "width": 34,
                "title": "",
                "renderMethod": function renderContextMenu(data, row) {
                    var self = this;
                    // ADD PARAMETER CACHE PER COLUMN PER GRID
                    var foo = $('<i class="ui-custom-button command-button ui-link zillion-parts icons context-menu"></i>');
                    foo.one('click', function() {
                        var items;

                        // Use the command list.
                        var commands = self.commands;
                        if (commands && 'list' in commands && 'manager' in commands && 'resources' in commands) {
                            items = function(item) {
                                var sourceCommands = commands.list.get(item, commands.manager, commands.resources);

                                var contextMenuItems = sourceCommands.qSelect(mapCommands);

                                if (contextMenuItems.length === 0) {
                                    contextMenuItems.push({ text: 'No action possible', id: '-', enabled: false, command: { can: false } });
                                }

                                return contextMenuItems;
                            };
                        } else {
                            items = self.getContextMenuItems;
                        }

                        foo.contextMenu({
                            items: function() { return items(row); },
                            onOpen: function() {
                                if (self.openContextMenu) {
                                    self.openContextMenu(row);
                                }
                            },
                            onSelect: function (item) {
                                if (item.enabled) {
                                    if ('command' in item) {
                                        item.command.execute();
                                    } else if (self.clickContextMenu) {
                                        self.clickContextMenu(item, row);
                                    }
                                }
                            }
                        }).click();
                    });


                    return foo;
                }
            },
            "commands": {
                "allowExportHtml": false,
                "allowFilter": false,
                "allowSort": false,
                "width": 60,
                "commands": null,
                "title": "",
                "renderText": false,
                "renderMethod": function(data, itema) {
                    var self = this,
                        actions = [];

                    // Use the command list.
                    var commands = self.commands;
                    var sourceCommands;
                    if (commands && commands['list'] && commands['manager'] && commands['resources']) {
                        sourceCommands = this.cacheItem(itema, this.fieldID + "$c", function() { return commands.list.get(itema, commands.manager, commands.resources); }); // Create action icons.
                        sourceCommands.qEach(function(cmd) {
                            var iconClass = (cmd.iconClass && cmd.iconClass['16']);
                            var text = (cmd.title || cmd.key);
                            var $action = self.renderText
                                ? $('<i class="ui-custom-button command-button ' + iconClass + '" data-command="' + cmd.key + '" title="' + text + '"><span>' + text + '</span></i> ')
                                : $('<i class="ui-custom-button command-button ' + iconClass + '" data-command="' + cmd.key + '" title="' + text + '"></i> ');
                            if (cmd.enabled) {
                                cmd.element = $action;
                                $action.click(function(e) {
                                    if (cmd.enabled) {
                                        cmd.execute();
                                        e.preventDefault();
                                    }
                                });
                            } else {
                                $action.addClass('ui-custom-button-disabled');
                            }

                            actions.push($action[0]);
                        });
                    } else if (commands && commands['list'] && commands['resources']) {
                        sourceCommands = this.cacheItem(itema, this.fieldID + "$c", function() { return commands.list.getBindings(itema, commands.resources); });
                        sourceCommands.qEach(function(ocmd) {
                            var cmd = {
                                text: ocmd.title || ocmd.key,
                                id: ocmd.key,
                                command: ocmd,
                                iconClass: ocmd.iconClass && ocmd.iconClass['16'],
                                context: ocmd.context,
                                execute: ocmd.execute,
                                enabled: ocmd.enabled
                            };

                            var $action = self.renderText
                                ? $('<i class="ui-custom-button command-button ' + cmd.iconClass + '" data-command="' + cmd.id + '" title="' + cmd.text + '"><span>' + cmd.text + '</span></i>')
                                : $('<i class="ui-custom-button command-button" title="' +cmd.text + '"></i>').addClass(cmd.iconClass).attr("data-command", cmd.id);
                            $action.setCommand(cmd.id, cmd.context, cmd);

                            actions.push($action[0]);
                        });
                    }
                    var foo = $('<span></span>');
                    foo.append($(actions));
                    return foo;
                }
            }
        }
    }
});

if (isBenchmarking) {
    (function() {
        var idx = 0;

        (function recur() {
            var $grids = $('.virtual-data-grid:visible');
            if ($grids.length) {
                if (idx < $grids.length) {
                } else {
                    idx = 0;
                }

                var $grid = $($grids[idx]);
                var $label = $grid.find('span.benchmark-label');
                if (!$label.length) {
                    $label = $('<span class="benchmark-label" style="background: #080; color: #fff; padding: 2px 4px; position: absolute; right: 0; top: 0; z-index: 999999; transition: all 0.5s ease; text-shadow: 0 0 3px #000"></span>').appendTo($grid);
                }

                var results = $grid.virtualDataGrid('benchmark', 100);
                $label.html(((results.totalTime * 10) | 0) / 10 + 'ms - ' + ((results.score * 10) | 0) / 10);
                $label.css({ background: results.score > 9.5 ? '#0c0' : results.score > 9.0 ? '#080' : results.score > 7.0 ? '#a50' : results.score > 5.0 ? '#a50' : '#c00' });

                idx++;
            }
            setTimeout(recur, 1000);
        })();
    })();
}

(function ($) {
    $.extend(true, window, {
        ZillionParts: {
            GridView: {
                Behaviors: {
                    RestrictToDataSet: RestrictWithDataSet,
                    AutoSelectSingleRow: AutoSelectSingleRow,
                    ForceSingleSelect: ForceSingleSelect,
                    CtrlShiftSelection: CtrlShiftSelection
                }
            }
        }
    });

    var defaultOptions = {
        dataView: null,
        selection: null,
        gridView: null
    };

    function RestrictWithDataSet(options) {
        options = $.extend(true, {}, defaultOptions, options);

        function apply() {
            options.dataView.onUpdated.subscribe(handler);
        }

        function remove() {
            options.dataView.onUpdated.unsubscribe(handler);
        }

        function handler(e, data) {
            var keyField = options.dataView.getKeyField(),
                selection = options.selection;

            selection.filter(data, keyField);

            $(options.gridView).virtualDataGrid('refresh');
        }

        apply();

        return {
            "apply": apply,
            "remove": remove
        };
    }

    function AutoSelectSingleRow(options) {
        options = $.extend(true, {}, defaultOptions, options);

        function apply() {
            options.dataView.onUpdated.subscribe(handler);
        }

        function remove() {
            options.dataView.onUpdated.unsubscribe(handler);
        }

        function handler(e, data) {
            var keyField = options.dataView.getKeyField(),
                selection = options.selection;

            selection.filter(data, keyField);
            if (data.length == 1) {
                selection.add(data[0][keyField]);
            }

            $(options.gridView).virtualDataGrid('refresh');
        }

        apply();

        return {
            "apply": apply,
            "remove": remove
        };
    }

    function ForceSingleSelect(options) {
        var _lastKey = null;

        options = $.extend(true, {}, defaultOptions, options);

        function apply() {
            options.dataView.onUpdated.subscribe(selHandler);
            options.selection.onChange.subscribe(selHandler);
        }

        function remove() {
            options.dataView.onUpdated.unsubscribe(selHandler);
            options.selection.onChange.unsubscribe(selHandler);
        }

        function selHandler() {
            var dataView = options.dataView,
                keyField = dataView.getKeyField(),
                selection = options.selection,
                firstKey = selection.getKeys().qFirst();

            if (!firstKey) {
                setTimeout(function () {
                    if (selection.getKeys().length === 0) {
                        // Still has no selection?
                        if (_lastKey) {
                            if (dataView.getItemByKey(_lastKey)) {
                                // Last key still exists? Restore the previous (first) selection.
                                selection.add(_lastKey);
                                $(options.gridView).virtualDataGrid('refresh');
                            } else {
                                // Last key does not exist anymore, grab the first item for selection.
                                var data = dataView.getItems(false);
                                if (data.length > 0) {
                                    selection.add(data[0][keyField]);
                                    $(options.gridView).virtualDataGrid('refresh');
                                }
                            }
                        } else {
                            // No last key, grab the first item for selection.
                            var data = dataView.getItems(false);
                            if (data.length > 0) {
                                selection.add(data[0][keyField]);
                                $(options.gridView).virtualDataGrid('refresh');
                            }
                        }
                    }
                }, 0);
            } else {
                _lastKey = firstKey;
            }
        }

        apply();

        return {
            "apply": apply,
            "remove": remove
        };
    }

    function CtrlShiftSelection(options) {
        var _lastKey = null;
        var _ctrlSelect = false;
        var _shiftSelect = false;

        options = $.extend(true, {}, defaultOptions, options);

        function apply() {
            options.dataView.onUpdated.subscribe(reset);
            options.selection.onChange.subscribe(onChange);
            options.selection.setMultiSelect(true);

            $(document)
                .on('keydown.ctrlshiftselection', function (e) {
                    if (e.ctrlKey) {
                        _ctrlSelect = true;
                    }
                    if (e.shiftKey) {
                        _shiftSelect = true;
                    }
                })
                .on('keyup.ctrlshiftselection', function (e) {
                    if (!e.ctrlKey) {
                        _ctrlSelect = false;
                    }
                    if (!e.shiftKey) {
                        _shiftSelect = false;
                    }
                });
        }

        function remove() {
            options.dataView.onUpdated.unsubscribe(reset);
            options.selection.onChange.unsubscribe(onChange);

            $(options.grid).off('.ctrlshiftselection');
        }

        function onChange(e, x) {
            var xxx = options.selection.getKeys();
            if (x.type === 'adding') {
                if (_ctrlSelect === false && _shiftSelect === false && xxx.length !== 0) {
                    options.selection.clear();
                } else if (_shiftSelect && _lastKey) {
                    if (_ctrlSelect == false) {
                        options.selection.clear();
                    }

                    var start = options.dataView.getIdxByKey(_lastKey);
                    var end = options.dataView.getIdxByKey(x.keys[0]);
                    if (start > end) {
                        var ease = end;
                        end = start;
                        start = ease;
                    }

                    for (var idx = start; idx <= end; idx++) {
                        var $key = options.dataView.getItemByIdx(idx).$key;
                        x.keys.push($key);
                    }
                }
            } else if (x.type === 'removed') {
                if (_ctrlSelect === false) {
                    if (xxx.length > 0) {
                        options.selection.clear();
                        if (x.keys[0]) {
                            options.selection.add(x.keys[0]);
                        }
                    }
                }
            } else if (x.type === 'added') {
                if (_shiftSelect === false) {
                    _lastKey = x.keys.qLast();
                }
            }
        }

        function reset() {
        }

        apply();

        return {
            "apply": apply,
            "remove": remove
        };
    }
})(jQuery);

(function($) {
    var onApply = function() {
    };

    $(function() {
        $('#CustomizationDialog').dialog({
            title: "Customize View",
            autoOpen: false,
            modal: true,
            height: 'auto',
            width: 450,
            minHeight: 500,
            minWidth: 400,
            position: { my: "center", at: "center", of: window },
            close: function() {
                $(this).findDataField('ColumnList').listbox('destroy');
            },
            buttons: [
                /*{ text: 'Restore Defaults', click: function () { } },*/
                { text: 'Close', click: function() { $(this).dialog('close'); } },
                { text: 'Save', click: function() { if (onApply(this)) { $(this).dialog('close'); } }
                }
            ]
        });
    });

    $.fn.customizeVirtualDataGrid = function() {
        $.each(this, function() {
            var $this = $(this);

            var columns = $this.virtualDataGrid('option', 'columns');
            var sort = $this.virtualDataGrid('option', 'sort');
            var userColumns = $this.virtualDataGrid('option', 'userColumns');
            var userGridOptions = {
                columns: $.map(columns, function(e) {
                    var columnInfo = {
                        fieldID: e.fieldID,
                        title: e.title,
                        friendlyName: e.friendlyName,
                        width: e.width,
                        visible: e.visible == undefined ? true : e.visible,
                        visibleIndex: e.visibleIndex
                    };
                    var userColumn = userColumns.filter(function(a) { return a.fieldID === e.fieldID; })[0];

                    return $.extend(true, columnInfo, userColumn);
                }),
                sort: sort
            };

            $('#CustomizationDialog')
                .findDataField('ColumnList')
                .addClass('ui-list-box')
                .empty()
                .listbox({
                    filterable: true,
                    sortable: true,
                    items: $.map(userGridOptions.columns, function(column) {
                        return {
                            column: column,
                            idx: column.visibleIndex,
                            selected: column.visible,
                            text: column.friendlyName || column.title
                        };
                    })
                });

            $('#CustomizationDialog').dialog({ height: 'auto', position: { my: "center", at: "center", of: window } });

            onApply = function(dialog) {
                var $dialog = $(dialog);

                var field = $dialog.findDataField('ColumnList');
                var items = $.map(field.listbox('option', 'items'), function(e) {
                    return {
                        width: e.column.width,
                        fieldID: e.column.fieldID,
                        visible: e.selected,
                        visibleIndex: e.idx
                    };
                });

                $this.virtualDataGrid({ userColumns: items });
                $this.virtualDataGrid('refresh');
                return true;
            };

            $('#CustomizationDialog').dialog('open');
        });
    };
})(jQuery);
$.effects.effect.fadeVisibility = function (options) {
    var elem = $(this),
        mode = $.effects.setMode(elem, options.mode || 'hide');

    var targetOpacity, targetVisibility;
    switch (mode) {
        case 'show':
            targetOpacity = 1;
            elem.css({ visibility: 'visible' });
            break;
        case 'hide':
            targetOpacity = 0;
            targetVisibility = 'hidden';
            break;
    }

    elem.animate({ opacity: targetOpacity }, {
        queue: false,
        duration: options.duration,
        easing: options.easing,
        complete: function () {
            if (targetVisibility) {
                elem.css({ visibility: targetVisibility });
            }

            if (options.callback) {
                options.callback.apply(this, arguments);
            }

            elem.dequeue();
        }
    });
}

//function highlightText($element, searchTerms) {
//    $($element).each(function () {
//        for (var i in searchTerms) {
//            // The regex is the secret, it prevents text within tag declarations to be affected
//            var regex = new RegExp(">([^<]*)?(" + searchTerms[i] + ")([^>]*)?<", "ig");

//            if (this.nodeType === 1) {
//                highlightTextNodes(this, regex, i);
//            }
//        }
//    });
//}
//function removeHighlight($element) {
//    $($element).each(function () {
//        $(this).find('.highlighted').removeClass('highlighted');
//    });
//}

//function highlightTextNodes(element, regex, termid) {
//    var tempinnerHTML = element.innerHTML;
//    // Do regex replace
//    // Inject span with class of 'highlighted termX' for google style highlighting
//    element.innerHTML = tempinnerHTML.replace(regex, '>$1<span class="highlighted term' + termid + '">$2</span>$3<');
//}
function highlightReplace(match) {
    return '<span class="highlight">' + match + '</span>';
}

function renderHighlightFunc(words) {
    var escapedWords = words
        .qWhere(function (x) { return !!x; })
        .qSelect(function (x) { return escapeRegex(x); });

    if (escapedWords == null || escapedWords.length === 0) {
        return returnInputValue;
    }

    var pattern = escapedWords.join('|');
    var regex = new RegExp(pattern, 'gi');

    return function(text) { return text.replace(regex, highlightReplace); };
}

function IdleMonitor() {
    var _isIdle = false;
    var _counter = 0;
    var _activity = Date.now();
    var _interval = 10000; // 10 seconds.
    var _timeout = 15 * 60000; // 15 minutes.
    var _timer = 0;
    var _idleEvent = new ZillionParts.Event();
    var _activeEvent = new ZillionParts.Event();

    function idleCheck() {
        var diff = Date.now() - _activity;
        if (diff > _timeout) {
            if (!_isIdle) {
                _isIdle = true;
                _counter = 0;
            }

            _counter++;
            $(window).trigger('idle.idleMonitor', [{ idleTime: diff, lastActivity: _activity, depth: _counter}]);
        } else {
            if (_isIdle) {
                _isIdle = false;
                _counter = 0;
            }

            _counter++;
            $(window).trigger('active.idleMonitor', [{ lastActivity: _activity, depth: _counter}]);
        }
    }

    this.setInterval = function (milliseconds) {
        _interval = milliseconds;
        clearInterval(_timer);
        _timer = setInterval(idleCheck, _interval);
    };
    this.setTimeout = function (milliseconds) {
        _timeout = milliseconds;
    };

    this.getIdleEvent = function () {
        return _idleEvent;
    };
    this.getActiveEvent = function () {
        return _activeEvent;
    };

    $(document).on('keydown mousedown touchstart', function () {
        _activity = Date.now();
        if (_isIdle) {
            setTimeout(idleCheck, 0);
        }
    });
    _timer = setInterval(idleCheck, _interval);
}

// Default: 100 = 10fps.
$.widget('rogan.imageloop', {
    options: {
        autoStart: true,
        useCorrection: true,
        interval: 100,
        duration: 100,
        frames: []
    },
    _create: function () {
        var self = this,
            options = self.options,
            frames = options.frames;

        self._lastFrame = -1;
        self._start = Date.now();
        self._total = 0;

        self._compiledFrames = [];

        var pos = 0;
        for (var i = 0; i < frames.length; i++) {
            var srcFrame = frames[i];
            var frame = {};
            if (typeof (srcFrame) == 'string') {
                frame.url = srcFrame;
            } else if ('url' in srcFrame) {
                frame.url = srcFrame.url;
                frame.duration = srcFrame.duration;
            } else {
                // No useable information.
                continue;
            }

            // Preload the image.
            var image = new Image();
            image.src = frame.url;

            if (frame.duration == null) {
                frame.duration = options.duration;
            }

            frame.start = pos;
            frame.end = pos + options.duration;

            self._compiledFrames.push(frame);
            pos += frame.duration;
        }

        self._correction = 0;
        self._total = pos;

        if (options.autoStart) {
            self.resume();
            self.tick();
        }
    },
    tick: function () {
        var self = this,
            element = $(self.element);

        if (!element.is(':visible'))
            return;

        var frames = self._compiledFrames,
            time = (Date.now() - self._start - self._correction) % self._total;

        for (var i = 0; i < frames.length; i++) {
            var frame = frames[i];
            if (frame.start <= time && frame.end > time) {
                if (self._lastFrame != i) {
                    element.attr('src', frame.url);

                    self._lastFrame = i;
                    return;
                }
            }
        }
    },
    pause: function () {
        var self = this;
        if (self._timer) {
            if (self.options.useCorrection) {
                self._pauseStart = Date.now();
            }

            clearInterval(self._timer);
            self._timer = 0;
        }
    },
    resume: function () {
        var self = this, options = self.options;
        if (!self._timer) {
            if (self._pauseStart) {
                self._correction += (Date.now() - self._pauseStart);
                self._pauseStart = null;
            }

            self._timer = setInterval(function () {
                self.tick();
            }, options.interval);
        }
    }
});

$.widget('rogan.columnView', {
    options: {
        items: [],
        onItemCreated: function(element, item, index) {
        }
    },
    _viewData: null,
    _views: null,
    _create: function() {
        var self = this,
            element = self.element;

        self._views = [];
        self._viewData = [];

        element.addClass('column-view ui-corner-all').disableSelection();
        self._container = $('<div class="column-view-container"></div>').appendTo(element);

        self._pushView(self._renderView(self.options.items));

        element.on('keydown', function(e) {
            switch (e.keyCode) {
            case $.ui.keyCode.BACKSPACE:
            case $.ui.keyCode.LEFT:
                {
                    if (self._views.length > 1) {
                        self._popView();
                    }
                    return false;
                }
            case $.ui.keyCode.ENTER:
            case $.ui.keyCode.RIGHT:
                {
                    var view = self._currentView();
                    var idx = view.data('focus') || 0;
                    self._itemClick(e, self._viewItem(view, idx));
                    return false;
                }
            case $.ui.keyCode.UP:
                {
                    var view = self._currentView();
                    var idx = view.data('focus') || 0;
                    self._focus(view, idx - 1);
                    return false;
                }
            case $.ui.keyCode.DOWN:
                {
                    var view = self._currentView();
                    var idx = view.data('focus') || 0;
                    self._focus(view, idx + 1);
                    return false;
                }
            case $.ui.keyCode.TAB:
            {
                self.close();
                    return true;
                }
            }
        });
        element.height(self.options.height);
    },
    _focus: function(view, idx) {
        var self = this;
        var count = self._getItemCount();
        if (idx < 0) {
            idx = count - 1;
        } else if (idx > count - 1) {
            idx = 0;
        }

        view.data('focus', idx);
        $('.column-view-item-focus', view).removeClass('column-view-item-focus');
        var foo = self._viewItem(view, idx);
        foo.addClass('column-view-item-focus');
        self._scrollTo(view, foo);
    },
    _scrollTo: function(view, item) {
        var viewH = view.height(),
            viewY = view.offset().top,
            itemH = item.outerHeight(),
            itemY = item.offset();

        if (itemY === null) {
            return;
        }
        itemY = itemY.top;

        if (itemY < viewY || itemY + itemH > viewY + viewH) {
            view.scrollTop(Math.floor(itemY - viewY - (viewH * .20) + view.scrollTop()));
        }
    },
    _getItemCount: function(view) {
        return $('.column-view-item', view).length;
    },
    _viewItem: function(view, idx) {
        return $($(view).children('.column-view-item')[idx]);
    },
    _activate: function(view, idx, tmp) {
        var self = this;

        var count = self._getItemCount(view);
        if (idx > -1 && idx < count) {
            view.data('active', idx);
            $('.column-view-item-active', view).removeClass('column-view-item-active');
            var foo = self._viewItem(view, idx);
            foo.addClass('column-view-item-active');

            var src = foo.data('item');

            if (tmp !== false && src) {
                while (self._views.length - 1 > self._indexOfView(view)) {
                    self._popView();
                }

                if ($.isArray(src.items) && src.items.length > 0) {
                    self._pushView(self._renderView(src.items));
                }
            }
        } else {
            view.data('active', -1);
            $('.column-view-item-active', view).removeClass('column-view-item-active');
        }
    },
    _pushView: function(view) {
        var self = this,
            element = self.element,
            views = self._views;

        var last = views.qLast();
        if (last) {
            last.removeClass('ui-corner-right');
        }

        var $view = $(view);
        views.push($view);
        self._viewData.push($view.data('view'));
        self._container.append($view);

        if (views.length === 1) {
            $view.addClass('ui-corner-left');
        }
        $view.addClass('ui-corner-right');

        var foo = $view.position().left + $view.outerWidth(true);
        var width = element.width();
        if (foo > width) {
            self._container.css('left', width - foo);
        } else {
            self._container.css('left', '0px');
        }

        self._focus($view, 0);
    },
    _popView: function() {
        var self = this,
            element = self.element,
            views = self._views;

        var $view = views.pop();
        self._viewData.pop();
        $view.remove();

        $view = views[views.length - 1];
        var foo = $view.position().left + $view.outerWidth(true);
        var width = element.width();
        if (foo > width) {
            self._container.css('left', width - foo);
        } else {
            self._container.css('left', '0px');
        }
        $view.focus();

        // TODO: Set active to -1 and remove CSS.
    },
    _currentView: function() {
        var views = this._views;
        return views[views.length - 1];
    },
    _renderView: function(view) {
        var self = this;

        var result = $('<div class="column-view-section"></div>');
        result.data('view', view);


        var onItemCreated = self.options.onItemCreated;

        var idx = 0;
        $.each(view, function(key, value) {
            var i = idx;
            if (value.type === 'split') {
                var item = $('<hr class="column-view-split"/>');
                item.appendTo(result);

                if ($.isFunction(onItemCreated)) {
                    onItemCreated(item, value, i);
                }
            } else {
                var item = self._renderItem(value);
                item.data('view', view);
                item.data('index', i);
                item.click(function(e) {
                    self._itemClick(e, item);
                });
                item.appendTo(result);

                if ($.isFunction(onItemCreated)) {
                    onItemCreated(item, value, i);
                }
                idx++;
            }
        });

        return result;
    },
    _indexOfView: function(view) {
        for (var i = 0; i < this._views.length; i++) {
            var view1 = this._views[i];
            if ($(view1).is(view)) {
                return i;
            }
        }
        return -1;
    },
    _renderItem: function(item) {
        var self = this;
        var result = $('<div class="column-view-item">' + item.text + (item.items ? ' &gt;' : '') + '</div>');
        result.data('item', item);

        result.hover(function() {
            $(this).addClass('column-view-item-hover');
        }, function() {
            $(this).removeClass('column-view-item-hover');
        });

        return result;
    },
    refresh: function() {
        var self = this,
            views = self._views;

        // Grab the current state.
        var openState = [];
        for (var i = 0; i < views.length; i++) {
            var view = views[i];
            openState.push({ view: view.data('view'), active: view.data('active'), focus: view.data('focus') });
        }

        // Remove the existing views.
        while (views.length > 0) {
            var $v = views.pop();
            $v.remove();
        }

        // Push new rendered views.
        for (var i = 0; i < openState.length; i++) {
            var state = openState[i];

            var $view = self._renderView(state.view);
            self._pushView($view);
            self._activate($view, state.active, false);
            self._focus($view, state.focus);
        }
    },
    _itemClick: function(e, $item) {
        var self = this,
            item = $item.data('item'),
            view = $item.data('view'),
            index = $item.data('index');

        var args = { element: $item, item: item, view: view, focus: true, activate: true };
        if (self._trigger('itemclick', e, args)) {
            if (args.focus) {
                self._focus($item.parent('.column-view-section'), index);
            }
            if (args.activate) {
                self._activate($item.parent('.column-view-section'), index);
            }
        }
    }
});

function createOverlay() {
    return $('<div class="zp-overlay"></div>').attr('tabindex', 0);
}

(function () {
    var defaults = {
        target: null,
        position: null,
        items: [],
        overlay: 'show',
        select: function() {
        },
        onClose: function() {
        }
    };

    function triggerCustomEvent(callback, sender, event, data) {
        return !($.isFunction(callback) &&
            callback.call(sender, event, data) === false ||
            event.isDefaultPrevented());
    }

    $.fn.popupMenu = function(options) {
        $('body').click();
        if (options == 'close')
            return;

        options = $.extend({ }, defaults, options);

        $.each(this, function() {
            var $this = $(this);

            var $container = $('<div style="z-index: 10000; position: fixed; top: 0; left: 0;" tabindex="0"></div>').disableSelection();
            var $menu = $('<ul style="z-index: 10001" tabindex="0"></ul>');

            $container.appendTo(document.body);
            if (options.overlay === 'show') {
                createOverlay().appendTo($container);
            }

            $menu.appendTo($container);

            // Build the menu items.
            $.each(options.items, function(i) {
                var item = this;
                var $itemLink = $('<a class="ui-link"></a>');

                if (!item.enabled) {
                    $itemLink.addClass('.ui-link-disabled');
                }

                if (item.iconClass) {
                    $('<span class="ui-menu-icon"></span>')
                        .addClass(item.iconClass)
                        .attr("data-command", item.id)
                        .appendTo($itemLink);
                }

                $itemLink.append('<span class="menu-item-text">' + this.text + '</span>');

                $('<li></li>')
                    .append($itemLink)
                    .data('item', this)
                    .appendTo($menu);
            });

            // Finalize the menu setup.
            $menu
                .addClass('ui-context-menu')
                .menu({
                    select: function(event, ui) {
                        triggerCustomEvent(options.select, ui, event, ui.item.data('item'));
                    }
                });
            
            var position = options.position;
            if (position && position.x && position.y) {
                $menu.css({
                    left: position.x,
                    top: position.y,
                    position: 'relative'
                });
            } else {
                var p = $.extend(true, {
                    at: "left bottom",
                    my: "left top",
                    of: $this,
                    collision: "fit flip"
                }, position);

                $menu.position(p);
            }

            function remove() {
                $container.remove();
                $('body').off('click.contextMenu');
            }

            // Display the menu.
            $container.bind("keydown.contextMenu", function(e) {
                if (e.keyCode == $.ui.keyCode.ESCAPE) {
                    triggerCustomEvent(options.onClose, $menu, e, null);
                    remove();
                } else if (e.keyCode === $.ui.keyCode.TAB) {
                    //TODO: Do something more clever.
                    $menu.focus();
                    return false;
                }
            });

            $menu.focus();

            setTimeout(function() {
                // Close the menu, when the user clicked somewhere else.
                $('body').on('click.contextMenu', function(e) {
                    triggerCustomEvent(options.onClose, $menu, e, null);
                    remove();
                });
            }, 0);
        });
    };


    $.widget("rogan.contextMenu", {
        options: {
            buttonClass: ['zillion-parts icons context-menu', 'zillion-parts icons context-menu-active', 'zillion-parts icons context-menu-hover'],
            menu: null,
            items: [],
            onOpen: function() {
            },
            onSelect: function() {

            }
        },
        _create: function() {
            var self = this,
                options = self.options,
                element = self.element,
                isOpen = false;

            element
                .addClass(options.buttonClass[0])
                .hover(function() {
                    element.addClass(options.buttonClass[2]);
                }, function() {
                    element.removeClass(options.buttonClass[2]).addClass(options.buttonClass[0]);
                })
                .click(function(e) {
                    if (isOpen) {
                        //element.contextMenu2('close');
                        return true;
                    } else {
                        isOpen = true;
                        options.onOpen();

                        var items = options.items;
                        if ($.isFunction(items)) {
                            items = items();
                        }

                        element.addClass(options.buttonClass[1]);
                        element.popupMenu({
                            target: element,
                            items: items,
                            select: function(e, i) {
                                options.onSelect(i);
                            },
                            onClose: function() {
                                element.removeClass(options.buttonClass[1]).addClass(options.buttonClass[0]);
                                isOpen = false;
                            }
                        });
                    }

                    e.preventDefault();
                });
        }
    });
    $.widget("rogan.configurationMenu", {
        options: {
            align: 'left',
            buttonClass: ['zillion-parts icons configuration-menu', 'zillion-parts icons configuration-menu-active', 'zillion-parts icons configuration-menu-hover'],
            menu: null,
            items: [],
            onOpen: function() {
            },
            onSelect: function() {

            }
        },
        _create: function() {
            var self = this,
                options = self.options,
                element = self.element,
                isOpen = false;

            element
                .addClass(options.buttonClass[0])
                .hover(function() {
                    element.addClass(options.buttonClass[2]);
                }, function() {
                    element.removeClass(options.buttonClass[2]).addClass(options.buttonClass[0]);
                })
                .click(function(e) {
                    if (isOpen) {
                        //element.contextMenu2('close');
                        return true;
                    } else {
                        isOpen = true;
                        options.onOpen();

                        element.addClass(options.buttonClass[1]);
                        element.popupMenu({
                            align: options.align,
                            target: element,
                            items: options.items,
                            select: function(e, i) {
                                options.onSelect(i);
                            },
                            onClose: function() {
                                element.removeClass(options.buttonClass[1]).addClass(options.buttonClass[0]);
                                isOpen = false;
                            }
                        });
                    }

                    e.preventDefault();
                });
        }
    });
})();
$.widget('rogan.zpSelect', {
    options: {
        source: null,
        sourceOptions: null,
        bind: null,
        bindType: 'id',
        bindSeperator: ';',
        selectID: 'id',
        selectValue: null,
        selectText: 'text',
        behavior: 'multi',
        disabled: false,
        enableSearch: true,
        enableClear: true,
        captionText: 'Choose...',
        loadingText: 'Loading...',
        searchingText: 'Searching...',
        select: function() {},
        onItemCreated: function($item, data) {},
        embedDropdown: true
    },
    _source: null,
    _compiledVM: function(input) {
        return { id: null, value: null, text: null };
    },
    _elements: {},
    _selected: [],
    _filter: [],
    _create: function() {
        var self = this,
            coreElement = self.element,
            options = self.options;

        self._source = $.isArray(options.source) ? new ArraySelectSource(options.source, options.selectID, options.selectText) : options.source;
        self._elements = { base: self.element };
        self._selected = [];
        self._filter = [];
        self._compiledVM = predicateIIP('{ id: (' + options.selectID + '), value: (' + (options.selectValue || '$item') + '), text: (' + options.selectText + ') }');

        var autoBind = false;
        if (coreElement.is('select')) {
            options.behavior = coreElement.attr('multiple') !== undefined ? 'multi' : 'single';

            if (!options.bind) {
                options.bind = coreElement;
                autoBind = true;
            }

            self._elements.base = $('<span></span>', { class: coreElement.attr('class'), style: coreElement.attr('style') }).insertAfter(coreElement);
            coreElement.css('display', 'none');
        }
        if (coreElement.is('input')) {
            options.behavior = coreElement.attr('multiple') !== undefined ? 'multi' : 'single';

            if (!options.bind) {
                options.bind = coreElement;
                autoBind = true;
            }

            self._elements.base = $('<span></span>', { class: coreElement.attr('class'), style: coreElement.attr('style') }).insertAfter(coreElement);
            coreElement.css('display', 'none');
        }

        if (options.behavior === 'single') {
            self._elements.base.attr('tabindex', coreElement.attr('tabindex') | 0);
        }

        if (self._source == null) {
            if (coreElement.is('select')) {
                self._source = new SelectSelectSource(coreElement);
            } else {
                try {
                    var $bind = $(options.bind);
                    if ($bind.is('select')) {
                        self._source = new SelectSelectSource($bind);
                    }
                } catch (ex) {
                    zpTrace('Unable to bind select to [' + options.bind + ']; ' + ex);
                }
            }
        }

        var element = self._elements.base;
        element.addClass('zpselect');

        self._elements.overlay = createOverlay().css({ display: 'none', zIndex: -1 });
        self._elements.overlay.click(function() { self.close(); });
        element.append(self._elements.overlay);

        if (options.behavior === 'single') {
            self._initSingle();
        } else if (options.behavior === 'multi') {
            self._initMulti();
        }

        if (autoBind) {
            self.bind();
        }

        self._elements.dropLists.on('mouseover', '.zpselect-droplistitem', function() {
            self._elements.dropLists.find('.zpselect-droplistitem.highlighted').removeClass('highlighted');
            $(this).addClass('highlighted');
        });
    },
    _projectValue: function(a) {
        if (!a) {
            return null;
        }

        var self = this;

        if ($.isArray(a)) {
            return a.qSelect(function(b) {
                return self._compiledVM(b);
            });
        } else {
            return self._compiledVM(a);
        }
    },
    _updateBind: function() {
        var self = this,
            options = self.options,
            bindable = $(options.bind),
            selected;

        if (options.behavior === 'single') {
            selected = self._projectValue(self._selected.qFirst());

            if (selected) {
                switch (options.bindType) {
                case 'json':
                    bindable.val(JSON.stringify(selected.value));
                    bindable.trigger('change');
                    break;
                case 'id':
                    bindable.val(selected.id);
                    bindable.trigger('change');
                    break;
                case 'text':
                    bindable.val(selected.text);
                    bindable.trigger('change');
                    break;
                default:
                    bindable.val(selected.value);
                    bindable.trigger('change');
                    break;
                }
            } else {
                bindable.val(null);
                bindable.trigger('change');
            }
        } else if (options.behavior === 'multi') {
            selected = self._projectValue(self._selected);
            if (selected) {
                switch (options.bindType) {
                case 'json':
                    bindable.val(JSON.stringify(selected.qSelect('value')));
                    bindable.trigger('change');
                    break;

                case 'id':
                    bindable.val(selected.qSelect(function(b) { return b.id; }).join(options.bindSeperator));
                    bindable.trigger('change');
                    break;

                case 'text':
                    bindable.val(selected.qSelect(function(b) { return b.text; }).join(options.bindSeperator));
                    bindable.trigger('change');
                    break;

                default:
                    bindable.val(selected.qSelect(function(b) { return b.value; }));
                    bindable.trigger('change');
                    break;
                }
            } else {
                bindable.val(null);
                bindable.trigger('change');
            }
        }
    },
    isOpen: function() {
        return this._elements.drop.is(':visible');
    },
    bind: function() {
        var self = this,
            options = self.options,
            bindable = $(options.bind);

        var val = bindable.val();
        if (!val) {
            if (bindable.is('select')) {
                val = bindable.find('option[selected]:first').attr('value');
            } else {
                val = bindable.val();
            }
        }

        if (options.bindType === 'id') {
            self._selected = [];
            if (val) {
                val.split(options.bindSeperator).qEach(function(erd) {
                    var x = self._source.get(erd, options.sourceOptions);
                    var y = self._newItem(erd);
                    self._selected.push(y);
                    x.then(function(b) {
                        $.extend(true, y, b);
                        self._elements.base.trigger('change');
                        self.refresh();
                    });
                });
                self.refresh();
            } else {
                self._selected = [];
                self.refresh();
            }
        } else {
            if (val) {
                var x = self._source.get(val, options.sourceOptions);
                var y = self._newItem(val);
                self._selected = [y];
                self.refresh();
                x.then(function(b) {
                    $.extend(true, y, b);
                    self._elements.base.trigger('change');
                    self.refresh();
                });
            } else {
                self._selected = [];
                self.refresh();
            }
        }
    },
    clear: function() {
        var self = this,
            elements = self._elements,
            options = self.options,
            source = options.source;

        self.value(null);
        self._updateBind();
        elements.base.trigger('change');
        self.refresh();

        var queryOnClear = source && source.features
            ? source.features.queryOnClear
            : false;
        if (queryOnClear) {
            self._queryFilteredList();
        }
    },
    _removeSelect: function(idx) {
        var self = this;

        self._selected = self._selected.qWhere(function(_, i) { return idx !== i; });
        self._updateBind();
        self._elements.base.trigger('change');
    },
    _onSelect: function(type, e) {
        this._trigger("select", e, { type: type, element: this.element, ui: this._elements.base });
    },
    _initSingle: function() {
        var self = this,
            elements = self._elements,
            element = elements.base,
            options = self.options;

        elements.multi = $('<div class="zpselect-single"></div>');

        elements.multiList = $('<a class="selected"><span>' + options.captionText + '</span><div class="dropdown"><i></i></div></a>');
        elements.clear = $('<span class="clear"><i></i></span>');
        elements.multiList.append(elements.clear);
        elements.multi.append(elements.multiList);

        elements.clear.click(function(e) {
            if (!options.disabled) {
                self.clear();
                self._onSelect('clear', e);
            } else {
                self.refresh();
            }
            return false;
        });

        elements.drop = $('<div class="zpselect-drop zpselect-drop-single"></div>');

        elements.dropContainer = $('<div class="zpselect-droplistcontainer"></div>');
        elements.dropLists = $('<ul class="zpselect-droplist"></ul>');

        if (options.enableSearch) {
            elements.input = $('<div class="zpselect-input"></div>');
            elements.textInput = $('<input type="text" />');

            elements.textInput.appendTo(elements.input);

            elements.drop.append(elements.input);
        }

        elements.drop.append(elements.dropContainer);
        elements.dropContainer.append(elements.dropLists);

        element.append(elements.multi);

        if (options.embedDropdown) {
            element.append(elements.drop);
        } else {
            $('body').append(elements.drop);
        }

        element.on('click', '.zpselect-single', function() {
            if (!element.is('.zpselect-focus')) {
                if (options.enableSearch) {
                    elements.textInput.val('');
                }
                self.dropdown();
            } else {
                self.close();
            }
        });

        // Select an entry.
        elements.drop.on('mousedown', '.zpselect-droplistitem', function(e) {
            var idx = $(this).data('idx');
            var foo = self._filter[idx];

            if (foo.zpsSearchHint && options.enableSearch) {
                elements.textInput.val(self._projectValue(foo).text);
                elements.textInput.trigger('change');
            } else {
                self._selected = [foo];
                self._updateBind();
                self._elements.base.trigger('change');

                self.refresh();
                self.close();

                if (options.enableSearch) {
                    elements.textInput.val('');
                    elements.textInput.trigger('change');
                    self.selectSearch();
                }

                self._onSelect('click', e);
            }
        });

        if (options.enableSearch) {
            var tte = '';
            elements.textInput.on('keyup cut paste drop change', function(e) {
                if (e.keyCode == $.ui.keyCode.DOWN
                    || e.keyCode == $.ui.keyCode.UP
                    || e.keyCode == $.ui.keyCode.ENTER
                    || e.keyCode == $.ui.keyCode.ESCAPE) {
                    return false;
                } else {
                    if (self.isOpen()) {
                        var val = elements.textInput.val();
                        tte = val;

                        self._queryFilteredList();
                    }
                }
            });
        }

        if (options.enableSearch) {
            element.on('keydown', function(e) {
                // Textbox empty.
                if (e.keyCode == $.ui.keyCode.DOWN) {
                    self.dropdown();
                    return false;
                } else if (e.keyCode == $.ui.keyCode.UP) {
                    if (self.isOpen()) {
                        self.close();
                        element.focus();
                        return false;
                    }
                } else if (e.keyCode == $.ui.keyCode.ESCAPE) {
                    if (self.isOpen()) {
                        self.close();
                        element.focus();
                        return false;
                    }
                } else if (e.keyCode == $.ui.keyCode.DELETE) {
                    if (options.enableClear && !options.disabled) {
                        self.clear();
                    }
                    self.close();
                    return false;
                } else if (e.keyCode == $.ui.keyCode.TAB) {
                    self.close();
                }
            });

            // Non control character pressed, drop down and pass the event to the text input.
            element.on('keypress', function(e) {
                if (e.keyCode !== null && e.charCode != null) {
                    if (!self.isOpen()) {
                        // Clear search text, dropdown and select the search input.
                        elements.textInput.val('');
                        self.dropdown();
                        self.selectSearch();

                        setTimeout(function() { elements.textInput.trigger('change'); }, 0);
                    }
                }
            });

            elements.textInput.on('keydown', function(e) {
                // Textbox empty.
                if (e.keyCode == $.ui.keyCode.DOWN) {
                    element.addClass('zpselect-focus');
                    var highlighted = elements.dropLists.find('.zpselect-droplistitem.highlighted:first');
                    elements.dropLists.find('.highlighted').removeClass('highlighted');
                    highlighted = highlighted.next();
                    if (highlighted.length == 0)
                        highlighted = elements.dropLists.find('.zpselect-droplistitem:first');
                    highlighted.addClass('highlighted');
                    self.scrollHighlightInView();
                    return false;
                } else if (e.keyCode == $.ui.keyCode.UP) {
                    var highlighted = elements.dropLists.find('.zpselect-droplistitem.highlighted:first');
                    elements.dropLists.find('.highlighted').removeClass('highlighted');
                    highlighted = highlighted.prev();

                    if (highlighted.length == 0)
                        highlighted = elements.dropLists.find('.zpselect-droplistitem:last');
                    highlighted.addClass('highlighted');
                    self.scrollHighlightInView();
                    return false;
                } else if (e.keyCode == $.ui.keyCode.ENTER) {
                    var highlighted = elements.dropLists.find('.zpselect-droplistitem.highlighted:first');
                    if (highlighted.length !== 0) {
                        var idx = highlighted.data('idx');
                        var foo = self._filter[idx];
                        self._selected = [foo];
                        self._updateBind();
                        self._elements.base.trigger('change');
                        self.refresh();
                        self.close();

                        elements.textInput.val('');
                        elements.textInput.trigger('change');

                        element.focus();
                        self._onSelect('enter', e);

                            element.focusNextInput();

                        return false;
                    }

                    return false;
                } else if (e.keyCode == $.ui.keyCode.ESCAPE) {
                    if (self.isOpen()) {
                        self.close();
                        return false;
                    }
                } else if (e.keyCode == $.ui.keyCode.TAB) {
                    self.close();
                }
            });
        } else {
            elements.base.on('keydown', function(e) {
                // Textbox empty.
                if (e.keyCode == $.ui.keyCode.DOWN) {
                    if (!self.isOpen()) {
                        self.dropdown();
                    }

                    var highlighted = elements.dropLists.find('.zpselect-droplistitem.highlighted');
                    highlighted.removeClass('highlighted');
                    highlighted = highlighted.first().next('.zpselect-droplistitem');
                    if (highlighted.length == 0) {
                        highlighted = elements.dropLists.find('.zpselect-droplistitem:first');
                    }
                    highlighted.addClass('highlighted');
                    return false;
                } else if (e.keyCode == $.ui.keyCode.SPACE) {
                    if (!self.isOpen()) {
                        self.dropdown();
                    }
                    return false;
                } else if (e.keyCode == $.ui.keyCode.UP) {
                    var highlighted = elements.dropLists.find('.zpselect-droplistitem.highlighted');
                    highlighted.removeClass('highlighted');
                    highlighted = highlighted.first().next('.zpselect-droplistitem');
                    highlighted = highlighted.prev('.zpselect-droplistitem');
                    if (highlighted.length == 0) {
                        self.close();
                    } else {
                        highlighted.addClass('highlighted');
                    }
                    return false;
                } else if (e.keyCode == $.ui.keyCode.ENTER) {
                    if (self.isOpen()) {
                        var highlighted = elements.dropLists.find('.zpselect-droplistitem.highlighted:first');
                        if (highlighted.length !== 0) {
                            var idx = highlighted.data('idx');
                            var foo = self._filter[idx];
                            self._selected = [foo];
                            self._updateBind();
                            self._elements.base.trigger('change');
                            self.refresh();

                            self.close();
                            element.focus();
                            self._onSelect('enter', e);

                            element.focusNextInput();

                            return false;
                        }
                    }
                } else if (e.keyCode == $.ui.keyCode.ESCAPE) {
                    if (self.isOpen()) {
                        self.close();
                        return false;
                    }
                } else if (e.keyCode == $.ui.keyCode.DELETE) {
                    if (options.enableClear && !options.disabled) {
                        self.clear();
                    }
                    self.close();
                    return false;
                }
            });
        }
    },
    _initMulti: function() {
        var self = this,
            elements = self._elements,
            element = elements.base,
            options = self.options;

        elements.multi = $('<div class="zpselect-multi"></div>');
        elements.multi.appendTo(element);

        elements.multiList = $('<ul class="zpselect-multilist"></ul>');
        elements.multiList.appendTo(elements.multi);

        elements.input = $('<li class="zpselect-input"></li>');
        elements.textInput = $('<input type="text" style="width: 20px" />');

        elements.textInput.appendTo(elements.input);
        elements.input.appendTo(elements.multiList);

        elements.dropContainer = $('<div class="zpselect-droplistcontainer"></div>');
        elements.drop = $('<div class="zpselect-drop"></div>');
        elements.drop.css({ maxHeight: 300, overflowY: 'auto' });

        elements.dropLists = $('<ul class="zpselect-droplist"></ul>');
        elements.dropContainer.append(elements.dropLists);
        elements.drop.append(elements.dropContainer);

        if (options.embedDropdown) {
            element.append(elements.drop);
        } else {
            $('body').append(elements.drop);
        }

        element.on('click', '.zpselect-selected', false);
        element.on('focus', function() { self.selectSearch(); });
        element.on('keydown', '.zpselect-selected:focus', function(e) {
            if (e.keyCode == $.ui.keyCode.BACKSPACE) {
                self._removeSelect($(this).data('idx'));
                self.refresh();
                self.focusSearch();
                return false;
            } else if (e.keyCode == $.ui.keyCode.DELETE) {
                self._removeSelect($(this).data('idx'));
                self.refresh();
                self.focusSearch();
                return false;
            } else if (e.keyCode == $.ui.keyCode.LEFT) {
                $(this).prev(':tabbable').focus();
                return false;
            } else if (e.keyCode == $.ui.keyCode.RIGHT) {
                var next = $(this).next(':tabbable');
                if (next.length == 0)
                    self.focusSearch();
                else
                    next.focus();
                return false;
            } else if (!ZillionParts.IsControlKey(e.keyCode)) {
                self.focusSearch();
                self.elements.textInput.trigger('keydown', e);
            }
        });

        var tte = '';
        elements.textInput.on('keydown cut paste drop change', function() {
            setTimeout(function() {
                var x = $('<span class="zpselect-input"></span>');
                var val = elements.textInput.val();
//                if (tte === val)
//                    return;
                tte = val;

                x.text(val);
                x.appendTo('body');
                var a = elements.input.outerWidth(true) - elements.input.innerWidth();
                elements.textInput.width(Math.min(x.width() + 20, elements.multi.innerWidth() - a));
                x.remove();

                self._queryFilteredList();
                if (val) {
                    if (!self.isOpen()) {
                        self.dropdown();
                    }
                } else {
                    self.close();
                }
            }, 0);
        });

        elements.textInput.on('keydown', function(e) {
            // Textbox empty.
            if (e.keyCode == $.ui.keyCode.BACKSPACE
                || e.keyCode == $.ui.keyCode.LEFT) {
                if (!$(this).val()) {
                    elements.multiList.find('.zpselect-selected:last').focus();
                    return false;
                }
            } else if (e.keyCode == $.ui.keyCode.DOWN) {
                element.addClass('zpselect-focus');
                var highlighted = elements.dropLists.find('.highlighted:first');
                highlighted.removeClass('highlighted');
                highlighted = highlighted.next();
                if (highlighted.length == 0)
                    highlighted = elements.dropLists.find('.zpselect-droplistitem:first');
                highlighted.addClass('highlighted');
                return false;
            } else if (e.keyCode == $.ui.keyCode.UP) {
                var highlighted = elements.dropLists.find('.highlighted:first');
                highlighted.removeClass('highlighted');
                highlighted = highlighted.prev();
                if (highlighted.length == 0) {
                    elements.textInput.val('');
                    elements.textInput.trigger('change');

                    self.close();
                    self.focus();
                } else {
                    highlighted.addClass('highlighted');
                }
                return false;
            } else if (e.keyCode == $.ui.keyCode.ENTER) {
                var highlighted = elements.dropLists.find('.highlighted:first');
                if (highlighted.length !== 0) {
                    var idx = highlighted.data('idx');
                    var foo = self._filter[idx];
                    self._selected.push(foo);
                    self._updateBind();
                    self._elements.base.trigger('change');
                    self.refresh();

                    elements.textInput.val('');
                    elements.textInput.trigger('change');
                    self.focusSearch();
                    return false;
                }
            } else if (e.keyCode == $.ui.keyCode.ESCAPE) {
                self.close();
                return false;
            }
        });

        elements.drop.on('mousedown', '.zpselect-droplistitem', function() {
            var idx = $(this).data('idx');
            var foo = self._filter[idx];
            self._selected.push(foo);
            self._updateBind();
            self._elements.base.trigger('change');
            self.refresh();

            elements.textInput.val('');
            elements.textInput.trigger('change');

            setTimeout(function() {
                self.focusSearch();
            });
        });

        element.on('click', '.zpselect-selected-remove', function(e) {
            self._removeSelect($(this).parents('.zpselect-selected').data('idx'));
            self.refresh();
            self.focusSearch();
            return false;
        });

        element.on('click focus', function(e) {
            if ($(e.target).is(elements.textInput) == false) {
                elements.textInput.focus();
            }
        });
    },
    destroy: function() {
        var self = this,
            elements = self._elements;

        elements.drop.remove();
    },
    _oldIndex: null,
    _loading: false,
    scrollHighlightInView: function() {
        var self = this, elements = self._elements, dropLists = elements.dropLists;
        setTimeout(function() {
            var highlighted = dropLists.find('.zpselect-droplistitem.highlighted:first');
            if (highlighted.length) {
                var top = highlighted.position().top + elements.dropContainer.scrollTop();
                var y = ((top / elements.dropContainer.height()) | 0) * elements.dropContainer.height();
                elements.dropContainer.scrollTop(y);
            }
        }, 100);
    },
    dropdown: function() {
        var self = this,
            options = self.options,
            element = self._elements.base,
            elements = self._elements;

        if (options.disabled) {
            return;
        }

        if (!self.isOpen()) {
            element.addClass('zpselect-focus');
            elements.drop.css('display', 'block');
            elements.overlay.css('display', 'block');
            if (!options.embedDropdown) {
                if (self._oldIndex === null) {
                    self._oldIndex = element.css('z-index');
//                elements.overlay.css('z-index', ZillionParts.zIndex());
                    element.css('z-index', ZillionParts.zIndex());
                }
            } else {
                if (self._oldIndex === null) {
                    self._oldIndex = element.css('z-index');
                    element.css('z-index', ZillionParts.zIndex());
                }
            }
            setTimeout(function() {
                self.focusSearch();
            }, 100);
        }

        self.layout();
        self._queryFilteredList();
    },
    _updateCounter: 0,
    _queryFilteredList: function() {
        var self = this,
            options = self.options,
            element = self._elements.base,
            elements = self._elements,
            searchText = options.enableSearch ? elements.textInput.val() : '';

        self._loading = true;
        self.refresh();

        var c = ++self._updateCounter;

        self._source.query(searchText, options.sourceOptions).then(function(data) {
            if (c === self._updateCounter) {
                self._filter = data;
            }
        }).always(function() {
            if (c === self._updateCounter) {
                self._loading = false;
                self.refresh();
                self._scrollIntoView();
            }
        });
    },
    _scrollIntoView: function() {
        this._elements.drop.scrollintoview({ direction: "vertical", duration: 50 });
    },
    close: function() {
        var self = this,
            elements = self._elements,
            element = self._elements.base;

        if (self.options.behavior === 'multi' && elements.textInput) {
            elements.textInput.val('');
        }

        element.removeClass('zpselect-focus');
        elements.drop.css('display', 'none');
        elements.overlay.css('display', 'none');

        if (self._oldIndex !== null) {
            element.css('z-index', self._oldIndex);
            self._oldIndex = null;
        }
    },
    focusSearch: function() {
        var self = this,
            options = self.options,
            elements = self._elements;

        if (self.options.enableSearch) {
            if (!elements.textInput.is(':focus')) {
                elements.textInput.focus();
            }
        } else {
            if (options.behavior === 'single') {
                if (!elements.multi.is(':focus')) {
                    elements.multi.focus();
                }
            } else if (options.behavior === 'multi') {
                if (!elements.textInput.is(':focus')) {
                    elements.textInput.focus();
                }
            }
        }
    },
    selectSearch: function() {
        var self = this,
            elements = self._elements;

        if (self.options.enableSearch) {
            elements.textInput.select();
        } else {
            elements.base.focus();
        }
    },
    layout: function() {
        var self = this,
            options = self.options,
            elements = self._elements;

        if (self.isOpen()) {
            if (options.embedDropdown) {
                elements.drop.css({ top: '100%', left: 0, width: '100%' });
            } else {
                elements.drop.css({ width: elements.multi.outerWidth() });
                elements.drop.position({ my: 'left top-2', at: 'left bottom', of: elements.base, collision: 'none' });
            }
        } else {
            if (options.embedDropdown) {
                elements.drop.css({ top: '100%', left: 0, width: '100%' });
            } else {
                elements.drop.css({ top: 0, left: 0, width: elements.multi.outerWidth() });
                elements.drop.position({ my: 'left top-2', at: 'left bottom', of: elements.base, collision: 'none' });
            }
        }
    },
    _newItem: function(id) {
        var self = this, options = self.options, foo = {};
        foo[options.selectValue] = null;
        foo[options.selectID] = id;
        foo[options.selectText] = options.loadingText;
        return foo;
    },
    _isValidID: function(id) {
        var self = this,
            options = self.options,
            features = (options.source && options.source.features) || {};

        if (features.zeroID && id === 0) {
            return true;
        }

        return id !== undefined && id !== null && id !== 0;
    },
    selectedID: function(v) {
        var self = this,
            options = self.options,
            hasValue = arguments.length !== 0;

        if (options.behavior == 'single') {
            if (hasValue) {
                if (self._isValidID(v)) {
                    var newItem = self._newItem(v);
                    var x = self._source.get(v, options.sourceOptions);

                    self._selected = [newItem];
                    self.refresh();

                    x.then(function(b) {
                        $.extend(true, newItem, b);
                        self._elements.base.trigger('change');
                        self.refresh();
                    });
                } else {
                    self._selected = [];
                    self.refresh();
                }
            }

            return self._projectValue(self._selected).qSelect(function(b) { return b.id; }).qFirst();
        } else if (options.behavior == 'multi') {
            if (hasValue) {
                if (self._isValidID(v)) {
                    self._selected = v.qSelect(function(a) {
                        var newItem = self._newItem(a);
                        var x = self._source.get(a, options.sourceOptions);

                        x.then(function(b) {
                            $.extend(true, newItem, b);
                            self._elements.base.trigger('change');
                            self.refresh();
                        });

                        return newItem;
                    });
                    self.refresh();
                } else {
                    self._selected = [];
                    self.refresh();
                }
            }

            return self._projectValue(self._selected).qSelect(function(b) { return b.id; });
        }
    },
    value: function(v) {
        var self = this,
            options = self.options,
            hasValue = arguments.length !== 0,
            predicateIipCacheItem = null;

        function projectItem(what, item) {
            if (!predicateIipCacheItem) {
                predicateIipCacheItem = predicateIIP(what);
            }

            try {
                return predicateIipCacheItem(item);
//                return new Function('$item', 'with ($item) { return (' + what + '); }')(item);
            } catch (ex) {
                return undefined;
            }
        }

        function makeRealItem(input) {
            if (input && projectItem(options.selectID, input) !== undefined) {
                return input;
            } else if (input) {
                // Appears only to be an ID.
                var newItem = self._newItem(input);
                var newItemD = self._source.get(input, options.sourceOptions);
                newItemD.then(function(b) {
                    $.extend(true, newItem, b);
                    self._elements.base.trigger('change');
                    self.refresh();
                });
                return newItem;
            } else {
                return input;
            }
        }

        if (options.behavior == 'single') {
            if (hasValue) {
                v = makeRealItem(v);
                if (v) {
                    self._selected = [v];
                    self.refresh();

                } else {
                    self._selected = [];
                    self.refresh();
                }
            }

            return self._projectValue(self._selected).qSelect(function(b) { return b.value; }).qFirst();
        } else if (options.behavior == 'multi') {
            if (hasValue) {
                if (v) {
                    v = v.qSelect(makeRealItem);

                    self._selected = v;
                    self.refresh();
                } else {
                    self._selected = [];
                    self.refresh();
                }
            }

            return self._projectValue(self._selected).qSelect(function(b) { return b.value; });
        }
    },
    refresh: function() {
        var self = this,
            options = self.options,
            elements = self._elements,
            dropLists = elements.dropLists,
            itemElements = [],
            selected = self._selected;

        if (elements.clear) {
            if (options.enableClear && !options.disabled && selected.length) {
                elements.multiList.css('margin-right', 30);
                elements.clear.show();
            } else {
                elements.multiList.css('margin-right', 15);
                elements.clear.hide();
            }
        }

        if (options.disabled) {
            elements.base.find('.dropdown').css('opacity', 0.5);
        } else {
            elements.base.find('.dropdown').css('opacity', 1);
        }

        var searchText = elements.textInput && elements.textInput.val();
        var highlight = searchText ? ZillionParts.UI.RenderHighlightFunc(searchText.split(/\s+/)) : returnInputValue;
        var filteredList, text;
        if (options.behavior === 'single') {
            var highlighted = dropLists.find('.zpselect-droplistitem.highlighted:first');
            var highlightedKey = highlighted.data('key');

            var s = elements.multiList.find('span:first');
            s.html(self._projectValue(selected).qSelect(function(b) { return b.text; }).qFirst() || options.captionText);

            dropLists.empty();
            elements.dropContainer.css('display', 'block');

            filteredList = self._projectValue(self._filter);

            if (filteredList.length === 0) {
                if (self._loading) {
                    dropLists.append($('<li></li>', { text: options.searchingText }));
                } else if (self.options.enableSearch) {
                    text = searchText;
                    if (text) {
                        dropLists.append($('<li></li>', { text: 'No match found for "' + text + '".' }));
                    } else {
                        elements.dropContainer.css('display', 'none');
                    }
                } else {
                    dropLists.append($('<li></li>', { text: 'No choices available.' }));
                }
            } else {
                var firstSelected = selected[0];
                var hasHighlighted = highlightedKey && filteredList.qAny(function(x) { return x.id == highlightedKey; });
                filteredList.qEach(function(a, idx) {
                    var listItem = $('<li class="zpselect-droplistitem"></li>');
                    listItem.html(highlight(a.text));
                    if (a.value.title) {
                        listItem.attr('title', a.value.title);
//                        listItem.hover(function () {
//                            $(this).tooltip({ content: a.value.title });
//                        }, function () {
//                            $(this).tooltip('destroy');
//                        });
                    }


                    if (hasHighlighted) {
                        if (a.id == highlightedKey) {
                            listItem.addClass('highlighted');
                        }
                    } else if (firstSelected && firstSelected.id === a.id) {
                        listItem.addClass('highlighted');
                    }

                    listItem.data('idx', idx);
                    listItem.data('key', a.id);
                    options.onItemCreated(listItem, a, idx);
                    itemElements.push(listItem[0]);
                });
                dropLists.append(itemElements);
            }

            if (dropLists.find('.zpselect-droplistitem.highlighted').length === 0) {
                dropLists.find('.zpselect-droplistitem:first').addClass('highlighted');
            }

            self.layout();
            self.scrollHighlightInView();
        } else if (options.behavior === 'multi') {
            elements.multiList.find('.zpselect-selected').remove();

            self._projectValue(selected).qEach(function(a, idx) {
                var xx = $('<li class="zpselect-selected" tabindex="0"></li>');
                xx.data('idx', idx);
                xx.data('item', a.value);

                var foo = $('<span class="zpselect-selected-text"></span>');
                foo.html(highlight(a.text)).appendTo(xx);

                var s = $('<a class="zpselect-selected-remove"><span class="ui-icon ui-icon-close"></span></a>');
                s.appendTo(foo);
                xx.disableSelection();
                xx.insertBefore(elements.input);
            });


            dropLists.empty();
            elements.dropContainer.css('display', 'block');

            filteredList = self._projectValue(self._filter);
            if (filteredList.length === 0) {
                if (self._loading) {
                    dropLists.append('<li>' + options.searchingText + '</li>');
                } else if (self.options.enableSearch) {
                    text = searchText;
                    if (text) {
                        dropLists.append('<li>No match found for "' + text + '".</li>');
                    } else {
                        elements.dropContainer.css('display', 'none');
                    }
                } else {
                    dropLists.append('<li>No choices available.</li>');
                }
            } else {
                filteredList.qEach(function(a, idx) {
                    var listItem = $('<li class="zpselect-droplistitem">' + highlight(a.text) + '</li>');
                    listItem.data('idx', idx);
                    options.onItemCreated(listItem, a, idx);
                    itemElements.push(listItem[0]);
                });
                dropLists.append(itemElements);
            }

            dropLists.find('.zpselect-droplistitem:first').addClass('highlighted');

            self.layout();
            self.scrollHighlightInView();
        }
    },
    _setOptions: function() {
        var self = this, options = self.options;
        $.Widget.prototype._setOptions.apply(self, arguments);

        if (options.disabled) {
            self._elements.base.attr('disabled', 'disabled');
            self._elements.base.addClass('zpselect-disabled');
        } else {
            self._elements.base.removeAttr('disabled', 'disabled');
            self._elements.base.removeClass('zpselect-disabled');
        }

        self.refresh();
    },
    _setOption: function(key, value) {
        // Shhhhh!! Don't tell jQuery UI, otherwise they will mess me up with classes and attributes.
        if (key === 'disabled') {
            this.options[key] = value;
            return;
        }

        $.Widget.prototype._setOption.call(this, key, value);
    },
});

function ArraySelectSource(array, idField, textField) {
    var _array = array;
    var _id = idField || 'id';
    var _text = textField || 'text';

    return {
        setSource: function (src) {
            _array = src;
        },
        get: function(key) {
            var d = $.Deferred();

            if (_array) {
                var item = _array.qFirst(_id + ' === $params', key);
                if (item) {
                    d.resolve(item);
                } else {
                    d.reject();
                }
            } else {
                zpDebug('Array Source: No valid array assigned for a get.');
                d.reject({ error: new Error('No valid array.') });
            }

            return d.promise();
        },
        query: function(text) {
            var d = $.Deferred();

            if (_array && $.isArray(_array)) {

                if (text) {
                    var r = ZillionParts.Data.WildCardToRegex('*' + text + '*');
                    d.resolve(_array.qWhere('$params.test(' + _text + ')', r));
                } else {
                    d.resolve(_array);
                }
            } else {
                zpDebug('Array Source: No valid array assigned for a query.');
                d.reject();
            }

            return d.promise();
        }
    };
}
function SelectSelectSource(el) {
    var _element = el;

    function grabItems() {
        var stuff = [];
        _element.find('option').each(function () {
            var foo = $(this);
            var itemID = foo.attr('value');
            var itemText = foo.text();
            if (itemID && itemText) {
                stuff.push({ id: itemID, text: itemText });
            }
        });
        return stuff;
    }

    return {
        'get': function(key) {
            var d = $.Deferred();

            var stuff = grabItems();
            var item = stuff.qFirst('id === $params', key);
            if (item) {
                d.resolve(item);
            } else {
                d.reject();
            }

            return d.promise();
        },
        query: function(text) {
            var d = $.Deferred();

            var stuff = grabItems();
            if (text) {
                var regex = ZillionParts.Data.WildCardToRegex('*' + text + '*');
                d.resolve(stuff.qWhere('$params.test(text)', regex));
            } else {
                d.resolve(stuff);
            }

            return d.promise();
        }
    };
}

(function () {
    var timePickerDefaults = {
        hourStart: 0,
        hourEnd: 24,
        minuteInterval: 5,
        restricted: false
    };

    function getTimePickerFormat(hours, minutes) {
        if (hours < 10) {
            hours = '0' + hours;
        }
        if (minutes != undefined && minutes < 10) {
            minutes = '0' + minutes;
        }
        return minutes !== undefined ? hours + ":" + minutes : hours + ":";
    }

    function toMinutes(hours, minutes) {
        return minutes !== undefined ? hours * 60 + minutes : hours * 60;
    }


    ZillionParts.Select.TimePickerSource = function (options) {
        options = $.extend(true, {}, timePickerDefaults, options);

        var timeRegex = /(\d{1,2})([\:\.]?(\d{2}))?/;

        var itemsTimesFixed = [], itemsHourHints = [];
        for (var hh = options.hourStart; hh < options.hourEnd; hh++) {
            itemsHourHints.push({ id: toMinutes(hh), text: getTimePickerFormat(hh), zpsSearchHint: true });

            for (var mm = 0; mm < 60; mm += options.minuteInterval) {
                itemsTimesFixed.push({ id: toMinutes(hh, mm), text: getTimePickerFormat(hh, mm) });
            }
        }

        return {
            "features": {
                "zeroID": true
            },
            "get": function (id) {
                var d = $.Deferred();
                id = id | 0;

                var h = (id / 60) | 0;
                var m = id % 60;
                var minutesOffset = toMinutes(h, m);

                d.resolve({ id: minutesOffset, text: getTimePickerFormat(h, m) });
                return d;
            },
            "query": function (text) {
                var d = $.Deferred();

                if (!text) {
                    d.resolve(itemsHourHints);
                    return d;
                } else {
                    text = text.trim();
                }

                var x = timeRegex.exec(text), h, m;
                if (x) {
                    h = x[1];
                    m = x[3];

                    if (options.restricted == false
                        && h !== undefined && h >= options.hourStart && h < options.hourEnd
                        && m !== undefined && m >= 0 && m < 60) {
                        h = h | 0;
                        m = m | 0;

                        // Specific time entered, show as only result.
                        d.resolve([{ id: toMinutes(h, m), text: getTimePickerFormat(h, m)}]);
                    } else if (h !== undefined && h >= options.hourStart && h < options.hourEnd) {
                        // Filter time based on hours.
                        h = h | 0;

                        var filteredTimes = itemsTimesFixed.qWhere(function (x) { return x.text.startsWith(getTimePickerFormat(h)); });
                        if (filteredTimes == 0) {
                            filteredTimes = itemsTimesFixed;
                        }

                        d.resolve(filteredTimes);
                    } else {
                        // By default return the hour search hints list.
                        d.resolve(itemsHourHints);
                    }
                } else {
                    // By default return the hour search hints list.
                    d.resolve(itemsHourHints);
                }

                return d;
            }
        };
    };
})();

var debugFluids = debugProxy('fluids');

function Fluids() {
    this.element = null;
    this.parent = null;
    this.value = null;

    this.parentFluid = null;
    this.fluidElements = [];
    this.fixedElements = [];

    this.heightSet = 0;

    this.takenHeight = 0;
    this.takenCount = 0;

    this.targetHeight = 0; // Target height with border.
    this.elementHeight = 0; // With Border.
    this.clientHeight = 0; // Without Border.
    this.outerHeight = 0; // With Margin.
    this.marginHeight = 0;
    this.borderHeight = 0;

    this.totalFluidsAddedHeight = 0;
    this.totalFixedHeight = 0;
    this.isCalculated = false;
}

Fluids.prototype.reset = function () {
    this.fluidElements.splice(0, this.fluidElements.length);
    this.fixedElements.splice(0, this.fixedElements.length);

    this.takenHeight = 0;
    this.takenCount = 0;

    this.targetHeight = 0; // Target height with border.
    this.elementHeight = 0; // With Border.
    this.clientHeight = 0; // Without Border.
    this.outerHeight = 0; // With Margin.
    this.marginHeight = 0;
    this.borderHeight = 0;

    this.totalFluidsAddedHeight = 0;
    this.totalFixedHeight = 0;
    this.isCalculated = false;

    return this;
};

var windowFluid = new Fluids();
function getFluidObj(el) {
    if (el.nodeType !== 1) {
        debugFluids.trace('zpFluids: Node detected with type other than "element": ' + $(el).getPath() + '.');
        return new Fluids();
    }

    // Grab element+config.
    var fluid = new Fluids();
    fluid.element = el;
    // Is the element visible?
    var isVisible = fluid.visible = !(el.offsetWidth === 0 && el.offsetHeight === 0 || el.style.display === 'none');
    if (isVisible) {
        fluid.value = el.getAttribute('zp-fluids');
        fluid.heightEval = el.getAttribute('zp-fluids-height');
        fluid.valueAs = el.getAttribute('zp-fluids-as') || 'height';

        if (fluid.value === 'window') {
            // Need some kind of parent.
            fluid.parent = null;
            fluid.parentFluid = fluid.parentFluid || windowFluid;
        } else {
            // Who's my daddy?
            var closest = fluid.element;
            while (closest) {
                closest = closest.parentElement;
                if (closest && closest.hasAttribute('zp-fluids')) {
                    break;
                }
            }
            fluid.parent = closest;
        }
    }
    return fluid;
}

var _fluidEvalCache = {};

function FluidEval(script, obj) {
    var f = _fluidEvalCache[script];
    if (!f) {
        _fluidEvalCache[script] = f = new Function('obj', 'with (obj) { return (' + script + '); }');
    }
    return f(obj);
}

function queryFluids() {
    return document.querySelectorAll('[zp-fluids]');
}

var _percentageMatch = /^(\d+(\.\d+)?)%$/;
var _heightEvalCache = {};

function parseHeightEval(text) {
    var t = _heightEvalCache[text];
    if (t === null) {
        return text;
    }
    else if (t !== undefined) {
        return t;
    } else {
        var m = _percentageMatch.exec(text);
        if (m && m[0]) {
            return _heightEvalCache[text] = 'height*' + (parseFloat(m[1]) / 100);
        } else {
            return _heightEvalCache[text] = null;
        }
    }
}
function parseThaNumber(x) {
    x = parseInt(x);
    if (isNaN(x)) {
        return 0;
    } else {
        return x;
    }
}

function FluidsSystem() {
    this.changesHash = 0;
    this.totalHeight = 0;
    this.fluids = [];

    this.findByElement = function (el) {
        for (var fluids = this.fluids, i = 0, ii = fluids.length, fluid; i < ii; i++) {
            if (fluids[i].element === el) {
                return fluids[i];
            }
        }
        return null;
    };

    this.update = function() {
        var fluidsObjs = this.fluids;
        var fluids = [];
        var fluid, parentFluid;
        var i, ii = 0;
        var evalParams;

        windowFluid.reset();

        fluidsObjs.splice(0, this.fluids.length);

        var allFluids = Array.prototype.slice.call(queryFluids());
        for (var j = 0, jj = allFluids.length; j < jj; j++) {
            fluidsObjs.push(fluid = getFluidObj(allFluids[j]));

            if (fluid.visible) {
                fluids.push(fluid);
                ++ii;
            }
        }

        // Resolve parents.
        for (i = 0; i < ii; i++) {
            fluid = fluids[i];

            parentFluid = fluid.parentFluid;
            if (!parentFluid) {
                if (fluid.parent) {
                    fluid.parentFluid = this.findByElement(fluid.parent) || getFluidObj(fluid.parent);
                } else {
                    fluid.parentFluid = new Fluids();
                }
            }
        }

        // Build structure.
        for (i = 0; i < ii; i++) {
            fluid = fluids[i];

            // Add to parent.
            fluid.computedStyle = getComputedStyle(fluid.element);
            if (fluid.value === 'fixed') {
                fluid.parentFluid.fixedElements.push(fluid);
            } else if (fluid.value === 'fill') {
                fluid.parentFluid.fluidElements.push(fluid);
            }
        }

        // Verify what I know.
        for (i = 0; i < ii; i++) {
            fluid = fluids[i];

            if (fluid.heightSet && parseInt(fluid.computedStyle[fluid.valueAs]) !== fluid.heightSet) {
                debugFluids.trace('zpFluids: Element height has been changed from outside the library.');
                zpDebug(fluid);
            }
        }

        // Calculate available heights.
        var el, marginHeight, borderHeight, paddingHeight, st, minHeight, maxHeight;
        var height, innerHeight, outerHeight;
        for (i = 0; i < ii; i++) {
            fluid = fluids[i];

            if (fluid.value === 'window') {
                el = fluid.element;

                st = fluid.computedStyle;

                marginHeight = parseThaNumber(st.marginTop) + parseThaNumber(st.marginBottom);
                borderHeight = parseThaNumber(st.borderTopWidth) + parseThaNumber(st.borderBottomWidth);
                paddingHeight = parseThaNumber(st.paddingTop) + parseThaNumber(st.paddingBottom);
                minHeight = parseThaNumber(st.minHeight);
                maxHeight = parseThaNumber(st.maxHeight);

                outerHeight = isIE89 ? document.documentElement.clientHeight : window.innerHeight;
                if (minHeight && outerHeight < minHeight) {
                    outerHeight = minHeight;
                } else if (maxHeight && outerHeight > maxHeight) {
                    outerHeight = maxHeight;
                }

                height = outerHeight - marginHeight;
                innerHeight = outerHeight - marginHeight - borderHeight - paddingHeight;

                fluid.elementHeight = height;
                fluid.clientHeight = innerHeight;
                fluid.outerHeight = outerHeight;
                fluid.marginHeight = marginHeight;
                fluid.borderHeight = borderHeight;
                fluid.paddingHeight = paddingHeight;
            } else if (fluid.value === 'fixed') {
                el = fluid.element;

                st = getComputedStyle(el);
                marginHeight = parseThaNumber(st.marginTop) + parseThaNumber(st.marginBottom);
                borderHeight = parseThaNumber(st.borderTopWidth) + parseThaNumber(st.borderBottomWidth);
                paddingHeight = parseThaNumber(st.paddingTop) + parseThaNumber(st.paddingBottom);

                height = el.offsetHeight;
                innerHeight = height - borderHeight - paddingHeight;
                outerHeight = height + marginHeight;

                fluid.elementHeight = height;
                fluid.clientHeight = innerHeight;
                fluid.outerHeight = outerHeight;
                fluid.marginHeight = marginHeight;
                fluid.borderHeight = borderHeight;
                fluid.paddingHeight = paddingHeight;
            } else if (fluid.value === 'fill') {
                el = fluid.element;

                st = getComputedStyle(el);
                marginHeight = parseThaNumber(st.marginTop) + parseThaNumber(st.marginBottom);
                borderHeight = parseThaNumber(st.borderTopWidth) + parseThaNumber(st.borderBottomWidth);
                paddingHeight = parseThaNumber(st.paddingTop) + parseThaNumber(st.paddingBottom);

                height = el.offsetHeight;
                innerHeight = height - borderHeight - paddingHeight;
                outerHeight = height + marginHeight;

                fluid.elementHeight = height;
                fluid.clientHeight = innerHeight;
                fluid.outerHeight = outerHeight;
                fluid.marginHeight = marginHeight;
                fluid.borderHeight = borderHeight;
                fluid.paddingHeight = paddingHeight;
            } else {
                debugFluids.error('zpFluids: Invalid value "' + fluid.value + '" for attribute zp-fluids of element ' + $(fluid.element).getPath() + '.');
            }
        }

        // Calculate fill heights.
        var addedHeight, targetHeight, defaultTargetHeight;
        for (i = 0; i < ii; i++) {
            fluid = fluids[i];

            if (fluid.value === 'fill') {
                el = fluid.element;
                parentFluid = fluid.parentFluid;

                if (parentFluid.isCalculated === false) {
                    // Calculate fixed heights and taken height.
                    parentFluid.totalFixedHeight = parentFluid.fixedElements.qSum('outerHeight');
                    parentFluid.totalFluidsAddedHeight = parentFluid.fluidElements.qSum('marginHeight+borderHeight');
                    parentFluid.fluidsRatio = parentFluid.fluidElements.length ? 1.0 / parentFluid.fluidElements.length : 1;
                    parentFluid.isCalculated = true;
                }

                if (fluid.heightEval) {
                    addedHeight = fluid.marginHeight + fluid.borderHeight;
                    defaultTargetHeight = Math.max(0, parentFluid.clientHeight - parentFluid.totalFixedHeight - parentFluid.totalFluidsAddedHeight) * parentFluid.fluidsRatio;

                    evalParams = {
                        height: defaultTargetHeight,
                        fixed: parentFluid.totalFixedHeight,
                        availableHeight: parentFluid.clientHeight,
                        fluids: parentFluid.fluidElements.length,
                        addedHeight: addedHeight,
                        element: $(el),
                        parent: $(el.parent)
                    };

                    targetHeight = FluidEval(parseHeightEval(fluid.heightEval), evalParams) | 0;
                    fluid.targetHeight = targetHeight;
                    parentFluid.takenHeight -= targetHeight + addedHeight;
                } else {
                    defaultTargetHeight = (Math.max(0, parentFluid.clientHeight - parentFluid.totalFixedHeight - parentFluid.totalFluidsAddedHeight) * parentFluid.fluidsRatio)|0;
                    fluid.targetHeight = defaultTargetHeight;
                    parentFluid.takenHeight -= defaultTargetHeight + addedHeight;
                }

            } else {
                fluid.targetHeight = fluid.elementHeight;
            }
        }

        // Apply heights.
        var changeHash = 0,
            totalHeight = 0;
        var cssStyleHeight;
        for (i = 0; i < ii; i++) {
            fluid = fluids[i];

            height = fluid.targetHeight;
            totalHeight += height;

            if (fluid.value === 'fill' && height !== fluid.heightSet) {
                if (height < 0 && fluid.heightSet > 0) {
                    debugFluids.error('zpFluids: Could not set height to ' + height + 'px for element ' + $(fluid.element).getPath() + '.');
                    height = 0;
                }

                var diff = fluid.heightSet - height;
                fluid.heightSet = height;

                cssStyleHeight = height + 'px';
                if (fluid.element.style[fluid.valueAs] !== cssStyleHeight) {
                    debugFluids.debug('zpFluids: Setting height to ' + height + 'px for element ' + $(fluid.element).getPath() + '.');
                    fluid.element.style[fluid.valueAs] = cssStyleHeight;
                }

                changeHash = (changeHash ^ (diff * ((i + 1) * 137)) * ii) % 1e8;
            }
        }

        this.changesHash = changeHash;
        this.totalHeight = totalHeight;
    };
}

(function () {
    function AvgFrameTime() {
        var frames = new Array(10), fi = 0, cavg = 0;
        this.add = function (time) {
            time = time | 0;
            frames[(fi++) % 10] = time > 0 ? time : 0;
            cavg = 0;
        };
        this.avg = function () {
            if (cavg !== 0) { return cavg; }


            cavg = 0;
            for (var i = 0; i < 10; i++) {
                cavg += frames[i];
            }
            cavg = cavg / 10;

            return cavg;
        };
    }

    var globalFluidSystem = new FluidsSystem();
    var lastFluids = 0;
    var lastFluidsHash = 0;
    var lastFluidsDuration = 0;
    var enableFluids = true;
    var vdgRefresh = {
        callback: function() {
            var $vdg = $('.virtual-data-grid');
            $vdg.virtualDataGrid('layout');
            $vdg.virtualDataGrid('invalidate');

            ZillionParts.Fluids.OnUpdated.notify();
        },
        delay: 16 // 60fps
    };
    var fluidTimer = null;
    var tracking = [0, 0, 0, 0], trackingIdx = 0;
    var updateFrameTime = new AvgFrameTime();
    var updateIsFast = function () {
        return updateFrameTime.avg() <= 5;
    }
    var updateCallback = function () {
        if (enableFluids) {
            var fluidsStartTime = Date.now(), fluidsEndTime;
            try {
                globalFluidSystem.update();
            } catch (ex) {
                debugFluids.trace('zpFluids: Library has thrown an error and will be disabled: ' + ex.toString() + '.');
                enableFluids = false;
                throw ex;
            }
            fluidsEndTime = Date.now();

            // Update time stats.
            lastFluids = fluidsStartTime;
            lastFluidsDuration = fluidsEndTime - lastFluidsDuration;

            updateFrameTime.add(lastFluidsDuration);

            // Track to avoid leaks.
            tracking[trackingIdx] = globalFluidSystem.totalHeight;
            trackingIdx = (++trackingIdx) % 4;

            if (lastFluidsHash !== globalFluidSystem.changesHash) {
                lastFluidsHash = globalFluidSystem.changesHash;
                if (isNaN(lastFluidsHash)) {
                    debugFluids.error('zpFluids: Change hash calculated is invalid (NaN).');
                    tracking = [0, 0, 0, 0];
                    trackingIdx = 0;

                } else if (lastFluidsHash === 0) {
                    // No updates done, we're finished.
                    tracking = [0, 0, 0, 0];
                    trackingIdx = 0;

                } else if (trackingIdx === 3) {
                    // Prevent fluids from leaking.
                    var x = tracking[1] - tracking[0],
                        y = tracking[2] - tracking[1],
                        z = tracking[3] - tracking[2];

                    // if x = y = z = 0 there is no fluid leaking
                    if (x === y && y === z && (x !== 0)) {
                        // this condition is meant if the height grow in a consistent manner
                        debugFluids.trace('zpFluids: Total height is constantly growing. Library will be disabled.');
                        enableFluids = false;

                        setTimeout(function () {
                            debugFluids.trace('zpFluids: Library has been enabled again.');
                            enableFluids = true;
                        }, 10000);
                    }
                }
                //refresh the grid layout to make sure it's up to date
                throttle(vdgRefresh);
            }
        }
    };

    var beginUpdateLastHash = 0;
    var beginUpdate = function () {
        if (updateIsFast()) {
            updateCallback();
        }

        if (fluidTimer === null) {
            fluidTimer = setInterval(function () {
                try {
                    updateCallback();
                } finally {
                    if (fluidTimer && beginUpdateLastHash === lastFluidsHash || isNaN(lastFluidsHash)) {
                        clearInterval(fluidTimer);
                        fluidTimer = null;
                    }
                    beginUpdateLastHash = lastFluidsHash;
                }
            }, 16); //60fps
        }
    };

    var regularUpdate = function() {
        var d = Date.now(), diff = d - lastFluids, previousHash;
        if (diff > 500) {
            previousHash = lastFluidsHash;
            updateCallback();
            if (previousHash !== lastFluidsHash) {
                debugFluids.trace('zpFluids: An extra height update was performed on the page.');
            }
        }
    };

    $(function() {
        updateCallback();
        beginUpdate();
        setInterval(regularUpdate, 5000);
    });

    var resizingTimer = null;
    $(window).resize(function() {
        if (resizingTimer) {
            clearTimeout(resizingTimer);
            resizingTimer = null;
        } else {
            $('html').addClass('x-resizing');
        }
        resizingTimer = setTimeout(function() {
            resizingTimer = null;
            $('html').removeClass('x-resizing');
            beginUpdate();
        }, 500);
        beginUpdate();
    });

    zpExport({
        Fluids: {
            OnUpdated: new ZillionParts.Event(),
            Update: function() {
                beginUpdate();
                updateCallback();
            },
            Debug: function() {
                globalFluidSystem.fluids.qEach(function (fluid, i) {
                    var object = '[' + i + ';' + (fluid.visible ? 'v' : 'h') + ';' + fluid.value + '] ' + fluid.targetHeight + ' - ' + fluid.clientHeight + '/' + fluid.elementHeight + '/' + fluid.outerHeight + '; ' + fluid.borderHeight + '/' + fluid.marginHeight;
                    debugFluids.debug(object, $(fluid.element).getPath());
                    fluid.element.setAttribute('zp-fluids-debug', object + '; ' + $(fluid.element).getPath());
                });
            },
            Profile: function() {
                var start = new Date(), duration, counter = 0, inc = 50;
                do {
                    for (var i = 0; i < inc; i++) {
                        updateCallback();
                    }
                    counter += inc;
                    duration = Date.now()- start;
                } while (duration < 1000);

                if (console.profile) {
                    console.profile('Zillion Parts Fluids');
                    updateCallback();
                    console.profileEnd();
                }

                debugFluids.trace('Zillion Parts Fluids: ' + (Math.round(duration / counter * 100) / 100) + ' ms.');
            }
        }
    });
})();

(function () {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    function encode(i) {
        if (i === 0) {
            return '0';
        }
        var result = '';
        while (i > 0) {
            result = chars[i % 62] + result;
            i = Math.floor(i / 62);
        }
        return result;
    }

    function decode(a) {
        var b, c, d;
        for (b = c = (a === (/\W|_|^$/.test(a += "") || a)) - 1; d = a.charCodeAt(c++);) {
            b = b * 62 + d - [, 48, 29, 87][d >> 5];
        }
        return b;
    }

    zpExport({
        Base62: {
            decode: decode,
            encode: encode
        }
    });
})();

var XORCipher = {
    encode: function (key, data) {
        data = xor_encrypt(key, data);
        return b64_encode(data);
    },
    decode: function (key, data) {
        data = b64_decode(data);
        return xor_decrypt(key, data);
    }
};

var b64_table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function b64_encode(data) {
    var o1, o2, o3, h1, h2, h3, h4, bits, r, i = 0, enc = "";
    if (!data) { return data; }
    do {
        o1 = data[i++];
        o2 = data[i++];
        o3 = data[i++];
        bits = o1 << 16 | o2 << 8 | o3;
        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;
        enc += b64_table.charAt(h1) + b64_table.charAt(h2) + b64_table.charAt(h3) + b64_table.charAt(h4);
    } while (i < data.length);
    r = data.length % 3;
    return (r ? enc.slice(0, r - 3) : enc) + "===".slice(r || 3);
}

function b64_decode(data) {
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, result = [];
    if (!data) { return data; }
    data += "";
    do {
        h1 = b64_table.indexOf(data.charAt(i++));
        h2 = b64_table.indexOf(data.charAt(i++));
        h3 = b64_table.indexOf(data.charAt(i++));
        h4 = b64_table.indexOf(data.charAt(i++));
        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;
        result.push(o1);
        if (h3 !== 64) {
            result.push(o2);
            if (h4 !== 64) {
                result.push(o3);
            }
        }
    } while (i < data.length);
    return result;
}

function keyCharAt(key, i) {
    return key.charCodeAt(Math.floor(i % key.length));
}

function xor_encrypt(key, data) {
    return data.split('').qSelect(function (c, i) {
        return c.charCodeAt(0) ^ keyCharAt(key, i);
    });
}

function xor_decrypt(key, data) {
    return data.qSelect(function (c, i) {
        return String.fromCharCode(c ^ keyCharAt(key, i));
    }).join("");
}

zpExport({
   Cipher: {
       Xor: XORCipher
   }
});

zpExport({
    PreventNav: {
        When: preventNavWhen,
        Backspace: preventNavBackspace
    }
});

var preventNav = [];
function preventNavWhen(options) {
    if (options) {
        options = $.extend(true, { valid: true, enabled: true }, options);

        preventNav.push(options);

        return {
            cancel: function () {
                options.valid = false;
            }
        };
    } else {
        return null;
    }
}

function preventNavEval(val) {
    return $.isFunction(val) ? val() : val;
}

$(window).on('beforeunload', function (event) {
    var list = preventNav;
    var i = list.length;
    while (i-- > 0) {
        var item = list[i];
        if (preventNavEval(item.valid)) {
            if (preventNavEval(item.enabled)) {
                var reason = preventNavEval(item.reason);
                event.returnValue = reason;
                return reason;
            }
        }
    }
});

var preventNavBack = [];
function preventNavBackspace(options) {
    if (options) {
        options = $.extend(true, { valid: true, enabled: true }, options);

        preventNavBack.push(options);

        return {
            cancel: function () {
                options.valid = false;
            }
        };
    } else {
        return null;
    }
}

$(window).on('keydown', function (x) {
    if (x.keyCode === 8) {
        var el = x.srcElement || x.target;

        //
        // Preconditions.
        var nodeName = el.nodeName.toLowerCase();
        if ((nodeName === 'input' && el.type === 'text') || nodeName === 'textarea') {
            return true;
        }

        //
        // Should I prevent?
        var $el = $(el);
        var list = preventNavBack, i, item;
        var prevent = false;

        i = list.length;
        while (i-- > 0) {
            item = list[i];
            if (preventNavEval(item.valid)) {
                if (item.within && $el.closest(item.within).length > 0) {
                    prevent = true;
                    break;
                } else if (item.element && $(item.element).is($el)) {
                    prevent = true;
                    break;
                } else if (item.custom && !item.custom($el)) {
                    prevent = true;
                    break;
                }
            }
        }

        //
        // Handle exceptions.
        if (prevent) {
            i = list.length;
            while (i-- > 0) {
                item = list[i];
                if (preventNavEval(item.valid)) {
                    if (item.except && $el.is(item.except)) {
                        prevent = false;
                        break;
                    }
                }
            }
        }

        //
        // Prevent.
        if (prevent) {
            x.preventDefault();
            return true;
        }
    }
});

})(jQuery, window);
