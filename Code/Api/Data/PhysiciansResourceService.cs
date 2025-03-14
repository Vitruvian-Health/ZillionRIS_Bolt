using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;

using Newtonsoft.Json;

using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web.Reflection;
using ZillionRis.Utilities;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class PhysiciansResourceService : ZillionRisBaseTask 
    {
        public class PhysicianRequestModel
        {
            public int ID;
            public string Text;
            public PhysiciansType PhysiciansType;
        }

        #region PhysiciansType enum
        public enum PhysiciansType
        {
            [JsonProperty(PropertyName = "all")]
            All = 0,
            [JsonProperty(PropertyName = "internal")]
            InternalPhysician = 1,
            [JsonProperty(PropertyName = "external")]
            ExternalPhysician = 2,
            [JsonProperty(PropertyName = "general")]
            GeneralPracticioner = 3,
            [JsonProperty(PropertyName = "nongeneral")]
            NonGeneralPracticioner = 4,
        }
        #endregion

        [TaskAction("get")]
        public PhysicianItem GetPhysician(PhysicianRequestModel request)
        {
            return this.Context.DataContext.Physicians
                .Where(item => item.phy_PhysicianID == request.ID)
                .Select(item => new PhysicianItem
                                    {
                                        ID = item.phy_PhysicianID,
                                        Code = item.phy_PhysicianCode,
                                        DisplayName = item.Person.per_DisplayName,
                                    })
                .FirstOrDefault();
        }

        [TaskAction("query")]
        public IEnumerable<PhysicianItem> Search(PhysicianRequestModel request)
        {
            var searchWords = request.Text.Split(new[] { '-' }, StringSplitOptions.RemoveEmptyEntries);

            switch (request.PhysiciansType)
            {
                case PhysiciansType.All:
                    return this.SearchAllPhysicians(searchWords);

                case PhysiciansType.InternalPhysician:
                    return this.SearchInternalPhysicians(searchWords);

                case PhysiciansType.ExternalPhysician:
                    return this.SearchExternalPhysicians(searchWords);

                case PhysiciansType.GeneralPracticioner:
                    return this.SearchGeneralPracticioners(searchWords);

                case PhysiciansType.NonGeneralPracticioner:
                    return this.SearchInternalPhysicians(searchWords).Union(this.SearchExternalPhysicians(searchWords));

                default:
                    return new PhysicianItem[0];
            }
        }

        private IEnumerable<PhysicianItem> SearchAllPhysicians(string[] searchWords)
        {
            return SearchPhysicians<Physician>
                (item => new PhysicianItem
                {
                    ID = item.phy_PhysicianID,
                    Code = item.phy_PhysicianCode,
                    DisplayName = item.Person.per_DisplayName,
                    Address = item.Person.PersonAddresses.Count(per => per.peradd_Code == MagicConstants.AddressCode_Home) != 0
                            ? item.Person.PersonAddresses.FirstOrDefault(per => per.peradd_Code == MagicConstants.AddressCode_Home).Address.add_DisplayName
                            : "",
                    FunctionSpecialization = item.Specialisation == null ? "" : item.Specialisation.funspe_Name
                },
                 searchWords);
        }

        private IEnumerable<PhysicianItem> SearchGeneralPracticioners(string[] searchWords)
        {
            return this.SearchPhysicians<GeneralPracticioner>
                (item => new PhysicianItem
                {
                    ID = item.phy_PhysicianID,
                    Code = item.phy_PhysicianCode,
                    DisplayName = item.Person.per_DisplayName,
                },
                 searchWords);
        }

        private IEnumerable<PhysicianItem> SearchExternalPhysicians(string[] searchWords)
        {
            return this.SearchPhysicians<ExternalPhysician>
                (item => new PhysicianItem
                             {
                                 ID = item.phy_PhysicianID,
                                 Code = item.phy_PhysicianCode,
                                 DisplayName = item.Person.per_DisplayName,
                             },
                 searchWords);
        }

        private IEnumerable<PhysicianItem> SearchInternalPhysicians(string[] searchWords)
        {
            return this.SearchPhysicians<InternalPhysician>
                (item => new PhysicianItem
                             {
                                 ID = item.phy_PhysicianID,
                                 Code = item.phy_PhysicianCode,
                                 DisplayName = item.Person.per_DisplayName,
                             },
                 searchWords);
        }

        private IEnumerable<PhysicianItem> SearchPhysicians<T>(Expression<Func<T, PhysicianItem>> projector, string[] searchWords) where T : Physician
        {
            return ApplySearchTextFilter(searchWords, this.Context.DataContext.Physicians.OfType<T>()).Select(projector);
        }

        private static IQueryable<T> ApplySearchTextFilter<T>(string[] searchWords, IQueryable<T> filter) where T : Physician
        {
            if (searchWords.Length == 1)
            {
                var searchText2 = searchWords[0];
                filter = filter.Where(item => item.phy_PhysicianCode.StartsWith(searchText2) || item.Person.per_DisplayName.StartsWith(searchText2));
            }
            else
            {
                foreach (string searchWord in searchWords)
                {
                    var text = searchWord;
                    filter = filter.Where(item => item.Person.per_DisplayName.Contains(text));
                }
            }

            return filter;
        }

        #region Nested type: PhysicianItem
        public sealed class PhysicianItem
        {
            public int ID { get; set; }
            public string Code { get; set; }
            public string DisplayName { get; set; }
            public string Address { get; set; }
            public string FunctionSpecialization { get; set; }
        }
        #endregion
    }
}
