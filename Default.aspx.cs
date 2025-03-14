using System;
using System.Linq;
using System.Threading;
using System.Web;
using Rogan.ZillionRis.Business.PatientSearch;
using Rogan.ZillionRis.Extensibility.Security;
using Rogan.ZillionRis.Security;

using ZillionRis.Common;
using ZillionRis.Controls;
using ZillionRis.Security;

namespace ZillionRis
{
    public partial class _Default : PageBase
    {
        #region Properties
        /// <summary>
        ///     Gets the page permission key which gets validated before the page gets initialized using
        ///     <see cref="SecurityHelper.ValidatePageAccess" />.
        /// </summary>
        /// <value>
        ///     The page permission key (when the value is <c>null</c> it is assumed that no permission is required).
        /// </value>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-08-16.</para>
        /// </remarks>
        protected override string PagePermissionKey
        {
            get { return null; }
        }
        #endregion

        #region Private/Protected Methods
        /// <summary>
        ///     Initializes the master page.
        /// </summary>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-11-23.</para>
        /// </remarks>
        protected override void InitializeMasterPage()
        {
            // Not required.
        }

        /// <summary>
        ///     Handles the Init event of the Page control.
        /// </summary>
        /// <param name="sender">The source of the event.</param>
        /// <param name="e">The <see cref="System.EventArgs" /> instance containing the event data.</param>
        /// <remarks>
        ///     <para>Created by tdgroen on 2010-08-16.</para>
        /// </remarks>
        protected void Page_Init(object sender, EventArgs e)
        {
            try
            {
                var debug = this.Request["debug"] == "true";

                if (this.SessionContext.User == null)
                {
                    if (debug)
                    {
                        this.DebugResponse("User not fully authenticated.");
                        return;
                    }
                    else
                    {
                        // When a client has not been logged on, redirect back to the login page.
                        this.Application.Redirect("~/Login.aspx", true);
                    }
                }

                // When navigating to this page, redirect to the first page that the user has access to.
                var menus = this.Application.GetModuleMenu(this.SessionContext);

                string url;
                if (menus.SelectMany(m => m.Pages).Any(x => x.Key == "mp-health-check"))
                {
                    // Service users will access health check by default.
                    url = menus.SelectMany(m => m.Pages)
                        .Where(x => x.Key == "mp-health-check")
                        .Select(x => x.Url)
                        .FirstOrDefault();
                }
                else
                {
                    var defaultPage = SecurityHelper.GetUserDefaultUrl(this.SessionContext);
                    if (defaultPage != null && defaultPage != "~/Default.aspx")
                    {
                        // Service users will access health check by default.
                        url = defaultPage;
                    }
                    else
                    {
                        url = menus.Select(p => p.Url).FirstOrDefault() ??
                              menus.SelectMany(m => m.Pages).Select(p => p.Url).FirstOrDefault();
                    }
                }

                if (url != null)
                {
                    if (debug)
                    {
                        this.DebugResponse(string.Format("Navigating to URL of a module menu: {0}.", url));
                        return;
                    }
                    else
                    {
                        this.Application.Redirect(url, true);
                        return;
                    }
                }

                if (this.SessionContext.HasPermission(UserPermissions.SearchPatient))
                {
                    if (debug)
                    {
                        this.DebugResponse("Page appointments permission found, navigating to patient search.");
                    }
                    else
                    {
                        NavigationHelper.SearchPatient(PatientSearchModes.All, "");
                    }
                }
                else
                {
                    if (debug)
                    {
                        this.DebugResponse("No valid page found, returning to Logoff.aspx.");
                    }
                    else
                    {
                        this.Application.Redirect("~/Logoff.aspx?reason=nopage", true);
                    }
                }
            }
            catch (ThreadAbortException)
            {
                // Ignore (redirect).
                throw;
            }
            catch (Exception ex)
            {
                this.LogException("Unable to redirect the user due to a problem", ex);

                this.Session.Abandon();
                this.Application.Redirect("~/Logoff.aspx?reason=redirecterror&t=" + ex.GetType().Name, true);
            }
        }

        private void DebugResponse(string message)
        {
            this.Application.Response.Write(message);
            this.Application.Response.Flush();
            this.Application.Response.End();
        }
        #endregion

        public override void ProcessRequest(HttpContext context)
        {
            ProcessRequest(context,false);
        }
    }
}