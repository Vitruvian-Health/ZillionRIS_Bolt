ris.notify = {
    shortTimeout: 3000,
    normalTimeout: 8000,
    longTimeout: 20000,
    showMessage: function (titleHtml, messageHtml, timeout) {
        var item = new ZillionParts.Notifications.Item();
        item.title = titleHtml;
        item.message = messageHtml;
        item.ttl = timeout || 8000;
        notifications.add(item);
        return item;
    },
    showInformation: function (titleHtml, messageHtml, timeout) {
        var item = new ZillionParts.Notifications.Item();
        item.type = 'information';
        item.title = titleHtml;
        item.message = messageHtml;
        item.ttl = timeout || 8000;
        notifications.add(item);
        return item;
    },
    showSuccess: function (titleHtml, messageHtml, timeout) {
        var item = new ZillionParts.Notifications.Item();
        item.type = 'success';
        item.title = titleHtml;
        item.message = messageHtml;
        item.ttl = timeout || 8000;
        notifications.add(item);
        return item;
    },
    showError: function (titleHtml, messageHtml, timeout) {
        var item = new ZillionParts.Notifications.Item();
        item.type = 'error';
        item.title = titleHtml;
        item.message = messageHtml;
        item.ttl = timeout || 15000;
        notifications.add(item);
        return item;
    },
    clear: function() {
        notifications.closeAll();
    }
};