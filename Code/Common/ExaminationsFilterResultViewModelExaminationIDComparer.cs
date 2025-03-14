using System.Collections.Generic;
using Rogan.ZillionRis.Website.Code.Api.Data;

namespace ZillionRis.Common
{
    public class AdvancedFilterResultViewModelExaminationIDComparer : IEqualityComparer<AdvancedFilterPageService.AdvancedFilterResultViewModel>
    {
        public bool Equals(AdvancedFilterPageService.AdvancedFilterResultViewModel x, AdvancedFilterPageService.AdvancedFilterResultViewModel y)
        {
            return x.ExaminationID == y.ExaminationID;
        }

        public int GetHashCode(AdvancedFilterPageService.AdvancedFilterResultViewModel obj)
        {
            return obj.ExaminationID;
        }
    }
}
