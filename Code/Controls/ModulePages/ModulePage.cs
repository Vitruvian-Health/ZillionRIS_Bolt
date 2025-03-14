using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.SessionState;
using System.Web.UI;
using System.Web.UI.WebControls;
using DelftDI.Common.RIS.Json;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Runtime;
using Rogan.ZillionRis.Web.Shared;

using ZillionRis.Common;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website.Code.Controls.ModulePages
{
    public class ModulePage : PageBase, IRequiresSessionState
    {
        public string ModulePageComponent { get; set; }
        public ModulePageDefinition Definition { get; set; }

        protected override string PagePermissionKey
        {
            get { return null; }
        }

        public override string RisAccessKey
        {
            get { return ModulePageMenuProvider.CreatePageAccessKey(this.Definition); }
        }

        public override string PageManualAccessKey
        {
            get { return ModulePageMenuProvider.GetUserManualEntryPoint(this.Definition); }
        }

        public override bool AllowCachedResponse
        {
            get { return true; }
        }

        protected override void OnInit(EventArgs e)
        {
            // Usually called by designers.
            this.InitializeCulture();

            var mpDefinition = this.GetModulePageDefinition();
            if (mpDefinition != null && mpDefinition.HasAccess)
            {
                this.Definition = mpDefinition;

                this.RegisterRelativePathsScript();

                this.AddPagePlugin(this.Definition.PagePlugin);
                this.RequireModules.AddRange(this.Definition.Requires.Select(x => new Uri(x)));
            }
            else
            {
                // Module page definition did not respond or the access was denied.
                NavigationHelper.DisplayDefaultPage();
            }

            base.OnInit(e);
        }

        private ModulePageDefinition GetModulePageDefinition()
        {
            var mpComponent = this.ModulePageComponent;
            var sessionContext = this.SessionContext;
            var moduleContext = sessionContext.Get<ModuleContext>();

            var mpIntent = new Intent
            {
                Action = WebControlsIntent.Action_ModulePage,
                Component = mpComponent,
                Data = null
            };

            return moduleContext.TaskActivator.Task(ActivatingRequest.Create(mpIntent)) as ModulePageDefinition;
        }

        protected override void OnLoad(EventArgs e)
        {
            if (this.IsPostBack == false)
            {
                var definition = this.Definition;

                var angularModules = new HashSet<string>(definition.AngularModules ?? new string[0]);
                angularModules.Add("ris");
                angularModules.Add("ui.ris");

                var mainDiv = string.Format("<div id=\"mph\" modules-template={0}></div>", definition.TemplateUri);
                var angularBootstrap = string.Format("angular.bootstrap(document.getElementById('mph'), {0});", angularModules.ToJson());
                
                this.AppendPageContent(mainDiv);
                this.AppendPageScript(angularBootstrap);
            }

            base.OnLoad(e);
        }

        private void AppendPageContent(string mainDiv)
        {
            var content = (ContentPlaceHolder) this.MasterPage.FindControl("MainContent");
            content.Controls.Add(new LiteralControl(mainDiv));
        }
    }
}