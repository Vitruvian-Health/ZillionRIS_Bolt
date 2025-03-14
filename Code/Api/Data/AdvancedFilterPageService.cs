using System;
using System.Collections.Generic;
using System.Linq;
using DelftDI.Common.RIS.Common;
using DelftDI.Common.RIS.Utilities;
using Newtonsoft.Json;
using Rogan.ZillionRis.Codes.ExaminationStatus;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.EntityData.SimpleDataQuery;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.ViewModels;
using Rogan.ZillionRis.Web.Reflection;
using Rogan.ZillionRis.Website.App_GlobalResources;
using ZillionRis.Common;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class AdvancedFilterPageService : ZillionRisBaseTask 
    {
        public override IEnumerable<string> RequiredPermissions => new[] { UserPermissions.PageAdvancedFilter };

        public class AdvancedFilterResultViewModel
        {
            public string ExaminationDisplayName
            {
                get
                {
                    if (ExaminationLaterality != null)
                        return $"{exatyp_ExaminationTypeName} ({ExaminationLaterality})";

                    return exatyp_ExaminationTypeName;
                }
            }

            public string ExaminationLaterality { get; set; }
            public DateTimeOffset? actsch_StartDateTime { get; set; }
            public int ExaminationID { get; set; }
            public string exatyp_ExaminationTypeName { get; set; }
            public string gen_GenderName { get; set; }
            public string pat_PatientName { get; set; }
            public DateTimeOffset? DateOfBirth { get; set; }
            public string PatientNameFilter { get; set; }
            public string pat_PatientNumber { get; set; }
            public string ref_ReferringPhysicianName { get; set; }
            public bool ref_RequestingMailbox { get; set; }
            public string ref_SecondCopyPhysicianName { get; set; }
            public bool? ref_SecondCopyMailbox { get; set; }
            public string reftyp_ReferralTypeName { get; set; }
            public string roo_RoomName { get; set; }
            public bool HasOrderRequestForms { get; set; }
            public bool HasReport { get; set; }
            public int ord_OrderID { get; set; }
            public int PatientID { get; set; }
            public string OrderNumber { get; set; }

            [JsonIgnore]
            public string IntendedReporterName { get; set; }

            public bool IntendedReporterOnLeave { get; set; }

            public string IntendedReportedText
            {
                get { return IntendedReporterOnLeave ? IntendedReporterName + " (On Vacation)" : IntendedReporterName; }
            }

            public string RadiologistAndAuthorNames
            {
                get
                {
                    var radiologistAndAuthorNames = RadiologistNames.Union(AuthorNames);
                    return radiologistAndAuthorNames.JoinText("; ");
                }
            }

            public string[] RadiologistNames { get; set; }
            public string[] AuthorNames { get; set; }

            public DateTimeOffset? AuthorisationDate { get; set; }

            public string RegularDictationStatus { get; set; }

            public string[] ReportStatusIDs { get; set; }

            public string ReportStatusText
            {
                get { return string.Join("; ", ReportStatusIDs.Select(FilterHelpers.GetReportName).Distinct().ToArray()); }
            }

            #region Examination Status
            public string StatusID
            {
                get { return StatusUrn.Specification; }
            }

            public string ExaminationStatusName
            {
                get { return ExaminationStatusValueExtensions.ToString(StatusDBID); }
            }

            [JsonIgnore]
            public Urn StatusUrn
            {
                get { return ExaminationStatusValue.FromDatabase(StatusDBID); }
            }

            [JsonIgnore]
            private string _statusDBID;
            public string StatusDBID
            {
                get
                {
                    return _statusDBID;
                }
                set
                {
                    _statusDBID = value;
                    if (HasReport)
                    {
                        if (_statusDBID == ExaminationStatusValue.Completed)
                            _statusDBID = ExaminationStatusValue.Authorised;
                    }
                }
            }
            #endregion

            public string ModalityTypeName { get; set; }

            public string PatientCategoryName { get; set; }

            public string Specialty { get; set; }

            public string UrgencyID { get; set; }
            public string UrgencyName { get; set; }
            public int UrgencySortIndex { get; set; }
            public bool HasProtocol { get; set; }
        }

        public class Criteria
        {
            public string SearchValue { get; set; }
            public string SearchType { get; set; }

            public int ModalityTypeID { get; set; }
            public int PatientCategoryID { get; set; }
            public DateTimeOffset SearchFromDate { get; set; }
            public DateTimeOffset SearchToDate { get; set; }
            public int FunctionSpecialisationID { get; set; }
            public int LocationID { get; set; }
            public string ReportStatusID { get; set; }
            public bool MailboxNumberCheck { get; set; }
            public bool UseAuthorisationDate { get; set; }
        }

        /// <summary>
        ///     Updates the filter.
        /// </summary>
        /// <param name="criteria"></param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2011-01-26.</para>
        /// </remarks>
        private IEnumerable<AdvancedFilterResultViewModel> BuildExaminationFilter(Criteria criteria)
        {
            var expressions = new List<string>();
            var parameters = new List<Tuple<string, object>>();

            var addPlain = new Action<string>(expressions.Add);
            var addSingle = new Action<string, string, object>((sql, paramName, paramVal) =>
            {
                expressions.Add(sql);
                parameters.Add(Tuple.Create(paramName, paramVal));
            });

            var searchValue = criteria.SearchValue;
            var searchType = criteria.SearchType;

            int searchValueInt;
            int.TryParse(searchValue, out searchValueInt);

            criteria.SearchFromDate = criteria.SearchFromDate.ToLocalTime();
            criteria.SearchToDate = criteria.SearchToDate.ToLocalTime();

            // These values are used in the Crystal Report!!
            // If a new one has been added, update the crystal report, too.
            switch (searchType)
            {
                case "RoomID":
                    addSingle("RoomID = @RoomID", "RoomID", searchValueInt);
                    break;

                case "PhysicianID":
                    if (searchValueInt != 0)
                        addSingle("RequestingPhysicianID = @RequestingPhysicianID", "RequestingPhysicianID", searchValueInt);
                    break;

                case "ExaminationTypeID":
                    addSingle("ExaminationTypeID = @ExaminationTypeID", "ExaminationTypeID", searchValueInt);
                    break;

                case "RadiologistID":
                    var whereAsRadiologist = string.Empty;
                    if (!criteria.UseAuthorisationDate)
                        whereAsRadiologist = "OR EXISTS(SELECT 1 FROM ExaminationAssignments ea "
                                             + "WHERE ea.exaass_ExaminationID = ExaminationID AND ea.exaass_RISUserID = @UserID AND ea.exaass_RISRoleID = {0})";

                    var whereAsAuthorOrRadiologist = "(EXISTS(SELECT 1 FROM ExaminationReports er "
                                                     + "INNER JOIN Reports r ON er.exarep_ReportID = r.rep_ReportID "
                                                     + $"WHERE er.exarep_ExaminationID = ExaminationID AND r.rep_AuthorID = @UserID) {whereAsRadiologist})";

                    addSingle(string.Format(whereAsAuthorOrRadiologist, (int) ExaminationAssignmentTypes.Reporter), "UserID", searchValueInt);

                    if (criteria.ModalityTypeID != 0)
                    {
                        addPlain("(ModalityTypeIDs LIKE @ModalityTypeFrontEnd OR ModalityTypeIDs LIKE @ModalityTypeMid)");
                        parameters.Add(Tuple.Create<string, object>("ModalityTypeFrontEnd",
                            "%;" + criteria.ModalityTypeID));
                        parameters.Add(Tuple.Create<string, object>("ModalityTypeMid",
                            "%;" + criteria.ModalityTypeID + ";%"));
                    }

                    if (criteria.PatientCategoryID != 0)
                        addSingle("PatientCategoryID = @PatientCategoryID", "PatientCategoryID", criteria.PatientCategoryID);

                    if (string.IsNullOrEmpty(criteria.ReportStatusID) == false)
                        addSingle("EXISTS(SELECT 1 FROM ExaminationReports er "
                                  + "INNER JOIN Reports r ON er.exarep_ReportID = r.rep_ReportID "
                                  + "WHERE er.exarep_ExaminationID = ExaminationID AND r.rep_ReportStatusID = @ReportStatusID)", "ReportStatusID", criteria.ReportStatusID);
                    break;

                case "ReferralTypeID":
                    addSingle("ReferralTypeID = @ReferralTypeID", "ReferralTypeID", searchValueInt);
                    break;

                case "ExaminationStatusID":
                    if (searchValue == ExaminationStatusValue.Authorised)
                        addPlain("(EXISTS(SELECT 1 FROM ExaminationReports er "
                                  + "WHERE er.exarep_ExaminationID = ExaminationID AND ExaminationStatusID = 'COM') OR ExaminationStatusID = 'AUT')");
                    else
                        addSingle("ExaminationStatusID = @ExaminationStatusID", "ExaminationStatusID", searchValue);
                    break;

                case "PatientNumber":
                    addSingle("PatientNumber = @PatientNumber", "PatientNumber", searchValue);
                    break;

                case "IntendedRadiologistID":
                    addSingle("IntendedReporterUserID = @IntendedReporterUserID", "IntendedReporterUserID", searchValue);
                    break;
            }

            if (criteria.UseAuthorisationDate)
            {
                addPlain("EXISTS(SELECT 1 FROM ExaminationReports er "
                         + "INNER JOIN Reports r ON er.exarep_ReportID = r.rep_ReportID "
                         + "WHERE er.exarep_ExaminationID = ExaminationID AND r.rep_AuthorisationDate BETWEEN @Start AND @End)");
                parameters.Add(Tuple.Create<string, object>("Start", criteria.SearchFromDate));
                parameters.Add(Tuple.Create<string, object>("End", criteria.SearchToDate));
            }
            else
            {
                if (searchType.Equals("Reports"))
                    addPlain("EXISTS(SELECT 1 FROM ExaminationReports er "
                             + "INNER JOIN Reports r ON er.exarep_ReportID = r.rep_ReportID "
                             + "WHERE er.exarep_ExaminationID = ExaminationID)");

                addPlain("ScheduleStartTime BETWEEN @Start AND @End");
                parameters.Add(Tuple.Create<string, object>("Start", criteria.SearchFromDate));
                parameters.Add(Tuple.Create<string, object>("End", criteria.SearchToDate));
            }

            if (searchType != "ExaminationStatusID" || searchValue != ExaminationStatusValue.Cancelled)
                addPlain("ExaminationStatusID != 'CAN'");

            if (criteria.FunctionSpecialisationID != 0)
                addSingle("RequestingPhysicianSpecialtyID = @FunctionSpecialisationID", "FunctionSpecialisationID", criteria.FunctionSpecialisationID);

            if (criteria.LocationID != 0)
                addSingle("LocationID = @LocationID", "LocationID", criteria.LocationID);

            if (criteria.MailboxNumberCheck)
                addPlain("(NOT EXISTS ("
                            + "SELECT 1 FROM GeneralPracticioners gp "
                            + "LEFT JOIN Physicians p ON gp.phy_PhysicianID = p.phy_PhysicianID "
                            + "LEFT JOIN PersonExternalCodes pec ON pec.perextcod_PersonID = p.phy_PersonID "
                            + "WHERE (RequestingPhysicianID = p.phy_PhysicianID AND pec.perextcod_Type = 'edifact-mailbox') "
                        + ") OR NOT EXISTS ( "
                            + "SELECT 1 FROM GeneralPracticioners gp "
                            + "LEFT JOIN Physicians scp ON gp.phy_PhysicianID = scp.phy_PhysicianID "
                            + "LEFT JOIN PersonExternalCodes scpec ON scpec.perextcod_PersonID = scp.phy_PersonID "
                            + "WHERE (SecondCopyPhysicianID = scp.phy_PhysicianID AND scpec.perextcod_Type = 'edifact-mailbox') "
                        + "))");

            var query = string.Join(" AND ", expressions);
            var queryParams = parameters.Select(x => SimpleDataQueryParam.Create(x.Item1, x.Item2));

            var items = Context.DataContext.AdvancedFilterViewQuery(query, queryParams,
                item => new AdvancedFilterResultViewModel
                {
                    ExaminationID = item.ExaminationID,
                    actsch_StartDateTime = item.ScheduleStartTime,
                    roo_RoomName = item.RoomName,
                    pat_PatientNumber = item.PatientNumber,
                    pat_PatientName = item.PatientName,
                    PatientNameFilter = item.PatientNameWithoutPrefix,
                    gen_GenderName = item.Gender,
                    exatyp_ExaminationTypeName = item.ExaminationTypeName,
                    ExaminationLaterality = item.ExaminationLaterality,
                    ref_ReferringPhysicianName = item.RequestingPhysicianName,
                    ref_RequestingMailbox = item.RequestingMailbox,
                    ref_SecondCopyPhysicianName = item.SecondCopyPhysicianName,
                    ref_SecondCopyMailbox = item.SecondCopyMailbox,
                    reftyp_ReferralTypeName = item.ReferralTypeName,
                    ord_OrderID = item.OrderID,
                    OrderNumber = item.OrderNumber,
                    HasOrderRequestForms = item.HasOrderRequestForm,
                    HasReport = item.HasReport,
                    PatientID = item.PatientID,
                    IntendedReporterName = item.IntendedReporterName,
                    IntendedReporterOnLeave = item.IsIntendedReporterOnLeave,
                    StatusDBID = item.ExaminationStatusID,
                    ModalityTypeName = item.ModalityTypeNames.JoinText(", "),
                    PatientCategoryName = item.PatientCategory,
                    AuthorisationDate = item.FirstReportAuthorizationDate,
                    DateOfBirth = item.DateOfBirth,
                    RegularDictationStatus = item.RegularDictationStatus,
                    RadiologistNames = item.RadiologistNames,
                    AuthorNames = item.AuthorNames,
                    ReportStatusIDs = item.ReportStatusIDs,
                    Specialty = item.RequestingPhysicianSpecialtyName,
                    UrgencyID = item.UrgencyID,
                    UrgencyName = item.UrgencyName,
                    UrgencySortIndex = item.UrgencySortIndex,
                    HasProtocol = item.ProtocolID != null || !string.IsNullOrEmpty(item.FreeTextProtocol)
                })
                .OrderByDescending(x => x.actsch_StartDateTime)
                .Distinct(new AdvancedFilterResultViewModelExaminationIDComparer()).ToList();

            return items;
        }

        [TaskAction("worklist")]
        public IEnumerable<AdvancedFilterResultViewModel> Worklist(Criteria request)
        {
            try
            {
                return BuildExaminationFilter(request);
            }
            catch (Exception ex)
            {
                // TODO: Provide better error message.
                throw new ApplicationException("Incorrect filter criteria.", ex);
            }
        }

        [TaskAction("functionspecializations")]
        public object FunctionSpecializations()
        {
            return Context.DataContext.FunctionSpecialisations.Select(item => new
            {
                SpecID = item.funspe_FunctionSpecialisationID,
                SpecName = item.funspe_Name
            }).OrderBy(item => item.SpecName);
        }

        [TaskAction("reportstatuses")]
        public object ReportStatuses()
        {
            var statuses = Context.DataContext.ReportStatuses.Select(x => x.repsta_ReportStatusID);
            var result = new List<ReportModel>();

            foreach (var status in statuses)
            {
                result.Add(new ReportModel
                {
                    RepStatusID = status,
                    RepStatusText = FilterHelpers.GetReportName(status)
                });

            }

            return result;
        }

        [TaskAction("examstatuses")]
        public object ExaminationStatuses()
        {
            string[] omittedStatuses =
            {
                ExaminationStatusValue.Waiting,
                ExaminationStatusValue.Approved,
                ExaminationStatusValue.Held
            };

            omittedStatuses = omittedStatuses.Concat(ExaminationStatusValue.Obsolete).ToArray();

            return Context.DataContext.ExaminationStatuses
                .Where(exasta => !omittedStatuses.Contains(exasta.exasta_StatusID))
                .AsViewModels()
                .OrderBy(item => item.StatusID);
        }

        private class ReportModel
        {
            public string RepStatusID { get; set; }
            public string RepStatusText { get; set; }
        }

        private static class FilterHelpers
        {
            public static string GetReportName(string status)
            {
                if (status == ReportStatus.ReportStatusses.Addendum)
                    return WebResources.Report_Addendum;

                if (status == ReportStatus.ReportStatusses.Preliminary)
                    return WebResources.Report_Preliminary;

                if (status == ReportStatus.ReportStatusses.Authorised)
                    return WebResources.Report_Authorised;

                return string.Empty;
            }
        }
    }
}
