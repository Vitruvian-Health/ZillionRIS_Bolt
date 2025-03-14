using System;
using Rogan.ZillionRis.Codes.CancellationReasonCategory;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class OrderApproval : PageBase
    {
        public override string RisAccessKey => PageAccessKey.OrderApprovalPage;

        protected override string PagePermissionKey => UserPermissions.PageOrderApproval;

        public override string PageManualAccessKey => UserManualAccessKey.OrderApprovalPage;

        protected void Page_Init(object sender, EventArgs e)
        {
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));
            RequireModules.Add(new Uri("module://worklist/requires/grid-worklist"));

            InitWindowVariables(new
            {
                pageConfig = new
                {
                    AutoShowRequestForm = RisAppSettings.OrderApproval_AutoShowRequestForm,
                    CancellationReasonCategoryDecline = CancellationReasonCategory.VettingDecline,
                    ExcludeCancelledInHistory = RisAppSettings.OrderApprovalPatientHistoryGridExcludeCancelledExaminations,
                }
            });
        }
    }
}
