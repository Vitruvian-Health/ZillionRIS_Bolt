using System;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using Rogan.ZillionRis.Website.App_GlobalResources;
using ZillionRis.Controls;

namespace ZillionRis
{
    public partial class AdvancedFilter : PageBase
    {
        #region Properties
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageAdvancedFilter; }
        }

        /// <summary>
        /// Gets the page access key.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-08.</para>
        /// </remarks>
        public override string RisAccessKey
        {
            get { return PageAccessKey.AdvancedFilterPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.AdvancedFilterPage; }
        }
        #endregion

        public override bool AllowCachedResponse
        {
            get { return true; }
        }

        #region ASP.Net Lifecycle
        /// <summary>
        /// 	Handles the Init event of the Page control.
        /// </summary>
        /// <param name = "sender">The source of the event.</param>
        /// <param name = "e">The <see cref = "System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2011-01-26.</para>
        /// </remarks>
        protected void Page_Init(object sender, EventArgs e)
        {
            RequireModules.Add(new Uri("module://calendars/requires/app"));
            RequireModules.Add(new Uri("module://examination-discussion/requires/app"));
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            InitWindowVariables(new
            {
                pageConfig = new
                {
                    PermissionToChangeLocation = Application.UserHasPermission(UserPermissions.LoginOnceToAllLocations),
                    PermissionToPrintReports = Application.UserHasPermission(UserPermissions.PrintReport),
                    PermissionToViewExaminations = Application.UserHasPermission(UserPermissions.ViewExaminations),
                    PermissionToAutomaticSchedule = Application.UserHasPermission(UserPermissions.AutomaticScheduling),
                    PermissionToManualSchedule = Application.UserHasPermission(UserPermissions.ManualScheduling)
                }
            });
            
            if (IsPostBack == false)
            {
                AppendPageScript("getSelectAllButtonTexts('" + WebResources.ltSelectAll + "', '" + WebResources.ltDeselectAll + "');");
            }
        }

        #endregion
    }
}