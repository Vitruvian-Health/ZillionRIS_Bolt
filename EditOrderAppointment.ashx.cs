using System;
using System.Collections.Generic;
using System.Web;
using System.Web.SessionState;

using CrystalDecisions.Shared;

using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.Security;
using ZillionRis.Common;

namespace Rogan.ZillionRis.Website
{
    public static class HttpRequestExtensions
    {
        public static T GetParameterOrDefault<T>(this HttpRequest request, string value)
        {
            var val = request[value];
            if (string.IsNullOrEmpty(val))
                return default(T);

            return (T)Convert.ChangeType(val, typeof(T));
        }
    }

    /// <summary>
    /// Summary description for EditOrderAppointment
    /// </summary>
    public class EditOrderAppointment : IHttpHandler, IReadOnlySessionState
    {
        public void ProcessRequest(HttpContext context)
        {
            context.ValidateUserIsLoggedIn();

            int orderID = context.Request.GetParameterOrDefault<int>("OrderID");
            string patientAddress = context.Request.GetParameterOrDefault<string>("PatientAddress");
            int departmentID = context.Request.GetParameterOrDefault<int>("Department");
            int preparationID = context.Request.GetParameterOrDefault<int>("Preparation");
            int transportID = context.Request.GetParameterOrDefault<int>("Transport");           
            bool addressing = context.Request.GetParameterOrDefault<bool>("Addressing");

            context.Response.ContentType = "application/pdf";
            context.Response.StatusCode = 200;

            var parameters = new Dictionary<string, object>();
            parameters.Add("OrderID", orderID);
            parameters.Add("PatientAddress", patientAddress);
            parameters.Add("DepartmentID", departmentID);
            parameters.Add("PreparationID", preparationID);
            parameters.Add("Transport", transportID);
            parameters.Add("Addressing", addressing);

            using (var document = ZillionRisReports.LoadReportDocumentFromDatabase(RisApplication.Current.GetSessionContext(), "EditAppointment", parameters))
                    document.ExportToHttpResponse(ExportFormatType.PortableDocFormat, context.Response, false, string.Format("EditAppointment-{0}", patientAddress));
            
            context.Response.Flush();
        }

        public bool IsReusable
        {
            get
            {
                return true;
            }
        }
    }
}