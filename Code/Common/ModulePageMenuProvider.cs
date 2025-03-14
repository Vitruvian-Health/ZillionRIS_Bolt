using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.UI;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Runtime;
using Rogan.ZillionRis.Web.Shared;

namespace ZillionRis.Common
{
    public sealed class ModulePageMenuProvider : IMenuModuleProvider
    {
        public MenuModule Create(ISessionContext context)
        {
            var mm = new MenuModule();
            mm.Title = "Modules";

            var intent = new Intent {Action = WebControlsIntent.Action_ModulePage, Component = null, Data = null};
            var resolvedIntents = RisApplication.ModuleManager.Intent(intent);
            foreach (Intent resolvedIntent in resolvedIntents)
            {
                var task = context.Get<ModuleContext>().TaskActivator.Task(ActivatingRequest.Create(resolvedIntent)) as ModulePageDefinition;
                if (task != null)
                {
                    if (task.HasAccess)
                    {
                        var page = mm.CreatePage(CreatePageAccessKey(task), task.Title, "~/p/" + task.Name);
                        page.AllowDirectAccess = task.AllowDirectAccess;
                        mm.Pages.Add(page);
                    }
                }
            }

            return mm;
        }

        public static string CreatePageAccessKey(ModulePageDefinition task)
        {
            if (task == null)
                return null;

            return "mp-" + task.Name;
        }

        public static string GetUserManualEntryPoint(ModulePageDefinition task)
        {
            if (task == null)
                return "Home.html";

            return task.PageManualAccessKey;
        }
    }
}