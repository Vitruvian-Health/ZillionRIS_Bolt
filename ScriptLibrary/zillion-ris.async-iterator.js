var ZillionRis;
(function (ZillionRis, $) {
    var AsyncIterator;
    (function (AsyncIterator) {
        function CreateAsyncIterator(start) {
            var pos = null;
            return {
                next: function (value) {
                    if (pos) {
                        pos = pos.then(function (p) { return p ? p.next(value) : null; });
                    }
                    else {
                        pos = start(value);
                    }
                    return pos.then(function (p) { return ({ value: p ? p.Current : null, done: !p }); });
                }
            };
        }
        AsyncIterator.CreateAsyncIterator = CreateAsyncIterator;
        function IterateOverArray(items) {
            function impl(i) {
                return $.Deferred().resolve().then(function () {
                    if (i >= items.length)
                        return null;
                    return {
                        Current: items[i],
                        next: function () { return impl(++i); }
                    };
                });
            }
            return CreateAsyncIterator(function () { return impl(0); });
        }
        AsyncIterator.IterateOverArray = IterateOverArray;
    })(AsyncIterator = ZillionRis.AsyncIterator || (ZillionRis.AsyncIterator = {}));
})(ZillionRis || (ZillionRis = {}), jQuery);
