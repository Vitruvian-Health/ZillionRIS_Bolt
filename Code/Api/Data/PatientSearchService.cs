using Newtonsoft.Json;
using Rogan.ZillionRis.Business.PatientSearch;
using Rogan.ZillionRis.Search;
using Rogan.ZillionRis.ViewModels;
using Rogan.ZillionRis.Web.Handlers.ReflectionRequest;
using Rogan.ZillionRis.WebControls.Extensibility;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class PatientSearchService : RisReflectionController
    {
        [ReflectionAction("search")]
        public object Execute([ReflectionRequestPostData] SearchRequest request)
        {
            InitializeCulture();

            var providers = new List<IPersonSearchProvider>();

            var mode = (PatientSearchModes) Enum.Parse(typeof (PatientSearchModes), request.Mode, true);

            if (mode.HasFlag(PatientSearchModes.FirstName) || mode.HasFlag(PatientSearchModes.LastName) || mode.HasFlag(PatientSearchModes.MaidenName))
            {
                providers.Add(new PersonSearchDisplayName());
                providers.Add(new PersonSearchDisplayNameWithoutPrefix());
                providers.Add(new PersonSearchLastName());
            }
            if (mode.HasFlag(PatientSearchModes.BirthDay))
                providers.Add(new PersonSearchDateOfBirth());
            if (mode.HasFlag(PatientSearchModes.AccessionNumber))
                providers.Add(new PersonSearchAccessionNumber());
            if (mode.HasFlag(PatientSearchModes.OrderNumber))
                providers.Add(new PersonSearchOrderNumber());
            if (mode.HasFlag(PatientSearchModes.PatientNumber))
                providers.Add(new PersonSearchPatientNumber());
            if (mode.HasFlag(PatientSearchModes.BsnNumber))
                providers.Add(new PersonSearchPersonBsnNumber());
            if (mode.HasFlag(PatientSearchModes.BsnNumber))
                providers.Add(new PersonSearchPersonNhsNumber());
            if (mode.HasFlag(PatientSearchModes.PatientID))
                providers.Add(new PersonSearchPatientID());

            return SearchProviders(providers, request.Text.Trim())
                .Take(1000)
                .Select(item => new
                {
                    ID = item.PatientID,
                    item.PatientNumber,
                    PatientName = item.PatientDisplayName,
                    item.PatientNameFilter,
                    item.DateOfBirth,
                    Address = item.DisplayAddress,
                    item.Gender,
                    item.IsDummyPatient
                });
        }

        private IEnumerable<PatientIdentificationViewModel> SearchProviders(IEnumerable<IPersonSearchProvider> providers, string text)
        {
            IEnumerable<IEnumerable<PatientIdentificationViewModel>> queries = providers
                .Select(x => x.Search(SessionContext, text))
                .Where(x => x != null)
                .Select(x => x.ToArray());

            return queries
                .Aggregate(Enumerable.Union)
                .Distinct(new PatientIdentificationViewModelPatientIDComparer());
        }
    }
    /// <summary>
    /// 
    /// </summary>
    public class SearchRequest
    {
        /// <summary>
        /// 
        /// </summary>
        [JsonProperty("mode")]
        public string Mode { get; set; }
        /// <summary>
        /// 
        /// </summary>
        [JsonProperty("text")]
        public string Text { get; set; }
    }
}
