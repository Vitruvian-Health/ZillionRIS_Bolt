using System;
using System.Collections;
using System.Collections.Generic;
using System.Data.Entity.Core;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Web.Caching;
using System.Web.UI;
using DelftDI.Common.RIS.Common;
using DelftDI.Common.RIS.Diagnostics;
using DelftDI.Common.RIS.Json;
using DelftDI.Common.RIS.Utilities;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Business.Communication;
using Rogan.ZillionRis.Calendars.Models;
using Rogan.ZillionRis.Codes.CancellationReasonCategory;
using Rogan.ZillionRis.Codes.ExaminationStatus;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Session;
using Rogan.ZillionRis.UrnUtility;
using Rogan.ZillionRis.ViewModels;
using Rogan.ZillionRis.Web.Data;
using Rogan.ZillionRis.WebControls.Common;
using Rogan.ZillionRis.WebControls.Editors;
using Rogan.ZillionRis.WebControls.Extensibility;
using Rogan.ZillionRis.Website.App_GlobalResources;
using Rogan.ZillionRis.Workflow.Tasks;
using ZillionRis;
using ZillionRis.Code.Common;
using ZillionRis.Common;
using ZillionRis.Controls;
using ZillionRis.Security;

namespace Rogan.ZillionRis.Website
{
    public partial class EditOrder : PageModelBase<EditOrderModel>, IPostBackEventHandler
    {
        #region Page Post Back Handler
        public const string ScanDone_SaveOrderCommand = "scandone:save";
        public const string ScanDone_ScanButtonCommand = "scandone:scan";
        public const string CancellingDone_Command = "canceldone";
        public const string StatusChange_SuccessCommand = "statuschange:success";
        public const string ChangeExamination_CancelledCommand = "changeexamination:cancelled";

        /// <summary>
        ///     Gets or sets a value indicating whether a scan had been finished.
        /// </summary>
        /// <value>
        ///     <c>true</c> if a scan had been finished; otherwise, <c>false</c>.
        /// </value>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-09-28.</para>
        /// </remarks>
        public bool IsScanFinished { get; set; }

        /// <summary>
        ///     When implemented by a class, enables a server control to process an event raised when a form is posted to the
        ///     server.
        /// </summary>
        /// <param name="eventArgument">
        ///     A <see cref="T:System.String" /> that represents an optional event argument to be passed to
        ///     the event handler.
        /// </param>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-09-28.</para>
        /// </remarks>
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

        private void ExecutePostBackCommand(string command, string argument)
        {
            switch (command)
            {
                case ScanDone_SaveOrderCommand:
                    IsScanFinished = true;
                    DisplaySaveOrder();
                    break;

                case ScanDone_ScanButtonCommand:
                    OrderController.RefreshRowVersion();
                    break;

                case CancellingDone_Command:
                    DisplaySaveOrder();
                    break;

                case StatusChange_SuccessCommand:
                    NavigateToPreviousUrl();
                    break;

                case ChangeExamination_CancelledCommand:
                    RollBackExaminations();
                    break;

                case "FinishCancellation":
                    var examinationId = Convert.ToInt32(argument, CultureInfo.InvariantCulture);
                    var examination = ExaminationController.ViewModels.FirstOrDefault(x => x.ExaminationID == examinationId);
                    if (examination != null)
                        examination.ExaminationStatusID = ExaminationStatusValue.Cancelled;
                    break;

                 default:
                    throw new ApplicationException(String.Format(WebResources.General_RequestedCommandUnknown, command));
            }
        }

        private void RollBackExaminations()
        {
            var userID = SessionContext.User.UserID;
            var notificationList = new OrderMessageNotificationList(SessionContext);
            notificationList.UserID = userID;

            foreach (var examBefore in ExaminationsBefore)
            {
                var newExamData = ExaminationController.ViewModels.FirstOrDefault(e => e.ExaminationID == examBefore.ExaminationID);
                if (newExamData != null && newExamData.ExaminationTypeID != examBefore.ExaminationTypeID)
                {
                    newExamData.ExaminationTypeID = examBefore.ExaminationTypeID;
                    newExamData.LateralityID = examBefore.LateralityID;
                }
            }

            try
            {
                ExaminationController.OrderID = OrderController.OrderID;
                ExaminationController.OrderMessageNotifier = notificationList;
                ExaminationController.SaveToOrder(userID);
            }
            catch (Exception ex)
            {
                LogException("RollBackExaminationTypeChanges - Save Examinations", ex);
                GlobalPopup.ShowErrorMessage(WebResources.EditOrder_SaveExaminationsFailed, ex);
            }
            finally
            {
                notificationList.TrySend();
            }
        }
        #endregion

        #region Application Settings
        private static bool ScanningRequestFormsDuringCreation
        {
            get { return string.Equals(RisGlobalCache.RisConfiguration.riscon_ScanRequestFormStatus, @"waiting", StringComparison.InvariantCultureIgnoreCase); }
        }
        #endregion

        #region Properties
        public bool IsImportedOrder
        {
            get
            {
                var result = false;
                var conversionsuccess = bool.TryParse(Request.Params["IsImportedOrder"], out result);
                if (conversionsuccess)
                    return result;
                return false;
            }
        }

        public bool FromBookingPage
        {
            get
            {
                var result = false;
                var conversionsuccess = bool.TryParse(Request.Params["FromBookingPage"], out result);
                if (conversionsuccess)
                    return result;
                return false;
            }
        }

        protected bool CancelOnlyNavigatesBack
        {
            get
            {
                var isExistingOrder = OrderController.OrderID != 0;
                var isCreatingOrder = Behavior == EditOrderBehavior.CreateOrder ||
                                      Behavior == EditOrderBehavior.CreateOrderManuallyPlannned;

                return isCreatingOrder == false || isExistingOrder == false;
            }
        }

        protected bool AllowOverrideBillingRules
        {
            get
            {
                var billingHandlers = SessionContext.Modules.AllOf<IBillingHandlerInfo>();
                return billingHandlers.Any(x => x.AllowOverrideBillingRules);
            }
        }

        /// <summary>
        ///     Gets or sets the behavior of the order editing page.
        /// </summary>
        /// <value>The behavior.</value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        protected EditOrderBehavior Behavior
        {
            get { return ViewState.GetValueOrDefault("Behavior", EditOrderBehavior.CreateOrder); }
            set { ViewState["Behavior"] = value; }
        }

        /// <summary>
        ///     Gets or sets the examination controller.
        /// </summary>
        /// <value>The examination controller.</value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-27.</para>
        /// </remarks>
        public ExaminationEditController ExaminationController
        {
            get { return (ExaminationEditController) ViewState["ExaminationEditor"]; }
            set { ViewState["ExaminationEditor"] = value; }
        }

        /// <summary>
        ///     Gets or sets a value indicating whether the examination editor needs to be focused when the page is presented to
        ///     the user.
        /// </summary>
        /// <value>
        ///     <c>true</c> if the examination editor should be focused; otherwise, <c>false</c>.
        /// </value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-12-20.</para>
        /// </remarks>
        public bool FocusExaminationEditor { get; set; }
        public bool EnableAutomaticScheduling { get; set; }
        public bool EnableManualScheduling { get; set; }

        public bool HasRegisteredClientScan
        {
            get { return ViewState.GetValueOrDefault("HasRegisteredClientScan", false); }
            set { ViewState["HasRegisteredClientScan"] = value; }
        }

        public ReadOnlyLevel ReadOnlyBehaviour
        {
            get { return ViewState.GetValueOrDefault("ReadOnlyBehaviour", ReadOnlyLevel.None); }
            set { ViewState["ReadOnlyBehaviour"] = value; }
        }

        #region Manual Scheduling Informations
        /// <summary>
        ///     Gets or sets the appointments information using the Exchange.
        /// </summary>
        /// <value>The appointments information.</value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-08-17.</para>
        /// </remarks>
        protected AppointmentBookingTaskData ManualBookingData
        {
            get
            {
                var m = Request.Params["m"];
                if (m != null)
                {
                    var p = new ProcessRepository();
                    var task = p.GetTaskData(new TaskInfo {UniqueID = m}, false);
                    var deserializeJsonData = task.DeserializeJsonData<AppointmentBookingTaskData>();
                    if (deserializeJsonData == null)
                        return null;

                    return deserializeJsonData;
                }

                return null;
            }
        }

        protected List<ManualScheduleInfoData> ManualScheduleInformation
        {
            get
            {
                if (ManualBookingData != null)
                {
                    var list = new List<ManualScheduleInfoData>();
                    foreach (AppointmentInformation appointmentInformation in ManualBookingData.Appointments.OrderBy(x => x.StartDateTime))
                    {
                        var room = SessionContext.DataContext.Rooms.FirstOrDefault(item => item.roo_RoomID == appointmentInformation.RoomID);
                        if (room != null)
                        {
                            list.Add(new ManualScheduleInfoData
                            {
                                RoomText = String.Format("[{0}] {1}", room.roo_RoomName, room.roo_RoomDescription),
                                ScheduleTimeText = appointmentInformation.StartDateTime.LocalDateTime.ToString("f")
                            });
                        }
                    }
                    return list;
                }
                return null;
            }
        }
        #endregion

        #region Cancellation Reason Data
        private string _cancellationReasonTaskID
        {
            get { return (string) ViewState["CancellationReasonTaskID"]; }
            set { ViewState["CancellationReasonTaskID"] = value; }
        }

        protected string CancellationReasonTaskID
        {
            get
            {
                if (String.IsNullOrWhiteSpace(_cancellationReasonTaskID))
                {
                    // Create a task for it.
                    var prep = new ProcessRepository();
                    var proc = prep.CreateProcess();
                    var task = prep.CreateTask(proc);
                    _cancellationReasonTaskID = task.UniqueID;
                    return _cancellationReasonTaskID;
                }
                else
                {
                    return _cancellationReasonTaskID;
                }
            }
        }
        #endregion

        /// <summary>
        ///     Gets or sets the order controller.
        /// </summary>
        /// <value>The order controller.</value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-27.</para>
        /// </remarks>
        public OrderEditController OrderController
        {
            get { return (OrderEditController) ViewState["OrderEditor"]; }
            set { ViewState["OrderEditor"] = value; }
        }

        /// <summary>
        ///     Gets the page permission key which gets validated before the page gets initialized using
        ///     <see cref="SecurityHelper.ValidatePageAccess" />.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        protected override string PagePermissionKey
        {
            get { return null; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.EditOrderPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.EditOrderPage; }
        }

        protected string CreationDate { get; set; }

        public ExaminationViewModelCollection ExaminationsBefore
        {
            get { return ViewState["ExaminationsBefore"] as ExaminationViewModelCollection; }
            set { ViewState["ExaminationsBefore"] = value; }
        }

        /// <summary>
        ///     Gets or sets the selected booking action.
        /// </summary>
        /// <value>The selected booking action.</value>
        /// <remarks>
        ///     <para>Created by bvarga on 2015-03-27.</para>
        /// </remarks>
        private BookingAction SelectedBookingAction
        {
            get { return ViewState.GetValueOrDefault("SelectedBookingAction", BookingAction.None); }
            set { ViewState["SelectedBookingAction"] = value; }
        }

        protected bool ShowFirstPossibilities
        {
            get { return RisAppSettings.EditOrder_ShowFirstPossibilities && Behavior == EditOrderBehavior.CreateOrder; }
        }

        protected bool ShowManualBookingData
        {
            get { return Behavior == EditOrderBehavior.CreateOrderManuallyPlannned && ManualBookingData != null; }
        }

        protected bool ClinicalInformationOnExaminationLevel
        {
            get { return RisAppSettings.ClinicalInformationOnExaminationLevel; }
        }
        #endregion

        #region Event Handlers
        /// <summary>
        ///     Handles the OnClick event of the BookDirectButton control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        protected void BookDirectButton_OnClick(object sender, EventArgs e)
        {
            if (ReadOnlyBehaviour != ReadOnlyLevel.Full)
            {
                Validate();
                if (IsValid)
                {
                    SelectedBookingAction = BookingAction.BookDirect;
                    DisplaySaveOrder();
                }
            }
        }

        /// <summary>
        ///     Handles the OnClick event of the BookManualButton control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        protected void BookManualButton_OnClick(object sender, EventArgs e)
        {
            if (ReadOnlyBehaviour != ReadOnlyLevel.Full)
            {
                Validate();
                if (IsValid)
                {
                    SelectedBookingAction = BookingAction.BookManually;
                    DisplaySaveOrder();
                }
            }
        }

        /// <summary>
        ///     Handles the OnClick event of the BookOrderNowButton control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-05-05.</para>
        /// </remarks>
        protected void BookOrderNowButton_OnClick(object sender, EventArgs e)
        {
            if (ReadOnlyBehaviour != ReadOnlyLevel.Full)
            {
                try
                {
                    SelectedBookingAction = BookingAction.BookNow;

                    var result = CheckBookNowPreConditions();
                    if (result.DoNotContinue == false)
                    {
                        DisplaySaveOrder();
                    }
                }
                catch (Exception ex)
                {
                    LogException("BookOrderNowButton", ex);
                    GlobalPopup.ShowErrorMessage(WebResources.EditOrder_ScheduleNow_UnexpectedError, ex);
                }
            }
        }

        /// <summary>
        ///     Handles the OnClick event of the CancelButton control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        protected void CancelButton_OnClick(object sender, EventArgs e)
        {
            if (CancelOnlyNavigatesBack)
            {
                // Either viewing or the order does not exist in the database yet.
                NavigateToPreviousUrl();
            }
            else
            {
                // Order exists in the database and the user is trying cancel a new order.
                // Set the status to cancelled and let the save order handle the rest.
                var examinatinsToCancel = ExaminationController.ViewModels.Where(x => x.ExaminationTypeID != 0 &&
                                                                                           x.ExaminationStatusID != ExaminationStatusValue.Cancelled)
                    .ToArray();
                foreach (var viewModel in examinatinsToCancel)
                {
                    viewModel.ExaminationStatus = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Cancelled);
                }
                ExaminationsEdit.LoadFromController();

                // Open the cancellation reason popup for the examinations that has just been cancelled
                // after the popup is closed (no matter is reason was selected or not) save the order
                AppendPageScript(String.Format("editCancellationReason({0}, {1}, 0, null, '{2}');",
                    examinatinsToCancel.Select(i => i.ExaminationID).ToJson(), CancellationReasonTaskID.ToJson(), CancellingDone_Command));

                // Make sure it won't popup
                ScanRequestFormCheckBox.Checked = false;
                SelectedBookingAction = BookingAction.None;
            }
        }

        /// <summary>
        ///     Handles the OnCommandClicked event of the ExaminationsEdit control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="Rogan.ZillionRis.WebControls.Editors.ExaminationEditEventArgs" /> instance containing
        ///     the event data.
        /// </param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        protected void ExaminationsEdit_OnCommandClicked(object sender, ExaminationEditEventArgs e)
        {
            switch (e.CommandID)
            {
                case "DeleteCommand":
                    ExaminationController.ViewModels.Remove(e.ViewModel);
                    break;
                case "MoveUpCommand":
                {
                    var indexOf = ExaminationController.ViewModels.IndexOf(e.ViewModel);
                    ExaminationController.ViewModels.RemoveAt(indexOf);
                    ExaminationController.ViewModels.Insert(indexOf - 1, e.ViewModel);
                }
                    break;
                case "MoveDownCommand":
                {
                    var indexOf = ExaminationController.ViewModels.IndexOf(e.ViewModel);
                    ExaminationController.ViewModels.RemoveAt(indexOf);
                    ExaminationController.ViewModels.Insert(indexOf + 1, e.ViewModel);
                }
                    break;
                case "CancellationReasonEditCommand":
                {
                    var cancellationReasonID = ExaminationController.CancellationReasons.ContainsKey(e.ViewModel.ExaminationID)
                        ? ExaminationController.CancellationReasons[e.ViewModel.ExaminationID]
                        : 0;
                    var cancellationDetails = ExaminationController.CancellationDetails.ContainsKey(e.ViewModel.ExaminationID)
                        ? ExaminationController.CancellationDetails[e.ViewModel.ExaminationID]
                        : null;
                    var examinationIDs = new[] {e.ViewModel.ExaminationID};

                    // Reset the status to previous. Status update will be done if a reason is succesfully selected.
                    e.ViewModel.ExaminationStatusID = SessionContext.DataContext.Examinations
                        .Where(x => x.exa_ExaminationID == e.ViewModel.ExaminationID)
                        .Select(x => x.Status.exasta_StatusID)
                        .FirstOrDefault();

                    // Retrieve the task with the cancelled examinations.
                    var prep = new ProcessRepository();
                    var task = prep.GetTaskData(new TaskInfo() {UniqueID = CancellationReasonTaskID}, false);
                    var cancellationreasonTaskData = task.DeserializeJsonData<CancellationReasonTaskData>();
                    if (cancellationreasonTaskData != null && cancellationreasonTaskData.List != null)
                    {
                        var info = cancellationreasonTaskData.List.FirstOrDefault(item => item.ExaminationID == e.ViewModel.ExaminationID);
                        if (info != null)
                        {
                            AppendPageScript(String.Format("editCancellationReason({0}, {1}, {2}, {3}, 'FinishCancellation;{4}');",
                                examinationIDs.ToJson(), CancellationReasonTaskID.ToJson(),
                                info.CancellationReasonID.ToJson(), info.CancellationReasonComment.ToJson(), e.ViewModel.ExaminationID));
                        }
                        else
                        {
                            AppendPageScript(String.Format("editCancellationReason({0}, {1}, {2}, {3}, 'FinishCancellation;{4}');",
                                examinationIDs.ToJson(), CancellationReasonTaskID.ToJson(),
                                cancellationReasonID.ToJson(), cancellationDetails.ToJson(), e.ViewModel.ExaminationID));
                        }
                    }
                    else
                    {
                        AppendPageScript(String.Format("editCancellationReason({0}, {1}, {2}, {3}, 'FinishCancellation;{4}');",
                            examinationIDs.ToJson(), CancellationReasonTaskID.ToJson(),
                            cancellationReasonID.ToJson(), cancellationDetails.ToJson(), e.ViewModel.ExaminationID));
                    }
                    break;
                }
            }
        }

        /// <summary>
        ///     Handles the OnCommandInitializing event of the ExaminationsEdit control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="Rogan.ZillionRis.WebControls.Editors.ExaminationEditCommandEventArgs" /> instance
        ///     containing the event data.
        /// </param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        protected void ExaminationsEdit_OnCommandInitializing(object sender, ExaminationEditCommandEventArgs e)
        {
            var examinations = e.Control.Controller.ViewModels;
            var count = examinations.Count;

            var isItemEditable = ReadOnlyBehaviour != ReadOnlyLevel.Full && e.ViewModel.ExaminationID == 0 && e.ViewModel.ExaminationTypeID != 0;

            var prevExaminationID = e.Index == 0 ? 0 : examinations[e.Index - 1].ExaminationID;
            var nextExaminationID = e.Index == count - 1 ? 0 : examinations[e.Index + 1].ExaminationID;
            var prevExaminationTypeID = e.Index == 0 ? 0 : examinations[e.Index - 1].ExaminationTypeID;
            var nextExaminationTypeID = e.Index == count - 1 ? 0 : examinations[e.Index + 1].ExaminationTypeID;

            switch (e.CommandID)
            {
                case "DeleteCommand":
                    e.Visible = isItemEditable && count > 1;
                    break;
                case "MoveUpCommand":
                    e.Visible = isItemEditable && e.Index > 0 && count > 1 && prevExaminationID == 0 && prevExaminationTypeID != 0L;
                    break;
                case "MoveDownCommand":
                    e.Visible = isItemEditable && e.Index < count - 1 && count > 1 && nextExaminationID == 0 && nextExaminationTypeID != 0L;
                    break;
                case "CancellationReasonEditCommand":
                    e.Visible = SessionContext.HasPermissionAny(UserPermissions.CancelOrder, UserPermissions.SuperUser);
                    break;
            }
        }

        /// <summary>
        ///     Handles the OnClick event of the SaveOrderButton control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        protected void SaveOrderButton_OnClick(object sender, EventArgs e)
        {
            if (ReadOnlyBehaviour != ReadOnlyLevel.Full)
            {
                Validate();
                if (IsValid)
                {
                    SelectedBookingAction = BookingAction.None;
                    DisplaySaveOrder();
                }
            }
        }

        protected void ScanRequestFormButton_OnClick(object sender, EventArgs e)
        {
            RegisterScanStartupScript(true, ScanDone_ScanButtonCommand);
        }

        private void Popup_PopupClosed(object sender, EventArgs e)
        {
            NavigateToPreviousUrl();
        }
        #endregion

        #region ASP.NET Life Cycle
        /// <summary>
        ///     Raises the <see cref="E:System.Web.UI.Control.PreRender" /> event.
        /// </summary>
        /// <param name="e">An <see cref="T:System.EventArgs" /> object that contains the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        protected override void OnPreRender(EventArgs e)
        {
            ViewState.SetDirty(true);

            if (RisAppSettings.EditOrder_ShowFirstPossibilities)
            {
                var types = ExaminationController.ViewModels.Select(x => x.ExaminationTypeID);
                AppendPageScript(string.Format("updateLocationSchedule({0});", types.ToJson()));
            }

            base.OnPreRender(e);
        }

        /// <summary>
        ///     Handles the Init event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-09-24.</para>
        /// </remarks>
        protected void Page_Init(object sender, EventArgs e)
        {
            RequireModules.Add(new Uri("module://calendars/requires/app"));
            RequireModules.Add(new Uri("module://dictation/requires/addendum-request"));

            OrderController = new OrderEditController();
            ExaminationController = new ExaminationEditController
            {
                AllowCancelExaminations = SessionContext.HasPermissionAny(UserPermissions.CancelOrder, UserPermissions.SuperUser),
                AllowOverrideBillingRules = AllowOverrideBillingRules,
            };

            EnableAutomaticScheduling = SessionContext.HasPermission(UserPermissions.AutomaticScheduling);
            EnableManualScheduling = SessionContext.HasPermission(UserPermissions.ManualScheduling);

            // Enable asynchronous post backs made for the page itself.
            Master.ScriptManager.RegisterAsyncPostBackControl(this);
            Master.ScriptManager.RegisterAsyncPostBackControl(ScanRequestFormButton);
            Master.ScriptManager.RegisterAsyncPostBackControl(BookManualButton);
            Master.ScriptManager.RegisterAsyncPostBackControl(BookDirectButton);
            Master.ScriptManager.RegisterAsyncPostBackControl(BookOrderNowButton);
            Master.ScriptManager.RegisterAsyncPostBackControl(SaveOrderButton);
            RegisterPagePostBackScript();

            // If this is an external order, fill the time dropdowns.
            if (IsImportedOrder)
            {
                var hours = Enumerable.Range(00, 24).Select(x => x.ToString("D2"));
                var minutes = Enumerable.Range(00, 60).Where(x => x%5 == 0).Select(x => x.ToString("D2"));

                Hours.DataSource = hours;
                Hours.DataBind();
                Minutes.DataSource = minutes;
                Minutes.DataBind();
            }

            GlobalPopup.Closed += Popup_PopupClosed;
        }

        /// <summary>
        ///     Handles the Load event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-09-24.</para>
        /// </remarks>
        protected void Page_Load(object sender, EventArgs e)
        {
            SetupTheControllers();

            // Hookup the order controller.
            OrderController.SessionContext = SessionContext;
            OrderController.Saving += OrderController_OnSaving;
            OrderController.Loaded += OrderController_OnLoaded;

            // Hookup the order controller.
            ExaminationController.SessionContext = SessionContext;
            ExaminationController.ViewModels.ViewModelAdded += ExaminationController_OnViewModelsChanged;
            ExaminationController.ViewModels.ViewModelRemoved += ExaminationController_OnViewModelsChanged;

            // Initialize the controllers.
            using (new ScopeTimer("Initializing Controllers..."))
            {
                OrderController.Initialize();
                ExaminationController.Initialize();
            }

            // Link edit controls.
            ExaminationsEdit.Controller = ExaminationController;
            ExaminationsEdit.AllowOverrideBillingRules = AllowOverrideBillingRules;
            ExaminationsEdit.HasOverrideBillingPermission = SessionContext.HasPermission(UserPermissions.OverrideBilling);

            if (IsPostBack == false)
            {
                // Initialize the page on first load.
                InitializePage();

                // Update the scheduling buttons
                UpdateScheduleButtons();
            }

            InitWindowVariables(new
            {
                pageConfig = new
                {
                    ShowRequestingLocation = RisAppSettings.UseRequestingLocation,
                    CancellationEditOrder = CancellationReasonCategory.EditOrder,
                    ActiveLocationName = SessionContext.QueryActiveLocation().Select(x => x.loc_LocationName).FirstOrDefault(),
                    IsOrderTypeRequired = RisAppSettings.OrderType_PlannedUnplanned, // If the planned/unplanned functionallity is enable, the order type is required
                    ScheduleNowGoesToInProgress = SessionContext.HasPermission(UserPermissions.Radiographer),
                },
                Behavior
            });
        }

        /// <summary>
        ///     Handles the LoadComplete event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-28.</para>
        /// </remarks>
        protected void Page_LoadComplete(object sender, EventArgs e)
        {
            // Update the examination models.
            if (Behavior != EditOrderBehavior.CreateOrderManuallyPlannned)
            {
                var leaveSingleEmptyExamination = ReadOnlyBehaviour <= ReadOnlyLevel.OrderLevelOnly;
                ExaminationController.RemoveEmptyExaminations(leaveSingleEmptyExamination);
            }

            // Update examinations editor.
            ExaminationsEdit.LoadFromController();

            if (FocusExaminationEditor)
                ExaminationsEdit.SelectFirstEmptyEntry();
        }
        #endregion

        #region Controller - Event Handlers
        /// <summary>
        ///     Handles the OnViewModelsChanged event of the ExaminationController control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The
        ///     <see cref="Rogan.ZillionRis.ViewModels.ExaminationViewModelCollectionEventArgs" /> instance containing the event
        ///     data.
        /// </param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-12-20.</para>
        /// </remarks>
        private void ExaminationController_OnViewModelsChanged(object sender, ExaminationViewModelCollectionEventArgs e)
        {
            if (IsPostBack && RisAppSettings.EditOrder_FocusNextEmptyExamination)
                FocusExaminationEditor = true;
        }

        /// <summary>
        ///     Handles the OnLoaded event of the OrderController control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="Rogan.ZillionRis.Business.OrderEditController.OrderEventArgs" /> instance containing the
        ///     event data.
        /// </param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-28.</para>
        /// </remarks>
        private void OrderController_OnLoaded(object sender,
            OrderEditController.OrderEventArgs e)
        {
            var order = e.Order;

            if (order.RequestingPhysician == null)
            {
                Model.ReferralTypeID = null;
                Model.PhysicianID = null;
            }
            else
            {
                Model.ReferralTypeID = order.ReferralType == null ? (int?) null : order.ReferralType.reftyp_ReferralTypeID;
                Model.PhysicianID = order.RequestingPhysician.phy_PhysicianID;
            }
            Model.UrgencyID = order.Urgency.urg_UrgencyID;

            if (order.OrderType == null)
                Model.OrderTypeID = null;
            else
                Model.OrderTypeID = order.OrderType.ordtyp_OrderTypeID;

            Model.DateOfRequest = order.ord_RequestDate.HasValue ? order.ord_RequestDate.Value.LocalDateTime : (DateTime?) null;
            Model.RetrievalDate = order.ord_RetrievalDate.HasValue ? order.ord_RetrievalDate.Value.LocalDateTime : (DateTime?) null;

            Model.MedicalIndication = order.MedicalIndication.GetChildText(SessionContext.DataContext, true, "\r\n")?.Trim();
            Model.Memo = order.Memo.GetChildText(SessionContext.DataContext, true, "\r\n")?.Trim();

            var orderPhysicianReportCopy
                = order.OrderPhysicianReportCopies.Select(x => new { x.phyrepcop_PhysicianID,
                                                                     x.WorkLocation?.worloc_WorkLocationID,
                                                                     x.RequesterLocation?.reqloc_RequesterLocationID }).FirstOrDefault();

            Model.SecondCopyRequired = orderPhysicianReportCopy != null;
            Model.CopyToPhysicianID = orderPhysicianReportCopy?.phyrepcop_PhysicianID;
            Model.CopyToWorkLocationID = orderPhysicianReportCopy?.worloc_WorkLocationID;
            Model.CopyToRequesterLocationID = orderPhysicianReportCopy?.reqloc_RequesterLocationID;

            Model.RequestingLocationID = e.Order.RequesterLocation == null ? (int?) null : e.Order.RequesterLocation.reqloc_RequesterLocationID;
            Model.RequestingWorkLocationID = e.Order.RequestingWorkLocation == null ? (int?) null : e.Order.RequestingWorkLocation.worloc_WorkLocationID;
            Model.PatientCategoryID = e.Order.PatientCategory == null ? (int?) null : e.Order.PatientCategory.patcat_PatientCategoryID;

            Model.ExaminationClinicalInformation = order.Examinations.Where(x => x.ClinicalInformation != null)
                .Select(x => new ExaminationClinicalInformationModel
                {
                    ExaminationTypeName = x.ExaminationType.exatyp_Laterality == false || x.exa_Laterality == null
                        ? x.ExaminationType.exatyp_ExaminationTypeName
                        : x.ExaminationType.exatyp_ExaminationTypeName + " (" + x.exa_Laterality + ")",
                    ClinicalInformaton = x.ClinicalInformation.GetChildText(SessionContext.DataContext, true, "\r\n")?.Trim(),
                });

            Model.OrderQandAList = order.QandASets
                .SelectMany(set => set.QandAs.OrderBy(qa => qa.qna_Index)
                    .Select(qa => new QandAModel {Question = qa.qna_Question, Answer = qa.qna_Answer}));
            Model.ExaminationQandAList = order.Examinations
                .Where(x => x.QandASets.Any())
                .Select(x => new ExaminationQandAModel
                {
                    ExaminationTypeName = x.ExaminationType.exatyp_Laterality == false || x.exa_Laterality == null
                        ? x.ExaminationType.exatyp_ExaminationTypeName
                        : x.ExaminationType.exatyp_ExaminationTypeName + " (" + x.exa_Laterality + ")",
                    QandAList = x.QandASets
                        .SelectMany(set => set.QandAs.OrderBy(qa => qa.qna_Index)
                    .Select(qa => new QandAModel {Question = qa.qna_Question, Answer = qa.qna_Answer}))
                });

            CreationDate = order.ord_CreationDate.HasValue ? order.ord_CreationDate.Value.ToString("g") : "-";
        }

        /// <summary>
        ///     Handles the OnSaving event of the OrderController control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">
        ///     The <see cref="Rogan.ZillionRis.Business.OrderEditController.OrderEventArgs" /> instance containing the
        ///     event data.
        /// </param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-28.</para>
        /// </remarks>
        private void OrderController_OnSaving(object sender,
            OrderEditController.OrderEventArgs e)
        {
            var dataContext = e.Controller.Database;
            var patientID = e.Controller.PatientID;
            e.Order.Patient = dataContext.Patients.FirstOrDefault(item => item.per_PersonID == patientID);

            var referralTypeID = Model.ReferralTypeID;
            var referralType = dataContext.ReferralTypes.FirstOrDefault(item => item.reftyp_ReferralTypeID == referralTypeID);
            if (referralType == null)
                throw new Exception("Referral type is required.");
            e.Order.ReferralType = referralType;

            if (string.IsNullOrWhiteSpace(Model.AddMemo) == false)
            {
                e.Order.Memo = HandleMemos.AppendMemo(Model.AddMemo, SessionContext.DataContext.RISUsers.First(u => u.risuse_UserID == CurrentUserID), e.Order.Memo);
            }
            if (string.IsNullOrWhiteSpace(Model.AddMedicalIndication) == false)
            {
                if (!ClinicalInformationOnExaminationLevel)
                {
                    e.Order.MedicalIndication = HandleMemos.AppendMemo(Model.AddMedicalIndication, SessionContext.DataContext.RISUsers.First(u => u.risuse_UserID == CurrentUserID), e.Order.MedicalIndication);
                }
            }

            var physicianID = Model.PhysicianID;
            var requestingPhysician = dataContext.Physicians.FirstOrDefault(item => item.phy_PhysicianID == physicianID);
            if (requestingPhysician == null)
                throw new Exception("Requesting physician is required.");
            e.Order.RequestingPhysician = requestingPhysician;

            var urgencyID = Model.UrgencyID ?? Urgency.Normal;
            e.Order.Urgency = dataContext.Urgencies.FirstOrDefault(u => u.urg_UrgencyID == urgencyID);

            if (Model.OrderTypeID.HasValue)
                e.Order.OrderType = dataContext.OrderTypes.FirstOrDefault(ot => ot.ordtyp_OrderTypeID == Model.OrderTypeID);
            else if (RisAppSettings.OrderType_PlannedUnplanned)
                throw new Exception("Order Type is required.");
            else
                e.Order.OrderType = null;

            e.Order.ord_RequestDate = Model.DateOfRequest;
            e.Order.ord_RetrievalDate = Model.RetrievalDate;


            if (Model.SecondCopyRequired)
            {
                if (!Model.CopyToPhysicianID.HasValue)
                {
                    throw new Exception("\"Copy to\" physician is required when \"second copy required\" is true.");
                }
            }

            // Update Copy to Referrer.
            var removals = e.Order.OrderPhysicianReportCopies.Where(xc => !Model.SecondCopyRequired
                                                                          || Model.CopyToPhysicianID != xc.phyrepcop_PhysicianID).ToArray();
            foreach (var copy in removals)
            {
                e.Order.OrderPhysicianReportCopies.Remove(copy);
            }

            if (Model.SecondCopyRequired)
            {
                var orderPhysicianReportCopy
                    =
                    e.Order.OrderPhysicianReportCopies.FirstOrDefault(
                        x => x.phyrepcop_PhysicianID == Model.CopyToPhysicianID);

                if (orderPhysicianReportCopy == null)
                {
                    var physician =
                        dataContext.Physicians.FirstOrDefault(
                            item => item.phy_PhysicianID == Model.CopyToPhysicianID.Value);
                    orderPhysicianReportCopy = new OrderPhysicianReportCopy {Physician = physician};
                    e.Order.OrderPhysicianReportCopies.Add(orderPhysicianReportCopy);
                }

                orderPhysicianReportCopy.WorkLocation
                    = Model.CopyToWorkLocationID.HasValue
                        ? dataContext.WorkLocations.FirstOrDefault(
                            x => x.worloc_WorkLocationID == Model.CopyToWorkLocationID)
                        : null;

                orderPhysicianReportCopy.RequesterLocation
                    = Model.CopyToRequesterLocationID.HasValue
                        ? dataContext.RequesterLocations.FirstOrDefault(
                            x => x.reqloc_RequesterLocationID == Model.CopyToRequesterLocationID)
                        : null;
            }

            if (Model.RequestingLocationID == null)
                e.Order.RequesterLocation = null;
            else
                e.Order.RequesterLocation = dataContext.RequesterLocations.FirstOrDefault(x => x.reqloc_RequesterLocationID == Model.RequestingLocationID);

            if (Model.RequestingWorkLocationID == null)
                e.Order.RequestingWorkLocation = null;
            else
                e.Order.RequestingWorkLocation = dataContext.WorkLocations.FirstOrDefault(x => x.worloc_WorkLocationID == Model.RequestingWorkLocationID);

            if (Model.PatientCategoryID == null)
                e.Order.PatientCategory = null;
            else
                e.Order.PatientCategory = dataContext.PatientCategories.FirstOrDefault(x => x.patcat_PatientCategoryID == Model.PatientCategoryID);

            if (Behavior == EditOrderBehavior.ImportOrder && Model.RetrospectiveBooking == false)
            {
                e.Order.ord_IsImported = true;
            }
        }
        #endregion

        #region Workflow - Concerns
        /// <summary>
        ///     Schedules the examinations using the information from the <see cref="ManualBookingData" />.
        /// </summary>
        /// <returns></returns>
        /// <remarks>
        ///     <para>Created by tdgroen on 2011-02-09.</para>
        /// </remarks>
        private WorkflowResult ProcessScheduleNewManualOrder()
        {
            try
            {
                var inDepartment = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.InDepartment);
                var bookingData = ManualBookingData;
                var appointments = bookingData.Appointments.OrderBy(x => x.StartDateTime).ToArray();

                var scheduleController = new ScheduleController();
                scheduleController.Database = SessionContext.DataContext;
                scheduleController.AllowReschedule = true;

                // Add the examinations and schedule times.
                for (var index = 0; index < appointments.Length; index++)
                {
                    var appointmentInformation = appointments[index];
                    var examination = ExaminationController.ViewModels[index];

                    if (examination.ExaminationStatus != inDepartment)
                    {
                        scheduleController.AddManualExaminationByRoom(examination.ExaminationID,
                            examination.ExaminationTypeID,
                            appointmentInformation.RoomID,
                            appointmentInformation.StartDateTime.LocalDateTime);
                        // extend the appointment information
                        appointments[index].ExaminationID = examination.ExaminationID;
                        appointments[index].ExaminationTypeID = examination.ExaminationTypeID;
                    }
                }

                if (ExaminationController.ViewModels.Any(item => item.ExaminationStatus != inDepartment))
                {
                    // Initialize and launch the scheduling popup.
                    {
                        // Store the request as task.
                        var prep = new ProcessRepository();
                        var proc = prep.CreateProcess();
                        var task = prep.CreateTask(proc);

                        var data = prep.GetTaskData(task, false);
                        data.UpdateWithJsonData(bookingData);
                        prep.UpdateTask(data);
                        var taskID = task.UniqueID;

                        AppendPageScript("window.finishManualBooking(" + taskID.ToJson() + ");");
                    }

                    return WorkflowResult.NoRedirect;
                }

                // Everything is set to in department, save the examinations and continue.
                if (scheduleController.Examinations.Count > 0)
                {
                    var notificationList = new OrderMessageNotificationList(SessionContext);
                    notificationList.UserID = SessionContext.User.UserID;
                    try
                    {
                        scheduleController.OrderMessageNotifier = notificationList;
                        scheduleController.Execute();
                    }
                    finally
                    {
                        notificationList.TrySend();
                    }
                }

                var examinationIDs = ExaminationController.ViewModels.Select(item => item.ExaminationID);
                ZillionRisBusiness.MoveOverlappingAppointments(SessionContext, examinationIDs);

                // When all examinations are put in to department, redirect to the imaging page.
                Application.NavigatePage(PageAccessKey.ImagingPage);
                return WorkflowResult.NoRedirect;
            }
            catch (ThreadAbortException)
            {
                throw;
            }
            catch (Exception ex)
            {
                LogException("ProcessScheduleNewManualOrder", ex);
                GlobalPopup.ShowErrorMessage(WebResources.EditOrder_ScheduleExaminationFailed, ex);
                return WorkflowResult.Stop;
            }
        }
        #endregion

        #region DisplaySaveOrder
        /// <summary>
        ///     Saves the order and displays an error message to the user when the operation fails.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        private void DisplaySaveOrder()
        {
            // Only create snapshot when order is being edited
            var orderSnapshotBeforeEdit
                = OrderController.OrderID == 0
                    ? null
                    : new EditOrderChangeResolver.OrderSnapshot(SessionContext.DataContext, OrderController.OrderID);

            var result = WorkflowResult.Continue;
            var navigateToPreviousPage = true;
            var userID = SessionContext.User.UserID;
            var notificationList = new OrderMessageNotificationList(SessionContext);

            notificationList.UserID = userID;

            try
            {
                // An already existing order
                var examinationsValid = ExaminationController.ViewModels.Where(examinations => examinations.ExaminationTypeID != 0).ToArray();
                var existingExaminations = examinationsValid.Where(examinations => examinations.ExaminationID != 0).ToArray();

                // Skip the first part of the logic when a scan has completed.
                if (IsScanFinished == false)
                {
                    // Save Order - Save the Order.
                    {
                        try
                        {
                            if (_cancellationReasonTaskID != null)
                            {
                                GetCancellationReasonsFromTaskData();
                            }
                            OrderController.SaveToDatabase();
                        }
                        catch (OptimisticConcurrencyException ex)
                        {
                            LogException("DisplaySaveOrder - Save Order", ex);
                            GlobalPopup.ShowErrorMessage(WebResources.ltConcurrencyError, ex);

                            OrderController.LoadFromDatabase();
                            return;
                        }
                        catch (Exception ex)
                        {
                            LogException("DisplaySaveOrder - Save Order", ex);
                            GlobalPopup.ShowErrorMessage(WebResources.EditOrder_SaveOrderFailed, ex);
                            return;
                        }
                    }

                    // Save Order - Save the Examinations.
                    {
                        if (OrderController.OrderID == 0)
                            OrderController.SaveToDatabase();
                        ExaminationController.OrderID = OrderController.OrderID;
                        ExaminationController.OrderMessageNotifier = notificationList;
                        try
                        {
                            ExaminationController.SaveToOrder(userID);
                        }
                        catch (OptimisticConcurrencyException ex)
                        {
                            LogException("DisplaySaveOrder - Save Examinations", ex);
                            GlobalPopup.ShowErrorMessage(WebResources.ltConcurrencyError, ex);

                            ExaminationController.LoadFromOrder();
                            return;
                        }
                        catch (Exception ex)
                        {
                            LogException("DisplaySaveOrder - Save Examinations", ex);
                            GlobalPopup.ShowErrorMessage(WebResources.EditOrder_SaveExaminationsFailed, ex);
                            return;
                        }
                    }

                    if (ClinicalInformationOnExaminationLevel && !string.IsNullOrEmpty(Model.AddMedicalIndication))
                    {
                        ExaminationController.AppendClinicalInformation(Model.AddMedicalIndication, userID);
                    }

                    if (orderSnapshotBeforeEdit != null)
                    {
                        // Get Examination ViewModels from the ExamController.
                        // NOTE: The UI sends the (empty) item in the request, this needs to be filtered
                        // out otherwise it will be added to all audit rows.
                        var examViewModels = ExaminationController.ViewModels.Where(_ => _.ExaminationTypeID != 0);

                        // The Order and Examination objects that have been loaded from the database might contain changes made by other users
                        // (e.g. because of OrderEditController.SaveToDatabase calling ObjectContext.Refresh). We want to write an audit
                        // log message that only lists the changes made by the current user. So instead of basing the second snapshot on the
                        // Order object, we base it on the EditOrderModel object.
                        var orderSnapshotAfterEdit
                            = new EditOrderChangeResolver.OrderSnapshot(SessionContext.DataContext, Model, examViewModels,
                                ExaminationController.CancellationReasons,
                                ExaminationController.CancellationDetails);

                        var order = SessionContext.DataContext.Orders.First(_ => _.ord_OrderID == OrderController.OrderID);
                        var context = new AuditContext {Order = order, Patient = order.Patient};
                        SessionContext.Get<IAuditor>().LogEditByReferralPage(RisAccessKey, context, orderSnapshotBeforeEdit, orderSnapshotAfterEdit);
                    }

                    if (ScanRequestFormIfNeeded()) return;
                }
                else
                {
                    // The scan has linked a request form to the order.
                    OrderController.LoadFromDatabase();
                    ExaminationController.LoadFromOrder();
                }

                try
                {
                    var addedNewExaminations = false;

                    switch (Behavior)
                    {
                        case EditOrderBehavior.EditOrder:
                            // Handle the case when new examinations are added to the order and 
                            // the schedule date of the other exams will be used to change the status to scheduled, in department or in progress.
                            try
                            {
                                var order = ExaminationController.Order;
                                var examinationsBefore = ExaminationsBefore.Where(x => x.ExaminationTypeID != 0).ToArray();

                                //Check if the order is in department (without the new examinations)
                                var existingScheduled = existingExaminations.Any(x => x.ExaminationStatusID == ExaminationStatusValue.Scheduled);
                                var existingInDepartment = existingExaminations.Any(x => x.ExaminationStatusID == ExaminationStatusValue.InDepartment);
                                var existingInProgress = existingExaminations.Any(x => x.ExaminationStatusID == ExaminationStatusValue.InProgress);
                                var existingCompleted = existingExaminations.Any(x => x.ExaminationStatusID == ExaminationStatusValue.Completed);

                                var status = "";

                                if (existingInProgress)
                                    status = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.InProgress).Specification;
                                else if (existingInDepartment)
                                    status = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.InDepartment).Specification;
                                else if (existingScheduled)
                                    status = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Scheduled).Specification;
                                else if (existingCompleted)
                                    status = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Completed).Specification;
                                else
                                    status = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Waiting).Specification;

                                var changedExaminations = new List<int>();
                                var previousTechnicians = new List<int>();

                                foreach (ExaminationViewModel examVal in examinationsValid)
                                {
                                    // Get the old information from the stored data.
                                    var examBefore = examinationsBefore.FirstOrDefault(e => e.ExaminationID == examVal.ExaminationID);
                                    if (examBefore != null)
                                    {
                                        // Get the current examination typeID and statusID from the database
                                        var examinationTypeID = order.Examinations
                                            .Where(a => a.exa_ExaminationID == examVal.ExaminationID)
                                            .Select(e => e.ExaminationType.exatyp_ExaminationTypeID)
                                            .FirstOrDefault();

                                        var examinationStatusID = order.Examinations
                                            .Where(a => a.exa_ExaminationID == examVal.ExaminationID)
                                            .Select(e => e.Status.exasta_StatusID)
                                            .FirstOrDefault();

                                        if (examBefore.ExaminationTypeID != examinationTypeID || examBefore.ExaminationStatusID != examinationStatusID)
                                        {
                                            // If the new status is waiting there is nothing to do.
                                            if (status == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Waiting).Specification)
                                                continue;

                                            // If the new status is scheduled, but than the waiting won't be upgraded automatically to scheduled.
                                            if (examVal.ExaminationStatus == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Waiting) &&
                                                status == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Scheduled).Specification)
                                                continue;

                                            // If the examination is cancelled there is nothing to do
                                            if (examinationStatusID == ExaminationStatusValue.Cancelled)
                                                continue;

                                            //Ignore the examinations that were higher than completed before.                                            
                                            var statusBeforeHigherThanCompleted = ExaminationStatusValue.IsForwardStatus(examBefore.ExaminationStatusID, ExaminationStatusValue.Completed);
                                            if (examinationStatusID == ExaminationStatusValue.Completed &&
                                                order.Examinations.Any(x => !x.Reports.Any() && x.Status.exasta_StatusID == ExaminationStatusValue.Completed) &&
                                                (statusBeforeHigherThanCompleted == false))
                                            {
                                                CopyAssignmentsAndSchedule(order, examVal, notificationList);

                                                SessionContext.DataContext.SaveChanges();

                                                continue;
                                            }

                                            // When Exam Type is being changed while the status is completed, it will go through 'in progress'
                                            // In this case, the previous technicians must stay the same
                                            if (examBefore.ExaminationTypeID != examinationTypeID &&
                                                examBefore.ExaminationStatusID == examinationStatusID &&
                                                examBefore.ExaminationStatusID == ExaminationStatusValue.Completed)
                                            {
                                                var exam = order.Examinations
                                                    .FirstOrDefault(x => x.exa_ExaminationID == examBefore.ExaminationID);
                                                previousTechnicians = exam.ExaminationAssignments
                                                    .Where( x => x.exaass_RISRoleID == (int) ExaminationAssignmentTypes.Radiographer)
                                                    .Select(x => x.exaass_RISUserID).ToList();
                                            }
                                            
                                            changedExaminations.Add(examVal.ExaminationID);
                                        }

                                        var hasProtocol = order.Examinations
                                            .Where(a => a.exa_ExaminationID == examVal.ExaminationID)
                                            .Any(x => x.Protocol != null || !string.IsNullOrEmpty(x.exa_FreeTextProtocol));

                                        //Remove the protocol when it is assigned.
                                        if (examBefore.ExaminationTypeID != examinationTypeID && hasProtocol)
                                        {
                                            var protocolExamination = order.Examinations
                                                .FirstOrDefault(a => a.exa_ExaminationID == examVal.ExaminationID);

                                            protocolExamination.Protocol = null;
                                            protocolExamination.exa_FreeTextProtocol = null;

                                            SessionContext.DataContext.SaveChanges();
                                        }
                                    }
                                    else // This is a new examination added to the order.
                                    {
                                        // If the new status is waiting there is nothing to do.
                                        if (status == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Waiting).Specification)
                                            continue;

                                        // If the new status is scheduled, but the new examination's status is left in waiting, then it won't be upgraded automatically to scheduled.
                                        if (examVal.ExaminationStatus == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Waiting) &&
                                            status == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Scheduled).Specification)
                                            continue;

                                        // If the examination is cancelled there is nothing to do
                                        if (examVal.ExaminationStatus == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Cancelled))
                                            continue;

                                        //If the new status is completed and the order contains completed exam without report, copy schedule + intended reporter + radiologist examination assignment                                        ;
                                        if (examVal.ExaminationStatus == ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Completed) &&
                                            order.Examinations.Any(x => !x.Reports.Any() && x.Status.exasta_StatusID == ExaminationStatusValue.Completed))
                                        {
                                            //If openassignmentpopup is not needed, remove assignment popup...
                                            CopyAssignmentsAndSchedule(order, examVal, notificationList);

                                            SessionContext.DataContext.SaveChanges();
                                            continue;
                                        }

                                        changedExaminations.Add(examVal.ExaminationID);
                                    }
                                }

                                if (changedExaminations.Any())
                                {
                                    addedNewExaminations = true;
                                    // Open status change popup for the changed/added examinations
                                    var examinationModel = new ChangedExaminationModel
                                    {
                                        PatientID = order.Patient.per_PersonID,
                                        OrderID = order.ord_OrderID,
                                        SourceStatusID = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Invalid).Specification,
                                        TargetStatusID = status,
                                        ExaminationIDs = changedExaminations.ToArray(),
                                        HideUserSelect = true,
                                        PreviousTechnicians = previousTechnicians
                                    };

                                    AppendPageScript("changedExaminations(" + examinationModel.ToJson() + ");");
                                    // All operations are completed successfully so reload the ExaminationController with the new order
                                    ExaminationController.LoadFromOrder();
                                    navigateToPreviousPage = false;
                                }
                            }
                            catch (Exception ex)
                            {
                                throw new ApplicationException("An error occurred while trying to add the examination(s) to an existing schedule.", ex);
                            }
                            break;
                        case EditOrderBehavior.CreateOrderManuallyPlannned:
                            try
                            {
                                // Save Order - Schedule new manual order.
                                result = ProcessScheduleNewManualOrder();

                                if (result.DoNotContinue)
                                    return;
                                navigateToPreviousPage &= result.DoNotRedirect == false;

                                //Audit the new order
                                AuditConcerns.AuditOrderCreated(SessionContext, ExaminationController.Order, includeOverrideBilling: AllowOverrideBillingRules);
                            }
                            catch (Exception ex)
                            {
                                throw new ApplicationException("An error occurred while trying to schedule the manual order.", ex);
                            }
                            break;
                        case EditOrderBehavior.ImportOrder:
                        {
                            var patientID = OrderController.PatientSource.per_PersonID;
                            AppendPageScript(string.Format("window.finishImportingOrder('{0}', {1}, {2}, {3});",
                                UrnFactory.OrderID(OrderController.OrderID), patientID.ToJson(),
                                GetScheduledDateTime().ToJavaScript(), Model.RetrospectiveBooking.ToJSBool()));

                            //Audit the new order
                            AuditConcerns.AuditOrderCreated(SessionContext, ExaminationController.Order, includeOverrideBilling: AllowOverrideBillingRules);
                            return;
                        }
                            break;
                        case EditOrderBehavior.CreateOrder:
                            //Audit the new order
                            AuditConcerns.AuditOrderCreated(SessionContext, ExaminationController.Order, includeOverrideBilling: AllowOverrideBillingRules);
                            break;
                        case EditOrderBehavior.EditOrderBeforeBooking:
                            // No special behavior.
                            break;
                        default:
                            throw new Exception("Unknown behavior: " + Behavior);
                    }

                    var qandaFormsHandled = false;
                    if (result.DoNotContinue == false && SelectedBookingAction != BookingAction.None)
                    {
                        var orderList = new List<Urn> {UrnFactory.OrderID(OrderController.OrderID)};
                        var patientName = OrderController.PatientSource.Person.per_DisplayName;
                        var patientID = OrderController.PatientSource.per_PersonID;
                        var orderNumber = OrderController.OrderNumber;
                        var statusChanges = notificationList.GetForwardStatusChanges().ToList();

                        ScanRequestFormButton.Visible = true;
                        ScanRequestFormCheckBox.Visible = false;
                        ButtonContainer.Update();

                        switch (SelectedBookingAction)
                        {
                            case BookingAction.BookDirect:
                                AppendPageScript(string.Format("autoScheduleOrder({0}, {1}, {2}, {3});", statusChanges.ToJson(), orderList.ToJson(), patientName.ToJson(), patientID.ToJson()));
                                qandaFormsHandled = true;
                                break;

                            case BookingAction.BookManually:
                                AppendPageScript(string.Format("manualScheduleOrder({0}, {1}, {2}, {3}, {4});", statusChanges.ToJson(), orderList.ToJson(), patientName.ToJson(), patientID.ToJson(), orderNumber.ToJson()));
                                qandaFormsHandled = true;
                                break;

                            case BookingAction.BookNow:
                                if (SessionContext.HasPermission(UserPermissions.Radiographer))
                                {
                                    // Change the examination status to scheduled, indepartment
                                    // Look for Q&A forms for these changes,
                                    // Then promote popup (from indepartment to inprogress)
                                    // Then navigate to imaging page.
                                    AppendPageScript($"window.scheduledByTechnician({statusChanges.ToJson()}, {OrderController.OrderID});");
                                    qandaFormsHandled = true;
                                }
                                else
                                {
                                    // Change the examination status to scheduled, indepartment
                                    // Look for Q&A forms for these changes
                                    // Then navigate to reception page
                                    AppendPageScript($"window.scheduledBySecretary({statusChanges.ToJson()}, {OrderController.OrderID});");
                                    qandaFormsHandled = true;
                                }
                                break;

                            default:
                                GlobalPopup.ShowErrorMessage(String.Format("The selected action is not known: {0}.", SelectedBookingAction));
                                break;
                        }
                        navigateToPreviousPage = false;
                    }

                    if (qandaFormsHandled == false)
                    {
                        // Look for Q&A forms for these changes
                        var statusChanges = notificationList.GetForwardStatusChanges().ToList();
                        if (statusChanges.Count != 0 && addedNewExaminations == false)
                        {
                            AppendPageScript(String.Format("window.qandaForms({0},{1});", statusChanges.ToJson(), navigateToPreviousPage.ToJSBool()));
                            navigateToPreviousPage = false;
                        }
                    }

                    // Navigate to an other page when Edit Order is done.
                    if (navigateToPreviousPage)
                        NavigateToPreviousUrl();
                }
                catch (Exception ex)
                {
                    LogException("DisplaySaveOrder", ex);
                    GlobalPopup.ShowErrorMessage(WebResources.EditOrder_SaveOrderFailed, ex);
                }
            }
            finally
            {
                notificationList.TrySend();

                // Always reload the order information after handling special cases (whether failed or succeeded).
                if (navigateToPreviousPage == false)
                {
                    OrderController.LoadFromDatabase();
                    ExaminationController.LoadFromOrder();
                }
            }
        }

        private WorkflowResult CheckBookNowPreConditions()
        {
            var result = WorkflowResult.Continue;

            // Validate that this is a new order or 
            // the user was navigated from Order booking page to confirm the details of the external order
            if (Behavior != EditOrderBehavior.CreateOrder && Behavior != EditOrderBehavior.EditOrderBeforeBooking)
            {
                GlobalPopup.ShowInfoMessage(WebResources.EditOrder_ScheduleNow_InvalidBehaviorMode);
                result = WorkflowResult.Stop;
            }

            var locationID = SessionContext.GetActiveLocationID();
            var locationName = SessionContext.QueryActiveLocation().Select(x => x.loc_LocationName).FirstOrDefault();
            var examinationsValid = ExaminationController.ViewModels.Where(examinations => examinations.ExaminationTypeID != 0 &&
                                                                                                examinations.ExaminationStatusID != ExaminationStatusValue.Cancelled).ToArray();

            // Validate that all examinations have the status waiting.
            if (examinationsValid.All(model => model.ExaminationStatusID == ExaminationStatusValue.Waiting ||
                                               model.ExaminationStatusID == ExaminationStatusValue.Approved) == false)
            {
                var message = string.Format(WebResources.EditOrder_ScheduleNow_InvalidStatusExaminations,
                    ExaminationStatusValueExtensions.ToString(ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Waiting)),
                    ExaminationStatusValueExtensions.ToString(ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Approved)));
                GlobalPopup.ShowInfoMessage(message);
                result = WorkflowResult.Stop;
            }

            // Validate that the examinations can be planned on the current location.
            if (ExaminationController.GetPossibleLocations().Contains(locationID) == false)
            {
                var invalidExaminationTypes = examinationsValid
                    .Select(viewModel => ExaminationController.GetExaminationTypeInfo(viewModel.ExaminationTypeID))
                    .Where(info => info != null && info.Locations.Contains(locationID) == false)
                    .Select(info => info.ExaminationTypeName)
                    .JoinText(", ");

                var message = string.Format(WebResources.EditOrder_ScheduleNow_ImpossibleLocationExaminations, locationName, invalidExaminationTypes);
                GlobalPopup.ShowInfoMessage(message);
                result = WorkflowResult.Stop;
            }
            return result;
        }
        #endregion

        #region Private/Protected Methods
        /// <summary>
        ///     Scan the request form when the user requested.
        /// </summary>
        /// <returns>true if the save order should be stopped</returns>
        private bool ScanRequestFormIfNeeded()
        {
            // Scan the request form when the user requested.
            if (ScanRequestFormCheckBox.Visible && ScanRequestFormCheckBox.Checked)
            {
                if (RegisterScanStartupScript(false, ScanDone_SaveOrderCommand))
                {
                    // The scan script has been registered and will resubmit the form.
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        ///     Gets or creates the order edit controller's caching table.
        /// </summary>
        /// <returns>
        ///     Returns a <see cref="Hashtable" /> that is used by <see cref="OrderEditController" /> as cache.
        /// </returns>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        private Hashtable GetOrderEditControllerCache()
        {
            var cacheKey = "OrderEditController_" + SessionContext.SessionID;

            // Create a new cache entry when it does not exist.
            var cache = (Hashtable) Cache[cacheKey];
            if (cache == null)
            {
                cache = new Hashtable();

                Cache.Add(cacheKey,
                    cache,
                    null,
                    DateTime.Now.AddMinutes(10),
                    Cache.NoSlidingExpiration,
                    CacheItemPriority.Normal,
                    null);
            }
            return cache;
        }

        /// <summary>
        ///     Gets or creates the patient edit controller's caching table.
        /// </summary>
        /// <returns>
        ///     Returns a <see cref="Hashtable" /> that is used by <see cref="PatientEditController" /> as cache.
        /// </returns>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-10-01.</para>
        /// </remarks>
        private Hashtable GetExaminationEditControllerCache()
        {
            const string globalCacheKey = "ExaminationEditControllerCache";

            // Create a new cache entry when it does not exist.
            var cache = (Hashtable) Cache[globalCacheKey];
            if (cache == null)
            {
                cache = new Hashtable();

                Cache.Add(globalCacheKey,
                    cache,
                    null,
                    DateTime.Now.AddMinutes(10),
                    Cache.NoSlidingExpiration,
                    CacheItemPriority.Normal,
                    null);
            }
            return cache;
        }

        /// <summary>
        ///     Initializes the page.
        /// </summary>
        /// <remarks>
        ///     <para>Usually called only one time.</para>
        ///     <para>Created by tdgroen on 2010-10-29.</para>
        /// </remarks>
        private void InitializePage()
        {
            var orderID = 0;
            var orderIDText = Request.Params["orderID"];
            if (orderIDText != null)
                orderID = Convert.ToInt32(orderIDText);

            var patientID = 0;
            var patientIDText = Request.Params["patientID"];
            if (patientIDText != null)
                patientID = Convert.ToInt32(patientIDText);

            if (orderID != 0)
            {
                CheckPermission(UserPermissions.EditOrder);

                if (FromBookingPage)
                    Behavior = EditOrderBehavior.EditOrderBeforeBooking;
                else
                    Behavior = EditOrderBehavior.EditOrder;

                OrderController.OrderID = orderID;
                OrderController.LoadFromDatabase();

                ExaminationController.OrderID = orderID;
                ExaminationController.LoadFromOrder();

                ExaminationsBefore = ExaminationController.ViewModels;
            }
            else if (patientID != 0)
            {
                OrderController.PatientID = patientID;

                Model.ReferralTypeID = OrderController.DefaultReferralType != null ? OrderController.DefaultReferralType.ID : (int?) null;
                Model.PhysicianID = null;
                Model.UrgencyID = OrderController.DefaultUrgency.ID;

                if (IsImportedOrder)
                {
                    CheckPermission(UserPermissions.ImportOrder);

                    Behavior = EditOrderBehavior.ImportOrder;

                    ExaminationsEdit.IsImportedOrder = true;
                    Model.ImportOrderDate = DateTime.Now;
                }
                else if (ManualBookingData != null)
                {
                    CheckPermission(UserPermissions.CreateOrder);

                    Behavior = EditOrderBehavior.CreateOrderManuallyPlannned;

                    // Setup the examination controller for a manually planned order.
                    ExaminationController.SelectedRooms = new List<int>();
                    foreach (AppointmentInformation appointmentInformation in ManualBookingData.Appointments.OrderBy(x => x.StartDateTime))
                    {
                        ExaminationController.SelectedRooms.Add(appointmentInformation.RoomID);
                        ExaminationController.ViewModels.Add(ExaminationViewModel.CreateEmpty());
                    }
                }
                else
                {
                    CheckPermission(UserPermissions.CreateOrder);

                    Behavior = EditOrderBehavior.CreateOrder;
                }
            }
            else
            {
                NavigationHelper.SearchPatient(0, string.Empty);
            }

            LoadPatientBanner(OrderController.PatientID);
            Model.PatientGPPhysicianID = OrderController.PatientGPPhysicianID;

            GetReadOnlySettings();
            SetScanRequestFormSettings();
        }

        private void CheckPermission(string permission)
        {
            if (!SessionContext.HasPermission(permission))
            {
                NavigationHelper.SearchPatient(0, string.Empty);
            }
        }

        private void GetReadOnlySettings()
        {
            ReadOnlyBehaviour = ReadOnlyLevel.None;
            if (ExaminationController.ViewModels.Any())
            {
                var isSuperUser = SessionContext.IsSuperUser();
                var isFinalState = ExaminationController
                    .ViewModels
                    .All(x => ExaminationStatusValue.FinalWorkflow.Contains(x.ExaminationStatusID) ||
                              x.ExaminationStatusID == ExaminationStatusValue.Authorised ||
                              x.HasAuthorizedReport);
                var hasAuthorizedReport = ExaminationController.ViewModels.Any(x => x.HasAuthorizedReport);

                // Tf the user is not a super user, then there are some restrictions.
                if (isSuperUser == false)
                {
                    if (hasAuthorizedReport)
                    {
                        // The order information should be read only when there is at least one exam that is in a final or authorized state.
                        ReadOnlyBehaviour = ReadOnlyLevel.OrderLevelOnly;
                    }

                    if (isFinalState)
                    {
                        ReadOnlyBehaviour = ReadOnlyLevel.Full;
                    }
                }
            }
        }

        /// <summary>
        ///     If a new order is being created/imported, the 'Scan Request Form' possibility is a checkbox.
        ///     If the order is already exists, the scan request form option can be reached by clicking the button.
        /// </summary>
        private void SetScanRequestFormSettings()
        {
            // Enable checkbox if it is configured that request form needs to be scanned after scheduling order.
            if (ScanningRequestFormsDuringCreation &&
                (Behavior == EditOrderBehavior.CreateOrder || Behavior == EditOrderBehavior.ImportOrder))
            {
                ScanRequestFormButton.Visible = false;
                ScanRequestFormCheckBox.Visible = true;
                ScanRequestFormCheckBox.Enabled = true;
                ScanRequestFormCheckBox.Checked = false;

                if (RisAppSettings.EditOrder_AutomaticallyScan)
                {
                    ScanRequestFormCheckBox.Checked = true;
                }

                ButtonContainer.Update();
            }
            // When an order has been loaded the scan button check box changes into a button.
            else
            {
                ScanRequestFormButton.Visible = true;
                ScanRequestFormCheckBox.Visible = false;
                ButtonContainer.Update();
            }
        }

        /// <summary>
        ///     Registers the scan startup script.
        /// </summary>
        /// <param name="forced">If set to <c>true</c> a multiple scan can be executed.</param>
        /// <param name="postbackCommand">The postback argument passed to the page.</param>
        /// <returns></returns>
        /// <remarks>
        ///     <para>Created by tdgroen at 2011-10-25.</para>
        /// </remarks>
        private bool RegisterScanStartupScript(bool forced, string postbackCommand)
        {
            const string scriptNormal = @"window.scanRequestForm('{2}', function() {{ }});";
            const string scriptResumbit = @"window.scanRequestForm('{2}', function() {{ __doPostBack('{0}','{1}'); }});";

            if (HasRegisteredClientScan && forced == false)
                return false;

            var hasPostbackCommand = !string.IsNullOrEmpty(postbackCommand);
            ScriptManager.RegisterStartupScript(this,
                typeof (string),
                @"startscanner",
                string.Format(hasPostbackCommand ? scriptResumbit : scriptNormal, UniqueID, postbackCommand, OrderController.OrderNumber),
                true);

            HasRegisteredClientScan = true;
            return true;
        }

        private void SetupTheControllers()
        {
            // Setup the controllers.
            OrderController.Cache = GetOrderEditControllerCache();
            OrderController.Database = SessionContext.DataContext;
            ExaminationController.Database = SessionContext.DataContext;
            ExaminationController.Cache = GetExaminationEditControllerCache();
        }

        private void UpdateScheduleButtons()
        {
            // Handle the buttons's visibility
            // 1. In case of external orders (when the edit order page was opened from a booking page):
            //    only the 3 booking buttons are visible
            if (Behavior == EditOrderBehavior.EditOrderBeforeBooking)
            {
                BookDirectButton.Visible = true;
                BookManualButton.Visible = true;
                BookOrderNowButton.Visible = true;
                SaveOrderButton.Visible = false;
            }
            // 2. In case of imported orders or if manual booking has been started from calendar page:
            //    only the save order button is visible
            else if (IsImportedOrder ||
                     Behavior == EditOrderBehavior.CreateOrderManuallyPlannned)
            {
                BookDirectButton.Visible = false;
                BookManualButton.Visible = false;
                BookOrderNowButton.Visible = false;
                SaveOrderButton.Visible = true;
            }
            // 3. In case of creating orders:
            //   all button is available
            else if (Behavior == EditOrderBehavior.CreateOrder)
            {
                BookDirectButton.Visible = true;
                BookManualButton.Visible = true;
                BookOrderNowButton.Visible = true;
                SaveOrderButton.Visible = true;
            }
            else
            {
                BookDirectButton.Visible = false;
                BookManualButton.Visible = false;
                BookOrderNowButton.Visible = false;
                SaveOrderButton.Visible = true;
            }
            ButtonContainer.Update();
        }

        private bool IsValidForm()
        {
            if (Model.ReferralTypeID == null)
                return false;
            if (Model.PhysicianID == null)
                return false;
            if (RisAppSettings.UseRequestingLocation && Model.RequestingWorkLocationID == null && Model.RequestingLocationID == null)
                return false;
            // There is at least one examination type selected
            if (ExaminationController.ViewModels.Any(model => model.ExaminationTypeID != 0) == false)
                return false;
            return true;
        }

        private void GetCancellationReasonsFromTaskData()
        {
            // Retrieve the task with the cancelled examinations.
            var prep = new ProcessRepository();
            var task = prep.GetTaskData(new TaskInfo {UniqueID = CancellationReasonTaskID}, false);
            var cancellationreasonTaskData = task.DeserializeJsonData<CancellationReasonTaskData>();
            if (cancellationreasonTaskData != null && cancellationreasonTaskData.List != null)
            {
                var controller = SessionContext.Get<IAuditTrailController>();
                foreach (var item in cancellationreasonTaskData.List)
                {
                    var examination = SessionContext.DataContext.Examinations.FirstOrDefault(e => e.exa_ExaminationID == item.ExaminationID);
                    var reason = SessionContext.DataContext.CancellationReasons.FirstOrDefault(cr => cr.canrea_ReasonID == item.CancellationReasonID);
                    ExaminationController.CancellationReasons[item.ExaminationID] = item.CancellationReasonID;
                    if (controller != null && examination != null && reason != null &&
                        (examination.CancellationReason == null || examination.CancellationReason.canrea_ReasonID != item.CancellationReasonID))
                    {
                        controller.AuditValueChangedForExamination("Cancellation reason", item.ExaminationID,
                            examination.CancellationReason != null ? examination.CancellationReason.canrea_Text : "-", reason.canrea_Text);
                    }

                    ExaminationController.CancellationDetails[item.ExaminationID] = item.CancellationReasonComment;
                    if (controller != null && examination != null && examination.exa_CancellationReasonDetails != item.CancellationReasonComment)
                    {
                        controller.AuditValueChangedForExamination("Cancellation details", item.ExaminationID,
                            String.IsNullOrEmpty(examination.exa_CancellationReasonDetails) ? "-" : examination.exa_CancellationReasonDetails, item.CancellationReasonComment);
                    }
                }
            }

            //Clean the task
            task.UpdateWithJsonData(new CancellationReasonTaskData
            {
                List = new List<CancellationReasonData>()
            });
            prep.UpdateTask(task);
        }

        private static void CopyAssignmentsAndSchedule(Order order, ExaminationViewModel examVal, OrderMessageNotificationList notificationList)
        {
            var completedExamination = order.Examinations.FirstOrDefault(x => x.Status.exasta_StatusID == ExaminationStatusValue.Completed && !x.Reports.Any());

            if (completedExamination != null)
            {
                var newExamination = order.Examinations.FirstOrDefault(x => x.exa_ExaminationID == examVal.ExaminationID);
                if (newExamination != null)
                {
                    // Copy schedule
                    CopyExaminationSchedule(completedExamination, newExamination);

                    // Copy Radiologist Examination Assignment
                    CopyExaminationAssignment(completedExamination, newExamination, ExaminationAssignmentTypes.Reporter);

                    // Copy Radiographer Examination Assignment
                    CopyExaminationAssignment(completedExamination, newExamination, ExaminationAssignmentTypes.Radiographer);

                    // Copy Intended Reporter
                    newExamination.IntendedRadiologist = completedExamination.IntendedRadiologist;
                    newExamination.exa_DictatedByRadiologist = true;

                    // Make sure the intended reporter stays the same, put it in notification list
                    notificationList.Data.AssignedRadiologistID = newExamination.IntendedRadiologist.risuse_UserID;
                }
            }
        }

        private static void CopyExaminationSchedule(Examination completedExamination, Examination newExamination)
        {
            var completedSchedule = completedExamination.ActionSchedulings.FirstOrDefault();
            if (!newExamination.ActionSchedulings.Any() && completedSchedule != null)
            {
                // copy the start time, end time, and reason from the completed exam
                var actionScheduling = new ActionScheduling
                {
                    actsch_StartDateTime = completedSchedule.actsch_StartDateTime,
                    actsch_EndDateTime = completedSchedule.actsch_EndDateTime,
                    SchedulingReason = completedSchedule.SchedulingReason
                };

                // use its own resource, otherwise copy from completed exam
                var resource = newExamination.ExaminationType.ExaminationTypeResources.FirstOrDefault();
                actionScheduling.actsch_ResourceID = resource?.exatypres_ResourceID ?? completedSchedule.actsch_ResourceID;

                // use its own action, otherwise copy from completed exam
                var action = newExamination.ExaminationType.ExaminationTypeActions.FirstOrDefault();
                actionScheduling.actsch_ActionID = action?.Action.act_ActionID ?? completedSchedule.actsch_ActionID;

                newExamination.ActionSchedulings.Add(actionScheduling);
            }
        }

        private static void CopyExaminationAssignment(Examination completedExamination, Examination newExamination, ExaminationAssignmentTypes assignmentType)
        {
            var assignmentTypeID = (int)assignmentType;
            var assignedUser = completedExamination.ExaminationAssignments
                .Where(x => x.exaass_RISRoleID == assignmentTypeID)
                .Select(x => x.RISUser)
                .FirstOrDefault();

            if (assignedUser != null &&
                newExamination.ExaminationAssignments.Any(x => x.exaass_RISRoleID == assignmentTypeID) == false)
            {
                newExamination.ExaminationAssignments.Add(new ExaminationAssignment
                {
                    exaass_RISRoleID = assignmentTypeID,
                    exaass_AssigmentExecutor = true,
                    RISUser = assignedUser
                });
            }
        }

        private DateTime GetScheduledDateTime()
        {
            // During importing an order the original scheduled date is selected
            var date = Model.ImportOrderDate.Date;
            var hour = int.Parse(Hours.Value);
            var minutes = int.Parse(Minutes.Value);

            return date.AddHours(hour).AddMinutes(minutes);
        }
        #endregion
    }
}
