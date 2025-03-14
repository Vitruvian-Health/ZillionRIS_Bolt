using Rogan.ZillionRis.Engine;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Legacy
{
    public class EngineStartTask : ZillionRisBaseTask
    {
        [TaskAction(WebControlsIntent.EngineRun)]
        [TaskActionIntent(WebControlsIntent.EngineRun)]
        public object RunEngine()
        {
            ZillionRisEngineHost.Instance.Start();
            return null;
        }
    }
}