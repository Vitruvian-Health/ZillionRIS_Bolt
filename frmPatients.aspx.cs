using System;
using System.Collections;
using System.Collections.Generic;
using System.Data.Entity.Core;
using System.Globalization;
using System.Linq;
using System.Web.Caching;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using DelftDI.Common.RIS.Common;
using DelftDI.Common.RIS.Json;
using DelftDI.Common.RIS.Utilities;
using Rogan.ZillionRis;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Business.PatientSearch;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.Data;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.Extensibility.Data;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.UrnUtility;
using Rogan.ZillionRis.WebControls.Common;
using Rogan.ZillionRis.WebControls.Extensibility;
using Rogan.ZillionRis.Website.App_GlobalResources;
using ZillionRis.Common;
using ZillionRis.Controls;
using ZillionRis.Utilities;

namespace ZillionRis
{
    public class PatientsModel
    {
        public PatientsModel()
        {
            deBirthDate = null;
        }

        public string cmMaritalState { get; set; }
        public string cbGender { get; set; }
        public int cbCountry { get; set; }
        public int cbMob { get; set; }
        public int cbWards { get; set; }
        public int cbHistoryLocation { get; set; }
        public int cbGP { get; set; }
        public int cbObservation { get; set; }

        public string lblSSN { get; set; }
        public string lblLastName { get; set; }
        public string lblPrefix { get; set; }
        public string lblFirstName { get; set; }
        public string MiddleNameLabel { get; set; }
        public string lblPartnerName { get; set; }
        public string lblPartnerPrefix { get; set; }
        public string tbPhoneNumber { get; set; }
        public string tbStreetName { get; set; }
        public string tbMobileNumber { get; set; }
        public string tbStreetNumber { get; set; }
        public string tbPostalCode { get; set; }
        public string tbCity { get; set; }
        public string tbLocality { get; set; }
        public string tbState { get; set; }
        public string lblInitials { get; set; }
        public string tbEmailAddress { get; set; }

        public string txGPPhoneNumber { get; set; }
        public string txGPPDescription { get; set; }
        public string txGPPCode { get; set; }
        public string txGPPCCGCode { get; set; }
        public string txWLAddress { get; set; }
        public string txWLNumber { get; set; }
        public string txWLPostalCode { get; set; }
        public string txWLTelephoneNumber { get; set; }

        public string nok_LastName { get; set; }
        public string nok_Prefix { get; set; }
        public string nok_FirstName { get; set; }
        public string nok_MiddleName { get; set; }
        public string nok_PartnerName { get; set; }
        public string nok_PartnerPrefix { get; set; }
        public DateTime? nok_DateOfBirth { get; set; }
        public string nok_Gender { get; set; }
        public string nok_MaritialState { get; set; }
        public string nok_PhoneNumber { get; set; }
        public string nok_MobileNumber { get; set; }
        public string nok_StreetName { get; set; }
        public string nok_StreetNumber { get; set; }
        public string nok_PostalCode { get; set; }
        public string nok_Locality { get; set; }
        public string nok_City { get; set; }
        public string nok_State { get; set; }
        public int nok_Country { get; set; }

        public string txGP { get; set; }
        public WorkLocation WorkLocation { get; set; }

        public DateTime? deBirthDate { get; set; }
    }
    public partial class frmPatients : PageModelBase<PatientsModel>, IPostBackEventHandler
    {
        #region Constants
        private const string c_viewStateObservations = "lObservations";
        private const string c_viewStatePatientEditControllerKey = "PatientEditController";
        #endregion

        #region Fields
        private static readonly TimeSpan s_patientEditControllerCacheDuration = TimeSpan.FromMinutes(5);

        private static int numberOfPatientInsurances;
        private static int numberOfInsurancesToDisplay;
        private List<DropDownList> insuranceComboBox;
        private List<TextBox> insuranceTextBox;
        #endregion

        #region Properties
        /// <summary>
        /// Gets the page permission key.
        /// </summary>
        /// <value>The page permission key.</value>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-08-19.</para>
        /// </remarks>
        protected override string PagePermissionKey
        {
            get { return UserPermissions.PagePatientDetails; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.PatientDetailsPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.PatientDetailsPage; }
        }

        /// <summary>
        /// Gets or sets the patient edit controller.
        /// </summary>
        /// <value>The patient edit controller.</value>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        protected PatientEditController PatientEditController
        {
            get { return (PatientEditController)ViewState[c_viewStatePatientEditControllerKey]; }
            set { ViewState[c_viewStatePatientEditControllerKey] = value; }
        }

        protected string LastPatientNumber { get; set; }

        protected bool LocalInsuranceFound
        {
            get { return ViewState.GetValueOrDefault("InsuranceFound", false); }
            set { ViewState["InsuranceFound"] = value; }
        }

        protected bool IsExistingPatient
        {
            get { return ViewState.GetValueOrDefault("ExistingPatient", true); }
            set { ViewState["ExistingPatient"] = value; }
        }

        protected int PatientID
        {
            get { return Convert.ToInt32(Request.Params["PatientID"]); }
        }

        protected HashSet<int> SelectedObservations
        {
            get { return (HashSet<int>)ViewState[c_viewStateObservations]; }
            set { ViewState[c_viewStateObservations] = value; }
        }

        protected IEnumerable<Observation> SelectedObservationsSource
        {
            get { return PatientEditController.ObservationsSource.Where(o => SelectedObservations.Contains(o.obs_ObservationID)); }
        }

        protected IEnumerable<Observation> AvailableObservationsSource
        {
            get { return PatientEditController.ObservationsSource.Where(o => SelectedObservations.Contains(o.obs_ObservationID) == false); }
        }

        public bool GeneralPractitionerCanBeCHanged
        {
            get
            {
                return RisAppSettings.GeneralPractitionerCanBeCHanged;
            }
        }

        public bool NextOfKinTabVisible
        {
            get
            {
                return !RisAppSettings.HideNextOfKinTab;
            }
        }


        protected string PatientName
        {
            get
            {
                if (PatientID == 0)
                {
                    return String.Empty;
                }

                return SessionContext.DataContext.Patients.Where(p => p.per_PersonID == PatientID).Select(p => p.Person.per_DisplayName).FirstOrDefault(); 
            }
        }
        #endregion

        #region Patient Edit Controller - Event Handlers
        /// <summary>
        /// Handles the OnSaved event of the PatientEditController control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="Rogan.ZillionRis.Business.PatientEditController.PatientEventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        private void PatientEditController_OnSaved(object sender, PatientEditController.PatientEventArgs e)
        {
            // Update the local patient number.
            LastPatientNumber = e.Patient.pat_PatientNumber;

            // Get Observation data if that have been changed
            // First clear the currently assigned observations of the patient
            var observationsList = SelectedObservations;
            if (observationsList != null)
            {
                // Assign observation to patient
                using (var transaction = TransactionFactory.WriteScope())
                {
                    PatientSupport.RemoveObservations(SessionContext.DataContext, e.Patient);
                    PatientSupport.AssignObservations(SessionContext.DataContext, e.Patient, observationsList);

                    SessionContext.DataContext.SaveChanges();
                    transaction.Complete();
                }
            }

            var listeners = IocContainer.Instance.AllOf<IPatientUpdatedListener>();
            foreach (var listener in listeners)
            {
                var context = new PatientUpdatedContext();
                context.ExecutingUserID = CurrentUserID;
                context.Patient = e.Patient;
                listener.HandleChanged(context);
            }
        }

        /// <summary>
        /// Handles the OnSaving event of the PatientEditController control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="patientEventArgs">The <see cref="Rogan.ZillionRis.Business.PatientEditController.PatientEventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        private void PatientEditController_OnSaving(object sender, PatientEditController.PatientEventArgs patientEventArgs)
        {
            // Only if it can be modified.
            if (RisAppSettings.RISControlsPatientData)
            {
                //
                // Parse the user input and update the patient entity.
                SaveToPatientCore(patientEventArgs.Patient);

                //
                // Handle Insurance companies.
                SavePatientInsurances(SessionContext.DataContext, patientEventArgs.Patient);
            }
        }

        /// <summary>
        /// Handles the OnLoaded event of the PatientEditController control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="Rogan.ZillionRis.Business.PatientEditController.PatientEventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        private void PatientEditController_OnLoaded(object sender, PatientEditController.PatientEventArgs e)
        {
            LoadFromPatientCore(e.Patient);

            // Update the local patient number.
            LastPatientNumber = e.Patient.pat_PatientNumber;
        }
        #endregion

        #region Private/Protected Static Methods
        private static string GetPostBackControls(Page thePage)
        {
            //create a control variable and a string that retrieves the control which fired the postback
            var controlName = thePage.Request.Params.Get("__EVENTTARGET");

            //For each form variable
            foreach (string item in thePage.Request.Form)
            {
                if (item == null)
                    continue;

                if (item.Contains("btnAddInsuranceCompany"))
                {
                    //Return the control so it can be used in the Page_Init
                    controlName = item;
                    break;
                }
                if (item.Contains("btnRemoveInsuranceCompany"))
                {
                    //Return the control so it can be used in the Page_Init
                    controlName = item;
                    break;
                }
            }

            //Return the controlname so it can be used in the Page_Init
            return controlName;
        }
        #endregion

        #region Event Handlers
        /// <summary>
        /// Handles the Click event of the BtnAbort control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected void BtnAbort_Click(object sender, EventArgs e)
        {
            NavigateToPreviousUrl();
        }

        /// <summary>
        /// Handles the Click event of the btnAddObservation control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected void btnAddObservation_Click(object sender, EventArgs e)
        {
            AddSelectedObservation();
        }

        /// <summary>
        /// Handles the Click event of the btnRemoveObservation control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected void btnRemoveObservation_Click(object sender, EventArgs e)
        {
            RemoveSelectedObservations();
        }

        /// <summary>
        /// Handles the Click event of the BtnSavePatient control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected void BtnSavePatient_Click(object sender, EventArgs e)
        {
            if (DisplaySaveCurrentPatient())
            {
                if (IsExistingPatient)
                {
                    NavigateToPreviousUrl();
                }
                else
                {
                    NavigationHelper.SearchPatient(PatientSearchModes.PatientNumber, LastPatientNumber);
                }
                return;
            }

            // When validation fails:
            PatientEditContainer.Update();
        }
        #endregion

        #region Private/Protected Methods
        /// <summary>
        /// Gets or creates the patient edit controller's caching table.
        /// </summary>
        /// <returns>
        /// Returns a <see cref="Hashtable"/> that is used by <see cref="PatientEditController"/> as cache.
        /// </returns>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        private Hashtable GetPatientEditControllerCache()
        {
            const string globalCacheKey = "PatientEditControllerCache";

            // Create a new cache entry when it does not exist.
            var cache = (Hashtable)Cache[globalCacheKey];
            if (cache == null)
            {
                cache = new Hashtable();

                Cache.Add(globalCacheKey,
                               cache,
                               null,
                               DateTime.Now.Add(s_patientEditControllerCacheDuration),
                               Cache.NoSlidingExpiration,
                               CacheItemPriority.Normal,
                               null);
            }
            return cache;
        }

        /// <summary>
        /// Adds the selected observation in AvailableObservationsList to the patient.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected void AddSelectedObservation()
        {
            if (Model.cbObservation == -1)
                return;

            // Add the currently selected observation in AvailableObservationsList to the SelectedObservations.
            var item = AvailableObservationsSource.FirstOrDefault(x => x.obs_ObservationID == Model.cbObservation);
            if (item != null)
            {
                var listItem = new ListItem(item.obs_ObservationName, item.obs_ObservationID.ToString(CultureInfo.InvariantCulture));

                PatientObservationsList.Items.Add(listItem);
                SelectedObservations.Add(Model.cbObservation);
                Model.cbObservation = -1;
            }
        }

        /// <summary>
        ///     Removes the currently selected observations in the <see cref="PatientObservationsList" /> from the patient.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected void RemoveSelectedObservations()
        {
            for (var itemCount = 0; itemCount < PatientObservationsList.Items.Count; itemCount++)
            {
                if (PatientObservationsList.Items[itemCount].Selected)
                {
                    PatientObservationsList.Items[itemCount].Selected = false;
                    var itemID = Int32.Parse(PatientObservationsList.Items[itemCount].Value);
                    if (SelectedObservations.Contains(itemID))
                    {
                        SelectedObservations.Remove(itemID);
                    }
                    PatientObservationsList.Items.RemoveAt(itemCount--);
                }
            }
            Model.cbObservation = -1;
        }

        /// <summary>
        /// Loads the currently assigned patient (see <see cref="Rogan.ZillionRis.Business.PatientEditController.PatientID"/>) and displays an error message to the user when the operation fails.
        /// </summary>
        /// <returns>
        /// Returns <c>true</c> when succeeded; otherwise <c>false</c>.
        /// </returns>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected bool DisplayLoadPatient()
        {
            try
            {
                ResetUserInput();
                PatientEditController.LoadFromDatabase();
                return true;
            }
            catch (Exception ex)
            {
                LogException("DisplayLoadPatient", ex);
                GlobalPopup.ShowErrorMessage(string.Format(WebResources.PatientsPage_PatientLoadError, PatientEditController.PatientID, ex.Message), ex);
                return false;
            }
        }

        /// <summary>
        /// Saves the changes of current or new patient (see <see cref="Rogan.ZillionRis.Business.PatientEditController.PatientID"/>) and displays an error message to the user if the operation fails.
        /// </summary>
        /// <returns>
        /// Returns <c>true</c> when succeeded; otherwise <c>false</c>.
        /// </returns>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        protected bool DisplaySaveCurrentPatient()
        {
            try
            {
                try
                {
                    PatientEditController.SaveToDatabase();
                }
                catch (OptimisticConcurrencyException ex)
                {
                    LogException("DisplaySaveCurrentPatient", ex);
                    GlobalPopup.ShowErrorMessage(WebResources.PatientsPage_SavePatientConcurrencyError, ex);
                    DisplayLoadPatient();
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                // General exception.
                LogException("DisplaySaveCurrentPatient", ex);
                var patientNr = SessionContext.DataContext.Patients
                    .Where(item => item.per_PersonID == PatientEditController.PatientID)
                    .Select(item => item.pat_PatientNumber)
                    .FirstOrDefault();

                GlobalPopup.ShowErrorMessage(string.Format(WebResources.PatientsPage_PatientSaveError, patientNr), ex);
                return false;
            }
        }

        protected void ResetUserInput()
        {
            DummyPatientCheckVisible = false;

            // empty all fields..
            lblPatientID.Text = String.Empty;
            Model.deBirthDate = null;
            Model.tbStreetName = String.Empty;
            Model.lblSSN = String.Empty;
            Model.cbGender = null;
            Model.cbObservation = -1;
            Model.tbStreetNumber = String.Empty;
            Model.lblLastName = String.Empty;
            Model.cmMaritalState = string.Empty;
            Model.tbPostalCode = String.Empty;
            Model.lblPrefix = String.Empty;
            Model.tbPhoneNumber = String.Empty;
            Model.tbCity = String.Empty;
            Model.tbLocality= String.Empty;
            Model.lblFirstName = String.Empty;
            Model.tbMobileNumber = String.Empty;
            Model.tbState = String.Empty;
            Model.MiddleNameLabel = String.Empty;
            Model.cbCountry = -1;
            Model.cbHistoryLocation = -1;
            Model.lblInitials = String.Empty;
            Model.tbEmailAddress = String.Empty;

            Model.cbGP = -1;
            Model.txGPPDescription = "-";
            Model.txGPPCode = "-";
            Model.txGPPCCGCode = "-";

            Model.nok_LastName = String.Empty;
            Model.nok_Prefix = String.Empty;
            Model.nok_FirstName = String.Empty;
            Model.nok_MiddleName = String.Empty;
            Model.nok_PartnerName = String.Empty;
            Model.nok_PartnerPrefix = String.Empty;
            Model.nok_DateOfBirth = null;
            Model.nok_Gender = null;
            Model.nok_MaritialState = null;
            Model.nok_PhoneNumber = String.Empty;
            Model.nok_MobileNumber = String.Empty;
            Model.nok_StreetName = String.Empty;
            Model.nok_StreetNumber = String.Empty;
            Model.nok_PostalCode = String.Empty;
            Model.nok_Locality = String.Empty;
            Model.nok_City = String.Empty;
            Model.nok_State = String.Empty;
            Model.nok_Country = -1;

            Model.txGP = "-";
        }

        protected bool DummyPatientCheckVisible
        {
            get { return ViewState.GetValueOrDefault("DummyVisible", true); }
            set { ViewState["DummyVisible"] = value; }
        }

        private void CreateOneMoreInsuranceControl(int index)
        {
            //Create outer table
            var outerTable = new HtmlTable
            {
                Width = "67%"
            };
            var outerRow = new HtmlTableRow();
            var outerCell1 = new HtmlTableCell
            {
                Width = "50%"
            };
            var outerCell2 = new HtmlTableCell
            {
                Width = "50%"
            };

            //Create company name table
            var insuranceCompanyNameTable = new HtmlTable
            {
                Width = "90%"
            };
            var insuranceCompanyNameRow = new HtmlTableRow();
            var insuranceCompanyNameCell1 = new HtmlTableCell();
            var insuranceCompanyNameCell2 = new HtmlTableCell();

            //Create the label and combobox for insurance company information
            var companyLabel = new Label
            {
                Text = WebResources.ltInsuranceCompany,
                ID = "companyLabel" + index,
                CssClass = "left"
            };
            var companyComboBox = new DropDownList
            {
                ID = "companyComboBox" + index,
                Width = 180,
                AutoPostBack = true,
                DataValueField = "inscom_InsuranceCompanyID",
                DataTextField = "inscom_InsuranceCompanyName",
                Enabled = RisAppSettings.RISControlsPatientData
            };
            
            if (insuranceComboBox.Count() > index)
                insuranceComboBox[index] = companyComboBox;
            else
                insuranceComboBox.Add(companyComboBox);

            //Place all corresponding table objects in the right place
            insuranceCompanyNameCell1.Controls.Add(companyLabel);
            insuranceCompanyNameCell2.Controls.Add(companyComboBox);
            insuranceCompanyNameRow.Cells.Add(insuranceCompanyNameCell1);
            insuranceCompanyNameRow.Cells.Add(insuranceCompanyNameCell2);
            insuranceCompanyNameTable.Rows.Add(insuranceCompanyNameRow);

            //Create company number table
            var insuranceCompanyNumberTable = new HtmlTable
            {
                Width = "90%"
            };
            var insuranceCompanyNumberRow = new HtmlTableRow();
            var insuranceCompanyNumberCell1 = new HtmlTableCell();
            var insuranceCompanyNumberCell2 = new HtmlTableCell();

            //Create the label and textbox for insurance number
            var numberLabel = new Label
            {
                Text = WebResources.ltInsuranceNumber,
                ID = "numberLabel" + index,
                CssClass = "left"
            };
            var numberText = new TextBox
            {
                Width = 180,
                ID = "numberText" + index,
                Enabled = RisAppSettings.RISControlsPatientData,
                CssClass = "ui-input"
            };

            //Place all corresponding table objects in the right place
            insuranceCompanyNumberCell1.Controls.Add(numberLabel);
            insuranceCompanyNumberCell2.Controls.Add(numberText);
            insuranceCompanyNumberRow.Cells.Add(insuranceCompanyNumberCell1);
            insuranceCompanyNumberRow.Cells.Add(insuranceCompanyNumberCell2);
            insuranceCompanyNumberTable.Rows.Add(insuranceCompanyNumberRow);

            if (insuranceTextBox.Count() > index)
                insuranceTextBox[index] = numberText;
            else
                insuranceTextBox.Add(numberText);

            //Place every table item in the right place and place result in the placeholder
            outerCell1.Controls.Add(insuranceCompanyNameTable);
            outerCell2.Controls.Add(insuranceCompanyNumberTable);
            outerRow.Cells.Add(outerCell1);
            outerRow.Cells.Add(outerCell2);
            outerTable.Rows.Add(outerRow);

            phInsuranceCompany.Controls.Add(outerTable);
        }

        private void CreateInsuranceControls(int amount)
        {
            if (amount == 0)
                amount = 1;
            insuranceComboBox = new List<DropDownList>();
            insuranceTextBox = new List<TextBox>();
            //Function to create the right format with tables and to create the needed controls
            for (var i = 0; i < amount; i++)
            {
                CreateOneMoreInsuranceControl(i);
            }
        }
        #endregion

        #region ASP.NET Life Cycle.
        /// <summary>
        /// Raises the <see cref="E:System.Web.UI.Control.PreRender"/> event.
        /// </summary>
        /// <param name="e">An <see cref="T:System.EventArgs"/> object that contains the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-09-30.</para>
        /// </remarks>
        protected override void OnPreRender(EventArgs e)
        {
            // The controller's view state entry has to be marked dirty in order to serialize the contents.
            ViewState.SetItemDirty(c_viewStatePatientEditControllerKey, true);

            base.OnPreRender(e);
        }

        /// <summary>
        /// Handles the Init event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        protected void Page_Init(object sender, EventArgs e)
        {
            Master.ScriptManager.RegisterAsyncPostBackControl(btnAbort);
            Master.ScriptManager.RegisterAsyncPostBackControl(btnConfirm);
            HiddenPatientId.Value = PatientID.ToString(CultureInfo.InvariantCulture);

            RegisterPagePostBackScript();

            if (!Page.IsPostBack)
            {
                //retrieve the insurancecompanies of the currentpatient as those always need to be shown
                numberOfPatientInsurances = SessionContext.DataContext.PatientInsurances.Count(p => p.patins_PatientID == PatientID);
                numberOfInsurancesToDisplay = numberOfPatientInsurances > 0 ? numberOfPatientInsurances : 1;
                LocalInsuranceFound = numberOfPatientInsurances > 0;
            }

            // Retrieve the control that started a postback.
            var postbackControl = GetPostBackControls(Page);

            //If this page was posted back by a control
            if (postbackControl != null)
            {
                //If this page was posted back by the add or remove button
                if (postbackControl.Contains("btnAddInsuranceCompany"))
                {
                    numberOfInsurancesToDisplay++;
                }
                else
                {
                    if (postbackControl.Contains("btnRemoveInsuranceCompany"))
                    {
                        //If the page is posted back by the remove button and the amount of insurance companies
                        //is 1, dont allow the user to remove another insurance company.
                        if (numberOfInsurancesToDisplay > 1)
                            numberOfInsurancesToDisplay--;
                    }
                }
            }

            CreateInsuranceControls(numberOfInsurancesToDisplay);
        }

        /// <summary>
        /// Handles the Load event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs"/> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        protected void Page_Load(object sender, EventArgs e)
        {
            // Because the controller is saved in the view state,
            // we only use the controller starting from the Load event after the view state has been initialized.

            #region Setup the controller and load the initial data.
            // First time the page is loaded, initialize the controller.
            if (IsPostBack == false)
            {
                HiddenWithoutHIS.Value = RisAppSettings.RISControlsPatientData.ToJSBool();

                IsExistingPatient = PatientID != 0;

                PatientEditController = new PatientEditController();
                PatientEditController.PatientID = PatientID;

                SelectedObservations = new HashSet<int>();

                // Audit the patient history viewed
                if (Request.Params["PatientID"] != null)
                {
                    var auditor = SessionContext.Get<IAuditor>();
                    if (auditor == null)
                        throw new ApplicationException("Auditor controller not be found.");

                    var patient = SessionContext.DataContext.QueryPatient(PatientID);
                    var auditContext = new AuditContext { Patient = patient };
                    
                    auditor.LogView(RisAccessKey, auditContext, new { ReferralPage = Request.Params["ReferralPage"], Content = "PatientDetails" });
                }
            }
            
            // Setup the controller to be fully functional.
            PatientEditController.Cache = GetPatientEditControllerCache();
            PatientEditController.Database = SessionContext.DataContext;
            PatientEditController.SessionContext = SessionContext;
            PatientEditController.Loaded += PatientEditController_OnLoaded;
            PatientEditController.Saving += PatientEditController_OnSaving;
            PatientEditController.Saved += PatientEditController_OnSaved;

            DataBindChildren();

            // If this is the first time the page is loaded,
            // load the patient information using the controller.
            if (IsPostBack == false)
            {
                if (PatientEditController.PatientID != 0)
                    DisplayLoadPatient();
            }
            #endregion

            #region Initial Page Setup.
            if (Page.IsPostBack == false)
            {
                // Setup custom input settings.
                if (PatientEditController.PatientID == 0)
                {
                    // Setup default input values.
                    InitializeNewPatientData();
                }
            }
            #endregion

            #region Initialize Insurances.

            // Only allow to add/remove insurances if there is no HIS to manage patient data.
            btnAddInsuranceCompany.Visible = RisAppSettings.RISControlsPatientData;
            btnRemoveInsuranceCompany.Visible = RisAppSettings.RISControlsPatientData;

            if (PatientEditController.PatientID != 0)
            {
                //retrieve the insurancecompanies of the currentpatient as those always need to be shown
                if (numberOfPatientInsurances > numberOfInsurancesToDisplay)
                {
                    // at least 1 control was created in the init phase
                    for (int i = numberOfPatientInsurances == 0 ? 1 : numberOfInsurancesToDisplay; i < numberOfPatientInsurances; i++)
                    {
                        CreateOneMoreInsuranceControl(i);
                    }

                    numberOfInsurancesToDisplay = numberOfPatientInsurances;
                    LocalInsuranceFound = numberOfPatientInsurances > 0;
                }
            }

            // Get the index of insurance company
            foreach (DropDownList cb in insuranceComboBox)
            {
                //save the selected item before load the data because it will be removed after that. 
                var index = cb.SelectedIndex;
                cb.DataSource = PatientEditController.InsuranceCompaniesSource;
                cb.SelectedIndex = index;
                cb.DataBind();
            }

            //If the patient is not a dummy patient, disable the all insurance and general practitioner controls
            //rpInsuranceInfo.Enabled = cbDummyPatient.Checked;
            //rpClinical.Enabled = cbDummyPatient.Checked;

            // Load insurance values.
            if (LocalInsuranceFound)
            {
                var i = 0;
                var patientInsurance = SessionContext.DataContext.PatientInsurances
                    .Where(p => p.patins_PatientID == PatientEditController.PatientID)
                    .Select(item => new { item.patins_InsuranceCompanyID, item.patins_InsuranceNumber })
                    .ToList();

                foreach (var item in patientInsurance)
                {
                    for (var j = 0; j < insuranceComboBox[0].Items.Count; j++)
                    {
                        insuranceComboBox[i].SelectedIndex = j;
                        if (insuranceComboBox[i].SelectedValue == item.patins_InsuranceCompanyID.ToString(CultureInfo.InvariantCulture))
                        {
                            insuranceTextBox[i].Text = item.patins_InsuranceNumber;
                            i++;
                            break;
                        }
                    }
                }
                LocalInsuranceFound = false;
            }
            btnRemoveInsuranceCompany.Disabled = numberOfInsurancesToDisplay <= 1 || numberOfInsurancesToDisplay <= numberOfPatientInsurances;
            #endregion
        }

        private void InitializeNewPatientData()
        {
            Model.cbCountry = PatientEditController.GetDefaultCountryID();
            cbDummyPatient.Checked = PatientEditController.DefaultDummyStatus;
            btnPatientDocuments.Visible = false;
        }
        #endregion

        #region Patient Import and Export Core Methods.
        /// <summary>
        /// Loads the patient information to the specified <see cref="Patient"/> instance.
        /// </summary>
        /// <param name="patient">The patient.</param>
        /// <remarks>
        ///     <para>The core methods are pure information exchange methods and shouldn't contain for example a call to display an error message,
        /// however throwing an exception is preferred and is displayed to the user by the caller.</para>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        private void LoadFromPatientCore(Patient patient)
        {
            Precondition.ArgumentNotNull("patient", patient);

            // copy all fields from database to screen...
            cbDummyPatient.Checked = patient.IsDummyPatient();
            lblPatientID.Text = patient.pat_PatientNumber;
            Model.deBirthDate = patient.Person.per_DateOfBirth != null ? patient.Person.per_DateOfBirth.Value.LocalDateTime : (DateTime?)null;

            if (RisAppSettings.EnglishSocialSecurityNumber)
                Model.lblSSN = patient.Person.PersonExternalCodes.Where(ec=>ec.perextcod_Type== UrnNamespaces.NhsNumber).Select(ec=>ec.perextcod_Value).FirstOrDefault();
            else
                Model.lblSSN = patient.Person.PersonExternalCodes.Where(ec => ec.perextcod_Type == UrnNamespaces.BsnNumber).Select(ec => ec.perextcod_Value).FirstOrDefault();

            Model.lblLastName = patient.Person.per_LastName ?? string.Empty;
            Model.lblPartnerName = patient.Person.per_PartnerName ?? string.Empty;
            Model.lblPartnerPrefix = patient.Person.per_PartnerPrefix ?? string.Empty;
            Model.lblPrefix = patient.Person.per_Prefix ?? string.Empty;
            Model.lblFirstName = patient.Person.per_FirstName ?? string.Empty;
            Model.MiddleNameLabel = patient.Person.per_MiddleNames ?? string.Empty;
            Model.lblInitials = patient.Person.per_Initials ?? string.Empty;

            var address = patient.Person.PersonAddresses.Where(x=>x.peradd_Code == MagicConstants.AddressCode_Home).Select(x=>x.Address).FirstOrDefault();
            if (address != null)
            {
                Model.tbStreetName = address.add_StreetName ?? string.Empty;
                Model.tbStreetNumber = address.add_StreetNumber ?? string.Empty;
                Model.tbPostalCode = address.add_PostalCode ?? string.Empty;
                Model.tbCity = address.add_City ?? string.Empty;
                Model.tbLocality = address.add_Locality ?? string.Empty;
                Model.tbState = address.add_State ?? string.Empty;

                if (address.Country != null)
                    Model.cbCountry = address.Country.con_CountryID;
            }

            var contact = patient.Person.PersonContacts.Where(x => x.percon_Code == MagicConstants.ContactCode_Home).Select(x => x.Contact).FirstOrDefault();
            if (contact != null)
            {
                Model.tbPhoneNumber = contact.con_HomePhoneNumber ?? string.Empty;
                Model.tbMobileNumber = contact.con_MobileNumber ?? string.Empty;
                Model.tbEmailAddress = contact.con_EmailAddress ?? string.Empty;
            }

            if (patient.Person.Gender != null)
                Model.cbGender = patient.Person.Gender.gen_GenderID;
            else
                Model.cbGender = null;

            if (patient.Person.MaritalState != null)
            {
                Model.cmMaritalState = patient.Person.MaritalState.marsta_MaritalStateID;
            }

            if (patient.Mobility != null)
                Model.cbMob = patient.Mobility.mob_MobilityID;

            if (patient.Ward != null)
                Model.cbWards = patient.Ward.war_WardID;

            if (patient.HistoryLocation != null)
                Model.cbHistoryLocation = patient.HistoryLocation.hisloc_HistoryLocationID;

            // GP subobject, only if available...
            LoadFromGeneralPracticioner(patient.PatientsGeneralPractitionersWorkLocations.FirstOrDefault());

            // process any patient observations....
            if (patient.Observations != null)
            {
                foreach (var patobs in patient.Observations)
                {
                    PatientObservationsList.Items.Add(new ListItem(patobs.obs_ObservationName, patobs.obs_ObservationID.ToString(CultureInfo.InvariantCulture)));
                    SelectedObservations.Add(patobs.obs_ObservationID);
                }
            }
            
            if (patient.NextOfKin != null)
            {
                var nok = patient.NextOfKin;
                Model.nok_LastName = string.IsNullOrWhiteSpace(nok.per_LastName) ? string.Empty : nok.per_LastName;
                Model.nok_Prefix = string.IsNullOrWhiteSpace(nok.per_Prefix) ? string.Empty : nok.per_Prefix;
                Model.nok_FirstName = string.IsNullOrWhiteSpace(nok.per_FirstName) ? string.Empty : nok.per_FirstName;
                Model.nok_MiddleName = string.IsNullOrWhiteSpace(nok.per_MiddleNames) ? string.Empty : nok.per_MiddleNames;
                Model.nok_PartnerName = string.IsNullOrWhiteSpace(nok.per_PartnerName) ? string.Empty : nok.per_PartnerName;
                Model.nok_PartnerPrefix = string.IsNullOrWhiteSpace(nok.per_PartnerPrefix) ? string.Empty : nok.per_PartnerPrefix;
                Model.nok_DateOfBirth = nok.per_DateOfBirth.HasValue ? nok.per_DateOfBirth.Value.DateTime : DateTime.Today.AddYears(-25);

                if (nok.Gender != null)
                {
                    Model.nok_Gender = nok.Gender.gen_GenderID;
                }
                else
                    Model.nok_Gender = null;

                if (nok.MaritalState != null)
                {
                    Model.nok_MaritialState = nok.MaritalState.marsta_MaritalStateID;
                }

                var nokContact = nok.PersonContacts.Where(x => x.percon_Code == MagicConstants.ContactCode_Home).Select(x => x.Contact).FirstOrDefault();
                if (nokContact != null)
                {
                    Model.nok_PhoneNumber = string.IsNullOrWhiteSpace(nokContact.con_HomePhoneNumber) ? string.Empty : nokContact.con_HomePhoneNumber;
                    Model.nok_MobileNumber = string.IsNullOrWhiteSpace(nokContact.con_MobileNumber) ? string.Empty : nokContact.con_MobileNumber;
                }

                var nokAddress = nok.PersonAddresses.Where(x => x.peradd_Code == MagicConstants.AddressCode_Home).Select(x => x.Address).FirstOrDefault();
                if (nokAddress != null)
                {
                    Model.nok_StreetName = string.IsNullOrWhiteSpace(nokAddress.add_StreetName) ? string.Empty : nokAddress.add_StreetName;
                    Model.nok_StreetNumber = string.IsNullOrWhiteSpace(nokAddress.add_StreetNumber) ? string.Empty : nokAddress.add_StreetNumber;
                    Model.nok_PostalCode = string.IsNullOrWhiteSpace(nokAddress.add_PostalCode) ? string.Empty : nokAddress.add_PostalCode;
                    Model.nok_Locality = string.IsNullOrWhiteSpace(nokAddress.add_Locality) ? string.Empty : nokAddress.add_Locality;
                    Model.nok_City = string.IsNullOrWhiteSpace(nokAddress.add_City) ? string.Empty : nokAddress.add_City;
                    Model.nok_State = string.IsNullOrWhiteSpace(nokAddress.add_State) ? string.Empty : nokAddress.add_State;

                    if (nokAddress.Country != null)
                    {
                        Model.nok_Country = nokAddress.Country.con_CountryID;
                    } 
                }
            }

            ObservationsContainer.DataBind();
            ObservationsContainer.Update();

            AppendPageScript(string.Format("window.currentPatientNumber={0};", patient.pat_PatientNumber.ToJson()));
        }

        /// <summary>
        /// Loads the information from a general practicioner to the input controls.
        /// </summary>
        /// <param name="generalPractitionerPracticeLink">The general practicioner and practice.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        private void LoadFromGeneralPracticioner(PatientsGeneralPractitionersWorkLocation generalPractitionerPracticeLink)
        {
            if (generalPractitionerPracticeLink != null)
            {
                // Load the information from the general practicioner.
                var gp = generalPractitionerPracticeLink.GeneralPracticioner;

                var person = gp.Person;
                if (GeneralPractitionerCanBeCHanged)
                {
                    Model.cbGP = gp.phy_PhysicianID;
                }
                else
                {
                    Model.txGP = string.Format("[{0}] {1}", gp.phy_PhysicianCode, person.per_DisplayName);
                }

                var workLocation = generalPractitionerPracticeLink.WorkLocation;
                Model.WorkLocation = workLocation;
                Model.txGPPDescription = workLocation != null ? (workLocation.Practice.pra_Description ?? "-") : "-";
                Model.txGPPCode = workLocation != null ? (workLocation.Practice.pra_Code ?? "-") : "-";
                Model.txGPPCCGCode = workLocation != null ? (workLocation.Practice.pra_CCGCode ?? "-") : "-";

                var contact = person.PersonContacts.Where(x => x.percon_Code == MagicConstants.ContactCode_Home).Select(x => x.Contact).FirstOrDefault();
                if (contact != null)
                    Model.txGPPhoneNumber = contact.con_HomePhoneNumber ?? "-";
            }
            else
            {
                if (GeneralPractitionerCanBeCHanged)
                    Model.cbGP = 0;
                else
                    Model.txGP = "-";

                Model.txGPPDescription = "-";
                Model.txGPPCode = "-";
                Model.txGPPCCGCode = "-";
                Model.txGPPhoneNumber = "-";
            }

            GeneralPractitionerPracticeContainer.Update();
        }

        /// <summary>
        /// Saves the patient information to the specified <see cref="Patient"/> instance.
        /// </summary>
        /// <param name="patient">The patient.</param>
        /// <remarks>
        ///     <para>The core methods are pure information exchange methods and shouldn't contain for example a call to display an error message,
        /// however throwing an exception is preferred and is displayed to the user by the caller.</para>
        /// 	<para>Created by tdgroen on 2010-09-06.</para>
        /// </remarks>
        private void SaveToPatientCore(Patient patient)
        {
            #region Validate user input.
            // Social security number is notrequired field, but if it's present it has to be valid.
            if (!string.IsNullOrEmpty(Model.lblSSN))
            {
                if (!PatientValidation.IsValidSsnNumber(Model.lblSSN, RisAppSettings.EnglishSocialSecurityNumber))
                {
                    throw new InvalidOperationException(WebResources.PatientsPage_InvalidSsnNumber);
                }
            }
            #endregion

            if (cbDummyPatient.Checked)
                patient.pat_PatientNumber = PatientSupport.CreateDummyPatientNumber(patient.pat_PatientNumber);

            if (patient.Person == null)
                patient.Person = new Person();

            var person = patient.Person;
            person.per_DateOfBirth = Model.deBirthDate.HasValue ? Model.deBirthDate.Value : (DateTimeOffset?)null;
            person.per_FirstName = Model.lblFirstName;
            person.per_MiddleNames = Model.MiddleNameLabel;
            person.per_LastName = Model.lblLastName;
            person.per_PartnerName = Model.lblPartnerName;
            person.per_PartnerPrefix = Model.lblPartnerPrefix;
            person.per_Prefix = Model.lblPrefix;
            person.per_Initials = Model.lblInitials;
            person.UpdateDisplayName();

            UpdatePatientAddress(patient);
            UpdatePatientContactInfo(patient);

            patient.HistoryLocation = SessionContext.DataContext.HistoryLocations.FirstOrDefault(c => c.hisloc_HistoryLocationID == Model.cbHistoryLocation);
            person.MaritalState = SessionContext.DataContext.MaritalStates.FirstOrDefault(c => c.marsta_MaritalStateID == Model.cmMaritalState);
            person.Gender = SessionContext.DataContext.Genders.FirstOrDefault(gender => gender.gen_GenderID == Model.cbGender);
            patient.Mobility = SessionContext.DataContext.Mobilities.FirstOrDefault(c => c.mob_MobilityID == Model.cbMob);
            patient.Ward = SessionContext.DataContext.Wards.FirstOrDefault(c => c.war_WardID == Model.cbWards);

            // Save Next of Kin info
            bool oldPersonCanBeModified = false;
            Person nok = null;
            if (patient.NextOfKin != null)
            {
                nok = patient.NextOfKin;
                if (nok.Patient == null && nok.Physicians.Any() == false && nok.Users.Any() == false)
                    oldPersonCanBeModified = true;
            }

            if (nok != null && oldPersonCanBeModified)
            {
                FillNextOfKinPersonData(nok);
                SessionContext.DataContext.SaveChanges();
            }
            else
            {
                nok = new Person();
                FillNextOfKinPersonData(nok);

                SessionContext.DataContext.Persons.Add(nok);
                SessionContext.DataContext.SaveChanges();

                patient.NextOfKin = nok;
            }

            // TODO: allow to change the practice in the UI
            if (GeneralPractitionerCanBeCHanged)
            {
                var newGP = SessionContext.DataContext.Physicians.OfType<GeneralPracticioner>().FirstOrDefault(c => c.phy_PhysicianID == Model.cbGP);

                // Handle General Practicioners
                if (patient.PatientsGeneralPractitionersWorkLocations.Any())
                {
                    var oldGPPracticeLink = patient.PatientsGeneralPractitionersWorkLocations.First();

                    if (newGP == null)
                    {
                        patient.PatientsGeneralPractitionersWorkLocations.Clear();
                    }
                    else if (oldGPPracticeLink.GeneralPracticioner.phy_PhysicianID != newGP.phy_PhysicianID)
                    {
                        var newLink = GetTheNewGeneralPractitionerPracticeLink(oldGPPracticeLink, newGP);

                        patient.PatientsGeneralPractitionersWorkLocations.Clear();
                        patient.PatientsGeneralPractitionersWorkLocations.Add(newLink);
                    }
                    else
                    {
                        // TODO: change the practice if necessary
                    }
                }
            }

            SessionContext.DataContext.SaveChanges();

            if (!string.IsNullOrEmpty(Model.lblSSN))
            {
                try
                {
                    if (RisAppSettings.EnglishSocialSecurityNumber)
                    {
                        PersonExternalCodeController.Concerns.SetExternalCode(SessionContext.DataContext, person, Urn.Create(UrnNamespaces.NhsNumber, Model.lblSSN));
                    }
                    else
                    {
                        PersonExternalCodeController.Concerns.SetExternalCode(SessionContext.DataContext, person, Urn.Create(UrnNamespaces.BsnNumber, Model.lblSSN));
                    }
                }
                catch (Exception ex)
                {
                    throw new Exception("Error while storing patient external codes.", ex);
                }
            }
        }

        private void UpdatePatientContactInfo(Patient patient)
        {
            var existingContact = patient.Person.PersonContacts.FirstOrDefault(x => x.percon_Code == MagicConstants.AddressCode_Home);
            if (existingContact != null)
            {
                SessionContext.DataContext.RemovePersonConcact(existingContact);
            }

            var contact = new Contact();
            contact.con_HomePhoneNumber = Model.tbPhoneNumber;
            contact.con_MobileNumber = Model.tbMobileNumber;
            contact.con_EmailAddress = Model.tbEmailAddress;

            patient.Person.PersonContacts.Add(new PersonContact()
            {
                percon_Code = MagicConstants.ContactCode_Home,
                Contact = contact
            });
        }

        private void UpdatePatientAddress(Patient patient)
        {
            var existingAddress = patient.Person.PersonAddresses.FirstOrDefault(x => x.peradd_Code == MagicConstants.AddressCode_Home);
            if (existingAddress != null)
            {
                SessionContext.DataContext.RemovePersonAddress(existingAddress);
            }

            var address = new Address();
            address.add_City = Model.tbCity;
            address.add_Locality = Model.tbLocality;
            address.add_PostalCode = Model.tbPostalCode;
            address.add_State = Model.tbState;
            address.add_StreetName = Model.tbStreetName;
            address.add_StreetNumber = Model.tbStreetNumber;
            address.Country = SessionContext.DataContext.Countries.FirstOrDefault(c => c.con_CountryID == Model.cbCountry);
            address.UpdateDisplayName();

            patient.Person.PersonAddresses.Add(new PersonAddress
            {
                peradd_Code = MagicConstants.AddressCode_Home,
                Address = address
            });
        }
        private void FillNextOfKinPersonData(Person nok )
        {
            nok.per_LastName = Model.nok_LastName;
            nok.per_Prefix = Model.nok_Prefix;
            nok.per_FirstName = Model.nok_FirstName;
            nok.per_MiddleNames = Model.nok_MiddleName;
            nok.per_PartnerName = Model.nok_PartnerName;
            nok.per_PartnerPrefix = Model.nok_PartnerPrefix;
            nok.UpdateDisplayName();

            nok.per_DateOfBirth = Model.nok_DateOfBirth;
            nok.Gender = SessionContext.DataContext.Genders.FirstOrDefault(g => g.gen_GenderID == Model.nok_Gender);
            nok.MaritalState = SessionContext.DataContext.MaritalStates.FirstOrDefault( m => m.marsta_MaritalStateID == Model.nok_MaritialState);

            if (string.IsNullOrWhiteSpace(Model.nok_PhoneNumber) == false ||
                string.IsNullOrWhiteSpace(Model.nok_MobileNumber) == false)
            {
                var existingContact = nok.PersonContacts.FirstOrDefault(x => x.percon_Code == MagicConstants.AddressCode_Home);
                if (existingContact != null)
                {
                    SessionContext.DataContext.Contacts.Remove(existingContact.Contact);
                    SessionContext.DataContext.PersonContacts.Remove(existingContact);
                }

                var contact = new Contact();
                contact.con_HomePhoneNumber = Model.nok_PhoneNumber;
                contact.con_MobileNumber = Model.nok_MobileNumber;

                nok.PersonContacts.Add(new PersonContact()
                {
                    percon_Code = MagicConstants.ContactCode_Home,
                    Contact = contact
                });
            }

            if (string.IsNullOrWhiteSpace(Model.nok_StreetName) == false ||
                string.IsNullOrWhiteSpace(Model.nok_StreetNumber) == false ||
                string.IsNullOrWhiteSpace(Model.nok_PostalCode) == false ||
                string.IsNullOrWhiteSpace(Model.nok_Locality) == false ||
                string.IsNullOrWhiteSpace(Model.nok_City) == false ||
                string.IsNullOrWhiteSpace(Model.nok_State) == false ||
                Model.nok_Country != -1)
            {
                var existingAddress = nok.PersonAddresses.FirstOrDefault(x => x.peradd_Code == MagicConstants.AddressCode_Home);
                if (existingAddress != null)
                {
                    SessionContext.DataContext.Addresses.Remove(existingAddress.Address);
                    SessionContext.DataContext.PersonAddresses.Remove(existingAddress);
                }

                var address = new Address();
                address.add_StreetName = Model.nok_StreetName;
                address.add_StreetNumber = Model.nok_StreetNumber;
                address.add_PostalCode = Model.nok_PostalCode;
                address.add_Locality = Model.nok_Locality;
                address.add_City = Model.nok_City;
                address.add_State = Model.nok_State;
                address.Country = Model.nok_Country != -1 ? SessionContext.DataContext.Countries.FirstOrDefault(c => c.con_CountryID == Model.nok_Country) : null;
                address.UpdateDisplayName();

                nok.PersonAddresses.Add(new PersonAddress()
                    {
                        peradd_Code = MagicConstants.AddressCode_Home,
                        Address = address
                    });
            }
        }

        private void SavePatientInsurances(IZillionRIS_Entities dataContext, Patient patient)
        {
            // Delete old insurances.
            patient.PatientInsurances.Clear();
            dataContext.SaveChanges();

            // For every insurance on the page.
            for (var i = 0; i < numberOfInsurancesToDisplay; i++)
            {
                //if the selected index of a combox is higher than -1 meaning a value is selected and the textbox
                //is filled with data, add new insurances to database
                var insurancesInput = insuranceComboBox[i];
                if (insurancesInput.SelectedIndex > -1)
                {
                    var insuranceCompanyID = int.Parse(insurancesInput.SelectedValue);

                    //Insert new patient insurances
                    var pi = new PatientInsurance();
                    pi.InsuranceCompany = dataContext.InsuranceCompanies.FirstOrDefault(ins => ins.inscom_InsuranceCompanyID == insuranceCompanyID);
                    pi.patins_InsuranceNumber = insuranceTextBox[i].Text;

                    patient.PatientInsurances.Add(pi);
                    dataContext.SaveChanges();
                }
            }
        }
        #endregion

        #region IPostBackEventHandler Members
        void IPostBackEventHandler.RaisePostBackEvent(string eventArgument)
        {
            try
            {
                var i = eventArgument.IndexOf(';');
                string command;
                string argument;
                if (i > -1)
                {
                    command = eventArgument.Substring(0, i);
                    argument = eventArgument.Substring(i + 1);
                }
                else
                {
                    command = eventArgument;
                    argument = null;
                }

                ExecutePostBackCommand(command, argument);
            }
            catch (Exception ex)
            {
                GlobalPopup.ShowErrorMessage(WebResources.General_UnexpectedError, ex);
            }
        }

        /// <summary>
        ///  From the old Patient-GP-Practice link and the new General Pracittioner, get the new Patient-GP-Practice link
        ///  If there is a new Practice selected, use that, 
        ///  otherwise if it is possible, use the old practice.
        /// </summary>
        /// <param name="oldLink"></param>
        /// <param name="newGP"></param>
        /// <param name="newWorkLocation"></param>
        /// <returns></returns>
        private PatientsGeneralPractitionersWorkLocation GetTheNewGeneralPractitionerPracticeLink(PatientsGeneralPractitionersWorkLocation oldLink, GeneralPracticioner newGP, WorkLocation newWorkLocation = null)
        {
            if (newGP == null)
                return null;

            if (oldLink == null)
            {
                var newLink = new PatientsGeneralPractitionersWorkLocation();
                newLink.GeneralPracticioner = newGP;
                newLink.WorkLocation = newWorkLocation;
                return newLink;
            }

            if (oldLink.GeneralPracticioner.phy_PhysicianID != newGP.phy_PhysicianID)
            {
                var newLink = new PatientsGeneralPractitionersWorkLocation();
                newLink.GeneralPracticioner = newGP;
                if (newWorkLocation != null)
                {
                    newLink.WorkLocation = newWorkLocation;
                }
                else if (oldLink.WorkLocation != null &&
                    newGP.Practices.Any(item => item.pra_PracticeID == oldLink.WorkLocation.worloc_WorkLocationID))
                {
                    newLink.WorkLocation = oldLink.WorkLocation;
                }
                else
                {
                    // TODO: Filter on valid practices.
                    var firstWorklocation = newGP.Practices.SelectMany(x=>x.WorkLocations).FirstOrDefault();
                    if (firstWorklocation == null)
                        throw new Exception("The general practicioner does not have any practices.");

                    newLink.WorkLocation = firstWorklocation;
                }
                return newLink;
            }

            return oldLink;
        }


        private void ExecutePostBackCommand(string command,
                                            string argument)
        {
            switch (command)
            {
                case "patients.gp-changed":
                    int gpID = Convert.ToInt32( argument);

                    var patient = SessionContext.DataContext.Patients.FirstOrDefault(p => p.per_PersonID == PatientEditController.PatientID);
                    if(patient == null)
                        break;

                    var selectedGP = SessionContext.DataContext.Physicians.OfType<GeneralPracticioner>().FirstOrDefault(gp => gp.phy_PhysicianID == gpID);
                    if (selectedGP != null)
                    {
                        if (patient.PatientsGeneralPractitionersWorkLocations.Any())
                        {
                            var newLink = GetTheNewGeneralPractitionerPracticeLink(patient.PatientsGeneralPractitionersWorkLocations.First(), selectedGP);
                            LoadFromGeneralPracticioner(newLink);
                        }
                        else
                        {
                            var newLink = GetTheNewGeneralPractitionerPracticeLink( null, selectedGP);
                            LoadFromGeneralPracticioner(newLink);
                        }
                    }
                    else
                    {
                        LoadFromGeneralPracticioner(null);
                    }

                    break;
                default:
                    throw new NotSupportedException(String.Format(WebResources.General_RequestedCommandUnknown, command));
            }
        }
        #endregion        
    }
}
