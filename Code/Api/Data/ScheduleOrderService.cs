using DelftDI.Common.RIS.Common;
using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.Business;
using Rogan.ZillionRis.Scheduling.Internals;
using Rogan.ZillionRis.WebControls.Extensibility;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using ZillionRis.Common;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class ScheduleOrderService : RisReflectionController
    {
        public object Execute(int orderID, DateTime betweenStart, DateTime betweenEnd, int locationID)
        {
            betweenEnd = betweenEnd.AddDays(1d);

            var examinations = DataContext.Orders
                .Where(item => item.ord_OrderID == orderID)
                .SelectMany(item => item.Examinations)
                .Select(item => item.exa_ExaminationID)
                .ToArray();

            var scheduler = new ScheduleController(DataContext);
            scheduler.Cache = new Hashtable();
            scheduler.AllowReschedule = true;
            scheduler.AllowScheduleActiveExamination = false;
            scheduler.EnableShortestResults = false;
            scheduler.OneSchedulePerDay = true;
            scheduler.Locations = new List<int>();
            scheduler.Locations.Add(locationID);
            scheduler.RisUserID = ((RisApplication) Context.ApplicationInstance).GetSessionContext().User.UserID;
            scheduler.SchedulesPerLocation = 100;
            scheduler.AddExamination(examinations);
            scheduler.LoadFromDatabase();

            var allSchedules = new Dictionary<int, List<DMScheduledActionList>>();

            try
            {
                scheduler.CalculateSchedules(new DateTimeSpan(betweenStart, betweenEnd), true);
                foreach (var locationSchedule in scheduler.LocationSchedules)
                {
                    List<DMScheduledActionList> list;
                    if (allSchedules.TryGetValue(locationSchedule.Key, out list) == false)
                        allSchedules.Add(locationSchedule.Key, list = new List<DMScheduledActionList>());

                    list.AddRange(locationSchedule.Value.ToList());
                }
            }
            catch (Exception ex)
            {
                const string msg = "Failed to load schedules for order {0} from {1} to {2}";
                ZillionRisLog.Default.Error(string.Format(msg, orderID, betweenStart, betweenEnd), ex);
            }

            return allSchedules
                .SelectMany(item => item.Value, (pair, list) => new {location = pair.Key, schedules = list})
                .Select(item => new
                {
                    LocationID = item.location,
                    Actions = item.schedules
                        .Select(item2 => new
                        {
                            item2.ExaminationID,
                            Resources = item2.ResourceIDs,
                            StartTime = item2.ScheduledInterval.StartDateTime,
                            EndTime = item2.ScheduledInterval.StartDateTime,
                        })
                });
        }
    }
}