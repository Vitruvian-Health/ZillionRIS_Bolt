using CrystalDecisions.Shared;
using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Reporting.Core;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Web;
using System.Web.SessionState;
using Rogan.ZillionRis.Security;
using ZillionRis.Common;
using ZillionRis.Security;

namespace Rogan.ZillionRis.Website
{
    /// <summary>
    /// Summary description for PatientLabel
    /// </summary>
    public class PatientLabel : IHttpHandler, IReadOnlySessionState
    {
        public void ProcessRequest(HttpContext context)
        {
            context.ValidateUserIsLoggedIn();

            SecurityHelper.ValidatePageAccess(UserPermissions.PrintReport);

            int orderID;
            if (int.TryParse(context.Request.QueryString["order"], out orderID) == false)
            {
                context.Response.ContentType = "text/plain";
                context.Response.StatusCode = 400;

                context.Response.Write("Order ID unspecified.");
                context.Response.End();
                return;
            }

            var lang = context.Request.QueryString["lang"];
            if (string.IsNullOrEmpty(lang))
            {
                lang = CultureInfo.CurrentCulture.TwoLetterISOLanguageName;
            }

            context.Response.ContentType = "application/pdf";
            context.Response.StatusCode = 200;

            var parameters = new Dictionary<string, object>();
            parameters.Add(@"lang", lang);
            parameters.Add(@"@OrderId", orderID);

            // SecondCopy parameter use for printing reports
            parameters.Add(@"@SecondCopy", false);

            using (var document = ZillionRisReports.LoadReportDocumentFromDatabase(RisApplication.Current.GetSessionContext(), "PatientLabel", parameters))
            {
                try
                {
                    document.ExportToHttpResponse(ExportFormatType.PortableDocFormat, context.Response, false,
                        string.Format("Report-{0}", orderID));
                }
                catch (Exception ex)
                {
                    const string msg = "Error loading ParientLabel for language {0}, order {1}";
                    ZillionRisLog.Default.Error(string.Format(msg, lang, orderID), ex);
                }
            }
            context.Response.Flush();
        }

        public bool IsReusable
        {
            get { return true; }
        }
    }
}