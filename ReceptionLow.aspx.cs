using System;
using Rogan.ZillionRis.Codes.CancellationReasonCategory;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;
using ZillionRis.Controls;

namespace ZillionRis
{
    public class ReceptionLow : PageBase
    {
        #region Properties
        /// <summary>
        /// Cached responses allowed for the reception page.
        /// </summary>
        /// <value>
        ///   <c>true</c>.
        /// </value>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2012-03-07.</para>
        /// </remarks>
        public override bool AllowCachedResponse
        {
            get { return true; }
        }

        /// <summary>
        /// 	Gets the page permission key which gets validated before the page gets initialized using <see
        ///  	cref = "SecurityHelper.ValidatePageAccess" />.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-11-18.</para>
        /// </remarks>
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageReception; }
        }

        /// <summary>
        /// 	Gets the page access key.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-08.</para>
        /// </remarks>
        public override string RisAccessKey
        {
            get { return PageAccessKey.ReceptionPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.ReceptionPage; }
        }
        #endregion

        #region ASP.NET Life Cycle
        protected void Page_Load(object sender,
                                    EventArgs e)
        {
            this.RegisterPagePostBackScript();
        }

        
        protected void Page_Init(object sender, EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://patientmerge/requires/app"));
            this.RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));
            this.InitWindowVariables(new
            {
                pageConfig = new
                {
                    DNA = CancellationReasonCategory.DidNotAttend,
                    DNALettersAvailable = RisAppSettings.CrystalReports_DNALetters,
                    PatientLabelsAvailable = RisAppSettings.CrystalReports_PatientLabel,
                    ExternalOrders_OpenEditOrderPage = RisAppSettings.ExternalOrders_OpenEditOrderPage,
                    ReceptionWaitingTime = RisAppSettings.ReceptionWaitingTime
                }
            });
        }

        protected override void OnInit(EventArgs e)
        {
            base.OnInit(e);            

            this.Master.ScriptManager.RegisterAsyncPostBackControl(this);
        }
        #endregion
    }
}
