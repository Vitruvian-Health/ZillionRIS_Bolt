using System.Collections.Generic;

namespace ZillionRis
{
    public class ChangedExaminationModel
    {
        public int PatientID { get; set; }
        public int OrderID { get; set; }
        public string SourceStatusID { get; set; }
        public string TargetStatusID { get; set; }
        public int[] ExaminationIDs { get; set; }
        public bool HideUserSelect { get; set; }
        public List<int> PreviousTechnicians { get; set; }
    }
}