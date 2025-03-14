using System;
using System.Web;
using DelftDI.ZillionRis.Logging;
using Rogan.ZillionRis.Extensibility;


namespace ZillionRis.Common
{
    internal sealed class ZillionRisSessionContextLogger : ISessionContextLogger
    {
        public ISessionContext SessionContext { get; set; }

        public ZillionRisSessionContextLogger(ISessionContext sessionContext)
        {
            this.SessionContext = sessionContext;
        }

        public void LogException(string hint, Exception ex)
        {
            var loginName = this.SessionContext.CreateTracingString();
            var url = this.GetUrl();

            ZillionRisLog.Default.Error(String.Format("{0}\r\nUrl: {1}\r\nAction: {2}", loginName, url, hint), ex);
        }

        private string GetUrl()
        {
            var httpContext = this.SessionContext.Get<HttpContext>();
            var url = httpContext == null ? "" : httpContext.Request.Url.AbsolutePath;
            return url;
        }

        public void Log(string message)
        {
            var loginName = this.SessionContext.CreateTracingString();
            var url = this.GetUrl();

            ZillionRisLog.Default.Write(ZillionRisLogLevel.Notice, String.Format("{0}\r\nUrl: {1}\r\nAction: {2}", loginName, url, message));
        }
    }
}