using System.Collections.Generic;
using System.Web;
using System.Web.SessionState;

using CrystalDecisions.Shared;

using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Reporting.Core;
using Rogan.ZillionRis.Security;
using ZillionRis.Common;
using ZillionRis.Security;

namespace ZillionRis
{
    /// <summary>
    /// 	Summary description for OrderAppointment
    /// </summary>
    public sealed class OrderAppointment : IHttpHandler, IReadOnlySessionState 
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

            int orderID;
            var lang = context.Request.QueryString["lang"];
            if (int.TryParse(context.Request.QueryString["OrderID"], out orderID) == false)
            {
                context.Response.ContentType = "text/plain";
                context.Response.StatusCode = 400;

                context.Response.Write("Order ID unspecified.");
                context.Response.End();
                return;
            }

            context.Response.ContentType = "application/pdf";
            context.Response.StatusCode = 200;

            var parameters = new Dictionary<string, object>();
            if (orderID != 0)
                parameters.Add(@"@OrderId", orderID);
            if (!string.IsNullOrEmpty(lang))
                parameters.Add("lang", lang);

            using (var document = ZillionRisReports.LoadReportDocumentFromDatabase(RisApplication.Current.GetSessionContext(), "OrderAppointment", parameters))
                document.ExportToHttpResponse(ExportFormatType.PortableDocFormat, context.Response, false, string.Format("Appointment-{0}", orderID));
            context.Response.Flush();
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
