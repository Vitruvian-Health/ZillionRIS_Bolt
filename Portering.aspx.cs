using System;
using System.Linq;
using System.Text;
using System.Web.UI;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Business.Communication;
using Rogan.ZillionRis.Codes.ExaminationStatus;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Infrastructure;
using Rogan.ZillionRis.WebControls.Extensibility;
using Rogan.ZillionRis.Website.App_GlobalResources;
using ZillionRis.Controls;

namespace ZillionRis
{
    public class Portering : PageBase, IPostBackEventHandler
    {
        private readonly StringBuilder _scripting = new StringBuilder();

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
            get { return UserPermissions.PagePortering; }
        }

        /// <summary>
        /// 	Gets the page access key.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-08.</para>
        /// </remarks>
        public override string RisAccessKey
        {
            get { return PageAccessKey.PagePortering; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.PagePortering; }
        }
        #endregion

        #region ASP.NET Life Cycle
        protected void Page_Load(object sender,
                                    EventArgs e)
        {
        }

        protected override void OnInit(EventArgs e)
        {
            base.OnInit(e);

            this.RegisterPagePostBackScript();
            this.Master.ScriptManager.RegisterAsyncPostBackControl(this);
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

        public void RefreshWorkList()
        {
            _scripting.Append("refresh();");
        }

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

                this.ExecutePostBackCommand(command, argument);
            }
            catch (Exception ex)
            {
                this.GlobalPopup.ShowErrorMessage(WebResources.General_UnexpectedError, ex);
            }
        }

        private void ExecutePostBackCommand(string command,
                                            string argument)
        {
            switch (command)
            {
                case "portering.transport-to-rad":
                    this.TransportToTechnician(Convert.ToInt32(argument));
                    break;

                case "portering.transport-from-rad":
                    this.TransportFromTechnician(Convert.ToInt32(argument));
                    break;

                case "portering.cancel-transport":
                    this.CancelPortering(Convert.ToInt32(argument));
                    break;

                default:
                    throw new NotSupportedException(String.Format(WebResources.General_RequestedCommandUnknown, command));
            }
        }

        /// <summary>
        /// Any scheduled examination that is currently in transported status can be transported back.
        /// First it will create a new transport item with transporting status.
        /// Then it will change from transporting to transported status and that result in a examination status change (from scheduled to in department).
        /// </summary>
        /// <param name="examinationID"></param>
        private void TransportFromTechnician(int examinationID)
        {
            var exam = this.SessionContext.DataContext.QueryExamination(examinationID);
            if (exam.Status.exasta_StatusID == ExaminationStatusValue.Scheduled)
            {
                this.GlobalPopup.ShowInfoMessage("Transport From Techinician is not possible for examinations with status scheduled.");
                return;
            }
            
            if (exam.ExaminationPorterings.Any())
            {
                var portering = exam.ExaminationPorterings.OrderByDescending(item => item.exapor_CreationTime).First();
                switch (portering.exapor_Status)
                {
                    case (int)TransportingStatus.Transported:
                        // If a Transported examination has been completed, the Trasporting Status is "WaitingBack"
                        if (exam.Status.exasta_StatusID != ExaminationStatusValue.Completed)
                            this.GlobalPopup.ShowInfoMessage("Transport Back from Techinician is only possible for examinations with status completed.");

                        var porterItem = new ExaminationPortering
                        {
                            exapor_CreationTime = DateTime.Now,
                            exapor_Status = (int)TransportingStatus.TransportingBack,
                            Examination = exam,
                            User = this.SessionContext.DataContext.QueryUser(this.CurrentUserID)
                        };
                        exam.ExaminationPorterings.Add(porterItem);
                        break;
                    case (int)TransportingStatus.TransportingBack:
                        if (portering.User.risuse_UserID != this.CurrentUserID)
                        {
                            this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToComplete_AnotherUser);
                            return;
                        }
                        portering.exapor_Status = (int) TransportingStatus.TransportCompleted;
                        break;
                    default:
                        this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToComplete);
                        return;
                }

                this.SessionContext.DataContext.SaveChanges();
                this.RefreshWorkList();
            }
            else
            {
                this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToComplete);
            }
        }

        /// <summary>
        ///  Cancel a transport initiated by the current user.
        ///  It can cancel a transport to the Radiographer (Technician) or a transport back.
        /// </summary>
        /// <param name="examinationID"></param>
        private void CancelPortering(int examinationID)
        {
            var exam = this.SessionContext.DataContext.QueryExamination(examinationID);
            if (exam.ExaminationPorterings.Any())
            {
                var portering = exam.ExaminationPorterings.OrderByDescending(item => item.exapor_CreationTime).First();
                if (portering.User.risuse_UserID != this.CurrentUserID)
                {
                    this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToCancel_AnotherUser);
                    return;
                }

                if (portering.exapor_Status == (int)TransportingStatus.Transporting ||
                    portering.exapor_Status == (int)TransportingStatus.TransportingBack)
                {
                    this.SessionContext.DataContext.ExaminationPorterings.Remove(portering);
                    this.SessionContext.DataContext.SaveChanges();
                    this.RefreshWorkList();
                }
                else
                {
                    this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToCancel);
                }
            }
            else
            {
                this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToCancel);
            }
        }

        private void TransportToTechnician(int examinationID)
        {
            var exam = this.SessionContext.DataContext.QueryExamination(examinationID);
            if (exam.Status.exasta_StatusID != ExaminationStatusValue.Scheduled)
            {
                this.GlobalPopup.ShowInfoMessage("Transport To Techinician is only possible for examinations with status scheduled.");
                return;
            }
            
            var porterItemToRad = exam.ExaminationPorterings.FirstOrDefault();
            if (porterItemToRad == null)
            {
                var porterItem = new ExaminationPortering
                {   
                    exapor_CreationTime = DateTime.Now, 
                    exapor_Status = (int)TransportingStatus.Transporting,
                    Examination = exam,
                    User = this.SessionContext.DataContext.QueryUser(this.CurrentUserID)
                };

                this.SessionContext.DataContext.ExaminationPorterings.Add(porterItem);
                this.SessionContext.DataContext.SaveChanges();
            }            
            else if (porterItemToRad.exapor_Status == (int)TransportingStatus.Waiting)
            {
                porterItemToRad.exapor_Status = (int)TransportingStatus.Transporting;
                this.SessionContext.DataContext.SaveChanges();
            }
            // Using the same command second time will Finish transporting
            else if (porterItemToRad.exapor_Status == (int)TransportingStatus.Transporting)
            {
                if (porterItemToRad.User.risuse_UserID == this.CurrentUserID)
                {
                    var notificationList = new OrderMessageNotificationList(this.SessionContext);
                    notificationList.UserID = this.SessionContext.User.UserID;

                    var statusChange = new ChangeExaminationStatusController();
                    statusChange.Database = this.SessionContext.DataContext;
                    statusChange.ValidExaminationStatusID = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.Scheduled);
                    statusChange.NewExaminationStatusID = ExaminationStatusValue.FromDatabase(ExaminationStatusValue.InDepartment);
                    statusChange.Examinations = new[] {examinationID};
                    statusChange.AssignedUsers = new[] { this.SessionContext.User.UserID };
                    statusChange.ExecutorUserID = this.SessionContext.User.UserID;
                    statusChange.OrderMessageNotifier = notificationList;
                    statusChange.LoadFromDatabase();
                    statusChange.Execute();

                    notificationList.TrySend();

                    // TODO: Audit!

                    porterItemToRad.exapor_Status = (int) TransportingStatus.Transported;
                    this.SessionContext.DataContext.SaveChanges();
                }
                else
                {
                    this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToComplete);
                }
            }
            else
            {
                this.GlobalPopup.ShowInfoMessage(WebResources.Portering_UnableToComplete);
            }

            RefreshWorkList();
        }
    }
}
