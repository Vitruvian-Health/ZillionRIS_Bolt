using System.IO;
using System.Web;
using DelftDI.Common.VersionUtils.VerifyVersion;
using DelftDI.ZillionRis.Licensing;
using Microsoft.Practices.Unity;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Web.Reflection;

namespace Rogan.ZillionRis.Website.Code.Api.Tasks
{
    public class VersionInfoModel
    {
        public string VersionName { get; set; }
        public string ProductName { get; set; }
        public string CompanyName { get; set; }
        public bool IsValid { get; set; }
        public string VersionCheckErrorMessages { get; set; }
    }


    public class VersionInfoTask : ZillionRisBaseTask
    {
        [TaskAction("request")]
        public VersionInfoModel Request()
        {
            var result = new VersionInfoModel();

            string companyName;
            string productName;
            string versionNumber;

            using (var stringWriter = new StringWriter())
            {
                result.IsValid =
                    VersionInfo.Verify(HttpContext.Current.Server.MapPath("~/VersionInfo.xml"),
                                       HttpContext.Current.Server.MapPath("~"),
                                       stringWriter,
                                       out companyName,
                                       out productName,
                                       out versionNumber);
                result.VersionCheckErrorMessages = stringWriter.ToString();
            }

            var licenseManager = IocContainer.Instance.Container.Resolve<IRisLicenseManager>();
            var licensedProductName = licenseManager.LicensedProductName;

            result.ProductName = string.IsNullOrEmpty(licensedProductName) ? productName : licensedProductName;
            result.CompanyName = companyName;
            result.VersionName = $"{result.ProductName} version {versionNumber}";
            return result;
        }
    }
}