using System;

using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Controls;

namespace ZillionRis
{
    public partial class DictationOverview : PageBase
    {
        #region Properties
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageDictationOverview; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.DictationOverviewPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.DictationOverviewPage; }
        }
        #endregion

        #region ASP.Net Lifecycle

        protected void Page_Init(object sender, EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://dictation/requires/dictation-overview-page"));
            this.RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));
        }
        #endregion

    }
}