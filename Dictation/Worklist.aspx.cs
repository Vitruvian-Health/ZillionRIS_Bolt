using System;
using System.Collections.Generic;
using System.Linq;

using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Dictation.Models;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Web.Shared;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Common;
using ZillionRis.Controls;
using ZillionRis.Utilities;

namespace Rogan.ZillionRis.Website.Dictation
{
    public partial class Worklist : PageBase
    {
        #region Properties
        /// <summary>
        ///     Gets the page permission key which gets validated before the page gets initialized using
        ///     <see
        ///         cref="SecurityHelper.ValidatePageAccess" />
        ///     .
        /// </summary>
        /// <value> The page permission key (when the value is <c>null</c> it is assumed that no permission is required). </value>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-09-29.</para>
        /// </remarks>
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageDictationWorklist; }
        }

        /// <summary>
        ///     Gets the page access key.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-11-08.</para>
        /// </remarks>
        public override string RisAccessKey
        {
            get { return PageAccessKey.DicationWorklistPage; }
        }

        /// <summary>
        ///     Gets the user manual entry point
        /// </summary>
        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.DicationWorklistPage; }
        }

        /// <summary>
        ///     Gets the settings to set interactive as default
        /// </summary>
        /// <value>The dictation setting (when the value is <c>true</c> it is interactive, otherwise it is batch).</value>
        protected bool InteractiveAsDefault
        {
            get { return RisGlobalCache.RisConfiguration.riscon_InteractiveDictationMode; }
        }

        protected string WorkListPreference
        {
            get
            {
                var currentWorklistParam = this.Request.Params["currentworklist"];

                if (string.IsNullOrEmpty(currentWorklistParam) == false)
                    return currentWorklistParam;

                return RisAppSettings.DictationPage_WorklistByDefault;
            }
        }
        #endregion

        #region ASP.NET Life Cycle
        public override bool AllowCachedResponse
        {
            get { return true; }
        }

        public bool HasSupervisionModule { get; set; }
        public bool ShowLocationFilter { get; set; }

        /// <summary>
        ///     Handles the Init event of the Page control.
        /// </summary>
        /// <param name="sender"> The source of the event. </param>
        /// <param name="e"> The <see cref="System.EventArgs" /> instance containing the event data. </param>
        /// <remarks>
        ///     <para></para>
        ///     <para>Created by TdGroen at 3/28/2011 12:01 PM.</para>
        /// </remarks>
        protected void Page_Init(object sender, EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://dictation/requires/app"));
            this.RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            this.HasSupervisionModule = RisApplication.ModuleManager.Modules.Any(moduleE => moduleE.ModuleUri == new Uri("module://supervision/"));
            this.ShowLocationFilter = RisAppSettings.DictationWorklistShowLocationFilter;
            this.InitWindowVariables(new
            {
                pageConfig = new
                {
                    RisAppSettings.DefaultDictationType,
                    enableGeneralWorklist = RisAppSettings.AppSetting_EnableGeneralWorklist,
                    showExternalUsersWorkList = RisAppSettings.DictationWorklistWorklistTypeShowAllExternalUsers,
                    enableSupervision = HasSupervisionModule,
                    showDigitalDictation = RisAppSettings.DictationWorklistDictationOptionsShowDigital && SessionContext.HasPermission(UserPermissions.DictationWorklistDigitalDictationButton),
                    worklists = this.GetDictationWorklists(),
                    //column header visibility
                    showGridPatientCategoryColumn = RisAppSettings.DictationWorklistDictationGridShowPatientCategoryColumn,
                    showGridPatientDelayedColumn = RisAppSettings.DictationWorklistDictationGridShowPatientDelayedColumn,
                    showGridRequestTypeColumn = RisAppSettings.DictationWorklistDictationGridShowRequestTypeColumn,
                    showGridRequestingLocationColumn = RisAppSettings.DictationWorklistDictationGridShowRequestingLocationColumn
                },
                currentWorklist = this.WorkListPreference,
            });

            this.Master.ScriptManager.RegisterAsyncPostBackControl(this);
            this.RegisterPagePostBackScript();
        }
        
        protected List<DictationWorklistDefinition> GetDictationWorklists()
        {
            var dictationStartingModel = new DictationWorklistPlugin();
            
            var intent = new Intent
            {
                Action = "dictation.worklist",
                Data = dictationStartingModel
            };
            this.Application.BroadcastIntent(intent);

            return dictationStartingModel.Worklists;
        }
        #endregion
    }
}