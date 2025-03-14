using System;

using Rogan.ZillionRis.Business.PatientSearch;

using ZillionRis.Security;

namespace ZillionRis.Common
{
    public static class NavigationHelper
    {
        #region Static Methods
        /// <summary>
        ///     Displays the user's default page.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-09-07.</para>
        /// </remarks>
        public static void DisplayDefaultPage()
        {
            var application = RisApplication.Current;
            application.Redirect(SecurityHelper.GetUserDefaultUrl(application.GetSessionContext()), true);
        }

        /// <summary>
        ///     Searches the patients using the specified filter (e.g. patient's name or the patient's number).
        /// </summary>
        /// <param name="searchModes">The search modes.</param>
        /// <param name="searchValue">The search value.</param>
        public static void SearchPatient(PatientSearchModes searchModes,
            object searchValue)
        {
            var application = RisApplication.Current;
            application.Redirect(GetSearchPatientUrl(searchModes, searchValue), true);
        }

        private static string GetSearchPatientUrl(PatientSearchModes searchModes,
            object searchValue)
        {
            string escapedSearch = searchValue == null ? string.Empty : Uri.EscapeUriString(searchValue.ToString());

            return string.Format(@"~/patient/search#{0};{1}", (int) searchModes, escapedSearch);
        }
        #endregion
    }
}