using DelftDI.Common.RIS.Utilities;
using Rogan.ZillionRis.Extensibility;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Common;

namespace ZillionRis.Security
{
    /// <summary>
    ///     Summary description for Security
    /// </summary>
    internal static class SecurityHelper
    {
        #region Static Methods
        /// <summary>
        ///     Gets the current user's default URL.
        /// </summary>
        /// <returns></returns>
        internal static string GetUserDefaultUrl(ISessionContext context)
        {
            if (context != null && context.User != null)
            {
                //Check to which page this user must be redirected
                if (context.HasPermission(UserPermissions.PageDictationWorklist))
                {
                    return RisApplication.Current.GetPageUrl(PageAccessKey.DicationWorklistPage);
                }
                else if (context.HasPermission(UserPermissions.PageImaging))
                {
                    return RisApplication.Current.GetPageUrl(PageAccessKey.ImagingPage);
                }
                else if (context.HasPermission(UserPermissions.PageReception))
                {
                    return RisApplication.Current.GetPageUrl(PageAccessKey.ReceptionPage);
                }
                else if (context.HasPermission(UserPermissions.PageStatistics))
                {
                    return RisApplication.Current.GetPageUrl(PageAccessKey.StatisticsPage);
                }
            }

            return @"~/Default.aspx";
        }

        /// <summary>
        ///     Checks that the current user (see the DatabaseUserSession) has sufficient rights to access the specified page.
        ///     When access is denied the user will be logged off and redirected to the login page.
        /// </summary>
        /// <param name="pageName">Name of the page.</param>
        /// <seealso cref="RisApplication.UserHasPermission" />
        internal static void ValidatePageAccess(string pageName)
        {
            Precondition.ArgumentNotNullOrEmpty("pageName", pageName);

            if (RisApplication.Current.UserHasPermission(pageName) == false)
                NavigationHelper.DisplayDefaultPage();
        }
        #endregion
    }
}