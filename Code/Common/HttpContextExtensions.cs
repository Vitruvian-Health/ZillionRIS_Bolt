using System.Web;

using Rogan.ZillionRis.Web.Runtime;

namespace ZillionRis.Common
{
    public static class HttpContextExtensions
    {
        public static ModuleContext GetModuleContext(this HttpContext context)
        {
            return context != null ? context.Items["ModuleContext"] as ModuleContext : null;
        }

        public static ModuleContext GetModuleContext(this HttpContextBase context)
        {
            return context != null ? context.Items["ModuleContext"] as ModuleContext : null;
        }
    }
}