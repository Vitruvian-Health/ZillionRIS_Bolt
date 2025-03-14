using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Extensibility.UI;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using Rogan.ZillionRis.Website.App_GlobalResources;

namespace ZillionRis.Common
{
    public sealed class HousekeepingMenuModuleProvider : IMenuModuleProvider
    {
        #region IMenuModuleProvider Members
        public MenuModule Create(ISessionContext context)
        {
            var menu = new MenuModule();
            menu.Title = WebResources.smHousekeeping;

            if (context.HasPermission(UserPermissions.PageHousekeeping))
                menu.AddPage(PageAccessKey.HousekeepingPage, WebResources.smHousekeeping, "~/housekeeping/");

            menu.DefaultToFirstPageIfNone();
            return menu;
        }
        #endregion
    }
}