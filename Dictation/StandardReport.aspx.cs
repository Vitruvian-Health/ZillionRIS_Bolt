using System;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Common;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website.Dictation
{
    public class StandardReport : PageBase
    {
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageStandardReport; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.StandardReportPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.StandardReportPage; }
        }

        public override bool AllowCachedResponse
        {
            get { return true; }
        }

        protected override void OnPreInit(EventArgs e)
        {
            if (RisAppSettings.ReportOnOrderLevel)
            {
                NavigationHelper.DisplayDefaultPage();
            }

            base.OnPreInit(e);
        }

        protected override void OnInit(EventArgs e)
        {
            RequireModules.Add(new Uri("module://patientmerge/requires/app"));

            base.OnInit(e);

            RegisterRelativePathsScript();
        }
    }
}
