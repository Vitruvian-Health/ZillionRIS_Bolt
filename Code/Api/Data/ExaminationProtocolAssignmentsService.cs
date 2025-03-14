using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json;
using Rogan.ZillionRis.Codes.ExaminationStatus;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.UrnUtility;
using Rogan.ZillionRis.Web.Reflection;
using Rogan.ZillionRis.Workflow.Tasks;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class ExaminationProtocolAssignmentsService : ZillionRisBaseTask
    {
        public override IEnumerable<string> RequiredPermissions => new[] { UserPermissions.PageExaminationProtocolAssignments };

        public class ProtocolAssignmentModel
        {
            public int ExaminationID { get; set; }
            public int ExaminationTypeID { get; set; }
            [JsonIgnore]
            public string ExaminationTypeName { get; set; }
            [JsonIgnore]
            public string ExaminationLaterality { get; set; }
            public string ExaminationDisplayName => ExaminationLaterality != null ? $"{ExaminationTypeName} ({ExaminationLaterality})" : ExaminationTypeName;
            public string ExaminationStatusDBID { get; set; }
            public string ExaminationStatusName => ExaminationStatusValueExtensions.ToString(ExaminationStatusDBID, CultureInfo.CurrentCulture);
            public string AccessionNumber { get; set; }
            public int OrderID { get; set; }
            public string OrderNumber { get; set; }
            public DateTimeOffset ScheduleDateTime { get; set; }
            public int PatientID { get; set; }
            public string PatientName { get; set; }
            public string PatientNameFilter { get; set; }
            public string Location { get; set; }
            public int RoomID { get; set; }
            public string Room { get; set; }
            public string RequesterType { get; set; }
            public string Requester { get; set; }
            public IEnumerable<int> ModalityTypeIDs { get; set; }
            public int? RequestingLocationID { get; set; }
            public int? IntendedRadiologistID { get; set; }
            public string IntendedReporter { get; set; }
            public string UrgencyID { get; set; }
        }
        
        public class ProtocolAssignmentRequestModel
        {
            public DateTimeOffset Date { get; set; }
            public int NumberOfDays { get; set; }
        }

        [TaskAction("worklist")]
        public IEnumerable<ProtocolAssignmentModel> ProtocolAssignmentWorklist(ProtocolAssignmentRequestModel request)
        {
            var selectedDate = request.Date.LocalDateTime.Date;

            var startDate = selectedDate;
            var endDate = selectedDate.AddDays(request.NumberOfDays);

            var lockedExaminations
                = ResourceLockConcerns.GetAllLocksByOtherUsers(Context, Context.User.UserID)
                    .Where(urn => urn.Namespace == UrnNamespaces.ExaminationID)
                    .Select(urn => Convert.ToInt32(urn.Specification)).ToList();

            var result = Context.DataContext.Examinations
                .Where(item => item.ActionSchedulings.Any(sched => sched.actsch_StartDateTime >= startDate &&
                                                                   sched.actsch_StartDateTime < endDate))
                .Where(item => new[] { ExaminationStatusValue.Scheduled, ExaminationStatusValue.InDepartment, ExaminationStatusValue.InProgress }
                    .Contains(item.Status.exasta_StatusID))
                .Where(item => item.ExaminationType.ExaminationTypeProtocols.Any(
                    etp => etp.Protocol.pro_DateTimeInactive == null ||
                           etp.Protocol.pro_DateTimeInactive > DateTime.Now))
                .Where(item => item.Protocol == null && string.IsNullOrEmpty(item.exa_FreeTextProtocol))
                .Where(item => !lockedExaminations.Contains(item.exa_ExaminationID))
                .Select(item => new
                {
                    Examination = item,
                    Room = item.ActionSchedulings.Select(room => room.Resource.Room).FirstOrDefault(),
                    item.Order
                })
                .Select(item => new ProtocolAssignmentModel
                {
                    ExaminationID = item.Examination.exa_ExaminationID,
                    ExaminationTypeID = item.Examination.ExaminationType.exatyp_ExaminationTypeID,
                    ExaminationTypeName = item.Examination.ExaminationType.exatyp_ExaminationTypeName,
                    ExaminationLaterality = item.Examination.exa_Laterality,
                    ExaminationStatusDBID = item.Examination.Status.exasta_StatusID,
                    AccessionNumber = item.Examination.Studies.Select(studies => studies.stu_AccessionNumber)
                        .FirstOrDefault(),
                    OrderID = item.Order.ord_OrderID,
                    OrderNumber = item.Order.ord_OrderNumber,
                    ScheduleDateTime = item.Examination.ActionSchedulings
                        .Select(scheduling => scheduling.actsch_StartDateTime).FirstOrDefault(),
                    PatientID = item.Order.Patient.per_PersonID,
                    PatientName = item.Order.Patient.Person.per_DisplayName,
                    PatientNameFilter = item.Order.Patient.Person.per_SearchName,
                    Location = item.Room.Department.Location.loc_LocationName,
                    RoomID = item.Room.roo_RoomID,
                    Room = item.Room.roo_RoomName,
                    RequesterType = item.Order.ReferralType.reftyp_ReferralTypeName,
                    Requester = item.Order.RequestingPhysician.Person.per_DisplayName,
                    ModalityTypeIDs = item.Examination.ActionSchedulings
                        .Where(a => a.Resource.Room != null)
                        .SelectMany(a => a.Resource.Room.Modalities)
                        .Where(modality => modality.ModalityType != null)
                        .Select(modality => modality.ModalityType.modtyp_ModalityTypeID)
                        .Distinct(),
                    RequestingLocationID = item.Examination.Order.RequesterLocation.reqloc_RequesterLocationID,
                    IntendedRadiologistID = item.Examination.IntendedRadiologist.risuse_UserID,
                    IntendedReporter = item.Examination.IntendedRadiologist.Person.per_DisplayName,
                    UrgencyID = item.Order.Urgency.urg_UrgencyID
                })
                .ToArray();

            return result;
        }
    }
}
