using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Audit;
using Rogan.ZillionRis.Reporting;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.Session;
using System;
using System.IO;
using System.Web;
using ZillionRis.Common;

namespace Rogan.ZillionRis.Website.Code.Common
{
    public class SystemUserSessionContextFactory : ISystemUserSessionContextFactory
    {
        public ISessionContext CreateSessionContext(SystemUserDefinition systemUser, IZillionRIS_Entities dataContext)
        {
            var sessionContext = SessionContextFactory.Create(dataContext);
            sessionContext.ClientID = Environment.MachineName;
            sessionContext.User = DatabaseUserSessionFactory.Instance.Open(systemUser.GetSystemUserLoginName());
            sessionContext.SetupDefaultAuditor();

            if (RisGlobalCache.RisConfiguration != null)
            {
                try
                {
                    var reportSettings = ReportContextSettings.GetOrCreate(sessionContext);
                    reportSettings.BasePath = Path.Combine(HttpRuntime.AppDomainAppPath, RisGlobalCache.RisConfiguration.riscon_ReportLocation);
                }
                catch (Exception ex)
                {
                    ZillionRisLog.Default.Error("Set the base path for report files.", ex);
                }
            }
            return sessionContext;
        }
    }
}