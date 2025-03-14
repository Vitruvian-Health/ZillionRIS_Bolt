using System.Collections.Generic;
using System.Web;
using System.Web.Routing;

namespace Rogan.ZillionRis.Website.Code.Controls.ModulePages
{
    public class ModulePageRouteHandler : IRouteHandler
    {
        private Dictionary<string, string> _componentMap;
        public string VirtualBasePath { get; set; }

        public Dictionary<string, string> ComponentMap
        {
            get
            {
                if (this._componentMap == null)
                {
                    this._componentMap = new Dictionary<string, string>();
                }
                return this._componentMap;
            }
            set { this._componentMap = value; }
        }

        public IHttpHandler GetHttpHandler(RequestContext requestContext)
        {
            var key = requestContext.RouteData.GetRequiredString("page");

            return new ModulePage
            {
                AppRelativeVirtualPath = this.VirtualBasePath + key,
                ModulePageComponent = this.ComponentMap[key]
            };
        }
    }
}