using System;
using System.Linq;
using System.Web;
using DelftDI.Text.ShortCodes;
using Rogan.Text.ShortCodes.Sql;
using Rogan.ZillionRis.EntityData;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Session;

namespace ZillionRis.Common
{
    public static class RisGlobalCache
    {
        public static IShortCodesProvider ShortCodes { get; private set; }
        public static RISConfiguration RisConfiguration { get; private set; }

        public static void Renew(IZillionRIS_Entities dataContext)
        {
            try
            {
                var configuration = dataContext.RISConfigurations.AsNoTracking().FirstOrDefault();
                if (configuration != null)
                {
                    RisConfiguration = configuration;
                }

                var cachedDBProvider = new CachedShortCodesProvider(new ShortCodesDbProvider(dataContext));

                var predefinedShortCodesProvider = new PredefinedShortCodesProvider(
                    () => DateTimeOffset.Now,
                    () => GetSessionContext().User.DisplayName,
                    () => GetSessionContext().QueryActiveLocation().Select(x => x.loc_LocationName).FirstOrDefault());

                var compositeShortCodes = CompositeShortCodesProvider.Create(predefinedShortCodesProvider, cachedDBProvider);

                ShortCodes = compositeShortCodes;
            }
            catch (Exception ex)
            {
                throw new ApplicationException("Something went wrong while reloading Zillion RIS configuration.", ex);
            }
        }

        private static ISessionContext GetSessionContext()
        {
            var app = HttpContext.Current.ApplicationInstance as RisApplication;
            return app.GetSessionContext();
        }
    }
}
