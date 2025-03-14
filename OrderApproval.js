(function ($, window, undefined) {
    $(function() {

        var commandManager = new ZillionParts.CommandManager();
        var commandResources = new ZillionParts.CommandResources();

        commandManager.assign(ZillionRis.Commands.Application);
        commandManager.assign(ZillionRis.Commands.Patients);
        commandManager.assign(ZillionRis.Commands.Orders);
        commandManager.assign(ZillionRis.Commands.Examinations);

        $(function() {
            ZillionRis.Commands.RegisterResources(commandResources);
        });

        $.extend(true, window, {
            OrderApproval: {
                CommandManager: commandManager,
                CommandResources: commandResources
            }
        });

    });
})(jQuery, window);
