using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Web;
using System.Web.UI;
using DelftDI.Common.RIS.Common;
using DelftDI.Common.RIS.Json;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Profiling;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Handlers;
using Rogan.ZillionRis.Web.Shared;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Common;

namespace ZillionRis.Controls
{
    public abstract class PageBaseBase : Page, IStartupScript
    {
        #region Page Plugin.
        private class ModulePagePluginRequest : IModulePagePluginRequest
        {
            private readonly List<IModulePagePlugin> _pages = new List<IModulePagePlugin>();

            public List<IModulePagePlugin> Pages
            {
                get { return this._pages; }
            }

            public PageBaseBase Page { get; set; }

            public HttpContext GetContext()
            {
                return this.Page.Context;
            }

            public Page GetPageInstance()
            {
                return this.Page;
            }

            public IEnumerable<Uri> Requires()
            {
                return this.Page.RequireModules;
            }

            public string GetPageAccessKey()
            {
                var pageAccessKey = this.Page as PageBase;
                if (pageAccessKey != null)
                    return pageAccessKey.RisAccessKey;

                return null;
            }
        }

        private readonly List<Uri> _requireModules = new List<Uri>();
        private readonly List<IModulePagePlugin> _pagePluginList = new List<IModulePagePlugin>();

        protected List<Uri> RequireModules
        {
            get { return this._requireModules; }
        }

        protected void AddPagePlugin(IModulePagePlugin plugin)
        {
            this._pagePluginList.Add(plugin);
        }

        protected void IncludePagePlugin()
        {
            var request = new ModulePagePluginRequest();
            request.Page = this.Page as PageBaseBase;

            var intent = new Intent {Action = WebControlsIntent.Action_LegacyPagePlugin, Data = request};
            var list = this.Application.BroadcastIntent(intent).OfType<IModulePagePlugin>().Where(x => x != null);

            this.ProcessPagePlugin(this._pagePluginList.Concat(list));
        }

        protected void ProcessPagePlugin(IEnumerable<IModulePagePlugin> list)
        {
            var coreScriptsContainer = this.GetCoreScriptsContainer();
            var additionalScriptsContainer = this.GetAdditionalScriptsContainer();

            var styles = list.SelectMany(x => x.GetStylesDependencies());
            var scripts = list.SelectMany(x => x.GetScriptDependencies());
            var templates = list.SelectMany(x => x.GetTemplateDependencies());
            var inits = list.Select(x => x.GetInitScript());

            foreach (string style in styles)
            {
                coreScriptsContainer.Add(new LiteralControl(this.Style(style)));
            }

            if (RisAppSettings.AppSetting_BundleScripts)
            {
                var coreScriptCodes = new List<string>();
                var scriptCodes = new List<string>();
                var coreScriptFilter = scripts.Where(x => x.Contains("jquery"));

                foreach (string script in coreScriptFilter)
                {
                    var item = RisApplication.ScriptBundleCodes.FirstOrDefault(x => x.Uri.ToString() == script);
                    if (item == null)
                        coreScriptsContainer.Add(new LiteralControl(this.Script(script)));
                    else
                        coreScriptCodes.Add(item.Code);
                }

                foreach (string script in scripts.Except(coreScriptFilter))
                {
                    var item = RisApplication.ScriptBundleCodes.FirstOrDefault(x => x.Uri.ToString() == script);
                    if (item == null)
                        additionalScriptsContainer.Add(new LiteralControl(this.Script(script)));
                    else
                        scriptCodes.Add(item.Code);
                }

                if (coreScriptCodes.Any())
                {
                    var bundledCode = coreScriptCodes.JoinText("");
                    var s = string.Format("<script src=\"{0}\"></script>",
                        this.ResolveClientUrl("~/api/bundled/" + bundledCode + "?l=" + CultureInfo.CurrentUICulture.Name));
                    coreScriptsContainer.Add(new LiteralControl(s));
                }
                if (scriptCodes.Any())
                {
                    var bundledCode = scriptCodes.JoinText("");
                    var s = string.Format("<script src=\"{0}\"></script>",
                        this.ResolveClientUrl("~/api/bundled/" + bundledCode + "?l=" + CultureInfo.CurrentUICulture.Name));
                    additionalScriptsContainer.Add(new LiteralControl(s));
                }
            }
            else
            {
                var coreScriptFilter = scripts.Where(x => x.Contains("jquery"));
                foreach (string script in coreScriptFilter)
                    coreScriptsContainer.Add(new LiteralControl(this.Script(script)));
                foreach (string script in scripts.Except(coreScriptFilter))
                    additionalScriptsContainer.Add(new LiteralControl(this.Script(script)));
            }

            foreach (string template in templates)
                this.Controls.Add(new LiteralControl(this.RenderView(template)));
            foreach (string init in inits)
                this.AppendPageScript(init);
        }

        private ControlCollection GetAdditionalScriptsContainer()
        {
            var m = this.Master as LowProfileMaster;
            var additionalScriptsPub = m != null ? m.AdditionalScriptsPub.Controls : this.Header.Controls;
            return additionalScriptsPub;
        }

        private ControlCollection GetCoreScriptsContainer()
        {
            var m = this.Master as LowProfileMaster;
            var coreScriptsPub = m != null ? m.CoreScriptsPub.Controls : this.Page.Header.Controls;
            return coreScriptsPub;
        }
        #endregion

        #region Session Context
        private RisApplication _application;
        private ISessionContext _sessionContext;

        public new RisApplication Application
        {
            get { return this._application ?? (this._application = RisApplication.Current); }
        }

        public ISessionContext SessionContext
        {
            get
            {
                if (this._sessionContext != null)
                    return this._sessionContext;

                var application = this.Application;
                if (application != null)
                    return this._sessionContext = application.GetSessionContext();

                return null;
            }
        }
        #endregion

        #region ASP.NET Life Cycle
        public override void ProcessRequest(HttpContext context)
        {
            ProcessRequest(context, true);
        }

        public void ProcessRequest(HttpContext context, bool validateUser)
        {
            if (validateUser)
            {
                if( !context.UserIsLoggedIn()) 
                {
                    context.Response.Redirect("~/Login.aspx?reason=unauthorized", true);
                    return;
                }
            }

            using (var profiler = Profiler
                .Create("Zillion RIS", "Website")
                .Add<ProfileScopeStopwatch>()
                .Add<ProfileScopeHttpContext>(x => x.HttpContext = context)
                .Add<SessionContextProfileInfo>(sc => sc.SessionContext = this.SessionContext)
                .Add<PageProfileInfo>(sc => sc.Page = this)
                .Start())
            {
                base.ProcessRequest(context);
                profiler.Commit();
            }
        }

        protected override void OnInit(EventArgs e)
        {
            var scriptManager = ScriptManager.GetCurrent(this);
            if (scriptManager != null)
                scriptManager.RegisterAsyncPostBackControl(this);

            base.OnInit(e);
        }

        protected override void OnPreRenderComplete(EventArgs e)
        {
            var windowVariablesScript = this.CreateInitWindowVariablesScript();

            if (windowVariablesScript != null)
                ScriptManager.RegisterClientScriptBlock(this, this.GetType(), "InitWindowVars", windowVariablesScript, true);

            var pageScript = this.CreatePageScript();
            if (pageScript != null)
                ScriptManager.RegisterStartupScript(this, this.GetType(), "PageScript", pageScript, true);

            base.OnPreRenderComplete(e);
        }
        #endregion

        #region Page Load Script.
        private readonly StringBuilder _pageScript = new StringBuilder();

        /// <summary>
        ///     Executes the specified JavaScript on the client when the page has been loaded.
        /// </summary>
        /// <param name="script">The script.</param>
        public void AppendPageScript(string script)
        {
            this._pageScript.Append(script);
        }

        private string CreatePageScript()
        {
            if (this._pageScript.Length > 0)
            {
                this._pageScript.Insert(0, "$(function(){");
                this._pageScript.Append("});");
                var pageScript = this._pageScript.ToString();
                this._pageScript.Clear();
                return pageScript;
            }

            return null;
        }
        #endregion

        #region Init Window Variables.
        private readonly List<object> _initWindowVars = new List<object>();

        private string CreateInitWindowVariablesScript()
        {
            string script = null;
            if (this._initWindowVars.Count > 0)
            {
                var windowVarsScript = new StringBuilder();
                var dict = new Dictionary<string, object>();
                foreach (object pageVar in this._initWindowVars)
                {
                    ApplyObject(dict, pageVar);
                }

                foreach (KeyValuePair<string, object> item in dict)
                {
                    windowVarsScript.AppendFormat("window[{0}]={1};", item.Key.ToJson(), item.Value.ToJson());
                }

                script = windowVarsScript.ToString();
            }
            return script;
        }

        /// <summary>
        ///     Applies the specified object properties to the window of the browser client during loading of the HTML document.
        /// </summary>
        /// <param name="obj">The object.</param>
        public void InitWindowVariables(object obj)
        {
            this._initWindowVars.Add(obj);
        }

        private static void ApplyObject(Dictionary<string, object> dict, object value)
        {
            if (value != null)
            {
                var properties = value.GetType().GetProperties();
                foreach (PropertyInfo propertyInfo in properties)
                    dict[propertyInfo.Name] = propertyInfo.GetValue(value, null);
            }
        }
        #endregion

        #region Logging.
        protected void LogException(string action, Exception ex)
        {
            this.Application.LogError(this.GetType().Name + ": " + action, ex);
        }
        #endregion

        public class PageProfileInfo : IProfileScopeCollector
        {
            public Page Page { get; set; }

            public void Start()
            {
            }

            public void Stop()
            {
            }

            public void Reset()
            {
            }

            public void Report(ProfileDataItem dataItem)
            {
                if (this.Page != null)
                {
                    dataItem["ASP.IsPostback"] = this.Page.IsPostBack.ToString();
                    dataItem["PageName"] = this.Page.GetType().Name;
                }
            }
        }
    }
}