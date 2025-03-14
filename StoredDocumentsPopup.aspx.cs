using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class StoredDocumentsPopup : PageBase
    {
        protected override string PagePermissionKey
        {
            get { return null; }
        }

        protected override void InitializeMasterPage()
        {
            // No master page required.
        }

        protected override bool IncludesPagePlugin
        {
            get { return false; }
        }

        protected string JavaScriptCultureUrl
        {
            get { return "~/api/service/culture/" + (Application.Language ?? "en-US"); }
        }

        protected string RisJSResourceUrl
        {
            get { return "~/api/service/localize/ris/" + (Application.Language ?? "en-US"); }
        }
    }
}
