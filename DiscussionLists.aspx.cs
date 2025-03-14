using System;
using System.Text;
using System.Web.UI;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Controls;

namespace ZillionRis
{
    public partial class DiscussionLists : PageBase
    {
        private StringBuilder _scripting = new StringBuilder();

        #region Properties
        /// <summary>
        /// Gets the page permission key which gets validated before the page gets initialized using <see cref="SecurityHelper.ValidatePageAccess"/>.
        /// </summary>
        /// <value>
        /// The page permission key (when the value is <c>null</c> it is assumed that no permission is required).
        /// </value>
        /// <remarks>
        /// 	<para>Created by TdGroen at 2011-04-05.</para>
        /// </remarks>
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageDiscussion; }
        }

        /// <summary>
        /// Gets the page access key.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-08.</para>
        /// </remarks>
        public override string RisAccessKey
        {
            get { return PageAccessKey.DiscussionPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.DiscussionPage; }
        }
        #endregion

        #region ASP.NET Life Cycle
        /// <summary>
        /// 	Page init. Fills the tabs of the tabcontrol.
        /// </summary>
        /// <param name = "sender"></param>
        /// <param name = "e"></param>
        protected void Page_Init(object sender, EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://examination-discussion/requires/app"));
            this.RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            var scriptManager = this.Master.ScriptManager;
            scriptManager.RegisterAsyncPostBackControl(this);

            this.RegisterPagePostBackScript();
        }

        protected override void OnPreRender(EventArgs e)
        {
            if (_scripting.Length > 0)
            {
                _scripting.Insert(0, "$(function() {");
                _scripting.Append("});");

                ScriptManager.RegisterStartupScript(this, typeof(AdvancedFilter), "Scripting", _scripting.ToString(), true);

                _scripting.Clear();
            }
            base.OnPreRender(e);
        }

        #endregion
    }
}
