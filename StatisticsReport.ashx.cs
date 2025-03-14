using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Web;
using System.Web.SessionState;
using CrystalDecisions.Shared;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.Security;
using ZillionRis.Common;
using ZillionRis.Security;

namespace Rogan.ZillionRis.Website
{
    /// <summary>
    /// Summary description for StatisticsReport
    /// </summary>
    public class StatisticsReport : IHttpHandler, IReadOnlySessionState
    {
        /// <summary>
        /// 	Enables processing of HTTP Web requests by a custom HttpHandler that implements the <see cref = "T:System.Web.IHttpHandler" /> interface.
        /// </summary>
        /// <param name = "context">An <see cref = "T:System.Web.HttpContext" /> object that provides references to the intrinsic server objects (for example, Request, Response, Session, and Server) used to service HTTP requests.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-05-11.</para>
        /// </remarks>
        public void ProcessRequest(HttpContext context)
        {
            context.ValidateUserIsLoggedIn();

            SecurityHelper.ValidatePageAccess(UserPermissions.PageStatistics);

            var reportName = context.Request.QueryString["reportName"];
            var isCsv = bool.TryParse(context.Request.QueryString["csv"], out var csv) && csv;

            if (isCsv)
            {
                ExportToCsv(context, reportName);
            }
            else
            {
                PrintToPdf(context, reportName);
            }
        }

        private static void ExportToCsv(HttpContext context, string reportName)
        {
            var parameters = PrepareParameters(context);
            var alphaNumReportName = string.Concat(reportName.Where(c => char.IsLetterOrDigit(c)));
            var filename = string.Format("Statistics-{0}-{1:yyyyMMddTHHmmss}.csv", alphaNumReportName, DateTime.Now);
            var content = ZillionRisReports.GetTextFromStoredProcedure(reportName, parameters);

            //context.Response.Clear();
            context.Response.ContentType = "text/plain";
            context.Response.StatusCode = 200;
            context.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + filename + "\";");
            context.Response.Write(content);
            context.Response.Flush();
        }

        private static void PrintToPdf(HttpContext context, string reportName)
        {
            var parameters = PrepareParameters(context);

            var alphaNumReportName = string.Concat(reportName.Where(c => char.IsLetterOrDigit(c)));
            var filename = string.Format("Statistics-{0}-{1:yyyyMMddTHHmmss}", alphaNumReportName, DateTime.Now);
            using (
                var document =
                    ZillionRisReports.LoadReportDocumentFromDatabase(RisApplication.Current.GetSessionContext(),
                        reportName, parameters))
            {
                document.ExportToHttpResponse(ExportFormatType.PortableDocFormat, context.Response, false, filename);
            }

            context.Response.ContentType = "application/pdf";
            context.Response.StatusCode = 200;
            context.Response.Flush();
        }

        private static Dictionary<string, object> PrepareParameters(HttpContext context)
        {
            var startPeriod = context.Request.QueryString["startPeriod"];
            var endPeriod = context.Request.QueryString["endPeriod"];
            var modalityID = context.Request.QueryString["modalityId"];
            var modalityTypeID = context.Request.QueryString["modalityTypeId"];
            var date = context.Request.QueryString["date"];
            var lang = context.Request.QueryString["lang"];
            var startExaminationStatus = context.Request.QueryString["startExaminationStatus"];
            var endExaminationStatus = context.Request.QueryString["endExaminationStatus"];
            var radiologistID = context.Request.QueryString["RadiologistID"];
            var locationID = context.Request.QueryString["LocationID"];

            var parameters = new Dictionary<string, object>();
            if (startPeriod != null)
                parameters.Add("@StartPeriod", Convert.ToDateTime(startPeriod, CultureInfo.InvariantCulture));
            if (endPeriod != null)
                parameters.Add("@EndPeriod", Convert.ToDateTime(endPeriod, CultureInfo.InvariantCulture));
            if (modalityID != null)
                parameters.Add("@ModalityId", modalityID);
            if (modalityTypeID != null)
                parameters.Add("@ModalityTypeId", modalityTypeID);
            if (date != null)
                parameters.Add("@Date", Convert.ToDateTime(date, CultureInfo.InvariantCulture));
            if (!string.IsNullOrEmpty(lang))
                parameters.Add("lang", lang);
            if (startExaminationStatus != null)
                parameters.Add("@StartExaminationStatus", startExaminationStatus);
            if (endExaminationStatus != null)
                parameters.Add("@EndExaminationStatus", endExaminationStatus);
            if (radiologistID != null)
                parameters.Add("@RadiologistID", radiologistID);

            // do not add location if it is null, not every stored procedure needs it
            if (locationID != null)
            {
                parameters.Add("@LocationID", locationID);
            }
            
            return parameters;
        }

        /// <summary>
        /// 	Gets a value indicating whether another request can use the <see cref = "T:System.Web.IHttpHandler" /> instance.
        /// </summary>
        /// <returns>true if the <see cref = "T:System.Web.IHttpHandler" /> instance is reusable; otherwise, false.
        /// </returns>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-05-11.</para>
        /// </remarks>
        public bool IsReusable
        {
            get { return true; }
        }
    }
}