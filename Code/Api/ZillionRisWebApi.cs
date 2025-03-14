using Rogan.ZillionRis.Dictation.WebServices;
using Rogan.ZillionRis.Web.Handlers.ReflectionRequest;
using Rogan.ZillionRis.Website.Code.Api.Data;
using System.Web.Routing;
using Rogan.ZillionRis.Web.Services;

namespace Rogan.ZillionRis.Website.Code.Api
{
    public static class ZillionRisWebApi
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            ReflectionRequestRouteHandler.Register(routes, typeof(LocalizeService), "service", "localize", false);
            ReflectionRequestRouteHandler.Register(routes, typeof(CultureService), "service", "culture", false);
            ReflectionRequestRouteHandler.Register(routes, typeof(ZillionSpeechService), "tasks", "zillionspeech",false);
            ReflectionRequestRouteHandler.Register(routes, typeof(PatientSearchService), "data", "patient", true);
        }
    }
}
