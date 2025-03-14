using System;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class ExaminationProtocolAssignments : PageBase
    {
        protected override string PagePermissionKey => UserPermissions.PageExaminationProtocolAssignments;

        public override string RisAccessKey => PageAccessKey.ExaminationProtocolAssignmentsPage;

        public override string PageManualAccessKey => UserManualAccessKey.ExaminationProtocolAssignmentsPage;

        protected void Page_Init(object sender, EventArgs e)
        {
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));
            RequireModules.Add(new Uri("module://worklist/requires/grid-worklist"));
        }
    }
}
