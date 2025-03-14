using System;
using Rogan.ZillionRis.Codes.CancellationReasonCategory;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class Imaging : PageBase
    {
        #region Properties
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageImaging; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.ImagingPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.ImagingPage; }
        }
        #endregion       

        #region ASP.NET Life Cycle
        protected void Page_Init(object sender, EventArgs e)
        {
            RegisterPagePostBackScript();
            RequireModules.Add(new Uri("module://patientmerge/requires/app"));
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));
            RequireModules.Add(new Uri("module://worklist/requires/single-item-worklist"));

            InitWindowVariables(new
            {
                pageConfig = new
                {
                    DNP = CancellationReasonCategory.DidNotPerform,
                    DNA = CancellationReasonCategory.DidNotAttend,
                    RefreshIntervalMs = RisAppSettings.ImagingPage_RefreshInterval * 60000,
                    WaitingTime = RisAppSettings.InDepartmentWaitingTime,
                    AutoShowRequestForm = RisAppSettings.Imaging_AutoShowRequestForm,
                    AutoSortUrgency = RisAppSettings.ImagingAllGridsAutoSortOnUrgency
                }
            });
        }
        #endregion      
    }
}