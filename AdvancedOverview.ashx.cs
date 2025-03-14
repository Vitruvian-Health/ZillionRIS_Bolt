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
using Rogan.ZillionRis.Website.App_GlobalResources;
using ZillionRis.Common;
using ZillionRis.Security;

namespace ZillionRis
{
    /// <summary>
    /// Summary description for AdvancedOverview
    /// </summary>
    public sealed class AdvancedOverview : IHttpHandler, IReadOnlySessionState 
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

            SecurityHelper.ValidatePageAccess(UserPermissions.PageAdvancedFilter);

            var searchItemText = context.Request.QueryString["item"];
            var searchValueText = context.Request.QueryString["value"];
            var dateFromText = context.Request.QueryString["from"];
            var dateToText = context.Request.QueryString["to"];
            var locationIDText = context.Request.QueryString["location"];
            var lang = context.Request.QueryString["lang"];

            DateTime dateFrom;
            if (DateTime.TryParse(dateFromText, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out dateFrom) == false)
            {
                context.Response.ContentType = "text/plain";
                context.Response.StatusCode = 400;

                context.Response.Write(WebResources.AdvancedOverview_DateFromUnspecified);
                context.Response.End();
                return;
            }

            DateTime dateTo;
            if (DateTime.TryParse(dateToText, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out dateTo) == false)
            {
                context.Response.ContentType = "text/plain";
                context.Response.StatusCode = 400;

                context.Response.Write(WebResources.AdvancedOverview_DateToUnspecified);
                context.Response.End();
                return;
            }

            int locationID;
            try
            {
                locationID = Convert.ToInt32(locationIDText);
            }
            catch
            {
                context.Response.ContentType = "text/plain";
                context.Response.StatusCode = 400;

                context.Response.Write(WebResources.AdvancedOverview_InvalidLocationID);
                context.Response.End();
                return;
            }
            if (string.IsNullOrEmpty(lang))
                lang = CultureInfo.CurrentCulture.TwoLetterISOLanguageName;

            context.Response.ContentType = "application/pdf";
            context.Response.StatusCode = 200;

            var parameters = new Dictionary<string, object>();

            // Report Filter.
            parameters.Add(@"@SearchItem", searchItemText);
            parameters.Add(@"@SearchValue", searchValueText);
            parameters.Add(@"@DateFrom", dateFrom);
            parameters.Add(@"@DateTo", dateTo);
            parameters.Add(@"@LocationID", locationID.ToString(CultureInfo.InvariantCulture));

            char[] tmpSearchType = searchItemText.ToCharArray();
            string finalSearchType = searchItemText;
            for (int i = 0; i < tmpSearchType.Count(); i++)
            {
                if (tmpSearchType[i].ToString(CultureInfo.InvariantCulture) == "_")
                {
                    finalSearchType = searchItemText.Remove(0, i + 1);
                    break;
                }
            }

            // Report Settings / Column Headers.

            //TODO: Parse variables through the resources table
            parameters.Add(@"lang", lang);
            parameters.Add(@"@SearchItemColumnName", finalSearchType);
            parameters.Add(@"@actsch_StartDateTimeColumnName", WebResources.Column_Examinations_ScheduleDateTime);
            parameters.Add(@"@roo_RoomNameColumnName", WebResources.roo_RoomName);
            parameters.Add(@"@pat_DateOfBirthColumnName", WebResources.pat_DateOfBirth);
            parameters.Add(@"@pat_PatientNumberColumnName", WebResources.pat_PatientNumber);
            parameters.Add(@"@pat_PatientNameColumnName", WebResources.pat_PatientName);
            parameters.Add(@"@gen_GenderNameColumnName", WebResources.gen_GenderName);
            parameters.Add(@"@exatyp_ExaminationTypeNameColumnName", WebResources.exatyp_ExaminationTypeName);
            parameters.Add(@"@ref_ReferringPhysicianNameColumnName", WebResources.ref_ReferringPhysicianName);
            parameters.Add(@"@reftyp_ReferralTypeNameColumnName", WebResources.reftyp_ReferralTypeName);
            parameters.Add(@"@ref_IndendedRadiologistNameColumnName", WebResources.PatientSearch_IntendedReporter);

            string filename = string.Format("Overview-{0}-{1:yyyyMMddTHHmmss}", searchItemText, DateTime.Now);
            using (var document = ZillionRisReports.LoadReportDocumentFromDatabase(RisApplication.Current.GetSessionContext(), "AdvancedOverview", parameters))
                document.ExportToHttpResponse(ExportFormatType.PortableDocFormat, context.Response, false, filename);

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