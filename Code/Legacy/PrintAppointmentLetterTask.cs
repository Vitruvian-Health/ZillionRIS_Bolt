using System;
using System.Linq;
using System.Web;

using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    public class PrintAppointmentLetterTask : ZillionRisBaseTask 
    {
        public class AppointmentLetterModel
        {
            public string url { get; set; }
        }

        [TaskAction("request")]
        public object PrintAppointmentletter(AppointmentLetterModel model)
        {
            var parameterstring = model.url.Split('?')[1];
            var parameterlist = parameterstring.Split('&');

            var orderId = GetValueOrDefaultByIndex<int?>(parameterlist, 0);
            if (orderId == null)
                throw new Exception("Order not found. Appointment letter can't be printed out.");

            if (RisAppSettings.AppSetting_EditableAppointmentLetter)
            {
                var departmentId = GetValueOrDefaultByIndex<int>(parameterlist, 1);
                var preparationId = GetValueOrDefaultByIndex<int>(parameterlist, 2);
                var patientAddress = HttpUtility.UrlDecode(parameterlist[3].Split('=')[1]);
                var transportId = GetValueOrDefaultByIndex<int>(parameterlist, 4);
                var addressing = GetValueOrDefaultByIndex<bool>(parameterlist, 5);

                if (!Printing.LetterPrinterIsPdf(Context))
                    Printing.PrintAppointmentLetter(orderId.Value, departmentId, preparationId, patientAddress, transportId, addressing, Context, Context.PrinterSettings().LetterPrinterID);

                this.AuditEditableAppointmentLetter(orderId.Value, departmentId, preparationId, patientAddress, transportId, addressing);

                return Printing.LetterPrinterIsPdf(Context);
            }
            else
            {
                if (!Printing.LetterPrinterIsPdf(Context))
                    Printing.PrintAppointmentLetter(orderId.Value, this.Context.User.UserID, this.Context, this.Context.PrinterSettings().LetterPrinterID);

                this.AuditPlainAppointmentLetter(orderId.Value);

                return Printing.LetterPrinterIsPdf(Context);
            }
        }

        private void AuditEditableAppointmentLetter(int orderId, int departmentId, int preparationId, string patientAddress, int transportId, bool addressing)
        {
            var auditor = Context.Get<IAuditor>();
            if (auditor == null)
                throw new ApplicationException("Auditor could not be found.");

            var order = this.Context.DataContext.QueryOrder(orderId);
            var auditContext = new AuditContext { Order = order, Patient = order.Patient };
            var department = this.Context.DataContext.Departments.Where(x => x.dep_DepartmentID == departmentId).Select(x => x.dep_DepartmentName).FirstOrDefault();
            var preparation = preparationId == 0 ? "NoPreparation" : this.Context.DataContext.Preparations.Where(x => x.pre_PreparationID == preparationId).Select(x => x.pre_PreparationTitle).FirstOrDefault();

            string transport;
            switch (transportId)
            {
                case 2:
                    transport = "Transport_ContactGP";
                    break;
                case 3:
                    transport = "Transport_ArrangedByTrust";
                    break;
                default:
                    transport = "Transport_No";
                    break;
            }

            auditor.LogActionByDescription(AuditConstants.Printing, AuditedItems.AppointmentLetter, auditContext, new
            {
                Department = department,
                Preparation = preparation,
                Address = patientAddress,
                Transport = transport,
                AddressingForChildren = addressing
            });
        }

        private void AuditPlainAppointmentLetter(int orderId)
        {
            var auditor = Context.Get<IAuditor>();
            if (auditor == null)
                throw new ApplicationException("Auditor could not be found.");

            var order = this.Context.DataContext.QueryOrder(orderId);
            var auditContext = new AuditContext { Order = order, Patient = order.Patient };

            auditor.LogActionByDescription(AuditConstants.Printing, AuditedItems.AppointmentLetter, auditContext, null);
        }

        private T GetValueOrDefaultByIndex<T>(string[] parameterList, int index)
        {
            var value = parameterList[index].Split('=')[1];

            if (string.IsNullOrEmpty(value))
                return default(T);

            var type = typeof(T);
            if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>))
                return (T)Convert.ChangeType(value, Nullable.GetUnderlyingType(type));

            return (T)Convert.ChangeType(value, type);
        }
    }
}