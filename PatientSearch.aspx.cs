using System;

using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class PatientSearch : PageBase
    {
        protected override string PagePermissionKey
        {
            get { return UserPermissions.SearchPatient; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.PatientSearchPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.PatientSearchPage; }
        }

        protected void Page_Init(object sender, EventArgs e)
        {
            RequireModules.Add(new Uri("module://calendars/requires/app"));
            RequireModules.Add(new Uri("module://patientmerge/requires/app"));
            RequireModules.Add(new Uri("module://examination-discussion/requires/app"));
            RequireModules.Add(new Uri("module://audit-trail/requires/audit-trail"));
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));
            
            InitWindowVariables(new
            {
                pageConfig = new
                {
                    EditableAppointmentLetter = RisAppSettings.AppSetting_EditableAppointmentLetter,
                    CorrectAdministrationErrorsCommand = RisAppSettings.Command_CorrectAdministrationErrors && SessionContext.HasPermission(UserPermissions.EditBilling),
                    RisAppSettings.RISControlsPatientData,
                    PatientButtonsVisible = RisAppSettings.RISControlsPatientData && SessionContext.HasPermission(UserPermissions.AddPatient),
                    PatientLabelsAvailable = RisAppSettings.CrystalReports_PatientLabel,
                    CancelAddendumEnabled = SessionContext.HasPermission(UserPermissions.CancelAddendum),
                    CreateOrderEnabled = SessionContext.HasPermission(UserPermissions.CreateOrder),
                    ImportOrderEnabled = SessionContext.HasPermission(UserPermissions.ImportOrder),
                    RisAppSettings.AllowToHoldScheduledExams,
                    PermissionToChangeAssignments = SessionContext.HasPermission(UserPermissions.ChangeAssignments),
                    ChangeIntendedRadiologistEnabled = SessionContext.HasPermission(UserPermissions.ChangeIntendedRadiologist),
                    PermissionToViewAuditTrails = SessionContext.HasPermission(UserPermissions.PageAuditTrails),
                    PermissionToAutomaticSchedule = Application.UserHasPermission(UserPermissions.AutomaticScheduling),
                    PermissionToManualSchedule = Application.UserHasPermission(UserPermissions.ManualScheduling),
                    showPatientDetails = SessionContext.HasPermission(UserPermissions.PagePatientDetails),
                    showPatientHistoryPrintLabel = RisAppSettings.PatientOverviewPatientHistoryContextMenuShowPrintPatientLabel,
                    showPatientHistoryComplicationForm = RisAppSettings.PatientOverviewPatientHistoryContextMenuShowComplicationForm && SessionContext.HasPermission(UserPermissions.ComplicationForms),
                    showPatientHistoryChangeAssignments = RisAppSettings.PatientOverviewPatientHistoryContextMenuShowChangeAssignments,
                    showPatientHistoryViewQAForms = RisAppSettings.PatientOverviewPatientHistoryContextMenuShowViewQaForms,
                    showPatientHistoryGridColumnExternalOrderNumber = RisAppSettings.PatientOverviewPatientHistoryGridShowExternalOrderNumber,
                    showPatientHistoryGridColumnImported = RisAppSettings.PatientOverviewPatientHistoryGridShowImported
                }
            });
        }
    }
}
