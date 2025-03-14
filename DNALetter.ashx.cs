using CrystalDecisions.Shared;
using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Reporting.Core;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading;
using System.Web;
using System.Web.SessionState;
using Rogan.ZillionRis.Security;
using ZillionRis.Common;
using ZillionRis.Security;

namespace Rogan.ZillionRis.Website
{
    /// <summary>
    /// Summary description for DNALetter
    /// </summary>
    public class DNALetter : IHttpHandler, IReadOnlySessionState
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
                lang = CultureInfo.CurrentCulture.TwoLetterISOLanguageName;

            context.Response.ContentType = "application/pdf";
            context.Response.StatusCode = 200;

            var parameters = new Dictionary<string, object>();
            parameters.Add(@"lang", lang);
            parameters.Add(@"@OrderId", orderID);

            using (var document1 = ZillionRisReports.LoadReportDocumentFromDatabase(RisApplication.Current.GetSessionContext(), "DNALetter", parameters))
            {
                try
                {
                    document1.ExportToHttpResponse(ExportFormatType.PortableDocFormat, context.Response, false, string.Format("Report-{0}", orderID));
                }
                catch (ThreadAbortException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    const string msg = "Error loading DNALetter PDF from the database for language {0} and order {1}";
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