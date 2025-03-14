using DelftDI.Common.RIS.Json;
using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.Extentions;
using Rogan.ZillionRis.WebControls.Extensibility;
using Rogan.ZillionRis.WebControls.Pages;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Principal;
using System.Text;
using System.Web.UI;
using System.Web.UI.WebControls;
using Rogan.ZillionRis.Web.Handlers.Razor;
using ZillionRis.Common;

namespace ZillionRis
{
    public partial class LowProfileMaster : MasterPage, IPageGlobalMessagePopup, IMasterPage
    {
        public PlaceHolder CoreScriptsPub
        {
            get { return CoreScripts; }
        }

        public PlaceHolder AdditionalScriptsPub
        {
            get { return AdditionalScripts; }
        }

        #region Properties
        /// <summary>
        ///     Gets the <see cref="RisApplication" /> instance for the current Web request.
        /// </summary>
        /// <value></value>
        /// <returns>
        ///     The <see cref="RisApplication" /> object for the current Web request.
        /// </returns>
        public new RisApplication Application
        {
            get { return RisApplication.Current; }
        }

        public string[] JavaScriptResourceUrl
        {
            get
            {
                var todo = new[] {"ris", "calendars", "dictation"};

                return todo
                    .Select(x => string.Format("~/api/service/localize/{0}/{1}", x, (Application.Language ?? "en-US")))
                    .ToArray();
            }
        }

        public string JavaScriptCultureUrl
        {
            get { return "~/api/service/culture/" + (Application.Language ?? "en-US"); }
        }


        public string InitializeCulture
        {
            get
            {
                var culture = string.Format("window.culture={0};", Application.Language.ToJson());
                return "(function () { " + culture + " })();";
            }
        }
        
        /// <summary>
        ///     Gets or sets the script manager from the master page.
        /// </summary>
        /// <value>
        ///     The script manager.
        /// </value>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-11-28.</para>
        /// </remarks>
        public ScriptManager ScriptManager
        {
            get { return MasterScriptManager; }
        }
        #endregion

        #region Private/Protected Methods
        private void LogException(string action, Exception exc)
        {
            Application.LogError("Master Page: " + action, exc);
        }

        /// <summary>
        ///     Called when the page is initialized for the first time.
        /// </summary>
        private void InitalizePage()
        {
            ScriptManager.RegisterAsyncPostBackControl(this);
            RegisterPagePostBackScript();
            RegisterClearViewerScript();

            if (Context.User.Identity is WindowsIdentity)
            {
                AppendPageScript("if(window.disableLogoutButton){window.disableLogoutButton();}");
            }
            
            AppendPageScript(string.Format("window.culture={0};", Application.Language.ToJson()));
        }

        private void RegisterClearViewerScript()
        {
            try
            {
                ScriptManager.RegisterClientScriptBlock(this,
                                                        typeof(LowProfileMaster),
                                                        "HideViewerScript",
                                                        "function MasterPage_ClearViewer() { ZillionRis.ImageViewer().clearBeforeUnload(); }",
                                                        true);
            }
            catch (Exception ex)
            {
                LogException("RegisterClearViewerScript", ex);

                ScriptManager.RegisterClientScriptBlock(this,
                                                        typeof(LowProfileMaster),
                                                        "HideViewerScript",
                                                        "function MasterPage_ClearViewer() { console.log('Unable to hide the viewer due to an initialization error in the Zillion RIS.'); }",
                                                        true);
            }
        }

        /// <summary>
        /// When you change this value, you need to check also the help directory in:
        /// package.json and Core/BeforeBuildRIS.props
        /// </summary>
        private const string HelpDirectory = "~/Online Help";

        /// <summary>
        ///     Handles the Init event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="System.EventArgs" /> instance containing the event data.
        /// </param>
        protected void Page_Init(object sender, EventArgs e)
        {
            if (IsPostBack == false)
                InitalizePage();
            
            var helpDirectory = ResolveClientUrl(HelpDirectory);
            ScriptManager.RegisterClientScriptBlock(this, GetType(), "HelpFilePageScript", "window.HelpDirectory = '" + helpDirectory + "';", true);

#if DEBUG
            SiteStyle.FilePath = "~/Styles/Site.css";
#endif

            RegisterPagePostBackScript();
        }

        protected void RegisterPagePostBackScript()
        {
            ScriptManager.RegisterClientScriptBlock(this,
                                                    typeof (LowProfileMaster),
                                                    "MasterPagePostBack",
                                                    "function doMasterPagePostBack(arg) { __doPostBack('" + UniqueID + "', arg); }",
                                                    true);
        }

        private readonly StringBuilder _pageScript = new StringBuilder();

        public void AppendPageScript(string script)
        {
            var p = Page as IStartupScript;
            if (p!= null)
                p.AppendPageScript(script);
            else
                _pageScript.AppendFormat(script);
        }

        protected override void OnPreRender(System.EventArgs e)
        {
            if (_pageScript.Length > 0)
            {
                _pageScript.Insert(0, "$(function(){");
                _pageScript.Append("});");

                ScriptManager.RegisterStartupScript(this, GetType(), "MasterPageScript", _pageScript.ToString(), true);

                _pageScript.Clear();
            }

            base.OnPreRender(e);
        }
        #endregion
        
        #region Global Message Popup Implementation
        /// <summary>
        ///     Shows an error message popup to the user containing the specified message.
        /// </summary>
        /// <param name="message">The message.</param>
        void IPageGlobalMessagePopup.ShowErrorMessage(string message)
        {
            Popup.ShowErrorMessage(message);
        }

        /// <summary>
        ///     Shows an error message popup to the user containing the specified description and exception message.
        /// </summary>
        /// <param name="description">The description.</param>
        /// <param name="exception">The exception.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-08-23.</para>
        /// </remarks>
        void IPageGlobalMessagePopup.ShowErrorMessage(string description, Exception exception)
        {
            Popup.ShowErrorMessage(description, exception);
        }

        /// <summary>
        ///     Shows an informational message popup to the user containing the specified message.
        /// </summary>
        /// <param name="message">The message.</param>
        void IPageGlobalMessagePopup.ShowInfoMessage(string message)
        {
            Popup.ShowInfoMessage(message);
        }

        /// <summary>
        ///     Shows an informational message popup to the user containing the specified message.
        /// </summary>
        /// <param name="message">The message.</param>
        /// <param name="technicalDetails">The technical details.</param>
        void IPageGlobalMessagePopup.ShowInfoMessage(string message,
                                                     string technicalDetails)
        {
            Popup.ShowInfoMessage(message, technicalDetails);
        }

        event System.EventHandler IPageGlobalMessagePopup.Closed
        {
            add { Popup.PopupClosed += value; }
            remove { Popup.PopupClosed -= value; }
        }
        #endregion

        protected string RenderPart(string path, Dictionary<string, object> model = null)
        {
            return RazorCompilerFromFile.Instance.ExecuteTemplateFromFile(Server.MapPath(path), Application, model);            
        }

        protected void MasterScriptManager_OnAsyncPostBackError(object sender, AsyncPostBackErrorEventArgs e)
        {
            ZillionRisLog.Default.WriteError(string.Format("Exception occurred during an async postback to {0}.\r\nReferrer: {1}", Context.Request.Url, Context.Request.UrlReferrer), Application.GetSessionContext(), e.Exception);

            throw e.Exception;
        }
    }
}
