using System;
using DelftDI.Common.RIS.Common;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Data
{
    public class TimeSynchronizationService : ZillionRisBaseTask 
    {
        [TaskAction("epochdiff")]
        public long Execute(long time)
        {
            //this.Application.Response.Cache.SetExpires(DateTime.Now.AddMinutes(10d));
            //this.Application.Response.Cache.SetCacheability(HttpCacheability.Private);
            //this.Application.Response.Cache.SetLastModified(DateTime.Now);
            //this.Application.Response.Cache.SetMaxAge(TimeSpan.FromMinutes(10d));

            return EpochConverter.ToEpoch(DateTime.Now) - time;
        }
        [TaskAction("server-time")]
        public object Execute()
        {
            //this.Application.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            //this.Application.Response.Cache.SetMaxAge(TimeSpan.Zero);

            return new
            {
                serverID = EnvironmentCached.MachineName,
                currentTime = DateTime.Now
            };
        }
    }
}