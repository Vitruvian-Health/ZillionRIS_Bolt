using System;
using System.Collections.Generic;
using System.Linq;
using DelftDI.Common.RIS.Data.Ranking;
using DelftDI.Common.RIS.Linq.Dynamic;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public sealed class UsersResource : ZillionRisBaseTask 
    {
        public class UserSearchItem
        {
            public int ID { get; set; }
            public string Code { get; set; }
            public string DisplayName { get; set; }
        }

        public class UserRequestModel
        {
            public int ID;
            public string Text;
            public string AssignmentPermission;
        }

        [TaskAction("get")]
        public UserSearchItem GetUser(UserRequestModel request)
        {
            return this.Context.DataContext.RISUsers
                .Where(item => item.risuse_UserID == request.ID && (item.risuse_DateTimeInactive == null || item.risuse_DateTimeInactive >= DateTime.Now))
                .Select(item =>
                        new UserSearchItem
                            {
                                ID = item.risuse_UserID,
                                Code = item.risuse_Code.Trim(),
                                DisplayName = item.Person.per_DisplayName
                            })
                .FirstOrDefault();
        }

        private static void ApplySearchTextFilter(string[] searchWords, WhereBuilder<RISUser> filter)
        {
            if (searchWords.Length == 1)
            {
                var searchText2 = searchWords[0];
                filter.Condition(item => item.risuse_Code.StartsWith(searchText2) || item.Person.per_DisplayName.Contains(searchText2));
            }
            else
            {
                foreach (string searchWord in searchWords)
                {
                    var text = searchWord;
                    filter = filter.Condition(item => item.Person.per_DisplayName.Contains(text));
                }
            }
        }

        /// <summary>
        /// This function is mainly used by the filtering (e.g. customize filter)
        /// We take into accounts user that are on holiday (unlike the workflow version -> see UserProvider.cs)
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        [TaskAction("query")]
        public IEnumerable<UserSearchItem> Search(UserRequestModel request)
        {
            var searchWords = request.Text.Split(new[] { '-', ' ' }, StringSplitOptions.RemoveEmptyEntries);

            var source = this.Context.DataContext.RISUsers;
            var filter = WhereBuilder<RISUser>.And();

            // only active users
            filter.Condition(item1 => item1.risuse_DateTimeInactive == null || item1.risuse_DateTimeInactive > DateTimeOffset.Now);
            
            ApplySearchTextFilter(searchWords, filter);

            if (!string.IsNullOrEmpty(request.AssignmentPermission))
            {
                filter = filter.Condition(
                    item => item.RISRoles.Any(r => r.RISPermissionNames.Any(p => p.risper_RISPermissionName == request.AssignmentPermission)));
            }

            var items = filter.CreateQuery(source)
                .Select(item =>
                        new UserSearchItem
                        {
                            ID = item.risuse_UserID,
                            Code = item.risuse_Code.Trim(),
                            DisplayName = item.Person.per_DisplayName
                        });

            var list = RankExaminationTypesBySearchWords(items, searchWords).ToList();
            if (list.Count == 0)
                return new UserSearchItem[0];

            if (searchWords.Length == 1)
            {
                // Put the matching code on top.
                var result = list.FirstOrDefault(item => item.Code.Equals(searchWords[0], StringComparison.InvariantCultureIgnoreCase));
                if (result != null)
                {
                    list.Remove(result);
                    list.Insert(0, result);
                }
            }

            return list;
        }

        private static IEnumerable<UserSearchItem> RankExaminationTypesBySearchWords(IEnumerable<UserSearchItem> query, string[] searchWords)
        {
            return query
                .Select(item => new
                                    {
                                        Rank = TextRankingSystem.Calculate(item.DisplayName, searchWords),
                                        Item = item
                                    })
                .OrderBy(item => item.Item.DisplayName)
                .ThenBy(item => item.Rank)
                .Select(item => item.Item);
        }
    }
}