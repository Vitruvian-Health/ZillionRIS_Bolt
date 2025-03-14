using Rogan.Text.ShortCodes.Web.Tasks;
using Rogan.ZillionRis;
using Rogan.ZillionRis.Codes;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Profiling;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Handlers;
using Rogan.ZillionRis.Web.Runtime;
using Rogan.ZillionRis.Web.Shared;

using ZillionRis.Controls;

namespace ZillionRis.Common
{
    internal class WebApplicationTaskAspect : ITaskAspect
    {
        #region ITaskAspect Members
        public void OnTaskCreated(ActivatingRequest request, object task)
        {
            ISessionContext sessionContext = null;

            if (RisApplication.Current != null)
            {
                sessionContext = RisApplication.Current.GetSessionContext();

                if (request != null)
                {
                    var cause = request.Cause as ModuleHttpHandlerActivatorCause;
                    if (cause != null)
                        sessionContext.OriginPage = cause.OriginPage;
                }

                Profiler.AddCollector(() => new SessionContextProfileInfo()
                                            {
                                                SessionContext = sessionContext
                                            });
            }

            var t = task as IZillionRisTask;
            if (t != null)
            {
                t.Context = sessionContext;
            }

            var rtt = task as ReplaceTextTask;
            if (rtt != null)
            {
                rtt.Provider = RisGlobalCache.ShortCodes;
                rtt.DefaultTemplateType = ReportTemplateTypes.ShortCode;
            }

            var r = task as ZillionRisViewBase;
            if (r != null)
            {
                var pageBase = RisApplication.Current?.Context.Handler as PageBase;
                if (pageBase != null)
                {
                    r.ViewData["PageKey"] = pageBase.RisAccessKey;
                }
            }
        }

        public void OnTaskDestroyed(ActivatingRequest request, object task)
        {
        }

        public void OnCallingAction(ActivatingRequest request, object task, IActionDefinition definition, object data)
        {
        }

        public void OnCalledAction(ActivatingRequest request, object task, IActionDefinition definition, object data, object result)
        {
        }
        #endregion
    }
}