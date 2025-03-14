using System;
using System.Linq;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Dictation.Models;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Web.Shared;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Common;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class Authorization : PageBase
    {
        #region Properties
        public override bool AllowCachedResponse
        {
            get { return true; }
        }

        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageAuthorization; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.AuthorizationPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.AuthorizationPage; }
        }
        #endregion

        #region ASP.Net Lifecycle
        protected void Page_Init(object sender, EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://dictation/requires/authorization-page"));
            this.RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            AuthorizationPlugin authorizationPlugin = new AuthorizationPlugin();
            var intent = new Intent
            {
                Action = "dictation.authorizationcommands",
                Data = authorizationPlugin
            };
            this.Application.BroadcastIntent(intent);

            this.InitWindowVariables(new
            {
                pageConfig = new
                {
                    RefreshIntervalMs = RisAppSettings.AuthorizationPage_RefreshInterval*60000,
                    PluginCommands = authorizationPlugin.Commands,
                    enableSupervision = RisApplication.ModuleManager.Modules.Any(moduleE => moduleE.ModuleUri == new Uri("module://supervision/"))
                }
            });
        }
        #endregion
    }
}