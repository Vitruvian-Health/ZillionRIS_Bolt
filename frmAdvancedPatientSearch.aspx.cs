using System;

using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Controls;

namespace ZillionRis
{
    public partial class AdvancedPatientSearch : PageBase
    {
        #region Properties
        protected override string PagePermissionKey
        {
            get { return UserPermissions.SearchPatient; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.AdvancedPatientSearchPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.AdvancedPatientSearchPage; }
        }
        #endregion

        #region Private/Protected Methods
        /// <summary>
        ///     Handles the Init event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2011-01-26.</para>
        /// </remarks>
        protected void Page_Init(object sender, EventArgs e)
        {
            RequireModules.Add(new Uri("module://calendars/requires/app"));
            RequireModules.Add(new Uri("module://patientmerge/requires/app"));
            RequireModules.Add(new Uri("module://examination-discussion/requires/app"));
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            var editableAppointmentLetter = RisAppSettings.AppSetting_EditableAppointmentLetter;

            InitWindowVariables(new
            {
                pageConfig = new
                {
                    EditableAppointmentLetter = editableAppointmentLetter,
                    CorrectAdministrationErrorsCommand = RisAppSettings.Command_CorrectAdministrationErrors && SessionContext.HasPermission(UserPermissions.EditBilling),
                    RisAppSettings.RISControlsPatientData,
                    PatientLabelsAvailable = RisAppSettings.CrystalReports_PatientLabel,
                    CreateOrderEnabled = SessionContext.HasPermission(UserPermissions.CreateOrder),
                    ImportOrderEnabled = SessionContext.HasPermission(UserPermissions.ImportOrder),
                    PermissionToAutomaticSchedule = Application.UserHasPermission(UserPermissions.AutomaticScheduling),
                    PermissionToManualSchedule = Application.UserHasPermission(UserPermissions.ManualScheduling),
                    RisAppSettings.AllowToHoldScheduledExams,
                    PermissionToChangeAssignments = SessionContext.HasPermission(UserPermissions.ChangeAssignments),
                    ChangeIntendedRadiologistEnabled = SessionContext.HasPermission(UserPermissions.ChangeIntendedRadiologist),
                    HasComplicationFormPermission = SessionContext.HasPermission(UserPermissions.ComplicationForms),
                    showPatientDetails = SessionContext.HasPermission(UserPermissions.PagePatientDetails)
                }
            });

            Master.ScriptManager.RegisterAsyncPostBackControl(this);
            RegisterRelativePathsScript();
        }

        #endregion
    }
}
