using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Extensibility.UI;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using Rogan.ZillionRis.Website.App_GlobalResources;

namespace ZillionRis.Common
{
    public sealed class ManagementMenuModuleProvider : IMenuModuleProvider
    {
        #region IMenuModuleProvider Members
        public MenuModule Create(ISessionContext context)
        {
            var menu = new MenuModule();
            menu.Title = "Management";

            if (context.HasPermission(UserPermissions.PageStatistics))
                menu.AddPage(PageAccessKey.StatisticsPage, WebResources.smManagement, "~/Statistics.aspx");

            if (context.HasPermission(UserPermissions.PageMaintenance))
                menu.AddPage(PageAccessKey.MaintenancePage, WebResources.smMaintenance,
                    RisAppSettings.MaintenanceAddress);

            if (context.HasPermission(UserPermissions.PageAdvancedFilter))
                menu.AddPage(PageAccessKey.AdvancedFilterPage, WebResources.smAdvancedFiltering,
                    "~/frmAdvancedFilter.aspx");

            if (context.HasPermission(UserPermissions.PageDictationOverview))
                menu.AddPage(PageAccessKey.DictationOverviewPage, WebResources.smDictationOverview,
                    "~/DictationOverview.aspx");

            if (context.HasPermission(UserPermissions.ServiceUser))
                menu.AddPage(PageAccessKey.ServicePage, WebResources.ServicePage_Title, "~/service/");

            return menu;
        }
        #endregion
    }
}