using CrystalDecisions.Shared;
using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.EntityData;
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

namespace ZillionRis
{
    /// <summary>
    /// 	Summary description for OrderDisplay
    /// </summary>
    public sealed class OrderDisplay : IHttpHandler, IReadOnlySessionState
    {
        /// <summary>
        /// Enables processing of HTTP Web requests by a custom HttpHandler that implements the <see cref="T:System.Web.IHttpHandler"/> interface.
        /// </summary>
        /// <param name="context">An <see cref="T:System.Web.HttpContext"/> object that provides references to the intrinsic server objects (for example, Request, Response, Session, and Server) used to service HTTP requests.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-05-11.</para>
        /// </remarks>
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

            bool secondCopy;
            if (bool.TryParse(context.Request.QueryString["copyTo"], out secondCopy) == false)
            {
                secondCopy = false;
            }

            context.Response.ContentType = "application/pdf";
            context.Response.StatusCode = 200;

            var parameters = new Dictionary<string, object>();
            parameters.Add(@"Overlap", String.Empty);
            parameters.Add(@"lang", lang);
            parameters.Add(@"@OrderId", orderID);
            parameters.Add(@"@SecondCopy", secondCopy);

            var sessionContext = RisApplication.Current.GetSessionContext();
            using (var document = ZillionRisReports.LoadReportDocumentFromDatabase(sessionContext, "OrderDisplay", parameters))
            {
                try
                {
                    AuditConcerns.AuditPrintAction(sessionContext, AuditedItems.ExaminationReport, orderID);
                    document.ExportToHttpResponse(ExportFormatType.PortableDocFormat, context.Response, false, string.Format("Report-{0}", orderID));
                }
                catch (Exception ex)
                {
                    const string msg = "Error loading OrderDisplay PDF from the database for language {0} and order {1}";
                    ZillionRisLog.Default.Error(string.Format(msg, lang, orderID), ex);
                }
            }
           context.Response.Flush();
        }

        /// <summary>
        /// Gets a value indicating whether another request can use the <see cref="T:System.Web.IHttpHandler"/> instance.
        /// </summary>
        /// <returns>true if the <see cref="T:System.Web.IHttpHandler"/> instance is reusable; otherwise, false.
        ///   </returns>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-05-11.</para>
        /// </remarks>
        public bool IsReusable
        {
            get { return true; }
        }
    }
}
