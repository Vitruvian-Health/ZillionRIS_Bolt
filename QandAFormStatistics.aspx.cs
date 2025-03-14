using System;

using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class QandAFormStatistics : PageBase
    {
        protected void Page_Load(object sender, EventArgs e)
        {

        }

        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageStatistics; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.QandAStatisticsPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.QandAStatisticsPage; }
        }
    }
}