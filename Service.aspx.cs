using System;
using System.Globalization;
using System.Linq;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Session;
using Rogan.ZillionRis.WebControls.Extensibility;

using ZillionRis.Common;
using ZillionRis.Controls;

namespace Rogan.ZillionRis.Website
{
    public partial class Service : PageBase
    {
        #region Service Support
        private void InitializePage()
        {
            this.InitializeInformationLevel();
            this.InitializeLanguage();
            this.InitializeLocation();
            this.InitializeVersionInformation();
        }
        
        /// <summary>
        /// 	Determines whether the current session is running in developer mode.
        /// </summary>
        /// <returns>
        /// 	<c>true</c> if the current session is running in developer mode; otherwise, <c>false</c>.
        /// </returns>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-12-01.</para>
        /// </remarks>
        protected bool IsDeveloperMode()
        {
#if DEBUG
            return true;
#else
            return false;
#endif
        }
        #endregion

        #region Section - Information Level
        /// <summary>
        /// 	Initializes the information level section.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        private void InitializeInformationLevel()
        {
            var levels = (UserInformationLevel[])Enum.GetValues(typeof(UserInformationLevel));

            this.InformationLevel.DataTextField = "Text";
            this.InformationLevel.DataValueField = "ID";

            this.InformationLevel.DataSource = levels.Select(item => new SimpleListItem { ID = UserInformationLevelToString(item), Text = item.ToString() }).ToList();
            this.InformationLevel.DataBind();

            this.InformationLevel.SelectedValue = UserInformationLevelToString(this.Application.InformationLevel);
        }

        private static string UserInformationLevelToString(UserInformationLevel item)
        {
            return Convert.ToInt32(item).ToString(CultureInfo.InvariantCulture);
        }

        private static UserInformationLevel StringToUserInformationLevel(string item)
        {
            return (UserInformationLevel)Convert.ToInt32(item);
        }

        /// <summary>
        /// 	Handles the OnTextChanged event of the InformationLevel control.
        /// </summary>
        /// <param name = "sender">The source of the event.</param>
        /// <param name = "e">The <see cref = "System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        protected void InformationLevel_OnTextChanged(object sender,
                                                      EventArgs e)
        {
            this.Application.InformationLevel = StringToUserInformationLevel(this.InformationLevel.SelectedValue);
        }
        #endregion

        #region Section - Version Information
        /// <summary>
        /// 	Initializes the version information section.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        private void InitializeVersionInformation()
        {
            //if (this.Application.InformationLevel == UserInformationLevel.Expert)
            //{
            //    var source = AppDomain.CurrentDomain
            //        .GetAssemblies()
            //        .Select(AssemblyVersionInformation.FromAssembly)
            //        .OrderBy(item => item.Title);

            //    this.VersionInformation.DataSource = source;
            //    this.VersionInformation.D ataBind();
            //}
            //else
            //{
            this.VersionInformation.DataSource = RisApplication.Current.AssemblyVersions.OrderBy(item => item.Title);
            this.VersionInformation.DataBind();
            //}
        }
        #endregion

        #region Settings Location
        /// <summary>
        /// 	Initializes the location section.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        private void InitializeLocation()
        {
            if (this.Application.UserHasPermission((UserPermissions.ServiceUser)) == false)
                this.LocationPanel.Visible = false;
            else
            {
                var locations = this.SessionContext.DataContext.Locations.ToList();

                this.LocationPanel.Visible = true;

                this.LocationInput.DataValueField = "ID";
                this.LocationInput.DataTextField = "Text";

                this.LocationInput.DataSource = locations.Select(item => new SimpleListItem { ID = item.loc_LocationID.ToString(CultureInfo.InvariantCulture), Text = item.loc_LocationName }).ToList();
                this.LocationInput.DataBind();

                this.SelectActiveLocation();
            }
        }

        /// <summary>
        /// 	Selects the currently active location.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        private void SelectActiveLocation()
        {
            this.LocationInput.SelectedIndex = -1;
            var locationItem = this.LocationInput.Items.FindByValue(this.SessionContext.GetActiveLocationID().ToString(CultureInfo.InvariantCulture));
            if (locationItem != null)
                locationItem.Selected = true;
        }

        /// <summary>
        /// 	Handles the OnTextChanged event of the Location control.
        /// </summary>
        /// <param name = "sender">The source of the event.</param>
        /// <param name = "e">The <see cref = "System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        protected void Location_OnTextChanged(object sender,
                                              EventArgs e)
        {
            try
            {
                var item = this.LocationInput.SelectedItem;
                if (item != null)
                {
                    if (this.SessionContext.ChangeLocationID(Convert.ToInt32(item.Value)) == false)
                    {
                        this.SelectActiveLocation();
                        this.GlobalPopup.ShowInfoMessage("Unable to switch locations.\r\n\r\nThe current user has not been associated with the selected location.");
                    }
                    else
                        this.Application.NavigatePage(PageAccessKey.ServicePage);
                }
            }
            catch (Exception ex)
            {
                this.GlobalPopup.ShowErrorMessage("Unable to switch locations.", ex);
            }
        }
        #endregion

        #region Session - Language Input 

        /// <summary>
        /// 	Initializes the language section.
        /// </summary>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        private void InitializeLanguage()
        {
            
            this.Language.SelectedValue = this.Application.Language;

            if (this.Application.UserHasPermission((UserPermissions.ServiceUser)) == false)
                this.LanguagePanel.Visible = false;
            else
            {
                this.LanguagePanel.Visible = true;

                this.Language.DataValueField = "Name";
                this.Language.DataTextField = "NativeName";

                this.Language.DataSource = RisApplication.Current.GetAvailableCultures().ToList();
                this.Language.DataBind();

                this.SelectActiveLanguage();
            }
        }

        private void SelectActiveLanguage()
        {
            this.Language.SelectedIndex = -1;
            var language = this.Language.Items.FindByValue(this.Application.Language.ToString(CultureInfo.InvariantCulture));
            if (language != null)
                language.Selected = true;
        }

        /// <summary>
        /// 	Handles the OnSelectionChanged event of the Language control.
        /// </summary>
        /// <param name = "sender">The source of the event.</param>
        /// <param name = "e">The <see cref = "System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        protected void Language_OnSelectionChanged(object sender,
                                                   EventArgs e)
        {
            try
            {
               var item = this.Language.SelectedValue;
                if (item == null)
                    throw new ArgumentException("No language specified");

                this.Application.Language = item;
            }
            catch (Exception ex)
            {
                this.GlobalPopup.ShowErrorMessage("Unable to switch language.", ex);
            }

            this.Application.NavigatePage(PageAccessKey.ServicePage);
        }
        #endregion

        #region Nested type: SimpleListItem
        private class SimpleListItem
        {
            public string ID { get; set; }
            public string Text { get; set; }
        }
        #endregion

        #region Properties
        protected override string PagePermissionKey
        {
            get { return null; }
        }

        public override string RisAccessKey
        {
            get { return PageAccessKey.ServicePage; }
        }

        public override string PageManualAccessKey
        {
            get { return UserManualAccessKey.ServicePage; }
        }
        #endregion

        #region ASP.NET Life Cycle
        protected override void OnInit(EventArgs e)
        {
            this.RequireModules.Add(new Uri("module://service/requires/app"));

            base.OnInit(e);
        }

        /// <summary>
        /// 	Raises the <see cref = "E:Load" /> event.
        /// </summary>
        /// <param name = "e">The <see cref = "System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        /// 	<para>Created by tdgroen at 2011-11-30.</para>
        /// </remarks>
        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);

            try
            {
                if (this.IsPostBack == false)
                    this.InitializePage();
            }
            catch (Exception ex)
            {
                this.GlobalPopup.ShowErrorMessage("Unable to initialize the page.", ex);
            }
        }
        #endregion
    }
}
