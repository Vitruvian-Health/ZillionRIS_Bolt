using System;
using System.Collections.Generic;
using System.Linq;
using DelftDI.Common.RIS.Common;
using Newtonsoft.Json;
using Rogan.ZillionRis.Codes.ExaminationStatus;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Web.Reflection;

using ZillionRis.Utilities;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class DiscussionListPageService : ZillionRisBaseTask 
    {
        public override IEnumerable<string> RequiredPermissions => new[] { UserPermissions.PageDiscussion };

        public class DiscussionListModel
        {
            public string AccessionNumber { get; set; }
            public string DiscussionCategoryName { get; set; }
            public string DiscussionNote { get; set; }
            public string ExaminationDisplayName { 
                get {
                    if (this.ExaminationLaterality != null)
                        return string.Format("{0} ({1})", this.ExaminationTypeName, this.ExaminationLaterality);

                    return this.ExaminationTypeName;
                }
            }
            public int ExaminationID { get; set; }
            public string ExaminationLaterality { get; set; }
            public string ExaminationTypeName { get; set; }
            public int ExaminationTypeID { get; set; }
            public int OrderID { get; set; }
            public string OrderNumber { get; set; }
            public int PatientID { get; set; }
            public string PatientName { get; set; }
            public string PatientNameFilter { get; set; }
            public string PatientNumber { get; set; }
            public int DiscussionListID { get; set; }
            public IEnumerable<int> ModalityTypeIDs { get; set; }
            public string Requester { get; set; }
            public string RequesterType { get; set; }
            public bool HasRequestForm { get; set; }
            public bool HasReport { get; set; }
            public bool HasMemo { get; set; }
            public bool HasAtLeastStatusCompleted { get; set; }
            public DateTimeOffset? DateOfRequest { get; set; }
            public string StatusDBID { get; set; }
            public string StatusName { get { return ExaminationStatusValueExtensions.ToString(StatusDBID); } }
            [JsonIgnore]
            public IEnumerable<string> RadiologistNames { get; set; }
            public string Radiologists
            {
                get { return RadiologistNames.JoinText(", "); }
            }
            public string IntendedReporter { get; set; }
            public int? HousekeepingID { get; set; }
            public int? RequesterLocationID { get; set; }

            public int? RoomID { get; set; }
            public int? IntendedReporterID { get; set; }
            public int? ResponsibleRequestingPhysicianID { get; set; }
            public int? ReporterID { get; set; }
            public string RegularDictationStatus { get; set; }
            public string UrgencyID { get; set; }
            public bool HasUnhandledFailsafe { get; set; }
            public bool HasProtocol { get; set; }
        }

        public class DiscussionRequestModel
        {
            public int CurrentList;
        }

        [TaskAction("worklist")]
        public IEnumerable<DiscussionListModel> Worklist(DiscussionRequestModel request)
        {
            if (request.CurrentList == 0 || this.Context.DataContext.ExaminationDiscussionLists.Any(item => item.exadislis_DiscussionListID == request.CurrentList) == false)
            {
                return new List<DiscussionListModel>();
            }

            var statusList = new[]
                {
                    ExaminationStatusValue.Authorised,
                    ExaminationStatusValue.Billed,
                    ExaminationStatusValue.Completed,
                    ExaminationStatusValue.Verified
                };

            var result = Context.DataContext.ExaminationDiscussionLists.Where(item => item.exadislis_DiscussionListID == request.CurrentList)
                .Select(item =>
                    new DiscussionListModel
                        {
                            DiscussionListID = item.exadislis_DiscussionListID,
                            ExaminationID = item.Examination.exa_ExaminationID,
                            ExaminationTypeName = item.Examination.ExaminationType.exatyp_ExaminationTypeName,
                            ExaminationTypeID = item.Examination.ExaminationType.exatyp_ExaminationTypeID,
                            ExaminationLaterality = item.Examination.exa_Laterality,
                            OrderID = item.Examination.Order.ord_OrderID,
                            OrderNumber = item.Examination.Order.ord_OrderNumber,
                            PatientID = item.Examination.Order.Patient.per_PersonID,
                            PatientName = item.Examination.Order.Patient.Person.per_DisplayName,
                            PatientNameFilter = item.Examination.Order.Patient.Person.per_SearchName,
                            PatientNumber = item.Examination.Order.Patient.pat_PatientNumber,
                            DiscussionCategoryName = item.DiscussionCategory == null ? null : item.DiscussionCategory.discat_DiscussionCategoryName,
                            AccessionNumber = item.Examination.Studies.Select(study => study.stu_AccessionNumber).FirstOrDefault(),
                            DiscussionNote = item.exadislis_Note,
                            ModalityTypeIDs = item.Examination.ActionSchedulings.SelectMany(a => a.Resource.Room.Modalities).Where(x => x.ModalityType != null).Select(x => x.ModalityType.modtyp_ModalityTypeID),
                            Requester = item.Examination.Order.RequestingPhysician.Person.per_DisplayName,
                            RequesterType = item.Examination.Order.ReferralType.reftyp_ReferralTypeName,
                            HasRequestForm = item.Examination.Order.Documents.Any(s => s.stodoc_DeprecatedSince == null && s.stodoc_DocumentType.StartsWith(MagicConstants.RequestFormTypes)) || 
                                item.Examination.Order.ord_ExternalOrderNumber != null ||
                                item.Examination.Order.MedicalIndication != null ||
                                item.Examination.Order.Examinations.Any(e => e.ClinicalInformation != null),
                            HasReport = item.Examination.Reports.Any(),
                            HasMemo = item.Examination.Order.Examinations.Any(ex => ex.Memo != null) || item.Examination.Order.Memo != null,
                            HasAtLeastStatusCompleted = statusList.Contains(item.Examination.Status.exasta_StatusID),
                            DateOfRequest = item.Examination.Order.ord_RequestDate,
                            StatusDBID = item.Examination.Status.exasta_StatusID,
                            RadiologistNames = item.Examination.ExaminationAssignments.Where(assignment => assignment.exaass_RISRoleID == (int) ExaminationAssignmentTypes.Reporter).OrderByDescending(assignment => assignment.exaass_AssigmentExecutor).Select(assignment => assignment.RISUser.Person.per_DisplayName),
                            RequesterLocationID = item.Examination.Order.RequesterLocation.reqloc_RequesterLocationID,
                            HousekeepingID = item.Examination.Housekeepings.Select(a => a.hou_HousekeepingID).FirstOrDefault(),
                            RoomID = item.Examination.ActionSchedulings.FirstOrDefault().Resource.Room.roo_RoomID,
                            IntendedReporterID = item.Examination.IntendedRadiologist.risuse_UserID,
                            IntendedReporter = item.Examination.IntendedRadiologist.Person.per_DisplayName,
                            ResponsibleRequestingPhysicianID = item.Examination.Order.RequestingPhysician.phy_PhysicianID,
                            ReporterID = item.Examination.DictationWorkItems.FirstOrDefault().SpeechState.Radiologist.risuse_UserID,
                            RegularDictationStatus = item.Examination.DictationWorkItems.Where(dwi => dwi.WorkItemType.dicworitetyp_WorkItemTypeCode == "regular" && dwi.SpeechState != null).Select(dwi => dwi.SpeechState.SpeechStatus.spesta_StatusID).FirstOrDefault(),
                            UrgencyID = item.Examination.Order.Urgency.urg_UrgencyID,
                            HasUnhandledFailsafe = item.Examination.FailsafeFindings.FirstOrDefault(x => x.faifin_Handled == false) != null,
                            HasProtocol = item.Examination.Protocol != null || !string.IsNullOrEmpty(item.Examination.exa_FreeTextProtocol)
                        })
            .ToList();

            return UniqueExaminations(result);
        }

        private static IEnumerable<DiscussionListModel> UniqueExaminations(IEnumerable<DiscussionListModel> result)
        {
            var c = new HashSet<int>();
            return result.Where(a => c.Add(a.ExaminationID)).ToList();
        }

        public class ChangeNoteDetails
        {
            public int ExaminationID { get; set; }
            public int DiscussionListID { get; set; }
            [JsonProperty(PropertyName = "new_note")]
            public string Note { get; set; }
        }

        [TaskAction("changenote")]
        public bool ChangeNote(ChangeNoteDetails request)
        {
            var note = Context.DataContext.ExaminationDiscussionLists.FirstOrDefault(item => item.exadislis_DiscussionListID == request.DiscussionListID && item.exadislis_ExaminationID == request.ExaminationID);
            if (note == null)
            {
                return false;
            }
            
            // audit the change
            var oldModel = new DiscussionListItemAuditModel();
            var newModel = new DiscussionListItemAuditModel();
            oldModel.Note = note.exadislis_Note;
            newModel.Note = request.Note;

            //update the note
            note.exadislis_Note = request.Note;
            Context.DataContext.SaveChanges();
            
            AuditChangeDiscussionListNote(note.Examination, oldModel, newModel);
            return true;
        }

        private void AuditChangeDiscussionListNote(Examination examination, object oldModel, object newModel)
        {
            var auditor = Context.Get<IAuditor>();
            if (auditor == null)
                throw new ApplicationException("Auditor could not be found.");

            var auditContext = new AuditContext
            {
                Examination = examination,
                Order = examination.Order,
                Patient = examination.Order.Patient,
            };

            auditor.LogEditByDescription(AuditConstants.ChangeDiscussionListItem, auditContext, oldModel, newModel);
        }
    }

    public class DiscussionListItemAuditModel
    {
        public string Note { get; set; }
    }
}
