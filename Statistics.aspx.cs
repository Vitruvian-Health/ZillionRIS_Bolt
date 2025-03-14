using System;

using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Controls;

namespace ZillionRis
{
    public partial class Statistics : PageBase
    {
        protected void Page_Init(object sender, EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            this.InitWindowVariables(new
            {
                pageConfig = new
                {
                    allowTotalProdPerModality = this.Application.UserHasPermission(UserPermissions.StatsTotalProductionPerModality),
                    allowTotalProdPerOrderType = this.Application.UserHasPermission(UserPermissions.StatsTotalProductionPerOrderType),
                    allowProdExamTypeForModality = this.Application.UserHasPermission(UserPermissions.StatsProductionPerExaminationTypeForModality),
                    allowPatientOverviewPerDay = this.Application.UserHasPermission(UserPermissions.StatsPatientOverviewPerDay),
                    allowTotalProdPerModalityPerCtg = this.Application.UserHasPermission(UserPermissions.StatsTotalProductionPerModalityPerCTG),
                    ShowXdsPendingDocumentsButton = RisAppSettings.ShowXdsPendingDocumentsButton
                }
            });
        }

        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageStatistics; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.StatisticsPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.StatisticsPage; }
        }
    }
}