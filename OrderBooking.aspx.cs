using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Configuration;
using Rogan.ZillionRis.WebControls.Extensibility;
using System;
using ZillionRis.Controls;

namespace ZillionRis
{
    public partial class OrderBooking : PageBase
    {
        #region Properties
        public override string RisAccessKey
        {
            get { return PageAccessKey.OrderBookingPage; }
        }

        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageOrderBooking; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.OrderBookingPage; }
        }

        public bool EnableAutomaticScheduling { get; set; }
        public bool EnableManualScheduling { get; set; }
        public bool EnablePatientDetailsPage { get; set; }

        #endregion

        #region ASP.NET Life Cycle
        protected void Page_Init(object sender,
                                 EventArgs e)
        {
            RequireModules.Add(new Uri("module://calendars/requires/app"));
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));
            RegisterRelativePathsScript();

            EnableAutomaticScheduling = SessionContext.HasPermission(UserPermissions.AutomaticScheduling);
            EnableManualScheduling = SessionContext.HasPermission(UserPermissions.ManualScheduling);
            EnablePatientDetailsPage = SessionContext.HasPermission(UserPermissions.PagePatientDetails);

            InitWindowVariables(new
            {
                pageConfig = new
                {
                    ExternalOrders_OpenEditOrderPage = RisAppSettings.ExternalOrders_OpenEditOrderPage,
                    EnableKioskIntegrationControls = SessionContext.IsFeatureEnabled(Features.KioskIntegration),
                }
            });
        }
        #endregion
    }
}
