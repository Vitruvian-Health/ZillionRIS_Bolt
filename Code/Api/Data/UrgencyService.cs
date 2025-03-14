using System;
using System.Collections.Generic;
using System.Linq;
using DelftDI.Common.RIS.Linq.Dynamic;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class UrgencyService : ZillionRisBaseTask 
    {
        [TaskAction("get")]
        public UrgencyModel Get(UrgencyRequestModel model)
        {
            return Context.DataContext.Urgencies
                .Where(x => x.urg_UrgencyID == model.ID)
                .Select(x => new UrgencyModel
                {
                    ID = x.urg_UrgencyID,
                    Name = x.urg_UrgencyName
                }).FirstOrDefault();
        }

        [TaskAction("query")]
        public IEnumerable<UrgencyModel> Query(UrgencyRequestModel request)
        {
            var searchWords = request.Text.Split(new[] { '-', ' ' }, StringSplitOptions.RemoveEmptyEntries);

            var source = this.Context.DataContext.Urgencies;
            var filter = WhereBuilder<Urgency>.And();
            
            ApplySearchTextFilter(searchWords, filter);

            var items = filter.CreateQuery(source)
                .Select(item =>
                        new UrgencyModel
                        {
                            ID = item.urg_UrgencyID,
                            Name = item.urg_UrgencyName
                        });

            return items.ToList();
        }

        private static void ApplySearchTextFilter(string[] searchWords, WhereBuilder<Urgency> filter)
        {
            foreach (string searchWord in searchWords)
            {
                var text = searchWord;
                filter = filter.Condition(item => item.urg_UrgencyName.Contains(text));
            }
        }

        public class UrgencyRequestModel
        {
            public string ID { get; set; }
            public string Text { get; set; }
        }

        public class UrgencyModel
        {
            public string ID { get; set; }
            public string Name { get; set; }
        }
    }
}