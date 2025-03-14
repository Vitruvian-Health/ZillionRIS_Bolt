using System;

using Rogan.ZillionRis.Engine;
using Rogan.ZillionRis.Statistics;

namespace ZillionRis.Common
{
    public class RisGlobalCacheRenewalComponent : IZillionRisEngineComponent
    {
        private static readonly AppStatDefintion AppStat_RisGlobalCacheRenewal = AppStat.Define("ris-global-cache-renewal");

        public TimeSpan RefreshInterval { get; }

        public RisGlobalCacheRenewalComponent()
        {
            RefreshInterval = TimeSpan.FromSeconds(30d);
        }

        public void Step(ZillionRisEngineContext context)
        {
            AppStat.AddOne(AppStat_RisGlobalCacheRenewal);

            try
            {
                RisGlobalCache.Renew(context.SessionContext.DataContext);
            }
            finally
            {
                // Schedule the following 5th minute (default).
                // It's scheduled for the next occurrence in order to sync configuration over multiple servers.
                var time = DateTime.Now.Ticks;
                time -= time % RefreshInterval.Ticks;
                time += RefreshInterval.Ticks;

                context.ScheduleNext(new DateTime(time));
            }
        }
    }
}
