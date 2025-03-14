using System;
using System.Collections.Specialized;
using System.Linq;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class UpdateOrderTaskRequest// : RisDataRequestBase
    {
        private static Guid? TryGuid(string input)
        {
            return string.IsNullOrEmpty(input) ? (Guid?) null : new Guid(input);
        }

        public object Execute(string[] parameters, NameValueCollection form)
        {
            //string orderIDText = parameters[0];
            //int orderID = orderIDText == "new" ? 0 : Convert.ToInt32(orderIDText);

            //var notificationList = new OrderMessageNotificationList();
            //using (var transaction = TransactionFactory.CreateNewWriteScope())
            //{
            //    OrderEditController order = new OrderEditController();
            //    order.Database = DataContext;
            //    order.OrderID = orderID;
            //    if (orderID != 0)
            //        order.LoadFromDatabase();

            //    var orderForm = new
            //                        {
            //                            InitialsID = TryFormGuid(form, "InitialsID"),
            //                            //PhysicianID = TryFormGuid(form, "PhysicianID"),
            //                            ReferralID = TryFormGuid(form, "ReferralID"),
            //                            UrgencyID = TryFormInt32(form, "UrgencyID")
            //                        };
            //    string[] strings1 = form.GetValues("ExaminationID");
            //    string[] strings2 = form.GetValues("ExaminationTypeID");
            //    string[] strings3 = form.GetValues("ExaminationLaterality");
            //    string[] strings4 = form.GetValues("ExaminationStatus");
            //    var lengths = new int[] {strings1.Length, strings2.Length, strings3.Length, strings4.Length};
            //    if (lengths.All(item => item == strings1.Length) == false)
            //    {
            //        throw new Exception("FORM INVALID !!!!");
            //    }
            //    var examinations2 = strings1
            //        .Select((s, i) =>new
            //                    {
            //                        ExaminationID = TryGuid(strings1[i]),
            //                        ExaminationTypeID = TryGuid(strings2[i]),
            //                        Laterality = strings3[i],
            //                        Status = TryInt32(strings4[i])
            //                    });

            //    if (orderForm.InitialsID.HasValue)
            //    {
            //        notificationList.UserID = orderForm.InitialsID.Value;
            //    }
                
            //    order.SaveToDatabase();

            //    var examinations = new ExaminationEditController(DataContext);
            //    examinations.OrderMessageNotifier = notificationList;
            //    examinations.OrderID = orderID;
            //    examinations.LoadFromOrder();

            //    foreach (var exam in examinations2)
            //    {
            //        ExaminationViewModel exam2 = examinations.ViewModels.FirstOrDefault(item => item.ExaminationID == exam.ExaminationID);
            //        if (exam2 == null)
            //        {
            //            exam2 = new ExaminationViewModel();
            //            examinations.ViewModels.Add(exam2);
            //        }

            //        exam2.ExaminationTypeID = exam.ExaminationTypeID.Value;
            //        exam2.ExaminationStatusID = exam.Status.Value;
            //    }

            //    examinations.SaveToOrder(orderForm.InitialsID.Value);

            //    DataContext.SaveChanges();
            //    transaction.Complete();
            //}

            //notificationList.Send();
            return true;
        }

        private static Guid? TryFormGuid(NameValueCollection form, string name)
        {
            return TryGuid(form.GetValues(name).FirstOrDefault());
        }
        private static Int32? TryInt32(string firstOrDefault)
        {
            return string.IsNullOrEmpty(firstOrDefault) ? (Int32?)null : Convert.ToInt32(firstOrDefault);
        }
        private static Int32? TryFormInt32(NameValueCollection form, string name)
        {
            return TryInt32(form.GetValues(name).FirstOrDefault());
        }
    }
}