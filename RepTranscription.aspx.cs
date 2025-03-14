using System;

using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Controls;

namespace ZillionRis
{
    public partial class RepTranscription : PageBase
    {
        #region Properties
        public override bool AllowCachedResponse
        {
            get { return true; }
        }

        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageTranscription; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.TranscriptionPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.TranscriptionPage; }
        }
        #endregion

        #region ASP.Net Lifecycle
        protected void Page_Init(object sender, EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://dictation/requires/app"));
            this.RequireModules.Add(new Uri("module://dictation/requires/transcription-page"));
            this.RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            this.InitWindowVariables(new
            {
                pageConfig = new
                {
                    RefreshIntervalMs = RisAppSettings.TranscriptionPage_RefreshInterval * 60000
                }
            });
        }
        #endregion
    }
}