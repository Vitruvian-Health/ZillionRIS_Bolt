using System;
using System.Collections.Generic;

namespace ZillionRis
{
    public class EditOrderModel
    {
        public EditOrderModel()
        {
            this.DateOfRequest = DateTimeOffset.Now;
            this.RetrievalDate = DateTimeOffset.Now;
        }

        public int? PatientGPPhysicianID { get; set; }
        public int? PhysicianID { get; set; }
        public int? OrderTypeID { get; set; }
        public int? PatientCategoryID { get; set; }
        public int? RequestingLocationID { get; set; }
        public string UrgencyID { get; set; }

        public bool SecondCopyRequired { get; set; }
        public int? CopyToPhysicianID { get; set; }
        public int? CopyToWorkLocationID { get; set; }
        public int? CopyToRequesterLocationID { get; set; }

        public int? ReferralTypeID { get; set; }
        public int? RequestingWorkLocationID { get; set; }
        public string Memo { get; set; }
        public string AddMemo { get; set; }

        public string MedicalIndication { get; set; }
        public string AddMedicalIndication { get; set; }
        public DateTimeOffset? DateOfRequest { get; set; }
        public DateTimeOffset? RetrievalDate { get; set; }
        public DateTime ImportOrderDate { get; set; }
        public bool RetrospectiveBooking { get; set; }

        public IEnumerable<ExaminationClinicalInformationModel> ExaminationClinicalInformation  { get; set; }

        public IEnumerable<QandAModel> OrderQandAList { get; set; }

        public IEnumerable<ExaminationQandAModel> ExaminationQandAList { get; set; }
    }

    public class QandAModel
    {
        public string Question { get; set; }
        public string Answer { get; set; }
    }

    public class ExaminationQandAModel
    {
        public string ExaminationTypeName { get; set; }
        public IEnumerable<QandAModel> QandAList { get; set; }
    }

    public class ExaminationClinicalInformationModel
    {
        public string ExaminationTypeName { get; set; }
        public string ClinicalInformaton { get; set; }
    }
}