using System.Collections.Generic;
using System.Linq;
using DelftDI.Common.RIS.Utilities;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Business.Communication;
using Rogan.ZillionRis.Business.Planning;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Reporting.Core;

namespace ZillionRis.Code.Common
{
    /// <summary>
    /// 	Provides methods that wrap common business functionality used in the web site.
    /// </summary>
    /// <remarks>
    /// 	<para>Created by TdGroen at 2011-04-05.</para>
    /// </remarks>
    public static class ZillionRisBusiness
    {
        #region Direct Methods
        /// <summary>
        /// 	Changes the examination status.
        /// </summary>
        /// <param name = "sessionContext">The session context.</param>
        /// <param name = "originalStatus">The original status.</param>
        /// <param name = "targetStatus">The target status.</param>
        /// <param name = "examinationIDArray">The examination ID array.</param>
        /// <remarks>
        /// 	<para>Created by TdGroen at 2011-04-05.</para>
        /// </remarks>
        public static void ChangeExaminationStatus(ISessionContext sessionContext,
                                                   Urn originalStatus,
                                                   Urn targetStatus,
                                                   params int[] examinationIDArray)
        {
            var controller = new ChangeExaminationStatusController();
            var notificationList = new OrderMessageNotificationList(sessionContext);
            notificationList.UserID = sessionContext.User.UserID;

            controller.OrderMessageNotifier = notificationList;
            controller.Database = sessionContext.DataContext;
            controller.AssignedUsers = null;
            controller.ReuseAssignedUsers = true;
            controller.NewExaminationStatusID = targetStatus;
            controller.ValidExaminationStatusID = originalStatus;
            controller.ThrowOnInvalidStatus = false;
            controller.Examinations = examinationIDArray;
            controller.ExecutorUserID = sessionContext.User.UserID;
            controller.LoadFromDatabase();
            controller.Execute();

            notificationList.TrySend();
        }

        /// <summary>
        /// 	Changes the order status.
        /// </summary>
        /// <param name = "sessionContext">The session context.</param>
        /// <param name = "originalStatus">The original status.</param>
        /// <param name = "targetStatus">The target status.</param>
        /// <param name = "orderID">The order ID.</param>
        /// <remarks>
        /// 	<para>Created by TdGroen at 2011-04-05.</para>
        /// </remarks>
        public static void ChangeOrderStatus(ISessionContext sessionContext,
                                             Urn originalStatus,
                                             Urn targetStatus,
                                             int orderID)
        {
            var controller = new ChangeExaminationStatusController();
            var notificationList = new OrderMessageNotificationList(sessionContext);
            notificationList.UserID = sessionContext.User.UserID;

            controller.OrderMessageNotifier = notificationList;
            controller.Database = sessionContext.DataContext;
            controller.AssignedUsers = null;
            controller.ReuseAssignedUsers = true;
            controller.ValidExaminationStatusID = originalStatus;
            controller.NewExaminationStatusID = targetStatus;
            controller.ThrowOnInvalidStatus = false;
            controller.ExecutorUserID = sessionContext.User.UserID;
            controller.AssignOrder(orderID);
            controller.LoadFromDatabase();
            controller.Execute();

            notificationList.TrySend();
        }

        public static void MoveOverlappingAppointments(ISessionContext sessionContext, IEnumerable<int> examinationIDs)
        {
            var moveOverlappingAppointments = new MoveOverlappingAppointmentsTask();
            moveOverlappingAppointments.SessionContext = sessionContext;
            moveOverlappingAppointments.ExaminationIDs = examinationIDs;
            moveOverlappingAppointments.Execute();

            var print = new PrintExaminationAppointmentConfirmations();
            print.DataContext = sessionContext.DataContext;
            print.ExaminationIDs = moveOverlappingAppointments.ScheduleResults.Select(item => item.ExaminationID);
            print.Print(sessionContext);
        }
        #endregion
    }
}
