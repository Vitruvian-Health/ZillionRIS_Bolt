using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

using Rogan.ZillionRis.Business.PatientSearch;
using Rogan.ZillionRis.Codes.ExaminationStatus;
using Rogan.ZillionRis.Configuration;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.UrnUtility;
using Rogan.ZillionRis.ViewModels;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class AdvancedPatientSearchPageService : ZillionRisBaseTask 
    {
        public override IEnumerable<string> RequiredPermissions => new[] { UserPermissions.SearchPatient };

        public class RequestModel
        {
            public string Value;
            public int ID;
        }

        public class SearchClass
        {
            public string GivenName { get; set; }
            public string FamilyName { get; set; }
            public string BirthDate_String { get; set; }
            public string NHS { get; set; }
            public string PAS { get; set; }
            public string GenderID { get; set; }
            public int ModalityID { get; set; }
            public int ExamTypeID { get; set; }
            public int RoomID { get; set; }
            public string PhoneNumber { get; set; }
            public string LocationGroup { get; set; }
            public string StartDate_String { get; set; }
            public string EndDate_String { get; set; }
            public int TechnicianID { get; set; }
            public int ReporterID { get; set; }
            public int IntendedReporterID { get; set; }
            public string StatusID { get; set; }
            public int CurrentResponsibleConsultantID { get; set; }
            public int RequestingResponsibleConsultantID { get; set; }
            public string PatientLocation_PointOfCare { get; set; }
            public string PatientLocation_Room { get; set; }
            public string PatientLocation_Bed { get; set; }
            public string ClinicalInfoFilter { get; set; }
            public string ReportFilter { get; set; }
            public int PatientCategoryID { get; set; }
            public int RequesterLocationID { get; set; }
            public int RequestingWorkLocationID { get; set; }
        }

        private object ToReturnObject(IEnumerable<PatientIdentificationViewModel> query)
        {
            return query.Select(item => new
            {
                item.PatientID,
                item.IsDummyPatient,
                item.PatientDisplayName,
                item.PatientNameFilter,
                item.PatientNumber,
                item.DateOfBirth,
                item.DisplayAddress,
                item.Gender,
                SSN = RisAppSettings.EnglishSocialSecurityNumber ? item.NHS : item.BSN
            });
        }

        [TaskAction("search")]
        public object Search(SearchClass request)
        {
            var SearchValues = new AdvancedPatientSearchValues();
            SearchValues.FirstName = request.GivenName;
            SearchValues.LastName = request.FamilyName;
            SearchValues.BirthDate = null;
            SearchValues.SocialSecurityNumber = request.NHS;
            SearchValues.PAS = request.PAS;
            SearchValues.GenderID = request.GenderID;
            SearchValues.LocationGroup = request.LocationGroup;
            SearchValues.PhoneNumber = request.PhoneNumber;

            SearchValues.CurrentPatientLocation_PointOfCare = request.PatientLocation_PointOfCare;
            SearchValues.CurrentPatientLocation_Room = request.PatientLocation_Room;
            SearchValues.CurrentPatientLocation_Bed = request.PatientLocation_Bed;

            SearchValues.FilterExaminations = new FilterExaminationSearchValues{
                        ModalityID = request.ModalityID,
                        ExamTypeID = request.ExamTypeID,
                        RoomID = request.RoomID,
                        StartDate = null,
                        EndDate = null,
                        TechnicianID = request.TechnicianID,
                        ReporterID = request.ReporterID,
                        IntendedReporterID = request.IntendedReporterID,
                        StatusID = ExaminationStatusValue.FromDatabase(request.StatusID),
                        CurrentResponsibleConsultantID = request.CurrentResponsibleConsultantID,
                        RequestingResponsibleConsultantID = request.RequestingResponsibleConsultantID,
                        ClinicalInformationFilter = request.ClinicalInfoFilter,
                        ExaminationReportFilter = request.ReportFilter,
                        PatientCategoryID = request.PatientCategoryID,
                        RequesterLocationID = request.RequesterLocationID,
                        RequestingWorkLocationID = request.RequestingWorkLocationID
            };

            if (!string.IsNullOrEmpty(request.BirthDate_String))
            {
                SearchValues.BirthDate = DateTime.Parse(request.BirthDate_String, CultureInfo.InvariantCulture);
            }
            if (!string.IsNullOrEmpty(request.StartDate_String))
            {
                SearchValues.FilterExaminations.StartDate = DateTime.Parse(request.StartDate_String, CultureInfo.InvariantCulture);
            }
            if (!string.IsNullOrEmpty(request.EndDate_String))
            {
                SearchValues.FilterExaminations.EndDate = DateTime.Parse(request.EndDate_String, CultureInfo.InvariantCulture);
            }

            var advancedSearchController = new AdvancedPatientSearchController(this.Context.DataContext);
            advancedSearchController.SearchValue = SearchValues;
            advancedSearchController.Search();
            return ToReturnObject(advancedSearchController.SearchResults);
        }

        [TaskAction("searchSSN")]
        public object SearchSSN(RequestModel request)
        {
            // NHS number in England, BSN in Netherlands
            if (RisAppSettings.EnglishSocialSecurityNumber)
            {
                return ToReturnObject(this.Context.DataContext.Patients.Where(item => item.Person.PersonExternalCodes.Any(ec => ec.perextcod_Type == UrnNamespaces.NhsNumber && ec.perextcod_Value.StartsWith(request.Value))).AsViewModels());
            }
            else
            {
                return ToReturnObject(this.Context.DataContext.Patients.Where(item => item.Person.PersonExternalCodes.Any(ec => ec.perextcod_Type == UrnNamespaces.BsnNumber && ec.perextcod_Value.StartsWith(request.Value))).AsViewModels());
            }       
        }

        [TaskAction("searchPAS")]
        public object SearchPAS(RequestModel request)
        {
            return ToReturnObject(this.Context.DataContext.Patients.Where(item => item.pat_PatientNumber == request.Value).AsViewModels());
        }

        [TaskAction("searchAccessionNr")]
        public object SearchAccessionNr(RequestModel request)
        {
            return ToReturnObject(this.Context.DataContext.Patients.Where(item => item.Orders.SelectMany(order => order.Examinations)
                                                                      .SelectMany(examination => examination.Studies)
                                                                      .Any(study => study.stu_AccessionNumber == request.Value))
                                            .AsViewModels());
        }

        [TaskAction("searchOrderNr")]
        public object SearchOrderNr(RequestModel request)
        {
            return ToReturnObject(this.Context.DataContext.Patients.Where(item => item.Orders.Any(order => order.ord_OrderNumber == request.Value))
                                            .AsViewModels());
        }

        [TaskAction("genders")]
        public object Genders()
        {
            return this.Context.DataContext.Genders.AsViewModels();
        }

        [TaskAction("modalities")]
        public object Modalities()
        {
            return this.Context.DataContext.Modalities.AsViewModels().OrderBy(item => item.ModalityName);
        }

        [TaskAction("modalitytypes")]
        public object ModalityTypes()
        {
            return this.Context.DataContext.ModalityTypes.AsViewModels().OrderBy(item => item.ModalityTypeName);
        }


        [TaskAction("rooms")]
        public object Rooms()
        {
            return this.Context.DataContext.Rooms.AsViewModels().OrderBy(item => item.ID);
        }

        [TaskAction("examstatuses")]
        public object ExaminationStatuses()
        {
            return Context.DataContext.ExaminationStatuses
                .Where(exasta => !ExaminationStatusValue.Obsolete.Contains(exasta.exasta_StatusID))
                .AsViewModels().OrderBy(item => item.StatusID);
        }

        [TaskAction("patientcategories")]
        public object Patientcategories()
        {
            return this.Context.DataContext.PatientCategories.Select(item => new
                {
                    PatientCategoryID = item.patcat_PatientCategoryID,
                    PatientCategoryName = item.patcat_PatientCategoryName
                }).OrderBy(item => item.PatientCategoryName);
        }

        [TaskAction("requesterlocations")]
        public object Requesterlocations()
        {
            return this.Context.DataContext.RequesterLocations.Select(item => new { 
                                                RequesterLocationID = item.reqloc_RequesterLocationID,
                                                RequesterLocationCode = item.reqloc_Code,
                                                RequesterLocationName = item.reqloc_Description
                                            }).OrderBy(item => item.RequesterLocationCode);
        }

        [TaskAction("requestingworklocations")]
        public object Requestingworklocations(RequestModel request)
        {
            var gp = this.Context.DataContext.Physicians.OfType<GeneralPracticioner>()
                .FirstOrDefault(item => item.phy_PhysicianID == request.ID);

            if (gp != null)
            {
                return gp.Practices.SelectMany(item => item.WorkLocations).Select(item => new
                    {
                        RequestingWorkLocationID = item.worloc_WorkLocationID,
                        RequestingWorkLocationName = item.worloc_Address
                    }).OrderBy(item => item.RequestingWorkLocationID);
            }

            return null;
        }
    }
}
