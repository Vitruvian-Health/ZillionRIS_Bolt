using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class Housekeeping : PageBase
    {

        protected override string PagePermissionKey
        {
            get { return UserPermissions.PageHousekeeping; }
        }
        public override bool AllowCachedResponse
        {
            get { return true; }
        }
        public override string RisAccessKey
        {
            get { return PageAccessKey.HousekeepingPage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.HousekeepingPage; }
        }
    }
}